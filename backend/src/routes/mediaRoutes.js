const express = require('express');
const router = express.Router();
const { listMedia, streamMedia, getCover, searchMedia } = require('../controllers/mediaController');

router.get('/', listMedia);
router.get('/play', streamMedia);   // Rutas retro-compatibles
router.get('/stream', streamMedia); // Alias moderno pedido (206 Partial Content)
router.get('/search', searchMedia);
router.get('/cover', getCover);

module.exports = router;
