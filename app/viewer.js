const $=s=>document.querySelector(s), view=$('#siteView'), line=$('#loadLine'), statusBox=$('#viewerStatus');
let currentUrl='', currentName='', iosUA='', shortcutScopeUrl='', editingShortcut=-1;
const clamp=z=>Math.max(.50,Math.min(1.60,Math.round(Number(z||1)*20)/20));
const pageLabel=u=>{try{const x=new URL(u);if(x.protocol==='file:'){const part=decodeURIComponent(x.pathname.split('/').pop()||'فایل HTML');return part||'فایل HTML'}return x.hostname.replace(/^www\./,'')}catch{return ''}};
const isAllowed=u=>{try{return ['http:','https:','file:'].includes(new URL(String(u||'')).protocol)}catch{return false}};
const isLibraryMessenger=u=>{try{return ['web.bale.ai','web.rubika.ir'].includes(new URL(u).hostname.toLowerCase())}catch{return false}};
const keyFor=u=>{try{const x=new URL(u);return 'librarydesk-site-zoom:'+(x.protocol==='file:'?x.href:x.hostname.replace(/^www\./,''))}catch{return 'librarydesk-site-zoom:unknown'}};
const readZoom=u=>{const n=Number(localStorage.getItem(keyFor(u)));return Number.isFinite(n)&&n>=.5&&n<=1.6?n:.90};
const fa=n=>String(n).replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]);
const desktopUA=String(navigator.userAgent||'').replace(/\sElectron\/[\d.]+/i,'').replace(/\sLibraryDesk\/[\d.]+/i,'');
function showZoom(z){$('#zoomValue').textContent=fa(Math.round(z*100))+'٪'}
function setZoom(z,save=true){z=clamp(z);try{view.setZoomFactor(z)}catch{}showZoom(z);if(save&&currentUrl)localStorage.setItem(keyFor(currentUrl),String(z));return z}
function zoomNow(){try{return view.getZoomFactor()}catch{return readZoom(currentUrl)}}
let statusTimer=null;
function showStatus(text,kind='info',keep=2600){if(!statusBox)return;clearTimeout(statusTimer);statusBox.textContent=text;statusBox.dataset.kind=kind;statusBox.hidden=false;if(keep>0)statusTimer=setTimeout(()=>statusBox.hidden=true,keep)}
function applyUA(url){const ua=isLibraryMessenger(url)&&iosUA?iosUA:desktopUA;try{view.setUserAgent(ua)}catch{try{view.setAttribute('useragent',ua)}catch{}}}

/* چهار میانبر قابل تنظیم در نوار بالای همان پنجره.
   تنظیمات بر اساس صفحه‌ای که از داشبورد باز شده ذخیره می‌شوند، نه URL داخلیِ فعلی؛
   بنابراین جابه‌جایی داخل همان سامانه باعث از دست رفتن میانبرها نمی‌شود. */
const emptyShortcuts=()=>Array.from({length:4},(_,i)=>({name:`میانبر ${fa(i+1)}`,url:''}));
function shortcutScopeKey(){
  try{
    const x=new URL(shortcutScopeUrl||currentUrl);
    const scope=x.protocol==='file:'?x.href:`${x.protocol}//${x.host}`;
    return 'librarydesk-viewer-shortcuts:'+scope;
  }catch{return 'librarydesk-viewer-shortcuts:default'}
}
function readShortcuts(){
  const fallback=emptyShortcuts();
  try{
    const raw=JSON.parse(localStorage.getItem(shortcutScopeKey())||'null');
    if(!Array.isArray(raw))return fallback;
    return fallback.map((d,i)=>({name:String(raw[i]?.name||d.name).slice(0,28),url:String(raw[i]?.url||'').trim()}));
  }catch{return fallback}
}
function writeShortcuts(items){localStorage.setItem(shortcutScopeKey(),JSON.stringify(items));renderShortcuts()}
function normalizeShortcutUrl(raw){
  raw=String(raw||'').trim();if(!raw)return '';
  try{
    let base=shortcutScopeUrl||currentUrl;
    if(/^\//.test(raw))return new URL(raw,base).href;
    if(!/^[a-z][a-z0-9+.-]*:/i.test(raw))raw='https://'+raw;
    const x=new URL(raw);
    return ['http:','https:','file:'].includes(x.protocol)?x.href:'';
  }catch{return ''}
}
function shortcutCard(item,index){
  const card=document.createElement('div');card.className='viewer-shortcut'+(item.url?'':' is-empty');card.dataset.index=String(index);
  const main=document.createElement('button');main.type='button';main.className='viewer-shortcut-main';main.title=item.url?item.url:'برای تنظیم این میانبر کلیک کنید';
  const icon=document.createElement('span');icon.className='viewer-shortcut-icon';icon.textContent=item.url?'↗':'＋';
  const name=document.createElement('span');name.className='viewer-shortcut-name';name.textContent=item.name||`میانبر ${fa(index+1)}`;
  main.append(icon,name);
  main.addEventListener('click',()=>{if(!item.url){openShortcutSettings(index);return}navigateSameView(item.url)});
  const menu=document.createElement('button');menu.type='button';menu.className='viewer-shortcut-menu';menu.textContent='⋮';menu.title='تنظیم نام و لینک';menu.setAttribute('aria-label','تنظیم میانبر');menu.addEventListener('click',e=>{e.stopPropagation();openShortcutSettings(index)});
  card.append(main,menu);return card
}
function renderShortcuts(){
  const items=readShortcuts(), right=$('#shortcutRight'), left=$('#shortcutLeft');right.replaceChildren();left.replaceChildren();
  right.append(shortcutCard(items[0],0),shortcutCard(items[1],1));
  left.append(shortcutCard(items[2],2),shortcutCard(items[3],3));
}
function openShortcutSettings(index){
  const items=readShortcuts(),item=items[index]||emptyShortcuts()[index];editingShortcut=index;
  $('#shortcutNameInput').value=item.name||'';$('#shortcutUrlInput').value=item.url||'';$('#shortcutModal').hidden=false;
  setTimeout(()=>$('#shortcutNameInput').focus(),10)
}
function closeShortcutSettings(){editingShortcut=-1;$('#shortcutModal').hidden=true}
function saveShortcutSettings(){
  if(editingShortcut<0)return;
  const name=$('#shortcutNameInput').value.trim()||`میانبر ${fa(editingShortcut+1)}`;
  const raw=$('#shortcutUrlInput').value.trim();const url=normalizeShortcutUrl(raw);
  if(raw&&!url){showStatus('لینک واردشده معتبر نیست.','error',4000);$('#shortcutUrlInput').focus();return}
  const items=readShortcuts();items[editingShortcut]={name:name.slice(0,28),url};writeShortcuts(items);closeShortcutSettings();showStatus('میانبر ذخیره شد.','ok',2200)
}
function deleteShortcut(){if(editingShortcut<0)return;const items=readShortcuts();items[editingShortcut]=emptyShortcuts()[editingShortcut];writeShortcuts(items);closeShortcutSettings();showStatus('میانبر پاک شد.','ok',1800)}
function navigateSameView(url){
  const target=normalizeShortcutUrl(url);if(!target){showStatus('آدرس این میانبر معتبر نیست.','error',3500);return}
  applyUA(target);line.classList.add('loading');try{view.src=target}catch{showStatus('باز کردن لینک انجام نشد.','error',3500)}
}
$('#shortcutModalClose').onclick=closeShortcutSettings;$('#shortcutCancelBtn').onclick=closeShortcutSettings;$('#shortcutSaveBtn').onclick=saveShortcutSettings;$('#shortcutDeleteBtn').onclick=deleteShortcut;
$('#shortcutModal').addEventListener('click',e=>{if(e.target?.hasAttribute?.('data-close-shortcut'))closeShortcutSettings()});
$('#shortcutUrlInput').addEventListener('keydown',e=>{if(e.key==='Enter')saveShortcutSettings()});
$('#shortcutNameInput').addEventListener('keydown',e=>{if(e.key==='Enter')$('#shortcutUrlInput').focus()});

function loadSite({url,name,iosUserAgent}={}){
  if(!isAllowed(url))return;
  currentUrl=url;shortcutScopeUrl=url;currentName=name||pageLabel(url);iosUA=iosUserAgent||iosUA;applyUA(url);
  $('#viewerName').textContent=currentName;$('#viewerHost').textContent=pageLabel(url)+(isLibraryMessenger(url)?' · حالت سازگار iPhone':'');document.title=currentName+' — LibraryDesk';line.classList.add('loading');setZoom(readZoom(url),false);renderShortcuts();
  if(view.src===url){try{view.reload()}catch{}}else view.src=url
}
view.addEventListener('did-start-loading',()=>line.classList.add('loading'));
view.addEventListener('did-stop-loading',()=>line.classList.remove('loading'));
view.addEventListener('dom-ready',()=>{setZoom(readZoom(currentUrl),false);updateNav()});
view.addEventListener('did-fail-load',e=>{if(Number(e.errorCode)===-3)return;showStatus('بارگذاری صفحه انجام نشد؛ اتصال اینترنت یا دسترسی سایت را بررسی کنید.','error',5000)});
view.addEventListener('did-navigate',e=>{if(isAllowed(e.url)){currentUrl=e.url;$('#viewerHost').textContent=pageLabel(e.url)+(isLibraryMessenger(e.url)?' · حالت سازگار iPhone':'');setZoom(readZoom(e.url),false)} updateNav()});
view.addEventListener('did-navigate-in-page',e=>{if(isAllowed(e.url)){currentUrl=e.url;$('#viewerHost').textContent=pageLabel(e.url)+(isLibraryMessenger(e.url)?' · حالت سازگار iPhone':'')} updateNav()});
function updateNav(){try{$('#backBtn').disabled=!view.canGoBack();$('#forwardBtn').disabled=!view.canGoForward()}catch{}}
$('#backBtn').onclick=()=>{try{if(view.canGoBack())view.goBack()}catch{}};$('#forwardBtn').onclick=()=>{try{if(view.canGoForward())view.goForward()}catch{}};$('#reloadBtn').onclick=()=>{try{view.reload()}catch{}};
$('#zoomOut').onclick=()=>setZoom(zoomNow()-.05);$('#zoomIn').onclick=()=>setZoom(zoomNow()+.05);$('#zoomValue').onclick=()=>setZoom(1);$('#zoomFit').onclick=()=>setZoom(.90);$('#closeBtn').onclick=()=>window.viewerApi?.close();
$('#downloadsBtn').onclick=()=>window.viewerApi?.openDownloads?.();
$('#uploadBtn').onclick=async()=>{
  try{
    const opened=await view.executeJavaScript(`(()=>{const a=[...document.querySelectorAll('input[type="file"]')];const el=a.find(x=>!x.disabled)||null;if(!el)return false;el.click();return true})()`,true);
    if(opened)showStatus('انتخاب فایل باز شد. فایل موردنظر را انتخاب کنید.','ok',3200);
    else showStatus('در این صفحه ورودی فایل پیدا نشد؛ از دکمه پیوست/ارسال فایل خود سایت استفاده کنید.','info',5000);
  }catch{showStatus('برای بارگذاری فایل، از دکمه پیوست داخل خود سایت استفاده کنید.','info',5000)}
};
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#shortcutModal').hidden){e.preventDefault();closeShortcutSettings()}});
window.viewerApi?.onLoad(loadSite);window.viewerApi?.onZoomCommand(cmd=>{if(cmd==='in')setZoom(zoomNow()+.05);else if(cmd==='out')setZoom(zoomNow()-.05);else setZoom(1)});
window.viewerApi?.onDownloadStatus?.(p=>{
  if(!p)return;
  if(p.state==='start')showStatus(`دانلود «${p.name}» شروع شد…`,'info',0);
  else if(p.state==='progress')showStatus(`دانلود «${p.name}» — ${fa(p.percent||0)}٪`,'info',0);
  else if(p.state==='done')showStatus(`دانلود «${p.name}» کامل شد و در پوشه Downloads ذخیره شد.`,'ok',5000);
  else showStatus(`دانلود «${p.name||'فایل'}» کامل نشد.`,'error',5000);
});
