<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { walletStore } from '$lib/wallet/walletStore';
	import { pb } from '$lib/auth/pb';
	import { getStream } from '$lib/pb/streams';
	import { computeAccrual, lamportsToSol } from '$lib/streams/timeline';
	import { solscanAddressUrl } from '$lib/solana/solscan';
	import { cancelOnchain, updateRateOnchain } from '$lib/streamflow/client';
	import { computeWithdrawableLamports, getStreamflowStream } from '$lib/streamflow/read';
	import Sparkline from '$lib/components/Sparkline.svelte';
	import { projectAccrual } from '$lib/streams/projection';
	import { loadContext, contextStore } from '$lib/consensus/contextStore';
	import { modeStore } from '$lib/ui/uiStore';
	import ConfirmActionModal from '$lib/components/ConfirmActionModal.svelte';

	let connected = $state(false);
	let publicKeyBase58 = $state('');
	let now = $state(Date.now());

	let loading = $state(true);
	let error = $state('');
	let stream = $state(null);
	let sfStream = $state(null);
	let sfErr = $state('');
	let busyAction = $state(false);
	let actionMsg = $state('');
	let actionErr = $state('');
	let sweepBusy = $state(false);
	let sweepMsg = $state('');
	let sweepErr = $state('');
	let receiverLinkCopied = $state(false);

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

	const unsubscribe = walletStore.subscribe((s) => {
		connected = s.connected;
		publicKeyBase58 = s.publicKeyBase58;
	});

	let { params } = $props();

	onMount(() => {
		walletStore.ensureReady();
		if (!connected) goto('/auth');
		loadContext();
		load();
		const t = setInterval(() => {
			now = Date.now();
		}, 1000);
		return () => {
			clearInterval(t);
			unsubscribe();
		};
	});

	$effect(() => {
		if (!connected) goto('/auth');
	});

	async function load() {
		loading = true;
		error = '';
		try {
			const s = await getStream(params.id);
			// temporary gating until PB auth/rules are restored
			const authId = pb.authStore.record?.id;
			if (s?.payerUser && authId && s.payerUser !== authId) {
				throw new Error('Not authorized to view this stream.');
			}
			stream = s;

			sfStream = null;
			sfErr = '';
			if (s?.streamflowId) {
				try {
					sfStream = await getStreamflowStream(s.streamflowId);
				} catch (e) {
					sfErr = e?.message ?? 'Failed to load on-chain stream.';
					sfStream = null;
				}
			}
		} catch (e) {
			error = e?.message ?? 'Failed to load stream.';
			stream = null;
			sfStream = null;
			sfErr = '';
		} finally {
			loading = false;
		}
	}

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
		return 'border-amber-500/30 bg-amber-500/10 text-amber-100';
	}

	function statusLabel(status) {
		const s = normalizeStatus(status);
		if (s === 'completed') return 'Completed';
		if (s === 'cancelled') return 'Cancelled';
		if (s === 'paused') return 'Paused';
		return 'Live';
	}

	const nowSec = $derived.by(() => Math.floor(Number(now || 0) / 1000));

	// Prefer on-chain balances when available; fall back to local accrual projection.
	const accrual = $derived(stream ? computeAccrual(stream) : null);
	const accruedSol = $derived(accrual ? lamportsToSol(accrual.accruedLamports) : 0);
	const totalSol = $derived(accrual ? lamportsToSol(accrual.totalLamports) : 0);
	const withdrawnLamports = $derived(Number(stream?.totalWithdrawnLamports || 0));
	const availableLamports = $derived.by(() => {
		if (sfStream) return computeWithdrawableLamports(sfStream, nowSec);
		return Math.max(0, Number(accrual?.accruedLamports || 0) - Number(withdrawnLamports || 0));
	});
	const availableSol = $derived(lamportsToSol(availableLamports));

	const isEnded = $derived.by(() => {
		const endSec = Number(sfStream?.end || 0);
		if (Number.isFinite(endSec) && endSec > 0) return nowSec >= endSec;
		const endMs = stream?.endAt ? Date.parse(stream.endAt) : NaN;
		return Number.isFinite(endMs) ? now >= endMs : false;
	});

	const displayStatus = $derived.by(() => {
		const base = normalizeStatus(stream?.status);
		const avail = Number(availableLamports || 0);
		if ((isEnded || base === 'cancelled') && avail <= 0) return 'completed';
		return base;
	});
	const spark = $derived(stream ? projectAccrual(stream).map(lamportsToSol) : []);
	const isPayer = $derived(!!stream?.payerWallet && connected && publicKeyBase58 === stream.payerWallet);
	const isPaused = $derived(String(stream?.status || '').toLowerCase() === 'paused');
	const canSweep = $derived(isPayer);
	const canCancel = $derived(isPayer);
	const receiverLink = $derived(stream ? new URL(`/r/${stream.id}`, $page.url.origin).toString() : '');

	async function copyReceiverLink() {
		try {
			if (!receiverLink) return;
			await navigator.clipboard.writeText(receiverLink);
			receiverLinkCopied = true;
			setTimeout(() => {
				receiverLinkCopied = false;
			}, 1200);
		} catch {
			// ignore
		}
	}

	async function doStreamAction(action, payload) {
		busyAction = true;
		actionMsg = '';
		actionErr = '';
		try {
			if (!stream) throw new Error('Missing stream.');
			if (!stream?.streamflowId) throw new Error('Missing Streamflow stream id (streamflowId).');

			let sig = '';
			if (action === 'pause') {
				const r = await updateRateOnchain({
					invokerPublicKeyBase58: publicKeyBase58,
					streamflowId: stream.streamflowId,
					amountPerPeriodLamports: 0
				});
				sig = r.signature;
			} else if (action === 'resume') {
				const rate = Number(stream?.rateLamportsPerSec || 0);
				if (!Number.isFinite(rate) || rate <= 0) throw new Error('Missing/invalid rateLamportsPerSec for resume.');
				const r = await updateRateOnchain({
					invokerPublicKeyBase58: publicKeyBase58,
					streamflowId: stream.streamflowId,
					amountPerPeriodLamports: Math.floor(rate)
				});
				sig = r.signature;
			} else if (action === 'cancel') {
				const r = await cancelOnchain({ invokerPublicKeyBase58: publicKeyBase58, streamflowId: stream.streamflowId });
				sig = r.signature;
			}

			const res = await fetch('/api/streams/action', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ streamId: stream.id, action, requester: publicKeyBase58, payload, signature: sig })
			});
			const j = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(j?.message ?? 'Action failed.');
			actionMsg = 'Action completed.';
			await load();
		} catch (e) {
			actionErr = e?.message ?? 'Action failed.';
		} finally {
			busyAction = false;
		}
	}

	async function sweep() {
		sweepBusy = true;
		sweepMsg = '';
		sweepErr = '';
		try {
			if (!stream) throw new Error('Missing stream.');
			if (!stream?.streamflowId) throw new Error('Missing Streamflow stream id (streamflowId).');
			const r = await cancelOnchain({ invokerPublicKeyBase58: publicKeyBase58, streamflowId: stream.streamflowId });
			const res = await fetch('/api/streams/reclaim', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ streamId: params.id, requester: publicKeyBase58, signature: r.signature })
			});
			const j = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(j?.message ?? 'Sweep failed.');
			sweepMsg = 'Swept (cancelled) successfully.';
			await load();
		} catch (e) {
			sweepErr = e?.message ?? 'Sweep failed.';
		} finally {
			sweepBusy = false;
		}
	}
</script>

<svelte:head>
	<title>Stream — Voidstream</title>
</svelte:head>

<div class="vs-page">
	<header class="vs-header">
		<div class="vs-container vs-header-inner">
			<div class="flex items-center gap-4">
				<a href="/dashboard" class="text-sm text-white/70 hover:text-white">← Back</a>
				<div class="text-sm font-semibold">Stream</div>
			</div>
			<button
				type="button"
				class="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85 hover:bg-white/10"
				onclick={() => walletStore.disconnect()}
			>
				Disconnect
			</button>
		</div>
	</header>

	<main class="vs-main">
		{#if loading}
			<div class="vs-card vs-card-pad">
				<div class="text-sm font-semibold">Loading…</div>
				<p class="mt-2 text-sm text-white/70">Fetching stream details.</p>
			</div>
		{:else if error}
			<div class="rounded-2xl border border-red-500/20 bg-red-500/10 p-6">
				<div class="text-sm font-semibold">Couldn’t load stream</div>
				<p class="mt-2 text-sm text-red-200/90">{error}</p>
			</div>
		{:else if stream}
			<div class="vs-section grid gap-6 lg:grid-cols-3">
				<section class="lg:col-span-2">
					<div class="vs-card vs-card-pad">
						<div class="flex items-start justify-between gap-4">
							<div>
								<div class="text-xs text-white/60">Receiver</div>
								<div class="mt-1 font-mono text-sm text-white/85">{stream.receiverWallet}</div>
								<div class="mt-1 text-xs">
									<a
										class="text-sky-300 hover:text-sky-200"
										href={solscanAddressUrl(stream.receiverWallet)}
										target="_blank"
										rel="noreferrer"
									>
										Solscan receiver →
									</a>
								</div>
							</div>
							<div class="text-right">
								<div class="text-xs text-white/60">Status</div>
								<div class="mt-1">
									<span
										class={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusBadgeClass(displayStatus)}`}
									>
										{statusLabel(displayStatus)}
									</span>
								</div>
							</div>
						</div>

						<div class="mt-6">
							<div class="flex items-center justify-between text-xs text-white/60">
								<span>Accrued</span>
								<span class="font-mono text-white/80">{accruedSol.toFixed(4)} / {totalSol.toFixed(4)} SOL</span>
							</div>
							<div class="mt-3 opacity-80">
								<Sparkline values={spark} width={220} height={34} />
							</div>
							<div class="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
								<div
									class="h-2 rounded-full bg-emerald-400/80"
									style={`width:${Math.round((accrual?.progress ?? 0) * 100)}%`}
								></div>
							</div>
						</div>

						<p class="mt-6 text-sm text-white/70">
							Operator mode executes actions immediately. Consensus approvals are coming soon.
						</p>

						<div class="mt-6 flex flex-wrap gap-3">
							{#if isPayer}
								{#if isPaused}
									<button
										type="button"
										class="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/85 hover:bg-white/10 disabled:opacity-60"
										onclick={() =>
											openConfirm({
												title: 'Resume stream?',
												description: 'Accrual will continue from the current timeline.',
												run: () => doStreamAction('resume')
											})}
										disabled={busyAction}
									>
										Resume
									</button>
								{:else}
									<button
										type="button"
										class="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/85 hover:bg-white/10 disabled:opacity-60"
										onclick={() =>
											openConfirm({
												title: 'Pause stream?',
												description: 'Accrual will stop until you resume the stream.',
												run: () => doStreamAction('pause')
											})}
										disabled={busyAction}
									>
										Pause
									</button>
								{/if}
							{/if}
							<button
								type="button"
								class="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-200 hover:bg-red-500/15 disabled:opacity-60"
								onclick={() =>
									openConfirm({
										title: 'Cancel stream?',
										description: 'This will stop the stream permanently.',
										danger: true,
										run: () => doStreamAction('cancel')
									})}
								disabled={busyAction || !canCancel}
							>
								Cancel
							</button>
							<a
								class={`rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/85 hover:bg-white/10 ${!isPayer ? 'pointer-events-none opacity-60' : ''}`}
								href={`/api/invoices/${stream.id}`}
								target="_blank"
								rel="noreferrer"
							>
								Generate invoice
							</a>
							<button
								type="button"
								class="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-100 hover:bg-amber-500/15 disabled:opacity-60"
								onclick={() =>
									openConfirm({
										title: 'Sweep this stream?',
										description: 'This cancels the stream and stops monitoring.',
										danger: true,
										run: () => sweep()
									})}
								disabled={sweepBusy || !canSweep}
							>
								{sweepBusy ? 'Sweeping…' : 'Sweep'}
							</button>
						</div>

						{#if sweepMsg}
							<div class="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
								{sweepMsg}
							</div>
						{/if}
						{#if sweepErr}
							<div class="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
								{sweepErr}
							</div>
						{/if}
						{#if actionMsg}
							<div class="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
								{actionMsg}
							</div>
						{/if}
						{#if actionErr}
							<div class="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
								{actionErr}
							</div>
						{/if}
					</div>

					<div class="mt-6 vs-card vs-card-pad">
						<div class="text-sm font-semibold">Audit</div>
						<p class="mt-2 text-sm text-white/70">
							View all activity in the <a class="text-sky-300 hover:text-sky-200" href="/audit">Audit</a> page.
						</p>
					</div>
				</section>

				<aside class="space-y-4">
					<div class="vs-card vs-card-pad">
						<div class="text-sm font-semibold">Payer</div>
						<div class="mt-2 font-mono text-xs text-white/70">{stream.payerWallet}</div>
						<div class="mt-2 text-xs">
							<a
								class="text-sky-300 hover:text-sky-200"
								href={solscanAddressUrl(stream.payerWallet)}
								target="_blank"
								rel="noreferrer"
							>
								Solscan payer →
							</a>
						</div>
					</div>
					{#if isPayer}
						<div class="vs-card vs-card-pad">
							<div class="flex items-start justify-between gap-4">
								<div>
									<div class="text-sm font-semibold">Receiver link</div>
									<p class="mt-1 text-xs text-white/60">
										Share this link with the receiver to view the stream and claim funds.
									</p>
								</div>
								<button
									type="button"
									class="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85 hover:bg-white/10"
									onclick={copyReceiverLink}
								>
									{receiverLinkCopied ? 'Copied' : 'Copy'}
								</button>
							</div>
							<div class="mt-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-white/70">
								<a
									class="font-mono text-white/85 hover:text-white underline underline-offset-2"
									href={receiverLink}
									target="_blank"
									rel="noreferrer"
								>
									{receiverLink}
								</a>
							</div>
						</div>
					{/if}
					<div class="vs-card vs-card-pad">
						<div class="text-sm font-semibold">Context</div>
						<div class="mt-2 text-xs text-white/70">
							Mode: <span class="font-mono text-white/85">{$modeStore}</span>
						</div>
						<div class="mt-2 text-xs text-white/70">
							ID: <span class="font-mono text-white/85">{$contextStore.context?.id || '—'}</span>
						</div>
					</div>
				</aside>
			</div>
		{/if}
	</main>
</div>

	<!-- Receiver Withdraw UI lives on the receiver page (`/r/[id]`). -->

<ConfirmActionModal
	open={confirmOpen}
	title={confirmTitle}
	description={confirmDesc}
	confirmLabel={confirmDanger ? 'Confirm' : 'Confirm'}
	cancelLabel="Cancel"
	danger={confirmDanger}
	busy={confirmBusy || busyAction || sweepBusy}
	onClose={closeConfirm}
	onConfirm={confirmExec}
/>
