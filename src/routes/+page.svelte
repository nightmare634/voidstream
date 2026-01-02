<svelte:head>
	<title>Voidstream — Wallet-native payouts with audit-proof history</title>
	<meta
		name="description"
		content="Voidstream is a wallet-native payouts platform for streaming payments, approvals, and audit-proof history. Create a stream, monitor accrual, and keep a transparent record of every action."
	/>
</svelte:head>

<script>
	import { reveal } from '$lib/ui/reveal';
</script>

<a
	href="#main"
	class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 rounded-lg border border-white/15 bg-black/80 px-3 py-2 text-sm text-white shadow-lg ring-1 ring-white/10"
>
	Skip to content
</a>

<div class="vs-page">
	<div class="relative isolate overflow-hidden">
		<div class="pointer-events-none absolute inset-0 opacity-70">
			<div
				class="absolute inset-0 bg-[radial-gradient(900px_circle_at_20%_10%,rgba(56,189,248,0.18),transparent_55%),radial-gradient(800px_circle_at_80%_30%,rgba(34,197,94,0.14),transparent_55%),radial-gradient(900px_circle_at_50%_110%,rgba(168,85,247,0.12),transparent_60%)]"
			></div>
			<div class="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(5,5,7,0.65),rgba(5,5,7,0.95),rgba(0,0,0,1))]"></div>
		</div>

		<header class="relative z-10">
			<div class="vs-container flex items-center justify-between py-6">
				<a href="/" class="group inline-flex items-center gap-2">
					<img
						src="/voidstream-logo.jpg"
						alt="Voidstream"
						class="h-9 w-9 rounded-xl border border-white/10 bg-white/5 object-cover shadow-sm"
						loading="eager"
					/>
					<span class="text-base font-semibold tracking-tight">Voidstream</span>
				</a>

				<nav class="hidden items-center gap-8 text-sm text-white/70 md:flex">
					<a class="hover:text-white" href="#features">Features</a>
					<a class="hover:text-white" href="#how-it-works">How it works</a>
					<a class="hover:text-white" href="#faq">FAQ</a>
				</nav>

				<a
					href="/auth"
					class="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white/40"
				>
					Get started
				</a>
			</div>
		</header>

		<main id="main" class="relative z-10">
			<section class="vs-container pb-20 pt-16 md:pb-28 md:pt-24" use:reveal>
				<div class="max-w-3xl">
					<p class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
						<span class="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true"></span>
						Wallet-native payouts with audit-proof history
					</p>

					<h1 class="mt-5 text-balance text-4xl font-semibold tracking-tight md:text-6xl">
						Streaming payments, approvals, and transparency — built for modern teams.
					</h1>

					<p class="mt-5 text-pretty text-base leading-relaxed text-white/70 md:text-lg">
						Voidstream helps you send money with predictable schedules, real-time visibility, and a durable audit trail. Create a stream,
						monitor accrual, and keep every sensitive action accountable.
					</p>

					<div class="mt-10">
						<a
							href="/auth"
							class="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-black hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white/40"
						>
							Get started
						</a>
					</div>
				</div>
			</section>

			<section id="features" class="relative z-10 border-t border-white/10" use:reveal>
				<div class="vs-container py-20 md:py-28">
					<div class="max-w-2xl">
						<h2 class="text-2xl font-semibold tracking-tight md:text-3xl">Built for clarity and control</h2>
						<p class="mt-4 text-base leading-relaxed text-white/70">
							Predictable payouts, safer operations, and a clean audit trail.
						</p>
					</div>

					<div class="mt-12 grid gap-6 md:grid-cols-2">
						<div class="rounded-2xl border border-white/10 bg-white/5 p-7">
							<div class="text-base font-semibold">Streaming payouts</div>
							<p class="mt-3 text-sm leading-relaxed text-white/70">
								Create payout streams with clear timelines and predictable accrual.
							</p>
						</div>
						<div class="rounded-2xl border border-white/10 bg-white/5 p-7">
							<div class="text-base font-semibold">Real-time updates</div>
							<p class="mt-3 text-sm leading-relaxed text-white/70">
								Track balances and stream status live so you can act with confidence.
							</p>
						</div>
						<div class="rounded-2xl border border-white/10 bg-white/5 p-7">
							<div class="text-base font-semibold">Audit logs</div>
							<p class="mt-3 text-sm leading-relaxed text-white/70">
								Record key events and link to chain explorers for fast verification.
							</p>
						</div>
						<div class="rounded-2xl border border-white/10 bg-white/5 p-7">
							<div class="text-base font-semibold">Multi-signature approvals</div>
							<p class="mt-3 text-sm leading-relaxed text-white/70">
								Gate sensitive changes behind consensus so no one acts alone.
							</p>
						</div>
					</div>
				</div>
			</section>

			<section id="how-it-works" class="border-t border-white/10" use:reveal>
				<div class="vs-container py-20 md:py-28">
					<div class="max-w-2xl">
						<h2 class="text-2xl font-semibold tracking-tight md:text-3xl">How it works</h2>
						<p class="mt-4 text-base leading-relaxed text-white/70">
							Three steps from setup to verifiable proof.
						</p>
					</div>

					<ol class="mt-12 grid gap-6 md:grid-cols-3">
						<li class="rounded-2xl border border-white/10 bg-white/5 p-7">
							<div class="text-xs font-semibold text-white/50">01</div>
							<div class="mt-3 text-base font-semibold">Define the stream</div>
							<p class="mt-3 text-sm leading-relaxed text-white/70">
								Set amount, schedule, and recipients with clear terms for both parties.
							</p>
						</li>
						<li class="rounded-2xl border border-white/10 bg-white/5 p-7">
							<div class="text-xs font-semibold text-white/50">02</div>
							<div class="mt-3 text-base font-semibold">Monitor in real-time</div>
							<p class="mt-3 text-sm leading-relaxed text-white/70">
								Track progress, manage withdrawals, and handle changes with built-in approvals.
							</p>
						</li>
						<li class="rounded-2xl border border-white/10 bg-white/5 p-7">
							<div class="text-xs font-semibold text-white/50">03</div>
							<div class="mt-3 text-base font-semibold">Keep verifiable records</div>
							<p class="mt-3 text-sm leading-relaxed text-white/70">
								Every action is logged with chain links for audit-ready documentation.
							</p>
						</li>
					</ol>
				</div>
			</section>

			<section id="faq" class="border-t border-white/10" use:reveal>
				<div class="vs-container py-20 md:py-28">
					<div class="max-w-2xl">
						<h2 class="text-2xl font-semibold tracking-tight md:text-3xl">FAQ</h2>
						<p class="mt-4 text-base leading-relaxed text-white/70">
							Common questions about Voidstream.
						</p>
					</div>

					<div class="mt-12 grid gap-6 md:grid-cols-3">
						<details class="group rounded-2xl border border-white/10 bg-white/5 p-7" open>
							<summary class="cursor-pointer list-none text-base font-semibold outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50">
								What is Voidstream?
							</summary>
							<p class="mt-4 text-sm leading-relaxed text-white/70">
								A wallet-native payouts platform for streaming payments, multi-signature approvals, and audit-proof history.
							</p>
						</details>
						<details class="group rounded-2xl border border-white/10 bg-white/5 p-7">
							<summary class="cursor-pointer list-none text-base font-semibold outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50">
								Who is it for?
							</summary>
							<p class="mt-4 text-sm leading-relaxed text-white/70">
								Teams and builders who need recurring payouts with clear records and operational safeguards.
							</p>
						</details>
						<details class="group rounded-2xl border border-white/10 bg-white/5 p-7">
							<summary class="cursor-pointer list-none text-base font-semibold outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50">
								Which network?
							</summary>
							<p class="mt-4 text-sm leading-relaxed text-white/70">
								Built on Solana with native wallet integration and on-chain transaction verification.
							</p>
						</details>
					</div>
				</div>
			</section>

			<section id="get-started" class="border-t border-white/10">
				<div class="vs-container py-20 md:py-28">
					<div class="max-w-xl">
						<h2 class="text-2xl font-semibold tracking-tight md:text-3xl">Ready to start?</h2>
						<p class="mt-4 text-base leading-relaxed text-white/70">
							Connect your wallet and create your first stream in minutes.
						</p>
						<div class="mt-8">
							<a
								href="/auth"
								class="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-black hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white/40"
							>
								Get started
							</a>
						</div>
					</div>
				</div>
			</section>
		</main>
	</div>
</div>
