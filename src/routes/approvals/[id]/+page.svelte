<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { walletStore } from '$lib/wallet/walletStore';

	let { params } = $props();

	let connected = $state(false);
	let publicKeyBase58 = $state('');

	let loading = $state(true);
	let err = $state('');
	let ok = $state('');

	const unsub = walletStore.subscribe((s) => {
		connected = s.connected;
		publicKeyBase58 = s.publicKeyBase58;
	});

	onMount(() => {
		walletStore.ensureReady();
		if (!connected) goto('/auth');
		load();
		return () => unsub();
	});

	$effect(() => {
		if (!connected) goto('/auth');
	});

	async function load() {
		loading = true;
		err = '';
		ok = '';
		// Consensus approvals are intentionally disabled until token launch.
		loading = false;
	}
</script>

<svelte:head>
	<title>Approval — Voidstream</title>
</svelte:head>

<div class="min-h-screen bg-[#0d1117] text-white">
	<header class="border-b border-white/10">
		<div class="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
			<a href="/dashboard" class="text-sm text-white/70 hover:text-white">← Back</a>
			<div class="text-sm font-semibold">Approval</div>
			<button
				type="button"
				class="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85 hover:bg-white/10"
				onclick={() => walletStore.disconnect()}
			>
				Disconnect
			</button>
		</div>
	</header>

	<main class="mx-auto max-w-3xl px-6 py-10">
		<div class="rounded-2xl border border-white/10 bg-white/5 p-6">
			<div class="flex items-start justify-between gap-4">
				<div>
					<div class="text-sm font-semibold">Approval request</div>
					<p class="mt-1 text-sm text-white/70">
						Consensus approvals are <span class="font-semibold text-white/85">coming soon</span> and are disabled until token launch.
					</p>
				</div>
				<span class="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/60">Coming soon</span>
			</div>

			{#if loading}
				<p class="mt-4 text-sm text-white/70">Loading…</p>
			{:else if err}
				<div class="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
					{err}
				</div>
			{:else}
				<div class="mt-4 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/70">
					This page will become active at launch. For now, use Operator mode (direct execution).
				</div>
			{/if}

			{#if ok}
				<div class="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
					{ok}
				</div>
			{/if}
		</div>
	</main>
</div>


