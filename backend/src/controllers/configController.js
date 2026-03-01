const { getSettings, saveSettings } = require('../config/settingsManager');

function getConfig(req, res) {
    try {
        const settings = getSettings();
        res.json(settings);
    } catch (err) {
        res.status(500).json({ error: 'Error al leer configuración', details: err.message });
    }
}

function updateConfig(req, res) {
    try {
        const { audioPath, videoPath, karaokePath, keyBindings } = req.body;
        const updated = saveSettings({ audioPath, videoPath, karaokePath, keyBindings });
        res.json({ message: 'Configuración actualizada', config: updated });
    } catch (err) {
        res.status(500).json({ error: 'Error al guardar configuración', details: err.message });
    }
}

module.exports = { getConfig, updateConfig };
