export function clamp(n, min, max) {
	return Math.max(min, Math.min(max, n));
}

export function nowMs() {
	return Date.now();
}

export function toMs(v) {
	if (v == null) return null;
	if (typeof v === 'number') return Number.isFinite(v) ? v : null;
	const ms = Date.parse(String(v));
	return Number.isFinite(ms) ? ms : null;
}

/**
 * Computes linear accrual for a stream.
 * Expects:
 * - amountLamports (number)
 * - startAt (date string or ms)
 * - endAt (date string or ms)
 */
export function computeAccrual(stream, atMs = nowMs()) {
	const rate = Number(stream?.rateLamportsPerSec ?? 0);
	const start = toMs(stream?.startAt) ?? 0;
	const end = toMs(stream?.endAt) ?? 0;
	const pausedAt = stream?.pausedAt ? toMs(stream.pausedAt) : null;
	const effectiveNow = pausedAt ? Math.min(atMs, pausedAt) : atMs;

	if (!rate || !start || !end || end <= start) {
		return { progress: 0, accruedLamports: 0, totalLamports: 0, startMs: start || 0, endMs: end || 0 };
	}

	const totalLamports = Math.floor(rate * ((end - start) / 1000));
	const rawAccrued = Math.floor(rate * ((effectiveNow - start) / 1000));
	const accruedLamports = clamp(rawAccrued, 0, totalLamports);
	const progress = totalLamports ? accruedLamports / totalLamports : 0;

	return { progress, accruedLamports, totalLamports, startMs: start, endMs: end };
}

export function lamportsToSol(lamports) {
	return Number(lamports) / 1_000_000_000;
}


