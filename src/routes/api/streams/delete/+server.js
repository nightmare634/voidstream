import { json } from '@sveltejs/kit';
import { getAdminPb } from '$lib/auth/pbAdmin.server';

async function safeDeleteMany(pb, collection, filter) {
	// Delete in pages (PB filter syntax). Best-effort if collection doesn't exist.
	try {
		// eslint-disable-next-line no-constant-condition
		while (true) {
			const res = await pb.collection(collection).getList(1, 200, filter ? { filter } : {});
			const items = res?.items || [];
			if (!items.length) break;
			for (const it of items) {
				try {
					await pb.collection(collection).delete(it.id);
				} catch {
					// ignore per-item failures
				}
			}
		}
	} catch {
		// ignore if schema differs / collection missing
	}
}

export async function POST({ request }) {
	try {
		const pb = await getAdminPb();
		const body = await request.json().catch(() => ({}));
		const { streamId, requester, signature, mode } = body || {};

		if (!streamId) return json({ message: 'Missing streamId.' }, { status: 400 });
		if (!requester) return json({ message: 'Missing requester.' }, { status: 400 });

		// PB-only delete: remove from dashboard without any on-chain requirements.
		const pbOnly = String(mode || '').toLowerCase() === 'pb_only';
		if (!pbOnly && !signature) return json({ message: 'Missing signature.' }, { status: 400 });

		const stream = await pb.collection('streams').getOne(streamId);
		const isPayer = !!stream?.payerWallet && String(requester).trim() === String(stream.payerWallet).trim();
		if (!isPayer) return json({ message: 'Not payer.' }, { status: 403 });

		// Delete related records first.
		await safeDeleteMany(pb, 'audit_logs', `stream = "${streamId}"`);
		await safeDeleteMany(pb, 'invoices', `stream = "${streamId}"`);
		// Best-effort: approvals may not exist (and are currently gated/coming soon).
		await safeDeleteMany(pb, 'approvals', `stream = "${streamId}"`);

		// Delete the stream record last.
		await pb.collection('streams').delete(streamId);

		return json({ ok: true });
	} catch (e) {
		return json({ ok: false, message: e?.message ?? 'Delete failed.', details: e?.data ?? null }, { status: 500 });
	}
}



