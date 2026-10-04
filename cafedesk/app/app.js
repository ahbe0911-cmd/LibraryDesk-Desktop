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
  const openPasswordManagerBtn = $('openPasswordManagerBtn');
  const passwordManagerDialog = $('passwordManagerDialog');
  const closePasswordManagerBtn = $('closePasswordManagerBtn');
  const passwordManagerList = $('passwordManagerList');
  const savedPasswordCount = $('savedPasswordCount');

  const socialDialog = $('socialDialog');
  const closeSocialBtn = $('closeSocialBtn');
  const reloadSocialBtn = $('reloadSocialBtn');
  const socialTitle = $('socialTitle');
  const socialWebviewHost = $('socialWebviewHost');
  const socialBrowserPanel = $('socialBrowserPanel');
  const openPrintFolderSocialBtn = $('openPrintFolderSocialBtn');
  const printFolderPanel = $('printFolderPanel');
  const printFolderPath = $('printFolderPath');
  const printFolderList = $('printFolderList');
  const printFolderEmpty = $('printFolderEmpty');
  const printFolderBackBtn = $('printFolderBackBtn');
  const refreshPrintFolderBtn = $('refreshPrintFolderBtn');
  const openPrintFolderWindowsBtn = $('openPrintFolderWindowsBtn');
  const printFolderColumns = $('printFolderColumns');
  const printViewDetailsBtn = $('printViewDetailsBtn');
  const printViewListBtn = $('printViewListBtn');
  const printViewIconsBtn = $('printViewIconsBtn');
  const printSelectedCount = $('printSelectedCount');

  const socialStatusOverlay = $('socialStatusOverlay');
  const socialStatusText = $('socialStatusText');
  const socialRetryBtn = $('socialRetryBtn');

  const appToast = $('appToast');
  const appToastText = $('appToastText');

  const screenshotFormatDialog = $('screenshotFormatDialog');
  const cancelScreenshotFormatBtn = $('cancelScreenshotFormatBtn');
  const saveScreenshotJpgBtn = $('saveScreenshotJpgBtn');
  const saveScreenshotPdfBtn = $('saveScreenshotPdfBtn');

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
      site: null,
      tabs: [],
      activeTabId: null,
      shell: null,
      tabbar: null,
      toolbarHost: null,
      frame: null
    },
    left: {
      host: document.querySelector('[data-pane="left"]'),
      slot: $('leftSlot'),
      webview: null,
      site: null,
      tabs: [],
      activeTabId: null,
      shell: null,
      tabbar: null,
      toolbarHost: null,
      frame: null
    }
  };

  let activePane = 'right';
  let pickerTargetSide = 'right';
  let sites = loadSites();
  let siteZoomMap = loadSiteZoomMap();
  const socialViews = new Map();
  const recordingStates = new Map();
  let tabSequence = 0;
  let activeSocial = 'rubika';
  let currentPrintFolderPath = '';
  let printFolderItems = [];
  const printFolderSelection = new Set();
  let printFolderLastIndex = -1;
  let printFolderViewMode = localStorage.getItem('cafedesk.printViewMode.v1') || 'details';
  const socialHealth = new Map();
  let toastTimer = null;
  let screenshotChoiceResolver = null;

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

  function showToast(message, type = 'success') {
    if (!appToast || !appToastText) return;
    clearTimeout(toastTimer);
    appToastText.textContent = String(message || '');
    appToast.classList.toggle('error', type === 'error');
    appToast.classList.add('show');
    toastTimer = setTimeout(() => appToast.classList.remove('show'), 3200);
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

  async function syncSavedCredentials(webview) {
    if (!webview || !window.cafeDesk?.getCredentials) return;
    let url = '';
    try { url = webview.getURL() || webview.getAttribute('src') || ''; } catch {}
    if (!/^https?:/i.test(url)) return;

    try {
      const entries = await window.cafeDesk.getCredentials(url);
      webview.send('cafedesk:credentials', Array.isArray(entries) ? entries : []);
    } catch {}
  }

  function currentPaneTab(side) {
    const pane = panes[side];
    return pane?.tabs?.find((tab) => tab.id === pane.activeTabId) || null;
  }

  function tabByWebContentsId(webContentsId) {
    const targetId = Number(webContentsId);
    for (const [side, pane] of Object.entries(panes)) {
      for (const tab of pane.tabs || []) {
        try {
          if (tab.webview.getWebContentsId() === targetId) return { side, pane, tab };
        } catch {}
      }
    }
    return null;
  }

  function socialViewByWebContentsId(webContentsId) {
    const targetId = Number(webContentsId);
    for (const [key, view] of socialViews.entries()) {
      try {
        if (view.getWebContentsId() === targetId) return { key, view };
      } catch {}
    }
    return null;
  }

  async function handleCredentialSubmitted(webview, data) {
    const password = String(data?.password || '');
    const username = String(data?.username || '').trim();
    let url = String(data?.url || '');

    try { if (!url) url = webview.getURL() || ''; } catch {}
    if (!/^https?:/i.test(url) || !password) return;

    let existing = [];
    try { existing = await window.cafeDesk.getCredentials(url); } catch {}
    if (existing.some((entry) => entry.username === username && entry.password === password)) return;

    const host = hostLabel(url) || 'این سایت';
    const identityLine = username ? `\nنام کاربری / شماره ملی: ${username}` : '';
    const accepted = confirm(
      `رمز این حساب برای «${host}» ذخیره شود؟${identityLine}\n\nدفعه بعد CafeDesk آن را برای همین سایت و همین شناسه تکمیل می‌کند. رمز با محافظت امن ویندوز ذخیره می‌شود.`
    );
    if (!accepted) return;

    try {
      const result = await window.cafeDesk.saveCredential({ url, username, password });
      if (!result?.ok && result?.message) alert(result.message);
      await syncSavedCredentials(webview);
      await refreshPasswordManager();
    } catch {}
  }

  async function handleWebviewMessage(webview, event, side = null) {
    if (!event) return;

    if (event.channel === 'print-request') {
      await printWebview(webview);
      return;
    }

    if (event.channel === 'open-new-tab') {
      const payload = event.args?.[0] || {};
      const url = String(payload.url || payload || '');
      if (!/^https?:/i.test(url)) return;

      if (side && panes[side]) {
        const source = currentPaneTab(side);
        openInternalTab(side, url, source?.site || panes[side].site || { name: hostLabel(url), url });
      } else {
        try { await webview.loadURL(url); } catch {}
      }
      return;
    }

    if (event.channel === 'credential-scope') {
      const data = event.args?.[0] || {};
      const scopeUrl = String(data.url || '');
      if (/^https?:/i.test(scopeUrl)) {
        try {
          const entries = await window.cafeDesk.getCredentials(scopeUrl);
          webview.send('cafedesk:credentials', Array.isArray(entries) ? entries : []);
        } catch {}
      }
      return;
    }

    if (event.channel === 'credential-submitted') {
      await handleCredentialSubmitted(webview, event.args?.[0] || {});
    }
  }

  function askScreenshotFormat() {
    if (!screenshotFormatDialog) return Promise.resolve('jpg');
    if (screenshotFormatDialog.open) return Promise.resolve(null);

    return new Promise((resolve) => {
      screenshotChoiceResolver = resolve;
      screenshotFormatDialog.showModal();
    });
  }

  function resolveScreenshotFormat(value) {
    if (screenshotFormatDialog?.open) screenshotFormatDialog.close();
    const resolve = screenshotChoiceResolver;
    screenshotChoiceResolver = null;
    resolve?.(value);
  }

  cancelScreenshotFormatBtn?.addEventListener('click', () => resolveScreenshotFormat(null));
  saveScreenshotJpgBtn?.addEventListener('click', () => resolveScreenshotFormat('jpg'));
  saveScreenshotPdfBtn?.addEventListener('click', () => resolveScreenshotFormat('pdf'));
  screenshotFormatDialog?.addEventListener('cancel', (event) => {
    event.preventDefault();
    resolveScreenshotFormat(null);
  });

  async function captureScreenshot(webview, button, site) {
    const format = await askScreenshotFormat();
    if (!format) return;

    const originalHtml = button.innerHTML;
    try {
      const id = webview.getWebContentsId();
      button.disabled = true;
      button.innerHTML = '<span class="capture-working">…</span>';
      button.title = 'در حال ذخیره صفحه کامل';

      const result = await window.cafeDesk.exportPageCapture(
        id,
        site?.name || hostLabel(webview.getURL()) || 'CafeDesk',
        format
      );
      if (!result?.ok) return;

      button.innerHTML = '<span class="capture-done-check">✓</span>';
      button.title = `صفحه کامل ذخیره شد: ${result.path || result.label}`;
      showToast('✓ ذخیره شد: ' + (result.label || (format === 'pdf' ? 'PDF' : 'JPG')), 'success');
      setTimeout(() => {
        button.innerHTML = originalHtml;
        button.title = 'ذخیره صفحه کامل به صورت JPG یا PDF';
      }, 1800);
    } catch (error) {
      alert('ذخیره صفحه انجام نشد: ' + (error?.message || error));
      button.innerHTML = originalHtml;
    } finally {
      button.disabled = false;
      if (button.querySelector('.capture-working')) button.innerHTML = originalHtml;
    }
  }

  function recordingKey(webview) {
    try { return String(webview.getWebContentsId()); } catch { return ''; }
  }

  function updateRecordingButton(button, webview) {
    const active = recordingStates.has(recordingKey(webview));
    button.classList.toggle('recording-active', active);
    button.innerHTML = active
      ? '<span class="record-stop-square"></span>'
      : TOOL_ICONS.record;
    button.title = active ? 'توقف ضبط ویدیو' : 'شروع ضبط ویدیوی همین صفحه';
  }

  async function enableRecordingCursor(webview) {
    const script = `(() => {
      try { window.__cafedeskRecorderCursorCleanup?.(); } catch {}
      const cursor = document.createElement('div');
      cursor.id = '__cafedesk_record_cursor';
      cursor.style.cssText = [
        'position:fixed','left:0','top:0','width:24px','height:24px',
        'border:3px solid #18d7c2','border-radius:50%','box-sizing:border-box',
        'transform:translate(-50%,-50%)','z-index:2147483647','pointer-events:none',
        'box-shadow:0 0 0 3px rgba(24,215,194,.16),0 0 12px rgba(24,215,194,.5)',
        'transition:border-color .08s,background .08s,transform .05s'
      ].join(';');
      document.documentElement.appendChild(cursor);

      const move = (e) => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
      };
      const down = () => {
        cursor.style.borderColor = '#ff4f6d';
        cursor.style.background = 'rgba(255,79,109,.28)';
        cursor.style.transform = 'translate(-50%,-50%) scale(.78)';
      };
      const up = () => {
        cursor.style.borderColor = '#18d7c2';
        cursor.style.background = 'transparent';
        cursor.style.transform = 'translate(-50%,-50%) scale(1)';
      };
      const click = (e) => {
        const pulse = document.createElement('div');
        pulse.style.cssText = [
          'position:fixed','left:' + e.clientX + 'px','top:' + e.clientY + 'px',
          'width:12px','height:12px','border:3px solid #ffd24f','border-radius:50%',
          'transform:translate(-50%,-50%)','z-index:2147483646','pointer-events:none',
          'transition:width .35s,height .35s,opacity .35s','opacity:1'
        ].join(';');
        document.documentElement.appendChild(pulse);
        requestAnimationFrame(() => {
          pulse.style.width = '48px';
          pulse.style.height = '48px';
          pulse.style.opacity = '0';
        });
        setTimeout(() => pulse.remove(), 420);
      };

      document.addEventListener('mousemove', move, true);
      document.addEventListener('mousedown', down, true);
      document.addEventListener('mouseup', up, true);
      document.addEventListener('click', click, true);

      window.__cafedeskRecorderCursorCleanup = () => {
        document.removeEventListener('mousemove', move, true);
        document.removeEventListener('mousedown', down, true);
        document.removeEventListener('mouseup', up, true);
        document.removeEventListener('click', click, true);
        cursor.remove();
        delete window.__cafedeskRecorderCursorCleanup;
      };
      return true;
    })()`;
    try { await webview.executeJavaScript(script, true); } catch {}
  }

  async function disableRecordingCursor(webview) {
    try {
      await webview.executeJavaScript('window.__cafedeskRecorderCursorCleanup?.(); true', true);
    } catch {}
  }

  async function stopRecordingForWebview(webview) {
    const key = recordingKey(webview);
    const state = recordingStates.get(key);
    if (!state) return null;

    return new Promise((resolve) => {
      state.resolveStop = resolve;
      try {
        state.recorder.stop();
      } catch {
        try { state.stream.getTracks().forEach((track) => track.stop()); } catch {}
        disableRecordingCursor(webview);
        recordingStates.delete(key);
        resolve(null);
      }
    });
  }

  async function toggleRecording(webview, button, site) {
    const key = recordingKey(webview);
    if (!key) return;

    if (recordingStates.has(key)) {
      await stopRecordingForWebview(webview);
      updateRecordingButton(button, webview);
      return;
    }

    let fileInfo = null;
    let stream = null;
    try {
      const sourceId = await window.cafeDesk.getMediaSourceId(Number(key));
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'tab',
            chromeMediaSourceId: sourceId,
            maxFrameRate: 60
          }
        }
      });

      const mimeType = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm'
      ].find((type) => MediaRecorder.isTypeSupported(type)) || '';

      fileInfo = await window.cafeDesk.startRecordingFile(site?.name || hostLabel(webview.getURL()) || 'CafeDesk');
      if (!fileInfo?.ok) throw new Error('فایل ضبط ساخته نشد.');
      await enableRecordingCursor(webview);

      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType, videoBitsPerSecond: 10000000 } : { videoBitsPerSecond: 10000000 }
      );

      const state = {
        recorder,
        stream,
        sessionId: fileInfo.sessionId,
        queue: Promise.resolve(),
        resolveStop: null
      };
      recordingStates.set(key, state);

      recorder.addEventListener('dataavailable', (event) => {
        if (!event.data || event.data.size <= 0) return;
        state.queue = state.queue.then(async () => {
          const bytes = await event.data.arrayBuffer();
          await window.cafeDesk.appendRecordingChunk(state.sessionId, bytes);
        });
      });

      recorder.addEventListener('stop', async () => {
        try {
          await state.queue;
          await window.cafeDesk.finishRecordingFile(state.sessionId);
        } catch {}
        try { stream.getTracks().forEach((track) => track.stop()); } catch {}
        await disableRecordingCursor(webview);
        recordingStates.delete(key);
        showToast('ویدیو ذخیره شد: ' + (fileInfo?.label || 'فایل ضبط'), 'success');
        state.resolveStop?.(fileInfo);
      });

      recorder.start(1000);
      updateRecordingButton(button, webview);
    } catch (error) {
      try { stream?.getTracks().forEach((track) => track.stop()); } catch {}
      await disableRecordingCursor(webview);
      if (fileInfo?.sessionId) {
        try { await window.cafeDesk.abortRecordingFile(fileInfo.sessionId); } catch {}
      }
      recordingStates.delete(key);
      updateRecordingButton(button, webview);
      alert('ضبط صفحه شروع نشد: ' + (error?.message || error));
    }
  }

  const TOOL_ICONS = {
    print: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 8V3h10v5M7 17H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M7 14h10v7H7z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="18" cy="11" r="1" fill="currentColor"/></svg>',
    screenshot: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5H5v3M16 5h3v3M8 19H5v-3M16 19h3v-3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><rect x="8" y="8" width="8" height="8" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="2" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
    record: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="13" height="12" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m16 10 5-3v10l-5-3z" fill="currentColor"/></svg>'
  };

  function makePaneIconButton(kind, title, onClick) {
    const button = makePaneButton('', title, onClick);
    button.classList.add('pane-icon-btn', kind + '-icon-btn');
    button.innerHTML = TOOL_ICONS[kind] || '';
    return button;
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

    const print = makePaneIconButton('print', 'چاپ این صفحه', () => printWebview(webview));
    const screenshot = makePaneIconButton('screenshot', 'ذخیره صفحه کامل به صورت JPG یا PDF', () => captureScreenshot(webview, screenshot, site));
    screenshot.classList.add('screenshot-btn');

    const record = makePaneIconButton('record', 'شروع ضبط ویدیوی همین صفحه', () => toggleRecording(webview, record, site));
    record.classList.add('record-btn');
    setTimeout(() => updateRecordingButton(record, webview), 0);

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

    actions.append(back, forward, reload, print, screenshot, record, downloads, zoomWrap, change, close);
    toolbar.append(titleWrap, actions);

    webview.addEventListener('did-start-loading', () => {
      title.textContent = site.name + ' …';
    });

    webview.addEventListener('did-stop-loading', () => {
      title.textContent = site.name;
      applySiteZoom(webview, getSiteZoom(site));
      syncSavedCredentials(webview);
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

  function renderPaneTabs(side) {
    const pane = panes[side];
    if (!pane?.tabbar) return;
    pane.tabbar.replaceChildren();

    pane.tabs.forEach((tab, index) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'pane-tab';
      item.classList.toggle('active', tab.id === pane.activeTabId);
      item.title = tab.url || '';

      const label = document.createElement('span');
      label.className = 'pane-tab-label';
      label.textContent = tab.title || tab.site?.name || `تب ${faNumber(index + 1)}`;

      const close = document.createElement('span');
      close.className = 'pane-tab-close';
      close.textContent = '×';
      close.title = 'بستن تب';
      close.addEventListener('click', (event) => {
        event.stopPropagation();
        closePaneTab(side, tab.id);
      });

      item.append(label, close);
      item.addEventListener('click', () => activatePaneTab(side, tab.id));
      pane.tabbar.append(item);
    });
  }

  function activatePaneTab(side, tabId) {
    const pane = panes[side];
    const tab = pane?.tabs?.find((item) => item.id === tabId);
    if (!pane || !tab) return;

    pane.activeTabId = tabId;
    pane.webview = tab.webview;
    pane.site = tab.site;

    pane.tabs.forEach((item) => {
      item.webview.classList.toggle('hidden', item.id !== tabId);
    });

    pane.toolbarHost.replaceChildren(makeToolbar(tab.site, side, tab.webview));
    renderPaneTabs(side);
    setActivePane(side);
  }

  function makePaneWebview(side, site, url, tab) {
    const webview = document.createElement('webview');
    webview.className = 'pane-tab-webview hidden';
    webview.setAttribute('partition', `persist:cafedesk-pane-${side}`);
    webview.setAttribute('preload', GUEST_PRELOAD_URL);
    webview.setAttribute('src', url);
    webview.setAttribute('allowpopups', 'true');
    webview.setAttribute('webpreferences', 'contextIsolation=yes,nodeIntegration=no,sandbox=yes');
    webview.setAttribute('aria-label', site.name || hostLabel(url));

    webview.addEventListener('dom-ready', () => {
      applySiteZoom(webview, getSiteZoom(site));
      syncSavedCredentials(webview);
    });

    webview.addEventListener('did-navigate', (event) => {
      tab.url = event.url || tab.url;
      syncSavedCredentials(webview);
      renderPaneTabs(side);
    });

    webview.addEventListener('did-navigate-in-page', (event) => {
      tab.url = event.url || tab.url;
      syncSavedCredentials(webview);
    });

    webview.addEventListener('page-title-updated', (event) => {
      tab.title = String(event.title || '').trim() || tab.site?.name || hostLabel(tab.url);
      renderPaneTabs(side);
    });

    webview.addEventListener('ipc-message', (event) => handleWebviewMessage(webview, event, side));
    return webview;
  }

  function createPaneTab(side, site, url, title) {
    const pane = panes[side];
    if (!pane?.frame) return null;

    const tab = {
      id: `tab-${++tabSequence}`,
      site: site || { name: hostLabel(url), url },
      url,
      title: title || site?.name || hostLabel(url) || 'تب جدید',
      webview: null
    };

    tab.webview = makePaneWebview(side, tab.site, url, tab);
    pane.tabs.push(tab);
    pane.frame.append(tab.webview);
    activatePaneTab(side, tab.id);
    return tab;
  }

  function openInternalTab(side, url, sourceSite) {
    if (!/^https?:/i.test(String(url || ''))) return;
    const site = {
      ...(sourceSite || {}),
      name: hostLabel(url) || sourceSite?.name || 'تب جدید',
      url
    };
    createPaneTab(side, site, url, hostLabel(url) || 'تب جدید');
  }

  async function closePaneTab(side, tabId) {
    const pane = panes[side];
    const index = pane?.tabs?.findIndex((tab) => tab.id === tabId) ?? -1;
    if (!pane || index < 0) return;

    const [tab] = pane.tabs.splice(index, 1);
    await stopRecordingForWebview(tab.webview);
    try { tab.webview.remove(); } catch {}

    if (!pane.tabs.length) {
      closePane(side);
      return;
    }

    if (pane.activeTabId === tabId) {
      const next = pane.tabs[Math.min(index, pane.tabs.length - 1)];
      activatePaneTab(side, next.id);
    } else {
      renderPaneTabs(side);
    }
  }

  function openSite(site, side) {
    const pane = panes[side];
    if (!pane) return;

    (pane.tabs || []).forEach((tab) => {
      stopRecordingForWebview(tab.webview);
      try { tab.webview.remove(); } catch {}
    });

    pane.slot.onclick = null;
    pane.slot.replaceChildren();
    pane.slot.className = 'pane-slot';

    const shell = document.createElement('div');
    shell.className = 'browser-shell';

    const tabbar = document.createElement('div');
    tabbar.className = 'pane-tabbar';

    const toolbarHost = document.createElement('div');
    toolbarHost.className = 'pane-toolbar-host';

    const frame = document.createElement('div');
    frame.className = 'webview-frame';

    shell.append(tabbar, toolbarHost, frame);
    pane.slot.append(shell);

    pane.tabs = [];
    pane.activeTabId = null;
    pane.shell = shell;
    pane.tabbar = tabbar;
    pane.toolbarHost = toolbarHost;
    pane.frame = frame;
    pane.webview = null;
    pane.site = null;

    createPaneTab(side, site, site.url, site.name);
    setActivePane(side);
    showWorkspace();
  }

  function closePane(side) {
    const pane = panes[side];
    if (!pane) return;

    (pane.tabs || []).forEach((tab) => {
      stopRecordingForWebview(tab.webview);
      try { tab.webview.remove(); } catch {}
    });

    pane.tabs = [];
    pane.activeTabId = null;
    pane.webview = null;
    pane.site = null;
    pane.shell = null;
    pane.tabbar = null;
    pane.toolbarHost = null;
    pane.frame = null;
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

  openToolsBtn.addEventListener('click', () => {
    toolsDialog.showModal();
    refreshPasswordManager();
  });
  closeToolsBtn.addEventListener('click', () => toolsDialog.close());

  async function refreshPasswordManager() {
    let items = [];
    try { items = await window.cafeDesk.listCredentials(); } catch {}

    if (savedPasswordCount) savedPasswordCount.textContent = faNumber(items.length);
    if (!passwordManagerList) return;

    passwordManagerList.replaceChildren();
    if (!items.length) {
      const empty = document.createElement('div');
      empty.className = 'password-manager-empty';
      empty.textContent = 'هنوز رمزی ذخیره نشده است.';
      passwordManagerList.append(empty);
      return;
    }

    items.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'password-manager-row';

      const text = document.createElement('div');
      const strong = document.createElement('strong');
      strong.textContent = item.username || 'بدون نام کاربری';
      const small = document.createElement('small');
      small.textContent = item.origin;
      text.append(strong, small);

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = 'حذف';
      remove.addEventListener('click', async () => {
        if (!confirm(`رمز ذخیره‌شده برای «${item.username || item.origin}» حذف شود؟`)) return;
        await window.cafeDesk.deleteCredential(item);
        await refreshPasswordManager();
        Object.values(panes).forEach((pane) => pane.tabs?.forEach((tab) => syncSavedCredentials(tab.webview)));
        socialViews.forEach((view) => syncSavedCredentials(view));
      });

      row.append(text, remove);
      passwordManagerList.append(row);
    });
  }

  openPasswordManagerBtn?.addEventListener('click', () => {
    toolsDialog.close();
    passwordManagerDialog.showModal();
    refreshPasswordManager();
  });
  closePasswordManagerBtn?.addEventListener('click', () => passwordManagerDialog.close());

  function socialHealthState(key) {
    if (!socialHealth.has(key)) {
      socialHealth.set(key, {
        failures: 0,
        recovering: false,
        lastRecoveryAt: 0,
        checkTimer: null,
        ready: false,
        blankChecks: 0
      });
    }
    return socialHealth.get(key);
  }

  function setSocialStatus(message, { retry = false, loading = true } = {}) {
    if (!socialStatusOverlay || socialDialog?.classList.contains('folder-mode')) return;
    socialStatusText.textContent = message || '';
    socialStatusOverlay.classList.toggle('hidden', !message);
    socialStatusOverlay.classList.toggle('loading', Boolean(loading));
    socialRetryBtn?.classList.toggle('hidden', !retry);
  }

  function hideSocialStatus() {
    socialStatusOverlay?.classList.add('hidden');
    socialRetryBtn?.classList.add('hidden');
  }

  async function inspectSocialView(key, view) {
    if (!view || view.classList.contains('destroyed-social-view')) return false;
    try {
      const state = await view.executeJavaScript(`(() => {
        const body = document.body;
        const root = document.querySelector('#root,#app,[data-reactroot],main');
        const textLength = String(body?.innerText || '').trim().length;
        const elementCount = body?.querySelectorAll('*').length || 0;
        const bodyHtmlLength = String(body?.innerHTML || '').length;
        const rootChildren = root?.children?.length || 0;
        return {
          readyState: document.readyState,
          textLength,
          elementCount,
          bodyHtmlLength,
          rootChildren,
          bodyWidth: body?.getBoundingClientRect?.().width || 0,
          bodyHeight: body?.getBoundingClientRect?.().height || 0
        };
      })()`, true);

      const health = socialHealthState(key);

      if (state?.readyState !== 'complete') {
        scheduleSocialHealthCheck(key, view, 900);
        return false;
      }

      const blank = !state ||
        state.bodyWidth < 40 ||
        state.bodyHeight < 40 ||
        (
          state.textLength < 3 &&
          state.rootChildren === 0 &&
          state.elementCount < 8 &&
          state.bodyHtmlLength < 2200
        );

      if (!blank) {
        health.failures = 0;
        health.recovering = false;
        health.ready = true;
        health.blankChecks = 0;
        if (key === activeSocial) hideSocialStatus();
        return true;
      }

      health.blankChecks += 1;
      if (health.blankChecks < 2) {
        scheduleSocialHealthCheck(key, view, 1200);
        return false;
      }
    } catch {}

    await recoverSocialView(key, 'صفحه سفید یا ناقص تشخیص داده شد');
    return false;
  }

  async function recoverSocialView(key, reason = 'بارگذاری کامل نشد', forceRecreate = false) {
    const health = socialHealthState(key);
    const now = Date.now();
    if (health.recovering && now - health.lastRecoveryAt < 3500) return;

    health.recovering = true;
    health.lastRecoveryAt = now;
    health.failures += 1;
    health.ready = false;

    if (health.failures > 3) {
      health.recovering = false;
      if (key === activeSocial) {
        setSocialStatus(
          socialApps[key].name + ' هنوز پاسخ نداده است. برای بازسازی کامل دوباره تلاش کنید.',
          { retry: true, loading: false }
        );
      }
      return;
    }

    if (key === activeSocial) {
      setSocialStatus('در حال بازیابی ' + socialApps[key].name + '…', { loading: true });
    }

    let view = socialViews.get(key);
    const hardRepair = forceRecreate || health.failures >= 2;

    if (hardRepair) {
      try { await window.cafeDesk.repairSocialApp(key); } catch {}
      if (view) {
        try {
          view.classList.add('destroyed-social-view');
          view.remove();
        } catch {}
      }
      socialViews.delete(key);
      view = ensureSocialView(key, true);
      if (key === activeSocial && view) view.classList.remove('hidden');
    } else {
      try { view?.reloadIgnoringCache(); } catch {
        try { view?.reload(); } catch {}
      }
    }

    if (!hardRepair) health.recovering = false;

    setTimeout(() => {
      const next = socialViews.get(key);
      if (next) inspectSocialView(key, next);
    }, hardRepair ? 2600 : 1800);
  }

  function scheduleSocialHealthCheck(key, view, delay = 1000) {
    const health = socialHealthState(key);
    clearTimeout(health.checkTimer);
    health.checkTimer = setTimeout(() => inspectSocialView(key, view), delay);
  }

  function ensureSocialView(key, recreated = false) {
    if (socialViews.has(key)) return socialViews.get(key);

    const appInfo = socialApps[key];
    if (!appInfo) return null;

    const view = document.createElement('webview');
    view.className = 'social-webview hidden';
    view.setAttribute('partition', 'persist:cafedesk-social-' + key);
    view.setAttribute('preload', GUEST_PRELOAD_URL);
    view.setAttribute('src', appInfo.url);
    view.setAttribute('allowpopups', 'true');
    view.setAttribute('webpreferences', 'contextIsolation=yes,nodeIntegration=no,sandbox=yes,backgroundThrottling=no');
    view.setAttribute('aria-label', appInfo.name);

    const health = socialHealthState(key);
    if (recreated) health.recovering = false;

    view.addEventListener('did-start-loading', () => {
      health.ready = false;
      health.blankChecks = 0;
      if (key === activeSocial) {
        setSocialStatus('در حال بارگذاری ' + appInfo.name + '…', { loading: true });
      }
    });

    view.addEventListener('dom-ready', () => {
      syncSavedCredentials(view);
      scheduleSocialHealthCheck(key, view, 900);
    });

    view.addEventListener('did-stop-loading', () => {
      scheduleSocialHealthCheck(key, view, 700);
    });

    view.addEventListener('did-navigate', () => {
      syncSavedCredentials(view);
      scheduleSocialHealthCheck(key, view, 900);
    });

    view.addEventListener('did-fail-load', (event) => {
      if (event.errorCode === -3) return;
      if (key === activeSocial) {
        setSocialStatus('بارگذاری انجام نشد؛ CafeDesk در حال تلاش مجدد است.', { loading: true });
      }
      recoverSocialView(key, event.errorDescription || 'خطای بارگذاری');
    });

    view.addEventListener('render-process-gone', () => {
      recoverSocialView(key, 'پردازش صفحه متوقف شد', true);
    });

    view.addEventListener('unresponsive', () => {
      recoverSocialView(key, 'صفحه پاسخ نمی‌دهد', true);
    });

    view.addEventListener('ipc-message', (event) => handleWebviewMessage(view, event, null));

    socialWebviewHost.append(view);
    socialViews.set(key, view);
    return view;
  }

  function leavePrintFolderMode() {
    socialDialog.classList.remove('folder-mode');
    openPrintFolderSocialBtn?.classList.remove('active');
    printFolderPanel?.classList.add('hidden');
    socialBrowserPanel?.classList.remove('hidden');
  }

  function activateSocial(key) {
    if (!socialApps[key]) return;
    leavePrintFolderMode();
    activeSocial = key;
    socialTitle.textContent = socialApps[key].name;

    document.querySelectorAll('[data-social]').forEach((button) => {
      button.classList.toggle('active', button.dataset.social === key);
    });

    socialViews.forEach((view, viewKey) => {
      view.classList.toggle('hidden', viewKey !== key);
    });

    const view = ensureSocialView(key);
    if (view) {
      view.classList.remove('hidden');
      setSocialStatus('در حال آماده‌سازی ' + socialApps[key].name + '…', { loading: true });
      setTimeout(() => inspectSocialView(key, view), 900);
    }
  }

  function formatFileSize(bytes) {
    const value = Number(bytes || 0);
    if (value < 1024) return faNumber(value) + ' B';
    if (value < 1024 * 1024) return faNumber((value / 1024).toFixed(1)) + ' KB';
    if (value < 1024 * 1024 * 1024) return faNumber((value / (1024 * 1024)).toFixed(1)) + ' MB';
    return faNumber((value / (1024 * 1024 * 1024)).toFixed(1)) + ' GB';
  }

  function fileTypeLabel(item) {
    if (item.isDirectory) return 'پوشه';
    const ext = String(item.extension || '').replace('.', '').toUpperCase();
    return ext ? ext + ' File' : 'File';
  }

  function fileVisual(item) {
    if (item.isDirectory) return { icon: '📁', className: 'folder' };
    const ext = String(item.extension || '').toLowerCase();
    if (['.jpg','.jpeg','.png','.gif','.bmp','.webp','.tif','.tiff'].includes(ext)) return { icon: '🖼', className: 'image' };
    if (ext === '.pdf') return { icon: 'PDF', className: 'pdf' };
    if (['.doc','.docx'].includes(ext)) return { icon: 'W', className: 'word' };
    if (['.xls','.xlsx','.csv'].includes(ext)) return { icon: 'X', className: 'excel' };
    if (['.mp4','.mkv','.avi','.webm','.mov'].includes(ext)) return { icon: '▶', className: 'video' };
    return { icon: '▤', className: 'file' };
  }

  function setPrintFolderViewMode(mode) {
    const safeMode = ['details','list','icons'].includes(mode) ? mode : 'details';
    printFolderViewMode = safeMode;
    localStorage.setItem('cafedesk.printViewMode.v1', safeMode);

    printFolderList?.classList.remove('view-details','view-list','view-icons');
    printFolderList?.classList.add('view-' + safeMode);
    printFolderColumns?.classList.toggle('hidden', safeMode !== 'details');

    printViewDetailsBtn?.classList.toggle('active', safeMode === 'details');
    printViewListBtn?.classList.toggle('active', safeMode === 'list');
    printViewIconsBtn?.classList.toggle('active', safeMode === 'icons');
  }

  function updatePrintSelectionUi() {
    const count = printFolderSelection.size;
    if (printSelectedCount) printSelectedCount.textContent = faNumber(count) + ' انتخاب';

    printFolderList?.querySelectorAll('.print-file-row').forEach((row) => {
      row.classList.toggle('selected', printFolderSelection.has(row.dataset.path));
    });
  }

  function selectPrintFolderItem(index, event) {
    const item = printFolderItems[index];
    if (!item) return;

    if (event.shiftKey && printFolderLastIndex >= 0) {
      const start = Math.min(printFolderLastIndex, index);
      const end = Math.max(printFolderLastIndex, index);
      if (!event.ctrlKey) printFolderSelection.clear();
      for (let i = start; i <= end; i += 1) {
        printFolderSelection.add(printFolderItems[i].path);
      }
    } else if (event.ctrlKey || event.metaKey) {
      if (printFolderSelection.has(item.path)) printFolderSelection.delete(item.path);
      else printFolderSelection.add(item.path);
      printFolderLastIndex = index;
    } else {
      printFolderSelection.clear();
      printFolderSelection.add(item.path);
      printFolderLastIndex = index;
    }

    updatePrintSelectionUi();
  }

  function renderPrintFolderItems() {
    printFolderList.replaceChildren();
    printFolderEmpty?.classList.toggle('hidden', printFolderItems.length > 0);
    setPrintFolderViewMode(printFolderViewMode);

    printFolderItems.forEach((item, index) => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'print-file-row';
      row.title = item.path;
      row.dataset.path = item.path;
      row.dataset.index = String(index);

      const nameCell = document.createElement('span');
      nameCell.className = 'print-file-name';

      const visual = fileVisual(item);
      const icon = document.createElement('span');
      icon.className = 'print-file-icon ' + visual.className;
      icon.textContent = visual.icon;

      const name = document.createElement('strong');
      name.textContent = item.name;
      nameCell.append(icon, name);

      const type = document.createElement('span');
      type.className = 'print-file-type';
      type.textContent = fileTypeLabel(item);

      const size = document.createElement('span');
      size.className = 'print-file-size';
      size.textContent = item.isDirectory ? '—' : formatFileSize(item.size);

      const date = document.createElement('span');
      date.className = 'print-file-date';
      date.textContent = item.mtimeMs
        ? new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(item.mtimeMs))
        : '—';

      row.append(nameCell, type, size, date);

      row.addEventListener('click', (event) => {
        selectPrintFolderItem(index, event);
      });

      row.addEventListener('dblclick', async () => {
        if (item.isDirectory) {
          await loadPrintFolder(item.path);
        } else {
          await window.cafeDesk.openDownloadItem(item.path);
        }
      });

      row.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        if (!printFolderSelection.has(item.path)) {
          printFolderSelection.clear();
          printFolderSelection.add(item.path);
          printFolderLastIndex = index;
          updatePrintSelectionUi();
        }
        window.cafeDesk.showFileContextMenu(Array.from(printFolderSelection));
      });

      printFolderList.append(row);
    });

    updatePrintSelectionUi();
  }

  async function loadPrintFolder(requestedPath = '') {
    if (!printFolderList) return;

    printFolderList.replaceChildren();
    printFolderEmpty?.classList.add('hidden');
    printFolderSelection.clear();
    printFolderLastIndex = -1;
    updatePrintSelectionUi();

    try {
      const data = await window.cafeDesk.listDownloadFolder(requestedPath || '');
      currentPrintFolderPath = data.current || data.root || '';
      printFolderPath.textContent = currentPrintFolderPath || '—';
      printFolderPath.title = currentPrintFolderPath || '';
      printFolderBackBtn.disabled = !data.parent;
      printFolderBackBtn.dataset.parent = data.parent || '';

      printFolderItems = Array.isArray(data.entries) ? data.entries : [];
      renderPrintFolderItems();
    } catch (error) {
      printFolderItems = [];
      printFolderEmpty?.classList.remove('hidden');
      printFolderEmpty.textContent = 'خواندن پوشه انجام نشد: ' + (error?.message || error);
    }
  }

  async function showPrintFolder() {
    document.querySelectorAll('[data-social]').forEach((button) => button.classList.remove('active'));
    openPrintFolderSocialBtn?.classList.add('active');
    socialDialog.classList.add('folder-mode');
    hideSocialStatus();
    socialBrowserPanel?.classList.add('hidden');
    printFolderPanel?.classList.remove('hidden');
    setPrintFolderViewMode(printFolderViewMode);
    await loadPrintFolder('');
    printFolderPanel?.focus();
  }

  openPrintFolderSocialBtn?.addEventListener('click', showPrintFolder);
  refreshPrintFolderBtn?.addEventListener('click', () => loadPrintFolder(currentPrintFolderPath));
  printFolderBackBtn?.addEventListener('click', () => {
    const parent = printFolderBackBtn.dataset.parent || '';
    if (parent) loadPrintFolder(parent);
  });
  openPrintFolderWindowsBtn?.addEventListener('click', () => window.cafeDesk.openDownloadRoot());
  printViewDetailsBtn?.addEventListener('click', () => setPrintFolderViewMode('details'));
  printViewListBtn?.addEventListener('click', () => setPrintFolderViewMode('list'));
  printViewIconsBtn?.addEventListener('click', () => setPrintFolderViewMode('icons'));

  printFolderList?.addEventListener('click', (event) => {
    if (event.target !== printFolderList) return;
    printFolderSelection.clear();
    printFolderLastIndex = -1;
    updatePrintSelectionUi();
  });

  printFolderPanel?.addEventListener('keydown', (event) => {
    if (!(event.ctrlKey || event.metaKey) || String(event.key).toLowerCase() !== 'a') return;
    event.preventDefault();
    printFolderSelection.clear();
    printFolderItems.forEach((item) => printFolderSelection.add(item.path));
    updatePrintSelectionUi();
  });

  function prewarmSocialViews() {
    const keys = ['rubika', 'shad', 'eitaa', 'telegram'];
    keys.forEach((key, index) => {
      setTimeout(() => {
        const view = ensureSocialView(key);
        if (view && key !== activeSocial) view.classList.add('hidden');
      }, 1800 + index * 1500);
    });
  }

  openSocialBtn.addEventListener('click', () => {
    socialDialog.showModal();
    activateSocial(activeSocial);
    prewarmSocialViews();
  });

  closeSocialBtn.addEventListener('click', () => socialDialog.close());

  reloadSocialBtn.addEventListener('click', () => {
    const view = socialViews.get(activeSocial);
    if (!view) return;
    const health = socialHealthState(activeSocial);
    health.failures = 0;
    setSocialStatus('در حال بارگذاری مجدد…', { loading: true });
    try { view.reloadIgnoringCache(); } catch { try { view.reload(); } catch {} }
  });

  socialRetryBtn?.addEventListener('click', () => {
    const health = socialHealthState(activeSocial);
    health.failures = 0;
    health.blankChecks = 0;
    health.recovering = false;
    recoverSocialView(activeSocial, 'درخواست کاربر', true);
  });

  document.querySelectorAll('[data-social]').forEach((button) => {
    button.addEventListener('click', () => activateSocial(button.dataset.social));
  });

  window.cafeDesk.onDownloadStatus?.((payload) => {
    if (!payload) return;
    if (payload.state === 'completed') {
      showToast('✓ ذخیره شد: ' + (payload.filename || 'فایل'), 'success');
      if (socialDialog?.classList.contains('folder-mode')) {
        loadPrintFolder(currentPrintFolderPath || '');
      }
    } else if (payload.state === 'interrupted') {
      showToast('ذخیره فایل کامل نشد: ' + (payload.filename || 'فایل'), 'error');
    }
  });

  window.cafeDesk.onGuestOpenTab?.((payload) => {
    const url = String(payload?.url || '');
    if (!/^https?:/i.test(url)) return;

    const paneMatch = tabByWebContentsId(payload.sourceId);
    if (paneMatch) {
      openInternalTab(paneMatch.side, url, paneMatch.tab.site);
      return;
    }

    const socialMatch = socialViewByWebContentsId(payload.sourceId);
    if (socialMatch) {
      try { socialMatch.view.loadURL(url); } catch {}
    }
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
      if (socialDialog?.classList.contains('folder-mode')) loadPrintFolder('');
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
  refreshPasswordManager();

  renderSites();
  renderPicker();
  generatePassword();

  window.cafeDesk.getVersion()
    .then((version) => {
      $('versionText').textContent = 'v' + version;
    })
    .catch(() => {});
})();
