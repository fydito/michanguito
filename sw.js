/*
 * Proyecto: Mi Changuito | Archivo: sw.js
 * Autor: Jordan Molinari | Versión: 0.1.10 | Fecha: 22/10/2026
 * Descripción: Caché offline de recursos estáticos de la PWA.
 */
const CACHE='mi-changuito-v0.1.10';
const ARCHIVOS=['./','./index.html','./css/styles.css','./js/app.js','./js/tema.js','./js/storage.js','./js/catalogos.js','./js/listas.js','./js/archivos.js','./manifest.json','./img/changui-favicon-64.png','./img/changui-192.png','./img/changui-512.png','./img/changui-maskable-192.png','./img/changui-maskable-512.png','./img/changui-apple-180.png','./data/categorias.json',...['almacen','verduleria','carniceria','libreria','farmacia','limpieza'].map(c=>`./data/catalogos/${c}.json`)];
self.addEventListener('install',evento=>evento.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ARCHIVOS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',evento=>evento.waitUntil(caches.keys().then(claves=>Promise.all(claves.filter(c=>c!==CACHE).map(c=>caches.delete(c)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',evento=>{if(evento.request.method!=='GET'||new URL(evento.request.url).origin!==self.location.origin)return;evento.respondWith(caches.match(evento.request).then(guardado=>guardado||fetch(evento.request)));});
