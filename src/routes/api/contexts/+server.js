import { json } from '@sveltejs/kit';
import { getAdminPb } from '$lib/auth/pbAdmin.server';

function sortByCreatedDesc(items) {
	return (items || []).slice().sort((a, b) => String(b.created || '').localeCompare(String(a.created || '')));
}

function normalizeOwners(v) {
	// PB might store owners as json array OR as text (json string)
	if (Array.isArray(v)) return v.filter(Boolean);
	if (typeof v === 'string') {
		try {
			const parsed = JSON.parse(v);
			if (Array.isArray(parsed)) return parsed.filter(Boolean);
		} catch {
			// ignore
		}
		// fallback: split lines
		return v
			.split('\n')
			.map((s) => s.trim())
			.filter(Boolean);
	}
	return [];
}

async function saveContext(pb, existingId, payload) {
	// Attempt #1: owners as array (proper json field)
	try {
		return existingId
			? await pb.collection('contexts').update(existingId, payload)
			: await pb.collection('contexts').create(payload);
	} catch (e) {
		// Attempt #2: owners as JSON string (works if field is text)
		const fallback = { ...payload, owners: JSON.stringify(payload.owners || []) };
		return existingId
			? await pb.collection('contexts').update(existingId, fallback)
			: await pb.collection('contexts').create(fallback);
	}
}

export async function GET() {
	try {
		const pb = await getAdminPb();
		const res = await pb.collection('contexts').getList(1, 200);
		const items = sortByCreatedDesc(res.items || []);
		const ctx = items[0] ?? null;
		if (ctx) {
			ctx.owners = normalizeOwners(ctx.owners);
			// Back-compat: treat legacy "off" as "operator"
			if (ctx.mode === 'off') ctx.mode = 'operator';
			// Consensus is disabled for now (coming soon) — never expose it as active.
			if (ctx.mode === 'consensus') ctx.mode = 'operator';
		}
		return json({ context: ctx });
	} catch (e) {
		return json({ message: e?.message ?? 'Failed to load context.' }, { status: 500 });
	}
}

export async function POST({ request }) {
	try {
		const pb = await getAdminPb();
		const body = await request.json().catch(() => ({}));
		// Modes:
		// - operator: direct execution (no approvals)
		// - consensus: approvals required (disabled in UI for now)
		// Consensus is disabled for now (coming soon) — always store operator.
		const mode = 'operator';
		const owners = normalizeOwners(body?.owners);

		// server-side validation to match UI (fixed 2-of-3)
		if (mode === 'consensus' && owners.length !== 3) {
			return json({ message: 'Consensus mode requires exactly 3 owners (fixed 2-of-3).' }, { status: 400 });
		}

		const res = await pb.collection('contexts').getList(1, 200);
		const items = sortByCreatedDesc(res.items || []);
		const existing = items[0] ?? null;
		const payload = { mode, owners };

		const saved = await saveContext(pb, existing?.id, payload);
		saved.owners = normalizeOwners(saved.owners);
		if (saved?.mode === 'off') saved.mode = 'operator';
		if (saved?.mode === 'consensus') saved.mode = 'operator';

		return json({ context: saved });
	} catch (e) {
		return json(
			{
				message: e?.message ?? 'Failed to save context.',
				details: e?.data ?? null
			},
			{ status: 500 }
		);
	}
}


