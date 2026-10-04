(() => {
  'use strict';

  const SITES_KEY = 'cafedesk.sites.v1';
  const UI_ZOOM_KEY = 'cafedesk.uiZoom.v1';
  const SITE_ZOOM_KEY = 'cafedesk.siteZoom.v1';

  const $ = (id) => document.getElementById(id);

  const dashboardView = $('dashboardView');
  const workspaceView = $('workspaceView');
  const showDashboardBtn = $('showDashboardBtn');
  const showWorkspaceBtn = $('showWorkspaceBtn');
  const backDashboardBtn = $('backDashboardBtn');

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
  const openToolsBtn = $('openToolsBtn');
  const closeToolsBtn = $('closeToolsBtn');

  const uiZoomSelect = $('uiZoomSelect');
  const siteZoomSelect = $('siteZoomSelect');

  const hourHand = $('hourHand');
  const minuteHand = $('minuteHand');
  const secondHand = $('secondHand');

  const panes = {
    right: {
      section: document.querySelector('[data-pane="right"]'),
      slot: $('rightSlot'),
      title: $('rightTitle'),
      webview: null,
      site: null
    },
    left: {
      section: document.querySelector('[data-pane="left"]'),
      slot: $('leftSlot'),
      title: $('leftTitle'),
      webview: null,
      site: null
    }
  };

  let activePane = 'right';
  let pickerTargetSide = 'right';
  let webviewCounter = 0;
  let siteZoom = 100;

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

  let sites = loadSites();

  function saveSites() {
    localStorage.setItem(SITES_KEY, JSON.stringify(sites));
  }

  function normalizeUrl(raw) {
    const value = String(raw || '').trim();
    if (!value) throw new Error('لینک سایت را وارد کنید.');
    const prepared = /^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(value) ? value : 'https://' + value;
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

  function createSiteCard(site, index) {
    const card = document.createElement('article');
    card.className = `site-card tone-${index % 10}`;
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.title = site.url;

    const top = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = site.name;

    const url = document.createElement('div');
    url.className = 'url';
    url.textContent = hostLabel(site.url);
    top.append(title, url);

    const open = document.createElement('div');
    open.className = 'site-open';
    open.textContent = 'باز کردن ←';

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

    card.append(top, open, remove);

    const openFromDashboard = () => {
      let target = activePane;
      if (!panes.right.webview) target = 'right';
      else if (!panes.left.webview) target = 'left';
      openSite(site, target);
    };

    card.addEventListener('click', openFromDashboard);
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openFromDashboard();
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
    button.className = `picker-site tone-${index % 10}`;
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
    dashboardView.classList.remove('hidden');
    workspaceView.classList.add('hidden');
    showDashboardBtn.classList.add('active');
    showWorkspaceBtn.classList.remove('active');
    setTimeout(() => siteSearchInput.focus(), 60);
  }

  function showWorkspace() {
    workspaceView.classList.remove('hidden');
    dashboardView.classList.add('hidden');
    showWorkspaceBtn.classList.add('active');
    showDashboardBtn.classList.remove('active');
  }

  function setActivePane(side) {
    if (!panes[side]) return;
    activePane = side;
    Object.entries(panes).forEach(([key, pane]) => {
      pane.section.classList.toggle('active-pane', key === side);
    });
  }

  function makePlaceholder(side) {
    const wrapper = document.createElement('div');
    wrapper.className = 'pane-placeholder';
    wrapper.dataset.activatePane = side;

    const strong = document.createElement('strong');
    strong.textContent = side === 'right' ? 'پنجره راست' : 'پنجره چپ';

    const span = document.createElement('span');
    span.textContent = side === 'right'
      ? 'یک سایت انتخاب کنید؛ فقط همین نیمه باز می‌شود.'
      : 'این نیمه مستقل است و تا انتخاب شما خالی می‌ماند.';

    const button = document.createElement('button');
    button.className = 'placeholder-choose';
    button.type = 'button';
    button.textContent = 'انتخاب سایت';
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      openSitePicker(side);
    });

    wrapper.addEventListener('click', () => setActivePane(side));
    wrapper.append(strong, span, button);
    return wrapper;
  }

  function applySiteZoom(webview) {
    if (!webview) return;
    const factor = Math.min(1.5, Math.max(0.5, siteZoom / 100));
    try {
      webview.setZoomFactor(factor);
    } catch {}
  }

  function openSite(site, side) {
    const pane = panes[side];
    if (!pane) return;

    if (pane.webview) {
      try { pane.webview.remove(); } catch {}
      pane.webview = null;
    }

    pane.slot.replaceChildren();

    const webview = document.createElement('webview');
    const partition = `cafedesk-isolated-${side}-${Date.now()}-${++webviewCounter}`;

    webview.setAttribute('partition', partition);
    webview.setAttribute('src', site.url);
    webview.setAttribute('allowpopups', 'false');
    webview.setAttribute('webpreferences', 'contextIsolation=yes,nodeIntegration=no,sandbox=yes');
    webview.setAttribute('aria-label', site.name);

    webview.addEventListener('dom-ready', () => applySiteZoom(webview));
    webview.addEventListener('did-start-loading', () => {
      pane.title.textContent = site.name + ' …';
    });
    webview.addEventListener('did-stop-loading', () => {
      pane.title.textContent = site.name;
      applySiteZoom(webview);
    });
    webview.addEventListener('did-fail-load', (event) => {
      if (event.errorCode === -3) return;
      pane.title.textContent = site.name + ' — خطا';
    });

    pane.slot.appendChild(webview);
    pane.webview = webview;
    pane.site = site;
    pane.title.textContent = site.name;

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
    pane.title.textContent = side === 'right' ? 'پنجره راست' : 'پنجره چپ';
    pane.slot.replaceChildren(makePlaceholder(side));
    setActivePane(side);
  }

  function browserAction(side, action) {
    const pane = panes[side];
    const webview = pane?.webview;

    if (action === 'home') {
      closePane(side);
      return;
    }
    if (!webview) return;

    try {
      if (action === 'back' && webview.canGoBack()) webview.goBack();
      if (action === 'forward' && webview.canGoForward()) webview.goForward();
      if (action === 'reload') webview.reload();
    } catch {}
  }

  function openSitePicker(side) {
    pickerTargetSide = side;
    setActivePane(side);
    pickerSideLabel.textContent = side === 'right' ? 'راست' : 'چپ';
    pickerSearchInput.value = '';
    renderPicker();
    sitePickerDialog.showModal();
    setTimeout(() => pickerSearchInput.focus(), 60);
  }

  // Add site
  addSiteBtn.addEventListener('click', () => {
    siteForm.reset();
    siteFormError.textContent = '';
    siteDialog.showModal();
    setTimeout(() => siteNameInput.focus(), 60);
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

  // View navigation
  showDashboardBtn.addEventListener('click', showDashboard);
  showWorkspaceBtn.addEventListener('click', showWorkspace);
  backDashboardBtn.addEventListener('click', showDashboard);

  document.querySelectorAll('[data-activate-pane]').forEach((button) => {
    button.addEventListener('click', () => setActivePane(button.dataset.activatePane));
  });

  document.querySelectorAll('.browser-pane').forEach((pane) => {
    pane.addEventListener('mousedown', () => setActivePane(pane.dataset.pane));
  });

  document.querySelectorAll('[data-browser-action]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      browserAction(button.dataset.side, button.dataset.browserAction);
    });
  });

  document.querySelectorAll('[data-choose-site]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      openSitePicker(button.dataset.chooseSite);
    });
  });

  // Zoom
  function safeStoredZoom(key, fallback = 100) {
    const n = Number(localStorage.getItem(key));
    return [80, 90, 100, 110].includes(n) ? n : fallback;
  }

  async function setUiZoom(percent) {
    const value = [80, 90, 100, 110].includes(Number(percent)) ? Number(percent) : 100;
    localStorage.setItem(UI_ZOOM_KEY, String(value));
    uiZoomSelect.value = String(value);
    try { await window.cafeDesk.setUiZoom(value); } catch {}
  }

  function setSiteZoom(percent) {
    const value = [80, 90, 100, 110].includes(Number(percent)) ? Number(percent) : 100;
    siteZoom = value;
    localStorage.setItem(SITE_ZOOM_KEY, String(value));
    siteZoomSelect.value = String(value);
    Object.values(panes).forEach((pane) => applySiteZoom(pane.webview));
  }

  uiZoomSelect.addEventListener('change', () => setUiZoom(Number(uiZoomSelect.value)));
  siteZoomSelect.addEventListener('change', () => setSiteZoom(Number(siteZoomSelect.value)));

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
  updateClock();
  setInterval(updateClock, 250);

  // Tools
  openToolsBtn.addEventListener('click', () => toolsDialog.showModal());
  closeToolsBtn.addEventListener('click', () => toolsDialog.close());

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
    return String(Math.round((value + Number.EPSILON) * 1e10) / 1e10);
  }

  function handleCalc(key) {
    if (/^\d$/.test(key)) {
      if (calcCurrent === '0' || calcReset || calcCurrent === 'خطا') calcCurrent = key;
      else if (calcCurrent.length < 16) calcCurrent += key;
      calcReset = false;
      calcRender();
      return;
    }

    if (key === '.') {
      if (calcReset || calcCurrent === 'خطا') {
        calcCurrent = '0.';
        calcReset = false;
      } else if (!calcCurrent.includes('.')) {
        calcCurrent += '.';
      }
      calcRender();
      return;
    }

    if (key === 'C') {
      calcCurrent = '0';
      calcStored = null;
      calcOperator = null;
      calcReset = false;
      calcRender();
      return;
    }

    if (key === '⌫') {
      if (calcReset || calcCurrent === 'خطا') calcCurrent = '0';
      else calcCurrent = calcCurrent.length > 1 ? calcCurrent.slice(0, -1) : '0';
      calcRender();
      return;
    }

    if (key === '%') {
      calcCurrent = formatNumber(Number(calcCurrent) / 100);
      calcReset = true;
      calcRender();
      return;
    }

    if (['+', '-', '×', '÷'].includes(key)) {
      if (calcOperator && calcStored !== null && !calcReset) {
        calcCurrent = formatNumber(calculate(calcStored, calcCurrent, calcOperator));
      }
      calcStored = calcCurrent;
      calcOperator = key;
      calcReset = true;
      calcRender();
      return;
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

  // Password generator + copy
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
      copyText.timer = setTimeout(() => { copyStatus.textContent = ''; }, 1500);
    } catch {
      copyStatus.textContent = 'کپی انجام نشد';
    }
  }

  async function generatePassword() {
    const length = Number(passwordLength.value) || 16;
    const value = makePassword(length);
    passwordOutput.value = value;
    if (autoCopyPassword.checked) await copyText(value, 'رمز ساخته و خودکار کپی شد');
    else {
      copyStatus.textContent = 'رمز جدید ساخته شد';
      clearTimeout(copyText.timer);
      copyText.timer = setTimeout(() => { copyStatus.textContent = ''; }, 1500);
    }
  }

  passwordLength.addEventListener('input', () => {
    passwordLengthValue.textContent = passwordLength.value;
  });
  generatePasswordBtn.addEventListener('click', generatePassword);
  copyPasswordBtn.addEventListener('click', () => copyText(passwordOutput.value));
  passwordOutput.addEventListener('click', () => passwordOutput.select());

  // Initial state
  renderSites();
  renderPicker();
  generatePassword();

  setSiteZoom(safeStoredZoom(SITE_ZOOM_KEY, 100));
  setUiZoom(safeStoredZoom(UI_ZOOM_KEY, 100));

  window.cafeDesk.getVersion().then((version) => {
    $('versionText').textContent = 'v' + version;
  }).catch(() => {});
})();
