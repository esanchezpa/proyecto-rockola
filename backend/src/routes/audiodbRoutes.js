const express = require('express');
const router = express.Router();
require('dotenv').config();

const LASTFM_API_KEY = process.env.LASTFM_API_KEY;

// Proxy Adapter to Last.FM API (Replaces TheAudioDB format)
router.get('/search', async (req, res) => {
    const { s, t } = req.query;
    try {
        let imageUrl = null;

        if (s && t) {
            const url = `http://ws.audioscrobbler.com/2.0/?method=track.getinfo&api_key=${LASTFM_API_KEY}&artist=${encodeURIComponent(s)}&track=${encodeURIComponent(t)}&format=json`;
            const response = await fetch(url);
            const data = await response.json();
            if (data.track && data.track.album && data.track.album.image) {
                const images = data.track.album.image;
                imageUrl = images[images.length - 1]['#text'] || null;
            }
        } else if (s) {
            const url = `http://ws.audioscrobbler.com/2.0/?method=artist.getinfo&api_key=${LASTFM_API_KEY}&artist=${encodeURIComponent(s)}&format=json`;
            const response = await fetch(url);
            const data = await response.json();
            if (data.artist && data.artist.image) {
                const images = data.artist.image;
                imageUrl = images[images.length - 1]['#text'] || null;
            }
        } else if (t) {
            const url = `http://ws.audioscrobbler.com/2.0/?method=track.search&api_key=${LASTFM_API_KEY}&track=${encodeURIComponent(t)}&format=json`;
            const response = await fetch(url);
            const data = await response.json();
            if (data.results && data.results.trackmatches && data.results.trackmatches.track.length > 0) {
                const track = data.results.trackmatches.track[0];
                if (track.image) {
                    imageUrl = track.image[track.image.length - 1]['#text'] || null;
                }
            }
        }

        if (imageUrl) {
            return res.json({ artists: [{ strArtistThumb: imageUrl }] });
        } else {
            return res.json({ artists: null });
        }

    } catch (err) {
        console.error('Last.fm error:', err.message);
        res.json({ artists: null });
    }
});

module.exports = router;
