<script>
	// External links shown once real URLs are provided.
	const showExternal = true;
	const links = {
		twitter: 'https://x.com/voidstream23628?s=21&t=HTCztxO_SmWO88vNE_m8Nw',
		github: 'https://github.com/nightmare634/voidstream',
		pumpfun: ''
	};
</script>

<footer class="border-t border-white/8 bg-[#0d1117]">
	<div class="vs-container py-12 md:py-14">
		<div class="grid gap-10 md:grid-cols-4">
			<div class="md:col-span-2">
				<div class="flex items-center gap-3">
					<img
						src="/voidstream-logo.jpg"
						alt="Voidstream"
						class="h-10 w-10 rounded-xl border border-white/8 bg-white/4 object-cover"
						loading="lazy"
					/>
					<div>
						<div class="text-sm font-semibold tracking-tight">Voidstream</div>
						<div class="mt-1 text-xs text-white/60">Wallet-native payouts with audit-proof history.</div>
					</div>
				</div>

				<p class="mt-4 max-w-md text-sm leading-relaxed text-white/70">
					Voidstream helps teams run streaming payments with clear timelines, safer operations, and a verifiable record of activity.
				</p>
			</div>

			<div>
				<div class="text-xs font-semibold uppercase tracking-wide text-white/60">Product</div>
				<ul class="mt-4 space-y-2 text-sm">
					<li><a class="text-white/75 hover:text-white" href="/how-it-works">How it works</a></li>
					<li><a class="text-white/75 hover:text-white" href="/about">About</a></li>
					{#if showExternal && links.pumpfun}
						<li>
							<a class="text-white/75 hover:text-white" href={links.pumpfun} target="_blank" rel="noreferrer">Pumpfun</a>
						</li>
					{/if}
				</ul>
			</div>

			<div>
				<div class="text-xs font-semibold uppercase tracking-wide text-white/60">Legal</div>
				<ul class="mt-4 space-y-2 text-sm">
					<li><a class="text-white/75 hover:text-white" href="/privacy">Privacy Policy</a></li>
				</ul>

				{#if showExternal && (links.twitter || links.github)}
					<div class="mt-8 text-xs font-semibold uppercase tracking-wide text-white/60">Links</div>
					<ul class="mt-4 space-y-2 text-sm">
						{#if links.twitter}
							<li><a class="text-white/75 hover:text-white" href={links.twitter} target="_blank" rel="noreferrer">Twitter (X)</a></li>
						{/if}
						{#if links.github}
							<li><a class="text-white/75 hover:text-white" href={links.github} target="_blank" rel="noreferrer">GitHub</a></li>
						{/if}
					</ul>
				{/if}
			</div>
		</div>

		<div class="mt-12 flex flex-col gap-3 border-t border-white/8 pt-8 text-xs text-white/55 md:flex-row md:items-center md:justify-between">
			<div>© {new Date().getFullYear()} Voidstream. All rights reserved.</div>
			<div class="text-white/45">Built on Solana. Always verify transactions before confirming.</div>
		</div>
	</div>
</footer>


