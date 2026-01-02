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
					<span class="inline-flex items-center gap-2 text-white/50 cursor-default select-none">
						Pumpfun
						<span class="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-400/80">Soon</span>
					</span>
				</nav>

				<a href="/auth" class="vs-btn-accent !py-2.5">
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
						Streaming payments and approvals with built-in transparency.
					</h1>

					<p class="mt-5 text-pretty text-base leading-relaxed text-white/70 md:text-lg">
						Voidstream provides scheduled payments, real-time visibility, and a reliable audit trail. So teams can track accruals and maintain accountability at every step.
					</p>

					<div class="mt-10">
						<a href="/auth" class="vs-btn-accent">
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
						<div class="vs-feature-card">
							<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
								<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
									<path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
								</svg>
							</div>
							<div class="mt-4 text-base font-semibold">Streaming payouts</div>
							<p class="mt-2 text-sm leading-relaxed text-white/70">
								Create payout streams with clear timelines and predictable accrual.
							</p>
						</div>
						<div class="vs-feature-card">
							<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
								<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
									<path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
								</svg>
							</div>
							<div class="mt-4 text-base font-semibold">Real-time updates</div>
							<p class="mt-2 text-sm leading-relaxed text-white/70">
								Track balances and stream status live so you can act with confidence.
							</p>
						</div>
						<div class="vs-feature-card">
							<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
								<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
									<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
								</svg>
							</div>
							<div class="mt-4 text-base font-semibold">Audit logs</div>
							<p class="mt-2 text-sm leading-relaxed text-white/70">
								Record key events and link to chain explorers for fast verification.
							</p>
						</div>
						<div class="vs-feature-card">
							<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
								<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
									<path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
								</svg>
							</div>
							<div class="mt-4 text-base font-semibold">Multi-signature approvals</div>
							<p class="mt-2 text-sm leading-relaxed text-white/70">
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
							<a href="/auth" class="vs-btn-accent">
								Get started
							</a>
						</div>
					</div>
				</div>
			</section>
		</main>
	</div>
</div>
