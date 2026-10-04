(() => {
  'use strict';

  const SITES_KEY = 'cafedesk.sites.v1';
  const UI_ZOOM_KEY = 'cafedesk.uiZoom.v2';
  const SITE_ZOOM_MAP_KEY = 'cafedesk.siteZoomMap.v4';
  const GUEST_PRELOAD_URL = new URL('../webview-preload.js', window.location.href).toString();

  const $ = (id) => document.getElementById(id);

  const dashboardView = $('dashboardView');
  const workspaceView = $('workspaceView');
  const showDashboardBtn = $('showDashboardBtn');
  const showWorkspaceBtn = $('showWorkspaceBtn');
  const openToolsBtn = $('openToolsBtn');
  const openSocialBtn = $('openSocialBtn');
  const downloadFolderBtn = $('downloadFolderBtn');
  const downloadFolderLabel = $('downloadFolderLabel');

  const sitesGrid = $('sitesGrid');
  const sitesEmpty = $('sitesEmpty');
  const siteSearchInput = $('siteSearchInput');
  const siteCount = $('siteCount');

  const siteDialog = $('siteDialog');
  const siteForm = $('siteForm');
  const addSiteBtn = $('addSiteBtn');
  const saveSiteBtn = $('saveSiteBtn');
  const siteNameInput = $('siteNameInput');
  const siteUrlInput = $('siteUrlInput');
  const siteFormError = $('siteFormError');

  const sitePickerDialog = $('sitePickerDialog');
  const closePickerBtn = $('closePickerBtn');
  const pickerSearchInput = $('pickerSearchInput');
  const pickerSitesGrid = $('pickerSitesGrid');
  const pickerEmpty = $('pickerEmpty');
  const pickerSideLabel = $('pickerSideLabel');

  const toolsDialog = $('toolsDialog');
  const closeToolsBtn = $('closeToolsBtn');

  const socialDialog = $('socialDialog');
  const closeSocialBtn = $('closeSocialBtn');
  const reloadSocialBtn = $('reloadSocialBtn');
  const socialTitle = $('socialTitle');
  const socialWebviewHost = $('socialWebviewHost');

  const uiZoomSelect = $('uiZoomSelect');

  const hourHand = $('hourHand');
  const minuteHand = $('minuteHand');
  const secondHand = $('secondHand');

  const jalaliDateText = $('jalaliDateText');
  const calendarMonthTitle = $('calendarMonthTitle');
  const calendarYearTitle = $('calendarYearTitle');
  const calendarGrid = $('calendarGrid');

  const panes = {
    right: {
      host: document.querySelector('[data-pane="right"]'),
      slot: $('rightSlot'),
      webview: null,
      site: null
    },
    left: {
      host: document.querySelector('[data-pane="left"]'),
      slot: $('leftSlot'),
      webview: null,
      site: null
    }
  };

  let activePane = 'right';
  let pickerTargetSide = 'right';
  let sites = loadSites();
  let siteZoomMap = loadSiteZoomMap();
  const socialViews = new Map();
  let activeSocial = 'rubika';

  const socialApps = {
    rubika: { name: 'روبیکا', url: 'https://m.rubika.ir/' },
    shad: { name: 'شاد', url: 'https://my.shad.ir/' },
    eitaa: { name: 'ایتا', url: 'https://web.eitaa.com/' },
    telegram: { name: 'تلگرام', url: 'https://web.telegram.org/k/' }
  };

  const persianMonths = [
    'فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور',
    'مهر','آبان','آذر','دی','بهمن','اسفند'
  ];

  function faNumber(value) {
    return Number(value || 0).toLocaleString('fa-IR');
  }

  function loadSites() {
    try {
      const parsed = JSON.parse(localStorage.getItem(SITES_KEY) || '[]');
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return [];
    }
  }

  function saveSites() {
    localStorage.setItem(SITES_KEY, JSON.stringify(sites));
  }

  function loadSiteZoomMap() {
    try {
      const parsed = JSON.parse(localStorage.getItem(SITE_ZOOM_MAP_KEY) || '{}');
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  function siteZoomKey(site) {
    const host = hostLabel(site?.url || '').toLocaleLowerCase('en-US');
    return host || String(site?.id || 'default');
  }

  function getSiteZoom(site) {
    const raw = Number(siteZoomMap[siteZoomKey(site)]);
    return Number.isFinite(raw) ? Math.min(150, Math.max(60, raw)) : 100;
  }

  function saveSiteZoom(site, percent) {
    const value = Math.min(150, Math.max(60, Number(percent) || 100));
    siteZoomMap[siteZoomKey(site)] = value;
    localStorage.setItem(SITE_ZOOM_MAP_KEY, JSON.stringify(siteZoomMap));
    return value;
  }

  function normalizeUrl(raw) {
    const value = String(raw || '').trim();
    if (!value) throw new Error('لینک سایت را وارد کنید.');

    const prepared = /^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(value)
      ? value
      : 'https://' + value;

    let url;
    try {
      url = new URL(prepared);
    } catch {
      throw new Error('لینک سایت معتبر نیست.');
    }

    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('فقط لینک‌های http و https قابل استفاده هستند.');
    }

    return url.toString();
  }

  function hostLabel(url) {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return String(url || '');
    }
  }

  function matchesSearch(site, query) {
    const q = String(query || '').trim().toLocaleLowerCase('fa-IR');
    if (!q) return true;

    return (
      String(site.name || '').toLocaleLowerCase('fa-IR').includes(q) ||
      hostLabel(site.url).toLocaleLowerCase('en-US').includes(q)
    );
  }

  function chooseAutoPane() {
    if (!panes.right.webview) return 'right';
    if (!panes.left.webview) return 'left';
    return activePane;
  }

  function createSiteCard(site, index) {
    const card = document.createElement('article');
    card.className = `site-card tone-${index % 12}`;
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.title = site.url;

    const title = document.createElement('h3');
    title.textContent = site.name;

    const url = document.createElement('div');
    url.className = 'url';
    url.textContent = hostLabel(site.url);

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'remove-site';
    remove.title = 'حذف';
    remove.textContent = '×';
    remove.addEventListener('click', (event) => {
      event.stopPropagation();
      if (!confirm(`سایت «${site.name}» حذف شود؟`)) return;

      sites = sites.filter((item) => item.id !== site.id);
      saveSites();
      renderSites();
      renderPicker();
    });

    const open = () => openSite(site, chooseAutoPane());

    card.append(title, url, remove);
    card.addEventListener('click', open);
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        open();
      }
    });

    return card;
  }

  function renderSites() {
    const query = siteSearchInput.value;
    const filtered = sites.filter((site) => matchesSearch(site, query));

    sitesGrid.replaceChildren();

    filtered.forEach((site) => {
      const originalIndex = sites.findIndex((item) => item.id === site.id);
      sitesGrid.appendChild(createSiteCard(site, Math.max(0, originalIndex)));
    });

    siteCount.textContent = `${faNumber(filtered.length)} از ${faNumber(sites.length)} سایت`;
    sitesEmpty.classList.toggle('hidden', filtered.length > 0);

    if (!filtered.length) {
      sitesEmpty.textContent = sites.length
        ? 'سایتی با این عبارت پیدا نشد.'
        : 'هنوز سایتی اضافه نشده است.';
    }
  }

  function createPickerCard(site, index) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `picker-site tone-${index % 12}`;
    button.title = site.url;

    const name = document.createElement('strong');
    name.textContent = site.name;

    const host = document.createElement('span');
    host.textContent = hostLabel(site.url);

    button.append(name, host);
    button.addEventListener('click', () => {
      openSite(site, pickerTargetSide);
      sitePickerDialog.close();
    });

    return button;
  }

  function renderPicker() {
    const query = pickerSearchInput.value;
    const filtered = sites.filter((site) => matchesSearch(site, query));

    pickerSitesGrid.replaceChildren();

    filtered.forEach((site) => {
      const originalIndex = sites.findIndex((item) => item.id === site.id);
      pickerSitesGrid.appendChild(createPickerCard(site, Math.max(0, originalIndex)));
    });

    pickerEmpty.classList.toggle('hidden', filtered.length > 0);
  }

  function showDashboard() {
    document.body.classList.remove('workspace-mode');
    dashboardView.classList.remove('hidden');
    workspaceView.classList.add('hidden');
    showDashboardBtn.classList.add('active');
    showWorkspaceBtn.classList.remove('active');
    setTimeout(() => siteSearchInput.focus(), 60);
  }

  function showWorkspace() {
    document.body.classList.add('workspace-mode');
    workspaceView.classList.remove('hidden');
    dashboardView.classList.add('hidden');
    showWorkspaceBtn.classList.add('active');
    showDashboardBtn.classList.remove('active');
  }

  function setActivePane(side) {
    if (!panes[side]) return;

    activePane = side;
    Object.entries(panes).forEach(([key, pane]) => {
      pane.host.classList.toggle('active-pane', key === side);
    });
  }

  function emptyPaneNode(side) {
    const wrapper = document.createElement('div');
    wrapper.className = 'empty-pane';
    wrapper.dataset.emptySide = side;

    const inner = document.createElement('div');
    inner.className = 'empty-pane-inner';

    const plus = document.createElement('span');
    plus.className = 'empty-plus';
    plus.textContent = '＋';

    const strong = document.createElement('strong');
    strong.textContent = side === 'right' ? 'نیمه راست خالی است' : 'نیمه چپ خالی است';

    const small = document.createElement('small');
    small.textContent = side === 'right'
      ? 'برای انتخاب سایت کلیک کنید'
      : 'سایت دوم را اینجا باز کنید';

    inner.append(plus, strong, small);
    wrapper.append(inner);

    wrapper.addEventListener('click', () => {
      setActivePane(side);
      openSitePicker(side);
    });

    return wrapper;
  }

  function applySiteZoom(webview, percent) {
    if (!webview) return;
    const factor = Math.min(1.5, Math.max(0.6, (Number(percent) || 100) / 100));

    try {
      webview.setZoomFactor(factor);
    } catch {}
  }


  async function printWebview(webview) {
    if (!webview) return;
    try {
      const result = webview.print({ silent: false, printBackground: true });
      if (result && typeof result.catch === 'function') result.catch(() => {});
    } catch {}
  }

  async function fillSavedCredential(webview) {
    if (!webview || !window.cafeDesk?.getCredential) return;

    let url = '';
    try { url = webview.getURL() || webview.getAttribute('src') || ''; } catch {}
    if (!/^https?:/i.test(url)) return;

    let credential = null;
    try { credential = await window.cafeDesk.getCredential(url); } catch {}
    if (!credential?.password) return;

    const script = `(() => {
      const username = ${JSON.stringify(credential.username || '')};
      const password = ${JSON.stringify(credential.password || '')};
      const inputs = Array.from(document.querySelectorAll('input:not([disabled])'));
      const passwordInput = inputs.find((el) => String(el.type || '').toLowerCase() === 'password');
      if (!passwordInput) return false;

      const usernameHint = /user|login|email|mail|phone|mobile|national|melli|identity|شناسه|کاربر|موبایل|همراه|ملی/i;
      const usernameInput = inputs.find((el) => {
        if (el === passwordInput) return false;
        const type = String(el.type || 'text').toLowerCase();
        if (!['text','email','tel','number'].includes(type)) return false;
        const hint = [el.name, el.id, el.autocomplete, el.placeholder, el.getAttribute('aria-label')].filter(Boolean).join(' ');
        return usernameHint.test(hint);
      }) || inputs.slice(0, Math.max(0, inputs.indexOf(passwordInput))).reverse().find((el) => {
        const type = String(el.type || 'text').toLowerCase();
        return ['text','email','tel','number'].includes(type) && el !== passwordInput;
      });

      const setValue = (el, value) => {
        if (!el || !value) return;
        const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
        if (descriptor?.set) descriptor.set.call(el, value);
        else el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };

      if (usernameInput && username && !usernameInput.value) setValue(usernameInput, username);
      if (!passwordInput.value) setValue(passwordInput, password);
      return true;
    })()`;

    try { await webview.executeJavaScript(script, true); } catch {}
  }

  async function handleWebviewMessage(webview, event) {
    if (!event) return;

    if (event.channel === 'print-request') {
      await printWebview(webview);
      return;
    }

    if (event.channel !== 'credential-submitted') return;

    const data = event.args?.[0] || {};
    const password = String(data.password || '');
    const username = String(data.username || '');
    let url = String(data.url || '');

    try { if (!url) url = webview.getURL() || ''; } catch {}
    if (!/^https?:/i.test(url) || !password) return;

    let existing = null;
    try { existing = await window.cafeDesk.getCredential(url); } catch {}
    if (existing && existing.username === username && existing.password === password) return;

    const host = hostLabel(url) || 'این سایت';
    const identityLine = username ? `\nنام کاربری / کد: ${username}` : '';
    const accepted = confirm(
      `اطلاعات ورود «${host}» ذخیره شود؟${identityLine}\n\nرمز به‌صورت رمزگذاری‌شده و محافظت‌شده توسط ویندوز ذخیره می‌شود.`
    );
    if (!accepted) return;

    try {
      const result = await window.cafeDesk.saveCredential({ url, username, password });
      if (!result?.ok && result?.message) alert(result.message);
    } catch {}
  }

  function makeToolbar(site, side, webview) {
    const toolbar = document.createElement('div');
    toolbar.className = 'pane-toolbar';

    const titleWrap = document.createElement('div');
    titleWrap.className = 'pane-title-wrap';

    const light = document.createElement('span');
    light.className = 'pane-light';

    const title = document.createElement('span');
    title.className = 'pane-title';
    title.textContent = site.name;

    titleWrap.append(light, title);

    const actions = document.createElement('div');
    actions.className = 'pane-actions';

    const back = makePaneButton('‹', 'عقب', () => {
      try { if (webview.canGoBack()) webview.goBack(); } catch {}
    });

    const forward = makePaneButton('›', 'جلو', () => {
      try { if (webview.canGoForward()) webview.goForward(); } catch {}
    });

    const reload = makePaneButton('↻', 'بارگذاری مجدد', () => {
      try { webview.reload(); } catch {}
    });

    const print = makePaneButton('⎙', 'چاپ این صفحه', () => printWebview(webview));
    const downloads = makePaneButton('⬇', 'پوشه دانلودها', () => {
      try { window.cafeDesk.openDownloads(); } catch {}
    });

    const zoomWrap = document.createElement('label');
    zoomWrap.className = 'pane-zoom';
    zoomWrap.title = 'اندازه همین سایت';

    const zoomLabel = document.createElement('span');
    zoomLabel.textContent = 'زوم';

    const zoomSelect = document.createElement('select');
    [60,70,75,80,85,90,100,110,125,150].forEach((value) => {
      const option = document.createElement('option');
      option.value = String(value);
      option.textContent = faNumber(value) + '٪';
      zoomSelect.append(option);
    });
    zoomSelect.value = String(getSiteZoom(site));
    zoomSelect.addEventListener('click', (event) => event.stopPropagation());
    zoomSelect.addEventListener('change', (event) => {
      event.stopPropagation();
      const percent = saveSiteZoom(site, zoomSelect.value);
      zoomSelect.value = String(percent);
      applySiteZoom(webview, percent);
    });
    zoomWrap.append(zoomLabel, zoomSelect);

    const change = makePaneButton('تغییر سایت', 'انتخاب سایت دیگر', () => openSitePicker(side));
    change.classList.add('change-site-btn');

    const close = makePaneButton('×', 'بستن این پنل', () => closePane(side));
    close.classList.add('close-pane-btn');

    actions.append(back, forward, reload, print, downloads, zoomWrap, change, close);
    toolbar.append(titleWrap, actions);

    webview.addEventListener('did-start-loading', () => {
      title.textContent = site.name + ' …';
    });

    webview.addEventListener('did-stop-loading', () => {
      title.textContent = site.name;
      applySiteZoom(webview, getSiteZoom(site));
    });

    webview.addEventListener('did-fail-load', (event) => {
      if (event.errorCode === -3) return;
      title.textContent = site.name + ' — خطا';
    });

    return toolbar;
  }

  function makePaneButton(text, title, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = text;
    button.title = title;
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      onClick();
    });
    return button;
  }

  function openSite(site, side) {
    const pane = panes[side];
    if (!pane) return;

    if (pane.webview) {
      try { pane.webview.remove(); } catch {}
      pane.webview = null;
    }

    pane.slot.onclick = null;
    pane.slot.replaceChildren();
    pane.slot.className = 'pane-slot';

    const shell = document.createElement('div');
    shell.className = 'browser-shell';

    const frame = document.createElement('div');
    frame.className = 'webview-frame';

    const webview = document.createElement('webview');
    const partition = `persist:cafedesk-pane-${side}`;

    webview.setAttribute('partition', partition);
    webview.setAttribute('preload', GUEST_PRELOAD_URL);
    webview.setAttribute('src', site.url);
    webview.setAttribute('allowpopups', 'true');
    webview.setAttribute('webpreferences', 'contextIsolation=yes,nodeIntegration=no,sandbox=yes');
    webview.setAttribute('aria-label', site.name);

    webview.addEventListener('dom-ready', () => {
      applySiteZoom(webview, getSiteZoom(site));
      fillSavedCredential(webview);
    });
    webview.addEventListener('did-navigate', () => fillSavedCredential(webview));
    webview.addEventListener('did-navigate-in-page', () => fillSavedCredential(webview));
    webview.addEventListener('ipc-message', (event) => handleWebviewMessage(webview, event));

    frame.append(webview);
    shell.append(makeToolbar(site, side, webview), frame);
    pane.slot.append(shell);

    pane.webview = webview;
    pane.site = site;

    setActivePane(side);
    showWorkspace();
  }

  function closePane(side) {
    const pane = panes[side];
    if (!pane) return;

    if (pane.webview) {
      try { pane.webview.remove(); } catch {}
      pane.webview = null;
    }

    pane.site = null;
    pane.slot.className = 'pane-slot empty-pane';
    pane.slot.replaceChildren();

    const replacement = emptyPaneNode(side);
    while (replacement.firstChild) pane.slot.appendChild(replacement.firstChild);

    pane.slot.onclick = () => {
      setActivePane(side);
      openSitePicker(side);
    };

    setActivePane(side);
  }

  function openSitePicker(side) {
    pickerTargetSide = side;
    setActivePane(side);
    pickerSideLabel.textContent = side === 'right' ? 'راست' : 'چپ';
    pickerSearchInput.value = '';
    renderPicker();
    sitePickerDialog.showModal();
    setTimeout(() => pickerSearchInput.focus(), 50);
  }

  // Add site
  addSiteBtn.addEventListener('click', () => {
    siteForm.reset();
    siteFormError.textContent = '';
    siteDialog.showModal();
    setTimeout(() => siteNameInput.focus(), 50);
  });

  saveSiteBtn.addEventListener('click', () => {
    const name = siteNameInput.value.trim();

    if (!name) {
      siteFormError.textContent = 'نام سایت را وارد کنید.';
      siteNameInput.focus();
      return;
    }

    let url;
    try {
      url = normalizeUrl(siteUrlInput.value);
    } catch (error) {
      siteFormError.textContent = error.message || 'لینک سایت معتبر نیست.';
      siteUrlInput.focus();
      return;
    }

    sites.push({
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random(),
      name,
      url,
      createdAt: Date.now()
    });

    saveSites();
    siteSearchInput.value = '';
    renderSites();
    renderPicker();
    siteDialog.close();
  });

  siteForm.addEventListener('submit', (event) => {
    if (event.submitter?.value === 'cancel') return;
    event.preventDefault();
  });

  siteSearchInput.addEventListener('input', renderSites);
  pickerSearchInput.addEventListener('input', renderPicker);

  closePickerBtn.addEventListener('click', () => sitePickerDialog.close());

  showDashboardBtn.addEventListener('click', showDashboard);
  showWorkspaceBtn.addEventListener('click', showWorkspace);

  openToolsBtn.addEventListener('click', () => toolsDialog.showModal());
  closeToolsBtn.addEventListener('click', () => toolsDialog.close());

  function ensureSocialView(key) {
    if (socialViews.has(key)) return socialViews.get(key);

    const appInfo = socialApps[key];
    if (!appInfo) return null;

    const view = document.createElement('webview');
    view.className = 'social-webview hidden';
    view.setAttribute('partition', 'persist:cafedesk-social-' + key);
    view.setAttribute('preload', GUEST_PRELOAD_URL);
    view.setAttribute('src', appInfo.url);
    view.setAttribute('allowpopups', 'true');
    view.setAttribute('webpreferences', 'contextIsolation=yes,nodeIntegration=no,sandbox=yes');
    view.addEventListener('dom-ready', () => fillSavedCredential(view));
    view.addEventListener('did-navigate', () => fillSavedCredential(view));
    view.addEventListener('ipc-message', (event) => handleWebviewMessage(view, event));
    socialWebviewHost.append(view);
    socialViews.set(key, view);
    return view;
  }

  function activateSocial(key) {
    if (!socialApps[key]) return;
    activeSocial = key;
    socialTitle.textContent = socialApps[key].name;

    document.querySelectorAll('[data-social]').forEach((button) => {
      button.classList.toggle('active', button.dataset.social === key);
    });

    socialViews.forEach((view, viewKey) => {
      view.classList.toggle('hidden', viewKey !== key);
    });

    const view = ensureSocialView(key);
    if (view) view.classList.remove('hidden');
  }

  openSocialBtn.addEventListener('click', () => {
    socialDialog.showModal();
    activateSocial(activeSocial);
  });

  closeSocialBtn.addEventListener('click', () => socialDialog.close());

  reloadSocialBtn.addEventListener('click', () => {
    try { socialViews.get(activeSocial)?.reload(); } catch {}
  });

  document.querySelectorAll('[data-social]').forEach((button) => {
    button.addEventListener('click', () => activateSocial(button.dataset.social));
  });

  document.querySelectorAll('.pane-host').forEach((host) => {
    host.addEventListener('mousedown', () => setActivePane(host.dataset.pane));
  });

  document.querySelectorAll('[data-empty-side]').forEach((empty) => {
    empty.addEventListener('click', () => {
      const side = empty.dataset.emptySide;
      setActivePane(side);
      openSitePicker(side);
    });
  });

  document.addEventListener('keydown', (event) => {
    if (!(event.ctrlKey || event.metaKey) || String(event.key).toLowerCase() !== 'p') return;
    const current = panes[activePane]?.webview;
    if (!current) return;
    event.preventDefault();
    printWebview(current);
  });


  function showDownloadFolder(info) {
    if (!downloadFolderBtn || !downloadFolderLabel || !info) return;
    downloadFolderLabel.textContent = info.label || 'Downloads';
    downloadFolderBtn.title = info.path
      ? `پوشه پیش‌فرض دانلود: ${info.path}\nبرای تغییر کلیک کنید`
      : 'انتخاب پوشه پیش‌فرض دانلود';
  }

  async function refreshDownloadFolder() {
    try {
      showDownloadFolder(await window.cafeDesk.getDownloadFolder());
    } catch {}
  }

  downloadFolderBtn?.addEventListener('click', async () => {
    try {
      const result = await window.cafeDesk.chooseDownloadFolder();
      showDownloadFolder(result);
    } catch {}
  });

  // Main-page zoom. Website zoom is stored per site directly in each pane toolbar.
  async function setUiZoom(value) {
    const percent = Math.min(125, Math.max(75, Number(value) || 100));
    localStorage.setItem(UI_ZOOM_KEY, String(percent));
    uiZoomSelect.value = String(percent);

    try {
      await window.cafeDesk.setUiZoom(percent);
    } catch {}
  }

  uiZoomSelect.addEventListener('change', () => setUiZoom(uiZoomSelect.value));

  // Analog clock
  function updateClock() {
    const now = new Date();
    const seconds = now.getSeconds() + now.getMilliseconds() / 1000;
    const minutes = now.getMinutes() + seconds / 60;
    const hours = (now.getHours() % 12) + minutes / 60;

    secondHand.style.transform = `rotate(${seconds * 6}deg)`;
    minuteHand.style.transform = `rotate(${minutes * 6}deg)`;
    hourHand.style.transform = `rotate(${hours * 30}deg)`;
  }

  function persianParts(date) {
    const formatter = new Intl.DateTimeFormat('en-US-u-ca-persian', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    });

    const parts = Object.fromEntries(
      formatter.formatToParts(date)
        .filter((part) => ['year', 'month', 'day'].includes(part.type))
        .map((part) => [part.type, Number(part.value)])
    );

    return {
      year: parts.year,
      month: parts.month,
      day: parts.day
    };
  }

  function findPersianMonthStart(today, target) {
    for (let offset = 0; offset <= 35; offset++) {
      const date = new Date(today);
      date.setHours(12, 0, 0, 0);
      date.setDate(today.getDate() - offset);

      const p = persianParts(date);
      if (p.year === target.year && p.month === target.month && p.day === 1) {
        return date;
      }
    }

    return null;
  }

  function renderPersianCalendar() {
    const now = new Date();
    const current = persianParts(now);

    jalaliDateText.textContent = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(now);

    calendarMonthTitle.textContent = persianMonths[current.month - 1] || '';
    calendarYearTitle.textContent = new Intl.NumberFormat('fa-IR', { useGrouping: false }).format(current.year);

    const first = findPersianMonthStart(now, current);
    calendarGrid.replaceChildren();

    if (!first) return;

    const startIndex = (first.getDay() + 1) % 7;
    const cells = [];

    for (let i = 0; i < startIndex; i++) {
      cells.push({ blank: true });
    }

    for (let day = 1; day <= 31; day++) {
      const date = new Date(first);
      date.setDate(first.getDate() + day - 1);
      const p = persianParts(date);

      if (p.year !== current.year || p.month !== current.month) break;

      cells.push({
        day,
        weekday: (date.getDay() + 1) % 7,
        today: day === current.day
      });
    }

    while (cells.length % 7 !== 0) cells.push({ blank: true });

    cells.forEach((cell) => {
      const span = document.createElement('span');

      if (cell.blank) {
        span.className = 'muted';
        span.textContent = '';
      } else {
        span.textContent = faNumber(cell.day);
        if (cell.weekday === 6) span.classList.add('friday');
        if (cell.today) span.classList.add('today');
      }

      calendarGrid.append(span);
    });
  }

  updateClock();
  renderPersianCalendar();
  setInterval(updateClock, 250);
  setInterval(renderPersianCalendar, 60 * 60 * 1000);

  // Calculator
  const calcDisplay = $('calcDisplay');
  const calcKeys = $('calcKeys');
  let calcCurrent = '0';
  let calcStored = null;
  let calcOperator = null;
  let calcReset = false;

  function calcRender() {
    calcDisplay.value = calcCurrent;
  }

  function calculate(a, b, op) {
    const x = Number(a);
    const y = Number(b);

    if (!Number.isFinite(x) || !Number.isFinite(y)) return NaN;
    if (op === '+') return x + y;
    if (op === '-') return x - y;
    if (op === '×') return x * y;
    if (op === '÷') return y === 0 ? NaN : x / y;
    return y;
  }

  function formatNumber(value) {
    if (!Number.isFinite(value)) return 'خطا';
    const rounded = Math.round((value + Number.EPSILON) * 1e10) / 1e10;
    return String(rounded);
  }

  function handleCalc(key) {
    if (/^\d$/.test(key)) {
      if (calcCurrent === '0' || calcReset || calcCurrent === 'خطا') calcCurrent = key;
      else if (calcCurrent.length < 16) calcCurrent += key;
      calcReset = false;
      return calcRender();
    }

    if (key === '.') {
      if (calcReset || calcCurrent === 'خطا') {
        calcCurrent = '0.';
        calcReset = false;
      } else if (!calcCurrent.includes('.')) {
        calcCurrent += '.';
      }
      return calcRender();
    }

    if (key === 'C') {
      calcCurrent = '0';
      calcStored = null;
      calcOperator = null;
      calcReset = false;
      return calcRender();
    }

    if (key === '⌫') {
      if (calcReset || calcCurrent === 'خطا') calcCurrent = '0';
      else calcCurrent = calcCurrent.length > 1 ? calcCurrent.slice(0, -1) : '0';
      return calcRender();
    }

    if (key === '%') {
      calcCurrent = formatNumber(Number(calcCurrent) / 100);
      calcReset = true;
      return calcRender();
    }

    if (['+', '-', '×', '÷'].includes(key)) {
      if (calcOperator && calcStored !== null && !calcReset) {
        calcCurrent = formatNumber(calculate(calcStored, calcCurrent, calcOperator));
      }
      calcStored = calcCurrent;
      calcOperator = key;
      calcReset = true;
      return calcRender();
    }

    if (key === '=') {
      if (!calcOperator || calcStored === null) return;
      calcCurrent = formatNumber(calculate(calcStored, calcCurrent, calcOperator));
      calcStored = null;
      calcOperator = null;
      calcReset = true;
      calcRender();
    }
  }

  calcKeys.addEventListener('click', (event) => {
    const button = event.target.closest('[data-calc]');
    if (button) handleCalc(button.dataset.calc);
  });

  // Password generator
  const passwordLength = $('passwordLength');
  const passwordLengthValue = $('passwordLengthValue');
  const passwordOutput = $('passwordOutput');
  const autoCopyPassword = $('autoCopyPassword');
  const generatePasswordBtn = $('generatePasswordBtn');
  const copyPasswordBtn = $('copyPasswordBtn');
  const copyStatus = $('copyStatus');

  function randomInt(max) {
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    return buffer[0] % max;
  }

  function shuffle(chars) {
    const array = [...chars];
    for (let i = array.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array.join('');
  }

  function makePassword(length) {
    const lower = 'abcdefghijkmnopqrstuvwxyz';
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const nums = '23456789';
    const symbols = '!@#$%&*+-_=?.';
    const all = lower + upper + nums + symbols;

    let out =
      lower[randomInt(lower.length)] +
      upper[randomInt(upper.length)] +
      nums[randomInt(nums.length)] +
      symbols[randomInt(symbols.length)];

    while (out.length < length) out += all[randomInt(all.length)];
    return shuffle(out);
  }

  async function copyText(value, message = 'کپی شد') {
    if (!value) return;

    try {
      await window.cafeDesk.copyText(value);
      copyStatus.textContent = message;
      clearTimeout(copyText.timer);
      copyText.timer = setTimeout(() => {
        copyStatus.textContent = '';
      }, 1400);
    } catch {
      copyStatus.textContent = 'کپی انجام نشد';
    }
  }

  async function generatePassword() {
    const length = Number(passwordLength.value) || 16;
    const value = makePassword(length);
    passwordOutput.value = value;

    if (autoCopyPassword.checked) {
      await copyText(value, 'رمز ساخته و خودکار کپی شد');
    } else {
      copyStatus.textContent = 'رمز جدید ساخته شد';
    }
  }

  passwordLength.addEventListener('input', () => {
    passwordLengthValue.textContent = passwordLength.value;
  });

  generatePasswordBtn.addEventListener('click', generatePassword);
  copyPasswordBtn.addEventListener('click', () => copyText(passwordOutput.value));
  passwordOutput.addEventListener('click', () => passwordOutput.select());

  // Initial state
  const savedUiZoom = localStorage.getItem(UI_ZOOM_KEY) || '100';
  setUiZoom(savedUiZoom);
  refreshDownloadFolder();

  renderSites();
  renderPicker();
  generatePassword();

  window.cafeDesk.getVersion()
    .then((version) => {
      $('versionText').textContent = 'v' + version;
    })
    .catch(() => {});
})();
