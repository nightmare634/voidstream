import { getPb } from './client';

export async function listAuditLogs({ streamId } = {}) {
	const pb = getPb();
	const filter = streamId ? `stream = "${streamId}"` : '';
	const res = await pb
		.collection('audit_logs')
		.getList(1, 200, { ...(filter ? { filter } : {}) });
	return (res.items || []).sort((a, b) => String(b.created || '').localeCompare(String(a.created || '')));
}


