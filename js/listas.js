/**
 * Proyecto: Mi Changuito | Archivo: listas.js
 * Autor: Jordan Molinari | Versión: 0.1.0 | Fecha: 22/10/2026
 * Descripción: Modelo, validación y cálculos de listas de compras.
 */
/** Genera una lista personal nueva con fecha local. */
export function crearLista() {
  const hoy = new Date();
  const fecha = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}-${String(hoy.getDate()).padStart(2,'0')}`;
  return { id: crypto.randomUUID(), titulo: 'Nueva lista', fecha, categoria: 'almacen', visibilidad: 'personal', items: [] };
}

/** Valida y normaliza una lista importada, sin ejecutar contenido externo. */
export function validarLista(lista) {
  if (!lista || typeof lista !== 'object' || !Array.isArray(lista.items) || lista.items.length > 5000) throw new Error('La lista importada no es válida.');
  const titulo = String(lista.titulo ?? '').trim().slice(0,100);
  if (!titulo || !/^\d{4}-\d{2}-\d{2}$/.test(String(lista.fecha))) throw new Error('La lista tiene título o fecha inválidos.');
  const items = lista.items.map(item => {
    const nombre = String(item.nombre ?? '').trim().slice(0,100);
    const cantidad = Number(item.cantidad);
    const precio = item.precio === null || item.precio === '' || item.precio === undefined ? null : Number(item.precio);
    if (!nombre || !Number.isFinite(cantidad) || cantidad <= 0 || (precio !== null && (!Number.isFinite(precio) || precio < 0))) throw new Error('La lista contiene productos inválidos.');
    return { id: crypto.randomUUID(), nombre, cantidad, unidad: String(item.unidad ?? 'un.').slice(0,20), precio, comprado: Boolean(item.comprado) };
  });
  return { id: crypto.randomUUID(), titulo, fecha: lista.fecha, categoria: String(lista.categoria ?? 'almacen').slice(0,40), visibilidad: 'personal', items };
}

/** Calcula los totales sin redondear cantidades fraccionarias. */
export function calcularTotales(items) {
  return { total: items.reduce((a,p) => a + p.cantidad * (p.precio ?? 0),0), renglones: items.length, cantidad: items.reduce((a,p) => a+p.cantidad,0), marcados: items.filter(p=>p.comprado).length };
}
