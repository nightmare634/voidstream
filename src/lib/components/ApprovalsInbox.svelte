<script>
	import { onMount } from 'svelte';
	import { approvalsStore, loadApprovals, approve } from '$lib/consensus/approvalsStore';
	import { walletStore } from '$lib/wallet/walletStore';

	let { contextId: contextIdProp = '', hideContextInput = false } = $props();

	let contextId = $state('');
	let approver = $state('');
	let busyId = $state('');
	let err = $state('');
	let ok = $state('');

	let connected = $state(false);
	let publicKeyBase58 = $state('');

	const unsubWallet = walletStore.subscribe((s) => {
		connected = s.connected;
		publicKeyBase58 = s.publicKeyBase58;
	});

	onMount(() => {
		// If a contextId is provided (e.g. dashboard), load automatically.
		if (contextIdProp) {
			contextId = contextIdProp;
			refresh();
		}
		return () => unsubWallet();
	});

	$effect(() => {
		if (contextIdProp && contextIdProp !== contextId) {
			contextId = contextIdProp;
			refresh();
		}
	});

	async function refresh() {
		err = '';
		ok = '';
		if (!contextId) return;
		await loadApprovals(contextId);
	}

	function approvalLink(id) {
		try {
			return `${location.origin}/approvals/${id}`;
		} catch {
			return `/approvals/${id}`;
		}
	}

	async function copyLink(id) {
		ok = '';
		err = '';
		try {
			const url = approvalLink(id);
			await navigator.clipboard.writeText(url);
			ok = 'Copied link.';
		} catch {
			ok = `Link: ${approvalLink(id)}`;
		}
	}

	async function doApprove(id) {
		busyId = id;
		err = '';
		ok = '';
		try {
			await fetch('/api/approvals/approve', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ approvalId: id, approver: publicKeyBase58 })
			});
			await refresh();
			ok = 'Approved.';
		} catch (e) {
			err = e?.message ?? 'Approve failed.';
		} finally {
			busyId = '';
		}
	}

	async function doReject(id) {
		busyId = id;
		err = '';
		ok = '';
		try {
			const res = await fetch('/api/approvals/reject', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ approvalId: id, approver: publicKeyBase58 })
			});
			const j = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(j?.message ?? 'Reject failed.');
			await refresh();
			ok = 'Rejected.';
		} catch (e) {
			err = e?.message ?? 'Reject failed.';
		} finally {
			busyId = '';
		}
	}
</script>

<div class="rounded-2xl border border-white/10 bg-white/5 p-6">
	<div class="flex items-start justify-between gap-4">
		<div>
			<div class="text-sm font-semibold">Approvals inbox</div>
			<p class="mt-1 text-sm text-white/70">
				Pending approvals requiring owner quorum.
			</p>
		</div>
		<button
			type="button"
			class="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85 hover:bg-white/10"
			onclick={refresh}
		>
			Refresh
		</button>
	</div>

	<div class="mt-4 grid gap-3 md:grid-cols-2">
		{#if !hideContextInput}
			<label class="block">
				<div class="text-xs font-semibold text-white/60">Context ID</div>
				<input
					class="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
					placeholder="paste context id"
					bind:value={contextId}
					onblur={refresh}
				/>
			</label>
		{:else}
			<div class="block">
				<div class="text-xs font-semibold text-white/60">Context</div>
				<div class="mt-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/80 font-mono">
					{contextId || '—'}
				</div>
			</div>
		{/if}
		<div class="block">
			<div class="text-xs font-semibold text-white/60">Approver</div>
			<div class="mt-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/80 font-mono">
				{connected ? publicKeyBase58 : 'Not connected'}
			</div>
		</div>
	</div>

	{#if err}
		<div class="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
			{err}
		</div>
	{/if}
	{#if ok}
		<div class="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
			{ok}
		</div>
	{/if}

	{#await Promise.resolve($approvalsStore) then s}
		{#if s.loading}
			<p class="mt-4 text-sm text-white/70">Loading approvals…</p>
		{:else if s.items.length === 0}
			<p class="mt-4 text-sm text-white/70">No pending approvals.</p>
		{:else}
			<ul class="mt-4 space-y-2">
				{#each s.items as a (a.id)}
					<li class="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
						<div class="flex items-start justify-between gap-4">
							<div>
								<div class="text-sm font-semibold">{a.action}</div>
								<div class="mt-1 text-xs text-white/60">status: {a.status}</div>
								<div class="mt-1 text-xs text-white/60 font-mono">approvers: {(a.approvers || []).length}</div>
								<div class="mt-2 flex flex-wrap items-center gap-3 text-xs">
									<a class="text-sky-300 hover:text-sky-200" href={`/approvals/${a.id}`}>Open →</a>
									<button
										type="button"
										class="text-sky-300 hover:text-sky-200"
										onclick={() => copyLink(a.id)}
									>
										Copy link
									</button>
								</div>
							</div>
							<div class="flex items-center gap-2">
								<button
									type="button"
									class="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-black hover:bg-white/90 disabled:opacity-60"
									onclick={() => doApprove(a.id)}
									disabled={!connected || busyId === a.id}
								>
									{busyId === a.id ? 'Working…' : 'Approve'}
								</button>
								<button
									type="button"
									class="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200 hover:bg-red-500/15 disabled:opacity-60"
									onclick={() => doReject(a.id)}
									disabled={!connected || busyId === a.id}
								>
									Reject
								</button>
							</div>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	{/await}
</div>


