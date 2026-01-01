<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { walletStore } from '$lib/wallet/walletStore';
	import { loadContext, saveContext, contextStore } from '$lib/consensus/contextStore';

	let connected = $state(false);
	let publicKeyBase58 = $state('');

	const unsub = walletStore.subscribe((s) => {
		connected = s.connected;
		publicKeyBase58 = s.publicKeyBase58;
	});

	onMount(async () => {
		walletStore.ensureReady();
		if (!connected) goto('/auth');
		await loadContext();
		return () => unsub();
	});

	$effect(() => {
		if (!connected) goto('/auth');
	});

	let mode = $state('operator');
	let ownersText = $state('');
	let saving = $state(false);
	let err = $state('');
	let ok = $state('');

	$effect(() => {
		const ctx = $contextStore.context;
		if (ctx) {
			// Consensus is disabled for now (coming soon), so never load it as active.
			mode = ctx.mode === 'consensus' || ctx.mode === 'off' ? 'operator' : ctx.mode || 'operator';
			ownersText = Array.isArray(ctx.owners) ? ctx.owners.join('\n') : '';
		}
	});

	async function onSave() {
		saving = true;
		err = '';
		ok = '';
		try {
			const owners =
				mode === 'operator'
					? [publicKeyBase58].filter(Boolean)
					: ownersText
							.split('\n')
							.map((s) => s.trim())
							.filter(Boolean);
			if (mode === 'operator' && owners.length !== 1) {
				throw new Error('Connect your wallet to set the operator owner.');
			}
			if (mode === 'consensus' && owners.length !== 3) {
				throw new Error('Consensus mode requires exactly 3 owners (fixed 2-of-3).');
			}
			await saveContext({ mode, owners });
			ok = 'Saved.';
		} catch (e) {
			err = e?.message ?? 'Save failed.';
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>Mode Settings — Voidstream</title>
</svelte:head>

<div class="vs-page">
	<header class="vs-header">
		<div class="vs-container vs-header-inner">
			<a href="/dashboard" class="text-sm text-white/70 hover:text-white">← Back</a>
			<div class="text-sm font-semibold">Mode settings</div>
			<button
				type="button"
				class="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85 hover:bg-white/10"
				onclick={() => walletStore.disconnect()}
			>
				Disconnect
			</button>
		</div>
	</header>

	<main class="vs-main space-y-6">
		<div class="vs-card vs-card-pad">
			<div class="text-sm font-semibold">Mode</div>
			<div class="mt-3 flex flex-wrap gap-2">
				<button
					type="button"
					class={`rounded-xl px-3 py-2 text-sm border ${mode === 'operator' ? 'bg-white text-black border-white' : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10'}`}
					onclick={() => (mode = 'operator')}
				>
					Operator
				</button>
				<button
					type="button"
					class="rounded-xl px-3 py-2 text-sm border bg-white/5 text-white/60 border-white/10 opacity-60 cursor-not-allowed"
					disabled={true}
				>
					<span>Consensus (2-of-3)</span>
					<span class="ml-2 rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] text-white/60">
						Coming soon
					</span>
				</button>
			</div>

			<div class="mt-6">
				{#if mode === 'operator'}
					<div class="text-sm font-semibold">Owner</div>
					<div class="mt-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/80 font-mono">
						{publicKeyBase58 || 'Not connected'}
					</div>
					<p class="mt-2 text-xs text-white/50">
						Operator mode uses the currently connected wallet as the sole owner.
					</p>
				{:else}
					<div class="text-sm font-semibold">Owners (one pubkey per line)</div>
					<textarea
						class="mt-2 w-full min-h-32 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white font-mono"
						bind:value={ownersText}
						placeholder="owner pubkey 1\nowner pubkey 2\nowner pubkey 3"
					></textarea>
				{/if}
			</div>

			<div class="mt-4 flex items-center gap-3">
				<button
					type="button"
					class="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90 disabled:opacity-60"
					onclick={onSave}
					disabled={saving}
				>
					{saving ? 'Saving…' : 'Save'}
				</button>
				{#if ok}<div class="text-sm text-emerald-300">{ok}</div>{/if}
				{#if err}<div class="text-sm text-red-200">{err}</div>{/if}
			</div>

			<p class="mt-4 text-xs text-white/50">
				Operator = direct execution (no approvals). Consensus = approvals required (2-of-3) and actions execute on quorum (coming soon).
			</p>

			<p class="mt-2 text-xs text-white/50">
				Current wallet: <span class="font-mono text-white/70">{publicKeyBase58}</span>
			</p>
		</div>
	</main>
</div>


