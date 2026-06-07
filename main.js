import { Storage } from './storage.js';
import { FitTrackUI } from './ui.js';

const storage = new Storage();
const app = new FitTrackUI(storage);

window.addEventListener('DOMContentLoaded', async () => {
    await app.init();
});
