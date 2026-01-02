<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { walletStore } from '$lib/wallet/walletStore';
	import { listStreams } from '$lib/pb/streams';
	import { pb } from '$lib/auth/pb';
	import SmartBar from '$lib/components/SmartBar.svelte';
	import Sparkline from '$lib/components/Sparkline.svelte';
	import { projectAccrual } from '$lib/streams/projection';
	import { computeAccrual, lamportsToSol } from '$lib/streams/timeline';
	import { buildCreateSolStreamParams, createStreamOnchain } from '$lib/streamflow/client';
	import { cancelOnchain } from '$lib/streamflow/client';
	import { getRpcConnection } from '$lib/streamflow/client';
	import { computeWithdrawableLamports, getStreamflowStream } from '$lib/streamflow/read';
	import { loadContext, contextStore } from '$lib/consensus/contextStore';
	import { rebuildIndex } from '$lib/search/searchStore';
	import ConfirmActionModal from '$lib/components/ConfirmActionModal.svelte';
	import { reveal } from '$lib/ui/reveal';

	let connected = $state(false);
	let publicKeyBase58 = $state('');
	let walletName = $state('');
	let balanceSol = $state(0);
	let streaming = $state(false);
	let streamError = $state('');
	let streamsLoading = $state(true);
	let streamsError = $state('');
	let streams = $state([]);
	let displayStatusById = $state({});
	let createOpen = $state(false);
	let createErr = $state('');
	let creating = $state(false);

	let deleteMsg = $state('');
	let deleteErr = $state('');

	let confirmOpen = $state(false);
	let confirmTitle = $state('');
	let confirmDesc = $state('');
	let confirmDanger = $state(false);
	let confirmBusy = $state(false);
	let confirmRun = $state(null);

	function openConfirm({ title, description, danger = false, run }) {
		confirmTitle = title || 'Confirm';
		confirmDesc = description || '';
		confirmDanger = !!danger;
		confirmRun = run;
		confirmOpen = true;
	}

	function closeConfirm() {
		if (confirmBusy) return;
		confirmOpen = false;
		confirmTitle = '';
		confirmDesc = '';
		confirmDanger = false;
		confirmRun = null;
	}

	async function confirmExec() {
		if (!confirmRun) return;
		confirmBusy = true;
		try {
			await confirmRun();
			closeConfirm();
		} finally {
			confirmBusy = false;
		}
	}

	let receiverWallet = $state('');
	let rateLamportsPerSec = $state('0');
	let startAt = $state('');
	let endAt = $state('');
	let smartErr = $state('');

	function normalizeStatus(v) {
		const s = String(v || '').toLowerCase().trim();
		if (s === 'done' || s === 'completed' || s === 'comp') return 'completed';
		if (s === 'paused') return 'paused';
		if (s === 'cancelled') return 'cancelled';
		return 'live';
	}

	function statusBadgeClass(status) {
		const s = normalizeStatus(status);
		if (s === 'completed') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100';
		if (s === 'cancelled') return 'border-red-500/30 bg-red-500/10 text-red-200';
		if (s === 'paused') return 'border-amber-500/30 bg-amber-500/10 text-amber-100';
		// live
		return 'border-amber-500/30 bg-amber-500/10 text-amber-100';
	}

	function statusLabel(status) {
		const s = normalizeStatus(status);
		if (s === 'completed') return 'Completed';
		if (s === 'cancelled') return 'Cancelled';
		if (s === 'paused') return 'Paused';
		return 'Live';
	}

	async function computeDisplayStatusMap(nextStreams) {
		try {
			const nowSec = await getRpcNowSec();
			const entries = await Promise.all(
				(nextStreams || []).map(async (s) => {
					const base = normalizeStatus(s?.status);
					const endMs = s?.endAt ? Date.parse(s.endAt) : NaN;
					const endedByDb = Number.isFinite(endMs) ? Date.now() >= endMs : false;
					const shouldCheck = base === 'cancelled' || endedByDb;

					if (!shouldCheck || !s?.streamflowId) return [s.id, base];
					try {
						const sf = await getStreamflowStream(s.streamflowId);
						const avail = computeWithdrawableLamports(sf, nowSec);
						const endSec = Number(sf?.end || 0);
						const endedByChain = Number.isFinite(endSec) && endSec > 0 ? nowSec >= endSec : endedByDb;
						if ((endedByChain || base === 'cancelled') && Number(avail || 0) <= 0) return [s.id, 'completed'];
						return [s.id, base];
					} catch {
						// If chain lookup fails, fall back to DB status.
						return [s.id, base];
					}
				})
			);
			displayStatusById = Object.fromEntries(entries);
		} catch {
			displayStatusById = {};
		}
	}

	function toLocalInputValue(d) {
		try {
			// datetime-local expects a *local* time string (no timezone). Never use toISOString() here.
			const dt = d instanceof Date ? d : new Date(d);
			const pad = (n) => String(n).padStart(2, '0');
			const y = dt.getFullYear();
			const m = pad(dt.getMonth() + 1);
			const day = pad(dt.getDate());
			const hh = pad(dt.getHours());
			const mm = pad(dt.getMinutes());
			return `${y}-${m}-${day}T${hh}:${mm}`;
		} catch {
			return '';
		}
	}

	function parseLocalInputValue(v) {
		// Parse datetime-local string (YYYY-MM-DDTHH:mm) as a local Date.
		const s = String(v || '').trim();
		const m = s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
		if (!m) return null;
		const y = Number(m[1]);
		const mo = Number(m[2]);
		const d = Number(m[3]);
		const hh = Number(m[4]);
		const mm = Number(m[5]);
		if (![y, mo, d, hh, mm].every((n) => Number.isFinite(n))) return null;
		return new Date(y, mo - 1, d, hh, mm, 0, 0);
	}

	async function getRpcNowSec() {
		try {
			const c = getRpcConnection();
			const slot = await c.getSlot('confirmed');
			const bt = await c.getBlockTime(slot);
			if (typeof bt === 'number' && Number.isFinite(bt) && bt > 0) return bt;
		} catch {
			// ignore
		}
		return Math.floor(Date.now() / 1000);
	}

	function makeInviteCode() {
		return Math.random().toString(36).slice(2, 10).toUpperCase();
	}

	const totalLamports = $derived.by(() => {
		const r = Number(rateLamportsPerSec) || 0;
		const s = parseLocalInputValue(startAt)?.getTime() ?? NaN;
		const e = parseLocalInputValue(endAt)?.getTime() ?? NaN;
		if (!r || !s || !e || e <= s) return 0;
		return Math.floor(r * ((e - s) / 1000));
	});

	const totalSol = $derived.by(() => totalLamports / 1_000_000_000);

	const unsubscribe = walletStore.subscribe((s) => {
		connected = s.connected;
		publicKeyBase58 = s.publicKeyBase58;
		walletName = s.walletName;
		balanceSol = Number(s.balanceSol || 0);
		streaming = !!s.streaming;
		streamError = s.streamError || '';
	});

	function sparkValues(stream) {
		// Convert lamports -> SOL for human-scale chart values.
		return projectAccrual(stream).map(lamportsToSol);
	}

	function accruedSummary(stream) {
		const a = computeAccrual(stream);
		return {
			accruedSol: lamportsToSol(a.accruedLamports),
			totalSol: lamportsToSol(a.totalLamports),
			progress: a.progress || 0
		};
	}

	onMount(() => {
		walletStore.ensureReady();
		if (!connected) goto('/auth');
		// Default dates for create modal
		const now = Date.now();
		// datetime-local expects local time (no timezone). Also keep start safely in the future to avoid
		// minute-granularity edge cases (e.g. startAt = 10:30 but now = 10:30:45).
		const safeStart = new Date(now + 2 * 60 * 1000);
		startAt = toLocalInputValue(safeStart);
		const plus30 = new Date(now + 30 * 24 * 60 * 60 * 1000);
		endAt = toLocalInputValue(plus30);
		loadContext();
		loadDashboard();
		return () => unsubscribe();
	});

	$effect(() => {
		if (!connected) goto('/auth');
	});

	async function loadStreams() {
		streamsLoading = true;
		streamsError = '';
		try {
			// PB rules scope to payerUser = @request.auth.id, so no client filter needed.
			streams = await listStreams();
			await computeDisplayStatusMap(streams);
		} catch (e) {
			streamsError = e?.message ?? 'Failed to load streams.';
			streams = [];
			displayStatusById = {};
		} finally {
			streamsLoading = false;
		}
	}

	async function loadDashboard() {
		await loadStreams();
		// Keep Cmd+K results warm.
		rebuildIndex({ payer: publicKeyBase58 }).catch(() => {});
	}

	async function createStream() {
		createErr = '';
		creating = true;
		try {
			const payerUser = pb.authStore.record?.id;
			if (!payerUser) throw new Error('Not authenticated. Reconnect in /auth.');

			const rw = receiverWallet.trim();

			const rate = Number(rateLamportsPerSec);
			if (!Number.isFinite(rate) || rate <= 0) throw new Error('Rate (lamports/sec) must be > 0.');
			if (!startAt || !endAt) throw new Error('Start and end are required.');

			let startDate = parseLocalInputValue(startAt);
			let endDate = parseLocalInputValue(endAt);
			if (!startDate || !endDate) throw new Error('Invalid Start/End time.');

			// Streamflow validates timestamps using on-chain time, not the user's system clock.
			// Clamp start to "network now + 5 minutes" and keep duration constant to avoid InvalidTimestamps (112).
			const durationSec = Math.floor((endDate.getTime() - startDate.getTime()) / 1000);
			if (!Number.isFinite(durationSec) || durationSec <= 0) throw new Error('End must be after Start.');
			const rpcNowSec = await getRpcNowSec();
			const minLeadSec = 5 * 60;
			const startSecWanted = Math.floor(startDate.getTime() / 1000);
			const startSec = Math.max(startSecWanted, rpcNowSec + minLeadSec);
			const endSec = startSec + durationSec;
			startDate = new Date(startSec * 1000);
			endDate = new Date(endSec * 1000);

			// Keep the UI in sync with the actual values we will submit.
			startAt = toLocalInputValue(startDate);
			endAt = toLocalInputValue(endDate);

			const startIso = startDate.toISOString();
			const endIso = endDate.toISOString();

			// Create the Streamflow stream on-chain first (real SOL via wrapped SOL under the hood).
			// If receiver is omitted, we create to a deterministic “claim vault” recipient so any wallet
			// with the receiver link can claim later (server-signed on-chain transfer).
			const inviteCode = makeInviteCode();
			let onchainRecipient = rw;
			let transferableByRecipient = false;
			if (!onchainRecipient) {
				const rv = await fetch('/api/streams/claim-vault', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ inviteCode })
				});
				const rj = await rv.json().catch(() => ({}));
				if (!rv.ok) throw new Error(rj?.message ?? 'Failed to derive claim vault.');
				onchainRecipient = String(rj?.claimVault || '').trim();
				if (!onchainRecipient) throw new Error('Claim vault missing from server response.');
				transferableByRecipient = true;
			}

			const createParams = buildCreateSolStreamParams({
				recipient: onchainRecipient,
				startAtIso: startIso,
				endAtIso: endIso,
				rateLamportsPerSec: rate,
				name: 'Voidstream',
				transferableByRecipient
			});
			const onchain = await createStreamOnchain({ senderPublicKeyBase58: publicKeyBase58, createParams });

			const payload = {
				name: 'stream',
				payerWallet: publicKeyBase58,
				inviteCode,
				status: 'live',
				rateLamportsPerSec: rate,
				startAt: startIso,
				endAt: endIso,
				payerUser,

				// PB schema bookkeeping fields (some deployments require these)
				lastAccrualAt: startIso,
				pausedAt: null,
				accruedLamports: 0,
				totalWithdrawnLamports: 0,

				// Mainnet/Streamflow
				chain: 'mainnet-beta',
				protocol: 'streamflow',
				streamflowId: onchain.streamflowId,
				createSignature: onchain.signature
			};
			if (rw) payload.receiverWallet = rw;

			await pb.collection('streams').create(payload);
			createOpen = false;
			receiverWallet = '';
			await loadDashboard();
		} catch (e) {
			createErr = e?.message ?? 'Create failed.';
		} finally {
			creating = false;
		}
	}

	async function deleteStream(s) {
		deleteMsg = '';
		deleteErr = '';
		try {
			if (!s?.id) throw new Error('Missing stream id.');
			if (!publicKeyBase58) throw new Error('Connect wallet first.');

			// PB-only delete: remove from dashboard without cancelling on-chain
			const res = await fetch('/api/streams/delete', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ streamId: s.id, requester: publicKeyBase58, mode: 'pb_only' })
			});
			const j = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(j?.message ?? 'Delete failed.');

			deleteMsg = 'Stream deleted.';
			await loadDashboard();
		} catch (e) {
			deleteErr = e?.message ?? 'Delete failed.';
		}
	}

	function applySmart(parsed) {
		smartErr = '';
		try {
			receiverWallet = parsed.receiverWallet || receiverWallet;
			rateLamportsPerSec = String(parsed.rateLamportsPerSec || rateLamportsPerSec);
			// Smart Bar parsing happens as you type; if the modal sits open, an implicit "start now"
			// can drift into the past. Clamp implicit starts at apply-time to keep start safely future.
			const now = Date.now();
			const safeStart = new Date(now + 2 * 60 * 1000);
			const explicit = !!parsed?.startIsExplicit;
			const start = explicit && parsed?.startAt ? parsed.startAt : safeStart;
			startAt = toLocalInputValue(start);

			const dur = Number(parsed?.durationSeconds || 0);
			const end = dur > 0 ? new Date(start.getTime() + dur * 1000) : parsed?.endAt || endAt;
			endAt = toLocalInputValue(end);
		} catch (e) {
			smartErr = e?.message ?? 'Failed to apply Smart Bar.';
		}
	}

	function openCreateModal() {
		createOpen = true;
		// If the modal is opened later, the saved defaults may be stale. Refresh if start is not safely future.
		try {
			const now = Date.now();
			const startMs = parseLocalInputValue(startAt)?.getTime() ?? NaN;
			if (!Number.isFinite(startMs) || startMs < now + 60 * 1000) {
				startAt = toLocalInputValue(new Date(now + 2 * 60 * 1000));
			}
			const endMs = parseLocalInputValue(endAt)?.getTime() ?? NaN;
			const startMs2 = parseLocalInputValue(startAt)?.getTime() ?? NaN;
			if (!Number.isFinite(endMs) || endMs <= startMs2) {
				endAt = toLocalInputValue(new Date(startMs2 + 30 * 24 * 60 * 60 * 1000));
			}
		} catch {
			// ignore
		}
	}
</script>

<svelte:head>
	<title>Dashboard — Voidstream</title>
</svelte:head>

<div class="vs-page">
	<header class="vs-header">
		<div class="vs-container vs-header-inner">
			<div class="flex items-center gap-4">
				<a href="/" class="inline-flex items-center gap-2">
					<span class="text-sm font-semibold tracking-tight">Voidstream</span>
				</a>
				<nav class="hidden items-center gap-4 text-sm text-white/60 md:flex">
					<a class="hover:text-white" href="/dashboard">Streams</a>
					<a class="hover:text-white" href="/audit">Audit</a>
					<a class="hover:text-white" href="/tools">Tools</a>
					<a class="hover:text-white" href="/settings/context">Mode</a>
					<span class="inline-flex items-center gap-2 text-white/45 cursor-not-allowed select-none">
						Pumpfun
						<span class="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] text-white/50">Coming soon</span>
					</span>
				</nav>
			</div>

			<div class="flex items-center gap-3">
				<a
					href="/dashboard"
					class="hidden rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85 hover:bg-white/10 md:inline-flex"
				>
					New stream
				</a>
				<button
					type="button"
					class="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85 hover:bg-white/10"
					onclick={() => walletStore.disconnect()}
				>
					Disconnect
				</button>
			</div>
		</div>
	</header>

	<main class="vs-main">
		<div class="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
			<div>
				<h1 class="text-2xl font-semibold tracking-tight">Streams</h1>
				<p class="mt-2 text-sm text-white/70">
					Manage your streams, withdrawals, approvals, invoices, and audit history.
				</p>
			</div>

			<div class="vs-card vs-card-pad-sm text-xs text-white/70">
				<div class="text-white/60">Connected wallet</div>
				<div class="mt-1 text-sm font-semibold">{walletName || 'Phantom'}</div>
				<div class="mt-1 font-mono text-xs text-white/80">{publicKeyBase58}</div>
				<div class="mt-2 text-xs text-white/60">
					Balance:{' '}
					<span class="font-mono text-white/85">{balanceSol.toFixed(4)} SOL</span>
					{#if streaming}
						<span class="ml-2 text-emerald-300">live</span>
					{/if}
				</div>
				{#if streamError}
					<div class="mt-1 text-xs text-amber-200">{streamError}</div>
				{/if}
			</div>
		</div>

		<section class="vs-section grid gap-6 lg:grid-cols-3" use:reveal>
			<div class="lg:col-span-2">
				<div class="flex items-center justify-between gap-4">
					<h2 class="text-sm font-semibold text-white/85">Your streams</h2>
					<button
						type="button"
						class="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90"
						onclick={openCreateModal}
					>
						Create stream
					</button>
				</div>

				<div class="mt-6 vs-card vs-card-pad" use:reveal>
					{#if streamsLoading}
						<div class="text-sm font-semibold">Loading streams…</div>
						<p class="mt-2 text-sm leading-relaxed text-white/70">Fetching your streams.</p>
					{:else if streamsError}
						<div class="text-sm font-semibold">Couldn’t load streams</div>
						<p class="mt-2 text-sm leading-relaxed text-white/70">{streamsError}</p>
						<p class="mt-3 text-xs text-white/50">Check your configuration and try again.</p>
					{:else if streams.length === 0}
						<div class="text-sm font-semibold">No streams yet</div>
						<p class="mt-2 text-sm leading-relaxed text-white/70">
							Create your first stream to see it listed here.
						</p>
					{:else}
						<ul class="space-y-3">
							{#each streams as s (s.id)}
								<li class="rounded-xl border border-white/10 bg-black/20 p-5" use:reveal>
									<div class="flex items-start justify-between gap-4">
										<div>
											<div class="text-sm font-semibold">{s.receiverWallet}</div>
											<div class="mt-1 text-xs text-white/60">
												<span
													class={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusBadgeClass(displayStatusById?.[s.id] || s.status)}`}
												>
													{statusLabel(displayStatusById?.[s.id] || s.status)}
												</span>
											</div>
											<div class="mt-1 text-xs text-white/60">
												{(() => {
													const a = accruedSummary(s);
													return `Accrued: ${a.accruedSol.toFixed(4)} / ${a.totalSol.toFixed(4)} SOL`;
												})()}
											</div>
											<div class="mt-1 text-xs text-white/60">
												Total:{' '}
												<span class="font-mono text-white/80">
													{(() => {
														const sMs = Date.parse(s.startAt);
														const eMs = Date.parse(s.endAt);
														const r = Number(s.rateLamportsPerSec) || 0;
														const total = r && sMs && eMs && eMs > sMs ? Math.floor(r * ((eMs - sMs) / 1000)) : 0;
														return (total / 1_000_000_000).toFixed(4);
													})()} SOL
												</span>
											</div>
											<div class="mt-2 opacity-80">
												<Sparkline values={sparkValues(s)} width={140} height={28} />
											</div>
										</div>
										<div class="flex items-center gap-3">
											<button
												type="button"
												class="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/15"
												onclick={() =>
													openConfirm({
														title: 'Delete this stream?',
														description:
															'This will remove the stream from your dashboard. It does not cancel anything on-chain.',
														danger: true,
														run: () => deleteStream(s)
													})}
											>
												Delete
											</button>
											<a class="text-sm text-sky-300 hover:text-sky-200" href={`/streams/${s.id}`}>Open →</a>
										</div>
									</div>
								</li>
							{/each}
						</ul>
					{/if}
				</div>

				{#if deleteMsg}
					<div class="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
						{deleteMsg}
					</div>
				{/if}
				{#if deleteErr}
					<div class="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
						{deleteErr}
					</div>
				{/if}
			</div>

		</section>
	</main>
</div>

<ConfirmActionModal
	open={confirmOpen}
	title={confirmTitle}
	description={confirmDesc}
	confirmLabel="Delete"
	cancelLabel="Cancel"
	danger={confirmDanger}
	busy={confirmBusy}
	onClose={closeConfirm}
	onConfirm={confirmExec}
/>

{#if createOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center px-4">
		<button
			type="button"
			class="absolute inset-0 bg-black/70 backdrop-blur-sm"
			onclick={() => (createOpen = false)}
			aria-label="Close create stream"
		></button>
		<div class="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#0d1117] p-6 shadow-2xl">
			<div class="flex items-start justify-between gap-4">
				<div>
					<div class="text-sm font-semibold">Create stream</div>
					<p class="mt-1 text-sm text-white/70">Create a new stream.</p>
				</div>
				<button
					type="button"
					class="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85 hover:bg-white/10"
					onclick={() => (createOpen = false)}
				>
					Close
				</button>
			</div>

			<div class="mt-5 grid gap-4">
				<SmartBar onApply={applySmart} />
				{#if smartErr}
					<div class="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
						{smartErr}
					</div>
				{/if}

				<label class="block">
					<div class="text-xs font-semibold text-white/60">Receiver wallet</div>
					<input
						class="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white font-mono"
						placeholder="Receiver pubkey"
						bind:value={receiverWallet}
					/>
				</label>

				<label class="block">
					<div class="text-xs font-semibold text-white/60">Rate (lamports/sec)</div>
					<input
						class="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
						type="number"
						min="1"
						step="1"
						bind:value={rateLamportsPerSec}
					/>
					<div class="mt-2 text-xs text-white/60">
						Total:{' '}
						<span class="font-mono text-white/80">{totalSol.toFixed(4)} SOL</span>
					</div>
				</label>

				<div class="grid gap-4 sm:grid-cols-2">
					<label class="block">
						<div class="text-xs font-semibold text-white/60">Start</div>
						<input
							class="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
							type="datetime-local"
							bind:value={startAt}
						/>
					</label>
					<label class="block">
						<div class="text-xs font-semibold text-white/60">End</div>
						<input
							class="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
							type="datetime-local"
							bind:value={endAt}
						/>
					</label>
				</div>

				<div class="block">
					<div class="text-xs font-semibold text-white/60">Status</div>
					<div class="mt-1">
						<span
							class={`inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-semibold ${statusBadgeClass('live')}`}
						>
							{statusLabel('live')}
						</span>
					</div>
				</div>
			</div>

			{#if createErr}
				<div class="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
					{createErr}
				</div>
			{/if}

			<div class="mt-6 flex items-center justify-end gap-3">
				<button
					type="button"
					class="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/85 hover:bg-white/10"
					onclick={() => (createOpen = false)}
				>
					Cancel
				</button>
				<button
					type="button"
					class="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90 disabled:opacity-60"
					onclick={createStream}
					disabled={creating}
				>
					{creating ? 'Creating…' : 'Create'}
				</button>
			</div>
		</div>
	</div>
{/if}


