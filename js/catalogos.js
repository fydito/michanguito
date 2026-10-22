/**
 * Proyecto: Mi Changuito | Archivo: catalogos.js
 * Autor: Jordan Molinari | Versión: 0.1.0 | Fecha: 22/10/2026
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

/** Inicializa catálogos predeterminados sin sobrescribir los personalizados. */
export async function inicializarCatalogos() {
  const existentes = await obtenerTodos('catalogos');
  const categorias = await (await fetch('./data/categorias.json')).json();
  for (const categoria of categorias) {
    if (existentes.some(c => c.categoria === categoria.id)) continue;
    const respuesta = await fetch(`./data/catalogos/${categoria.id}.json`);
    if (!respuesta.ok) throw new Error(`No se pudo cargar ${categoria.id}.json`);
    await guardar('catalogos', validarCatalogo(await respuesta.json()));
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
