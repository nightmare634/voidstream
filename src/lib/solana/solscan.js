import { env } from '$env/dynamic/public';

function defaultSolscanBase() {
	const cluster = String(env.PUBLIC_SOLANA_CLUSTER || '').trim().toLowerCase();
	// Solscan mainnet is the default (no query string).
	if (!cluster || cluster === 'mainnet-beta' || cluster === 'mainnet') return 'https://solscan.io';
	if (cluster === 'devnet') return 'https://solscan.io/?cluster=devnet';
	if (cluster === 'testnet') return 'https://solscan.io/?cluster=testnet';
	// Unknown cluster -> safest default: mainnet.
	return 'https://solscan.io';
}

export function solscanTxUrl(signature) {
	if (!signature) return '';
	const base = env.PUBLIC_SOLSCAN_BASE || defaultSolscanBase();
	// If base already contains query string, keep it.
	const joiner = base.includes('?') ? '&' : '?';
	// Most solscan links are /tx/{sig}; preserve base host and cluster query.
	const url = new URL(base, base.startsWith('http') ? undefined : 'https://solscan.io');
	const cluster = url.search; // includes leading ?
	return `https://solscan.io/tx/${signature}${cluster}`;
}

export function solscanAddressUrl(address) {
	if (!address) return '';
	const base = env.PUBLIC_SOLSCAN_BASE || defaultSolscanBase();
	const url = new URL(base, base.startsWith('http') ? undefined : 'https://solscan.io');
	const cluster = url.search;
	return `https://solscan.io/account/${address}${cluster}`;
}











