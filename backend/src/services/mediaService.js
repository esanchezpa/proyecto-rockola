const fs = require('fs');
const path = require('path');
const mm = require('music-metadata');

const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.flac', '.ogg', '.m4a', '.wma'];
const VIDEO_EXTENSIONS = ['.mp4', '.avi', '.mkv', '.webm', '.mov'];
const KARAOKE_EXTENSIONS = ['.mp4', '.avi', '.mkv', '.webm', '.mov', '.cdg'];

// Caché Global en RAM
let globalMediaCache = [];

function getExtensionsForType(type) {
    switch (type) {
        case 'audio': return AUDIO_EXTENSIONS;
        case 'video': return VIDEO_EXTENSIONS;
        case 'karaoke': return KARAOKE_EXTENSIONS;
        default: return [...AUDIO_EXTENSIONS, ...VIDEO_EXTENSIONS];
    }
}

async function scanDirectory(dirPath, type = 'audio') {
    const extensions = getExtensionsForType(type);
    const results = [];

    if (!dirPath || !fs.existsSync(dirPath)) {
        return results;
    }

    try {
        const files = fs.readdirSync(dirPath);
        let id = 1;

        for (const file of files) {
            const ext = path.extname(file).toLowerCase();
            if (!extensions.includes(ext)) continue;

            const fullPath = path.join(dirPath, file);
            const stat = fs.statSync(fullPath);

            if (!stat.isFile()) continue;

            const filename = path.basename(file, ext);

            // Try to extract artist - title from filename
            let title = filename;
            let artist = 'Desconocido';
            if (filename.includes(' - ')) {
                const parts = filename.split(' - ');
                artist = parts[0].trim();
                title = parts.slice(1).join(' - ').trim();
            }

            let genre = 'Desconocido';
            if (type === 'audio') {
                try {
                    const metadata = await mm.parseFile(fullPath, { duration: false });
                    if (metadata.common && metadata.common.genre && metadata.common.genre.length > 0) {
                        genre = metadata.common.genre[0];
                    }
                } catch (e) {
                    // Ignore parsing errors for individual files
                }
            }

            results.push({
                id: id++,
                filename: file,
                title,
                artist,
                genre,
                path: fullPath,
                size: stat.size,
                type,
                extension: ext,
            });
        }
    } catch (err) {
        console.error(`Error scanning directory ${dirPath}:`, err.message);
    }

    return results;
}

function getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeMap = {
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.flac': 'audio/flac',
        '.ogg': 'audio/ogg',
        '.m4a': 'audio/mp4',
        '.wma': 'audio/x-ms-wma',
        '.mp4': 'video/mp4',
        '.avi': 'video/x-msvideo',
        '.mkv': 'video/x-matroska',
        '.webm': 'video/webm',
        '.mov': 'video/quicktime',
    };
    return mimeMap[ext] || 'application/octet-stream';
    return mimeMap[ext] || 'application/octet-stream';
}

async function initializeMediaCache(settings) {
    console.log('Construyendo caché de medios en RAM...');
    globalMediaCache = [];

    if (settings.audioPath) {
        const audioFiles = await scanDirectory(settings.audioPath, 'audio');
        globalMediaCache.push(...audioFiles);
    }
    if (settings.videoPath) {
        const videoFiles = await scanDirectory(settings.videoPath, 'video');
        globalMediaCache.push(...videoFiles);
    }
    if (settings.karaokePath) {
        // Karaoke might have duplicate files if they share paths, but scanDirectory handles it as separate types
        const karaokeFiles = await scanDirectory(settings.karaokePath, 'karaoke');
        globalMediaCache.push(...karaokeFiles);
    }
    console.log(`Caché completado. Total de archivos: ${globalMediaCache.length}`);
}

function searchMediaCache(query, type, limit = 20) {
    let filtered = globalMediaCache;

    // Si se provee un tipo (audio, video, karaoke), filtramos primero por tipo
    if (type) {
        filtered = filtered.filter(item => item.type === type);
    }

    // Si no hay query, devolvemos los primeros $limit resultados (ej. index principal)
    if (!query) {
        return filtered.slice(0, limit);
    }

    const lowerQuery = query.toLowerCase();
    const results = [];

    for (const item of filtered) {
        if (item.title.toLowerCase().includes(lowerQuery) || item.artist.toLowerCase().includes(lowerQuery) || item.filename.toLowerCase().includes(lowerQuery)) {
            results.push(item);
            if (results.length >= limit) break;
        }
    }
    return results;
}

function getUniqueGenres() {
    const genres = new Set();
    for (const item of globalMediaCache) {
        if (item.type === 'audio' && item.genre && item.genre !== 'Desconocido') {
            genres.add(item.genre);
        }
    }
    return Array.from(genres).sort();
}

module.exports = { scanDirectory, getMimeType, initializeMediaCache, searchMediaCache, getUniqueGenres };
