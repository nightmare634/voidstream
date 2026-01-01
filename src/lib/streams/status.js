import { toMs } from '$lib/streams/timeline';

export const StreamStatus = {
	LIVE: 'live',
	PAUSED: 'paused',
	COMPLETED: 'completed',
	CLIFF: 'cliff',
	CANCELLED: 'cancelled'
};

export function getStreamStatus(stream, now = new Date()) {
	const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime();
	const startMs = toMs(stream.startAt) ?? 0;
	const endMs = toMs(stream.endAt) ?? 0;
	const cliffMs = toMs(stream.cliffAt) ?? startMs;

	if (stream.status === 'cancelled') return StreamStatus.CANCELLED;
	if (stream.status === 'paused') return StreamStatus.PAUSED;
	if (endMs && nowMs >= endMs) return StreamStatus.COMPLETED;
	// Treat pre-start as Cliff for MVP (locked blue “not started / cliff”)
	if (nowMs < Math.max(startMs, cliffMs)) return StreamStatus.CLIFF;
	return StreamStatus.LIVE;
}

export function getStatusLabel(status) {
	switch (status) {
		case StreamStatus.LIVE:
			return 'Live';
		case StreamStatus.PAUSED:
			return 'Paused';
		case StreamStatus.COMPLETED:
			return 'Completed';
		case StreamStatus.CLIFF:
			return 'Cliff';
		case StreamStatus.CANCELLED:
			return 'Cancelled';
		default:
			return 'Unknown';
	}
}

export function getStatusPillClasses(status) {
	switch (status) {
		case StreamStatus.LIVE:
			return 'bg-emerald-950/35 border-emerald-900/50 text-emerald-200';
		case StreamStatus.PAUSED:
			return 'bg-amber-950/25 border-amber-900/50 text-amber-200';
		case StreamStatus.COMPLETED:
			return 'bg-white/5 border-white/10 text-white/60';
		case StreamStatus.CLIFF:
			return 'bg-sky-950/30 border-sky-900/50 text-sky-200';
		case StreamStatus.CANCELLED:
			return 'bg-red-950/25 border-red-900/50 text-red-200';
		default:
			return 'bg-white/5 border-white/10 text-white/70';
	}
}

export function getStatusDotClasses(status) {
	switch (status) {
		case StreamStatus.LIVE:
			return 'bg-emerald-300 animate-pulse';
		case StreamStatus.PAUSED:
			return 'bg-amber-300';
		case StreamStatus.COMPLETED:
			return 'bg-white/40';
		case StreamStatus.CLIFF:
			return 'bg-sky-300';
		case StreamStatus.CANCELLED:
			return 'bg-red-300';
		default:
			return 'bg-white/40';
	}
}


