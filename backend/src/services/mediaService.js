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

    let id = 1;

    async function traverse(currentPath, currentGenre = 'Sin Clasificar', depth = 0) {
        try {
            const items = await fs.promises.readdir(currentPath, { withFileTypes: true });

            // Buscar imagen folder.jpg/png/jpeg en esta carpeta
            let folderArtwork = null;
            const imgItem = items.find(item => item.isFile() && /^folder\.(jpg|jpeg|png|webp)$/i.test(item.name));
            if (imgItem) {
                folderArtwork = path.join(currentPath, imgItem.name);
            }

            for (const item of items) {
                const fullPath = path.join(currentPath, item.name);

                if (item.isDirectory()) {
                    let nextGenre = currentGenre;
                    // Si estamos en la raíz (depth=0), la siguiente carpeta es el género
                    if (depth === 0) {
                        nextGenre = item.name;
                    }
                    await traverse(fullPath, nextGenre, depth + 1);
                } else if (item.isFile()) {
                    const ext = path.extname(item.name).toLowerCase();
                    if (!extensions.includes(ext)) continue;

                    const stat = await fs.promises.stat(fullPath);
                    const filename = path.basename(item.name, ext);

                    // Extraer artista - título
                    // Limpiar prefijo numérico "106 - " del nombre del archivo si existe.
                    const cleanFilename = filename.replace(/^\d+\s*-\s*/, '');
                    let title = cleanFilename;
                    let artist = 'Desconocido';
                    if (cleanFilename.includes(' - ')) {
                        const parts = cleanFilename.split(' - ');
                        artist = parts[0].trim();
                        title = parts.slice(1).join(' - ').trim();
                    }

                    let duration = 0;
                    if (type === 'audio' || type === 'video' || type === 'karaoke') {
                        try {
                            const metadata = await mm.parseFile(fullPath, { duration: true });
                            if (metadata.format && metadata.format.duration) {
                                duration = metadata.format.duration;
                            }
                        } catch (e) {
                            // Ignorar error si el archivo no se pudo parsear
                        }
                    }

                    results.push({
                        id: id++,
                        filename: item.name,
                        title,
                        artist,
                        genre: currentGenre,
                        path: fullPath,
                        artwork: folderArtwork, // Asignar la carátula local si existe
                        size: stat.size,
                        duration,
                        type,
                        extension: ext,
                    });
                }
            }
        } catch (err) {
            console.error(`Error scanning directory ${currentPath}:`, err.message);
        }
    }

    await traverse(dirPath);
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
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
    };
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

function searchMediaCache(query, type, limit = 20, genre = '', artist = '') {
    let filtered = globalMediaCache;

    // Si se provee un tipo (audio, video, karaoke), filtramos primero por tipo
    if (type) {
        filtered = filtered.filter(item => item.type === type);
    }

    // Si se provee un género, filtramos
    if (genre) {
        filtered = filtered.filter(item => item.genre === genre);
    }

    // Si se provee un artista específico, filtramos
    if (artist) {
        filtered = filtered.filter(item => item.artist === artist);
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

function getArtistsByGenre(genre) {
    const artistMap = new Map();

    for (const item of globalMediaCache) {
        if (item.type === 'audio' && item.artist && item.artist !== 'Desconocido') {
            if (genre && item.genre !== genre) continue;

            if (!artistMap.has(item.artist)) {
                artistMap.set(item.artist, {
                    name: item.artist,
                    count: 1,
                    artwork: item.artwork || null
                });
            } else {
                const existing = artistMap.get(item.artist);
                existing.count++;
                if (!existing.artwork && item.artwork) {
                    existing.artwork = item.artwork;
                }
            }
        }
    }

    return Array.from(artistMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

module.exports = { scanDirectory, getMimeType, initializeMediaCache, searchMediaCache, getUniqueGenres, getArtistsByGenre };
