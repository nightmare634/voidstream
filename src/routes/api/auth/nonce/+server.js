import { json } from '@sveltejs/kit';
import { issueNonce } from '$lib/auth/nonceStore.server';

export async function GET({ url }) {
	const wallet = url.searchParams.get('wallet') || '';
	if (!wallet) return json({ message: 'Missing wallet.' }, { status: 400 });

	const nonce = issueNonce(wallet);
	const message = `Voidstream authentication\nWallet: ${wallet}\nNonce: ${nonce}`;

	return json({ wallet, nonce, message });
}












