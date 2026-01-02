import { json } from '@sveltejs/kit';
import { getAdminPb } from '$lib/auth/pbAdmin.server';

export async function POST({ request }) {
	try {
		const pb = await getAdminPb();
		const body = await request.json().catch(() => ({}));

		const { action, streamId, payload, requestedBy, contextId } = body || {};
		if (!action) return json({ message: 'Missing action.' }, { status: 400 });

		const ctxRes = await pb.collection('contexts').getList(1, 200);
		const ctxItems = (ctxRes.items || []).sort((a, b) =>
			String(b.created || '').localeCompare(String(a.created || ''))
		);
		const ctxId = contextId || ctxItems[0]?.id;
		if (!ctxId) return json({ message: 'Missing context.' }, { status: 400 });

		const approval = await pb.collection('approvals').create({
			context: ctxId,
			stream: streamId || undefined,
			action,
			status: 'pending',
			requestedBy: requestedBy || 'unknown',
			approvers: [],
			payload: payload ?? {}
		});

		return json({ approval });
	} catch (e) {
		return json({ message: e?.message ?? 'Failed to request approval.' }, { status: 500 });
	}
}


