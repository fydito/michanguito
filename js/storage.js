/**
 * Proyecto: Mi Changuito | Archivo: storage.js
 * Autor: Jordan Molinari | Versión: 0.1.0 | Fecha: 22/10/2026
 * Descripción: Persistencia local de listas y catálogos mediante IndexedDB.
 */
const NOMBRE_BASE = 'mi_changuito';
const VERSION_BASE = 2;

/** Abre la base de datos y crea los almacenes si todavía no existen. @returns {Promise<IDBDatabase>} */
function abrirBase() {
  return new Promise((resolve, reject) => {
    const solicitud = indexedDB.open(NOMBRE_BASE, VERSION_BASE);
    solicitud.onupgradeneeded = () => {
      const base = solicitud.result;
      if (!base.objectStoreNames.contains('listas')) base.createObjectStore('listas', { keyPath: 'id' });
      if (!base.objectStoreNames.contains('catalogos')) base.createObjectStore('catalogos', { keyPath: 'categoria' });
      // Referencia de la última versión oficial aplicada, para distinguir cambios personales.
      if (!base.objectStoreNames.contains('catalogos_base')) base.createObjectStore('catalogos_base', { keyPath: 'categoria' });
    };
    solicitud.onsuccess = () => resolve(solicitud.result);
    solicitud.onerror = () => reject(solicitud.error);
  });
}

/** Ejecuta una operación IndexedDB y cierra la conexión al finalizar. */
async function operar(almacen, modo, operacion) {
  const base = await abrirBase();
  return new Promise((resolve, reject) => {
    const transaccion = base.transaction(almacen, modo);
    const solicitud = operacion(transaccion.objectStore(almacen));
    let resultado;
    solicitud.onsuccess = () => { resultado = solicitud.result; };
    transaccion.oncomplete = () => { base.close(); resolve(resultado); };
    transaccion.onerror = () => { base.close(); reject(transaccion.error); };
    transaccion.onabort = () => { base.close(); reject(transaccion.error); };
  });
}

/** Obtiene todos los registros de un almacén. @param {string} almacen */
export const obtenerTodos = almacen => operar(almacen, 'readonly', tabla => tabla.getAll());
/** Inserta o actualiza un registro. @param {string} almacen @param {object} registro */
export const guardar = (almacen, registro) => operar(almacen, 'readwrite', tabla => tabla.put(registro));
/** Elimina un registro por clave. @param {string} almacen @param {string} clave */
export const eliminar = (almacen, clave) => operar(almacen, 'readwrite', tabla => tabla.delete(clave));
