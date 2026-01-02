<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { walletStore } from '$lib/wallet/walletStore';
	import { pb } from '$lib/auth/pb';

	let ready = $state(false);
	let connecting = $state(false);
	let connected = $state(false);
	let publicKeyBase58 = $state('');
	let error = $state('');
	let authing = $state(false);
	let authErr = $state('');

	const unsubscribe = walletStore.subscribe((s) => {
		ready = s.ready;
		connecting = s.connecting;
		connected = s.connected;
		publicKeyBase58 = s.publicKeyBase58;
		error = s.error;
	});

	onMount(() => {
		walletStore.ensureReady();
		return () => unsubscribe();
	});

	async function doConnect() {
		error = '';
		authErr = '';
		await walletStore.connect();
		if (!walletStore || !connected || !publicKeyBase58) return;

		// Wallet → backend auth
		authing = true;
		try {
			const res1 = await fetch(`/api/auth/nonce?wallet=${encodeURIComponent(publicKeyBase58)}`);
			const j1 = await res1.json().catch(() => ({}));
			if (!res1.ok) throw new Error(j1?.message ?? 'Failed to get nonce.');

			const message = j1.message;
			const enc = new TextEncoder().encode(message);
			const signed = await window.solana.signMessage(enc, 'utf8');
			const sigBytes = signed?.signature || signed;
			const sigB64 = btoa(String.fromCharCode(...sigBytes));

			const res2 = await fetch('/api/auth/verify', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					wallet: publicKeyBase58,
					nonce: j1.nonce,
					message,
					signature: sigB64
				})
			});
			const j2 = await res2.json().catch(() => ({}));
			if (!res2.ok) throw new Error(j2?.message ?? 'Verify failed.');

			pb.authStore.save(j2.token, j2.record);
			goto('/dashboard');
		} catch (e) {
			authErr = e?.message ?? 'Auth failed.';
		} finally {
			authing = false;
		}
	}
</script>

<svelte:head>
	<title>Connect Wallet — Voidstream</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="min-h-screen bg-[#0d1117] text-white">
	<div class="mx-auto max-w-3xl px-6 py-12">
		<a href="/" class="text-sm text-white/70 hover:text-white">← Back</a>

		<h1 class="mt-6 text-3xl font-semibold tracking-tight">Connect your wallet</h1>
		<p class="mt-2 text-sm leading-relaxed text-white/70">
			Choose a wallet provider and connect to continue to your dashboard.
		</p>

		<div class="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
			<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div class="text-sm text-white/80">
					<div class="font-semibold">Phantom</div>
					<div class="mt-1 text-xs text-white/60">Browser extension wallet</div>
				</div>

				<button
					type="button"
					class="inline-flex items-center justify-center rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-black hover:bg-white/90 disabled:opacity-60"
					onclick={doConnect}
					disabled={!ready || connecting || authing}
				>
					{#if connecting}
						Connecting…
					{:else if authing}
						Authorizing…
					{:else}
						Connect Phantom
					{/if}
				</button>
			</div>

			{#if error}
				<div class="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
					{error}
				</div>
			{/if}
			{#if authErr}
				<div class="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
					{authErr}
				</div>
			{/if}

			{#if publicKeyBase58}
				<div class="mt-4 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-xs text-white/70">
					Connected: <span class="font-mono text-white/85">{publicKeyBase58}</span>
				</div>
			{/if}
		</div>

		<p class="mt-6 text-xs leading-relaxed text-white/50">
			Don’t have Phantom? Install it from `https://phantom.app/` and refresh.
		</p>
	</div>
</div>


