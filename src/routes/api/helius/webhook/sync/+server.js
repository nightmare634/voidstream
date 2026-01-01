import { json } from '@sveltejs/kit';
import { syncHeliusWebhookAddresses } from '$lib/solana/heliusWebhook.server';

export async function POST() {
	try {
		const report = await syncHeliusWebhookAddresses();
		return json(report);
	} catch (e) {
		return json({ ok: false, message: e?.message ?? 'Webhook sync failed.' }, { status: 500 });
	}
}

export async function GET() {
	// Convenience: allow GET to run sync as well (useful for manual testing).
	return await POST();
}












