<script>
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import CommandPalette from '$lib/components/CommandPalette.svelte';
	import SiteFooter from '$lib/components/SiteFooter.svelte';
	import { env } from '$env/dynamic/public';
	import { page } from '$app/stores';

	let { children } = $props();

	const cluster = $derived.by(() => String(env.PUBLIC_SOLANA_CLUSTER || 'mainnet-beta'));
	const isMainnet = $derived.by(() => cluster.toLowerCase() === 'mainnet-beta' || cluster.toLowerCase() === 'mainnet');
	const showMainnetBadge = $derived.by(() => isMainnet && $page.url?.pathname === '/');
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />

	<title>Voidstream — Wallet-native payouts with audit-proof history</title>
	<meta
		name="description"
		content="Voidstream is a wallet-native payouts platform for streaming payments, approvals, and audit-proof history. Create a stream, monitor accrual, and keep a transparent record of every action."
	/>

	<meta property="og:title" content="Voidstream" />
	<meta property="og:description" content="Wallet-native payouts with audit-proof history." />
	<meta property="og:type" content="website" />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="Voidstream" />
	<meta name="twitter:description" content="Wallet-native payouts with audit-proof history." />
</svelte:head>
<CommandPalette />

{#if showMainnetBadge}
	<div class="fixed bottom-4 right-4 z-50">
		<div class="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-xs text-amber-100 shadow-2xl">
			<div class="text-[11px] uppercase tracking-wide text-amber-200/80">Network</div>
			<div class="mt-1 text-sm font-semibold">Mainnet-beta</div>
			<div class="mt-1 text-[11px] text-amber-100/70">Real funds. Double-check before confirming.</div>
		</div>
	</div>
{/if}

{@render children()}

<SiteFooter />
