<script>
	/**
	 * Simple in-app confirmation modal (no browser confirm()).
	 * Svelte 5: uses $props + callback props.
	 */
	let {
		open = false,
		title = 'Confirm',
		description = '',
		confirmLabel = 'Confirm',
		cancelLabel = 'Cancel',
		danger = false,
		busy = false,
		onConfirm = () => {},
		// `onClose` is the canonical name; `onCancel` is supported for backwards-compat.
		onClose,
		onCancel
	} = $props();

	const close = () => {
		if (busy) return;
		(onClose ?? onCancel)?.();
	};
</script>

{#if open}
	<div class="fixed inset-0 z-50 flex items-center justify-center px-4">
		<button
			type="button"
			class="absolute inset-0 bg-black/70 backdrop-blur-sm"
			onclick={close}
			aria-label="Close dialog"
		></button>

		<div class="relative w-full max-w-lg rounded-2xl border border-white/8 bg-[#050507] p-7 shadow-2xl md:p-8">
			<div class="flex items-start justify-between gap-4">
				<div>
					<div class="text-sm font-semibold">{title}</div>
					{#if description}
						<p class="mt-1 text-sm text-white/70">{description}</p>
					{/if}
				</div>
				<button
					type="button"
					class="rounded-xl border border-white/8 bg-white/4 px-3 py-2 text-sm text-white/85 hover:bg-white/8 disabled:opacity-60"
					onclick={close}
					disabled={busy}
				>
					Close
				</button>
			</div>

			<div class="mt-6 flex items-center justify-end gap-3">
				<button
					type="button"
					class="rounded-xl border border-white/8 bg-white/4 px-4 py-2 text-sm text-white/85 hover:bg-white/8 disabled:opacity-60"
					onclick={close}
					disabled={busy}
				>
					{cancelLabel}
				</button>

				<button
					type="button"
					class={`rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60 ${
						danger
							? 'bg-red-500/90 text-white hover:bg-red-500'
							: 'bg-white text-black hover:bg-white/90'
					}`}
					onclick={() => onConfirm?.()}
					disabled={busy}
				>
					{confirmLabel}
				</button>
			</div>
		</div>
	</div>
{/if}






