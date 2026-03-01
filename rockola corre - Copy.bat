@echo off
echo Iniciando Rockola de prueba...

start msedge.exe --kiosk "http://localhost:5173" --edge-kiosk-type=fullscreen --user-data-dir="%TEMP%\RockolaProfileDev" --autoplay-policy=no-user-gesture-required --disable-pinch --overscroll-history-navigation=0