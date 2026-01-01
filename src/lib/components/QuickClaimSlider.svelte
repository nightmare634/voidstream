<script>
	/**
	 * Minimal rebuild of Quick-Claim slider:
	 * - percent (0..1) and amountSol derived from availableSol
	 */
	let { availableSol = 0, percent = 0.25, onChange = () => {} } = $props();

	const presets = [0.1, 0.25, 0.5, 0.75, 1];
	const pct = $derived(Math.max(0, Math.min(1, Number(percent) || 0)));
	const amountSol = $derived(Number(availableSol) * pct);

	function setPct(v) {
		const next = Math.max(0, Math.min(1, v));
		onChange({ percent: next, amountSol: Number(availableSol) * next });
	}
</script>

<div class="rounded-2xl border border-white/10 bg-black/20 p-4">
	<div class="flex items-center justify-between gap-3">
		<div class="text-xs text-white/60">Quick claim</div>
		<div class="font-mono text-xs text-white/80" data-sensitive>
			{amountSol.toFixed(4)} SOL
		</div>
	</div>

	<input
		class="mt-3 w-full accent-emerald-400"
		type="range"
		min="0"
		max="100"
		step="1"
		value={Math.round(pct * 100)}
		oninput={(e) => setPct(Number(e.currentTarget.value) / 100)}
	/>

	<div class="mt-3 flex flex-wrap gap-2">
		{#each presets as p}
			<button
				type="button"
				class="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
				onclick={() => setPct(p)}
			>
				{Math.round(p * 100)}%
			</button>
		{/each}
	</div>
</div>












