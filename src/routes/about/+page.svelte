<script>
	import { reveal } from '$lib/ui/reveal';
</script>

<svelte:head>
	<title>About — Voidstream</title>
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
				<a class="hover:text-white" href="/how-it-works">How it works</a>
				<a class="hover:text-white" href="/privacy">Privacy</a>
				<a class="hover:text-white" href="/dashboard">Dashboard</a>
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
				<h1 class="text-3xl font-semibold tracking-tight md:text-4xl">About Voidstream</h1>
				<p class="mt-4 text-sm leading-relaxed text-white/70 md:text-base">
					Voidstream exists to make payouts easier to understand and harder to misuse. We focus on clear schedules, verifiable outcomes, and
					operational guardrails that help teams move fast without losing trust.
				</p>
			</div>
		</section>

		<section class="vs-section" use:reveal>
			<div class="grid gap-4 md:grid-cols-3">
				<div class="vs-card vs-card-pad">
					<div class="text-sm font-semibold">Clarity</div>
					<p class="mt-2 text-sm leading-relaxed text-white/70">
						Streams make time and money explicit. You always know what’s accrued, what’s available, and what happens next.
					</p>
				</div>
				<div class="vs-card vs-card-pad">
					<div class="text-sm font-semibold">Control</div>
					<p class="mt-2 text-sm leading-relaxed text-white/70">
						Sensitive operations can be gated, reviewed, and recorded. Guardrails reduce mistakes and limit single-actor risk.
					</p>
				</div>
				<div class="vs-card vs-card-pad">
					<div class="text-sm font-semibold">Proof</div>
					<p class="mt-2 text-sm leading-relaxed text-white/70">
						Audit trails with proof links make verification fast. Reviews become straightforward and repeatable.
					</p>
				</div>
			</div>
		</section>

		<section class="vs-section" use:reveal>
			<div class="vs-card vs-card-pad">
				<div class="text-sm font-semibold">What Voidstream is not</div>
				<p class="mt-2 text-sm leading-relaxed text-white/70">
					Voidstream is not a custodial wallet or an exchange. You remain in control of your wallet and you confirm transactions directly in
					your wallet.
				</p>
			</div>
		</section>
	</main>
</div>


