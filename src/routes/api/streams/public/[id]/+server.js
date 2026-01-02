import { json } from '@sveltejs/kit';
import { getAdminPb } from '$lib/auth/pbAdmin.server';

export async function GET({ params }) {
	try {
		const pb = await getAdminPb();
		const id = params?.id;
		if (!id) return json({ message: 'Missing id.' }, { status: 400 });

		const s = await pb.collection('streams').getOne(id);

		// Return only what the receiver page needs (public-safe summary).
		return json({
			stream: {
				id: s.id,
				created: s.created,
				updated: s.updated,
				status: s.status,
				payerWallet: s.payerWallet,
				receiverWallet: s.receiverWallet,
				startAt: s.startAt,
				endAt: s.endAt,
				pausedAt: s.pausedAt ?? null,
				rateLamportsPerSec: s.rateLamportsPerSec,
				totalWithdrawnLamports: s.totalWithdrawnLamports ?? 0,
				chain: s.chain ?? '',
				protocol: s.protocol ?? '',
				streamflowId: s.streamflowId ?? ''
			}
		});
	} catch (e) {
		return json({ message: e?.message ?? 'Failed to load stream.' }, { status: 500 });
	}
}







