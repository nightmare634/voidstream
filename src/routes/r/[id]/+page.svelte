<script>
	import { onMount } from 'svelte';
	import { walletStore } from '$lib/wallet/walletStore';
	import { lamportsToSol } from '$lib/streams/timeline';
	import ConfirmActionModal from '$lib/components/ConfirmActionModal.svelte';
	import { cancelOnchain, getRpcConnection, withdrawAndUnwrapOnchain, withdrawOnchain } from '$lib/streamflow/client';
	import { computeWithdrawableLamports, getStreamflowStream } from '$lib/streamflow/read';
	import { Transaction } from '@solana/web3.js';

	let { params } = $props();

	let ready = $state(false);
	let connecting = $state(false);
	let connected = $state(false);
	let publicKeyBase58 = $state('');
	let walletName = $state('Phantom');
	let walletError = $state('');
	let balanceSol = $state(0);
	let balanceStreaming = $state(false);
	let balanceStreamError = $state('');

	let loading = $state(true);
	let error = $state('');
	let stream = $state(null);
	let sfStream = $state(null);
	let sfErr = $state('');

	let now = $state(Date.now());

	let withdrawOpen = $state(false);
	let withdrawPct = $state(0.25);
	let busy = $state(false);
	let msg = $state('');
	let err = $state('');

	let toast = $state('');

	let confirmOpen = $state(false);
	let confirmTitle = $state('');
	let confirmDesc = $state('');
	let confirmConfirmLabel = $state('Confirm');
	let confirmCancelLabel = $state('Cancel');
	let confirmDanger = $state(false);
	let confirmBusy = $state(false);
	let confirmRun = $state(null);

	function openConfirm({ title, description, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false, run }) {
		confirmTitle = title || 'Confirm';
		confirmDesc = description || '';
		confirmConfirmLabel = confirmLabel || 'Confirm';
		confirmCancelLabel = cancelLabel || 'Cancel';
		confirmDanger = !!danger;
		confirmRun = run;
		confirmOpen = true;
	}

	function closeConfirm() {
		if (confirmBusy) return;
		confirmOpen = false;
		confirmTitle = '';
		confirmDesc = '';
		confirmConfirmLabel = 'Confirm';
		confirmCancelLabel = 'Cancel';
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
		ready = s.ready;
		connecting = s.connecting;
		connected = s.connected;
		publicKeyBase58 = s.publicKeyBase58;
		walletName = s.walletName || 'Phantom';
		walletError = s.error;
		balanceSol = Number(s.balanceSol || 0);
		balanceStreaming = !!s.streaming;
		balanceStreamError = s.streamError || '';
	});

	onMount(() => {
		walletStore.ensureReady();
		load();
		const t = setInterval(() => {
			now = Date.now();
		}, 1000);
		return () => {
			clearInterval(t);
			unsub();
		};
	});

	async function load() {
		loading = true;
		error = '';
		try {
			const res = await fetch(`/api/streams/public/${encodeURIComponent(params.id)}`);
			const j = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(j?.message ?? 'Failed to load stream.');
			stream = j?.stream ?? null;

			sfStream = null;
			sfErr = '';
			if (stream?.streamflowId) {
				try {
					sfStream = await getStreamflowStream(stream.streamflowId);
				} catch (e) {
					sfErr = e?.message ?? 'Failed to load on-chain stream.';
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

	const nowSec = $derived.by(() => Math.floor(Number(now || 0) / 1000));

	const totalLamports = $derived.by(() => {
		try {
			const v = sfStream?.depositedAmount;
			return v ? Number(v.toString()) || 0 : 0;
		} catch {
			return 0;
		}
	});

	const unlockedLamports = $derived.by(() => {
		try {
			if (!sfStream) return 0;
			return Number(sfStream.unlocked(nowSec).toString()) || 0;
		} catch {
			return 0;
		}
	});

	const accrual = $derived.by(() => ({
		progress: totalLamports > 0 ? Math.max(0, Math.min(1, unlockedLamports / totalLamports)) : 0
	}));

	const accruedSol = $derived.by(() => lamportsToSol(unlockedLamports));
	const totalSol = $derived.by(() => lamportsToSol(totalLamports));

	const availableLamports = $derived.by(() => computeWithdrawableLamports(sfStream, nowSec));
	const availableSol = $derived.by(() => lamportsToSol(availableLamports));
	const claimLamports = $derived.by(() => Math.floor(availableLamports * Number(withdrawPct || 0)));
	const claimSol = $derived.by(() => lamportsToSol(claimLamports));

	const receiverWalletTrimmed = $derived.by(() => String(stream?.receiverWallet || '').trim());
	const isReceiver = $derived.by(() => connected && !!publicKeyBase58 && publicKeyBase58 === receiverWalletTrimmed);
	const isUnclaimed = $derived.by(() => !receiverWalletTrimmed);
	const isPayer = $derived.by(
		() => !!stream?.payerWallet && connected && publicKeyBase58 === String(stream.payerWallet).trim()
	);
	const canAct = $derived.by(() => isReceiver || isPayer);
	const canWithdraw = $derived.by(() => isReceiver || isUnclaimed);

	const isEnded = $derived.by(() => {
		const endSec = Number(sfStream?.end || 0);
		if (Number.isFinite(endSec) && endSec > 0) return nowSec >= endSec;
		const endMs = stream?.endAt ? Date.parse(stream.endAt) : NaN;
		return Number.isFinite(endMs) ? now >= endMs : false;
	});

	const isExpired = $derived.by(() => {
		const avail = Number(availableLamports || 0);
		const noFunds = avail <= 0;
		const status = String(stream?.status || '').toLowerCase();
		const cancelled = status === 'cancelled';
		return noFunds && (cancelled || isEnded);
	});

	async function ensureConnected() {
		if (connected) return true;
		await walletStore.connect();
		return !!publicKeyBase58;
	}

	function b64ToU8(b64) {
		const bin = atob(String(b64 || ''));
		const bytes = new Uint8Array(bin.length);
		for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
		return bytes;
	}

	async function confirmSignature(signature, timeoutMs = 60_000) {
		const connection = getRpcConnection();
		const started = Date.now();
		// eslint-disable-next-line no-constant-condition
		while (true) {
			const { value } = await connection.getSignatureStatuses([signature], { searchTransactionHistory: true });
			const s = value?.[0];
			if (s?.err) throw new Error(`Transaction failed: ${JSON.stringify(s.err)}`);
			if (s?.confirmationStatus === 'confirmed' || s?.confirmationStatus === 'finalized') return;
			if (Date.now() - started > timeoutMs) throw new Error('Timed out confirming transaction. Check Solscan for status.');
			await new Promise((r) => setTimeout(r, 1500));
		}
	}

	async function ensureClaimed() {
		if (!stream?.id) throw new Error('Missing stream.');
		if (!stream?.streamflowId) throw new Error('Missing Streamflow stream id (streamflowId).');
		if (!isUnclaimed) return true;
		if (!(await ensureConnected())) throw new Error('Connect Phantom to continue.');

		// Step 1: ask server for a partially-signed claim transaction (signed by claim-vault).
		const res = await fetch('/api/streams/claim', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ streamId: stream.id, claimant: publicKeyBase58 })
		});
		const j = await res.json().catch(() => ({}));
		if (!res.ok) throw new Error(j?.message ?? 'Claim failed.');
		const txBase64 = j?.txBase64 ? String(j.txBase64) : '';
		if (!txBase64) throw new Error('Claim transaction missing from server response.');

		// Step 2: claimant signs + submits the tx.
		const phantom = /** @type {any} */ (window?.solana);
		if (!phantom?.signAndSendTransaction) throw new Error('Phantom wallet not available.');

		const tx = Transaction.from(b64ToU8(txBase64));
		const sent = await phantom.signAndSendTransaction(tx);
		const sig = sent?.signature ? String(sent.signature) : '';
		if (!sig) throw new Error('Wallet did not return a signature.');
		await confirmSignature(sig);

		// Step 3: finalize PocketBase state on the server (record receiverWallet + audit signature).
		const fin = await fetch('/api/streams/claim', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ streamId: stream.id, claimant: publicKeyBase58, signature: sig })
		});
		const fj = await fin.json().catch(() => ({}));
		if (!fin.ok) throw new Error(fj?.message ?? 'Claim finalize failed.');

		msg = 'Claimed to connected wallet.';
		await load();
		return true;
	}

	async function doAction(action, payload) {
		busy = true;
		msg = '';
		err = '';
		try {
			if (!stream?.id) throw new Error('Missing stream.');
			if (!(await ensureConnected())) throw new Error('Connect Phantom to continue.');
			if (!stream?.streamflowId) throw new Error('Missing Streamflow stream id (streamflowId).');

			let sig = '';
			if (action === 'withdraw') {
				// Auto-claim unclaimed streams to the connected wallet before withdrawing.
				await ensureClaimed();
				const amt = Number(payload?.amountLamports || 0);
				if (!Number.isFinite(amt) || amt <= 0) throw new Error('Invalid amount.');
				// Prefer combined withdraw+auto-unwrap (one Phantom prompt) when safe.
				try {
					const r = await withdrawAndUnwrapOnchain({
						invokerPublicKeyBase58: publicKeyBase58,
						streamflowId: stream.streamflowId,
						amountLamports: Math.floor(amt)
					});
					sig = r.signature;
					if (!r.unwrapped) {
						toast = 'Received WSOL — unwrap in your wallet to convert to SOL.';
						setTimeout(() => {
							toast = '';
						}, 2600);
					}
				} catch (e) {
					// Fallback to plain withdraw if combined tx can't be safely constructed/executed.
					const r = await withdrawOnchain({
						invokerPublicKeyBase58: publicKeyBase58,
						streamflowId: stream.streamflowId,
						amountLamports: Math.floor(amt)
					});
					sig = r.signature;
					toast = 'Withdraw sent. If you received WSOL, unwrap it in your wallet to convert to SOL.';
					setTimeout(() => {
						toast = '';
					}, 2600);
				}
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
			if (action === 'withdraw') {
				toast = `Withdraw successful — ${Number(payload?.amountLamports ? lamportsToSol(Number(payload.amountLamports)) : 0).toFixed(4)} SOL`;
				setTimeout(() => {
					toast = '';
				}, 2600);
			} else {
				msg = 'Action completed.';
			}
			await load();
			return true;
		} catch (e) {
			err = e?.message ?? 'Action failed.';
			return false;
		} finally {
			busy = false;
		}
	}

	async function cancelFlow() {
		const ok = await doAction('cancel');
		if (!ok) return;

		// Only prompt receiver to withdraw remaining funds.
		if (!isReceiver) return;

		const remaining = Number(availableLamports || 0);
		if (!Number.isFinite(remaining) || remaining <= 0) return;

		openConfirm({
			title: 'Withdraw remaining funds?',
			description: `There is still ${Number(availableSol || 0).toFixed(4)} SOL available. Withdraw to your connected wallet now?`,
			confirmLabel: 'Withdraw',
			cancelLabel: 'Not now',
			danger: false,
			run: async () => {
				if (!(await ensureConnected())) throw new Error('Connect Phantom to continue.');
				withdrawPct = 1;
				withdrawOpen = true;
			}
		});
	}

	async function sweep() {
		busy = true;
		msg = '';
		err = '';
		try {
			if (!stream?.id) throw new Error('Missing stream.');
			if (!(await ensureConnected())) throw new Error('Connect Phantom to continue.');
			if (!stream?.streamflowId) throw new Error('Missing Streamflow stream id (streamflowId).');

			const r = await cancelOnchain({ invokerPublicKeyBase58: publicKeyBase58, streamflowId: stream.streamflowId });

			const res = await fetch('/api/streams/reclaim', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ streamId: stream.id, requester: publicKeyBase58, signature: r.signature })
			});
			const j = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(j?.message ?? 'Sweep failed.');
			msg = 'Swept (cancelled) successfully.';
			await load();
		} catch (e) {
			err = e?.message ?? 'Sweep failed.';
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head>
	<title>Receiver — Voidstream</title>
</svelte:head>

<div class="vs-page">
	<header class="vs-header">
		<div class="vs-container vs-header-inner">
			<div class="flex items-center gap-4">
				<a href="/" class="text-sm text-white/70 hover:text-white">← Home</a>
				<div class="text-sm font-semibold">Receiver</div>
			</div>
			{#if connected}
				<button
					type="button"
					class="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85 hover:bg-white/10"
					onclick={() => walletStore.disconnect()}
				>
					Disconnect
				</button>
			{:else}
				<button
					type="button"
					class="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-black hover:bg-white/90 disabled:opacity-60"
					onclick={() => walletStore.connect()}
					disabled={!ready || connecting}
				>
					{connecting ? 'Connecting…' : 'Connect Phantom'}
				</button>
			{/if}
		</div>
	</header>

	<main class="vs-main">
		{#if toast}
			<div class="fixed left-1/2 top-4 z-50 w-[min(42rem,calc(100%-2rem))] -translate-x-1/2">
				<div class="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100 shadow-2xl">
					{toast}
				</div>
			</div>
		{/if}

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
			{#if connected}
				<div class="vs-card vs-card-pad-sm text-xs text-white/70">
					<div class="text-white/60">Connected wallet</div>
					<div class="mt-1 text-sm font-semibold">{walletName}</div>
					<div class="mt-1 font-mono text-xs text-white/80">{publicKeyBase58}</div>
					<div class="mt-2 text-xs text-white/60">
						Balance:{' '}
						<span class="font-mono text-white/85">{balanceSol.toFixed(4)} SOL</span>
						{#if balanceStreaming}
							<span class="ml-2 text-emerald-300">live</span>
						{/if}
					</div>
					{#if balanceStreamError}
						<div class="mt-1 text-xs text-amber-200">{balanceStreamError}</div>
					{/if}
				</div>
			{/if}

			{#if isExpired}
				<div class="vs-section">
					<div class="vs-card vs-card-pad">
						<div class="text-sm font-semibold">This link has expired</div>
						<p class="mt-2 text-sm text-white/70">
							This stream has finished and there are no remaining funds to withdraw.
						</p>
						<div class="mt-4 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-white/70">
							Stream: <span class="font-mono text-white/85">{stream.id}</span>
						</div>
						<div class="mt-5">
							<a
								href="/"
								class="inline-flex rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90"
							>
								Go to Home
							</a>
						</div>
					</div>
				</div>
			{:else}
				<div class="vs-section grid gap-6 lg:grid-cols-3">
					<section class="lg:col-span-2">
						<div class="vs-card vs-card-pad">
							<div class="flex items-start justify-between gap-4">
								<div>
									<div class="text-xs text-white/60">Receiver wallet</div>
									{#if receiverWalletTrimmed}
										<div class="mt-1 font-mono text-sm text-white/85">{receiverWalletTrimmed}</div>
									{:else}
										<div class="mt-1 text-sm text-white/80">Unclaimed (any wallet can claim)</div>
									{/if}
									<div class="mt-2 text-xs text-white/60">
										Status: <span class="text-white/80">{stream.status}</span>
									</div>
									{#if sfErr}
										<div class="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
											{sfErr}
										</div>
									{:else if stream?.streamflowId && !sfStream}
										<div class="mt-3 text-xs text-white/60">Loading on-chain stream…</div>
									{:else if !stream?.streamflowId}
										<div class="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
											This stream is missing a Streamflow id and can’t be used on mainnet.
										</div>
									{/if}
								</div>
								<div class="text-right">
									<div class="text-xs text-white/60">Accrued</div>
									<div class="mt-1 font-mono text-sm text-white/85">
										{accruedSol.toFixed(4)} / {totalSol.toFixed(4)} SOL
									</div>
									<div class="mt-2 text-xs text-white/60">
										Available: <span class="font-mono text-white/80">{availableSol.toFixed(4)} SOL</span>
									</div>
								</div>
							</div>

							<div class="mt-6 h-2 overflow-hidden rounded-full bg-white/10">
								<div
									class="h-2 rounded-full bg-emerald-400/80"
									style={`width:${Math.round((accrual?.progress ?? 0) * 100)}%`}
								></div>
							</div>

							<div class="mt-6 flex flex-wrap gap-3">
								<button
									type="button"
									class="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90 disabled:opacity-60"
									onclick={() =>
										openConfirm({
											title: 'Withdraw from this stream?',
											description: 'You’ll choose an amount on the next step.',
											confirmLabel: 'Continue',
											cancelLabel: 'Cancel',
											run: () => (withdrawOpen = true)
										})}
									disabled={busy || !stream || !sfStream || Number(availableLamports || 0) <= 0 || (connected && !canWithdraw)}
								>
									Withdraw
								</button>
								<button
									type="button"
									class="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-200 hover:bg-red-500/15 disabled:opacity-60"
									onclick={() =>
										openConfirm({
											title: 'Cancel stream?',
											description: 'This will stop the stream permanently.',
											confirmLabel: 'Cancel stream',
											cancelLabel: 'Back',
											danger: true,
											run: () => cancelFlow()
										})}
									disabled={busy || !stream || (connected && !canAct)}
								>
									Cancel
								</button>
								<button
									type="button"
									class="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-100 hover:bg-amber-500/15 disabled:opacity-60"
									onclick={() =>
										openConfirm({
											title: 'Sweep this stream?',
											description: 'This cancels the stream and stops monitoring.',
											confirmLabel: 'Sweep',
											cancelLabel: 'Back',
											danger: true,
											run: () => sweep()
										})}
									disabled={busy || !stream || (connected && !canAct)}
								>
									Sweep
								</button>
							</div>

							{#if walletError}
								<div class="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
									{walletError}
								</div>
							{/if}
							{#if err}
								<div class="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
									{err}
								</div>
							{/if}
							{#if msg}
								<div class="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
									{msg}
								</div>
							{/if}

							{#if connected && !canAct}
								<div class="mt-4 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/70">
									{#if isUnclaimed}
										This stream is unclaimed. You can claim + withdraw, but only the payer/receiver can cancel or sweep.
									{:else}
										Connected wallet is not payer/receiver for this stream.
									{/if}
								</div>
							{/if}
							{#if connected && receiverWalletTrimmed && !isReceiver}
								<div class="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
									This stream is already claimed by a different receiver wallet.
								</div>
							{/if}
							{#if !connected}
								<div class="mt-4 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/70">
									You can view amounts without connecting. Connect Phantom to Withdraw/Cancel/Sweep.
								</div>
							{/if}
						</div>
					</section>

					<aside class="space-y-4">
						<div class="vs-card vs-card-pad">
							<div class="text-sm font-semibold">Payer</div>
							<div class="mt-2 font-mono text-xs text-white/70">{stream.payerWallet}</div>
						</div>
						<div class="vs-card vs-card-pad">
							<div class="text-sm font-semibold">Permissions</div>
							<ul class="mt-2 space-y-2 text-sm text-white/70">
								<li>Withdraw: receiver only (or any wallet if unclaimed)</li>
								<li>Cancel: payer or receiver</li>
								<li>Sweep: payer or receiver</li>
							</ul>
						</div>
					</aside>
				</div>
			{/if}
		{/if}
	</main>
</div>

{#if withdrawOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center px-4">
		<button
			type="button"
			class="absolute inset-0 bg-black/70 backdrop-blur-sm"
			onclick={() => (withdrawOpen = false)}
			aria-label="Close withdraw dialog"
		></button>
		<div class="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#0d1117] p-6 shadow-2xl">
			<div class="flex items-start justify-between gap-4">
				<div>
					<div class="text-sm font-semibold">Withdraw</div>
					<p class="mt-1 text-sm text-white/70">Choose a percentage of your available amount to claim.</p>
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
				{#if connected}
					<div class="mt-1 text-xs text-white/60">
						Wallet: <span class="font-mono text-white/85">{balanceSol.toFixed(4)} SOL</span>
						{#if balanceStreaming}
							<span class="ml-2 text-emerald-300">live</span>
						{/if}
					</div>
				{/if}

				<div class="mt-3 rounded-2xl border border-white/10 bg-black/20 p-4">
					<div class="flex items-center justify-between gap-3">
						<div class="text-xs text-white/60">Quick claim</div>
						<div class="font-mono text-xs text-white/80" data-sensitive>{claimSol.toFixed(4)} SOL</div>
					</div>
					<input
						class="mt-3 w-full accent-emerald-400"
						type="range"
						min="0"
						max="100"
						step="1"
						value={Math.round(Number(withdrawPct || 0) * 100)}
						oninput={(e) => (withdrawPct = Number(e.currentTarget.value) / 100)}
					/>
					<div class="mt-3 flex flex-wrap gap-2">
						{#each [0.1, 0.25, 0.5, 0.75, 1] as p}
							<button
								type="button"
								class="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
								onclick={() => (withdrawPct = p)}
							>
								{Math.round(p * 100)}%
							</button>
						{/each}
					</div>
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
						await doAction('withdraw', { amountLamports: claimLamports, percent: withdrawPct });
						withdrawOpen = false;
					}}
					disabled={busy}
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
	confirmLabel={confirmConfirmLabel}
	cancelLabel={confirmCancelLabel}
	danger={confirmDanger}
	busy={confirmBusy || busy}
	onClose={closeConfirm}
	onConfirm={confirmExec}
/>



