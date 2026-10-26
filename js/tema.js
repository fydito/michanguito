/**
 * Proyecto: Mi Changuito
 * Archivo: tema.js
 * Autor: Jordan Molinari
 * Versión: 0.1.9 | Fecha: 22/10/2026
 *
 * Descripción:
 * Administra ocho colores y modos día/noche.
 * La elección se conserva en localStorage y se aplica a todas las pantallas.
 */

const CLAVE = 'mi-changuito-apariencia';
const COLORES = ['verde', 'azul', 'violeta', 'terracota', 'rubi', 'electrico', 'solar', 'rosa'];
const MODOS = ['dia', 'noche'];
const ESTILOS = ['clasico', 'colorido'];
const INICIAL = { tema: 'verde', modo: 'dia', estilo: 'clasico' };

/**
 * Lee y valida las preferencias para evitar valores no admitidos.
 * @returns {{tema:string, modo:string}} Apariencia válida.
 */
function recuperarApariencia() {
  try {
    const guardada = JSON.parse(localStorage.getItem(CLAVE) || '{}');
    return {
      tema: COLORES.includes(guardada.tema) ? guardada.tema : INICIAL.tema,
      modo: MODOS.includes(guardada.modo) ? guardada.modo : INICIAL.modo,
      estilo: ESTILOS.includes(guardada.estilo) ? guardada.estilo : INICIAL.estilo
    };
  } catch (error) {
    console.warn('No fue posible leer la apariencia:', error);
    return { ...INICIAL };
  }
}

/**
 * Actualiza colores, indicadores accesibles y preferencia persistida.
 * @param {{tema:string, modo:string}} apariencia - Preferencias seleccionadas.
 */
function aplicarApariencia(apariencia) {
  document.documentElement.dataset.tema = apariencia.tema;
  document.documentElement.dataset.modo = apariencia.modo;
  document.documentElement.dataset.estilo = apariencia.estilo;
  document.querySelectorAll('[data-elegir-tema]').forEach(boton => {
    const activo = boton.dataset.elegirTema === apariencia.tema;
    boton.setAttribute('aria-pressed', String(activo));
    boton.classList.toggle('seleccionado', activo);
  });
  document.querySelectorAll('[name="modo-apariencia"]').forEach(radio => {
    radio.checked = radio.value === apariencia.modo;
  });
  document.querySelectorAll('[name="estilo-apariencia"]').forEach(radio => {
    radio.checked = radio.value === apariencia.estilo;
  });
  const coloresBarra = {
    verde: '#147d66', azul: '#2864ba',
    violeta: '#7750a6', terracota: '#ad593b',
    rubi: '#c62842', electrico: '#00a2ff', solar: '#f4c430', rosa: '#ce6496'
  };
  document.querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', apariencia.modo === 'noche' ? '#17201f' : coloresBarra[apariencia.tema]);
  try {
    localStorage.setItem(CLAVE, JSON.stringify(apariencia));
  } catch (error) {
    console.warn('No fue posible guardar la apariencia:', error);
  }
}

/** Vincula controles del engranaje con el tema actual. */
function iniciarApariencia() {
  const apariencia = recuperarApariencia();
  aplicarApariencia(apariencia);
  document.querySelectorAll('[data-elegir-tema]').forEach(boton => {
    boton.addEventListener('click', () => {
      apariencia.tema = boton.dataset.elegirTema;
      aplicarApariencia(apariencia);
    });
  });
  document.querySelectorAll('[name="estilo-apariencia"]').forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.checked) {
        apariencia.estilo = radio.value;
        aplicarApariencia(apariencia);
      }
    });
  });
  document.querySelectorAll('[name="modo-apariencia"]').forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.checked) {
        apariencia.modo = radio.value;
        aplicarApariencia(apariencia);
      }
    });
  });
}
iniciarApariencia();

// Preferencia local de accesibilidad: cuatro niveles independientes del tema.
(function iniciarTamanoTexto(){
  const control=document.getElementById('tamano-texto');
  const salida=document.getElementById('etiqueta-tamano');
  if(!control || !salida) return;
  const nombres=['Normal','Grande','Muy grande','Extra grande'];
  const clave='mi-changuito-tamano-texto';
  let valor=0;
  try { valor=Number(localStorage.getItem(clave)); } catch {}
  if(!Number.isInteger(valor) || valor<0 || valor>3) valor=0;
  const aplicar=n=>{
    document.documentElement.dataset.tamanoTexto=String(n);
    control.value=String(n); salida.textContent=nombres[n];
    try { localStorage.setItem(clave,String(n)); } catch {}
  };
  aplicar(valor);
  control.addEventListener('input',()=>aplicar(Number(control.value)));
})();
