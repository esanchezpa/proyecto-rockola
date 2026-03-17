# Registro de Cambios - Rockola Web (17-03-2026)

## Feature: Resiliencia y Optimización de Navegación

### 1. Resiliencia del Reproductor (Fase 1)
Implementación de lógica de "Watchdog" y auto-recuperación para evitar que la Rockola se detenga ante archivos corruptos o lentos.

- **Backend:**
  - Creado endpoint `POST /api/media/log-error` para registrar fallos técnicos.
  - Generación automática de `backend/media-errors.json` con detalles del error (ID, ruta, mensaje, timestamp).
- **Frontend (MiniPlayer):**
  - Implementado manejador `onError`: Salta automáticamente a la siguiente canción tras 2 segundos de detectar un archivo corrupto o no encontrado.
  - Implementado "Watchdog" de carga (`onStalled`/`onWaiting`): Si el archivo no avanza por más de 5 segundos, se asume falla de red/disco y se ejecuta `skipTrack`.
  - Notificaciones en tiempo real (Toasts) informando al usuario sobre el salto por error.

### 2. Mejoras en Navegación y Experiencia de Usuario (UX)
Correcciones críticas en el flujo de interacción mediante teclado para entorno de Kiosko.

- **Foco del Buscador:**
  - Ahora es posible subir al buscador desde el primer ítem de cualquier lista usando `ArrowUp`.
  - El buscador ahora tiene un **resaltado visual** (sombra azul) y los ítems de la lista se atenúan cuando el foco está en la barra de búsqueda.
- **Navegación de Géneros:**
  - Se corrigió el error donde el borde de pestaña activa permanecía en "Audio" a pesar de estar filtrando por "Género". Ahora la pestaña "Género" se marca correctamente como activa.
  - Se habilitó el acceso a los botones de "Lista de Canciones" y "Artistas" mediante flechas direccionales.
- **Correcciones de Grilla:**
  - La navegación en la vista de artistas ahora es puramente vertical/horizontal coherente con el diseño visual.

---

## Feature: Música de Ambiente Inteligente (Fase 2)

### Fade Out e Interrupción por Monedas/Teclas
Implementación de la lógica clásica de rockolas físicas donde la música de ambiente se desvanece suavemente al insertar moneda o interactuar.

- **Backend:** N/A (Lógica 100% Frontend)
- **Frontend:**
  - Modificado `useRockolaStore`: Nuevos estados `idleVolume` y `isFadingOut`.
  - Modificado `IdleAutoplay.jsx`: Nuevo sistema de **Fade Out** que reduce el volumen de 1.0 a 0.0 en 1 segundo (10 pasos de 100ms).
  - Evento personalizado `TRIGGER_IDLE_FADEOUT`: Dispara el fade out cuando se insertan créditos.
  - Interrupción por teclas: Si `idleStopOnNav` está activo, cualquier tecla ahora también dispara el Fade Out inmediato.

---

## Feature: Estadísticas y Lista Negra (Fase 3)

### Control de Catálogo y Popularidad
Sistema para bloquear canciones y registrar estadísticas de reproducción.

- **Backend:**
  - Nuevos campos en el modelo de medios: `playCount`, `isBlocked`, `replayGain`.
  - Archivo de estado: `backend/media-blocked.json` para persistir bloqueos y contadores.
  - Endpoints nuevos:
    - `POST /api/media/play-count`: Incrementa el contador de reproducciones.
    - `POST /api/media/toggle-block`: Bloquea/Desbloquea una canción.
  - Modificado `GET /api/media`: Ahora soporta parámetro `excludeBlocked=true` para no mostrar canciones bloqueadas en el menú normal.

- **Frontend:**
  - `rockolaApi.js`: Nuevas funciones `incrementPlayCount` y `toggleBlock`.
  - `MiniPlayer.jsx`: Envía automáticamente el `playCount` al backend cuando una canción termina exitosamente.

---

## Feature: Normalización de Volumen (Fase 4)

### ReplayGain Integration
Implementación de Web Audio API para igualar el volumen entre canciones.

- **Backend:**
  - Extracción de etiqueta **ReplayGain (track gain)** durante el escaneo de MP3s usando `music-metadata`.
  - Envío del valor `replayGain` al frontend junto con los metadatos de la canción.

- **Frontend:**
  - `MiniPlayer.jsx`: Nuevo efecto que sincroniza el atributo `volume` del elemento `<audio>`/`<video>`.
  - Si la canción actual es un track de Idle, el volumen se ajusta según `idleVolume` (para el Fade Out).
  - Si es una canción normal, el volumen base se ajusta según el `replayGain` del backend (Fase 4 completa para normalización).

---
**Estado Final:** ✅ Fases 1, 2, 3 y 4 Completadas | Build Exitoso
