import { env } from '$env/dynamic/public';
import { browser } from '$app/environment';
import { SolanaStreamClient, getBN } from '@streamflow/stream';
import { BN } from 'bn.js';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import {
	ASSOCIATED_TOKEN_PROGRAM_ID,
	NATIVE_MINT,
	TOKEN_PROGRAM_ID,
	createCloseAccountInstruction,
	createSyncNativeInstruction,
	getAssociatedTokenAddressSync
} from '@solana/spl-token';

function getCluster() {
	const c = String(env.PUBLIC_SOLANA_CLUSTER || '').trim().toLowerCase();
	if (!c) return 'mainnet-beta';
	if (c === 'mainnet') return 'mainnet-beta';
	return c;
}

function appendHeliusApiKey(url) {
	const key = env.PUBLIC_HELIUS_API_KEY || '';
	if (!key) return url;
	if (String(url).includes('api-key=')) return url;
	const joiner = String(url).includes('?') ? '&' : '?';
	return `${url}${joiner}api-key=${encodeURIComponent(key)}`;
}

function defaultHttpRpcUrl() {
	if (env.PUBLIC_HELIUS_RPC_HTTP) return appendHeliusApiKey(env.PUBLIC_HELIUS_RPC_HTTP);
	if (env.PUBLIC_SOLANA_RPC_HTTP) return env.PUBLIC_SOLANA_RPC_HTTP;
	const cluster = getCluster();
	if (cluster === 'devnet') return 'https://api.devnet.solana.com';
	if (cluster === 'testnet') return 'https://api.testnet.solana.com';
	return 'https://api.mainnet-beta.solana.com';
}

/** Streamflow uses SPL tokens under the hood; native SOL streams use wrapped SOL mint. */
export const WSOL_MINT = 'So11111111111111111111111111111111111111112';

let _client = null;

export function getStreamflowClient() {
	if (_client) return _client;
	const rpcUrl = defaultHttpRpcUrl();
	_client = new SolanaStreamClient(rpcUrl);
	return _client;
}

export function getRpcConnection() {
	return new Connection(defaultHttpRpcUrl(), { commitment: 'confirmed' });
}

function getPhantom() {
	if (!browser) throw new Error('Not in browser.');
	const p = /** @type {any} */ (window?.solana);
	if (!p?.isPhantom) throw new Error('Phantom wallet not detected.');
	return p;
}

async function signAndSend(tx) {
	const phantom = getPhantom();
	const connection = getRpcConnection();

	async function confirmSignature(signature, timeoutMs = 60_000) {
		const started = Date.now();
		// Polling confirmation avoids relying on websocket subscriptions (which may fail on some networks).
		// eslint-disable-next-line no-constant-condition
		while (true) {
			const { value } = await connection.getSignatureStatuses([signature], { searchTransactionHistory: true });
			const s = value?.[0];
			if (s?.err) throw new Error(`Transaction failed: ${JSON.stringify(s.err)}`);
			if (s?.confirmationStatus === 'confirmed' || s?.confirmationStatus === 'finalized') return;
			if (Date.now() - started > timeoutMs) throw new Error('Timed out confirming transaction. Check Solscan for status.');
			await new Promise((r) => setTimeout(r, 1500));
		}
	}

	if (phantom?.signAndSendTransaction) {
		const res = await phantom.signAndSendTransaction(tx);
		const sig = res?.signature ? String(res.signature) : '';
		if (!sig) throw new Error('Wallet did not return a signature.');
		await confirmSignature(sig);
		return sig;
	}

	// Fallback: sign then send raw.
	const signed = await phantom.signTransaction(tx);
	const raw = signed.serialize();
	const sig = await connection.sendRawTransaction(raw, { skipPreflight: false });
	await confirmSignature(sig);
	return sig;
}

function ensurePubkeyBase58(pubkey) {
	const s = String(pubkey || '').trim();
	if (!s) throw new Error('Missing wallet public key.');
	return s;
}

export function buildCreateSolStreamParams({
	recipient,
	startAtIso,
	endAtIso,
	rateLamportsPerSec,
	name,
	transferableByRecipient = false
}) {
	const startSec = Math.floor(Date.parse(startAtIso) / 1000);
	const endSec = Math.floor(Date.parse(endAtIso) / 1000);
	const rate = Number(rateLamportsPerSec);
	if (!Number.isFinite(startSec) || startSec <= 0) throw new Error('Invalid start time.');
	if (!Number.isFinite(endSec) || endSec <= startSec) throw new Error('Invalid end time.');
	if (!Number.isFinite(rate) || rate <= 0) throw new Error('Invalid rate.');

	const duration = endSec - startSec;
	const totalLamports = Math.floor(rate * duration);
	const totalAmount = getBN(totalLamports, 0); // already lamports

	return {
		recipient: String(recipient).trim(),
		tokenId: WSOL_MINT,
		start: startSec,
		amount: totalAmount,
		period: 1, // 1 second “ticks” => lamports/sec behavior
		cliff: startSec,
		cliffAmount: new BN(0),
		amountPerPeriod: new BN(Math.floor(rate)),
		name: name || 'Voidstream',
		canTopup: false,
		canPause: false, // Streamflow doesn’t expose pause/resume; we emulate via update(rate=0) in-app.
		canUpdateRate: true,
		cancelableBySender: true,
		cancelableByRecipient: true,
		transferableBySender: false,
		transferableByRecipient: !!transferableByRecipient,
		automaticWithdrawal: false
	};
}

export async function createStreamOnchain({ senderPublicKeyBase58, createParams }) {
	const client = getStreamflowClient();
	// Creation via Streamflow SDK "unchecked" path is more tolerant of ATA ownership edge-cases
	// (avoids preflight ATA check/create failures like InstructionError: IllegalOwner).
	ensurePubkeyBase58(senderPublicKeyBase58);
	const phantom = getPhantom();
	if (!phantom?.publicKey) throw new Error('Connect Phantom to continue.');

	const { txId, metadataId } = await client.createUnchecked(createParams, {
		sender: phantom,
		isNative: true
	});
	return { signature: String(txId), streamflowId: String(metadataId) };
}

export async function withdrawOnchain({ invokerPublicKeyBase58, streamflowId, amountLamports }) {
	const client = getStreamflowClient();
	const invokerPk = new PublicKey(ensurePubkeyBase58(invokerPublicKeyBase58));
	const amount = amountLamports != null ? new BN(Math.floor(Number(amountLamports))) : undefined;
	const ixs = await client.prepareWithdrawInstructions(
		{ id: String(streamflowId), amount },
		{ invoker: { publicKey: invokerPk }, checkTokenAccounts: true }
	);
	const connection = getRpcConnection();
	const { blockhash } = await connection.getLatestBlockhash('confirmed');
	const tx = new Transaction({ feePayer: invokerPk, recentBlockhash: blockhash }).add(...ixs);
	const sig = await signAndSend(tx);
	return { signature: sig };
}

/**
 * Withdraw from a WSOL (native SOL) stream and immediately unwrap to native SOL in the same tx.
 *
 * Safety: only attempts to close the WSOL ATA if it did NOT exist before (so we don't unwrap/close
 * a user's pre-existing WSOL account that may contain other WSOL).
 */
export async function withdrawAndUnwrapOnchain({ invokerPublicKeyBase58, streamflowId, amountLamports }) {
	const client = getStreamflowClient();
	const invokerPk = new PublicKey(ensurePubkeyBase58(invokerPublicKeyBase58));
	const connection = getRpcConnection();

	const amount = amountLamports != null ? new BN(Math.floor(Number(amountLamports))) : undefined;
	const withdrawIxs = await client.prepareWithdrawInstructions(
		{ id: String(streamflowId), amount },
		{ invoker: { publicKey: invokerPk }, checkTokenAccounts: true }
	);

	// WSOL ATA for the invoker (receiver) on the legacy token program.
	const wsolAta = getAssociatedTokenAddressSync(
		NATIVE_MINT,
		invokerPk,
		false,
		TOKEN_PROGRAM_ID,
		ASSOCIATED_TOKEN_PROGRAM_ID
	);

	const existedBefore = !!(await connection.getAccountInfo(wsolAta, 'confirmed'));

	const ixs = [...withdrawIxs];
	let unwrapped = false;
	let attemptedUnwrap = false;

	// If the WSOL ATA didn't exist, Streamflow's withdraw (with checkTokenAccounts) will create it.
	// In that case, it's safe to unwrap by closing it right after.
	if (!existedBefore) {
		attemptedUnwrap = true;
		// Ensure WSOL native amount is synced before closing.
		ixs.push(createSyncNativeInstruction(wsolAta));
		ixs.push(createCloseAccountInstruction(wsolAta, invokerPk, invokerPk, [], TOKEN_PROGRAM_ID));
	}

	const { blockhash } = await connection.getLatestBlockhash('confirmed');
	const tx = new Transaction({ feePayer: invokerPk, recentBlockhash: blockhash }).add(...ixs);

	const sig = await signAndSend(tx);
	if (attemptedUnwrap) unwrapped = true;
	return { signature: sig, unwrapped, attemptedUnwrap };
}

export async function cancelOnchain({ invokerPublicKeyBase58, streamflowId }) {
	const client = getStreamflowClient();
	const invokerPk = new PublicKey(ensurePubkeyBase58(invokerPublicKeyBase58));
	const ixs = await client.prepareCancelInstructions(
		{ id: String(streamflowId) },
		{ invoker: { publicKey: invokerPk }, checkTokenAccounts: true }
	);
	const connection = getRpcConnection();
	const { blockhash } = await connection.getLatestBlockhash('confirmed');
	const tx = new Transaction({ feePayer: invokerPk, recentBlockhash: blockhash }).add(...ixs);
	const sig = await signAndSend(tx);
	return { signature: sig };
}

export async function updateRateOnchain({ invokerPublicKeyBase58, streamflowId, amountPerPeriodLamports }) {
	const client = getStreamflowClient();
	const invokerPk = new PublicKey(ensurePubkeyBase58(invokerPublicKeyBase58));
	const next = new BN(Math.floor(Number(amountPerPeriodLamports || 0)));
	const ixs = await client.prepareUpdateInstructions(
		{ id: String(streamflowId), amountPerPeriod: next },
		{ invoker: { publicKey: invokerPk } }
	);
	const connection = getRpcConnection();
	const { blockhash } = await connection.getLatestBlockhash('confirmed');
	const tx = new Transaction({ feePayer: invokerPk, recentBlockhash: blockhash }).add(...ixs);
	const sig = await signAndSend(tx);
	return { signature: sig };
}


