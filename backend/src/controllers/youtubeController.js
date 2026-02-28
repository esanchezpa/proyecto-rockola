const API_KEY = process.env.YOUTUBE_API_KEY;
const BASE_URL = 'https://www.googleapis.com/youtube/v3';

// Helper to format view count
function formatViews(count) {
    if (!count) return '';
    const n = parseInt(count, 10);
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)} M vistas`;
    if (n >= 1000) return `${(n / 1000).toFixed(0)} k vistas`;
    return `${n} vistas`;
}

// Helper to format ISO 8601 duration (PT4M15S) to "4:15"
function formatDuration(iso) {
    if (!iso) return '';
    const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return '';
    const h = parseInt(match[1] || '0', 10);
    const m = parseInt(match[2] || '0', 10);
    const s = parseInt(match[3] || '0', 10);
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
}

// Helper to format relative time
function formatPublished(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'hoy';
    if (days === 1) return 'hace 1 día';
    if (days < 7) return `hace ${days} días`;
    if (days < 30) return `hace ${Math.floor(days / 7)} semana${Math.floor(days / 7) > 1 ? 's' : ''}`;
    if (days < 365) return `hace ${Math.floor(days / 30)} mes${Math.floor(days / 30) > 1 ? 'es' : ''}`;
    return `hace ${Math.floor(days / 365)} año${Math.floor(days / 365) > 1 ? 's' : ''}`;
}

const cache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

function getCached(key) {
    const item = cache.get(key);
    if (item && Date.now() - item.timestamp < CACHE_TTL) {
        return item.data;
    }
    return null;
}

function setCache(key, data) {
    cache.set(key, { data, timestamp: Date.now() });
}

// Get trending music videos from Peru
async function getTrending(req, res) {
    try {
        if (!API_KEY) {
            return res.status(500).json({ error: 'YouTube API Key no configurada' });
        }

        const cacheKey = 'trend-PE';
        const cached = getCached(cacheKey);
        if (cached) return res.json(cached);

        const url = `${BASE_URL}/videos?part=snippet,contentDetails,statistics&chart=mostPopular&regionCode=PE&videoCategoryId=10&maxResults=8&key=${API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message);
        }

        const trendingRaw = data.items.map((item, i) => {
            if (item.status && item.status.embeddable === false) return null;
            return {
                id: `trend-${i}`,
                title: item.snippet.title,
                channel: item.snippet.channelTitle,
                views: formatViews(item.statistics?.viewCount),
                published: formatPublished(item.snippet.publishedAt),
                duration: formatDuration(item.contentDetails?.duration),
                thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url,
                videoId: item.id,
            };
        });
        const trending = trendingRaw.filter(Boolean);

        // Also get music videos (different query)
        const mvUrl = `${BASE_URL}/search?part=snippet&maxResults=8&type=video&videoCategoryId=10&regionCode=PE&q=cumbia+peruana+videoclip&key=${API_KEY}`;
        const mvResponse = await fetch(mvUrl);
        const mvData = await mvResponse.json();

        // Need to check embeddable status for MV as well, using videoIds
        const mvIds = (mvData.items || []).map(item => item.id.videoId).filter(Boolean).join(',');
        const mvDetailsUrl = `${BASE_URL}/videos?part=status&id=${mvIds}&key=${API_KEY}`;
        const mvDetailsResponse = await fetch(mvDetailsUrl);
        const mvDetailsData = await mvDetailsResponse.json();

        const mvDetailsMap = {};
        (mvDetailsData.items || []).forEach(item => {
            mvDetailsMap[item.id] = { embeddable: item.status?.embeddable !== false };
        });

        const musicVideosRaw = (mvData.items || []).map((item, i) => {
            const embed = mvDetailsMap[item.id.videoId];
            if (embed && !embed.embeddable) return null;
            return {
                id: `mv-${i}`,
                title: item.snippet.title,
                channel: item.snippet.channelTitle,
                views: '',
                published: formatPublished(item.snippet.publishedAt),
                duration: '',
                thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url,
                videoId: item.id.videoId,
            };
        });
        const musicVideos = musicVideosRaw.filter(Boolean);

        const responseData = {
            trending,
            musicVideos,
            source: 'youtube',
        };

        setCache(cacheKey, responseData);
        res.json(responseData);
    } catch (err) {
        console.error('YouTube trending error:', err.message);
        res.status(500).json({ error: 'Error al obtener tendencias', details: err.message });
    }
}

// Search YouTube videos
async function searchVideos(req, res) {
    const query = req.query.q;
    const pageToken = req.query.pageToken || '';

    if (!query) {
        return getTrending(req, res);
    }

    try {
        if (!API_KEY) {
            return res.status(500).json({ error: 'YouTube API Key no configurada' });
        }

        const cacheKey = `search-${query}-${pageToken}`;
        const cached = getCached(cacheKey);
        if (cached) return res.json(cached);

        // Search for videos
        let searchUrl = `${BASE_URL}/search?part=snippet&maxResults=10&type=video&q=${encodeURIComponent(query)}&regionCode=PE&key=${API_KEY}`;
        if (pageToken) {
            searchUrl += `&pageToken=${pageToken}`;
        }
        const searchResponse = await fetch(searchUrl);
        const searchData = await searchResponse.json();

        if (searchData.error) {
            throw new Error(searchData.error.message);
        }

        // Get video IDs to fetch durations and stats
        const videoIds = searchData.items.map(item => item.id.videoId).join(',');
        const detailsUrl = `${BASE_URL}/videos?part=contentDetails,statistics,status&id=${videoIds}&key=${API_KEY}`;
        const detailsResponse = await fetch(detailsUrl);
        const detailsData = await detailsResponse.json();

        const detailsMap = {};
        (detailsData.items || []).forEach(item => {
            detailsMap[item.id] = {
                duration: formatDuration(item.contentDetails?.duration),
                views: formatViews(item.statistics?.viewCount),
                embeddable: item.status?.embeddable !== false,
            };
        });

        const rawResults = searchData.items.map((item, i) => {
            const details = detailsMap[item.id.videoId] || { embeddable: true };
            if (!details.embeddable) return null;
            return {
                id: `yt-search-${pageToken}-${i}`,
                title: item.snippet.title,
                channel: item.snippet.channelTitle,
                published: formatPublished(item.snippet.publishedAt),
                duration: details.duration || '',
                views: details.views || '',
                thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url,
                videoId: item.id.videoId,
            };
        });
        const results = rawResults.filter(Boolean);

        const responseData = {
            results,
            nextPageToken: searchData.nextPageToken || null,
            source: 'youtube',
        };

        setCache(cacheKey, responseData);
        res.json(responseData);
    } catch (err) {
        console.error('YouTube search error:', err.message);
        res.status(500).json({ error: 'Error al buscar en YouTube', details: err.message });
    }
}

// YouTube search suggestions (uses Google suggest API — free, no key needed)
async function getSuggestions(req, res) {
    const query = req.query.q;
    if (!query || query.length < 2) {
        return res.json({ suggestions: [] });
    }

    try {
        const url = `https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&q=${encodeURIComponent(query)}`;
        const response = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
        });
        const text = await response.text();

        // Parse JSONP response: window.google.ac.h(...)
        const match = text.match(/\[.*\]/);
        if (!match) return res.json({ suggestions: [] });

        const parsed = JSON.parse(match[0]);
        const suggestions = (parsed[1] || []).slice(0, 8).map(s => s[0]);

        res.json({ suggestions });
    } catch (err) {
        console.error('YouTube suggestions error:', err.message);
        res.json({ suggestions: [] });
    }
}

module.exports = { searchVideos, getTrending, getSuggestions };
