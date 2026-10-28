/** Directorio e invitaciones internas. No se envían enlaces ni correos externos. */
import { solicitarCuenta, conectado } from './cuenta.js';
const $=id=>document.getElementById(id);
const api=(accion,datos)=>solicitarCuenta('contactos.php?accion='+accion,datos===undefined?'GET':'POST',datos);
let listaActiva=()=>null,avisar=()=>{},alAceptar=()=>{};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let timer=null;
async function cargarUsuarios(){
 const q=$('buscar-usuario').value.trim();const r=await api('usuarios&q='+encodeURIComponent(q));
 const frecuentes=new Set(r.frecuentes.map(x=>Number(x.id)));
 function render(items){return items.map(u=>`<div class="contacto-fila"><span><strong>${esc(u.nombre)}</strong><small>${esc(u.email)}</small></span><button class="boton pequeno" data-invitar="${Number(u.id)}" type="button">Invitar</button></div>`).join('')||'<p class="ayuda">Sin resultados.</p>';}
 $('usuarios-frecuentes').innerHTML=render(r.frecuentes.filter(u=>!q||(`${u.nombre} ${u.email}`).toLowerCase().includes(q.toLowerCase())));
 $('usuarios-registrados').innerHTML=render(r.usuarios.filter(u=>!frecuentes.has(Number(u.id))));
}
async function cargarPendientes(){
 if(!conectado()){$('notificaciones').hidden=true;return;}
 const r=await api('pendientes');const items=r.invitaciones;
 $('notificaciones').hidden=false;$('contador-invitaciones').textContent=items.length?String(items.length):'';
 $('invitaciones-pendientes').innerHTML=items.map(i=>`<div class="contacto-fila"><span><strong>${esc(i.remitente)}</strong> compartió <strong>${esc(i.lista_nombre)}</strong><small>Permiso: ${i.permiso==='editar'?'Edición completa':'Solo compras'}</small></span><span class="invitacion-acciones"><button class="boton pequeno" data-respuesta="aceptar" data-id="${Number(i.id)}">Aceptar</button><button class="boton pequeno secundario" data-respuesta="rechazar" data-id="${Number(i.id)}">Rechazar</button></span></div>`).join('')||'<p class="ayuda">No tenés invitaciones pendientes.</p>';
}
export function iniciarInvitaciones(obtenerLista,onAviso,onAceptar){
 listaActiva=obtenerLista;avisar=onAviso;alAceptar=onAceptar;
 $('abrir-invitaciones').addEventListener('click',async()=>{try{await cargarPendientes();$('dialogo-invitaciones').showModal();}catch(e){avisar(e.message);}});
 $('cerrar-invitaciones').addEventListener('click',()=>$('dialogo-invitaciones').close());
 $('cerrar-compartir').addEventListener('click',()=>$('dialogo-compartir').close());
 $('buscar-usuario').addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>cargarUsuarios().catch(e=>avisar(e.message)),250);});
 $('dialogo-compartir').addEventListener('click',async e=>{const b=e.target.closest('[data-invitar]');if(!b)return;const l=listaActiva();if(!l?.colabId)return; b.disabled=true;try{await api('invitar',{lista:l.colabId,usuario:Number(b.dataset.invitar),permiso:'editar'});avisar('Invitación enviada. La persona deberá aceptarla.');$('dialogo-compartir').close();}catch(err){avisar(err.message);}finally{b.disabled=false;}});
 $('dialogo-invitaciones').addEventListener('click',async e=>{const b=e.target.closest('[data-respuesta]');if(!b)return;b.disabled=true;try{await api('responder',{invitacion:Number(b.dataset.id),respuesta:b.dataset.respuesta});await cargarPendientes();if(b.dataset.respuesta==='aceptar'){await alAceptar();avisar('Lista compartida incorporada.');}else avisar('Invitación rechazada.');}catch(err){avisar(err.message);}finally{b.disabled=false;}});
 window.addEventListener('mc-cuenta-conectada',()=>cargarPendientes().catch(console.warn));
 setInterval(()=>{if(document.visibilityState==='visible'&&conectado())cargarPendientes().catch(console.warn);},15000);
 cargarPendientes().catch(console.warn);
}
export async function mostrarCompartir(){if(!conectado())throw Error('Iniciá sesión con Google para compartir.');$('buscar-usuario').value='';await cargarUsuarios();$('dialogo-compartir').showModal();}
