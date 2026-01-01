<script>
	let {
		values = /** @type {number[]} */ ([]),
		width = 120,
		height = 32,
		stroke = 'rgba(255,255,255,0.85)',
		strokeWidth = 2
	} = $props();

	function toPoints(vals) {
		const v = (vals || []).map((n) => Number(n) || 0);
		if (v.length === 0) return '';
		const min = Math.min(...v);
		const max = Math.max(...v);
		const span = max - min || 1;
		return v
			.map((n, i) => {
				const x = v.length === 1 ? 0 : (i / (v.length - 1)) * (width - 2) + 1;
				const y = height - 1 - ((n - min) / span) * (height - 2);
				return `${x.toFixed(2)},${y.toFixed(2)}`;
			})
			.join(' ');
	}

	let pts = $derived.by(() => toPoints(values));
</script>

<svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
	<polyline fill="none" stroke={stroke} stroke-width={strokeWidth} stroke-linecap="round" stroke-linejoin="round" points={pts}></polyline>
</svg>






