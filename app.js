'use strict';
const $=id=>document.getElementById(id);
let files=[],active=0,directory=null,busy=false,previewUrl=null,previewVersion=0;
let previewStage=null,previewScale=1,previewX=0,previewY=0,zoomEnabled=false,previewDrag=null;
const dateString=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const roc=value=>{const [y,m,d]=value.split('-');return `${Number(y)-1911}.${m}.${d}`};
const clean=s=>s.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g,'').replace(/[. ]+$/g,'');
const extension=name=>{const pos=name.lastIndexOf('.');return pos>0?name.slice(pos):''};
function separator(){return $('separator').value==='custom'?$('customSeparator').value.replace(/[<>:"/\\|?*\u0000-\u001f]/g,''):$('separator').value}
function literature(){return $('namingMode').value==='literature'}
function base(){return literature()?`${clean($('author').value)}（${$('year').value.trim()}）${clean($('paperTitle').value)}`:[roc($('date').value),clean($('purpose').value),clean($('activity').value)].join(separator())}
function target(file,i){return base()+(files.length>1?`${literature()?'-':separator()}${String(i+1).padStart(2,'0')}`:'')+extension(file.name)}
function update(){const dateValid=$('date').value&&Number($('date').value.slice(0,4))>1911;const valid=literature()?!!(clean($('author').value)&&/^\d{4}$/.test($('year').value.trim())&&clean($('paperTitle').value)):!!(dateValid&&clean($('purpose').value)&&clean($('activity').value));$('roc').textContent=dateValid?'民國 '+roc($('date').value):'請選擇有效日期';$('name').textContent=files.length?target(files[active],active):base()+'.pdf';$('export').disabled=busy||!files.length||!valid;$('adminFields').hidden=literature();$('literatureFields').hidden=!literature();$('customSeparator').hidden=$('separator').value!=='custom';$('subfolderLabel').textContent=literature()?'依作者建立子資料夾':'依活動建立子資料夾';}
function status(s){$('status').textContent=s}
function add(incoming){files.push(...incoming);render();status('');}
function render(){active=Math.max(0,Math.min(active,files.length-1));$('list').replaceChildren();files.forEach((file,i)=>{const row=document.createElement('div');row.className='file'+(i===active?' active':'');const select=document.createElement('button');select.className='select';const strong=document.createElement('strong');strong.textContent=file.name;const small=document.createElement('small');small.textContent=`${(file.size/1024).toFixed(1)} KB · 點選預覽`;select.append(strong,small);select.onclick=()=>{active=i;render()};const remove=document.createElement('button');remove.className='remove';remove.textContent='×';remove.setAttribute('aria-label','移除 '+file.name);remove.onclick=()=>{files.splice(i,1);render()};row.append(select,remove);$('list').append(row)});preview();update();}
async function preview(){} // preview-engine.js 提供本機預覽與 PDF 繪製。
$('date').value=dateString(new Date());
for(const id of ['date','purpose','activity','separator','customSeparator','namingMode','author','year','paperTitle'])$(id).addEventListener('input',update);
function offset(days,fromToday=false){const d=fromToday?new Date():new Date($('date').value+'T12:00:00');d.setDate(d.getDate()+days);$('date').value=dateString(d);update()}
$('prev').onclick=()=>offset(-1);$('next').onclick=()=>offset(1);$('dates').onclick=e=>{if(e.target.dataset.days!==undefined)offset(Number(e.target.dataset.days),true)};
$('purposeChips').onclick=e=>{if(e.target.tagName==='BUTTON'){$('purpose').value=e.target.textContent;update()}};
$('pick').onclick=()=>$('files').click();$('files').onchange=e=>{add(e.target.files);e.target.value=''};
for(const type of ['dragover','dragleave','drop'])$('drop').addEventListener(type,e=>{e.preventDefault();$('drop').classList.toggle('over',type==='dragover');if(type==='drop')add(e.dataTransfer.files)});
$('chooseDir').onclick=async()=>{if(!window.showDirectoryPicker){status('此瀏覽器無法直接指定資料夾。請改用 Chrome／Edge；仍可使用匯出下載。');return}try{directory=await window.showDirectoryPicker({mode:'readwrite'});$('directory').textContent='儲存位置：'+directory.name;status('資料夾已連結，本次開啟期間可重複匯出。')}catch(e){if(e.name!=='AbortError')status('無法連結資料夾：'+e.message)}};
async function unique(dir,name){let n=1,candidate=name;const ext=extension(name),stem=ext?name.slice(0,-ext.length):name;while(true){try{await dir.getFileHandle(candidate);candidate=`${stem} (${++n})${ext}`}catch(e){if(e.name==='NotFoundError')return candidate;throw e}}}
$('export').onclick=async()=>{busy=true;update();$('pick').disabled=true;$('chooseDir').disabled=true;const snapshot=files.map((file,i)=>({file,name:target(file,i)}));let done=0;try{let dir=directory;if(dir&&$('subfolder').checked)dir=await dir.getDirectoryHandle((literature()?clean($('author').value):clean(roc($('date').value)+separator()+$('activity').value)),{create:true});for(const item of snapshot){if(dir){const name=await unique(dir,item.name);const handle=await dir.getFileHandle(name,{create:true});const writable=await handle.createWritable();try{await writable.write(item.file);await writable.close()}catch(e){await writable.abort().catch(()=>{});throw e}}else{const a=document.createElement('a');const url=URL.createObjectURL(item.file);a.href=url;a.download=item.name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)}done++}status(dir?`已匯出 ${done} 個檔案至「${dir.name}」。原始檔案已保留。`:`已送出 ${done} 個下載請求，請確認瀏覽器下載清單；多檔下載可能需要允許。若要直接歸檔，請先選擇匯出資料夾。`)}catch(e){status(`已完成 ${done} 個；匯出中斷：${e.message}。請檢查資料夾權限或剩餘空間。`)}finally{busy=false;$('pick').disabled=false;$('chooseDir').disabled=false;update()}};
update();

function updateClock(){
const now=new Date();
const heading=document.getElementById('dashboardDate');
if(heading)heading.textContent=`${now.getMonth()+1} 月 ${now.getDate()} 日　${['星期日','星期一','星期二','星期三','星期四','星期五','星期六'][now.getDay()]}`;
const clock=document.getElementById('clock');
if(clock)clock.textContent=now.toLocaleTimeString('zh-TW',{hour12:false});
}
updateClock();setInterval(updateClock,1000);
function paintPreviewZoom(){
  if(previewStage)previewStage.style.transform=`translate(${previewX}px,${previewY}px) scale(${previewScale})`;
  $('zoomLevel').textContent=Math.round(previewScale*100)+'%';
  $('zoomIn').disabled=!zoomEnabled||previewScale>=5;
  $('zoomOut').disabled=!zoomEnabled||previewScale<=.25;
  $('zoomReset').disabled=!zoomEnabled;
}
function resetPreviewZoom(enabled){
  previewScale=1;previewX=0;previewY=0;zoomEnabled=enabled;previewDrag=null;
  $('pdfMode').checked=false;$('pdfModeLabel').hidden=true;$('viewer').classList.remove('pdf-interactive','dragging');
  paintPreviewZoom();
}
function zoomPreview(factor,x=$('viewer').clientWidth/2,y=$('viewer').clientHeight/2){
  if(!zoomEnabled)return;
  const next=Math.min(5,Math.max(.25,previewScale*factor)),ratio=next/previewScale;
  previewX=x-(x-previewX)*ratio;previewY=y-(y-previewY)*ratio;previewScale=next;paintPreviewZoom();
}
$('zoomIn').onclick=()=>zoomPreview(1.2);
$('zoomOut').onclick=()=>zoomPreview(1/1.2);
$('zoomReset').onclick=()=>{previewScale=1;previewX=previewY=0;paintPreviewZoom()};
$('pdfMode').onchange=()=>{$('viewer').classList.toggle('pdf-interactive',$('pdfMode').checked)};
$('viewer').addEventListener('wheel',e=>{
  if(!zoomEnabled||$('pdfMode').checked)return;
  e.preventDefault();const rect=$('viewer').getBoundingClientRect();
  const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?240:1);
  zoomPreview(Math.exp(-Math.max(-200,Math.min(200,delta))*.002),e.clientX-rect.left,e.clientY-rect.top);
},{passive:false});
$('viewer').addEventListener('pointerdown',e=>{
  if(!zoomEnabled||$('pdfMode').checked||e.button!==0)return;
  e.preventDefault();previewDrag={x:e.clientX,y:e.clientY,startX:previewX,startY:previewY};
  $('viewer').setPointerCapture(e.pointerId);$('viewer').classList.add('dragging');
});
$('viewer').addEventListener('pointermove',e=>{
  if(!previewDrag)return;previewX=previewDrag.startX+e.clientX-previewDrag.x;previewY=previewDrag.startY+e.clientY-previewDrag.y;paintPreviewZoom();
});
for(const type of ['pointerup','pointercancel','lostpointercapture'])$('viewer').addEventListener(type,()=>{previewDrag=null;$('viewer').classList.remove('dragging')});
$('viewer').addEventListener('keydown',e=>{if(e.key==='+'||e.key==='='){e.preventDefault();zoomPreview(1.2)}else if(e.key==='-'){e.preventDefault();zoomPreview(1/1.2)}else if(e.key==='0'){e.preventDefault();$('zoomReset').click()}});


