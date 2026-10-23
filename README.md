# Mi Changuito

PWA de listas de compras. Proyecto de Jordan Molinari.

## Versión 0.1.3 (22/10/2026)

- Categoría y producto juntos al agregar un artículo; «Otro...» al final del catálogo.
- Los artículos se agregan con cantidad 1 y sin precio.
- Cantidad y precio unitario editables directamente en cada artículo; se guardan en IndexedDB al confirmar el campo.
- Catálogos de categorías independientes de la lista; permite mezclar rubros.
- Conserva las listas y los catálogos locales existentes al actualizar.
- Nueva versión de caché PWA para evitar archivos estáticos desactualizados.

## Funcionalidades de base


- Listas personales con título, fecha, categoría, productos y precios opcionales.
- Cantidades, unidades, numeración, casillas de comprado y totales.
- Persistencia local con IndexedDB.
- Importación/exportación de listas y catálogos JSON.
- PWA con caché offline de recursos estáticos.

## Instalación

Copiar **el contenido de esta carpeta** a la raíz del repositorio GitHub `fydito/michanguito`, conservando directorios. Activar GitHub Pages desde `Settings > Pages`, fuente `Deploy from a branch`, rama `main`, carpeta `/ (root)`. La dirección prevista es `https://fydito.github.io/michanguito/` una vez publicado.

Para probar localmente usar un servidor HTTP (por ejemplo `python -m http.server 8000`), no abrir `index.html` con `file://`.

## Arquitectura

- `index.html`: estructura de interfaz.
- `css/styles.css`: presentación adaptable.
- `js/app.js`: eventos y renderizado.
- `js/storage.js`: IndexedDB.
- `js/listas.js`: modelo y cálculos.
- `js/catalogos.js`: validación e importación de catálogos.
- `js/archivos.js`: entrada y salida JSON.
- `data/`: catálogos predeterminados, editables por archivos JSON.
- `sw.js`: recursos offline.

## Importaciones

Las listas exportadas contienen `{ "version": 1, "tipo": "listas", "listas": [...] }`. Al importar, se crean copias con identificadores nuevos. Los catálogos pueden importarse individualmente (`{ "categoria": "verduleria", "productos": [...] }`) o en un lote exportado (`{ "catalogos": [...] }`). La fusión usa el `id` de producto como clave y actualiza nombres/unidades coincidentes.

## Limitaciones previstas

La modalidad compartida, login, sincronización y API PHP/MySQL **no están implementadas** en esta versión. El modo local no sincroniza dispositivos. La cantidad total suma las cantidades numéricas aunque correspondan a unidades diferentes (kg, litros, unidades); para contar bultos conviene consultar los renglones. Los importes no se actualizan con precios externos. Los datos IndexedDB pueden desaparecer si se limpian los datos del sitio: exportar respaldos.

## Convenciones

Archivos separados por responsabilidad, encabezados descriptivos, funciones documentadas y código legible. Nunca publicar credenciales del backend en GitHub Pages.


## Versión 0.1.1
- Configuración en engranaje de cabecera.
- Navegación de listas compacta en celulares.
- Diagnóstico de errores de carga de catálogos visible en pantalla.
- Importante: subir **todas** las carpetas `js/` y `data/` al repositorio, no solo `index.html`.
- Si el navegador mantiene una versión anterior, recargar la página con Ctrl+F5.


## v0.1.2
- Pantalla de inicio con listas; editor independiente y navegación Volver.
- Configuración accesible únicamente desde el engranaje superior.
- Se actualizó el identificador de caché para evitar mostrar versiones anteriores.


## Versión 0.1.4 — Renglones y eliminación segura

- Productos en un solo renglón: número, nombre, cantidad, precio, eliminar y marcar.
- El tilde de comprado se ubica siempre al extremo derecho y no reordena productos.
- Configuración: confirmar antes de borrar (activo por defecto).
- Configuración: deshacer eliminación durante 5 segundos (activo por defecto).
- Preferencias locales en `localStorage`; las listas continúan en IndexedDB.
- Se conservan importación/exportación JSON y los catálogos anteriores.

## Versión 0.1.5 — Temas de apariencia

- Cuatro colores: verde, azul, violeta y terracota.
- Modos día y noche, combinables con cualquiera de los colores.
- Selector disponible únicamente desde el engranaje de configuración.
- Preferencias almacenadas localmente en `localStorage`.
- Nuevo módulo `js/tema.js`, separado de la lógica de compras.
- Actualización del Service Worker para incluir el módulo nuevo.

## v0.1.8 — Corrección visual

- Modo noche completo hasta el fondo de la ventana.
- Paletas oscuras individuales para los cuatro temas.
- Nombres de listas y productos con más peso y contraste.
- Formularios con fondos entonados, bordes visibles y estados de foco.
- No se modifica la lógica ni el almacenamiento de las listas.


## Versión 0.1.8 — Soft UI

Tarjetas elevadas para listas y productos, campos hundidos, mayor contraste y tildes sólidos al marcar. Se conservan los cuatro temas y los modos día/noche. Solo cambios visuales.


## Versión 0.1.8 — Cantidades táctiles y tachado

- Línea de tachado más gruesa y coloreada según tema.
- Cantidad: botones − y +; el número conserva edición y teclado decimal.
- Incremento 0,25 para kg/l/g; 1 para unidades y paquetes.
- No se admiten cantidades negativas ni cero.

## Versión 0.1.9 — Interfaz final antes del backend

- Ocho colores: verde, azul, violeta, terracota, rojo rubí, azul eléctrico, amarillo solar y rosa.
- Todos combinables con día y noche.
- Cantidades siempre enteras (unidades comerciales), sin kg/l/paq en pantalla.
- Controles − y + y edición directa con teclado numérico.
- Tachado de productos marcados reforzado según el color del tema.
- Mantiene IndexedDB y el resto del comportamiento local.

## Versión 0.1.10 — Changui como identidad visual
- Changui reemplaza el emoji del carrito en la cabecera.
- Favicon PNG para pestañas del navegador.
- Iconos PWA 192/512 PNG y variantes maskable para Android.
- Icono Apple Touch 180 PNG.
- Service Worker con caché renovada para todos los iconos.
- No se modificó la lógica de las listas ni los catálogos.
