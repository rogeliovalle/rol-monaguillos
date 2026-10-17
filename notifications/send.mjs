import webpush from 'web-push';
const {ROL_ENDPOINT,ROL_SCAN_KEY,VAPID_PUBLIC_KEY,VAPID_PRIVATE_KEY,VAPID_SUBJECT}=process.env;
if(!ROL_ENDPOINT||!ROL_SCAN_KEY||!VAPID_PUBLIC_KEY||!VAPID_PRIVATE_KEY||!VAPID_SUBJECT){console.log('Barrido pendiente de configuración. No se envió ningún aviso.');process.exit(0);}
if(!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(ROL_ENDPOINT))throw Error('Enlace de conexión inválido');
async function request(body){const response=await fetch(ROL_ENDPOINT,{method:'POST',redirect:'follow',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({...body,key:ROL_SCAN_KEY}),signal:AbortSignal.timeout(55000)});if(!response.ok)throw Error('El servicio de Google no respondió');const data=await response.json();if(!data.ok)throw Error('El servicio no pudo completar el barrido');return data;}
const data=await request({action:'scan'});let sent=0,failed=0;
for(const target of data.targets){const host=new URL(target.subscription.endpoint).hostname;const permitted=host.endsWith('.push.apple.com')||host==='fcm.googleapis.com'||host==='updates.push.services.mozilla.com'||host.endsWith('.notify.windows.com');if(!permitted){failed++;continue;}
 try{await webpush.sendNotification(target.subscription,JSON.stringify(target.payload),{vapidDetails:{subject:VAPID_SUBJECT,publicKey:VAPID_PUBLIC_KEY,privateKey:VAPID_PRIVATE_KEY},TTL:86400,timeout:15000});await request({action:'pushResult',endpoint:target.subscription.endpoint,signature:data.signature});sent++;}catch(error){if([404,410].includes(error.statusCode))await request({action:'pushResult',endpoint:target.subscription.endpoint,expired:true});else failed++;}}
// Nunca imprimir nombres, suscripciones ni claves en los registros del repositorio público.
console.log(`Avisos enviados: ${sent}. Intentos pendientes: ${failed}.`);if(failed)process.exitCode=1;
