<script>
	import SmartBar from '$lib/components/SmartBar.svelte';

	let last = $state(null);
</script>

<div class="min-h-screen bg-[#0d1117] text-white">
	<div class="mx-auto max-w-3xl px-6 py-10">
		<h1 class="text-2xl font-semibold tracking-tight">NLP Playground</h1>
		<p class="mt-2 text-sm text-white/70">Test Smart Bar parsing locally.</p>

		<div class="mt-6">
			<SmartBar onApply={(p) => (last = p)} />
		</div>

		{#if last}
			<pre class="mt-6 overflow-auto rounded-2xl border border-white/10 bg-black/30 p-4 text-xs text-white/80">
{JSON.stringify(last, null, 2)}
			</pre>
		{/if}
	</div>
</div>












