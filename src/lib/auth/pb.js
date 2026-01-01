import PocketBase from 'pocketbase';
import { env } from '$env/dynamic/public';
import { browser } from '$app/environment';

let _pb = null;

export const pb = (() => {
	if (_pb) return _pb;
	const url = env.PUBLIC_PB_URL;

	// IMPORTANT: do not throw during SSR if the env isn't set yet.
	// A throw here can crash all server-rendered routes (e.g. `/`) if any module imports `pb`.
	// Use a harmless placeholder; pages that actually need PB will still error gracefully at request time.
	const inst = new PocketBase(url || 'http://127.0.0.1:8090');
	inst.autoCancellation(false);

	// Keep this silent in the UI; missing config will be surfaced by pages that actually need it.
	_pb = inst;
	return _pb;
})();






