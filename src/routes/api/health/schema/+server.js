import { json } from '@sveltejs/kit';
import { getAdminPb } from '$lib/auth/pbAdmin.server';

const EXPECTED = {
	// Accept either legacy field names (payer/receiver/amountLamports) or current schema (payerWallet/receiverWallet/rateLamportsPerSec).
	streams: ['startAt', 'endAt', 'status'],
	audit_logs: ['type', 'message'],
	contexts: ['mode', 'owners'],
	approvals: ['context', 'action', 'status', 'requestedBy', 'approvers', 'payload'],
	invoices: ['stream', 'pdf', 'number']
};

function fieldNames(collection) {
	const fields = collection?.fields || [];
	return new Set(fields.map((f) => f?.name).filter(Boolean));
}

export async function GET() {
	try {
		const pb = await getAdminPb();
		const colsRes = await pb.collections.getList(1, 200, { sort: 'name' });
		const cols = colsRes.items;

		const byName = new Map(cols.map((c) => [c.name, c]));
		const report = {
			ok: true,
			missingCollections: [],
			missingFields: {},
			presentCollections: Array.from(byName.keys()).sort()
		};

		for (const [colName, requiredFields] of Object.entries(EXPECTED)) {
			const col = byName.get(colName);
			if (!col) {
				report.ok = false;
				report.missingCollections.push(colName);
				continue;
			}
			const names = fieldNames(col);
			const missing = requiredFields.filter((f) => !names.has(f));
			if (colName === 'streams') {
				const hasLegacy = names.has('payer') && names.has('receiver') && names.has('amountLamports');
				const hasCurrent = names.has('payerWallet') && names.has('receiverWallet') && names.has('rateLamportsPerSec');
				if (!hasLegacy && !hasCurrent) {
					report.ok = false;
					report.missingFields[colName] = [
						...(report.missingFields[colName] || []),
						'payerWallet/receiverWallet/rateLamportsPerSec (or legacy payer/receiver/amountLamports)'
					];
				}
			}
			if (missing.length) {
				report.ok = false;
				report.missingFields[colName] = missing;
			}
		}

		return json(report, { status: report.ok ? 200 : 424 });
	} catch (e) {
		return json(
			{
				ok: false,
				error: e?.message ?? 'Schema check failed.',
				hint: 'Set PUBLIC_PB_URL, PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD. See docs/ENV.md.'
			},
			{ status: 500 }
		);
	}
}


