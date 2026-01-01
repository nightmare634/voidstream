import { browser } from '$app/environment';
import { get, writable } from 'svelte/store';
import { env } from '$env/dynamic/public';
import { createHeliusWsClient } from '$lib/solana/heliusWs';

const state = writable({
	ready: false,
	connecting: false,
	connected: false,
	publicKeyBase58: /** @type {string} */ (''),
	walletName: /** @type {string} */ ('Phantom'),
	error: /** @type {string} */ (''),

	// Balance streaming
	balanceLamports: /** @type {number} */ (0),
	balanceSol: /** @type {number} */ (0),
	streaming: false,
	streamError: /** @type {string} */ ('')
});

/** @type {any | null} */
let phantom = null;
let listenersBound = false;

/** @type {ReturnType<typeof createHeliusWsClient> | null} */
let helius = null;
let streamingPubkey = '';
/** @type {ReturnType<typeof setInterval> | null} */
let pollTimer = null;
let wsDisabled = false;

function getCluster() {
	const c = String(env.PUBLIC_SOLANA_CLUSTER || '').trim().toLowerCase();
	if (!c) return 'mainnet-beta';
	if (c === 'mainnet') return 'mainnet-beta';
	return c; // devnet | testnet | mainnet-beta
}

function appendHeliusApiKey(url) {
	const key = env.PUBLIC_HELIUS_API_KEY || '';
	if (!key) return url;
	if (String(url).includes('api-key=')) return url;
	const joiner = String(url).includes('?') ? '&' : '?';
	return `${url}${joiner}api-key=${encodeURIComponent(key)}`;
}

function defaultHttpRpcUrl() {
	// Prefer explicit env overrides.
	if (env.PUBLIC_HELIUS_RPC_HTTP) return appendHeliusApiKey(env.PUBLIC_HELIUS_RPC_HTTP);
	if (env.PUBLIC_SOLANA_RPC_HTTP) return env.PUBLIC_SOLANA_RPC_HTTP;

	// Sensible public defaults by cluster.
	const cluster = getCluster();
	if (cluster === 'devnet') return 'https://api.devnet.solana.com';
	if (cluster === 'testnet') return 'https://api.testnet.solana.com';
	return 'https://api.mainnet-beta.solana.com';
}

function defaultHeliusWsUrl() {
	// Prefer explicit WS URL (recommended for mainnet).
	if (env.PUBLIC_HELIUS_RPC_WS) return appendHeliusApiKey(env.PUBLIC_HELIUS_RPC_WS);

	// If user provided only the API key, try known hostnames.
	const key = env.PUBLIC_HELIUS_API_KEY || '';
	if (!key) return '';
	const cluster = getCluster();
	if (cluster === 'devnet') return appendHeliusApiKey('wss://atlas-devnet.helius-rpc.com/');
	if (cluster === 'mainnet-beta') return appendHeliusApiKey('wss://atlas-mainnet.helius-rpc.com/');
	return '';
}

function setError(err) {
	state.update((s) => ({ ...s, error: err ? String(err) : '' }));
}

function setStreamError(err) {
	state.update((s) => ({ ...s, streamError: err ? String(err) : '' }));
}

function disableWs(err) {
	wsDisabled = true;
	try {
		helius?.close();
	} catch {
		// ignore
	}
	helius = null;
	// Keep polling fallback running; just stop WS attempts.
	// UX: keep this silent; polling continues in the background.
	try {
		if (err) console.warn('[Voidstream] Balance live updates unavailable; using polling.', err);
	} catch {
		// ignore
	}
	setStreamError('');
}

function setBalanceLamports(lamports) {
	const n = Number(lamports) || 0;
	state.update((s) => ({
		...s,
		balanceLamports: n,
		balanceSol: n / 1_000_000_000
	}));
}

async function fetchBalanceHttp(pubkey) {
	// Prefer explicit RPC URLs. Default to the selected cluster.
	// Note: For mainnet, you should set PUBLIC_HELIUS_RPC_HTTP (recommended) or PUBLIC_SOLANA_RPC_HTTP.
	const url = defaultHttpRpcUrl();

	const body = {
		jsonrpc: '2.0',
		id: 1,
		method: 'getBalance',
		params: [pubkey, { commitment: 'confirmed' }]
	};

	const res = await fetch(url, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body)
	});
	const j = await res.json().catch(() => null);
	const lamports = j?.result?.value;
	if (!res.ok) throw new Error(j?.error?.message || 'Balance fetch failed.');
	if (typeof lamports !== 'number') throw new Error('Invalid balance response.');
	return lamports;
}

async function startStreaming(pubkey) {
	if (!browser) return;
	if (!pubkey) return;
	if (streamingPubkey === pubkey) return;
	await stopStreaming();

	streamingPubkey = pubkey;
	state.update((s) => ({ ...s, streaming: true, streamError: '' }));
	wsDisabled = false;

	// Always set an initial value (fast feedback).
	try {
		const lamports = await fetchBalanceHttp(pubkey);
		setBalanceLamports(lamports);
	} catch (e) {
		setStreamError(e);
	}

	const wsUrl = defaultHeliusWsUrl();
	if (wsUrl && !wsDisabled) {
		helius = createHeliusWsClient({
			wsUrl,
			maxReconnectAttempts: 3,
			onPermanentClose: () => {
				disableWs('Live balance WS unavailable; using polling.');
			}
		});
		try {
			await helius.subscribeAccountLamports(pubkey, ({ lamports }) => {
				if (typeof lamports === 'number') setBalanceLamports(lamports);
			});
		} catch (e) {
			disableWs(e);
			// fall back to polling
		}
	}

	// Poll fallback (also acts as safety net if WS drops silently).
	pollTimer = setInterval(async () => {
		try {
			if (!streamingPubkey) return;
			const lamports = await fetchBalanceHttp(streamingPubkey);
			setBalanceLamports(lamports);
		} catch {
			// ignore transient errors
		}
	}, 30_000);
}

async function stopStreaming() {
	if (pollTimer) clearInterval(pollTimer);
	pollTimer = null;
	if (helius && streamingPubkey) {
		try {
			await helius.unsubscribeAccount(streamingPubkey);
		} catch {
			// ignore
		}
	}
	try {
		helius?.close();
	} catch {
		// ignore
	}
	helius = null;
	wsDisabled = false;
	streamingPubkey = '';
	state.update((s) => ({ ...s, streaming: false }));
}

function bindAdapterListenersOnce() {
	if (!phantom || listenersBound) return;
	listenersBound = true;

	phantom.on?.('connect', (pk) => {
		const pubkey = pk?.toBase58 ? pk.toBase58() : String(pk || '');
		state.update((s) => ({
			...s,
			connecting: false,
			connected: true,
			publicKeyBase58: pubkey,
			walletName: 'Phantom',
			error: ''
		}));
		startStreaming(pubkey).catch(setStreamError);
	});

	phantom.on?.('disconnect', () => {
		state.update((s) => ({
			...s,
			connecting: false,
			connected: false,
			publicKeyBase58: '',
			walletName: 'Phantom',
			error: ''
		}));
		stopStreaming().catch(() => {});
	});

	phantom.on?.('error', (e) => {
		state.update((s) => ({ ...s, connecting: false, error: e ? String(e) : 'Wallet error' }));
	});
}

async function ensureReady() {
	if (!browser) return;
	phantom = window?.solana?.isPhantom ? window.solana : null;
	listenersBound = false;
	bindAdapterListenersOnce();
	state.update((s) => ({ ...s, ready: true, error: '' }));
}

async function connect() {
	if (!browser) return;
	await ensureReady();
	const s = get(state);
	if (!phantom) {
		setError('Phantom wallet not detected. Please install the Phantom browser extension.');
		return;
	}

	state.update((prev) => ({ ...prev, connecting: true, error: '' }));

	try {
		const res = await phantom.connect();

		// Some providers may not emit immediately; sync state defensively.
		const pk = res?.publicKey ?? phantom.publicKey ?? null;
		const pubkey = pk?.toBase58 ? pk.toBase58() : String(pk || '');
		state.update((prev) => ({
			...prev,
			connecting: false,
			connected: !!pk,
			publicKeyBase58: pubkey,
			walletName: 'Phantom'
		}));
		if (pubkey) startStreaming(pubkey).catch(setStreamError);
	} catch (e) {
		state.update((prev) => ({ ...prev, connecting: false, connected: false }));
		setError(e);
	}
}

async function disconnect() {
	if (!browser) return;
	try {
		await phantom?.disconnect?.();
	} finally {
		phantom = null;
		listenersBound = false;
		await stopStreaming();
		state.update((s) => ({
			...s,
			connecting: false,
			connected: false,
			publicKeyBase58: '',
			walletName: 'Phantom'
		}));
	}
}

export const walletStore = {
	subscribe: state.subscribe,
	ensureReady,
	connect,
	disconnect,

	// Optional: allow manual control for pages that want to start early.
	startStreaming,
	stopStreaming
};


