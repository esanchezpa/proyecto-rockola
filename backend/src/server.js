require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const configRoutes = require('./routes/configRoutes');
const mediaRoutes = require('./routes/mediaRoutes');
const youtubeRoutes = require('./routes/youtubeRoutes');
const audiodbRoutes = require('./routes/audiodbRoutes');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));
app.use(express.json());

// Routes
app.use('/api/config', configRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/youtube', youtubeRoutes);
app.use('/api/audiodb', audiodbRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Rockola Backend está funcionando 🎵' });
});

const { getSettings } = require('./config/settingsManager');
const { initializeMediaCache } = require('./services/mediaService');

// Start server
app.listen(PORT, async () => {
    console.log(`\n🎵 Rockola Backend corriendo en http://localhost:${PORT}`);

    // Inicializar caché en RAM
    const settings = getSettings();
    await initializeMediaCache(settings);

    console.log(`   GET  /api/config          - Leer configuración`);
    console.log(`   POST /api/config          - Guardar configuración`);
    console.log(`   GET  /api/media?type=audio - Listar medios`);
    console.log(`   GET  /api/media/search?q= - Buscar local`);
    console.log(`   GET  /api/media/stream?path= - Reproducir archivo`);
    console.log(`   GET  /api/youtube/search?q= - Buscar en YouTube\n`);
});
