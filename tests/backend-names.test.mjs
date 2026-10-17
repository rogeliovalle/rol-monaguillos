import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function backend(){
  let version=0;
  const context={Utilities:{getUuid:()=>`version-${++version}`}};
  vm.createContext(context);
  for(const file of ['dist/model.js','dist/importer.js','backend/sync-core.js','backend/bridge.gs']){
    const source=fs.readFileSync(new URL('../'+file,import.meta.url),'utf8').replace(/^import .*?;\n/gm,'').replace(/export /g,'');
    vm.runInContext(source,context);
  }
  context.hashes_=()=>({});
  context.monthHash_=()=>'changed';
  return context;
}
const person=(id,name,extra={})=>({type:'person',id,version:'v1',data:{id,name,active:true,aliases:[],...extra}});
function nativeBook(text){
  const rows=[['Rol'],['OCTUBRE 2026'],[],[null,'12'],[null,'7:00 P.M.'],[null,text]];
  const sheet={getName:()=>'Octubre 2026',getLastRow:()=>rows.length,getRange:()=>({getDisplayValues:()=>rows})};
  return {getSheets:()=>[sheet]};
}
function dayRecord(context,date='2026-10-12'){
  const data=context.defaultDay(date);
  data.reviewed=true;
  data.masses[0].id='stable-mass-id';
  data.masses[0].personIds=['main','other'];
  return {type:'day',id:date,version:'v1',data};
}

test('Reimportar un nombre anterior tras renombrarlo conserva asignación, alias e identidad de misa',()=>{
  const context=backend();
  const main=person('main','Lucía Nueva',{aliases:['Lucia']});
  const records={'person:main':main,'person:other':person('other','Marco'),'day:2026-10-12':dayRecord(context)};
  context.refreshNative_(nativeBook('Lucia, Marco'),records);
  const day=records['day:2026-10-12'].data;
  assert.deepEqual(Array.from(day.masses[0].personIds),['main','other']);
  assert.equal(day.masses[0].id,'stable-mass-id');
  assert.equal(day.reviewed,true);
  assert.deepEqual(main.data.aliases,['Lucia']);
  assert.equal(Object.values(records).filter(e=>e.type==='person').length,2);
});

test('La importación resuelve un alias fusionado primero en la lista hacia su principal activo',()=>{
  const context=backend();
  const records={
    'person:alias':person('alias','Lucia',{active:false,mergedInto:'intermediate'}),
    'person:intermediate':person('intermediate','Lucía Antigua',{active:false,mergedInto:'main'}),
    'person:main':person('main','Lucía Nueva'),
    'person:other':person('other','Marco'),
    'day:2026-10-12':dayRecord(context)
  };
  context.refreshNative_(nativeBook('Lucia, Marco'),records);
  assert.deepEqual(Array.from(records['day:2026-10-12'].data.masses[0].personIds),['main','other']);
  assert.equal(records['person:alias'].data.active,false);
});

test('Las fusiones cíclicas o sin destino detienen la importación sin reemplazar el día',()=>{
  for(const target of ['alias','missing']){
    const context=backend();
    const original=dayRecord(context);
    const records={'person:alias':person('alias','Lucia',{active:false,mergedInto:target}),'day:2026-10-12':original};
    assert.throws(()=>context.refreshNative_(nativeBook('Lucia'),records),/ciclo|Falta el nombre principal/);
    assert.equal(records['day:2026-10-12'],original);
  }
});

test('Una sincronización que solo renombra a una persona vuelve a renderizar todos los meses con días',()=>{
  const context=backend(),rendered=[];
  const records={'person:main':person('main','Lucia'),'day:2026-10-12':dayRecord(context),'day:2026-11-02':dayRecord(context,'2026-11-02')};
  const range={setNumberFormat(){return this;},setValues(){return this;},clearContent(){return this;}};
  const auxiliary={getLastRow:()=>1,getMaxRows:()=>100,getRange:()=>range,appendRow(){}};
  const book={getSheetByName:()=>auxiliary};
  context.ensureStore_=()=>({});
  context.records_=()=>records;
  context.refreshNative_=()=>{};
  context.saveRecords_=()=>{};
  context.saveHashes_=()=>{};
  context.renderMonth_=(_book,_records,key)=>rendered.push(key);
  context.PropertiesService={getScriptProperties:()=>({getProperty:()=>''})};
  const result=context.syncRequest_(book,{device:'Test',changes:[{type:'person',id:'main',baseVersion:'v1',baseData:records['person:main'].data,mutationId:'rename',data:{...records['person:main'].data,name:'Lucía Nueva',aliases:['Lucia']}}]});
  assert.deepEqual(rendered.sort(),['2026-10','2026-11']);
  assert.equal(result.conflicts.length,0);
  assert.equal(records['person:main'].data.name,'Lucía Nueva');
});

test('Fusionar o archivar también invalida meses; guardar una persona sin diferencias no los invalida',()=>{
  const context=backend();
  const records={'day:2026-10-12':dayRecord(context),'day:2026-11-02':dayRecord(context,'2026-11-02')};
  for(const after of [{name:'Lucia',mergedInto:'main'},{name:'Lucia',archived:true,active:false}]){
    assert.deepEqual(Array.from(context.touchedMonths_(records,[{type:'person',before:{name:'Lucia'},after}])).sort(),['2026-10','2026-11']);
  }
  assert.equal(context.touchedMonths_(records,[{type:'person',before:{name:'Lucia'},after:{name:'Lucia'}}]).size,0);
});
