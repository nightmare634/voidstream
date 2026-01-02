import { json } from '@sveltejs/kit';
import { getAdminPb } from '$lib/auth/pbAdmin.server';
import { executeStreamAction } from '$lib/streams/streamOps.server';

function uniq(list) {
	return Array.from(new Set(list.filter(Boolean)));
}

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
		const { approvalId, approver } = body || {};
		if (!approvalId) return json({ message: 'Missing approvalId.' }, { status: 400 });
		if (!approver) return json({ message: 'Missing approver.' }, { status: 400 });

		const approval = await pb.collection('approvals').getOne(approvalId);
		if (approval.status !== 'pending') return json({ message: 'Not pending.' }, { status: 400 });

		const ctx = await pb.collection('contexts').getOne(approval.context);
		const owners = normalizeOwners(ctx?.owners);
		if (!owners.includes(approver)) return json({ message: 'Approver not in owners.' }, { status: 403 });

		const nextApprovers = uniq([...(approval.approvers || []), approver]);
		let status = 'pending';
		let executed = false;

		// Fixed quorum 2-of-3 (or 2 of owners length if fewer).
		const quorum = Math.min(2, owners.length || 2);
		if (nextApprovers.length >= quorum) {
			status = 'approved';
		}

		const updated = await pb.collection('approvals').update(approvalId, {
			approvers: nextApprovers,
			status
		});

		// Execute on quorum and mark executed (idempotency: only from pending approvals).
		if (status === 'approved') {
			const actor = updated?.requestedBy || 'unknown';
			const streamId = updated?.stream || updated?.streamId || null;
			if (streamId) {
				await executeStreamAction({
					pb,
					streamId,
					action: updated.action,
					actor,
					payload: updated.payload || {},
					meta: { approvalId, approvers: nextApprovers, approvedBy: approver }
				});
			}
			const executedApproval = await pb.collection('approvals').update(approvalId, {
				status: 'executed'
			});
			executed = true;
			return json({ approval: executedApproval, executed });
		}

		return json({ approval: updated, executed });
	} catch (e) {
		return json({ message: e?.message ?? 'Failed to approve.', details: e?.data ?? null }, { status: 500 });
	}
}


