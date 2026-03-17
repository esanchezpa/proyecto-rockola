const express = require('express');
const router = express.Router();
const { listMedia, streamMedia, getCover, searchMedia, refreshCache, getGenres, getArtists, logError, incrementPlayCount, toggleBlock } = require('../controllers/mediaController');

router.get('/', listMedia);
router.get('/play', streamMedia);
router.get('/stream', streamMedia);
router.get('/search', searchMedia);
router.post('/refresh', refreshCache);
router.get('/genres', getGenres);
router.get('/artists', getArtists);
router.get('/cover', getCover);
router.post('/log-error', logError);
router.post('/play-count', incrementPlayCount);
router.post('/toggle-block', toggleBlock);

module.exports = router;
