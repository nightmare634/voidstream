<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { walletStore } from '$lib/wallet/walletStore';
	import { searchStore, rebuildIndex } from '$lib/search/searchStore';

	let open = $state(false);
	let q = $state('');
	let payer = $state('');
	let connected = $state(false);
	let inputEl = $state(null);

	const unsub = walletStore.subscribe((s) => {
		connected = s.connected;
		payer = s.publicKeyBase58;
	});

	onMount(() => {
		const onKey = (e) => {
			if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
				e.preventDefault();
				open = true;
				rebuildIndex({ payer });
			}
			if (e.key === 'Escape') open = false;
		};
		window.addEventListener('keydown', onKey);
		return () => {
			window.removeEventListener('keydown', onKey);
			unsub();
		};
	});

	const results = $derived.by(() => {
		const s = $searchStore;
		const query = q.trim().toLowerCase();
		if (!query) return s.items.slice(0, 12);
		return s.items.filter((i) => i.text.toLowerCase().includes(query)).slice(0, 12);
	});

	function select(item) {
		open = false;
		q = '';
		goto(item.href);
	}

	$effect(() => {
		if (!open) return;
		// Avoid autofocus a11y warning; focus on open instead.
		queueMicrotask(() => inputEl?.focus?.());
	});
</script>

{#if open}
	<div class="fixed inset-0 z-50 flex items-start justify-center px-4 pt-24">
		<button
			type="button"
			class="absolute inset-0 bg-black/70 backdrop-blur-sm"
			onclick={() => (open = false)}
			aria-label="Close search"
		></button>

		<div class="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-[#0d1117] shadow-2xl">
			<div class="border-b border-white/10 px-4 py-3">
				<input
					class="w-full bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
					placeholder="Search streams and audit logs…"
					bind:value={q}
					bind:this={inputEl}
				/>
			</div>

			<div class="max-h-80 overflow-auto p-2">
				{#if $searchStore.loading}
					<div class="px-3 py-3 text-sm text-white/70">Indexing…</div>
				{:else if $searchStore.error}
					<div class="px-3 py-3 text-sm text-red-200">{$searchStore.error}</div>
				{:else if results.length === 0}
					<div class="px-3 py-3 text-sm text-white/70">No results.</div>
				{:else}
					<ul>
						{#each results as r (r.type + ':' + r.id)}
							<li>
								<button
									type="button"
									class="w-full rounded-xl px-3 py-2 text-left hover:bg-white/5"
									onclick={() => select(r)}
								>
									<div class="text-sm font-semibold text-white/90">{r.title}</div>
									<div class="mt-0.5 text-xs text-white/60">{r.subtitle}</div>
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			<div class="border-t border-white/10 px-4 py-2 text-xs text-white/50">
				Shortcut: Ctrl/⌘ + K · Esc to close
			</div>
		</div>
	</div>
{/if}


