import { pb } from '$lib/auth/pb';

// Single PB client for the entire app (auth + data reads).
export function getPb() {
	return pb;
}


