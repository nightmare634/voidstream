<script>
	import { reveal } from '$lib/ui/reveal';
</script>

<svelte:head>
	<title>Privacy Policy — Voidstream</title>
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
				<a class="hover:text-white" href="/about">About</a>
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
				<h1 class="text-3xl font-semibold tracking-tight md:text-4xl">Privacy Policy</h1>
				<p class="mt-4 text-sm leading-relaxed text-white/70 md:text-base">
					This policy explains what we collect, why we collect it, and how you can control it. If you need a stricter policy for a production
					launch, tell me your jurisdiction and business model and I’ll tailor it.
				</p>
				<p class="mt-3 text-xs text-white/50">Last updated: {new Date().toISOString().slice(0, 10)}</p>
			</div>
		</section>

		<section class="vs-section" use:reveal>
			<div class="prose prose-invert max-w-3xl">
				<h2>Information we collect</h2>
				<ul>
					<li><strong>Wallet address</strong> (public key) when you connect a wallet.</li>
					<li><strong>Stream metadata</strong> you create in the app (receiver, schedule, amounts, status).</li>
					<li><strong>Audit events</strong> such as create/cancel/claim actions and related transaction signatures.</li>
					<li><strong>Technical logs</strong> (basic request metadata) needed for reliability and abuse prevention.</li>
				</ul>

				<h2>How we use information</h2>
				<ul>
					<li>To power core product functionality (creating and managing streams).</li>
					<li>To show history and verification links (audit trail).</li>
					<li>To detect abuse and keep the service reliable.</li>
				</ul>

				<h2>What we do not do</h2>
				<ul>
					<li>We do not sell your personal data.</li>
					<li>We do not store your wallet private keys or seed phrases.</li>
					<li>We do not initiate transactions without your wallet confirmation.</li>
				</ul>

				<h2>Data retention</h2>
				<p>
					We retain operational records (streams and audit events) as long as needed to provide the service and support compliance/review
					workflows. You can request removal of off-chain records; on-chain data remains public by design.
				</p>

				<h2>Contact</h2>
				<p>
					For privacy questions, contact the team via the links provided on the landing page once published.
				</p>
			</div>
		</section>
	</main>
</div>


