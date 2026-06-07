const STORAGE_KEY = 'fitTrackStateV2';

export class Storage {
    async load() {
        const payload = localStorage.getItem(STORAGE_KEY);
        if (!payload) {
            return null;
        }
        try {
            return JSON.parse(payload);
        } catch {
            console.warn('FitTrack storage contained invalid JSON and was reset.');
            return null;
        }
    }

    async save(state) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    async clear() {
        localStorage.removeItem(STORAGE_KEY);
    }
}
