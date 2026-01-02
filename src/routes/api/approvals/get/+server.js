import { json } from '@sveltejs/kit';
import { getAdminPb } from '$lib/auth/pbAdmin.server';

function normalizeOwners(v) {
	if (Array.isArray(v)) return v.filter(Boolean);
	if (typeof v === 'string') {
		try {
			const parsed = JSON.parse(v);
			if (Array.isArray(parsed)) return parsed.filter(Boolean);
		} catch {
			// ignore
		}
	}
	return [];
}

export async function POST({ request }) {
	try {
		const pb = await getAdminPb();
		const body = await request.json().catch(() => ({}));
		const { approvalId, viewer } = body || {};
		if (!approvalId) return json({ message: 'Missing approvalId.' }, { status: 400 });
		if (!viewer) return json({ message: 'Missing viewer.' }, { status: 400 });

		const approval = await pb.collection('approvals').getOne(approvalId);
		const ctx = await pb.collection('contexts').getOne(approval.context);
		const owners = normalizeOwners(ctx?.owners);
		if (!owners.includes(viewer)) return json({ message: 'Viewer not in owners.' }, { status: 403 });

		let stream = null;
		const streamId = approval?.stream || approval?.streamId || null;
		if (streamId) {
			try {
				stream = await pb.collection('streams').getOne(streamId);
			} catch {
				stream = null;
			}
		}

		return json({
			approval,
			context: { id: ctx.id, mode: ctx.mode, owners },
			stream: stream
				? {
						id: stream.id,
						payerWallet: stream.payerWallet,
						receiverWallet: stream.receiverWallet,
						status: stream.status
					}
				: null
		});
	} catch (e) {
		return json({ message: e?.message ?? 'Failed to load approval.' }, { status: 500 });
	}
}








