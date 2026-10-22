/**
 * Proyecto: Mi Changuito | Archivo: archivos.js
 * Autor: Jordan Molinari | Versión: 0.1.0 | Fecha: 22/10/2026
 * Descripción: Lectura y descarga de documentos JSON locales.
 */
/** Descarga datos serializados como JSON UTF-8. */
export function descargarJSON(nombre, datos) {
  const archivo = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(archivo);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
/** Lee y analiza un archivo JSON, limitado a 2 MB. */
export async function leerJSON(archivo) {
  if (!archivo || archivo.size > 2 * 1024 * 1024) throw new Error('Elegí un JSON de hasta 2 MB.');
  try { return JSON.parse(await archivo.text()); }
  catch { throw new Error('El archivo no contiene JSON válido.'); }
}
