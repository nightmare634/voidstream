<script>
	import { parseStreamText } from '$lib/nlp/parseStreamText';

	let {
		placeholder = 'e.g. Pay 10 SOL over 3 months starting Friday (receiver can claim from any wallet)',
		onApply = () => {}
	} = $props();

	let text = $state('');
	let parsed = $derived.by(() => parseStreamText(text));

	function formatDuration(seconds) {
		const s = Number(seconds || 0);
		if (!Number.isFinite(s) || s <= 0) return '—';
		if (s < 60) return `${Math.round(s)} sec`;
		if (s < 60 * 60) return `${Math.round(s / 60)} min`;
		if (s < 24 * 60 * 60) return `${Math.round(s / 3600)} hr`;
		if (s < 7 * 24 * 60 * 60) return `${Math.round(s / 86400)} days`;
		if (s < 30 * 24 * 60 * 60) return `${Math.round(s / (7 * 86400))} weeks`;
		if (s < 365 * 24 * 60 * 60) return `${Math.round(s / (30 * 86400))} months`;
		return `${Math.round(s / (365 * 86400))} years`;
	}
</script>

<div class="rounded-2xl border border-white/10 bg-black/20 p-4">
	<div class="flex items-center justify-between gap-3">
		<div>
			<div class="text-xs font-semibold text-white/60">Smart Bar</div>
			<div class="mt-1 text-sm font-semibold text-white/85">Natural language stream input</div>
		</div>
		<button
			type="button"
			class="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-black hover:bg-white/90 disabled:opacity-60"
			disabled={!parsed?.ok}
			onclick={() => parsed?.ok && onApply(parsed)}
		>
			Apply
		</button>
	</div>

	<input
		class="mt-3 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
		bind:value={text}
		placeholder={placeholder}
	/>

	{#if text.trim().length > 0}
		{#if parsed.ok}
			<div class="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-100">
				<div>
					Receiver:{' '}
					{#if parsed.receiverWallet}
						<span class="font-mono">{parsed.receiverWallet}</span>
					{:else}
						<span class="text-white/80">Unclaimed (any wallet can claim)</span>
					{/if}
				</div>
				<div class="mt-1">
					Amount: <span class="font-mono">{parsed.amountSol}</span> SOL · Duration:{' '}
					<span class="font-mono">{formatDuration(parsed.durationSeconds)}</span>
				</div>
				<div class="mt-1">
					Rate: <span class="font-mono">{parsed.rateLamportsPerSec}</span> lamports/sec
				</div>
			</div>
		{:else}
			<div class="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
				{parsed.error}
			</div>
		{/if}
	{/if}
</div>






