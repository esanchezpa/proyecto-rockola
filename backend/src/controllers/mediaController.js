const fs = require('fs');
const path = require('path');
const { getSettings } = require('../config/settingsManager');
const { scanDirectory, getMimeType, searchMediaCache } = require('../services/mediaService');
const mm = require('music-metadata');

async function listMedia(req, res) {
    try {
        const type = req.query.type || 'audio';
        const settings = getSettings();

        let dirPath;
        switch (type) {
            case 'audio': dirPath = settings.audioPath; break;
            case 'video': dirPath = settings.videoPath; break;
            case 'karaoke': dirPath = settings.karaokePath; break;
            default: dirPath = settings.audioPath;
        }

        const files = await scanDirectory(dirPath, type);
        res.json(files);
    } catch (err) {
        res.status(500).json({ error: 'Error al listar medios', details: err.message });
    }
}

function streamMedia(req, res) {
    try {
        const filePath = req.query.path;

        if (!filePath) {
            return res.status(400).json({ error: 'Se requiere el parámetro path' });
        }

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Archivo no encontrado' });
        }

        const stat = fs.statSync(filePath);
        const fileSize = stat.size;
        const mime = getMimeType(filePath);
        const range = req.headers.range;

        if (range) {
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunkSize = end - start + 1;

            const stream = fs.createReadStream(filePath, { start, end });
            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunkSize,
                'Content-Type': mime,
            });
            stream.pipe(res);
        } else {
            res.writeHead(200, {
                'Content-Length': fileSize,
                'Content-Type': mime,
            });
            fs.createReadStream(filePath).pipe(res);
        }
    } catch (err) {
        res.status(500).json({ error: 'Error al reproducir', details: err.message });
    }
}

async function getCover(req, res) {
    try {
        const filePath = req.query.path;

        if (!filePath) {
            return res.status(400).json({ error: 'Se requiere el parámetro path' });
        }

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Archivo no encontrado' });
        }

        // We only need the picture, no need to read the whole file or calculate duration
        const metadata = await mm.parseFile(filePath, { duration: false });

        if (metadata.common && metadata.common.picture && metadata.common.picture.length > 0) {
            const picture = metadata.common.picture[0];
            res.setHeader('Content-Type', picture.format);
            res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
            res.send(picture.data);
        } else {
            res.status(404).json({ error: 'No cover image found' });
        }
    } catch (err) {
        console.error('Error extracting cover:', err.message);
        res.status(500).json({ error: 'Error al extraer carátula', details: err.message });
    }
}

function searchMedia(req, res) {
    try {
        const query = req.query.q || '';
        const limit = parseInt(req.query.limit, 10) || 20;
        const type = req.query.type || ''; // opcional

        const results = searchMediaCache(query, type, limit);
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: 'Error al buscar en caché RAM', details: err.message });
    }
}

module.exports = { listMedia, streamMedia, getCover, searchMedia };
