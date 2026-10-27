'use strict';
const namingFields=['date','purpose','activity','separator','customSeparator','namingMode','author','year','paperTitle'];
let records=[];
function readNaming(){return Object.fromEntries(namingFields.map(id=>[id,$(id).value]))}
function loadNaming(data){for(const id of namingFields)$(id).value=data[id]??''}
function recordSeparator(d){return d.separator==='custom'?d.customSeparator.replace(/[<>:"/\\|?*\u0000-\u001f]/g,''):d.separator}
function recordBase(d){return d.namingMode==='literature'?`${clean(d.author)}（${d.year.trim()}）${clean(d.paperTitle)}`:[roc(d.date),clean(d.purpose),clean(d.activity)].join(recordSeparator(d))}
function recordError(d){if(d.namingMode==='literature'){if(!clean(d.author))return '請填入作者';if(!/^\d{4}$/.test(d.year.trim()))return '請填入四位數西元年份';if(!clean(d.paperTitle))return '請填入文獻名稱'}else{if(!d.date||Number(d.date.slice(0,4))<=1911)return '請選擇有效日期';if(!clean(d.activity))return '請填入活動名稱';if(!clean(d.purpose))return '看一下右側內容，再選擇這份文件的用途'}if(d.separator==='custom'&&d.namingMode!=='literature'&&!recordSeparator(d))return '請填入有效的自訂分隔符號';return ''}
function recordName(i){const r=records[i],raw=recordBase(r.data)+extension(r.file.name);const equal=records.filter(x=>(recordBase(x.data)+extension(x.file.name)).toLowerCase()===raw.toLowerCase());if(equal.length===1)return raw;const pos=equal.indexOf(r)+1;return recordBase(r.data)+(r.data.namingMode==='literature'?'-':recordSeparator(r.data))+String(pos).padStart(2,'0')+extension(r.file.name)}
function saveNaming(){if(!records[active])return;const data=readNaming();if(JSON.stringify(data)!==JSON.stringify(records[active].data)){records[active].data=data;records[active].confirmed=false}}
function goFile(index){if(busy||!records.length)return;saveNaming();active=Math.max(0,Math.min(index,records.length-1));loadNaming(records[active].data);drawBatch();preview();$('viewer').scrollIntoView({behavior:'smooth',block:'nearest'})}
function drawBatch(){
  const ready=records.filter(r=>r.confirmed&&!recordError(r.data)).length,all=records.length;
  $('progress').textContent=all?`已確認 ${ready} / ${all} 份`:'尚未加入檔案';
  $('list').replaceChildren();$('review').replaceChildren();
  records.forEach((r,i)=>{
    const row=document.createElement('div');row.className='file'+(i===active?' active':'');
    const pick=document.createElement('button');pick.className='select';pick.setAttribute('aria-current',i===active?'true':'false');
    const title=document.createElement('strong');title.textContent=`${i+1}. ${r.file.name}`;
    const detail=document.createElement('small');detail.textContent=(r.confirmed?'✓ 已確認':'○ 待命名')+' · '+(recordError(r.data)||recordName(i));pick.append(title,detail);pick.onclick=()=>goFile(i);
    const remove=document.createElement('button');remove.className='remove';remove.textContent='×';remove.setAttribute('aria-label','移除 '+r.file.name);remove.onclick=()=>{if(busy)return;saveNaming();records.splice(i,1);files.splice(i,1);if(i<active)active--;active=Math.max(0,Math.min(active,records.length-1));if(records[active])loadNaming(records[active].data);drawBatch();preview()};row.append(pick,remove);$('list').append(row);
    const review=document.createElement('button');review.className='review-row';const old=document.createElement('small');old.textContent=`${r.confirmed?'✓':'○'} ${r.file.name}`;const next=document.createElement('strong');next.textContent=recordError(r.data)?'尚未完成命名':recordName(i);review.append(old,next);review.onclick=()=>goFile(i);$('review').append(review);
  });
  const d=readNaming(),isLit=d.namingMode==='literature',error=recordError(d);
  $('adminFields').hidden=isLit;$('literatureFields').hidden=!isLit;$('customSeparator').hidden=d.separator!=='custom';
  $('roc').textContent=d.date?'民國 '+roc(d.date):'';
  $('name').textContent=records[active]?recordName(active):'加入檔案後，即可逐份命名';
  $('currentFile').textContent=records[active]?`第 ${active+1} / ${all} 份 · ${records[active].file.name}`:'加入檔案後，從清單選一份';
  $('validation').textContent=all?(error||(records[active].confirmed?'✓ 這份已確認，修改後需再次確認。':'命名資料已填妥，請確認內容與檔名。')):'可先填共同資料，再加入一批檔案。';
  $('confirmNext').disabled=busy||!all||!!error;$('prevFile').disabled=busy||active<=0;$('nextFile').disabled=busy||active>=all-1;
  $('nextPending').disabled=busy||!all||ready===all;$('applyCommon').disabled=busy||all<2;
  $('subfolderLabel').textContent='依各檔案的活動／作者建立子資料夾';
  $('export').disabled=busy||!all||ready!==all;$('export').textContent=all?`核對完成，匯出 ${all} 份檔案 ↗`:'另存並歸檔 ↗';
  $('guide').textContent=!all?'① 加入檔案：可一次拖入多份亂數檔名的掃描檔。':ready===all?'④ 全部確認完成！請核對原檔名與新檔名，選擇資料夾後匯出。':`② 同一場活動可先套用共同資料。③ 看右側預覽，替目前這份指定用途，再按「確認命名」。尚有 ${all-ready} 份待確認。`;
}
update=function(){saveNaming();drawBatch()};
add=function(incoming){if(busy)return;saveNaming();const common=readNaming(),start=files.length;for(const file of incoming){files.push(file);records.push({file,data:{...common,purpose:'',paperTitle:''},confirmed:false})}if(files.length>start){active=start;loadNaming(records[active].data)}drawBatch();preview();status('')};
render=function(){drawBatch();preview()};
for(const id of namingFields)$(id).addEventListener('input',()=>update());
$('prevFile').onclick=()=>goFile(active-1);$('nextFile').onclick=()=>goFile(active+1);
function pendingIndex(){for(let step=1;step<=records.length;step++){const i=(active+step)%records.length;if(!records[i].confirmed||recordError(records[i].data))return i}return -1}
$('nextPending').onclick=()=>{const i=pendingIndex();if(i>=0)goFile(i)};
$('confirmNext').onclick=()=>{if(busy||!records[active])return;saveNaming();const error=recordError(records[active].data);if(error){status(error);return}records[active].confirmed=true;const i=pendingIndex();if(i>=0)goFile(i);else{drawBatch();status('全部已確認，請核對匯出清單。');$('review').scrollIntoView({behavior:'smooth',block:'nearest'})}};
$('applyCommon').onclick=()=>{if(busy)return;saveNaming();const source=readNaming(),fields=source.namingMode==='literature'?['namingMode','author','year']:['namingMode','date','activity','separator','customSeparator'];if($('includePurpose').checked&&source.namingMode!=='literature')fields.push('purpose');let changed=0;for(const r of records){if(r===records[active])continue;let different=false;for(const key of fields){if(r.data[key]!==source[key]){r.data[key]=source[key];different=true}}if(different){r.confirmed=false;changed++}}drawBatch();status(`已將共同資料套用到 ${changed} 份檔案；請逐份確認。`)};
$('export').onclick=async()=>{
  if(busy)return;saveNaming();if(!records.length||records.some(r=>!r.confirmed||recordError(r.data))){drawBatch();status('請先確認每一份檔案的命名。');return}
  const snapshot=records.map((r,i)=>({file:r.file,name:recordName(i),folder:r.data.namingMode==='literature'?clean(r.data.author):clean(roc(r.data.date)+recordSeparator(r.data)+r.data.activity)}));
  const root=directory,withFolders=$('subfolder').checked;let done=0;busy=true;drawBatch();document.querySelector('.layout').inert=true;
  try{for(const item of snapshot){let dir=root;if(dir&&withFolders)dir=await dir.getDirectoryHandle(item.folder,{create:true});if(dir){const name=await unique(dir,item.name),handle=await dir.getFileHandle(name,{create:true}),stream=await handle.createWritable();try{await stream.write(item.file);await stream.close()}catch(e){await stream.abort().catch(()=>{});throw e}}else{const a=document.createElement('a'),url=URL.createObjectURL(item.file);a.href=url;a.download=item.name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)}done++;status(`正在處理 ${done} / ${snapshot.length} 份…`)}status(root?`✓ 已匯出 ${done} 份至「${root.name}」，原始檔案完整保留。`:`已送出 ${done} 個下載請求，請確認瀏覽器下載清單，並允許多檔下載。`)}catch(e){status(`已完成 ${done} 份，處理中斷：${e.message}。`)}finally{busy=false;document.querySelector('.layout').inert=false;drawBatch()}
};
drawBatch();
