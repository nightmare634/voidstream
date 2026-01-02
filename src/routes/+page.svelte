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

				<nav class="hidden items-center gap-7 text-sm text-white/70 md:flex">
					<a class="hover:text-white" href="#features">Features</a>
					<a class="hover:text-white" href="#how-it-works">How it works</a>
					<a class="hover:text-white" href="#security">Security</a>
					<a class="hover:text-white" href="#faq">FAQ</a>
					<span class="inline-flex items-center gap-2 text-white/45 cursor-not-allowed select-none">
						Pumpfun
						<span class="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] text-white/50">Coming soon</span>
					</span>
				</nav>

				<div class="flex items-center gap-3">
					<a
						href="#how-it-works"
						class="hidden rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-sky-400/50 md:inline-flex"
					>
						See how it works
					</a>
					<a
						href="/auth"
						class="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white/40"
					>
						Get started
					</a>
				</div>
			</div>
		</header>

		<main id="main" class="relative z-10">
			<section class="vs-container pb-14 pt-14 md:pb-24 md:pt-20" use:reveal>
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

					<div class="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
						<a
							href="/auth"
							class="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white/40"
						>
							Get started
						</a>
						<a
							href="#features"
							class="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white/85 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-sky-400/50"
						>
							Explore features
						</a>
					</div>
				</div>

				<div class="mt-14 grid gap-4 md:mt-18 md:grid-cols-3">
					<div class="rounded-2xl border border-white/10 bg-white/5 p-6" use:reveal>
						<div class="text-sm font-semibold">Real-time visibility</div>
						<div class="mt-2 text-sm leading-relaxed text-white/70">
							Track balances and stream status live so you can act with confidence.
						</div>
					</div>
					<div class="rounded-2xl border border-white/10 bg-white/5 p-6" use:reveal>
						<div class="text-sm font-semibold">Approval-ready changes</div>
						<div class="mt-2 text-sm leading-relaxed text-white/70">
							Design sensitive operations to require multiple approvals before execution.
						</div>
					</div>
					<div class="rounded-2xl border border-white/10 bg-white/5 p-6" use:reveal>
						<div class="text-sm font-semibold">Audit-proof history</div>
						<div class="mt-2 text-sm leading-relaxed text-white/70">
							Every action can be logged and linked to proof, making reviews fast and trustworthy.
						</div>
					</div>
				</div>
			</section>

			<section id="features" class="relative z-10 border-t border-white/10" use:reveal>
				<div class="vs-container py-14 md:py-20">
					<div class="max-w-2xl">
						<h2 class="text-2xl font-semibold tracking-tight md:text-3xl">Features designed for clarity and control</h2>
						<p class="mt-3 text-sm leading-relaxed text-white/70 md:text-base">
							Everything you need to create predictable payouts, reduce risk on sensitive changes, and keep a clean operational record.
						</p>
					</div>

					<div class="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						<div class="rounded-2xl border border-white/10 bg-white/5 p-6">
							<div class="text-sm font-semibold">Streaming payouts</div>
							<p class="mt-2 text-sm leading-relaxed text-white/70">
								Create payout streams with clear timelines and predictable accrual.
							</p>
						</div>
						<div class="rounded-2xl border border-white/10 bg-white/5 p-6">
							<div class="text-sm font-semibold">Withdraw with confidence</div>
							<p class="mt-2 text-sm leading-relaxed text-white/70">
							Claim and withdraw amounts derived from available funds with clear UX.
							</p>
						</div>
						<div class="rounded-2xl border border-white/10 bg-white/5 p-6">
							<div class="text-sm font-semibold">Real-time balance updates</div>
							<p class="mt-2 text-sm leading-relaxed text-white/70">
							Designed to stream wallet balance changes so the UI stays current.
							</p>
						</div>
						<div class="rounded-2xl border border-white/10 bg-white/5 p-6">
							<div class="text-sm font-semibold">Audit logs with proof links</div>
							<p class="mt-2 text-sm leading-relaxed text-white/70">
							Record key events and link to chain explorers for fast verification.
							</p>
						</div>
						<div class="rounded-2xl border border-white/10 bg-white/5 p-6">
							<div class="text-sm font-semibold">Consensus-ready approvals</div>
							<p class="mt-2 text-sm leading-relaxed text-white/70">
							Gate sensitive changes behind a fixed quorum so no one acts alone.
							</p>
						</div>
						<div class="rounded-2xl border border-white/10 bg-white/5 p-6">
							<div class="text-sm font-semibold">Invoices on-demand</div>
							<p class="mt-2 text-sm leading-relaxed text-white/70">
							Generate branded PDFs for accounting and reporting when you need them.
							</p>
						</div>
					</div>
				</div>
			</section>

			<section id="how-it-works" class="border-t border-white/10" use:reveal>
				<div class="vs-container py-14 md:py-20">
					<div class="max-w-2xl">
						<h2 class="text-2xl font-semibold tracking-tight md:text-3xl">How it works</h2>
						<p class="mt-3 text-sm leading-relaxed text-white/70 md:text-base">
							A simple flow, from setting intent to keeping proof you can trust.
						</p>
					</div>

					<ol class="mt-10 grid gap-4 md:grid-cols-2">
						<li class="rounded-2xl border border-white/10 bg-white/5 p-6">
							<div class="text-xs font-semibold text-white/60">Step 1</div>
							<div class="mt-2 text-sm font-semibold">Define the payout</div>
							<p class="mt-2 text-sm leading-relaxed text-white/70">
							Set amount, cadence, and timing so both parties have clear expectations.
							</p>
						</li>
						<li class="rounded-2xl border border-white/10 bg-white/5 p-6">
							<div class="text-xs font-semibold text-white/60">Step 2</div>
							<div class="mt-2 text-sm font-semibold">Start the stream</div>
							<p class="mt-2 text-sm leading-relaxed text-white/70">
							Run the stream and track progress with a timeline that stays readable at a glance.
							</p>
						</li>
						<li class="rounded-2xl border border-white/10 bg-white/5 p-6">
							<div class="text-xs font-semibold text-white/60">Step 3</div>
							<div class="mt-2 text-sm font-semibold">Control sensitive changes</div>
							<p class="mt-2 text-sm leading-relaxed text-white/70">
							Pause, resume, cancel, or withdraw with guardrails and optional approvals.
							</p>
						</li>
						<li class="rounded-2xl border border-white/10 bg-white/5 p-6">
							<div class="text-xs font-semibold text-white/60">Step 4</div>
							<div class="mt-2 text-sm font-semibold">Keep proof and reporting</div>
							<p class="mt-2 text-sm leading-relaxed text-white/70">
							Store audit history and generate invoices so your records are always ready.
							</p>
						</li>
					</ol>
				</div>
			</section>

			<section id="security" class="border-t border-white/10" use:reveal>
				<div class="vs-container py-14 md:py-20">
					<div class="max-w-2xl">
						<h2 class="text-2xl font-semibold tracking-tight md:text-3xl">Security & transparency</h2>
						<p class="mt-3 text-sm leading-relaxed text-white/70 md:text-base">
							Voidstream is built around strong defaults: minimize ambiguity, maximize verifiability.
						</p>
					</div>

					<div class="mt-10 grid gap-4 md:grid-cols-3">
						<div class="rounded-2xl border border-white/10 bg-white/5 p-6">
							<div class="text-sm font-semibold">Wallet-first control</div>
							<p class="mt-2 text-sm leading-relaxed text-white/70">
							Operations are designed around wallet identity so control stays with the owners.
							</p>
						</div>
						<div class="rounded-2xl border border-white/10 bg-white/5 p-6">
							<div class="text-sm font-semibold">Designed for multi-approval</div>
							<p class="mt-2 text-sm leading-relaxed text-white/70">
							Sensitive actions can be gated behind consensus to reduce single-actor risk.
							</p>
						</div>
						<div class="rounded-2xl border border-white/10 bg-white/5 p-6">
							<div class="text-sm font-semibold">Proof-friendly logs</div>
							<p class="mt-2 text-sm leading-relaxed text-white/70">
							Audit logs can include explorer links so reviewers can verify outcomes quickly.
							</p>
						</div>
					</div>

					<p class="mt-6 text-xs leading-relaxed text-white/50">
						Note: Feature availability depends on environment configuration and which modules are enabled in your deployment.
					</p>
				</div>
			</section>

			<section id="faq" class="border-t border-white/10" use:reveal>
				<div class="vs-container py-14 md:py-20">
					<div class="max-w-2xl">
						<h2 class="text-2xl font-semibold tracking-tight md:text-3xl">FAQ</h2>
						<p class="mt-3 text-sm leading-relaxed text-white/70 md:text-base">
							Quick answers to common questions. If you want a specific layout or copy tone, tell me and I’ll tailor it.
						</p>
					</div>

					<div class="mt-10 grid gap-4 md:grid-cols-2">
						<details class="group rounded-2xl border border-white/10 bg-white/5 p-6">
							<summary class="cursor-pointer list-none text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50">
								What is Voidstream?
							</summary>
							<p class="mt-3 text-sm leading-relaxed text-white/70">
								A wallet-native payouts platform focused on predictable streams, safer approvals, and auditable history.
							</p>
						</details>
						<details class="group rounded-2xl border border-white/10 bg-white/5 p-6">
							<summary class="cursor-pointer list-none text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50">
								Who is it for?
							</summary>
							<p class="mt-3 text-sm leading-relaxed text-white/70">
								Teams and builders who need recurring payouts and clear operational records.
							</p>
						</details>
						<details class="group rounded-2xl border border-white/10 bg-white/5 p-6">
							<summary class="cursor-pointer list-none text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50">
								Can actions require multiple approvals?
							</summary>
							<p class="mt-3 text-sm leading-relaxed text-white/70">
								Yes — Voidstream is designed to support consensus-based approvals for sensitive changes.
							</p>
						</details>
						<details class="group rounded-2xl border border-white/10 bg-white/5 p-6">
							<summary class="cursor-pointer list-none text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50">
								Do you generate invoices?
							</summary>
							<p class="mt-3 text-sm leading-relaxed text-white/70">
								Voidstream can generate branded PDF invoices on demand for accounting workflows.
							</p>
						</details>
						<details class="group rounded-2xl border border-white/10 bg-white/5 p-6">
							<summary class="cursor-pointer list-none text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50">
								Is it open-source?
							</summary>
							<p class="mt-3 text-sm leading-relaxed text-white/70">
								If you want an open-source badge + repo link in the header/footer, tell me the URL and I’ll add it.
							</p>
						</details>
						<details class="group rounded-2xl border border-white/10 bg-white/5 p-6">
							<summary class="cursor-pointer list-none text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50">
								What chain / network does it support?
							</summary>
							<p class="mt-3 text-sm leading-relaxed text-white/70">
								The architecture is designed around Solana-style wallets and transaction proof links, with environment-based configuration.
							</p>
						</details>
					</div>
				</div>
			</section>

			<section id="get-started" class="border-t border-white/10">
				<div class="mx-auto max-w-6xl px-6 py-14 md:py-20">
					<div class="max-w-3xl">
						<div>
							<h2 class="text-2xl font-semibold tracking-tight md:text-3xl">Get started</h2>
							<p class="mt-3 text-sm leading-relaxed text-white/70 md:text-base">
								This branch is currently configured as a public marketing site. When your app routes/auth are restored, we can turn the CTA into
								a real onboarding flow.
							</p>

							<div class="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
								<a
									href="#how-it-works"
									class="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white/85 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-sky-400/50"
								>
									Review the flow
								</a>
								<a
									href="/"
									class="inline-flex items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white/40"
								>
									Start from the top
								</a>
							</div>
						</div>
					</div>
				</div>
			</section>
		</main>

		<footer class="border-t border-white/10">
			<div class="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-10 md:flex-row md:items-center md:justify-between">
				<div class="text-sm text-white/70">
					<span class="font-semibold text-white/85">Voidstream</span>
					<span class="mx-2 text-white/30">·</span>
					<span>Streaming payouts with audit-proof history</span>
				</div>
				<div class="flex items-center gap-5 text-sm text-white/60">
					<a class="hover:text-white" href="#features">Features</a>
					<a class="hover:text-white" href="#how-it-works">How it works</a>
					<a class="hover:text-white" href="#security">Security</a>
				</div>
			</div>
		</footer>
	</div>
</div>
