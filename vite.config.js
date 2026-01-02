import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		nodePolyfills({
			// Only polyfill what we need for browser hydration (Solana/Streamflow deps).
			// Avoid polyfilling Node crypto into SSR (can cause `crypto-browserify` / CJS `exports` issues).
			globals: { Buffer: true },
			include: ['buffer']
		})
	]
});
