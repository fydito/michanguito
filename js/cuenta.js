/**
 * Mi Changuito · Cuenta Google y transferencia explícita de listas.
 * El token de sesión se conserva en sessionStorage, nunca en IndexedDB ni en las listas.
 * Google autentica; DonWeb verifica el ID token y entrega la sesión propia.
 */
const API = 'https://sigri.com.ar/michanguito/api/';
const GOOGLE_CLIENT_ID = '746124312849-487muorfltjei26pjkdmh7tnr0r4snpb.apps.googleusercontent.com';
const KEY = 'mc_sesion';
let sesion = null;
const $ = id => document.getElementById(id);

/** Envía JSON y transforma errores HTTP en mensajes legibles. */
async function solicitar(ruta, metodo = 'GET', datos = undefined) {
  const headers = { 'Content-Type': 'application/json' };
  if (sesion?.token) headers.Authorization = `Bearer ${sesion.token}`;
  const respuesta = await fetch(API + ruta, { method: metodo, headers,
    body: datos === undefined ? undefined : JSON.stringify(datos), cache: 'no-store' });
  const cuerpo = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) throw new Error(cuerpo.error || `Error HTTP ${respuesta.status}`);
  return cuerpo;
}

function actualizarCuenta() {
  const conectado = Boolean(sesion?.user);
  $('cuenta-estado').textContent = conectado ? `Conectado: ${sesion.user.nombre}` : 'Estás usando Mi Changuito como invitado';
  $('cuenta-ayuda').textContent = conectado
    ? `${sesion.user.email}. Las listas siguen guardándose localmente. Podés subirlas o recuperarlas cuando quieras.`
    : 'Tus listas se guardan en este dispositivo. Iniciá sesión para guardarlas en la nube.';
  $('cuenta-acciones').hidden = !conectado;
  $('google-config').hidden = conectado;
}

/** Conserva el estado de acceso únicamente durante la sesión del navegador. */
async function autenticar(credential) {
  const respuesta = await solicitar('login.php', 'POST', { credential });
  sesion = { token: respuesta.token, user: respuesta.user };
  sessionStorage.setItem(KEY, JSON.stringify(sesion));
  localStorage.setItem('mi-changuito-bienvenida-v1', 'google');
  if ($('bienvenida').open) $('bienvenida').close();
  actualizarCuenta();
  window.dispatchEvent(new Event('mc-cuenta-conectada'));
  return respuesta.user;
}

/** Carga el botón oficial de Google sin recrear el flujo de OAuth manualmente. */
function prepararBotones(onError) {
  let intentos = 0;
  // La biblioteca de Google se carga externamente; esperamos hasta 10 segundos.
  const esperar = () => {
    if (!window.google?.accounts?.id) {
      if (++intentos < 40) return setTimeout(esperar, 250);
      onError('No se pudo cargar Google. Revisá la conexión a Internet.');
      return;
    }
    google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID,
      callback: async respuesta => {
        try { await autenticar(respuesta.credential); }
        catch (error) { onError(error.message); }
      } });
    for (const id of ['google-bienvenida','google-config']) {
      google.accounts.id.renderButton($(id), { theme: 'outline', size: 'large',
        text: 'continue_with', width: 280, locale: 'es' });
    }
  };
  esperar();
}

/** Valida la sesión previa sin dar por válido un token vencido. */
export async function iniciarCuenta(onError) {
  try {
    const guardada = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    if (guardada?.token && guardada?.user) {
      sesion = guardada;
      const actual = await solicitar('me.php');
      sesion.user = actual.user;
    }
  } catch (_) { sesion = null; sessionStorage.removeItem(KEY); }
  actualizarCuenta();
  prepararBotones(onError);
}

export function conectado() { return Boolean(sesion?.token); }
export async function cerrarSesion() {
  try { if (sesion) await solicitar('logout.php', 'POST'); }
  finally { sesion = null; sessionStorage.removeItem(KEY); actualizarCuenta(); }
}

/** Subida explícita: nunca sustituye automáticamente listas locales. */
export async function subirListas(listas) {
  if (!conectado()) throw new Error('Iniciá sesión primero.');
  return solicitar('sync.php', 'POST', { listas });
}

/** Descarga para combinar por ID, sin eliminar listas locales. */
export async function bajarListas() {
  if (!conectado()) throw new Error('Iniciá sesión primero.');
  return (await solicitar('sync.php')).listas;
}

/** API autenticada para módulos adicionales, sin exponer la sesión. */
export function solicitarCuenta(ruta,metodo='GET',datos=undefined){return solicitar(ruta,metodo,datos);}
