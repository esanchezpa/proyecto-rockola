import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:4000/api',
    timeout: 10000,
});

export const getConfig = () => api.get('/config').then(r => r.data);

export const updateConfig = (data) => api.post('/config', data).then(r => r.data);

export const getMedia = (type = 'audio') => api.get(`/media?type=${type}`).then(r => r.data);

export const searchLocalMedia = (query, type = 'audio', limit = 20) =>
    api.get(`/media/search?q=${encodeURIComponent(query)}&type=${type}&limit=${limit}`).then(r => r.data);

export const getStreamUrl = (filePath) =>
    `http://localhost:4000/api/media/stream?path=${encodeURIComponent(filePath)}`;

export const searchYouTube = (query, pageToken = '') => {
    let url = `/youtube/search${query ? `?q=${encodeURIComponent(query)}` : ''}`;
    if (pageToken) url += `${query ? '&' : '?'}pageToken=${pageToken}`;
    return api.get(url).then(r => r.data);
};

export const getYouTubeSuggestions = (query) =>
    api.get(`/youtube/suggest?q=${encodeURIComponent(query)}`).then(r => r.data);

export const searchAudioDB = (artist) =>
    api.get(`/audiodb/search?s=${encodeURIComponent(artist)}`).then(r => r.data);

export default api;
