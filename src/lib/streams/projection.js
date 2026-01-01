import { computeAccrual } from '$lib/streams/timeline';

function monthBoundaryFrom(ms, addMonths) {
	const d = new Date(ms);
	d.setDate(1);
	d.setHours(0, 0, 0, 0);
	d.setMonth(d.getMonth() + addMonths);
	return d.getTime();
}

/**
 * Produce a small 12-month projection series (accrued lamports at each month boundary).
 * Returns lamports array (length = months).
 */
export function projectAccrual(stream, { months = 12, fromMs = Date.now() } = {}) {
	const out = [];
	for (let i = 1; i <= months; i++) {
		const t = monthBoundaryFrom(fromMs, i);
		const a = computeAccrual(stream, t);
		out.push(Number(a.accruedLamports || 0));
	}
	return out;
}












