/**
 * Proyecto: Mi Changuito | Archivo: catalogos.js
 * Autor: Jordan Molinari | Versión: 0.1.1 | Fecha: 22/10/2026
 * Descripción: Carga, validación, importación y exportación de catálogos JSON.
 */
import { obtenerTodos, guardar } from './storage.js';

/** Verifica la estructura mínima de un catálogo y normaliza sus productos. */
export function validarCatalogo(datos) {
  if (!datos || typeof datos.categoria !== 'string' || !/^[a-z0-9_-]{2,40}$/.test(datos.categoria) || !Array.isArray(datos.productos)) {
    throw new Error('El JSON no tiene un catálogo válido.');
  }
  if (datos.productos.length > 2000) throw new Error('El catálogo supera los 2000 productos.');
  const productos = datos.productos.map(producto => {
    if (!producto || typeof producto.id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(producto.id) || typeof producto.nombre !== 'string' || !producto.nombre.trim() || producto.nombre.length > 100 || typeof producto.unidad !== 'string' || producto.unidad.length > 20) {
      throw new Error('Hay productos con campos inválidos.');
    }
    return { id: producto.id, nombre: producto.nombre.trim(), unidad: producto.unidad };
  });
  if (new Set(productos.map(p => p.id)).size !== productos.length) throw new Error('Hay identificadores duplicados.');
  return { version: 1, categoria: datos.categoria, productos };
}

/**
 * Actualiza la copia local con el catálogo oficial SIN borrar personalizaciones.
 * - ID nuevo: se incorpora.
 * - ID existente modificado por el usuario: se conserva.
 * - ID existente sin modificaciones: se actualiza desde el JSON oficial.
 * - ID eliminado del JSON oficial: se conserva para no perder datos.
 * La referencia anterior permite distinguir una edición personal de una actualización oficial.
 */
export async function inicializarCatalogos() {
  const respuestaCategorias = await fetch('./data/categorias.json');
  if (!respuestaCategorias.ok) throw new Error('No se pudo cargar categorias.json');
  const categorias = await respuestaCategorias.json();
  const existentes = new Map((await obtenerTodos('catalogos')).map(c => [c.categoria, c]));
  const referencias = new Map((await obtenerTodos('catalogos_base')).map(c => [c.categoria, c]));
  for (const categoria of categorias) {
    const respuesta = await fetch(`./data/catalogos/${categoria.id}.json`);
    if (!respuesta.ok) throw new Error(`No se pudo cargar ${categoria.id}.json`);
    const oficial = validarCatalogo(await respuesta.json());
    const local = existentes.get(categoria.id);
    const anterior = referencias.get(categoria.id);
    if (!local) {
      await guardar('catalogos', oficial);
    } else {
      const anteriores = new Map((anterior?.productos ?? []).map(p => [p.id, p]));
      const combinados = new Map(local.productos.map(p => [p.id, p]));
      for (const producto of oficial.productos) {
        const actual = combinados.get(producto.id);
        const basePrevia = anteriores.get(producto.id);
        // En la primera migración, respetamos los nombres ya guardados.
        if (!actual || (basePrevia && actual.nombre === basePrevia.nombre && actual.unidad === basePrevia.unidad)) {
          combinados.set(producto.id, producto);
        }
      }
      await guardar('catalogos', { ...local, productos: [...combinados.values()] });
    }
    await guardar('catalogos_base', oficial);
  }
  return categorias;
}

/** Fusiona un catálogo importado con el actual, identificando productos por ID. */
export async function importarCatalogo(datos, reemplazar = false) {
  const nuevo = validarCatalogo(datos);
  const existente = (await obtenerTodos('catalogos')).find(c => c.categoria === nuevo.categoria);
  const productos = reemplazar || !existente ? nuevo.productos : [...new Map([...existente.productos, ...nuevo.productos].map(p => [p.id, p])).values()];
  await guardar('catalogos', { ...nuevo, productos });
}
