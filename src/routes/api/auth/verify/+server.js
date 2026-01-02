import { json } from '@sveltejs/kit';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import PocketBase from 'pocketbase';
import { env } from '$env/dynamic/private';
import { getAdminPb } from '$lib/auth/pbAdmin.server';
import { consumeNonce } from '$lib/auth/nonceStore.server';
import { derivePasswordFromWallet } from '$lib/auth/derivePassword.server';

function toBytes(msg) {
	return new TextEncoder().encode(msg);
}

export async function POST({ request }) {
	try {
		const body = await request.json().catch(() => ({}));
		const wallet = String(body?.wallet || '');
		const nonce = String(body?.nonce || '');
		const message = String(body?.message || '');
		const sigB64 = String(body?.signature || '');

		if (!wallet || !nonce || !message || !sigB64) return json({ message: 'Missing fields.' }, { status: 400 });
		if (!consumeNonce(wallet, nonce)) return json({ message: 'Invalid or expired nonce.' }, { status: 400 });

		const signature = Uint8Array.from(Buffer.from(sigB64, 'base64'));
		const pubkeyBytes = bs58.decode(wallet);
		const ok = nacl.sign.detached.verify(toBytes(message), signature, pubkeyBytes);
		if (!ok) return json({ message: 'Invalid signature.' }, { status: 401 });

		// In some deployments (or when running `node build`) SvelteKit's env helpers may not
		// see `.env` unless vars are injected into the process environment. Fall back to process.env.
		const PB_URL =
			env.PB_URL || process.env.PB_URL || env.PUBLIC_PB_URL || process.env.PUBLIC_PB_URL;
		if (!PB_URL) return json({ message: 'Missing PB_URL (server-only).' }, { status: 500 });

		const email = `${wallet}@wallet.local`;
		const password = derivePasswordFromWallet(wallet);

		// Ensure auth record exists + wallet field is correct.
		const adminPb = await getAdminPb();
		let user = null;
		try {
			user = await adminPb.collection('users').getFirstListItem(`email = "${email}"`);
		} catch {
			user = null;
		}
		if (!user) {
			user = await adminPb.collection('users').create({
				email,
				password,
				passwordConfirm: password,
				wallet,
				verified: true
			});
		} else {
			// IMPORTANT: reset password so authWithPassword succeeds even if the record existed before.
			// Also keep wallet field in sync.
			user = await adminPb.collection('users').update(user.id, {
				wallet,
				password,
				passwordConfirm: password,
				verified: true
			});
		}

		// Login as user to get token/record
		const pb = new PocketBase(PB_URL);
		pb.autoCancellation(false);
		let auth;
		try {
			auth = await pb.collection('users').authWithPassword(email, password);
		} catch (e) {
			// Surface clearer info to the client
			throw new Error(e?.message || 'Failed to authenticate.');
		}

		return json({ token: auth.token, record: auth.record });
	} catch (e) {
		return json({ message: e?.message ?? 'Verify failed.' }, { status: 500 });
	}
}


