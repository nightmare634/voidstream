<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { walletStore } from '$lib/wallet/walletStore';
	import { listStreams, getStream } from '$lib/pb/streams';
	import { computeAccrual, lamportsToSol } from '$lib/streams/timeline';
	import QuickClaimSlider from '$lib/components/QuickClaimSlider.svelte';
	import ConfirmActionModal from '$lib/components/ConfirmActionModal.svelte';
	import { cancelOnchain, updateRateOnchain, withdrawOnchain } from '$lib/streamflow/client';

	let connected = $state(false);
	let publicKeyBase58 = $state('');

	let loadingStreams = $state(true);
	let streamsErr = $state('');
	let streams = $state([]);
	let selectedId = $state('');
	let selected = $state(null);
	let loadingSelected = $state(false);

	let withdrawOpen = $state(false);
	let withdrawPct = $state(0.25);
	let busyAction = $state(false);
	let msg = $state('');
	let err = $state('');

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

	const unsub = walletStore.subscribe((s) => {
		connected = s.connected;
		publicKeyBase58 = s.publicKeyBase58;
	});

	async function loadStreams() {
		loadingStreams = true;
		streamsErr = '';
		try {
			streams = await listStreams();
			if (!selectedId && streams.length) {
				selectedId = streams[0].id;
			}
		} catch (e) {
			streamsErr = e?.message ?? 'Failed to load streams.';
			streams = [];
		} finally {
			loadingStreams = false;
		}
	}

	async function loadSelected(id) {
		if (!id) {
			selected = null;
			return;
		}
		loadingSelected = true;
		err = '';
		try {
			selected = await getStream(id);
		} catch (e) {
			selected = null;
			err = e?.message ?? 'Failed to load stream.';
		} finally {
			loadingSelected = false;
		}
	}

	onMount(() => {
		walletStore.ensureReady();
		if (!connected) goto('/auth');
		loadStreams();
		return () => unsub();
	});

	$effect(() => {
		if (!connected) goto('/auth');
	});

	$effect(() => {
		if (!connected) return;
		loadSelected(selectedId);
	});

	const accrual = $derived(selected ? computeAccrual(selected) : null);
	const accruedSol = $derived(accrual ? lamportsToSol(accrual.accruedLamports) : 0);
	const totalSol = $derived(accrual ? lamportsToSol(accrual.totalLamports) : 0);
	const withdrawnLamports = $derived(Number(selected?.totalWithdrawnLamports || 0));
	const availableLamports = $derived(
		Math.max(0, Number(accrual?.accruedLamports || 0) - Number(withdrawnLamports || 0))
	);
	const availableSol = $derived(lamportsToSol(availableLamports));
	const claimLamports = $derived(Math.floor(availableLamports * Number(withdrawPct || 0)));
	const claimSol = $derived(lamportsToSol(claimLamports));

	const receiverWalletTrimmed = $derived(String(selected?.receiverWallet || '').trim());
	const payerWalletTrimmed = $derived(String(selected?.payerWallet || '').trim());
	const isUnclaimed = $derived(!receiverWalletTrimmed);
	const isPayer = $derived(!!payerWalletTrimmed && connected && publicKeyBase58 === payerWalletTrimmed);
	const isReceiver = $derived(!!receiverWalletTrimmed && connected && publicKeyBase58 === receiverWalletTrimmed);
	const isPaused = $derived(String(selected?.status || '').toLowerCase() === 'paused');
	const canPauseResume = $derived(isPayer);
	const canWithdraw = $derived((isReceiver || isUnclaimed) && !isPayer);
	const canCancel = $derived(isPayer || isReceiver);
	const canSweep = $derived(isPayer || isReceiver);
	const showWithdraw = $derived(!!selected && canWithdraw);

	async function doStreamAction(action, payload) {
		busyAction = true;
		msg = '';
		err = '';
		try {
			if (!selected?.id) throw new Error('Select a stream first.');
			if (!selected?.streamflowId) throw new Error('Missing Streamflow stream id (streamflowId).');

			let sig = '';
			if (action === 'pause') {
				const r = await updateRateOnchain({
					invokerPublicKeyBase58: publicKeyBase58,
					streamflowId: selected.streamflowId,
					amountPerPeriodLamports: 0
				});
				sig = r.signature;
			} else if (action === 'resume') {
				const rate = Number(selected?.rateLamportsPerSec || 0);
				if (!Number.isFinite(rate) || rate <= 0) throw new Error('Missing/invalid rateLamportsPerSec for resume.');
				const r = await updateRateOnchain({
					invokerPublicKeyBase58: publicKeyBase58,
					streamflowId: selected.streamflowId,
					amountPerPeriodLamports: Math.floor(rate)
				});
				sig = r.signature;
			} else if (action === 'cancel') {
				const r = await cancelOnchain({ invokerPublicKeyBase58: publicKeyBase58, streamflowId: selected.streamflowId });
				sig = r.signature;
			} else if (action === 'withdraw') {
				const amt = Number(payload?.amountLamports || 0);
				if (!Number.isFinite(amt) || amt <= 0) throw new Error('Invalid amount.');
				const r = await withdrawOnchain({
					invokerPublicKeyBase58: publicKeyBase58,
					streamflowId: selected.streamflowId,
					amountLamports: Math.floor(amt)
				});
				sig = r.signature;
			}

			const res = await fetch('/api/streams/action', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ streamId: selected.id, action, requester: publicKeyBase58, payload, signature: sig })
			});
			const j = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(j?.message ?? 'Action failed.');
			msg = 'Action completed.';
			await loadSelected(selected.id);
			await loadStreams();
		} catch (e) {
			err = e?.message ?? 'Action failed.';
		} finally {
			busyAction = false;
		}
	}

	async function sweep() {
		busyAction = true;
		msg = '';
		err = '';
		try {
			if (!selected?.id) throw new Error('Select a stream first.');
			if (!selected?.streamflowId) throw new Error('Missing Streamflow stream id (streamflowId).');
			const r = await cancelOnchain({ invokerPublicKeyBase58: publicKeyBase58, streamflowId: selected.streamflowId });
			const res = await fetch('/api/streams/reclaim', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ streamId: selected.id, requester: publicKeyBase58, signature: r.signature })
			});
			const j = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(j?.message ?? 'Sweep failed.');
			msg = 'Swept (cancelled) successfully.';
			await loadSelected(selected.id);
			await loadStreams();
		} catch (e) {
			err = e?.message ?? 'Sweep failed.';
		} finally {
			busyAction = false;
		}
	}
</script>

<svelte:head>
	<title>Tools — Voidstream</title>
</svelte:head>

<div class="vs-page">
	<header class="vs-header">
		<div class="vs-container vs-header-inner">
			<div class="flex items-center gap-4">
				<a href="/dashboard" class="text-sm text-white/70 hover:text-white">← Back</a>
				<div class="text-sm font-semibold">Tools</div>
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
		<div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
			<div>
				<h1 class="text-2xl font-semibold tracking-tight">Stream actions</h1>
				<p class="mt-2 text-sm text-white/70">
					Select a stream, then run actions directly from this page.
				</p>
				<p class="mt-2 text-xs text-white/50">
					Current operator wallet:{' '}
					<span class="inline-block max-w-full font-mono text-white/70 break-all whitespace-normal">{publicKeyBase58}</span>
				</p>
			</div>

			<div class="flex items-center gap-3">
				<a
					href="/dashboard"
					class="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90"
				>
					Open dashboard
				</a>
				<a
					href="/settings/context"
					class="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/85 hover:bg-white/10"
				>
					Mode settings
				</a>
			</div>
		</div>

		<div class="vs-section grid gap-8 lg:grid-cols-3">
			<div class="lg:col-span-1">
				<div class="vs-card vs-card-pad">
					<div class="flex items-start justify-between gap-4">
						<div>
							<div class="text-sm font-semibold">Select a stream</div>
							<p class="mt-1 text-sm text-white/70">Choose which stream to operate on.</p>
						</div>
						<button
							type="button"
							class="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85 hover:bg-white/10"
							onclick={loadStreams}
						>
							Refresh
						</button>
					</div>

					{#if loadingStreams}
						<p class="mt-4 text-sm text-white/70">Loading streams…</p>
					{:else if streamsErr}
						<p class="mt-4 text-sm text-red-200">{streamsErr}</p>
					{:else if streams.length === 0}
						<p class="mt-4 text-sm text-white/70">No streams yet.</p>
					{:else}
						<select
							class="mt-4 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
							bind:value={selectedId}
						>
							{#each streams as s (s.id)}
								<option value={s.id}>
									{s.receiverWallet} · {s.status}
								</option>
							{/each}
						</select>

						{#if selected}
							<div class="mt-4 rounded-xl border border-white/10 bg-black/20 p-4">
								<div class="text-xs text-white/60">Selected</div>
								<div class="mt-1 text-sm font-semibold break-all whitespace-normal">{selected.receiverWallet}</div>
								<div class="mt-1 text-xs text-white/60">Status: <span class="text-white/80">{selected.status}</span></div>
								<div class="mt-2 text-xs text-white/60">
									Accrued:{' '}
									<span class="font-mono text-white/85">{accruedSol.toFixed(4)} / {totalSol.toFixed(4)} SOL</span>
								</div>
							</div>
						{/if}
					{/if}
				</div>
			</div>

			<div class="lg:col-span-2 space-y-6">
				<div class="vs-card vs-card-pad">
					<div class="flex flex-wrap items-center justify-between gap-4">
						<div>
							<div class="text-sm font-semibold">Actions</div>
							<p class="mt-1 text-sm text-white/70">Run actions on the selected stream.</p>
						</div>
						{#if selected}
							<a class="text-sm text-sky-300 hover:text-sky-200" href={`/streams/${selected.id}`}>Open stream →</a>
						{/if}
					</div>

					<div class="mt-6 flex flex-wrap gap-3">
						{#if showWithdraw}
							<button
								type="button"
								class="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90 disabled:opacity-60"
								onclick={() =>
									openConfirm({
										title: 'Withdraw from this stream?',
										description: 'You’ll choose an amount on the next step.',
										run: () => (withdrawOpen = true)
									})}
								disabled={!selected || busyAction || !canWithdraw}
							>
								Withdraw
							</button>
						{/if}
						<button
							type="button"
							class="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/85 hover:bg-white/10 disabled:opacity-60"
							onclick={() =>
								openConfirm({
									title: 'Pause stream?',
									description: 'Accrual will stop until you resume the stream.',
									run: () => doStreamAction('pause')
								})}
							disabled={!selected || busyAction || !canPauseResume || isPaused}
						>
							Pause
						</button>
						<button
							type="button"
							class="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/85 hover:bg-white/10 disabled:opacity-60"
							onclick={() =>
								openConfirm({
									title: 'Resume stream?',
									description: 'Accrual will continue from the current timeline.',
									run: () => doStreamAction('resume')
								})}
							disabled={!selected || busyAction || !canPauseResume || !isPaused}
						>
							Resume
						</button>
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
							disabled={!selected || busyAction || !canCancel}
						>
							Cancel
						</button>
						<a
							class={`rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/85 hover:bg-white/10 ${!selected || !isPayer ? 'pointer-events-none opacity-60' : ''}`}
							href={selected ? `/api/invoices/${selected.id}` : '#'}
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
							disabled={!selected || busyAction || !canSweep}
						>
							Sweep
						</button>
					</div>

					{#if selected && connected && !isPayer && !isReceiver}
						<div class="mt-4 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/70">
							Connected wallet is not payer/receiver for this stream.
						</div>
					{/if}

					{#if msg}
						<div class="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
							{msg}
						</div>
					{/if}
					{#if err}
						<div class="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
							{err}
						</div>
					{/if}
				</div>

				<div class="vs-section grid gap-6 md:grid-cols-2 lg:grid-cols-3">
					{#if showWithdraw}
						<div class="vs-card vs-card-pad">
							<div class="text-sm font-semibold">Withdraw</div>
							<p class="mt-2 text-sm text-white/70">
								Claim available accrued value from the stream. Uses a quick-claim slider and shows SOL (and USD if available).
							</p>
							<p class="mt-3 text-xs text-white/50">Receiver-only.</p>
						</div>
					{/if}

					<div class="vs-card vs-card-pad">
						<div class="text-sm font-semibold">Pause</div>
						<p class="mt-2 text-sm text-white/70">
							Temporarily stops accrual (and locks the stream’s effective time). Useful for disputes or operational holds.
						</p>
						<p class="mt-3 text-xs text-white/50">Payer-only.</p>
					</div>

					<div class="vs-card vs-card-pad">
						<div class="text-sm font-semibold">Resume</div>
						<p class="mt-2 text-sm text-white/70">
							Restarts a paused stream so accrual continues according to its timeline.
						</p>
						<p class="mt-3 text-xs text-white/50">Payer-only.</p>
					</div>

					<div class="vs-card vs-card-pad">
						<div class="text-sm font-semibold">Cancel</div>
						<p class="mt-2 text-sm text-white/70">Stops the stream permanently.</p>
						<p class="mt-3 text-xs text-white/50">Payer or receiver.</p>
					</div>

					<div class="vs-card vs-card-pad">
						<div class="text-sm font-semibold">Generate invoice</div>
						<p class="mt-2 text-sm text-white/70">Generates a PDF invoice for the stream via the server invoice endpoint.</p>
						<p class="mt-3 text-xs text-white/50">Payer-only.</p>
					</div>

					<div class="vs-card vs-card-pad">
						<div class="text-sm font-semibold">Sweep</div>
						<p class="mt-2 text-sm text-white/70">Cancels the stream and stops monitoring.</p>
						<p class="mt-3 text-xs text-white/50">Payer or receiver.</p>
					</div>
				</div>
			</div>
		</div>
	</main>
</div>

{#if withdrawOpen && showWithdraw}
	<div class="fixed inset-0 z-50 flex items-center justify-center px-4">
		<button
			type="button"
			class="absolute inset-0 bg-black/70 backdrop-blur-sm"
			onclick={() => (withdrawOpen = false)}
			aria-label="Close withdraw dialog"
		></button>
		<div class="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#050507] p-6 shadow-2xl">
			<div class="flex items-start justify-between gap-4">
				<div>
					<div class="text-sm font-semibold">Withdraw</div>
					<p class="mt-1 text-sm text-white/70">Claim a portion of available accrued value.</p>
				</div>
				<button
					type="button"
					class="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85 hover:bg-white/10"
					onclick={() => (withdrawOpen = false)}
				>
					Close
				</button>
			</div>

			<div class="mt-5">
				<div class="text-xs text-white/60">
					Available: <span class="font-mono text-white/85">{availableSol.toFixed(4)} SOL</span>
				</div>

				<QuickClaimSlider
					availableSol={availableSol}
					percent={withdrawPct}
					onChange={({ percent }) => (withdrawPct = percent)}
				/>

				<div class="mt-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-white/70">
					Claim: <span class="font-mono text-white/85">{claimSol.toFixed(4)} SOL</span>
				</div>
			</div>

			<div class="mt-6 flex items-center justify-end gap-3">
				<button
					type="button"
					class="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/85 hover:bg-white/10"
					onclick={() => (withdrawOpen = false)}
				>
					Cancel
				</button>
				<button
					type="button"
					class="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-300 disabled:opacity-60"
					onclick={async () => {
						await doStreamAction('withdraw', { amountLamports: claimLamports, percent: withdrawPct });
						withdrawOpen = false;
					}}
					disabled={busyAction || !selected || !canWithdraw}
				>
					Confirm withdraw
				</button>
			</div>
		</div>
	</div>
{/if}

<ConfirmActionModal
	open={confirmOpen}
	title={confirmTitle}
	description={confirmDesc}
	cancelLabel="Cancel"
	danger={confirmDanger}
	busy={confirmBusy || busyAction}
	onClose={closeConfirm}
	onConfirm={confirmExec}
/>


