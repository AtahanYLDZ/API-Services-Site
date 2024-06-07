@echo off
set "dosyaAdi=node_modules"
title Perla API Site - Made By AtahanYLDZ
:a
if exist "%dosyaAdi%" (
    color b
    node --max-old-space-size=6144 atahan.js
) else (
    echo Node Modules Bulunamadi! Yukleniyor...
    npm i
    cls
    color b
    node --max-old-space-size=6144 atahan.js
)
goto a
