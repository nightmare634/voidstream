import { getStreamflowClient } from './client';

export async function getStreamflowStream(streamflowId) {
	const client = getStreamflowClient();
	return await client.getOne({ id: String(streamflowId) });
}

export function computeWithdrawableLamports(stream, nowSec) {
	if (!stream) return 0;
	const ts = Number(nowSec || 0) || Math.floor(Date.now() / 1000);
	try {
		const unlocked = /** @type {BN} */ (stream.unlocked(ts));
		const withdrawn = /** @type {BN} */ (stream.withdrawnAmount);
		const avail = unlocked.sub(withdrawn);
		return Math.max(0, Number(avail.toString()) || 0);
	} catch {
		return 0;
	}
}


