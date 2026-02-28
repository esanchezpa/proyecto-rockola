const express = require('express');
const router = express.Router();

// Proxy to TheAudioDB API - search by artist name
router.get('/search', async (req, res) => {
    const { s, t } = req.query;
    try {
        let url;
        if (s && t) {
            url = `https://www.theaudiodb.com/api/v1/json/2/searchtrack.php?s=${encodeURIComponent(s)}&t=${encodeURIComponent(t)}`;
        } else if (s) {
            url = `https://www.theaudiodb.com/api/v1/json/2/search.php?s=${encodeURIComponent(s)}`;
        } else if (t) {
            url = `https://www.theaudiodb.com/api/v1/json/2/searchtrack.php?t=${encodeURIComponent(t)}`;
        } else {
            return res.json({ artists: null, track: null });
        }
        const response = await fetch(url);
        const data = await response.json();
        res.json(data);
    } catch (err) {
        console.error('AudioDB error:', err.message);
        res.json({ artists: null, track: null });
    }
});

module.exports = router;
