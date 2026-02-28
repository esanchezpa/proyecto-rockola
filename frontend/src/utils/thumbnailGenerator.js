const queue = [];
let isProcessing = false;

// Simple IndexedDB wrapper for large strings
const DB_NAME = 'RockolaThumbnails';
const STORE_NAME = 'thumbs';

async function getDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function getFromDB(key) {
    try {
        const db = await getDB();
        return new Promise((resolve) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.get(key);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(null);
        });
    } catch {
        return null;
    }
}

async function saveToDB(key, data) {
    try {
        const db = await getDB();
        return new Promise((resolve) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.put(data, key);
            req.onsuccess = () => resolve(true);
            req.onerror = () => resolve(false);
        });
    } catch {
        return false;
    }
}

const memoryCache = {};

function generateThumbnail(videoUrl) {
    return new Promise((resolve) => {
        const video = document.createElement('video');
        video.style.display = 'none';
        video.muted = true;
        video.crossOrigin = 'anonymous';
        video.src = videoUrl;

        // Timeout to prevent hanging
        const timeout = setTimeout(() => {
            video.src = '';
            resolve(null);
        }, 10000);

        let sought = false;
        video.addEventListener('loadedmetadata', () => {
            if (video.duration > 15) {
                video.currentTime = 15;
            } else if (video.duration > 2) {
                video.currentTime = video.duration / 2;
            } else {
                video.currentTime = 0;
            }
        });

        video.addEventListener('seeked', () => {
            if (sought) return;
            sought = true;
            clearTimeout(timeout);
            try {
                const canvas = document.createElement('canvas');
                canvas.width = 320;
                canvas.height = 180; // 16:9 ratio thumb
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.5); // Lightweight JPEG
                video.src = ''; // Clear memory
                resolve(dataUrl);
            } catch (err) {
                console.warn('Canvas draw error:', err);
                resolve(null);
            }
        });

        video.addEventListener('error', () => {
            clearTimeout(timeout);
            resolve(null);
        });

        video.play().catch(() => { });
    });
}

async function processQueue() {
    if (isProcessing || queue.length === 0) return;
    isProcessing = true;

    while (queue.length > 0) {
        const { url, resolve } = queue.shift();

        // Check 1: Memory cache
        if (memoryCache[url]) {
            resolve(memoryCache[url]);
            continue;
        }

        // Check 2: IndexedDB
        const cached = await getFromDB(url);
        if (cached) {
            memoryCache[url] = cached;
            resolve(cached);
            continue;
        }

        // Generate newly
        const dataUrl = await generateThumbnail(url);
        if (dataUrl) {
            memoryCache[url] = dataUrl;
            await saveToDB(url, dataUrl);
        }
        resolve(dataUrl);
    }

    isProcessing = false;
}

export function getVideoThumbnail(videoUrl) {
    return new Promise((resolve) => {
        // Fast paths return instantly
        if (memoryCache[videoUrl]) {
            return resolve(memoryCache[videoUrl]);
        }
        // Otherwise queue it to avoid freezing browser with 100 concurrent <video> elements
        queue.push({ url: videoUrl, resolve });
        processQueue();
    });
}
