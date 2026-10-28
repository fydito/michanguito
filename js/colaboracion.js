/** Mi Changuito · sincronización colaborativa optativa, sin tocar respaldos. */
import { guardar, obtenerTodos } from './storage.js';
import { solicitarCuenta, conectado } from './cuenta.js';
const KEY='mc_colab_pendientes_v1';
let pending=[];let snapshots=new Map();let busy=false;let avisar=()=>{};let refrescar=()=>{};
const clone=x=>JSON.parse(JSON.stringify(x));
function cargar(){try{pending=JSON.parse(localStorage.getItem(KEY)||'[]');if(!Array.isArray(pending))pending=[];}catch{pending=[];}}
function save(){localStorage.setItem(KEY,JSON.stringify(pending));}
const api=(action,data)=>solicitarCuenta(`colab.php?accion=${action}` ,data===undefined?'GET':'POST',data);
function itemMap(lista){return new Map((lista.items||[]).map(x=>[x.id,x]));}
function campoVersion(remoto,id,campo){return remoto?.items?.find(i=>i.id===id)?.campos?.[campo]?.version ?? (remoto?.items?.some(i=>i.id===id)?1:0);}
function localFromRemote(remote,old){return {id:remote.uuid,titulo:remote.titulo,fecha:old?.fecha||new Date().toISOString().slice(0,10),categoria:old?.categoria||'almacen',visibilidad:'compartida',colabId:remote.id,permiso:remote.permiso,items:remote.items.filter(i=>!i.eliminado).map(i=>({id:i.id,nombre:i.nombre,cantidad:i.cantidad,precio:i.precio,comprado:i.comprado,unidad:i.unidad||'un.'}))};}
export function iniciarColaboracion(onAviso,onRefresh){avisar=onAviso;refrescar=onRefresh;cargar();window.addEventListener('online',()=>actualizarColaboracion());setInterval(()=>{if(document.visibilityState==='visible')actualizarColaboracion().catch(console.warn);},6000);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')actualizarColaboracion().catch(console.warn);});}
export async function compartirLista(lista){if(!conectado())throw Error('Iniciá sesión con Google primero.');const r=await api('crear',{lista});const local={...lista,colabId:r.lista.id,visibilidad:'compartida',permiso:'propietario'};await guardar('listas',local);snapshots.set(local.id,r.lista);return r.lista;}
export async function aceptarInvitacion(token){if(!conectado())throw Error('Iniciá sesión para aceptar la invitación.');const r=await api('aceptar',{token});const local=localFromRemote(r.lista);await guardar('listas',local);snapshots.set(local.id,r.lista);return local;}
export function registrarCambios(lista){if(!lista?.colabId)return;const remote=snapshots.get(lista.id);if(!remote)return;const before=new Map(remote.items.filter(i=>!i.eliminado).map(i=>[i.id,i]));const now=itemMap(lista);
 const fields=['nombre','cantidad','precio','comprado','unidad'];
 function enqueue(id,campo,valor){const existing=pending.find(p=>p.lista===lista.colabId&&p.item===id&&p.campo===campo);if(existing){existing.valor=valor;return;}pending.push({lista:lista.colabId,item:id,campo,valor,base:campoVersion(remote,id,campo),operacion:crypto.randomUUID()});}
 pending=pending.filter(p=>p.lista!==lista.colabId || (p.campo==='eliminado'?!now.has(p.item):now.has(p.item)));
 for(const [id,item] of now){const old=before.get(id);if(!old){enqueue(id,'nombre',item.nombre);for(const campo of fields.slice(1)){if(item[campo]!==({cantidad:1,precio:null,comprado:false,unidad:'un.'})[campo])enqueue(id,campo,item[campo]);}continue;}for(const campo of fields)if(item[campo]!==old[campo])enqueue(id,campo,item[campo]);}
 for(const [id] of before)if(!now.has(id))enqueue(id,'eliminado',true);
 pending=pending.filter(p=>{if(p.lista!==lista.colabId)return true;const item=now.get(p.item);const original=before.get(p.item);if(p.campo==='eliminado')return !item;return item && (!original || item[p.campo]!==original[p.campo]);});save();actualizarColaboracion().catch(console.warn);
}
async function flush(){while(pending.length){const op=pending[0];let result;try{result=await api('operar',op);}catch(e){if(navigator.onLine)console.warn('Colaboración pendiente:',e.message);return false;}
 if(result.estado==='conflicto'){
  const keep=confirm(`Otro cambio en «${op.campo}» fue realizado por ${result.autor}.\nValor guardado: ${result.actual ?? 'sin precio'}\nTu valor: ${op.valor ?? 'sin precio'}\n\nAceptar: conservar tu valor.\nCancelar: conservar el valor de ${result.autor}.`);
  if(keep){op.base=result.version;op.operacion=crypto.randomUUID();save();continue;}
 }
 pending.shift();if(op.campo==='nombre'&&op.base===0){for(const next of pending)if(next.lista===op.lista&&next.item===op.item&&next.base===0)next.base=1;}save();
 // Releer el servidor tras cada operación aplicada: evita calcular versiones sobre datos viejos.
 }
 return true;
}
export async function actualizarColaboracion(){if(busy||!conectado()||!navigator.onLine)return;busy=true;try{
 const catalog=await api('listas');const local=await obtenerTodos('listas');
 for(const meta of catalog.listas){const id=Number(meta.id);const old=local.find(l=>l.colabId===id||l.id===meta.uuid);if(!old||!old.colabId){const remote=(await solicitarCuenta(`colab.php?accion=estado&lista=${id}`)).lista;const normalized=localFromRemote(remote,old);await guardar('listas',normalized);snapshots.set(normalized.id,remote);continue;}
 const remote=(await solicitarCuenta(`colab.php?accion=estado&lista=${id}`)).lista;snapshots.set(old.id,remote);
 }
 // La cola solo se vacía después de disponer de versiones actualizadas.
 if(pending.length){await flush();}
 const current=await obtenerTodos('listas');
 for(const meta of catalog.listas){const old=current.find(l=>l.colabId===Number(meta.id));if(!old)continue;
 const remote=(await solicitarCuenta(`colab.php?accion=estado&lista=${meta.id}`)).lista;snapshots.set(old.id,remote);
 if(pending.some(p=>p.lista===Number(meta.id)))continue;
 const normalized=localFromRemote(remote,old);
 if(JSON.stringify(normalized)!==JSON.stringify(old)){await guardar('listas',normalized);refrescar();}
 }
 }catch(e){console.warn('Sincronización colaborativa:',e.message);}finally{busy=false;}}
