import { writable } from 'svelte/store';

// Very small client-side SOL/USD price store (Coingecko).
// Used for USD previews only; app still operates in SOL/lamports.

const state = writable({ loading: false, error: '', usd: null, asOf: 0 });

let inflight = null;

export const solPriceStore = {
	subscribe: state.subscribe,
	load
};

export async function load({ maxAgeMs = 5 * 60 * 1000 } = {}) {
	const now = Date.now();
	let snap;
	state.update((s) => {
		snap = s;
		return s;
	});
	if (snap?.usd && snap?.asOf && now - snap.asOf < maxAgeMs) return snap.usd;
	if (inflight) return inflight;

	inflight = (async () => {
		state.update((s) => ({ ...s, loading: true, error: '' }));
		try {
			const res = await fetch(
				'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
				{ headers: { accept: 'application/json' } }
			);
			const j = await res.json().catch(() => ({}));
			const usd = Number(j?.solana?.usd);
			if (!res.ok || !Number.isFinite(usd) || usd <= 0) throw new Error('Failed to fetch SOL price.');
			state.update((s) => ({ ...s, loading: false, usd, asOf: Date.now(), error: '' }));
			return usd;
		} catch (e) {
			state.update((s) => ({ ...s, loading: false, error: e?.message ?? 'Price fetch failed.' }));
			return null;
		} finally {
			inflight = null;
		}
	})();

	return inflight;
}












