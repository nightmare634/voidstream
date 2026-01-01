import { json } from '@sveltejs/kit';
import { getAdminPb } from '$lib/auth/pbAdmin.server';

function nowIso() {
	return new Date().toISOString();
}

async function safeUpdate(pb, streamId, patch) {
	try {
		return await pb.collection('streams').update(streamId, patch);
	} catch {
		// If schema doesn't support some fields, retry with only `status` if present.
		if (patch && typeof patch === 'object' && 'status' in patch) {
			return await pb.collection('streams').update(streamId, { status: patch.status });
		}
		throw new Error('Update failed.');
	}
}

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
		const { streamId, action, requester, payload, signature } = body || {};

		if (!streamId) return json({ message: 'Missing streamId.' }, { status: 400 });
		if (!action) return json({ message: 'Missing action.' }, { status: 400 });
		if (!requester) return json({ message: 'Missing requester.' }, { status: 400 });

		const stream = await pb.collection('streams').getOne(streamId);
		const isPayer = !!stream?.payerWallet && requester === stream.payerWallet;
		const hasReceiver = !!String(stream?.receiverWallet || '').trim();
		const isReceiver = hasReceiver && requester === String(stream.receiverWallet).trim();
		const isUnclaimedReceiver = !hasReceiver;

		// Role-based permissions:
		// - pause/resume/timeline_update: payer only
		// - withdraw: receiver only (unclaimed streams must be claimed first via /api/streams/claim)
		// - cancel: payer or receiver
		if (action === 'pause' || action === 'resume' || action === 'timeline_update') {
			if (!isPayer) return json({ message: 'Not payer.' }, { status: 403 });
		} else if (action === 'withdraw') {
			if (!isReceiver) return json({ message: 'Not receiver.' }, { status: 403 });
		} else if (action === 'cancel') {
			if (!isPayer && !isReceiver) return json({ message: 'Not authorized.' }, { status: 403 });
		}

		let updatedStream = stream;
		let auditType = String(action);
		let message = '';

		if (action === 'pause') {
			updatedStream = await safeUpdate(pb, streamId, { status: 'paused', pausedAt: nowIso() });
			message = 'Stream paused.';
		} else if (action === 'resume') {
			updatedStream = await safeUpdate(pb, streamId, { status: 'live', pausedAt: null });
			message = 'Stream resumed.';
		} else if (action === 'cancel') {
			updatedStream = await safeUpdate(pb, streamId, { status: 'cancelled' });
			message = 'Stream cancelled.';
		} else if (action === 'timeline_update') {
			const next = payload || {};
			const patch = {};
			if (next.rateLamportsPerSec != null) patch.rateLamportsPerSec = Number(next.rateLamportsPerSec);
			if (next.startAt) patch.startAt = new Date(next.startAt).toISOString();
			if (next.endAt) patch.endAt = new Date(next.endAt).toISOString();
			updatedStream = await safeUpdate(pb, streamId, patch);
			message = 'Timeline updated.';
		} else if (action === 'withdraw') {
			const amt = Number(payload?.amountLamports || 0);
			if (!Number.isFinite(amt) || amt <= 0) return json({ message: 'Invalid amount.' }, { status: 400 });
			if (!signature) return json({ message: 'Missing signature.' }, { status: 400 });

			// Mainnet mode: on-chain tx is the source of truth. We only record the action + signature.
			message = `Withdraw executed on-chain: ${Math.floor(amt)} lamports.`;
		} else {
			return json({ message: 'Unknown action.' }, { status: 400 });
		}

		// IMPORTANT: don't fail the action if audit log fails due to schema differences.
		await safeAuditCreate(pb, {
			stream: streamId,
			type: auditType,
			message,
			signature: signature ? String(signature) : '',
			actor: requester,
			meta: { action, payload: payload ?? null }
		}).catch(() => {});

		return json({ ok: true, stream: updatedStream });
	} catch (e) {
		return json(
			{ ok: false, message: e?.message ?? 'Action failed.', details: e?.data ?? null },
			{ status: 500 }
		);
	}
}






