import { json } from '@sveltejs/kit';
import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import crypto from 'node:crypto';
import { Connection, Keypair, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { SolanaStreamClient } from '@streamflow/stream';
import { getAdminPb } from '$lib/auth/pbAdmin.server';

function appendHeliusApiKey(url) {
	const key = String(publicEnv.PUBLIC_HELIUS_API_KEY || '').trim();
	if (!key) return url;
	if (String(url).includes('api-key=')) return url;
	const joiner = String(url).includes('?') ? '&' : '?';
	return `${url}${joiner}api-key=${encodeURIComponent(key)}`;
}

function defaultHttpRpcUrl() {
	if (publicEnv.PUBLIC_HELIUS_RPC_HTTP) return appendHeliusApiKey(publicEnv.PUBLIC_HELIUS_RPC_HTTP);
	if (publicEnv.PUBLIC_SOLANA_RPC_HTTP) return publicEnv.PUBLIC_SOLANA_RPC_HTTP;
	const c = String(publicEnv.PUBLIC_SOLANA_CLUSTER || '').trim().toLowerCase();
	if (c === 'devnet') return 'https://api.devnet.solana.com';
	if (c === 'testnet') return 'https://api.testnet.solana.com';
	return 'https://api.mainnet-beta.solana.com';
}

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
		const pb = await getAdminPb();
		const body = await request.json().catch(() => ({}));
		const { streamId, claimant, signature } = body || {};

		if (!streamId) return json({ message: 'Missing streamId.' }, { status: 400 });
		if (!claimant) return json({ message: 'Missing claimant.' }, { status: 400 });

		const stream = await pb.collection('streams').getOne(streamId);
		if (!stream?.streamflowId) return json({ message: 'Missing streamflowId.' }, { status: 400 });

		// Only allow claim when PB receiver wallet is unset.
		const receiverWallet = String(stream?.receiverWallet || '').trim();
		if (receiverWallet) {
			// Idempotent: if already claimed to this claimant, return ok.
			if (String(receiverWallet).trim() === String(claimant).trim()) return json({ ok: true });
			return json({ message: 'Stream already claimed.' }, { status: 409 });
		}

		const inviteCode = String(stream?.inviteCode || '').trim();
		if (!inviteCode) return json({ message: 'Missing inviteCode.' }, { status: 400 });

		const claimKp = deriveClaimKeypair(inviteCode);
		const rpcUrl = defaultHttpRpcUrl();
		const client = new SolanaStreamClient(rpcUrl);
		const connection = new Connection(rpcUrl, { commitment: 'confirmed' });

		const claimantPk = new PublicKey(String(claimant).trim());

		// If a signature is provided, we assume the client already executed the on-chain transfer.
		// Finalize by updating PocketBase (and recording signature).
		if (signature) {
			await pb.collection('streams').update(streamId, { receiverWallet: String(claimant).trim() });
			try {
				await pb.collection('audit_logs').create({
					stream: streamId,
					type: 'claim',
					message: `Claimed stream to ${String(claimant).trim()}`,
					meta: { signature: String(signature) }
				});
			} catch {
				// ignore
			}
			return json({ ok: true });
		}

		// Permanent fix: the claim vault account may not exist / may not have SOL on-chain.
		// We build a transaction that (a) creates or tops up the claim vault as needed (funded by claimant),
		// then (b) transfers the Streamflow recipient (invoked/signed by claim vault).
		//
		// The server signs with claim vault; the client signs with claimant and submits.

		const topupLamports = 3_000_000; // 0.003 SOL should cover ATA rent + fees for the transfer
		const vaultInfo = await connection.getAccountInfo(claimKp.publicKey, 'confirmed');
		const ixs = [];

		if (!vaultInfo) {
			// Create a system account (space 0) for the claim vault and fund it in one shot.
			ixs.push(
				SystemProgram.createAccount({
					fromPubkey: claimantPk,
					newAccountPubkey: claimKp.publicKey,
					lamports: topupLamports,
					space: 0,
					programId: SystemProgram.programId
				})
			);
		} else if (Number(vaultInfo.lamports || 0) < topupLamports) {
			ixs.push(
				SystemProgram.transfer({
					fromPubkey: claimantPk,
					toPubkey: claimKp.publicKey,
					lamports: topupLamports - Number(vaultInfo.lamports || 0)
				})
			);
		}

		const transferIxs = await client.prepareTransferInstructions(
			{ id: String(stream.streamflowId), newRecipient: String(claimant).trim() },
			{ invoker: { publicKey: claimKp.publicKey }, computeLimit: 200_000 }
		);
		ixs.push(...transferIxs);

		const { blockhash } = await connection.getLatestBlockhash('confirmed');
		const tx = new Transaction({ feePayer: claimantPk, recentBlockhash: blockhash }).add(...ixs);
		// Claim vault must sign (for transfer, and for createAccount if present).
		tx.partialSign(claimKp);

		const txBase64 = tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64');
		return json({ ok: true, txBase64 });
	} catch (e) {
		return json({ ok: false, message: e?.message ?? 'Claim failed.', details: e?.data ?? null }, { status: 500 });
	}
}


