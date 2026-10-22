/**
 * Proyecto: Mi Changuito | Archivo: app.js
 * Autor: Jordan Molinari | Versión: 0.1.0 | Fecha: 22/10/2026
 * Descripción: Controlador principal de la interfaz y eventos del modo local.
 */
import { obtenerTodos, guardar, eliminar } from './storage.js';
import { inicializarCatalogos, importarCatalogo } from './catalogos.js';
import { crearLista, validarLista, calcularTotales } from './listas.js';
import { descargarJSON, leerJSON } from './archivos.js';

const $ = id => document.getElementById(id);
const moneda = numero => new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS'}).format(numero);
let listas = [], catalogos = [], categorias = [], activa = null;

/** Muestra avisos breves sin interrumpir la edición. */
function avisar(texto) {
  $('mensaje').textContent = texto;
  $('mensaje').classList.add('visible');
  clearTimeout(avisar.temporizador);
  avisar.temporizador = setTimeout(() => $('mensaje').classList.remove('visible'), 4000);
}
/** Construye nodos de texto seguros, evitando interpretar HTML de importaciones. */
function nodo(etiqueta, texto, clase = '') {
  const elemento = document.createElement(etiqueta);
  elemento.textContent = texto;
  if (clase) elemento.className = clase;
  return elemento;
}
/** Guarda la lista actual y refresca los datos en pantalla. */
async function persistir() {
  if (!activa) return;
  await guardar('listas', activa);
  listas = await obtenerTodos('listas');
  renderizar();
}
/** Presenta las listas existentes y señala la seleccionada. */
function renderizarNavegacion() {
  const contenedor = $('listado-listas'); contenedor.replaceChildren();
  for (const lista of [...listas].sort((a,b)=>b.fecha.localeCompare(a.fecha))) {
    const boton = nodo('button', lista.titulo, `lista-enlace${activa?.id===lista.id?' activa':''}`);
    boton.type='button';
    boton.append(nodo('small',lista.fecha));
    boton.addEventListener('click',()=>{ activa=lista; renderizar(); });
    contenedor.append(boton);
  }
}
/** Completa el selector de categorías, incluidos catálogos importados. */
function renderizarCategorias() {
  const selector = $('categoria'); selector.replaceChildren();
  for (const catalogo of catalogos) {
    const opcion = new Option(categorias.find(c=>c.id===catalogo.categoria)?.nombre ?? catalogo.categoria, catalogo.categoria);
    selector.add(opcion);
  }
  if (activa && catalogos.some(c=>c.categoria===activa.categoria)) selector.value=activa.categoria;
}
/** Carga los productos del catálogo seleccionado. */
function renderizarCatalogo() {
  const selector = $('producto-catalogo'); selector.replaceChildren();
  selector.add(new Option('Seleccionar producto',''));
  const catalogo = catalogos.find(c=>c.categoria===activa?.categoria);
  for (const producto of catalogo?.productos ?? []) selector.add(new Option(producto.nombre,producto.id));
}
/** Presenta los renglones, numeración, casillas y subtotales. */
function renderizarItems() {
  const contenedor=$('productos-lista'); contenedor.replaceChildren();
  if (!activa.items.length) contenedor.append(nodo('p','Todavía no agregaste productos.','vacio'));
  activa.items.forEach((item,indice)=>{
    const fila=nodo('div','','item'+(item.comprado?' comprado':''));
    fila.append(nodo('span',`${indice+1}.`,'numero'));
    const check=document.createElement('input');check.type='checkbox';check.checked=item.comprado;check.setAttribute('aria-label',`Marcar ${item.nombre} como comprado`);
    check.addEventListener('change',async()=>{item.comprado=check.checked;await persistir();});fila.append(check);
    const descripcion=nodo('div','','descripcion');descripcion.append(nodo('strong',item.nombre),nodo('small',`${item.cantidad} ${item.unidad}`));fila.append(descripcion);
    fila.append(nodo('span',item.precio===null?'Sin precio':moneda(item.cantidad*item.precio),'importe'));
    const quitar=nodo('button','×','quitar');quitar.type='button';quitar.setAttribute('aria-label',`Quitar ${item.nombre}`);
    quitar.addEventListener('click',async()=>{activa.items.splice(indice,1);await persistir();});fila.append(quitar);
    contenedor.append(fila);
  });
  const totales=calcularTotales(activa.items);
  $('total').textContent=moneda(totales.total);
  $('renglones').textContent=totales.renglones;
  $('cantidad-total').textContent=Number(totales.cantidad.toFixed(3)).toLocaleString('es-AR');
  $('marcados').textContent=totales.marcados;
  $('avance').textContent=`${totales.marcados} de ${totales.renglones} marcados`;
}
/** Actualiza la interfaz a partir del estado persistido. */
function renderizar() {
  renderizarNavegacion();
  if (!activa) return;
  $('titulo').value=activa.titulo;$('fecha').value=activa.fecha;
  $('visibilidad').value='personal';
  renderizarCategorias();renderizarCatalogo();renderizarItems();
}
/** Importa varias listas como copias nuevas para no pisar compras existentes. */
async function importarListas(datos) {
  if (!Array.isArray(datos?.listas) || datos.listas.length>1000) throw new Error('El archivo debe contener un arreglo listas (máximo 1000).');
  const nuevas=datos.listas.map(validarLista);
  for(const lista of nuevas) await guardar('listas',lista);
  listas=await obtenerTodos('listas');activa=nuevas[0]??activa;renderizar();avisar(`${nuevas.length} listas importadas.`);
}
/** Asocia los eventos de edición, importación y exportación. */
function configurarEventos() {
  $('nueva-lista').addEventListener('click',async()=>{activa=crearLista();await persistir();$('titulo').focus();});
  $('eliminar-lista').addEventListener('click',async()=>{
    if(!activa||!confirm(`¿Eliminar la lista «${activa.titulo}»?`))return;
    await eliminar('listas',activa.id);listas=await obtenerTodos('listas');activa=listas[0]??crearLista();await persistir();
  });
  $('titulo').addEventListener('change',async e=>{activa.titulo=e.target.value.trim()||'Nueva lista';await persistir();});
  $('fecha').addEventListener('change',async e=>{if(e.target.value){activa.fecha=e.target.value;await persistir();}});
  $('categoria').addEventListener('change',async e=>{activa.categoria=e.target.value;await persistir();});
  $('producto-catalogo').addEventListener('change',e=>{
    const producto=catalogos.find(c=>c.categoria===activa.categoria)?.productos.find(p=>p.id===e.target.value);
    if(producto)$('unidad').value=[...$('unidad').options].some(o=>o.value===producto.unidad)?producto.unidad:'un.';
  });
  $('form-producto').addEventListener('submit',async e=>{
    e.preventDefault();
    const seleccionado=catalogos.find(c=>c.categoria===activa.categoria)?.productos.find(p=>p.id===$('producto-catalogo').value);
    const nombre=$('producto-libre').value.trim()||seleccionado?.nombre;
    const cantidad=Number($('cantidad').value);
    const precio=$('precio').value.trim()===''?null:Number($('precio').value);
    if(!nombre||!Number.isFinite(cantidad)||cantidad<=0||(precio!==null&&(!Number.isFinite(precio)||precio<0))){avisar('Completá un producto y una cantidad válida.');return;}
    activa.items.push({id:crypto.randomUUID(),nombre,cantidad,unidad:$('unidad').value,precio,comprado:false});
    await persistir();$('producto-libre').value='';$('producto-catalogo').value='';$('cantidad').value='1';$('precio').value='';
  });
  $('exportar-listas').addEventListener('click',()=>descargarJSON('mi-changuito-listas.json',{version:1,tipo:'listas',listas}));
  $('exportar-catalogo').addEventListener('click',()=>descargarJSON('mi-changuito-catalogos.json',{version:1,tipo:'catalogos',catalogos}));
  $('importar-listas').addEventListener('change',async e=>{try{await importarListas(await leerJSON(e.target.files[0]));}catch(error){avisar(error.message);}e.target.value='';});
  $('importar-catalogo').addEventListener('change',async e=>{
    try{
      const datos=await leerJSON(e.target.files[0]);const entradas=Array.isArray(datos.catalogos)?datos.catalogos:[datos];
      if(entradas.length>100)throw new Error('Demasiados catálogos.');
      const reemplazar=confirm('Aceptar: reemplazar productos de las categorías importadas. Cancelar: fusionar y actualizar por ID.');
      for(const entrada of entradas)await importarCatalogo(entrada,reemplazar);
      catalogos=await obtenerTodos('catalogos');renderizar();avisar('Catálogos actualizados.');
    }catch(error){avisar(error.message);}e.target.value='';
  });
}
/** Inicializa la aplicación; los fallos se comunican al usuario. */
async function iniciar() {
  try {
    categorias=await inicializarCatalogos();catalogos=await obtenerTodos('catalogos');listas=await obtenerTodos('listas');
    activa=listas[0]??crearLista();if(!listas.length)await guardar('listas',activa);
    configurarEventos();renderizar();
    if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(console.warn);
  }catch(error){console.error(error);avisar('No se pudo iniciar la aplicación. Revisá la consola.');}
}
iniciar();
