/**
 * Very small, dependency-free parser for stream phrases like:
 * "Pay 10 SOL over 3 months starting Friday to <pubkey>"
 */

const BASE58_RE = /[1-9A-HJ-NP-Za-km-z]{32,44}/;

function nextWeekdayFromNow(name) {
	const map = {
		sunday: 0,
		monday: 1,
		tuesday: 2,
		wednesday: 3,
		thursday: 4,
		friday: 5,
		saturday: 6
	};
	const target = map[String(name || '').toLowerCase()];
	if (typeof target !== 'number') return null;

	const now = new Date();
	const day = now.getDay();
	let delta = (target - day + 7) % 7;
	if (delta === 0) delta = 7; // next week's day
	const d = new Date(now.getTime() + delta * 24 * 60 * 60 * 1000);
	d.setHours(now.getHours(), now.getMinutes(), 0, 0);
	return d;
}

function parseStartDate(text) {
	const m = text.match(/starting\s+([a-z]+)/i);
	if (!m) return null;
	const token = m[1];
	// weekday
	const wd = nextWeekdayFromNow(token);
	if (wd) return wd;
	// last resort: Date.parse on remainder
	const idx = text.toLowerCase().indexOf('starting');
	const tail = idx >= 0 ? text.slice(idx + 'starting'.length).trim() : '';
	const ms = Date.parse(tail);
	if (Number.isFinite(ms)) return new Date(ms);
	return null;
}

function parseDurationSeconds(text) {
	// Supports: "over 5 minutes", "for 30 min", "over 2 hours", etc.
	const m = text.match(
		/\b(?:over|for)\s+(\d+(?:\.\d+)?)\s*(min|mins|minute|minutes|hr|hrs|hour|hours|day|days|week|weeks|month|months|year|years)\b/i
	);
	if (!m) return null;
	const n = Number(m[1]);
	if (!Number.isFinite(n) || n <= 0) return null;
	const unit = m[2].toLowerCase();
	const sec = 1;
	const min = 60 * sec;
	const hour = 60 * min;
	const day = 24 * hour;
	const week = 7 * day;
	const month = 30 * day;
	const year = 365 * day;

	if (unit === 'min' || unit === 'mins' || unit.startsWith('minute')) return Math.round(n * min);
	if (unit === 'hr' || unit === 'hrs' || unit.startsWith('hour')) return Math.round(n * hour);
	if (unit.startsWith('day')) return Math.round(n * day);
	if (unit.startsWith('week')) return Math.round(n * week);
	if (unit.startsWith('month')) return Math.round(n * month);
	if (unit.startsWith('year')) return Math.round(n * year);
	return null;
}

function parseAmountSol(text) {
	const m = text.match(/(\d+(?:\.\d+)?)\s*sol\b/i);
	if (!m) return null;
	const n = Number(m[1]);
	if (!Number.isFinite(n) || n <= 0) return null;
	return n;
}

function parseReceiver(text) {
	// accept: "to <PUBKEY>"
	const angled = text.match(/\bto\s*<\s*([1-9A-HJ-NP-Za-km-z]{32,44})\s*>\b/i);
	if (angled) return angled[1];
	const m = text.match(/\bto\s+([1-9A-HJ-NP-Za-km-z]{32,44})\b/i);
	if (m) return m[1];
	const any = text.match(BASE58_RE);
	return any ? any[0] : null;
}

export function parseStreamText(text) {
	const raw = String(text || '').trim();
	if (!raw) return { ok: false, error: 'Empty input.' };

	const amountSol = parseAmountSol(raw);
	const durationSeconds = parseDurationSeconds(raw);
	const receiverWallet = parseReceiver(raw);
	const explicitStartAt = parseStartDate(raw);
	// If the user didn't specify an explicit start time ("starting ..."), default to a near-future
	// start to avoid minute-granularity edge cases in datetime-local inputs and on-chain validation.
	// NOTE: This value is computed at parse-time; callers may wish to re-clamp implicit starts at apply-time.
	const startAt = explicitStartAt || new Date(Date.now() + 2 * 60 * 1000);
	const startIsExplicit = !!explicitStartAt;

	if (!amountSol) return { ok: false, error: 'Could not find an amount like “10 SOL”.' };
	if (!durationSeconds) return { ok: false, error: 'Could not find a duration like “for/over 5 minutes”.' };

	const totalLamports = Math.floor(amountSol * 1_000_000_000);
	const rateLamportsPerSec = Math.max(1, Math.floor(totalLamports / durationSeconds));
	const endAt = new Date(startAt.getTime() + durationSeconds * 1000);

	return {
		ok: true,
		amountSol,
		durationSeconds,
		totalLamports,
		rateLamportsPerSec,
		receiverWallet: receiverWallet || null,
		startAt,
		endAt,
		startIsExplicit
	};
}

// Dev-only sanity checks to prevent regressions.
// This runs in Vite dev builds (browser + SSR) but never fails prod builds.
try {
	// eslint-disable-next-line no-undef
	if (typeof import.meta !== 'undefined' && import.meta?.env?.DEV) {
		const cases = [
			'pay 0.01 sol over 5 minutes',
			'pay 0.01 sol for 30 min',
			'pay 1 sol over 2 hours'
		];
		for (const c of cases) {
			const r = parseStreamText(c);
			if (!r?.ok || !r.durationSeconds || r.durationSeconds <= 0) {
				// eslint-disable-next-line no-console
				console.warn('[parseStreamText] dev self-test failed for:', c, r);
			}
		}
	}
} catch {
	// ignore
}






