import { env } from '$env/dynamic/private';
import { getAdminPb } from '$lib/auth/pbAdmin.server';

function uniq(list) {
	return Array.from(new Set(list.filter(Boolean)));
}

async function heliusFetch(url, init = {}) {
	const res = await fetch(url, {
		...init,
		headers: {
			accept: 'application/json',
			'content-type': 'application/json',
			...(init.headers || {})
		}
	});
	const data = await res.json().catch(() => null);
	if (!res.ok) {
		const msg = data?.error || data?.message || `Helius request failed (${res.status})`;
		throw new Error(msg);
	}
	return data;
}

export async function getHeliusWebhook() {
	const apiKey = env.HELIUS_API_KEY;
	const webhookId = env.HELIUS_WEBHOOK_ID;
	if (!apiKey) throw new Error('Missing HELIUS_API_KEY.');
	if (!webhookId) throw new Error('Missing HELIUS_WEBHOOK_ID.');
	const url = `https://api.helius.xyz/v0/webhooks/${webhookId}?api-key=${encodeURIComponent(apiKey)}`;
	return await heliusFetch(url);
}

export async function updateHeliusWebhook({ accountAddresses }) {
	const apiKey = env.HELIUS_API_KEY;
	const webhookId = env.HELIUS_WEBHOOK_ID;
	if (!apiKey) throw new Error('Missing HELIUS_API_KEY.');
	if (!webhookId) throw new Error('Missing HELIUS_WEBHOOK_ID.');

	// Helius update expects the full config. We fetch current webhook first and PUT back with updated addresses.
	const current = await getHeliusWebhook();
	const url = `https://api.helius.xyz/v0/webhooks/${webhookId}?api-key=${encodeURIComponent(apiKey)}`;

	const payload = {
		webhookURL: current.webhookURL,
		webhookType: current.webhookType,
		transactionTypes: current.transactionTypes,
		accountAddresses: uniq(accountAddresses || []),
		// Keep any extra fields if present (Helius tolerates unknown keys).
		authHeader: current.authHeader,
		encoding: current.encoding
	};

	return await heliusFetch(url, { method: 'PUT', body: JSON.stringify(payload) });
}

function streamIsDone(stream, nowMs) {
	const status = String(stream?.status || '').toLowerCase();
	if (['cancelled', 'canceled', 'comp', 'completed', 'done'].includes(status)) return true;
	const endMs = Date.parse(stream?.endAt || '');
	if (Number.isFinite(endMs) && endMs > 0 && endMs <= nowMs) return true;
	return false;
}

export async function computeDesiredWebhookAddresses() {
	const pb = await getAdminPb();
	// Fetch a decent window; rules already handle auth for client, but admin needs to see all.
	const res = await pb.collection('streams').getList(1, 500);
	const nowMs = Date.now();

	const desired = [];
	for (const s of res.items || []) {
		if (streamIsDone(s, nowMs)) continue;
		desired.push(s.payerWallet);
		desired.push(s.receiverWallet);
	}

	return uniq(desired);
}

export async function syncHeliusWebhookAddresses() {
	const desired = await computeDesiredWebhookAddresses();
	const current = await getHeliusWebhook();
	const before = uniq(current?.accountAddresses || []);

	// Only update if changed (keeps us under rate limits).
	const beforeKey = before.slice().sort().join(',');
	const desiredKey = desired.slice().sort().join(',');
	if (beforeKey === desiredKey) {
		return {
			ok: true,
			changed: false,
			beforeCount: before.length,
			afterCount: before.length,
			added: [],
			removed: []
		};
	}

	const updated = await updateHeliusWebhook({ accountAddresses: desired });
	const after = uniq(updated?.accountAddresses || desired);

	const beforeSet = new Set(before);
	const afterSet = new Set(after);
	const added = after.filter((a) => !beforeSet.has(a));
	const removed = before.filter((a) => !afterSet.has(a));

	return {
		ok: true,
		changed: true,
		beforeCount: before.length,
		afterCount: after.length,
		added,
		removed
	};
}












