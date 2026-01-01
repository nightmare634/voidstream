import { json } from '@sveltejs/kit';
import { env as privateEnv } from '$env/dynamic/private';
import { Keypair } from '@solana/web3.js';
import crypto from 'node:crypto';

function deriveClaimKeypair(inviteCode) {
	const secret = String(privateEnv.PRIVATE_STREAM_CLAIM_SECRET || '').trim();
	if (!secret) throw new Error('Server missing PRIVATE_STREAM_CLAIM_SECRET.');
	const code = String(inviteCode || '').trim();
	if (!code) throw new Error('Missing inviteCode.');
	const seed = crypto.createHash('sha256').update(`${secret}:${code}`).digest().subarray(0, 32);
	return Keypair.fromSeed(seed);
}

export async function POST({ request }) {
	try {
		const body = await request.json().catch(() => ({}));
		const { inviteCode } = body || {};
		const kp = deriveClaimKeypair(inviteCode);
		return json({ ok: true, claimVault: kp.publicKey.toBase58() });
	} catch (e) {
		return json({ ok: false, message: e?.message ?? 'Failed to derive claim vault.' }, { status: 500 });
	}
}


