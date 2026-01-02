import { writable } from 'svelte/store';
import { modeStore } from '$lib/ui/uiStore';

export const contextStore = writable({ loading: true, error: '', context: null });

export async function loadContext() {
	contextStore.set({ loading: true, error: '', context: null });
	try {
		const res = await fetch('/api/contexts');
		const j = await res.json().catch(() => ({}));
		if (!res.ok) throw new Error(j?.message ?? 'Failed to load context.');
		const ctx = j?.context ?? null;
		if (ctx?.mode === 'off') ctx.mode = 'operator';
		// Consensus is disabled for now (coming soon).
		if (ctx?.mode === 'consensus') ctx.mode = 'operator';
		contextStore.set({ loading: false, error: '', context: ctx });
		if (ctx?.mode) modeStore.set(ctx.mode);
	} catch (e) {
		contextStore.set({ loading: false, error: e?.message ?? 'Failed to load context.', context: null });
	}
}

export async function saveContext({ mode, owners }) {
	const res = await fetch('/api/contexts', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ mode, owners })
	});
	const j = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error(j?.message ?? 'Failed to save context.');
	const ctx = j?.context ?? null;
	if (ctx?.mode === 'off') ctx.mode = 'operator';
	if (ctx?.mode === 'consensus') ctx.mode = 'operator';
	contextStore.set({ loading: false, error: '', context: ctx });
	if (ctx?.mode) modeStore.set(ctx.mode);
	return ctx;
}


