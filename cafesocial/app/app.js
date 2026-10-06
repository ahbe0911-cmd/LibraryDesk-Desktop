(() => {
  'use strict';

  const $=(id)=>document.getElementById(id);
  const webviewHost=$('webviewHost');
  const socialTitle=$('socialTitle');
  const statusOverlay=$('statusOverlay');
  const statusText=$('statusText');
  const retryBtn=$('retryBtn');
  const reloadBtn=$('reloadBtn');
  const chooseFolderBtn=$('chooseFolderBtn');
  const openFolderBtn=$('openFolderBtn');
  const folderLabel=$('folderLabel');
  const pinRightBtn=$('pinRightBtn');
  const checkUpdateBtn=$('checkUpdateBtn');
  const updateText=$('updateText');
  const toast=$('toast');

  const apps={
    rubika:{name:'روبیکا',url:'https://m.rubika.ir/'},
    shad:{name:'شاد',url:'https://my.shad.ir/'},
    eitaa:{name:'ایتا',url:'https://web.eitaa.com/'},
    telegram:{name:'تلگرام',url:'https://velogram.app/web/'}
  };
  const views=new Map();
  const health=new Map();
  let active='rubika';
  let toastTimer=null;

  function showToast(message,type='success'){
    clearTimeout(toastTimer);
    toast.textContent=message;
    toast.classList.toggle('error',type==='error');
    toast.classList.add('show');
    toastTimer=setTimeout(()=>toast.classList.remove('show'),3200);
  }
  function setStatus(message,{retry=false,loading=true}={}){
    statusText.textContent=message || '';
    statusOverlay.classList.toggle('hidden',!message);
    statusOverlay.classList.toggle('loading',Boolean(loading));
    retryBtn.classList.toggle('hidden',!retry);
  }
  function state(key){
    if(!health.has(key)) health.set(key,{fails:0,recovering:false});
    return health.get(key);
  }
  function inspect(key,view){
    if(!view || key!==active) return;
    try{
      const url=view.getURL() || '';
      if(!/^https?:/i.test(url)){ setStatus('در حال آماده‌سازی '+apps[key].name+'…',{loading:true}); return; }
      setStatus('',{loading:false});
      state(key).fails=0;
    }catch{}
  }
  function ensureView(key){
    if(views.has(key)) return views.get(key);
    const info=apps[key]; if(!info) return null;
    const view=document.createElement('webview');
    view.className='social-webview hidden';
    view.setAttribute('partition','persist:cafesocial-'+key);
    view.setAttribute('src',info.url);
    view.setAttribute('allowpopups','true');
    view.setAttribute('webpreferences','contextIsolation=yes,nodeIntegration=no,sandbox=yes,backgroundThrottling=no');
    view.setAttribute('aria-label',info.name);
    view.addEventListener('did-start-loading',()=>{if(key===active)setStatus('در حال بارگذاری '+info.name+'…',{loading:true});});
    view.addEventListener('did-stop-loading',()=>{if(key===active)inspect(key,view);});
    view.addEventListener('dom-ready',()=>setTimeout(()=>inspect(key,view),400));
    view.addEventListener('did-fail-load',(event)=>{
      if(event.errorCode===-3)return;
      const h=state(key); h.fails+=1;
      if(key===active)setStatus('بارگذاری کامل نشد.',{loading:false,retry:true});
    });
    webviewHost.append(view);
    views.set(key,view);
    return view;
  }
  function activate(key){
    if(!apps[key])return;
    active=key;
    socialTitle.textContent=apps[key].name;
    document.querySelectorAll('[data-social]').forEach(btn=>btn.classList.toggle('active',btn.dataset.social===key));
    views.forEach((view,k)=>view.classList.toggle('hidden',k!==key));
    const view=ensureView(key);
    view.classList.remove('hidden');
    setStatus('در حال آماده‌سازی '+apps[key].name+'…',{loading:true});
    setTimeout(()=>inspect(key,view),650);
  }
  async function refreshFolder(){
    try{
      const info=await window.cafeSocial.getDownloadFolder();
      folderLabel.textContent=info.selected?info.label:'هنوز انتخاب نشده';
      folderLabel.title=info.path || '';
      document.body.classList.toggle('folder-ready',Boolean(info.selected));
    }catch{}
  }

  document.querySelectorAll('[data-social]').forEach(btn=>btn.addEventListener('click',()=>activate(btn.dataset.social)));
  reloadBtn.addEventListener('click',()=>{try{ensureView(active)?.reload();}catch{}});
  retryBtn.addEventListener('click',()=>{try{ensureView(active)?.reloadIgnoringCache();}catch{}});
  chooseFolderBtn.addEventListener('click',async()=>{
    const result=await window.cafeSocial.chooseDownloadFolder();
    if(result?.ok){await refreshFolder();showToast('✓ آدرس ثابت دانلود ذخیره شد');}
  });
  openFolderBtn.addEventListener('click',async()=>{
    let result=await window.cafeSocial.openDownloadFolder();
    if(result?.needsFolder){
      result=await window.cafeSocial.chooseDownloadFolder();
      if(result?.ok){await refreshFolder(); await window.cafeSocial.openDownloadFolder();}
    }
  });
  pinRightBtn.addEventListener('click',()=>window.cafeSocial.pinRight());

  async function checkUpdates(silent=false){
    if(!checkUpdateBtn)return;
    checkUpdateBtn.disabled=true;
    const old=updateText?.textContent || '';
    if(updateText)updateText.textContent='در حال بررسی…';
    try{
      const result=await window.cafeSocial.checkForUpdates();
      if(result?.updateAvailable){
        checkUpdateBtn.classList.add('available');
        if(updateText)updateText.textContent='نسخه '+result.latestVersion+' آماده است';
        checkUpdateBtn.onclick=()=>window.cafeSocial.openUpdate(result.downloadUrl || result.releaseUrl);
        if(!silent)showToast('✓ نسخه جدید CafeSocial آماده دانلود است');
      }else{
        checkUpdateBtn.classList.remove('available');
        if(updateText)updateText.textContent=result?.ok?'برنامه به‌روز است':'بررسی بروزرسانی';
        if(!silent && result?.ok)showToast('✓ جدیدترین نسخه نصب است');
      }
    }catch{
      if(updateText)updateText.textContent=old || 'بررسی بروزرسانی';
    }finally{
      checkUpdateBtn.disabled=false;
    }
  }
  checkUpdateBtn?.addEventListener('click',()=>checkUpdates(false));

  window.cafeSocial.onDownloadStatus((payload)=>{
    if(payload?.state==='completed') showToast('✓ دانلود شد: '+(payload.filename || 'فایل'));
    else if(payload?.state==='interrupted') showToast('دانلود کامل نشد','error');
  });
  window.cafeSocial.onDownloadNeedsFolder(async(payload)=>{
    showToast('ابتدا آدرس ثابت دانلود را انتخاب کنید','error');
    const result=await window.cafeSocial.chooseDownloadFolder();
    if(result?.ok){await refreshFolder();showToast('✓ مسیر ذخیره شد؛ دانلود را دوباره بزنید');}
  });

  refreshFolder();
  activate('rubika');
  setTimeout(()=>checkUpdates(true),3500);
  setTimeout(()=>['shad','eitaa','telegram'].forEach((key,index)=>setTimeout(()=>{const v=ensureView(key);v.classList.add('hidden');},1000+index*900)),1200);
})();