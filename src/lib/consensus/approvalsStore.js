import { writable } from 'svelte/store';
import { pb } from '$lib/auth/pb';

export const approvalsStore = writable({ loading: false, error: '', items: [] });

export async function loadApprovals(contextId) {
	if (!contextId) {
		approvalsStore.set({ loading: false, error: '', items: [] });
		return;
	}
	approvalsStore.set({ loading: true, error: '', items: [] });
	try {
		const res = await pb.collection('approvals').getList(1, 200, {
			filter: `context = "${contextId}"`
		});
		const pending = (res.items || [])
			.filter((a) => a.status === 'pending')
			.sort((a, b) => String(b.created || '').localeCompare(String(a.created || '')));
		approvalsStore.set({ loading: false, error: '', items: pending });
	} catch (e) {
		approvalsStore.set({ loading: false, error: e?.message ?? 'Failed to load approvals.', items: [] });
	}
}

export async function approve(approvalId) {
	const res = await fetch('/api/approvals/approve', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ approvalId })
	});
	const j = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error(j?.message ?? 'Approve failed.');
	return j;
}

export async function requestApproval({ action, streamId, payload, requestedBy, contextId }) {
	const res = await fetch('/api/approvals/request', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ action, streamId, payload, requestedBy, contextId })
	});
	const j = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error(j?.message ?? 'Approval request failed.');
	return j?.approval;
}


