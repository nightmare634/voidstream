/**
 * Svelte action: reveal on scroll.
 * Adds `vs-reveal` + toggles `is-visible` when the element enters viewport.
 */
export function reveal(node, opts = {}) {
	const threshold = typeof opts.threshold === 'number' ? opts.threshold : 0.12;
	const rootMargin = typeof opts.rootMargin === 'string' ? opts.rootMargin : '0px 0px -10% 0px';

	node.classList.add('vs-reveal');

	// If reduced motion, show immediately.
	try {
		if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) {
			node.classList.add('is-visible');
			return { destroy() {} };
		}
	} catch {
		// ignore
	}

	const io = new IntersectionObserver(
		(entries) => {
			const entry = entries?.[0];
			if (entry?.isIntersecting) {
				node.classList.add('is-visible');
				io.disconnect();
			}
		},
		{ threshold, rootMargin }
	);
	io.observe(node);

	return {
		destroy() {
			try {
				io.disconnect();
			} catch {
				// ignore
			}
		}
	};
}


