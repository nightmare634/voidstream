const TTL_MS = 5 * 60 * 1000;

/** @type {Map<string, { nonce: string, expiresAt: number }>} */
const nonces = new Map();

function cleanup() {
	const now = Date.now();
	for (const [k, v] of nonces.entries()) {
		if (v.expiresAt <= now) nonces.delete(k);
	}
}

export function issueNonce(pubkey) {
	cleanup();
	const nonce = crypto.randomUUID();
	nonces.set(pubkey, { nonce, expiresAt: Date.now() + TTL_MS });
	return nonce;
}

export function consumeNonce(pubkey, nonce) {
	cleanup();
	const entry = nonces.get(pubkey);
	if (!entry) return false;
	if (entry.nonce !== nonce) return false;
	if (entry.expiresAt <= Date.now()) {
		nonces.delete(pubkey);
		return false;
	}
	nonces.delete(pubkey);
	return true;
}












