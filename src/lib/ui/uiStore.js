import { writable } from 'svelte/store';

export const modeStore = writable('operator'); // 'operator' | 'consensus'
export const ghostModeStore = writable(false);






