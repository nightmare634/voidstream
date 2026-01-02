<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { walletStore } from '$lib/wallet/walletStore';

	let connected = $state(false);
	const unsub = walletStore.subscribe((s) => {
		connected = s.connected;
	});

	let loading = $state(true);
	let report = $state(null);
	let err = $state('');

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
		err = '';
		try {
			const res = await fetch('/api/health/schema');
			const j = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(j?.error || j?.message || 'Schema check failed.');
			report = j;
		} catch (e) {
			err = e?.message ?? 'Schema check failed.';
			report = null;
		} finally {
			loading = false;
		}
	}

	async function triggerWebhookSync() {
		try {
			const res = await fetch('/api/helius/webhook/sync', { method: 'POST' });
			const j = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(j?.message ?? 'Webhook sync failed.');
			alert(j.changed ? `Webhook synced. Added: ${j.added?.length || 0}, removed: ${j.removed?.length || 0}.` : 'Webhook already up to date.');
		} catch (e) {
			alert(e?.message ?? 'Webhook sync failed.');
		}
	}
</script>

<svelte:head>
	<title>Health — Voidstream</title>
</svelte:head>

<div class="min-h-screen bg-[#050507] text-white">
	<header class="border-b border-white/10">
		<div class="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
			<a href="/dashboard" class="text-sm text-white/70 hover:text-white">← Back</a>
			<div class="text-sm font-semibold">Health</div>
			<button
				type="button"
				class="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85 hover:bg-white/10"
				onclick={() => walletStore.disconnect()}
			>
				Disconnect
			</button>
		</div>
	</header>

	<main class="mx-auto max-w-6xl px-6 py-10 space-y-6">
		<div class="rounded-2xl border border-white/10 bg-white/5 p-6">
			<div class="flex items-start justify-between gap-4">
				<div>
					<div class="text-sm font-semibold">Backend schema</div>
					<p class="mt-1 text-sm text-white/70">
						Verifies required collections and fields.
					</p>
				</div>
				<div class="flex items-center gap-3">
					<button
						type="button"
						class="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85 hover:bg-white/10"
						onclick={load}
					>
						Refresh
					</button>
					<button
						type="button"
						class="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-black hover:bg-white/90"
						onclick={triggerWebhookSync}
					>
						Webhook sync
					</button>
				</div>
			</div>

			{#if loading}
				<p class="mt-4 text-sm text-white/70">Checking…</p>
			{:else if err}
				<div class="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
					{err}
					<div class="mt-2 text-xs text-white/60">See `docs/ENV.md` for required env vars.</div>
				</div>
			{:else if report}
				<div class="mt-4">
					<div class={`text-sm font-semibold ${report.ok ? 'text-emerald-300' : 'text-amber-200'}`}>
						{report.ok ? 'OK' : 'Missing schema pieces'}
					</div>

					{#if report.missingCollections?.length}
						<div class="mt-3 text-sm text-white/70">
							Missing collections:
							<span class="font-mono text-white/85">{report.missingCollections.join(', ')}</span>
						</div>
					{/if}

					{#if Object.keys(report.missingFields || {}).length}
						<div class="mt-3 text-sm text-white/70">Missing fields:</div>
						<ul class="mt-2 space-y-1 text-sm text-white/70">
							{#each Object.entries(report.missingFields) as [k, v]}
								<li>
									<span class="font-mono text-white/85">{k}</span>:
									<span class="font-mono text-white/70">{v.join(', ')}</span>
								</li>
							{/each}
						</ul>
					{/if}

					<p class="mt-4 text-xs text-white/50">
						If anything is missing, run `node scripts/pb_setup.mjs` with admin creds.
					</p>

					<p class="mt-2 text-xs text-white/50">
						Mode note: ensure `contexts.mode` select values include <span class="font-mono text-white/70">operator</span> and{' '}
						<span class="font-mono text-white/70">consensus</span>. Legacy <span class="font-mono text-white/70">off</span> is treated as
						operator.
					</p>
				</div>
			{/if}
		</div>
	</main>
</div>


