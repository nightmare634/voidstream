import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { getAdminPb } from '$lib/auth/pbAdmin.server';
import { syncHeliusWebhookAddresses } from '$lib/solana/heliusWebhook.server';

function getHeader(request, name) {
	return request.headers.get(name) || request.headers.get(name.toLowerCase());
}

export async function POST({ request }) {
	try {
		const secret = env.HELIUS_WEBHOOK_SECRET;
		if (!secret) return json({ message: 'Missing HELIUS_WEBHOOK_SECRET.' }, { status: 500 });

		const got = getHeader(request, 'x-helius-secret') || getHeader(request, 'x-webhook-secret');
		if (got !== secret) return json({ message: 'Unauthorized.' }, { status: 401 });

		const payload = await request.json().catch(() => null);
		if (!payload) return json({ message: 'Invalid JSON.' }, { status: 400 });

		const pb = await getAdminPb();
		const events = Array.isArray(payload) ? payload : [payload];

		const created = [];
		for (const ev of events) {
			const signature = ev?.signature || ev?.transactionSignature || ev?.transaction?.signature || '';
			const type = ev?.type || ev?.transactionType || 'helius_webhook';
			const streamId = ev?.streamId || ev?.metadata?.streamId || null;

			const rec = await pb.collection('audit_logs').create({
				stream: streamId || undefined,
				type,
				message: `Helius webhook event: ${type}`,
				signature: signature || undefined,
				meta: ev
			});
			created.push(rec.id);
		}

		// Auto-remove wallets from the webhook when streams are done by re-syncing addresses.
		// (Also adds any new active wallets).
		try {
			await syncHeliusWebhookAddresses();
		} catch {
			// Don't fail ingestion on sync issues.
		}

		return json({ ok: true, createdCount: created.length, ids: created });
	} catch (e) {
		return json({ ok: false, message: e?.message ?? 'Webhook handler failed.' }, { status: 500 });
	}
}


