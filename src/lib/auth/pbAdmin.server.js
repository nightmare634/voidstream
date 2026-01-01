import PocketBase from 'pocketbase';
import { env } from '$env/dynamic/private';

let _adminPb = null;

/**
 * Returns a singleton PocketBase admin client.
 * Requires PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD.
 */
export async function getAdminPb() {
	// Be tolerant across runtimes: fall back to process.env if SvelteKit env helpers don't see `.env`.
	const url = env.PUBLIC_PB_URL || env.PB_URL || process.env.PUBLIC_PB_URL || process.env.PB_URL;
	if (!url) throw new Error('Missing PUBLIC_PB_URL (or PB_URL).');
	if (!env.PB_ADMIN_EMAIL) throw new Error('Missing PB_ADMIN_EMAIL.');
	if (!env.PB_ADMIN_PASSWORD) throw new Error('Missing PB_ADMIN_PASSWORD.');

	if (_adminPb) return _adminPb;

	const pb = new PocketBase(url);
	pb.autoCancellation(false);

	await pb.admins.authWithPassword(env.PB_ADMIN_EMAIL, env.PB_ADMIN_PASSWORD);
	_adminPb = pb;
	return _adminPb;
}






