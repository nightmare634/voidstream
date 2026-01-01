import { browser } from '$app/environment';

/**
 * Minimal Solana JSON-RPC WS client (Helius Enhanced WS compatible) with:
 * - auto reconnect (exponential backoff)
 * - keepalive via periodic lightweight JSON-RPC call
 * - resubscribe on reconnect
 *
 * Browser WS cannot send TCP ping frames, so we send a small JSON-RPC request.
 */
export function createHeliusWsClient({ wsUrl, maxReconnectAttempts = 5, onPermanentClose } = {}) {
	/** @type {WebSocket|null} */
	let ws = null;
	let closedByUser = false;
	let connectPromise = null;
	let permanentNotified = false;

	let nextId = 1;
	const pending = new Map(); // id -> { resolve, reject }

	/** @type {ReturnType<typeof setInterval> | null} */
	let keepaliveTimer = null;
	/** @type {ReturnType<typeof setTimeout> | null} */
	let reconnectTimer = null;

	let reconnectAttempts = 0;

	// Pubkey -> { cb, subId }
	const accountSubs = new Map();

	function isOpen() {
		return ws && ws.readyState === WebSocket.OPEN;
	}

	function safeClearTimers() {
		if (keepaliveTimer) clearInterval(keepaliveTimer);
		keepaliveTimer = null;
		if (reconnectTimer) clearTimeout(reconnectTimer);
		reconnectTimer = null;
	}

	function rejectAllPending(err) {
		for (const { reject } of pending.values()) reject(err);
		pending.clear();
	}

	function scheduleReconnect() {
		if (closedByUser) return;
		if (reconnectTimer) return;

		// Prevent endless reconnect spam (common when WS is blocked by network/adblock/CSP).
		if (Number.isFinite(maxReconnectAttempts) && reconnectAttempts >= maxReconnectAttempts) {
			closedByUser = true;
			safeClearTimers();
			rejectAllPending(new Error('WebSocket disabled'));
			try {
				ws?.close();
			} catch {
				// ignore
			}
			ws = null;

			if (!permanentNotified && typeof onPermanentClose === 'function') {
				permanentNotified = true;
				try {
					onPermanentClose(new Error('WebSocket disabled after repeated failures'));
				} catch {
					// ignore
				}
			}
			return;
		}

		const ms = Math.min(30_000, 500 * 2 ** reconnectAttempts);
		reconnectAttempts += 1;
		reconnectTimer = setTimeout(() => {
			reconnectTimer = null;
			connect().catch(() => {});
		}, ms);
	}

	function startKeepalive() {
		if (keepaliveTimer) return;
		keepaliveTimer = setInterval(() => {
			// Don’t await; if it fails the close handler will reconnect.
			if (!isOpen()) return;
			request('getHealth', []).catch(() => {});
		}, 20_000);
	}

	function onMessage(ev) {
		let msg = null;
		try {
			msg = JSON.parse(ev.data);
		} catch {
			return;
		}

		// Response to our request()
		if (msg && typeof msg.id !== 'undefined' && (msg.result || msg.error)) {
			const p = pending.get(msg.id);
			if (!p) return;
			pending.delete(msg.id);
			if (msg.error) p.reject(Object.assign(new Error(msg.error.message || 'RPC error'), { rpc: msg.error }));
			else p.resolve(msg.result);
			return;
		}

		// Sub notifications
		// accountSubscribe -> accountNotification
		if (msg?.method === 'accountNotification') {
			const subId = msg?.params?.subscription;
			const value = msg?.params?.result?.value;
			const lamports = value?.lamports;
			if (typeof subId === 'undefined') return;
			for (const [pubkey, sub] of accountSubs.entries()) {
				if (sub.subId === subId && typeof sub.cb === 'function') {
					sub.cb({ pubkey, lamports });
				}
			}
		}
	}

	function connect() {
		if (!browser) return Promise.resolve();
		if (isOpen()) return Promise.resolve();
		if (connectPromise) return connectPromise;

		closedByUser = false;

		connectPromise = new Promise((resolve, reject) => {
			try {
				ws = new WebSocket(wsUrl);
			} catch (e) {
				connectPromise = null;
				scheduleReconnect();
				reject(e);
				return;
			}

			ws.onopen = async () => {
				reconnectAttempts = 0;
				permanentNotified = false;
				startKeepalive();
				connectPromise = null;
				// Resubscribe anything we had
				try {
					for (const [pubkey, sub] of accountSubs.entries()) {
						// reset subId before resubscribe
						sub.subId = null;
						const newId = await request('accountSubscribe', [
							pubkey,
							{ commitment: 'confirmed', encoding: 'jsonParsed' }
						]);
						sub.subId = newId;
					}
				} catch {
					// If resubscribe fails, reconnect loop will handle.
				}
				resolve();
			};

			ws.onmessage = onMessage;

			ws.onerror = () => {
				// The close handler will schedule reconnect.
			};

			ws.onclose = () => {
				connectPromise = null;
				safeClearTimers();
				rejectAllPending(new Error('WebSocket closed'));
				scheduleReconnect();
			};
		});

		return connectPromise;
	}

	function close() {
		closedByUser = true;
		safeClearTimers();
		rejectAllPending(new Error('WebSocket closed'));
		try {
			ws?.close();
		} catch {
			// ignore
		}
		ws = null;
	}

	function request(method, params) {
		if (!browser) return Promise.reject(new Error('Not in browser'));
		if (!isOpen()) return Promise.reject(new Error('WebSocket not connected'));
		const id = nextId++;
		const payload = { jsonrpc: '2.0', id, method, params };
		return new Promise((resolve, reject) => {
			pending.set(id, { resolve, reject });
			try {
				ws.send(JSON.stringify(payload));
			} catch (e) {
				pending.delete(id);
				reject(e);
			}
		});
	}

	async function subscribeAccountLamports(pubkey, cb) {
		if (!pubkey) throw new Error('Missing pubkey');
		accountSubs.set(pubkey, { cb, subId: null });
		await connect();
		const subId = await request('accountSubscribe', [pubkey, { commitment: 'confirmed', encoding: 'jsonParsed' }]);
		const sub = accountSubs.get(pubkey);
		if (sub) sub.subId = subId;
		return subId;
	}

	async function unsubscribeAccount(pubkey) {
		const sub = accountSubs.get(pubkey);
		accountSubs.delete(pubkey);
		if (!sub?.subId) return;
		if (!isOpen()) return;
		try {
			await request('accountUnsubscribe', [sub.subId]);
		} catch {
			// ignore
		}
	}

	return {
		connect,
		close,
		subscribeAccountLamports,
		unsubscribeAccount
	};
}











