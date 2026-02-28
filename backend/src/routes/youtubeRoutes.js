const express = require('express');
const router = express.Router();
const { searchVideos, getSuggestions } = require('../controllers/youtubeController');

router.get('/search', searchVideos);
router.get('/suggest', getSuggestions);

module.exports = router;
