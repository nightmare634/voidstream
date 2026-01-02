/**
 * PocketBase schema bootstrap for Voidstream.
 *
 * Usage:
 *   PUBLIC_PB_URL=https://... PB_ADMIN_EMAIL=... PB_ADMIN_PASSWORD=... node scripts/pb_setup.mjs
 */

import PocketBase from 'pocketbase';

const PB_URL = process.env.PUBLIC_PB_URL || process.env.PB_URL;
const EMAIL = process.env.PB_ADMIN_EMAIL;
const PASS = process.env.PB_ADMIN_PASSWORD;

if (!PB_URL) throw new Error('Missing PUBLIC_PB_URL (or PB_URL).');
if (!EMAIL) throw new Error('Missing PB_ADMIN_EMAIL.');
if (!PASS) throw new Error('Missing PB_ADMIN_PASSWORD.');

const pb = new PocketBase(PB_URL);
pb.autoCancellation(false);
await pb.admins.authWithPassword(EMAIL, PASS);

function text(name, opts = {}) {
	return { name, type: 'text', required: !!opts.required, options: { min: null, max: null, pattern: '' } };
}
function number(name, opts = {}) {
	return { name, type: 'number', required: !!opts.required, options: { min: null, max: null, noDecimal: false } };
}
function date(name, opts = {}) {
	return { name, type: 'date', required: !!opts.required, options: { min: '', max: '' } };
}
function select(name, values, opts = {}) {
	return { name, type: 'select', required: !!opts.required, options: { maxSelect: 1, values } };
}
function jsonField(name, opts = {}) {
	return { name, type: 'json', required: !!opts.required, options: { maxSize: 2000000 } };
}
function relation(name, collectionIdOrName, opts = {}) {
	return {
		name,
		type: 'relation',
		required: !!opts.required,
		options: { collectionId: collectionIdOrName, cascadeDelete: !!opts.cascadeDelete, minSelect: 0, maxSelect: 1 }
	};
}
function file(name, opts = {}) {
	return {
		name,
		type: 'file',
		required: !!opts.required,
		options: {
			maxSelect: 1,
			maxSize: 50 * 1024 * 1024,
			mimeTypes: ['application/pdf'],
			thumbs: []
		}
	};
}

async function getCollectionByName(name) {
	const list = await pb.collections.getFullList({ sort: 'name' });
	return list.find((c) => c.name === name) || null;
}

async function ensureCollection({ name, type = 'base', fields = [] }) {
	const existing = await getCollectionByName(name);
	if (!existing) {
		console.log(`Creating collection: ${name}`);
		const created = await pb.collections.create({
			name,
			type,
			schema: fields,
			listRule: '',
			viewRule: '',
			createRule: '',
			updateRule: '',
			deleteRule: ''
		});
		return created;
	}

	// Merge fields by name (don’t delete unknown fields).
	const existingFields = existing.fields || [];
	const byName = new Map(existingFields.map((f) => [f.name, f]));
	let changed = false;

	for (const f of fields) {
		const prev = byName.get(f.name);
		if (!prev) {
			existingFields.push(f);
			changed = true;
		}
	}

	if (changed) {
		console.log(`Updating schema (additive): ${name}`);
		return await pb.collections.update(existing.id, { schema: existingFields });
	}

	console.log(`OK: ${name}`);
	return existing;
}

// Create base collections first.
await ensureCollection({
	name: 'streams',
	fields: [
		// Legacy fields (kept for backward compatibility; not required for new deployments)
		text('payer'),
		text('receiver'),
		number('amountLamports'),

		// Current app schema (rate-based)
		text('payerWallet', { required: true }),
		text('receiverWallet'),
		text('payerUser'),
		text('inviteCode'),
		number('rateLamportsPerSec', { required: true }),
		date('startAt', { required: true }),
		date('endAt', { required: true }),
		select('status', ['live', 'paused', 'cancelled', 'done'], { required: true }),
		date('lastAccrualAt'),
		date('pausedAt'),
		number('accruedLamports'),
		number('totalWithdrawnLamports'),
		text('memo'),
		text('createdBy'),

		// Mainnet / Streamflow metadata
		text('chain'),
		text('protocol'),
		text('streamflowId'),
		text('createSignature')
	]
});

await ensureCollection({
	name: 'audit_logs',
	fields: [
		// relation added after streams exist; PB accepts collection name in collectionId in newer versions
		relation('stream', 'streams'),
		text('type', { required: true }),
		text('message', { required: true }),
		text('signature'),
		text('actor'),
		jsonField('meta')
	]
});

await ensureCollection({
	name: 'contexts',
	fields: [select('mode', ['operator', 'consensus'], { required: true }), jsonField('owners', { required: true })]
});

await ensureCollection({
	name: 'approvals',
	fields: [
		relation('context', 'contexts', { required: true }),
		relation('stream', 'streams'),
		select('action', ['create', 'pause', 'resume', 'cancel', 'timeline_update', 'withdraw'], { required: true }),
		select('status', ['pending', 'approved', 'executed', 'rejected'], { required: true }),
		text('requestedBy', { required: true }),
		jsonField('approvers', { required: true }),
		jsonField('payload', { required: true })
	]
});

await ensureCollection({
	name: 'invoices',
	fields: [relation('stream', 'streams', { required: true }), file('pdf', { required: true }), text('number', { required: true }), jsonField('meta')]
});

console.log('Done.');











