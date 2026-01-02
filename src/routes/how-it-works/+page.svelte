<script>
	import { reveal } from '$lib/ui/reveal';
</script>

<svelte:head>
	<title>How it works — Voidstream</title>
</svelte:head>

<div class="vs-page">
	<header class="vs-header">
		<div class="vs-container vs-header-inner">
			<a href="/" class="inline-flex items-center gap-3">
				<img
					src="/voidstream-logo.jpg"
					alt="Voidstream"
					class="h-9 w-9 rounded-xl border border-white/10 bg-white/5 object-cover"
					loading="eager"
				/>
				<span class="text-sm font-semibold tracking-tight">Voidstream</span>
			</a>
			<nav class="hidden items-center gap-5 text-sm text-white/60 md:flex">
				<a class="hover:text-white" href="/dashboard">Dashboard</a>
				<a class="hover:text-white" href="/audit">Audit</a>
				<a class="hover:text-white" href="/about">About</a>
				<a class="hover:text-white" href="/privacy">Privacy</a>
				<span class="inline-flex items-center gap-2 text-white/45 cursor-not-allowed select-none">
					Pumpfun
					<span class="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] text-white/50">Coming soon</span>
				</span>
			</nav>
			<a
				href="/auth"
				class="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90"
			>
				Get started
			</a>
		</div>
	</header>

	<main class="vs-main">
		<section class="vs-section mt-0" use:reveal>
			<div class="max-w-3xl">
				<h1 class="text-3xl font-semibold tracking-tight md:text-4xl">How Voidstream works</h1>
				<p class="mt-4 text-sm leading-relaxed text-white/70 md:text-base">
					Voidstream is built to make payouts predictable, actions accountable, and records easy to review. Here’s the simple flow from
					creation to completion.
				</p>
			</div>
		</section>

		<section class="vs-section" use:reveal>
			<div class="grid gap-4 md:grid-cols-2">
				<div class="vs-card vs-card-pad">
					<div class="text-xs font-semibold text-white/60">Step 1</div>
					<div class="mt-2 text-sm font-semibold">Create a stream</div>
					<p class="mt-2 text-sm leading-relaxed text-white/70">
						Define the receiver, rate, and schedule. The stream is created on-chain and becomes live immediately.
					</p>
				</div>
				<div class="vs-card vs-card-pad">
					<div class="text-xs font-semibold text-white/60">Step 2</div>
					<div class="mt-2 text-sm font-semibold">Track progress</div>
					<p class="mt-2 text-sm leading-relaxed text-white/70">
						Monitor accrual, status, and balances from the dashboard. Status badges make it clear what state each stream is in.
					</p>
				</div>
				<div class="vs-card vs-card-pad">
					<div class="text-xs font-semibold text-white/60">Step 3</div>
					<div class="mt-2 text-sm font-semibold">Control sensitive actions</div>
					<p class="mt-2 text-sm leading-relaxed text-white/70">
						Pause, resume, cancel, and sweep when needed. Every important event can be recorded for later review.
					</p>
				</div>
				<div class="vs-card vs-card-pad">
					<div class="text-xs font-semibold text-white/60">Step 4</div>
					<div class="mt-2 text-sm font-semibold">Audit + invoices</div>
					<p class="mt-2 text-sm leading-relaxed text-white/70">
						Use the Audit page for activity history and generate invoices on-demand for accounting and reporting.
					</p>
				</div>
			</div>
		</section>

		<section class="vs-section" use:reveal>
			<div class="vs-card vs-card-pad">
				<div class="text-sm font-semibold">What you should always verify</div>
				<ul class="mt-3 space-y-2 text-sm text-white/70">
					<li>- Receiver address and stream schedule</li>
					<li>- Network (mainnet funds are real)</li>
					<li>- Transaction details in your wallet before confirming</li>
				</ul>
			</div>
		</section>
	</main>
</div>


