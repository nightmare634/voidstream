import { getPb } from './client';

export async function listStreams() {
	const pb = getPb();
	// PocketBase instances can reject `sort` in query params (older versions / configs).
	// Fetch without sort and order locally by built-in `created` (newest first).
	const res = await pb.collection('streams').getList(1, 200);
	return (res.items || []).sort((a, b) => String(b.created || '').localeCompare(String(a.created || '')));
}

export async function createStream(data) {
	const pb = getPb();
	return await pb.collection('streams').create(data);
}

export async function getStream(id) {
	const pb = getPb();
	return await pb.collection('streams').getOne(id);
}


