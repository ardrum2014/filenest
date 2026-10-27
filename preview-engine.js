'use strict';
let pdfDocument=null,pdfPage=1,pdfRenderTask=null,pdfTimer=null,pdfDrawVersion=0,pdfLoadTask=null;
const originalPaintPreview=paintPreviewZoom;
paintPreviewZoom=function(){originalPaintPreview();if(pdfDocument){clearTimeout(pdfTimer);pdfTimer=setTimeout(()=>drawPdfPage(),160)}};
function pdfControls(){const visible=!!pdfDocument;$('pdfPages').hidden=!visible;$('pdfPageInfo').textContent=visible?`${pdfPage} / ${pdfDocument.numPages}`:'';$('pdfPrev').disabled=!visible||pdfPage<=1;$('pdfNext').disabled=!visible||pdfPage>=pdfDocument.numPages;}
async function drawPdfPage(){
  const doc=pdfDocument,stage=previewStage,draw=++pdfDrawVersion;if(!doc||!stage)return;
  if(pdfRenderTask){pdfRenderTask.cancel();pdfRenderTask=null}
  try{
    const page=await doc.getPage(pdfPage);if(draw!==pdfDrawVersion||doc!==pdfDocument||stage!==previewStage)return;
    const raw=page.getViewport({scale:1});const fit=Math.min(($('viewer').clientWidth-24)/raw.width,($('viewer').clientHeight-24)/raw.height);
    const base=page.getViewport({scale:fit});const density=Math.min(4,Math.max(1,(window.devicePixelRatio||1)*previewScale),Math.sqrt(16000000/(base.width*base.height)));
    const viewport=page.getViewport({scale:fit*density});const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);canvas.style.width=base.width+'px';canvas.style.height=base.height+'px';canvas.setAttribute('aria-label',`PDF 第 ${pdfPage} 頁`);
    const task=page.render({canvasContext:canvas.getContext('2d'),viewport});pdfRenderTask=task;await task.promise;
    if(draw===pdfDrawVersion&&doc===pdfDocument&&stage===previewStage)stage.replaceChildren(canvas);
    if(pdfRenderTask===task)pdfRenderTask=null;
  }catch(e){if(e.name!=='RenderingCancelledException'&&draw===pdfDrawVersion)status('PDF 預覽失敗：'+e.message)}
}
preview=async function(){
  const version=++previewVersion;++pdfDrawVersion;clearTimeout(pdfTimer);
  if(pdfRenderTask){pdfRenderTask.cancel();pdfRenderTask=null}
  if(pdfLoadTask){pdfLoadTask.destroy().catch(()=>{});pdfLoadTask=null}
  pdfDocument=null;pdfControls();
  if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=null;
  const viewport=$('viewer');viewport.replaceChildren();previewStage=null;resetPreviewZoom(false);
  const stage=document.createElement('div');stage.className='preview-stage';viewport.append(stage);previewStage=stage;
  const file=files[active];$('previewName').textContent=file?.name||'';
  if(!file){const empty=document.createElement('div');empty.className='empty';empty.textContent='加入檔案後，在這裡確認內容';stage.append(empty);return}
  const ext=extension(file.name).toLowerCase();
  if(ext==='.pdf'){
    stage.textContent='正在讀取 PDF…';
    try{
      if(!window.pdfjsLib)throw new Error('找不到本機 PDF 元件，請確認 vendor 資料夾完整');
      const data=new Uint8Array(await file.arrayBuffer());if(version!==previewVersion)return;
      const load=pdfjsLib.getDocument({data,isEvalSupported:false,useSystemFonts:true,useWasm:true,...(window.localPdfAssets||{})});pdfLoadTask=load;
      const doc=await load.promise;if(version!==previewVersion){await load.destroy();return}
      pdfDocument=doc;pdfPage=1;resetPreviewZoom(true);pdfControls();await drawPdfPage();
    }catch(e){if(version===previewVersion){stage.textContent=e.name==='PasswordException'?'這份 PDF 已加密，請先以 PDF 軟體解鎖後再加入。':'無法預覽 PDF：'+e.message;resetPreviewZoom(false)}}
    return;
  }
  previewUrl=URL.createObjectURL(file);
  if(['.png','.jpg','.jpeg','.gif','.webp','.bmp','.avif'].includes(ext)){const img=document.createElement('img');img.alt=file.name;img.src=previewUrl;stage.append(img);resetPreviewZoom(true)}
  else if(['.txt','.csv','.md','.log','.json'].includes(ext)){const text=await file.slice(0,300000).text();if(version!==previewVersion)return;const pre=document.createElement('pre');pre.textContent=text;stage.append(pre);resetPreviewZoom(true)}
  else{const box=document.createElement('div');box.className='fallback';const p=document.createElement('p');p.textContent='此格式請使用電腦上的對應軟體開啟。';const a=document.createElement('a');a.href=previewUrl;a.download=file.name;a.textContent='下載原始檔案';box.append(p,a);stage.append(box)}
};
function turnPdf(delta){if(!pdfDocument)return;const next=pdfPage+delta;if(next<1||next>pdfDocument.numPages)return;pdfPage=next;previewScale=1;previewX=previewY=0;originalPaintPreview();pdfControls();clearTimeout(pdfTimer);drawPdfPage()}
$('pdfPrev').onclick=()=>turnPdf(-1);$('pdfNext').onclick=()=>turnPdf(1);
new ResizeObserver(()=>{if(pdfDocument){clearTimeout(pdfTimer);pdfTimer=setTimeout(drawPdfPage,160)}}).observe($('viewer'));
