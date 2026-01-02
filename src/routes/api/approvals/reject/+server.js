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
		const { approvalId, approver } = body || {};
		if (!approvalId) return json({ message: 'Missing approvalId.' }, { status: 400 });
		if (!approver) return json({ message: 'Missing approver.' }, { status: 400 });

		const approval = await pb.collection('approvals').getOne(approvalId);
		if (approval.status !== 'pending') return json({ message: 'Not pending.' }, { status: 400 });

		const ctx = await pb.collection('contexts').getOne(approval.context);
		const owners = normalizeOwners(ctx?.owners);
		if (!owners.includes(approver)) return json({ message: 'Approver not in owners.' }, { status: 403 });

		const updated = await pb.collection('approvals').update(approvalId, {
			status: 'rejected'
		});

		// Optional: audit log
		try {
			await pb.collection('audit_logs').create({
				stream: approval?.stream || undefined,
				type: 'reject',
				message: `Approval rejected: ${approval.action}`,
				actor: approver,
				meta: { approvalId, action: approval.action, stream: approval?.stream || null }
			});
		} catch {
			// ignore
		}

		return json({ approval: updated });
	} catch (e) {
		return json({ message: e?.message ?? 'Failed to reject.' }, { status: 500 });
	}
}








