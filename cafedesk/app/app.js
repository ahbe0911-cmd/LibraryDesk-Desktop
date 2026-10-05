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
  const passwordManagerSearch = $('passwordManagerSearch');
  const passwordManagerAutoCopy = $('passwordManagerAutoCopy');
  const savedPasswordCount = $('savedPasswordCount');

  const socialDialog = $('socialDialog');
  const closeSocialBtn = $('closeSocialBtn');
  const reloadSocialBtn = $('reloadSocialBtn');
  const socialTitle = $('socialTitle');
  const socialWebviewHost = $('socialWebviewHost');
  const socialBrowserPanel = $('socialBrowserPanel');
  const chooseSocialStorageBtn = $('chooseSocialStorageBtn');
  const openSocialStorageBtn = $('openSocialStorageBtn');
  const socialStoragePathLabel = $('socialStoragePathLabel');
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

  const printDialog = $('printDialog');
  const closePrintDialogBtn = $('closePrintDialogBtn');
  const cancelPrintBtn = $('cancelPrintBtn');
  const confirmPrintBtn = $('confirmPrintBtn');
  const systemPrintDialogBtn = $('systemPrintDialogBtn');
  const printDestination = $('printDestination');
  const printPagesMode = $('printPagesMode');
  const printCustomPagesWrap = $('printCustomPagesWrap');
  const printCustomPages = $('printCustomPages');
  const printCopies = $('printCopies');
  const printPaperSize = $('printPaperSize');
  const printPagesPerSheet = $('printPagesPerSheet');
  const printScale = $('printScale');
  const printColor = $('printColor');
  const printOrientation = $('printOrientation');
  const printDuplex = $('printDuplex');
  const printDuplexEdgeWrap = $('printDuplexEdgeWrap');
  const printDuplexEdge = $('printDuplexEdge');
  const printMargins = $('printMargins');
  const printPreviewImage = $('printPreviewImage');
  const printPreviewGrid = $('printPreviewGrid');
  const printPreviewPlaceholder = $('printPreviewPlaceholder');
  const printSheetCount = $('printSheetCount');
  const printDocumentTitle = $('printDocumentTitle');

  const screenshotFormatDialog = $('screenshotFormatDialog');
  const cancelScreenshotFormatBtn = $('cancelScreenshotFormatBtn');
  const saveScreenshotJpgBtn = $('saveScreenshotJpgBtn');
  const saveScreenshotPdfBtn = $('saveScreenshotPdfBtn');

  const uiZoomSelect = $('uiZoomSelect');

  const digitalClock = $('digitalClock');
  const jalaliDateText = $('jalaliDateText');
  const headerDateTime = document.querySelector('.header-datetime');
  const closeWorkspaceBtn = $('closeWorkspaceBtn');

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
  let tabSequence = 0;
  let activeSocial = 'rubika';
  let currentPrintFolderPath = '';
  let printFolderItems = [];
  const printFolderSelection = new Set();
  let printFolderLastIndex = -1;
  let printFolderViewMode = localStorage.getItem('cafedesk.printViewMode.v1') || 'details';
  const socialHealth = new Map();
  let toastTimer = null;

  const SOCIAL_MOBILE_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';
  const socialApps = {
    rubika: { id: 'social-rubika', kind: 'social', name: 'روبیکا', url: 'https://m.rubika.ir/' },
    shad: { id: 'social-shad', kind: 'social', name: 'شاد', url: 'https://my.shad.ir/' },
    eitaa: { id: 'social-eitaa', kind: 'social', name: 'ایتا', url: 'https://web.eitaa.com/' },
    telegram: { id: 'social-telegram', kind: 'social', name: 'تلگرام', url: 'https://web.telegram.org/k/' }
  };
  const paneToastTimers = { right: null, left: null };

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

  function showPaneToast(side, message, type = 'success') {
    const host = panes[side]?.host;
    if (!host) return showToast(message, type);
    let toast = host.querySelector('.pane-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'pane-toast';
      toast.setAttribute('role', 'status');
      host.append(toast);
    }
    clearTimeout(paneToastTimers[side]);
    toast.textContent = String(message || '');
    toast.classList.toggle('error', type === 'error');
    toast.classList.add('show');
    paneToastTimers[side] = setTimeout(() => toast.classList.remove('show'), 3000);
  }

  let socialToastTimer = null;
  function showSocialToast(message, type = 'success') {
    const phone = document.querySelector('.iphone18-screen') || socialBrowserPanel;
    if (!phone) return showToast(message, type);
    let toast = phone.querySelector('.social-phone-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'social-phone-toast';
      toast.setAttribute('role', 'status');
      phone.append(toast);
    }
    clearTimeout(socialToastTimer);
    toast.textContent = String(message || '');
    toast.classList.toggle('error', type === 'error');
    toast.classList.add('show');
    socialToastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
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


  let printTargetWebview = null;
  let printTargetId = 0;
  let printPreviewDataUrl = '';
  let printPreviewRefreshTimer = null;
  let printPreviewFrame = 0;
  let printPreviewRequestVersion = 0;

  function currentPrintUiOptions() {
    return {
      pageRangesText: printPagesMode?.value === 'custom' ? String(printCustomPages?.value || '').trim() : '',
      copies: Number(printCopies?.value || 1),
      pageSize: printPaperSize?.value || 'A4',
      pagesPerSheet: Number(printPagesPerSheet?.value || 1),
      scaleFactor: Number(printScale?.value || 100),
      color: printColor?.value !== 'gray',
      landscape: printOrientation?.value === 'landscape',
      duplexMode: printDuplex?.checked ? (printDuplexEdge?.value || 'longEdge') : 'simplex',
      marginType: printMargins?.value || 'printableArea',
      printBackground: true
    };
  }

  function printPaperRatio(pageSize, landscape) {
    const ratios = { A3:[297,420], A4:[210,297], A5:[148,210], Letter:[8.5,11], Legal:[8.5,14], Tabloid:[11,17] };
    const pair = ratios[pageSize] || ratios.A4;
    const width = landscape ? pair[1] : pair[0];
    const height = landscape ? pair[0] : pair[1];
    return width + ' / ' + height;
  }

  function renderLivePrintPreview() {
    const paper = printPreviewGrid?.closest('.print-paper-preview');
    if (!paper || !printPreviewGrid) return;

    const options = currentPrintUiOptions();
    const pps = [1,2,4,6,9,16].includes(options.pagesPerSheet) ? options.pagesPerSheet : 1;
    const layouts = { 1:[1,1], 2:[2,1], 4:[2,2], 6:[2,3], 9:[3,3], 16:[4,4] };
    const layout = layouts[pps] || [1,1];

    paper.style.aspectRatio = printPaperRatio(options.pageSize, options.landscape);
    paper.dataset.pagesPerSheet = String(pps);

    const marginPx = options.marginType === 'none' ? 0 : (options.marginType === 'default' ? 18 : 10);
    printPreviewGrid.style.padding = marginPx + 'px';
    printPreviewGrid.style.gridTemplateColumns = 'repeat(' + layout[0] + ', minmax(0, 1fr))';
    printPreviewGrid.style.gridTemplateRows = 'repeat(' + layout[1] + ', minmax(0, 1fr))';

    let cells = Array.from(printPreviewGrid.querySelectorAll('.print-preview-cell'));
    if (cells.length !== pps) {
      const fragment = document.createDocumentFragment();
      for (let index = 0; index < pps; index += 1) {
        const cell = document.createElement('div');
        cell.className = 'print-preview-cell';
        const image = document.createElement('img');
        image.alt = index === 0 ? 'پیش‌نمایش صفحه برای چاپ' : '';
        cell.append(image);
        fragment.append(cell);
      }
      printPreviewGrid.replaceChildren(fragment);
      cells = Array.from(printPreviewGrid.querySelectorAll('.print-preview-cell'));
    }

    const scale = Math.max(.1, Math.min(2, options.scaleFactor / 100));
    cells.forEach((cell, index) => {
      const image = cell.querySelector('img');
      if (!image) return;
      if (printPreviewDataUrl) {
        if (image.src !== printPreviewDataUrl) image.src = printPreviewDataUrl;
      } else {
        image.removeAttribute('src');
      }
      image.alt = index === 0 ? 'پیش‌نمایش صفحه برای چاپ' : '';
      image.style.filter = options.color ? 'none' : 'grayscale(1)';
      image.style.transform = 'scale(' + scale + ')';
      image.style.transformOrigin = 'top center';
    });

    paper.classList.toggle('ready', Boolean(printPreviewDataUrl));
  }

  function renderLivePrintPreviewBatched() {
    if (printPreviewFrame) cancelAnimationFrame(printPreviewFrame);
    printPreviewFrame = requestAnimationFrame(() => {
      printPreviewFrame = 0;
      renderLivePrintPreview();
    });
  }

  async function refreshPrintPreviewFromBackend(immediate = false) {
    clearTimeout(printPreviewRefreshTimer);
    const requestVersion = ++printPreviewRequestVersion;

    const run = async () => {
      if (!printTargetId || !printDialog?.open) return;
      try {
        const targetId = printTargetId;
        const preview = await window.cafeDesk.preparePrint(targetId, currentPrintUiOptions());
        if (
          requestVersion !== printPreviewRequestVersion ||
          !preview ||
          !printDialog.open ||
          targetId !== printTargetId
        ) return;

        if (preview.previewDataUrl) printPreviewDataUrl = preview.previewDataUrl;
        renderLivePrintPreviewBatched();

        const pages = Math.max(1, Number(preview.pageCount) || 1);
        const sheets = Math.max(1, Number(preview.sheetCount) || 1);
        if (printSheetCount) printSheetCount.textContent = faNumber(pages) + ' صفحه • ' + faNumber(sheets) + ' برگ';
        if (printDocumentTitle && preview.title) printDocumentTitle.textContent = preview.title;
      } catch {}
    };

    if (immediate) await run();
    else printPreviewRefreshTimer = setTimeout(run, 720);
  }

  function schedulePrintPreviewRefresh({ backend = false } = {}) {
    renderLivePrintPreviewBatched();
    if (backend) refreshPrintPreviewFromBackend(false);
  }

  function parsePrintRanges(value) {
    const raw = String(value || '').trim();
    if (!raw) return [];

    const ranges = [];
    for (const part of raw.split(',')) {
      const token = part.trim();
      if (!token) continue;
      const match = token.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
      if (!match) continue;
      const start = Math.max(1, Number(match[1]) || 1);
      const end = Math.max(start, Number(match[2] || match[1]) || start);
      ranges.push({ from: start - 1, to: end - 1 });
    }
    return ranges;
  }

  function resetPrintDialogUi() {
    if (printPagesMode) printPagesMode.value = 'all';
    if (printCustomPages) printCustomPages.value = '';
    printCustomPagesWrap?.classList.add('hidden');
    if (printCopies) printCopies.value = '1';
    if (printPaperSize) printPaperSize.value = 'A4';
    if (printPagesPerSheet) printPagesPerSheet.value = '1';
    if (printScale) printScale.value = '100';
    if (printColor) printColor.value = 'color';
    if (printOrientation) printOrientation.value = 'portrait';
    if (printDuplex) printDuplex.checked = false;
    printDuplexEdgeWrap?.classList.add('hidden');
    if (printDuplexEdge) printDuplexEdge.value = 'longEdge';
    if (printMargins) printMargins.value = 'printableArea';
    if (printSheetCount) printSheetCount.textContent = 'در حال آماده‌سازی…';
    printPreviewDataUrl = '';
    if (printPreviewImage) printPreviewImage.removeAttribute('src');
    printPreviewGrid?.replaceChildren();
    printPreviewGrid?.closest('.print-paper-preview')?.classList.remove('ready');
  }

  async function printWebview(webview) {
    if (!webview || !printDialog) return;
    printTargetWebview = webview;
    try { printTargetId = webview.getWebContentsId(); } catch { printTargetId = 0; }
    if (!printTargetId) return;

    resetPrintDialogUi();
    if (printDocumentTitle) {
      let title = 'صفحه فعلی';
      try { title = webview.getTitle?.() || hostLabel(webview.getURL?.()) || title; } catch {}
      printDocumentTitle.textContent = title;
    }

    printDialog.showModal();

    const [printers, preview] = await Promise.all([
      window.cafeDesk.getPrinters?.().catch?.(() => []) || Promise.resolve([]),
      window.cafeDesk.preparePrint?.(printTargetId, currentPrintUiOptions()).catch?.(() => null) || Promise.resolve(null)
    ]);

    if (printDestination) {
      printDestination.replaceChildren();
      const list = Array.isArray(printers) ? printers : [];
      if (!list.length) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'چاپگر پیش‌فرض ویندوز';
        printDestination.append(option);
      } else {
        list.forEach((printer) => {
          const option = document.createElement('option');
          option.value = printer.name || '';
          option.textContent = printer.displayName || printer.name || 'چاپگر';
          if (printer.isDefault) option.selected = true;
          printDestination.append(option);
        });
      }
    }

    if (preview && printDialog.open) {
      if (preview.previewDataUrl) printPreviewDataUrl = preview.previewDataUrl;
      if (printDocumentTitle && preview.title) printDocumentTitle.textContent = preview.title;
      const pages = Math.max(1, Number(preview.pageCount) || 1);
      const sheets = Math.max(1, Number(preview.sheetCount) || 1);
      if (printSheetCount) printSheetCount.textContent = faNumber(pages) + ' صفحه • ' + faNumber(sheets) + ' برگ';
      renderLivePrintPreview();
    }
  }

  async function submitCafeDeskPrint(useSystemDialog = false) {
    if (!printTargetId) return;
    confirmPrintBtn && (confirmPrintBtn.disabled = true);
    systemPrintDialogBtn && (systemPrintDialogBtn.disabled = true);

    try {
      if (useSystemDialog) {
        printDialog?.close();
        await window.cafeDesk.printGuestSystem(printTargetId);
        return;
      }

      const pageRanges = printPagesMode?.value === 'custom'
        ? parsePrintRanges(printCustomPages?.value)
        : [];

      if (printPagesMode?.value === 'custom' && !pageRanges.length) {
        alert('محدوده صفحات را مثل 1-3, 5 وارد کنید.');
        return;
      }

      const uiOptions = currentPrintUiOptions();
      const result = await window.cafeDesk.printGuest(printTargetId, {
        deviceName: printDestination?.value || '',
        pageRanges,
        ...uiOptions,
        collate: true
      });

      if (!result?.ok) {
        alert('چاپ انجام نشد: ' + (result?.message || 'خطای چاپگر'));
        return;
      }

      const match = tabByWebContentsId(printTargetId);
      printDialog?.close();
      if (match?.side) showPaneToast(match.side, '✓ فایل به چاپگر ارسال شد', 'success');
      else showToast('✓ فایل به چاپگر ارسال شد', 'success');
    } finally {
      confirmPrintBtn && (confirmPrintBtn.disabled = false);
      systemPrintDialogBtn && (systemPrintDialogBtn.disabled = false);
    }
  }

  closePrintDialogBtn?.addEventListener('click', () => printDialog.close());
  cancelPrintBtn?.addEventListener('click', () => printDialog.close());
  confirmPrintBtn?.addEventListener('click', () => submitCafeDeskPrint(false));
  systemPrintDialogBtn?.addEventListener('click', () => submitCafeDeskPrint(true));
  printPagesMode?.addEventListener('change', () => {
    printCustomPagesWrap?.classList.toggle('hidden', printPagesMode.value !== 'custom');
    if (printPagesMode.value === 'custom') printCustomPages?.focus();
  });
  printDuplex?.addEventListener('change', () => {
    printDuplexEdgeWrap?.classList.toggle('hidden', !printDuplex.checked);
    schedulePrintPreviewRefresh({ backend: false });
  });

  [printCopies, printPagesPerSheet, printColor, printDuplexEdge]
    .filter(Boolean)
    .forEach((control) => {
      control.addEventListener(control.tagName === 'INPUT' ? 'input' : 'change', () => {
        schedulePrintPreviewRefresh({ backend: false });
      });
    });

  [printPagesMode, printCustomPages, printPaperSize, printScale, printOrientation, printMargins]
    .filter(Boolean)
    .forEach((control) => {
      control.addEventListener(control.tagName === 'INPUT' ? 'input' : 'change', () => {
        schedulePrintPreviewRefresh({ backend: true });
      });
    });

  printDialog?.addEventListener('close', () => {
    clearTimeout(printPreviewRefreshTimer);
    printPreviewRequestVersion += 1;
    if (printPreviewFrame) cancelAnimationFrame(printPreviewFrame);
    printPreviewFrame = 0;
    printTargetWebview = null;
    printTargetId = 0;
  });

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

  async function handleCredentialSubmitted(webview, data, side = null) {
    const password = String(data?.password || '');
    const username = String(data?.username || '').trim();
    let url = String(data?.url || '');

    try { if (!url) url = webview.getURL() || ''; } catch {}
    if (!/^https?:/i.test(url) || !password) return;

    let isEblaghCredential = false;
    try {
      const host = new URL(url).hostname.toLowerCase();
      isEblaghCredential = host === 'adliran.ir' || host.endsWith('.adliran.ir');
    } catch {}
    if (isEblaghCredential && data?.verified !== true) return;

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
      if (result?.ok) {
        if (side) {
          showPaneToast(side, '✓ اطلاعات ورود ذخیره شد', 'success');
        } else {
          let isSocial = false;
          try { isSocial = Boolean(socialViewByWebContentsId(webview.getWebContentsId())); } catch {}
          if (isSocial) showSocialToast('✓ اطلاعات ورود ذخیره شد', 'success');
          else showToast('✓ اطلاعات ورود ذخیره شد', 'success');
        }
      }
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
      if (!(/^https?:/i.test(url) || /^blob:https?:/i.test(url) || /^data:application\/pdf/i.test(url))) return;

      if (side && panes[side]) {
        const source = currentPaneTab(side);
        openInternalTab(
          side,
          url,
          source?.site || panes[side].site || { name: hostLabel(url), url },
          payload.method ? payload : null
        );
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
      await handleCredentialSubmitted(webview, event.args?.[0] || {}, side);
    }
  }

  async function captureScreenshot(webview, button, site, side) {
    const originalHtml = button.innerHTML;
    try {
      const id = webview.getWebContentsId();
      button.disabled = true;
      button.innerHTML = '<span class="capture-working">…</span>';
      button.title = 'در حال گرفتن اسکرین‌شات با کیفیت اصلی';

      const result = await window.cafeDesk.exportPageCapture(
        id,
        site?.name || hostLabel(webview.getURL()) || 'CafeDesk',
        'png'
      );
      if (!result?.ok) return;

      button.innerHTML = '<span class="capture-done-check">✓</span>';
      button.title = 'اسکرین‌شات PNG با کیفیت اصلی ذخیره شد';
      if (side) showPaneToast(side, '✓ عکس صفحه ذخیره شد', 'success');
      else showToast('✓ عکس صفحه ذخیره شد', 'success');

      setTimeout(() => {
        button.innerHTML = originalHtml;
        button.title = 'اسکرین‌شات PNG از نمای واقعی صفحه';
      }, 1600);
    } catch (error) {
      alert('گرفتن اسکرین‌شات انجام نشد: ' + (error?.message || error));
      button.innerHTML = originalHtml;
    } finally {
      button.disabled = false;
      if (button.querySelector('.capture-working')) button.innerHTML = originalHtml;
    }
  }

  const TOOL_ICONS = {
    print: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 8V3h10v5M7 17H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M7 14h10v7H7z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="18" cy="11" r="1" fill="currentColor"/></svg>',
    screenshot: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5H5v3M16 5h3v3M8 19H5v-3M16 19h3v-3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><rect x="8" y="8" width="8" height="8" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="2" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
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
    const screenshot = makePaneIconButton('screenshot', 'اسکرین‌شات PNG از نمای واقعی صفحه', () => captureScreenshot(webview, screenshot, site, side));
    screenshot.classList.add('screenshot-btn');

    const downloads = makePaneButton('⬇', 'پوشه دانلودها', () => {
      try { window.cafeDesk.openDownloads(); } catch {}
    });

    const zoomWrap = document.createElement('label');
    zoomWrap.className = 'pane-zoom';
    zoomWrap.title = 'اندازه همین سایت';

    const zoomLabel = document.createElement('span');
    zoomLabel.textContent = 'زوم';

    const zoomSelect = document.createElement('select');
    Array.from({ length: 19 }, (_, index) => 60 + index * 5).forEach((value) => {
      const option = document.createElement('option');
      option.value = String(value);
      option.textContent = faNumber(value) + '٪';
      zoomSelect.append(option);
    });

    const persistZoom = (value) => {
      const percent = saveSiteZoom(site, value);
      zoomSelect.value = String(percent);
      applySiteZoom(webview, percent);
      return percent;
    };

    zoomSelect.value = String(getSiteZoom(site));
    zoomSelect.addEventListener('click', (event) => event.stopPropagation());
    zoomSelect.addEventListener('change', (event) => {
      event.stopPropagation();
      persistZoom(zoomSelect.value);
    });

    const zoomOut = makePaneButton('−', 'کوچک‌تر و ذخیره زوم', () => {
      const current = getSiteZoom(site);
      persistZoom(Math.max(60, current - 5));
    });
    zoomOut.classList.add('zoom-step-btn');

    const zoomIn = makePaneButton('+', 'بزرگ‌تر و ذخیره زوم', () => {
      const current = getSiteZoom(site);
      persistZoom(Math.min(150, current + 5));
    });
    zoomIn.classList.add('zoom-step-btn');

    zoomWrap.append(zoomOut, zoomLabel, zoomSelect, zoomIn);

    const change = makePaneButton('تغییر سایت', 'انتخاب سایت دیگر', () => openSitePicker(side));
    change.classList.add('change-site-btn');

    const close = makePaneButton('×', 'بستن این پنل', () => closePane(side));
    close.classList.add('close-pane-btn');

    actions.append(back, forward, reload, print, screenshot, downloads, zoomWrap, change, close);
    toolbar.append(titleWrap, actions);

    webview.addEventListener('did-start-loading', () => {
      title.textContent = site.name + ' …';
    });

    webview.addEventListener('did-stop-loading', () => {
      title.textContent = site.name;
      applySiteZoom(webview, getSiteZoom(site));
      syncSavedCredentials(webview);
      installPagePrintBridge(webview);
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
      item.addEventListener('click', (event) => {
        event.stopPropagation();
        activatePaneTab(side, tab.id);
      });
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

  async function installPagePrintBridge(webview) {
    if (!webview) return;
    try {
      await webview.executeJavaScript("(() => { if (window.__cafedeskPrintBridgeInstalled) return; window.__cafedeskPrintBridgeInstalled = true; window.print = () => document.dispatchEvent(new CustomEvent('cafedesk-print-request')); })()", true);
    } catch {}
  }

  function makePaneWebview(side, site, url, tab, navigation = null) {
    const pane = panes[side];
    const webview = document.createElement('webview');
    webview.className = 'pane-tab-webview hidden';
    webview.setAttribute('partition', `persist:cafedesk-pane-${side}`);
    webview.setAttribute('preload', GUEST_PRELOAD_URL);
    const isPostNavigation = String(navigation?.method || '').toLowerCase() === 'post' && Array.isArray(navigation?.fields);
    webview.setAttribute('src', isPostNavigation ? 'about:blank' : url);
    webview.setAttribute('allowpopups', 'true');
    webview.setAttribute('plugins', '');
    webview.setAttribute('webpreferences', 'contextIsolation=yes,nodeIntegration=no,sandbox=yes,backgroundThrottling=no');
    if (site?.kind === 'social') webview.setAttribute('useragent', SOCIAL_MOBILE_UA);
    webview.setAttribute('aria-label', site.name || hostLabel(url));

    webview.addEventListener('did-start-loading', () => pane.host.classList.add('loading'));
    let postSubmitted = false;
    webview.addEventListener('dom-ready', async () => {
      if (isPostNavigation && !postSubmitted) {
        postSubmitted = true;
        const postPayload = {
          url,
          fields: navigation.fields,
          enctype: navigation.enctype || 'application/x-www-form-urlencoded'
        };
        const encoded = JSON.stringify(postPayload);
        try {
          await webview.executeJavaScript(`
            (() => {
              const payload = ${encoded};
              const form = document.createElement('form');
              form.method = 'post';
              form.action = payload.url;
              form.enctype = payload.enctype;
              for (const field of payload.fields || []) {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = String(field.name || '');
                input.value = String(field.value || '');
                form.appendChild(input);
              }
              document.body.appendChild(form);
              form.submit();
            })();
          `);
        } catch {
          try { await webview.loadURL(url); } catch {}
        }
        installPagePrintBridge(webview);
        return;
      }
      applySiteZoom(webview, getSiteZoom(site));
      syncSavedCredentials(webview);
    });
    webview.addEventListener('did-stop-loading', () => pane.host.classList.remove('loading'));
    webview.addEventListener('did-fail-load', () => pane.host.classList.remove('loading'));

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
    webview.addEventListener('new-window', (event) => {
      const targetUrl = String(event?.url || '');
      if (!(/^https?:/i.test(targetUrl) || /^blob:https?:/i.test(targetUrl) || /^data:application\/pdf/i.test(targetUrl))) return;
      try { event.preventDefault?.(); } catch {}
      openInternalTab(side, targetUrl, tab.site);
    });
    return webview;
  }

  function createPaneTab(side, site, url, title, navigation = null) {
    const pane = panes[side];
    if (!pane?.frame) return null;

    const tab = {
      id: `tab-${++tabSequence}`,
      site: site || { name: hostLabel(url), url },
      url,
      title: title || site?.name || hostLabel(url) || 'تب جدید',
      webview: null,
      openedAt: Date.now()
    };

    tab.webview = makePaneWebview(side, tab.site, url, tab, navigation);
    pane.tabs.push(tab);
    pane.frame.append(tab.webview);
    activatePaneTab(side, tab.id);
    return tab;
  }

  function openInternalTab(side, url, sourceSite, navigation = null) {
    const targetUrl = String(url || '');
    const allowedTarget = /^https?:/i.test(targetUrl) || /^blob:https?:/i.test(targetUrl) || /^data:application\/pdf/i.test(targetUrl);
    if (!allowedTarget) return;

    const pane = panes[side];
    const recent = pane?.tabs?.find((item) => item.url === url && Date.now() - Number(item.openedAt || 0) < 900);
    if (recent && !navigation?.method) {
      activatePaneTab(side, recent.id);
      return;
    }

    const site = {
      ...(sourceSite || {}),
      name: hostLabel(url) || sourceSite?.name || 'تب جدید',
      url
    };
    createPaneTab(side, site, url, hostLabel(url) || 'تب جدید', navigation);
  }

  async function closePaneTab(side, tabId) {
    const pane = panes[side];
    const index = pane?.tabs?.findIndex((tab) => tab.id === tabId) ?? -1;
    if (!pane || index < 0) return;

    const [tab] = pane.tabs.splice(index, 1);
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
      try { tab.webview.remove(); } catch {}
    });

    pane.slot.onclick = null;
    pane.slot.removeAttribute('data-empty-side');
    pane.slot.replaceChildren();
    pane.slot.className = 'pane-slot';

    const shell = document.createElement('div');
    shell.className = 'browser-shell';

    const loadingBar = document.createElement('div');
    loadingBar.className = 'pane-loading-bar';
    loadingBar.setAttribute('aria-hidden', 'true');

    const tabbar = document.createElement('div');
    tabbar.className = 'pane-tabbar';

    const toolbarHost = document.createElement('div');
    toolbarHost.className = 'pane-toolbar-host';

    const frame = document.createElement('div');
    frame.className = 'webview-frame';

    shell.append(loadingBar, tabbar, toolbarHost, frame);
    pane.slot.append(shell);

    pane.tabs = [];
    pane.activeTabId = null;
    pane.shell = shell;
    pane.loadingBar = loadingBar;
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
    pane.slot.dataset.emptySide = side;
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

  let passwordManagerCache = [];

  function normalizeCredentialSearch(value) {
    return String(value || '')
      .trim()
      .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
      .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
      .toLocaleLowerCase();
  }

  function isEblaghCredentialItem(item) {
    try {
      const host = new URL(item?.origin || '').hostname.toLowerCase();
      return host === 'adliran.ir' || host.endsWith('.adliran.ir');
    } catch {
      return false;
    }
  }

  async function copyManagedCredential(item, what = 'password') {
    try {
      const entries = await window.cafeDesk.getCredentials(item.origin);
      const key = normalizeCredentialSearch(item.username);
      const match = (Array.isArray(entries) ? entries : []).find((entry) =>
        normalizeCredentialSearch(entry.username) === key
      );
      if (!match) return;

      const value = what === 'username' ? String(match.username || '') : String(match.password || '');
      if (!value) return;
      await window.cafeDesk.copyText(value);
      showToast(what === 'username' ? '✓ کد ملی / نام کاربری کپی شد' : '✓ رمز کپی شد', 'success');
    } catch {}
  }

  function renderPasswordManager() {
    if (!passwordManagerList) return;

    const query = normalizeCredentialSearch(passwordManagerSearch?.value || '');
    const items = passwordManagerCache.filter((item) => {
      if (!query) return true;
      return (
        normalizeCredentialSearch(item.username).includes(query) ||
        normalizeCredentialSearch(item.origin).includes(query)
      );
    });

    passwordManagerList.replaceChildren();
    if (!items.length) {
      const empty = document.createElement('div');
      empty.className = 'password-manager-empty';
      empty.textContent = query ? 'حسابی با این کد ملی یا سایت پیدا نشد.' : 'هنوز رمزی ذخیره نشده است.';
      passwordManagerList.append(empty);
      return;
    }

    items.forEach((item) => {
      const eblagh = isEblaghCredentialItem(item);
      const row = document.createElement('div');
      row.className = 'password-manager-row' + (eblagh ? ' eblagh-row' : '');
      row.tabIndex = 0;

      const text = document.createElement('div');
      text.className = 'password-manager-identity';

      const titleLine = document.createElement('div');
      titleLine.className = 'password-manager-title-line';

      const strong = document.createElement('strong');
      strong.textContent = eblagh
        ? 'کد ملی: ' + (item.username || '—')
        : (item.username || 'بدون نام کاربری');
      titleLine.append(strong);

      if (eblagh) {
        const badge = document.createElement('span');
        badge.className = 'credential-chip eblagh';
        badge.textContent = 'ثنا / ابلاغ';
        titleLine.append(badge);
      }

      const small = document.createElement('small');
      small.textContent = item.origin;
      text.append(titleLine, small);

      const actions = document.createElement('div');
      actions.className = 'password-manager-actions';

      const copyUser = document.createElement('button');
      copyUser.type = 'button';
      copyUser.className = 'credential-copy-btn';
      copyUser.textContent = eblagh ? 'کپی کد ملی' : 'کپی نام';
      copyUser.addEventListener('click', (event) => {
        event.stopPropagation();
        copyManagedCredential(item, 'username');
      });

      const copyPassword = document.createElement('button');
      copyPassword.type = 'button';
      copyPassword.className = 'credential-copy-btn primary';
      copyPassword.textContent = 'کپی رمز';
      copyPassword.addEventListener('click', (event) => {
        event.stopPropagation();
        copyManagedCredential(item, 'password');
      });

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'credential-remove-btn';
      remove.textContent = 'حذف';
      remove.addEventListener('click', async (event) => {
        event.stopPropagation();
        if (!confirm(`رمز ذخیره‌شده برای «${item.username || item.origin}» حذف شود؟`)) return;
        await window.cafeDesk.deleteCredential(item);
        await refreshPasswordManager();
        Object.values(panes).forEach((pane) => pane.tabs?.forEach((tab) => syncSavedCredentials(tab.webview)));
        socialViews.forEach((view) => syncSavedCredentials(view));
      });

      row.addEventListener('click', () => {
        if (passwordManagerAutoCopy?.checked) copyManagedCredential(item, 'password');
      });
      row.addEventListener('keydown', (event) => {
        if ((event.key === 'Enter' || event.key === ' ') && passwordManagerAutoCopy?.checked) {
          event.preventDefault();
          copyManagedCredential(item, 'password');
        }
      });

      actions.append(copyUser, copyPassword, remove);
      row.append(text, actions);
      passwordManagerList.append(row);
    });
  }

  async function refreshPasswordManager() {
    try { passwordManagerCache = await window.cafeDesk.listCredentials(); }
    catch { passwordManagerCache = []; }

    if (!Array.isArray(passwordManagerCache)) passwordManagerCache = [];
    if (savedPasswordCount) savedPasswordCount.textContent = faNumber(passwordManagerCache.length);
    renderPasswordManager();
  }

  passwordManagerSearch?.addEventListener('input', renderPasswordManager);

  openPasswordManagerBtn?.addEventListener('click', () => {
    toolsDialog.close();
    if (passwordManagerSearch) passwordManagerSearch.value = '';
    passwordManagerDialog.showModal();
    refreshPasswordManager();
    setTimeout(() => passwordManagerSearch?.focus(), 80);
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

      if (!item.isDirectory && window.cafeDesk.getDownloadThumbnail) {
        const loadThumb = () => window.cafeDesk.getDownloadThumbnail(item.path)
          .then((thumb) => {
            if (!thumb?.ok || !thumb.dataUrl || !row.isConnected) return;
            const image = document.createElement('img');
            image.className = 'print-file-thumbnail';
            image.alt = '';
            image.src = thumb.dataUrl;
            icon.replaceChildren(image);
            icon.classList.add('has-thumbnail');
          })
          .catch(() => {});
        if ('requestIdleCallback' in window) requestIdleCallback(loadThumb, { timeout: 700 });
        else setTimeout(loadThumb, 20 + index * 8);
      }

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

  function showSocialStorageFolder(info) {
    if (!socialStoragePathLabel || !info) return;
    const label = info.label || 'Downloads';
    socialStoragePathLabel.textContent = info.inherited ? 'پیش‌فرض: ' + label : label;
    socialStoragePathLabel.title = info.path || '';
    if (chooseSocialStorageBtn) {
      chooseSocialStorageBtn.title = info.path
        ? 'پوشه ذخیره شبکه‌های اجتماعی: ' + info.path
        : 'انتخاب پوشه ذخیره شبکه‌های اجتماعی';
    }
  }

  async function refreshSocialStorageFolder() {
    try {
      showSocialStorageFolder(await window.cafeDesk.getSocialDownloadFolder());
    } catch {}
  }

  chooseSocialStorageBtn?.addEventListener('click', async () => {
    try {
      const result = await window.cafeDesk.chooseSocialDownloadFolder();
      showSocialStorageFolder(result);
      if (result?.ok) showSocialToast('✓ آدرس ذخیره شبکه‌ها ثبت شد', 'success');
    } catch {}
  });

  openSocialStorageBtn?.addEventListener('click', async () => {
    try {
      const result = await window.cafeDesk.openSocialDownloadFolder();
      if (!result?.ok && result?.message) showSocialToast('باز کردن پوشه انجام نشد', 'error');
    } catch {}
  });

  openSocialBtn.addEventListener('click', () => {
    socialDialog.showModal();
    refreshSocialStorageFolder();
    leavePrintFolderMode();
    socialBrowserPanel?.classList.remove('hidden');
    activateSocial(activeSocial);
    setTimeout(() => {
      if (socialDialog.open) prewarmSocialViews();
    }, 850);
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
    const paneMatch = tabByWebContentsId(payload.sourceId);
    const paneSide = paneMatch?.side || null;
    const socialMatch = socialViewByWebContentsId(payload.sourceId);
    if (payload.state === 'completed') {
      const message = '✓ ذخیره شد: ' + (payload.filename || 'فایل');
      if (paneSide) showPaneToast(paneSide, message, 'success');
      else if (socialMatch) showSocialToast('✓ دانلود شد: ' + (payload.filename || 'فایل'), 'success');
      else showToast(message, 'success');
      if (socialDialog?.classList.contains('folder-mode')) loadPrintFolder(currentPrintFolderPath || '');
    } else if (payload.state === 'interrupted') {
      const message = 'ذخیره فایل کامل نشد: ' + (payload.filename || 'فایل');
      if (paneSide) showPaneToast(paneSide, message, 'error');
      else if (socialMatch) showSocialToast(message, 'error');
      else showToast(message, 'error');
    }
  });

  window.cafeDesk.onGuestOpenTab?.((payload) => {
    const url = String(payload?.url || '');
    if (!(/^https?:/i.test(url) || /^blob:https?:/i.test(url) || /^data:application\/pdf/i.test(url))) return;

    const paneMatch = tabByWebContentsId(payload.sourceId);
    if (paneMatch) {
      openInternalTab(paneMatch.side, url, paneMatch.tab.site, payload.method ? payload : null);
      return;
    }

    const socialMatch = socialViewByWebContentsId(payload.sourceId);
    if (socialMatch) {
      try { socialMatch.view.loadURL(url); } catch {}
    }
  });

  closeWorkspaceBtn?.addEventListener('click', () => {
    closePane('right');
    closePane('left');
    showDashboard();
  });

  document.querySelectorAll('.pane-host').forEach((host) => {
    host.addEventListener('mousedown', () => setActivePane(host.dataset.pane));
  });

  Object.entries(panes).forEach(([side, pane]) => {
    if (!pane?.slot?.classList.contains('empty-pane')) return;
    pane.slot.onclick = () => {
      if (!pane.slot.classList.contains('empty-pane')) return;
      setActivePane(side);
      openSitePicker(side);
    };
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

  // Compact digital clock and current Jalali date in the top bar.
  const persianOrdinalDays = [
    '', 'یکم', 'دوم', 'سوم', 'چهارم', 'پنجم', 'ششم', 'هفتم', 'هشتم', 'نهم', 'دهم',
    'یازدهم', 'دوازدهم', 'سیزدهم', 'چهاردهم', 'پانزدهم', 'شانزدهم', 'هفدهم', 'هجدهم', 'نوزدهم',
    'بیستم', 'بیست‌ویکم', 'بیست‌ودوم', 'بیست‌وسوم', 'بیست‌وچهارم', 'بیست‌وپنجم',
    'بیست‌وششم', 'بیست‌وهفتم', 'بیست‌وهشتم', 'بیست‌ونهم', 'سی‌ام', 'سی‌ویکم'
  ];
  const persianMonthNames = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];

  function jalaliNumericParts(date) {
    const formatter = new Intl.DateTimeFormat('en-US-u-ca-persian', {
      year: 'numeric', month: 'numeric', day: 'numeric'
    });
    const parts = Object.fromEntries(
      formatter.formatToParts(date)
        .filter((part) => ['year','month','day'].includes(part.type))
        .map((part) => [part.type, Number(part.value)])
    );
    return { year: parts.year, month: parts.month, day: parts.day };
  }

  function updateHeaderDateTime() {
    const now = new Date();
    if (digitalClock) {
      digitalClock.textContent = new Intl.DateTimeFormat('fa-IR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(now);
    }

    const current = jalaliNumericParts(now);
    const weekday = new Intl.DateTimeFormat('fa-IR', { weekday: 'long' }).format(now);
    const ordinal = persianOrdinalDays[current.day] || faNumber(current.day);
    const month = persianMonthNames[current.month - 1] || '';
    const year = new Intl.NumberFormat('fa-IR', { useGrouping: false }).format(current.year);

    if (jalaliDateText) {
      jalaliDateText.textContent = `امروز، ${weekday}، ${ordinal} ${month} سال ${year}`;
    }
    if (headerDateTime) headerDateTime.dataset.tone = String(current.day % 7);
  }

  updateHeaderDateTime();
  setInterval(updateHeaderDateTime, 1000);

  // Calculator
  const calcDisplay = $('calcDisplay');
  const calcKeys = $('calcKeys');
  let calcCurrent = '0';
  let calcStored = null;
  let calcOperator = null;
  let calcReset = false;

  function calcToPersian(value) {
    return String(value)
      .replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)])
      .replace(/\./g, '٫')
      .replace(/-/g, '−');
  }

  function calcRender() {
    calcDisplay.value = calcCurrent === 'خطا' ? 'خطا' : calcToPersian(calcCurrent);
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

  function normalizeCalcKeyboardKey(key) {
    const persianDigits = '۰۱۲۳۴۵۶۷۸۹';
    const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
    const pIndex = persianDigits.indexOf(key);
    if (pIndex >= 0) return String(pIndex);
    const aIndex = arabicDigits.indexOf(key);
    if (aIndex >= 0) return String(aIndex);
    if (/^\d$/.test(key)) return key;
    if (key === '*' || key === 'x' || key === 'X') return '×';
    if (key === '/') return '÷';
    if (key === 'Enter' || key === '=') return '=';
    if (key === 'Backspace') return '⌫';
    if (key === 'Escape' || key === 'Delete') return 'C';
    if (key === ',' || key === '٫') return '.';
    if (['+','-','%','.'].includes(key)) return key;
    return '';
  }

  document.addEventListener('keydown', (event) => {
    if (!toolsDialog?.open) return;
    const target = event.target;
    const editable = target?.matches?.('input:not([readonly]),textarea,[contenteditable="true"]');
    if (editable) return;

    const calcKey = normalizeCalcKeyboardKey(event.key);
    if (!calcKey) return;
    event.preventDefault();
    handleCalc(calcKey);
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
