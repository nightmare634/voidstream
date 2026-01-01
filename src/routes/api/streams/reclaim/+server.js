import { json } from '@sveltejs/kit';
import { getAdminPb } from '$lib/auth/pbAdmin.server';

async function safeAuditCreate(pb, data) {
	// Try meta as object → string → omitted (PB schema differences across versions)
	try {
		return await pb.collection('audit_logs').create(data);
	} catch {
		try {
			return await pb.collection('audit_logs').create({
				...data,
				meta: typeof data?.meta === 'string' ? data.meta : JSON.stringify(data?.meta ?? null)
			});
		} catch {
			return await pb.collection('audit_logs').create({
				stream: data.stream,
				type: data.type,
				message: data.message,
				actor: data.actor
			});
		}
	}
}

export async function POST({ request }) {
	try {
		const pb = await getAdminPb();
		const body = await request.json().catch(() => ({}));
		const { streamId, requester, signature } = body || {};
		if (!streamId) return json({ message: 'Missing streamId.' }, { status: 400 });

		const stream = await pb.collection('streams').getOne(streamId);
		const isPayer = !!stream?.payerWallet && requester === stream.payerWallet;
		const isReceiver = !!stream?.receiverWallet && requester === stream.receiverWallet;
		if (requester && !isPayer && !isReceiver) return json({ message: 'Not authorized.' }, { status: 403 });

		// Minimal reclaim: mark cancelled + add audit log.
		const updated = await pb.collection('streams').update(streamId, { status: 'cancelled' });
		await safeAuditCreate(pb, {
			stream: streamId,
			type: 'reclaim',
			message: isReceiver ? 'Receiver swept (cancelled) the stream.' : 'Payer reclaimed (cancelled) the stream.',
			signature: signature ? String(signature) : '',
			actor: requester || stream.payerWallet || stream.receiverWallet,
			meta: { streamId }
		}).catch(() => {});

		return json({ stream: updated });
	} catch (e) {
		return json({ message: e?.message ?? 'Reclaim failed.', details: e?.data ?? null }, { status: 500 });
	}
}


