function nowIso() {
	return new Date().toISOString();
}

async function getAdminPbLazy() {
	// Avoid hard dependency on SvelteKit-only modules at import time (e.g. `$env`).
	const mod = await import('../auth/pbAdmin.server.js');
	return await mod.getAdminPb();
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

async function safeUpdate(pb, streamId, patch) {
	try {
		return await pb.collection('streams').update(streamId, patch);
	} catch {
		// Retry with only `status` if present; helps if schema doesn't include extra fields.
		if (patch && typeof patch === 'object' && 'status' in patch) {
			return await pb.collection('streams').update(streamId, { status: patch.status });
		}
		throw new Error('Update failed.');
	}
}

/**
 * Execute a stream operation and write an audit log.
 * Security: callers should validate payer/ownership before calling this, if needed.
 */
export async function executeStreamAction({
	pb = null,
	streamId,
	action,
	actor,
	payload = {},
	meta = {}
}) {
	const client = pb || (await getAdminPbLazy());
	if (!streamId) throw new Error('Missing streamId.');
	if (!action) throw new Error('Missing action.');
	if (!actor) throw new Error('Missing actor.');

	const stream = await client.collection('streams').getOne(streamId);

	let updatedStream = stream;
	let message = '';

	if (action === 'pause') {
		updatedStream = await safeUpdate(client, streamId, { status: 'paused', pausedAt: nowIso() });
		message = 'Stream paused.';
	} else if (action === 'resume') {
		updatedStream = await safeUpdate(client, streamId, { status: 'live', pausedAt: null });
		message = 'Stream resumed.';
	} else if (action === 'cancel') {
		updatedStream = await safeUpdate(client, streamId, { status: 'cancelled' });
		message = 'Stream cancelled.';
	} else if (action === 'timeline_update') {
		const next = payload || {};
		const patch = {};
		if (next.rateLamportsPerSec != null) patch.rateLamportsPerSec = Number(next.rateLamportsPerSec);
		if (next.startAt) patch.startAt = new Date(next.startAt).toISOString();
		if (next.endAt) patch.endAt = new Date(next.endAt).toISOString();
		updatedStream = await safeUpdate(client, streamId, patch);
		message = 'Timeline updated.';
	} else if (action === 'withdraw') {
		const amt = Number(payload?.amountLamports || 0);
		if (!Number.isFinite(amt) || amt <= 0) throw new Error('Invalid amount.');

		const prev = Number(stream?.totalWithdrawnLamports || 0);
		const nextTotal = prev + Math.floor(amt);
		try {
			updatedStream = await client.collection('streams').update(streamId, { totalWithdrawnLamports: nextTotal });
		} catch {
			updatedStream = stream;
		}
		message = `Withdraw recorded: ${Math.floor(amt)} lamports.`;
	} else {
		throw new Error('Unknown action.');
	}

	// IMPORTANT: don't fail the action if audit log fails due to schema differences.
	await safeAuditCreate(client, {
		stream: streamId,
		type: String(action),
		message,
		actor,
		meta: { payload: payload ?? null, ...meta }
	}).catch(() => {});

	return { stream: updatedStream };
}








