/**
 * Proyecto: Mi Changuito
 * Archivo: tema.js
 * Autor: Jordan Molinari
 * Versión: 0.1.5 | Fecha: 22/10/2026
 *
 * Descripción:
 * Administra cuatro colores y modos día/noche.
 * La elección se conserva en localStorage y se aplica a todas las pantallas.
 */

const CLAVE = 'mi-changuito-apariencia';
const COLORES = ['verde', 'azul', 'violeta', 'terracota'];
const MODOS = ['dia', 'noche'];
const INICIAL = { tema: 'verde', modo: 'dia' };

/**
 * Lee y valida las preferencias para evitar valores no admitidos.
 * @returns {{tema:string, modo:string}} Apariencia válida.
 */
function recuperarApariencia() {
  try {
    const guardada = JSON.parse(localStorage.getItem(CLAVE) || '{}');
    return {
      tema: COLORES.includes(guardada.tema) ? guardada.tema : INICIAL.tema,
      modo: MODOS.includes(guardada.modo) ? guardada.modo : INICIAL.modo
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
  document.querySelectorAll('[data-elegir-tema]').forEach(boton => {
    const activo = boton.dataset.elegirTema === apariencia.tema;
    boton.setAttribute('aria-pressed', String(activo));
    boton.classList.toggle('seleccionado', activo);
  });
  document.querySelectorAll('[name="modo-apariencia"]').forEach(radio => {
    radio.checked = radio.value === apariencia.modo;
  });
  const coloresBarra = {
    verde: '#147d66', azul: '#2864ba',
    violeta: '#7750a6', terracota: '#ad593b'
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
