import { getAdminPb } from '$lib/auth/pbAdmin.server';

function sortByCreatedDesc(items) {
	return (items || []).slice().sort((a, b) => String(b.created || '').localeCompare(String(a.created || '')));
}

export async function getLatestContext(pb = null) {
	const client = pb || (await getAdminPb());
	const res = await client.collection('contexts').getList(1, 200);
	const items = sortByCreatedDesc(res.items || []);
	return items[0] || null;
}

export function quorumForOwners(owners) {
	const n = Array.isArray(owners) ? owners.length : 0;
	return Math.min(2, n || 2);
}

export function isConsensusEnabled(ctx) {
	return String(ctx?.mode || '').toLowerCase() === 'consensus';
}

export function ownersFromContext(ctx) {
	return Array.isArray(ctx?.owners) ? ctx.owners.filter(Boolean) : [];
}












