/**
 * Proyecto: Mi Changuito | Archivo: app.js
 * Autor: Jordan Molinari | Versión: 0.1.9 | Fecha: 22/10/2026
 * Descripción: Controlador principal de la interfaz y eventos del modo local.
 */
import { obtenerTodos, guardar, eliminar } from './storage.js';
import { inicializarCatalogos, importarCatalogo } from './catalogos.js';
import { crearLista, validarLista, calcularTotales } from './listas.js';
import { descargarJSON, leerJSON } from './archivos.js';
import { iniciarCuenta, cerrarSesion, subirListas, bajarListas } from './cuenta.js';

const $ = id => document.getElementById(id);
const moneda = numero => new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS'}).format(numero);
let listas = [], catalogos = [], categorias = [], activa = null;
const CLAVE_PREFERENCIAS = 'mi-changuito-preferencias';
const CLAVE_BIENVENIDA = 'mi-changuito-bienvenida-v1';
let preferencias = { confirmarBorrado: true, permitirDeshacer: true };
let borradoPendiente = null;
let ultimoBorrado = null;
let temporizadorDeshacer = null;

/** Recupera preferencias sin alterar los datos existentes de IndexedDB. */
function cargarPreferencias() {
  try {
    const guardadas = JSON.parse(localStorage.getItem(CLAVE_PREFERENCIAS) || '{}');
    preferencias = { ...preferencias, ...guardadas };
  } catch (error) {
    console.warn('No se pudieron leer las preferencias:', error);
  }
  $('confirmar-borrado').checked = preferencias.confirmarBorrado;
  $('permitir-deshacer').checked = preferencias.permitirDeshacer;
}

/** Guarda las preferencias generales del dispositivo. */
function guardarPreferencias() {
  try { localStorage.setItem(CLAVE_PREFERENCIAS, JSON.stringify(preferencias)); }
  catch (error) { console.warn('No se pudieron guardar las preferencias:', error); }
}

/** Cierra un aviso anterior y descarta la posibilidad de deshacerlo. */
function cerrarDeshacer() {
  clearTimeout(temporizadorDeshacer);
  ultimoBorrado = null;
  $('deshacer-aviso').hidden = true;
}

/** Elimina por identificador estable y ofrece deshacer si está habilitado. */
async function borrarItem(idLista, idItem) {
  const lista = listas.find(elemento => elemento.id === idLista);
  if (!lista) return;
  const indice = lista.items.findIndex(elemento => elemento.id === idItem);
  if (indice < 0) return;
  cerrarDeshacer();
  const [item] = lista.items.splice(indice, 1);
  ultimoBorrado = preferencias.permitirDeshacer ? { idLista, item, indice } : null;
  await guardar('listas', lista);
  listas = await obtenerTodos('listas');
  if (activa?.id === idLista) activa = listas.find(elemento => elemento.id === idLista);
  renderizar();
  if (ultimoBorrado) {
    $('deshacer-texto').textContent = `Se eliminó «${item.nombre}».`;
    $('deshacer-aviso').hidden = false;
    temporizadorDeshacer = setTimeout(cerrarDeshacer, 5000);
  } else avisar(`Se eliminó «${item.nombre}».`);
}

/** Solicita confirmación antes de borrar, según la preferencia guardada. */
function solicitarBorrado(item) {
  if (!activa) return;
  const idLista = activa.id;
  if (!preferencias.confirmarBorrado) {
    borrarItem(idLista, item.id).catch(error => avisar(error.message));
    return;
  }
  borradoPendiente = { idLista, idItem: item.id };
  $('confirmar-item-texto').textContent = `¿Querés eliminar «${item.nombre}» de esta lista?`;
  $('confirmar-item').showModal();
}

/** Restituye el producto en su posición original si todavía existe la lista. */
async function deshacerBorrado() {
  if (!ultimoBorrado) return;
  const { idLista, item, indice } = ultimoBorrado;
  cerrarDeshacer();
  const lista = listas.find(elemento => elemento.id === idLista);
  if (!lista || lista.items.some(elemento => elemento.id === item.id)) return;
  lista.items.splice(Math.min(indice, lista.items.length), 0, item);
  await guardar('listas', lista);
  listas = await obtenerTodos('listas');
  if (activa?.id === idLista) activa = listas.find(elemento => elemento.id === idLista);
  renderizar();
  avisar('Producto recuperado.');
}

/** Alterna las pantallas sin mantener paneles laterales. */
function mostrarPantalla(editor = false) {
  $('pantalla-inicio').hidden = editor;
  $('pantalla-editor').hidden = !editor;
  window.scrollTo({ top: 0, behavior: 'instant' });
}


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
    boton.addEventListener('click',()=>{ activa=lista; renderizar(); mostrarPantalla(true); });
    contenedor.append(boton);
  }
}
/** Completa el selector de categorías de cada producto, no de toda la lista. */
function renderizarCategorias() {
  const selector = $('categoria');
  const anterior = selector.value;
  selector.replaceChildren();
  for (const categoria of categorias) {
    selector.add(new Option(categoria.nombre, categoria.id));
  }
  if ([...selector.options].some(opcion => opcion.value === anterior)) selector.value = anterior;
}
/** Abre o cierra el catálogo sin modificar la selección temporal. */
function desplegarProductos(abierto) {
  $('panel-productos').hidden = !abierto;
  $('alternar-productos').setAttribute('aria-expanded', String(abierto));
  $('flecha-productos').textContent = abierto ? '▴' : '▾';
}
/** Catálogo alfabético con selección múltiple temporal (no refleja compras previas). */
function renderizarCatalogo() {
  const contenedor = $('producto-catalogo');
  contenedor.replaceChildren();
  const catalogo = catalogos.find(c => c.categoria === $('categoria').value);
  const productos = [...(catalogo?.productos ?? [])].sort((a,b)=>a.nombre.localeCompare(b.nombre,'es',{sensitivity:'base'}));
  for (const producto of productos) {
    const etiqueta = document.createElement('label');
    etiqueta.className = 'catalogo-opcion';
    const casilla = document.createElement('input');
    casilla.type = 'checkbox'; casilla.value = producto.id;
    casilla.addEventListener('change', actualizarSeleccion);
    etiqueta.append(casilla, document.createTextNode(producto.nombre));
    contenedor.append(etiqueta);
  }
  $('incluir-otro').checked = false;
  $('producto-libre').value = '';
  desplegarProductos(false);
  mostrarCampoOtro();
  actualizarSeleccion();
}
function mostrarCampoOtro() {
  const otro = $('incluir-otro').checked;
  $('grupo-producto-otro').hidden = !otro;
  $('producto-libre').required = otro;
  if (!otro) $('producto-libre').value = '';
  actualizarSeleccion();
}
function actualizarSeleccion() {
  const marcados = $('producto-catalogo').querySelectorAll('input:checked').length;
  const otro = $('incluir-otro').checked && $('producto-libre').value.trim().length > 0;
  const cantidad = marcados + Number(otro);
  $('agregar-seleccionados').disabled = cantidad === 0;
  $('conteo-seleccion').textContent = `${cantidad} seleccionado${cantidad === 1 ? '' : 's'}`;
  $('texto-selector-productos').textContent = cantidad ? `Seleccionados: ${cantidad}` : 'Seleccionar productos...';
}
/** Construye un campo numérico accesible para modificar un renglón. */
function crearCampoNumerico(item, propiedad, etiqueta, opciones = {}) {
  const campo = document.createElement('label');
  campo.className = 'campo-item' + (propiedad === 'precio' ? ' campo-precio' : '');
  campo.append(nodo('span', etiqueta));
  const entrada = document.createElement('input');
  entrada.type = 'number';
  entrada.inputMode = 'decimal';
  entrada.min = String(opciones.min ?? 0);
  entrada.step = 'any';
  entrada.value = item[propiedad] === null ? '' : String(item[propiedad]);
  if (opciones.placeholder) entrada.placeholder = opciones.placeholder;
  // Se guarda al confirmar el cambio, sin reconstruir el DOM mientras se escribe.
  entrada.addEventListener('change', async () => {
    const texto = entrada.value.trim();
    const valor = texto === '' && propiedad === 'precio' ? null : Number(texto);
    if ((texto === '' && propiedad === 'cantidad') || (valor !== null && (!Number.isFinite(valor) || valor < (opciones.min ?? 0)))) {
      entrada.value = item[propiedad] === null ? '' : String(item[propiedad]);
      avisar('Ingresá un valor válido.');
      return;
    }
    item[propiedad] = valor;
    await persistir();
  });
  campo.append(entrada);
  return campo;
}
/**
 * Crea controles - / número editable / + sin sacrificar el teclado numérico.
 * Todas las cantidades representan unidades comerciales enteras.
 * No admite cantidades menores al mínimo ni duplica guardados al pulsar.
 */
function crearControlCantidad(item) {
  const campo = document.createElement('div');
  campo.className = 'campo-item campo-cantidad';
  campo.append(nodo('span', 'Cant.')); 
  const grupo = nodo('div', '', 'control-cantidad');
  const entrada = document.createElement('input');
  entrada.type = 'number';
  entrada.inputMode = 'numeric';
  entrada.min = '1';
  entrada.step = '1';
  entrada.setAttribute('aria-label', `Cantidad de ${item.nombre} en unidades comerciales`);
  entrada.value = String(item.cantidad);
  const paso = 1;
  const minimo = 1;
  let enGuardado = false;
  async function guardarCantidad(valor) {
    if (enGuardado) return;
    if (!Number.isSafeInteger(valor) || valor < minimo) {
      entrada.value = String(item.cantidad);
      avisar('Ingresá una cantidad válida.');
      return;
    }
    enGuardado = true;
    try {
      item.cantidad = valor;
      entrada.value = String(item.cantidad);
      await persistir();
    } catch (error) {
      avisar('No se pudo guardar la cantidad.');
      console.error(error);
    } finally { enGuardado = false; }
  }
  entrada.addEventListener('change', () => {
    if (entrada.value.trim() === '') {
      entrada.value = String(item.cantidad);
      return;
    }
    guardarCantidad(Number(entrada.value));
  });
  function botonCantidad(simbolo, direccion) {
    const boton = nodo('button', simbolo, 'paso-cantidad');
    boton.type = 'button';
    boton.setAttribute('aria-label', `${direccion > 0 ? 'Aumentar' : 'Disminuir'} cantidad de ${item.nombre}`);
    boton.addEventListener('click', () => {
      const base = Number.isFinite(Number(entrada.value)) && entrada.value !== '' ? Number(entrada.value) : item.cantidad;
      const siguiente = base + direccion * paso;
      if (siguiente < minimo) return;
      guardarCantidad(siguiente);
    });
    return boton;
  }
  grupo.append(botonCantidad('−', -1), entrada, botonCantidad('+', 1));
  campo.append(grupo);
  return campo;
}
/** Presenta cada producto en una sola línea, con el tilde al extremo derecho. */
function renderizarItems() {
  const contenedor = $('productos-lista');
  contenedor.replaceChildren();
  if (!activa.items.length) contenedor.append(nodo('p', 'Todavía no agregaste productos.', 'vacio'));

  activa.items.forEach((item, indice) => {
    const fila = nodo('div', '', 'item item-compacto' + (item.comprado ? ' comprado' : ''));
    fila.append(nodo('span', `${indice + 1}.`, 'numero'));

    const nombre = nodo('strong', item.nombre, 'nombre-producto');
    nombre.title = item.nombre;
    fila.append(nombre);

    // Cantidad y precio se editan directamente en el renglón.
    fila.append(crearControlCantidad(item));
    fila.append(crearCampoNumerico(item, 'precio', 'Precio ($)', { min: 0, placeholder: '—' }));

    const quitar = nodo('button', '×', 'quitar');
    quitar.type = 'button';
    quitar.title = `Eliminar ${item.nombre}`;
    quitar.setAttribute('aria-label', `Eliminar ${item.nombre}`);
    quitar.addEventListener('click', () => solicitarBorrado(item));
    fila.append(quitar);

    // El control más utilizado va al final, separado del botón de borrar.
    const marcar = nodo('button', '✓', 'marcar' + (item.comprado ? ' marcado' : ''));
    marcar.type = 'button';
    marcar.setAttribute('aria-pressed', String(Boolean(item.comprado)));
    marcar.setAttribute('aria-label', `${item.comprado ? 'Desmarcar' : 'Marcar'} ${item.nombre} como comprado`);
    marcar.addEventListener('click', async () => {
      item.comprado = !item.comprado;
      await persistir();
    });
    fila.append(marcar);
    contenedor.append(fila);
  });

  const totales = calcularTotales(activa.items);
  $('total').textContent = moneda(totales.total);
  $('renglones').textContent = totales.renglones;
  $('cantidad-total').textContent = totales.cantidad.toLocaleString('es-AR');
  $('marcados').textContent = totales.marcados;
  $('avance').textContent = `${totales.marcados} de ${totales.renglones} marcados`;
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
  $('confirmar-borrado').addEventListener('change', evento => {
    preferencias.confirmarBorrado = evento.target.checked;
    guardarPreferencias();
  });
  $('permitir-deshacer').addEventListener('change', evento => {
    preferencias.permitirDeshacer = evento.target.checked;
    guardarPreferencias();
    if (!preferencias.permitirDeshacer) cerrarDeshacer();
  });
  $('cancelar-item').addEventListener('click', () => {
    borradoPendiente = null;
    $('confirmar-item').close();
  });
  $('confirmar-item').addEventListener('close', () => { borradoPendiente = null; });
  $('aceptar-item').addEventListener('click', async () => {
    const pendiente = borradoPendiente;
    $('confirmar-item').close();
    if (pendiente) {
      try { await borrarItem(pendiente.idLista, pendiente.idItem); }
      catch (error) { avisar(error.message); }
    }
  });
  $('deshacer-boton').addEventListener('click', () => deshacerBorrado().catch(error => avisar(error.message)));
  $('bienvenida-invitado').addEventListener('click', () => {
    try { localStorage.setItem(CLAVE_BIENVENIDA, 'invitado'); }
    catch (error) { console.warn('No se pudo recordar la elección:', error); }
    $('bienvenida').close();
  });
  // Sincronización manual: se preserva IndexedDB como fuente local.
  $('subir-listas').addEventListener('click', async () => {
    if (!confirm('¿Guardar una copia de tus listas actuales en la nube?')) return;
    try { const r = await subirListas(await obtenerTodos('listas')); avisar(`${r.guardadas} listas guardadas en la nube.`); }
    catch (error) { avisar(error.message); }
  });
  $('bajar-listas').addEventListener('click', async () => {
    try {
      const remotas = await bajarListas();
      const locales = await obtenerTodos('listas');
      const ids = new Set(locales.map(l => l.id));
      const nuevas = remotas.filter(l => !ids.has(l.id));
      const existentes = remotas.length - nuevas.length;
      if (!nuevas.length) return avisar('No hay listas nuevas para recuperar.');
      if (!confirm(`Se incorporarán ${nuevas.length} listas nuevas. ${existentes} ya existen en este dispositivo y no se reemplazarán. ¿Continuar?`)) return;
      for (const lista of nuevas) await guardar('listas', lista);
      listas = await obtenerTodos('listas'); renderizar();
      avisar(`${nuevas.length} listas recuperadas.`);
    } catch (error) { avisar(error.message); }
  });
  $('cerrar-sesion').addEventListener('click', async () => {
    try { await cerrarSesion(); avisar('Sesión cerrada. Tus listas locales se conservan.'); }
    catch (error) { avisar(error.message); }
  });
  $('abrir-config').addEventListener('click', () => $('panel-config').showModal());
  $('cerrar-config').addEventListener('click', () => $('panel-config').close());
  $('nueva-lista').addEventListener('click',async()=>{activa=crearLista();await persistir();mostrarPantalla(true);$('titulo').focus();});
  $('volver-listas').addEventListener('click',()=>mostrarPantalla(false));
  // Formato .mlis: copia portátil de una sola lista, independiente del catálogo.
  $('guardar-mlis').addEventListener('click', () => {
    if (!activa) return;
    const nombre = (activa.titulo || 'mi-lista').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9_-]+/gi,'-').replace(/^-|-$/g,'').slice(0,70) || 'mi-lista';
    const documento = { formato:'mi-changuito-lista', version:1, exportado:new Date().toISOString(), lista:activa };
    const blob = new Blob([JSON.stringify(documento,null,2)], {type:'application/json;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href=url; link.download=nombre+'.mlis'; document.body.append(link); link.click(); link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    avisar('Lista exportada en formato .mlis');
  });
  $('cargar-mlis').addEventListener('change', async e => {
    const archivo = e.target.files?.[0];
    try {
      if (!archivo) return;
      if (!archivo.name.toLowerCase().endsWith('.mlis')) throw new Error('Elegí un archivo .mlis');
      if (archivo.size > 2*1024*1024) throw new Error('El archivo supera los 2 MB.');
      const datos = JSON.parse(await archivo.text());
      if (datos?.formato !== 'mi-changuito-lista' || datos.version !== 1 || !datos.lista) throw new Error('Formato .mlis no reconocido.');
      const nueva = validarLista(datos.lista); // Genera UUID nuevos para no sobrescribir listas.
      await guardar('listas',nueva); listas=await obtenerTodos('listas'); activa=nueva;
      renderizar(); mostrarPantalla(true); avisar('Lista cargada correctamente.');
    } catch(error) { avisar(error instanceof SyntaxError?'Archivo .mlis dañado o inválido.':error.message); }
    finally { e.target.value=''; }
  });

  $('eliminar-lista').addEventListener('click',async()=>{
    if(!activa||!confirm(`¿Eliminar la lista «${activa.titulo}»?`))return;
    await eliminar('listas',activa.id);listas=await obtenerTodos('listas');activa=listas[0]??crearLista();await persistir();mostrarPantalla(false);
  });
  $('titulo').addEventListener('change',async e=>{activa.titulo=e.target.value.trim()||'Nueva lista';await persistir();});
  $('fecha').addEventListener('change',async e=>{if(e.target.value){activa.fecha=e.target.value;await persistir();}});
  $('categoria').addEventListener('change', renderizarCatalogo);
  $('alternar-productos').addEventListener('click', () => desplegarProductos($('panel-productos').hidden));
  $('incluir-otro').addEventListener('change', () => {
    mostrarCampoOtro();
    if ($('incluir-otro').checked) $('producto-libre').focus();
  });
  $('producto-libre').addEventListener('input', actualizarSeleccion);
  $('form-producto').addEventListener('submit', async evento => {
    evento.preventDefault();
    const catalogo = catalogos.find(c => c.categoria === $('categoria').value);
    const ids = [...$('producto-catalogo').querySelectorAll('input:checked')].map(c => c.value);
    const nuevos = ids.map(id => catalogo?.productos.find(p => p.id === id)).filter(Boolean);
    const libre = $('incluir-otro').checked ? $('producto-libre').value.trim() : '';
    if (libre) nuevos.push({ nombre: libre, unidad: 'un.' });
    if (!nuevos.length) return;
    for (const producto of nuevos) activa.items.push({
      id: crypto.randomUUID(), nombre: producto.nombre, cantidad: 1,
      unidad: producto.unidad || 'un.', precio: null, comprado: false
    });
    await persistir();
    renderizarCatalogo(); // Limpia los tildes y cierra el catálogo.
    avisar(`${nuevos.length} producto${nuevos.length === 1 ? '' : 's'} agregado${nuevos.length === 1 ? '' : 's'}.`);
  });
  $('exportar-catalogo').addEventListener('click',()=>descargarJSON('mi-changuito-catalogos.json',{version:1,tipo:'catalogos',catalogos}));
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
    const habiaListas = listas.length > 0;
    activa=listas[0]??crearLista();if(!listas.length)await guardar('listas',activa);
    cargarPreferencias();configurarEventos();renderizar();mostrarPantalla(false);
    // No se modifican ni migran las listas existentes.
    // Una instalación anterior con datos ya guardados entra directamente como invitado.
    let eleccion = null;
    try { eleccion = localStorage.getItem(CLAVE_BIENVENIDA); } catch (error) { console.warn(error); }
    if (!eleccion && habiaListas) {
      try { localStorage.setItem(CLAVE_BIENVENIDA, 'invitado'); } catch (error) { console.warn(error); }
    } else if (!eleccion) {
      $('bienvenida').showModal();
    }
    await iniciarCuenta(error => avisar(error));
    if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(console.warn);
  }catch(error){console.error(error);avisar('Error al iniciar: '+error.message);}
}
iniciar();
