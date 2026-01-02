import { writable } from 'svelte/store';
import { listStreams } from '$lib/pb/streams';
import { getPb } from '$lib/pb/client';

export const searchStore = writable({ loading: false, error: '', items: [] });

export async function rebuildIndex({ payer } = {}) {
	searchStore.set({ loading: true, error: '', items: [] });
	try {
		const streams = await listStreams();
		const pb = getPb();
		const logsRes = await pb.collection('audit_logs').getList(1, 300);
		const logs = (logsRes.items || []).sort((a, b) =>
			String(b.created || '').localeCompare(String(a.created || ''))
		);

		const items = [
			...streams.map((s) => ({
				type: 'stream',
				id: s.id,
				title: s.receiverWallet,
				subtitle: `Stream · ${s.status}`,
				href: `/streams/${s.id}`,
				text: `${s.receiverWallet} ${s.payerWallet} ${s.status} ${s.id}`
			})),
			...logs.slice(0, 300).map((l) => ({
				type: 'audit',
				id: l.id,
				title: l.type,
				subtitle: l.message,
				href: l.stream ? `/streams/${l.stream}` : '/dashboard',
				text: `${l.type} ${l.message} ${l.signature || ''} ${l.stream || ''}`
			}))
		];

		searchStore.set({ loading: false, error: '', items });
	} catch (e) {
		searchStore.set({ loading: false, error: e?.message ?? 'Failed to build index.', items: [] });
	}
}


