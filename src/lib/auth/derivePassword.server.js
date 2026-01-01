import { env } from '$env/dynamic/private';
import { createHmac } from 'node:crypto';

export function derivePasswordFromWallet(wallet) {
	if (!env.AUTH_HMAC_SECRET) throw new Error('Missing AUTH_HMAC_SECRET (server-only).');
	const digest = createHmac('sha256', env.AUTH_HMAC_SECRET).update(String(wallet)).digest('hex');
	// PB password min length is usually 8; use stable derived value.
	return `vs_${digest}`;
}












