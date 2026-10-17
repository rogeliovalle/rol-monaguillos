import {normalize,emptyState,recordKey,monthKey,defaultDay} from './model.js';
// Importación conservadora: conserva notas no reconocidas y separa las variantes históricas.
const KNOWN=[];
const ID=n=>'p-'+normalize(n).replace(/[^a-z0-9]+/g,'-');
const DISPLAY=n=>n;
export function parseTime(s){const m=String(s).match(/(\d{1,2}):(\d{2})\s*([AP])\.?\s*M\.?/i);if(!m)return null;let h=+m[1]%12;if(m[3].toUpperCase()==='P')h+=12;return `${String(h).padStart(2,'0')}:${m[2]}`;}
export function namesIn(s){const parts=String(s).split(/[,\n]|\s+[ye]\s+/i).map(x=>x.trim().replace(/^[ye]\s+/i,'').replace(/[.\s]+$/,''));return parts.filter(x=>KNOWN.some(n=>normalize(n)===normalize(x))||(!KNOWN.length&&!/^(misa|capilla|parroquia|sin |por asignar|no hay|nota|reunión|ensayo|celebración|domingo|lunes|martes|miércoles|jueves|viernes|sábado|rol |plantilla)/i.test(x)&&/^[A-ZÁÉÍÓÚÑÜ][a-záéíóúñü]+(?:\s+(?:(?:de|del|la|los|las)\s+)?[A-ZÁÉÍÓÚÑÜ][a-záéíóúñü]+){0,4}$/.test(x))).map(DISPLAY);}
function distance(a,b){const row=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let prev=row[0];row[0]=i;for(let j=1;j<=b.length;j++){const old=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));prev=old;}}return row[b.length];}
export function importSheets(sheets,extraNames=[]){for(const name of extraNames)if(!KNOWN.includes(name))KNOWN.push(name);const s=emptyState();const people=new Map();const up=(type,id,data)=>s.entities[recordKey(type,id)]={type,id,version:'source-v1',data};
 const remember=(name,active)=>{const id=ID(name);const p=people.get(id)||{id,name:DISPLAY(name),active:false,aliases:[]};p.active=p.active||active;if(name!==p.name){const accents=x=>(x.normalize('NFD').match(/[\u0300-\u036f]/g)||[]).length;if(accents(name)>accents(p.name)){if(!p.aliases.includes(p.name))p.aliases.push(p.name);p.name=name;}else if(!p.aliases.includes(name))p.aliases.push(name);}people.set(id,p);return id;};
 for(const src of sheets){const mat=src.values||[];const title=src.title||src.range?.split('!')[0].replaceAll("'",'')||'';const mt=title.match(/^(\S+)\s+(20\d{2})$/);const months=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];const month=mt?months.indexOf(normalize(mt[1])):-1;
  if(month<0){for(const row of mat)for(const cell of row)for(const name of namesIn(cell||''))remember(name,false);continue;}
  const year=+mt[2],key=monthKey(year,month);up('month',key,{key,year,month});
  const dateRows=[];for(let r=3;r<mat.length;r++)if((mat[r]||[]).some(v=>/^\d{1,2}$/.test(String(v||''))))dateRows.push(r);
  for(let wi=0;wi<dateRows.length;wi++){const start=dateRows[wi],end=dateRows[wi+1]||mat.length;
   for(let col=0;col<7;col++){const num=Number(mat[start]?.[col]);if(!num||num>31)continue;const date=`${key}-${String(num).padStart(2,'0')}`;const day={date,note:'',reviewed:false,masses:[]};let current=null;
    for(let r=start+1;r<end;r++){const segments=String(mat[r]?.[col]||'').trim().split('\n');for(const segment of segments){const text=segment.trim();if(!text||text==='Por asignar')continue;const time=parseTime(text);const names=namesIn(text);
     if(time){const clean=text.replace(/(?:Misa\s*)?\d{1,2}:\d{2}\s*[AP]\.?\s*M\.?/i,'').trim().replace(/^·\s*/,'');const lines=clean.split('\n').map(x=>x.trim()).filter(Boolean);current={id:`${date}-${day.masses.length}`,time,place:lines.find(x=>/^Capilla/i.test(x))||'Parroquia',title:lines.filter(x=>!/^Capilla/i.test(x)&&!names.includes(x)).join(' · '),note:'',personIds:[]};day.masses.push(current);}
     if(names.length){if(!current){current=defaultDay(date).masses[0]||{id:`${date}-0`,time:'19:00',place:'Parroquia',title:'',note:'',personIds:[]};day.masses.push(current);}for(const name of names){const id=remember(name,true);if(!current.personIds.includes(id))current.personIds.push(id);}if(!time){const extra=text.split('\n').filter(line=>line.trim()&&!namesIn(line).length).join('\n').trim();if(extra)current.note+=(current.note?'\n':'')+extra;}}
     if(!time&&!names.length){if(current&&/^Capilla/i.test(text))current.place=text;else if(current)current.note+=(current.note?'\n':'')+text;else day.note+=(day.note?'\n':'')+text;}
    }}
    day.reviewed=day.masses.some(m=>m.personIds.length>0)||!!day.note;up('day',date,day);
   }
  }
 }
 for(const p of people.values())up('person',p.id,p);
 for(const p of people.values()){if(p.active)continue;const candidates=[...people.values()].filter(a=>a.active&&Math.min(a.name.length,p.name.length)>=4&&normalize(a.name).slice(0,2)===normalize(p.name).slice(0,2)&&distance(normalize(a.name),normalize(p.name))<=2);const ids=candidates.length?[candidates[0].id,p.id]:[p.id];const id='revisar-'+p.id;up('review',id,{id,ids,note:candidates.length?'Variante encontrada en una pestaña histórica. Confirma si es la misma persona.':'Aparece en una pestaña histórica, pero no en el rol mensual. Confirma si sigue activo.',resolved:false});}
 s.history=[{id:'importacion-inicial',at:new Date().toISOString(),label:'Carga inicial desde los roles; variantes históricas pendientes de revisión',type:'import'}];return s;
}
