<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { walletStore } from '$lib/wallet/walletStore';
	import { listAuditLogs } from '$lib/pb/audit';
	import { solscanTxUrl } from '$lib/solana/solscan';

	let connected = $state(false);
	let publicKeyBase58 = $state('');
	let walletName = $state('');

	let loading = $state(true);
	let error = $state('');
	let logs = $state([]);

	const unsub = walletStore.subscribe((s) => {
		connected = s.connected;
		publicKeyBase58 = s.publicKeyBase58;
		walletName = s.walletName || 'Phantom';
	});

	onMount(async () => {
		walletStore.ensureReady();
		if (!connected) goto('/auth');
		await load();
		return () => unsub();
	});

	$effect(() => {
		if (!connected) goto('/auth');
	});

	async function load() {
		loading = true;
		error = '';
		try {
			logs = await listAuditLogs();
		} catch (e) {
			error = e?.message ?? 'Failed to load audit logs.';
			logs = [];
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Audit — Voidstream</title>
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
					<a class="text-white" href="/audit">Audit</a>
					<a class="hover:text-white" href="/tools">Tools</a>
					<a class="hover:text-white" href="/settings/context">Mode</a>
				</nav>
			</div>

			<div class="flex items-center gap-3">
				<button
					type="button"
					class="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85 hover:bg-white/10"
					onclick={() => load()}
				>
					Refresh
				</button>
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
		<div class="vs-section">
			<div class="vs-card vs-card-pad">
				<div class="flex items-start justify-between gap-4">
					<div>
						<div class="text-sm font-semibold">Audit</div>
						<p class="mt-2 text-sm text-white/70">All activity across your streams.</p>
					</div>
					<div class="text-right">
						<div class="text-xs text-white/60">Connected</div>
						<div class="mt-1 text-sm font-semibold">{walletName}</div>
						<div class="mt-1 text-xs font-mono text-white/70">{publicKeyBase58}</div>
					</div>
				</div>

				{#if loading}
					<p class="mt-4 text-sm text-white/70">Loading…</p>
				{:else if error}
					<p class="mt-4 text-sm text-red-200">{error}</p>
				{:else if logs.length === 0}
					<p class="mt-4 text-sm text-white/70">No events yet.</p>
				{:else}
					<ul class="mt-4 space-y-2">
						{#each logs as l (l.id)}
							<li class="rounded-xl border border-white/10 bg-black/20 p-4">
								<div class="flex flex-wrap items-start justify-between gap-3">
									<div>
										<div class="text-xs font-semibold text-white/85">{l.type}</div>
										<div class="mt-1 text-xs text-white/70">{l.message}</div>
										{#if l.created}
											<div class="mt-2 text-[11px] text-white/50">{new Date(l.created).toLocaleString()}</div>
										{/if}
									</div>
									<div class="flex flex-wrap items-center gap-3 text-xs">
										{#if l.stream}
											<a class="text-sky-300 hover:text-sky-200" href={`/streams/${l.stream}`}>Open stream →</a>
										{/if}
										{#if l.signature}
											<a
												class="text-sky-300 hover:text-sky-200 font-mono"
												href={solscanTxUrl(l.signature)}
												target="_blank"
												rel="noreferrer"
											>
												Solscan →
											</a>
										{/if}
									</div>
								</div>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</div>
	</main>
</div>


