(() => {
  'use strict';

  const STORAGE_KEY = 'cafedesk.sites.v1';
  const $ = (id) => document.getElementById(id);

  const dashboardView = $('dashboardView');
  const workspaceView = $('workspaceView');
  const showDashboardBtn = $('showDashboardBtn');
  const showWorkspaceBtn = $('showWorkspaceBtn');
  const backDashboardBtn = $('backDashboardBtn');

  const sitesGrid = $('sitesGrid');
  const sitesEmpty = $('sitesEmpty');
  const workspaceSites = $('workspaceSites');

  const siteDialog = $('siteDialog');
  const siteForm = $('siteForm');
  const addSiteBtn = $('addSiteBtn');
  const saveSiteBtn = $('saveSiteBtn');
  const siteNameInput = $('siteNameInput');
  const siteUrlInput = $('siteUrlInput');
  const siteFormError = $('siteFormError');

  const hourHand = $('hourHand');
  const minuteHand = $('minuteHand');
  const secondHand = $('secondHand');

  const panes = {
    right: {
      section: document.querySelector('[data-pane="right"]'),
      slot: $('rightSlot'),
      title: $('rightTitle'),
      webview: null
    },
    left: {
      section: document.querySelector('[data-pane="left"]'),
      slot: $('leftSlot'),
      title: $('leftTitle'),
      webview: null
    }
  };

  let activePane = 'right';
  let webviewCounter = 0;

  function loadSites() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return [];
    }
  }

  let sites = loadSites();

  function saveSites() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sites));
  }

  function escapeText(value) {
    return String(value ?? '');
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
      return url;
    }
  }

  function createSiteCard(site, index, compact = false) {
    if (compact) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `workspace-site-pill tone-${index % 8}`;
      button.textContent = site.name;
      button.title = site.url;
      button.addEventListener('click', () => openSite(site, activePane));
      return button;
    }

    const card = document.createElement('article');
    card.className = `site-card tone-${index % 8}`;
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `باز کردن ${site.name}`);

    const top = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = escapeText(site.name);
    const url = document.createElement('div');
    url.className = 'url';
    url.textContent = hostLabel(site.url);
    top.append(title, url);

    const open = document.createElement('div');
    open.className = 'site-open';
    open.textContent = 'باز کردن در پنجره انتخاب‌شده ←';

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
    });

    card.append(top, open, remove);
    card.addEventListener('click', () => openSite(site, activePane));
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openSite(site, activePane);
      }
    });
    return card;
  }

  function renderSites() {
    sitesGrid.replaceChildren();
    workspaceSites.replaceChildren();

    sites.forEach((site, index) => {
      sitesGrid.appendChild(createSiteCard(site, index));
      workspaceSites.appendChild(createSiteCard(site, index, true));
    });

    sitesEmpty.classList.toggle('hidden', sites.length > 0);
  }

  function showDashboard() {
    dashboardView.classList.remove('hidden');
    workspaceView.classList.add('hidden');
    showDashboardBtn.classList.add('active');
    showWorkspaceBtn.classList.remove('active');
  }

  function showWorkspace() {
    workspaceView.classList.remove('hidden');
    dashboardView.classList.add('hidden');
    showWorkspaceBtn.classList.add('active');
    showDashboardBtn.classList.remove('active');
  }

  function setActivePane(side) {
    activePane = side;
    Object.entries(panes).forEach(([key, pane]) => {
      pane.section.classList.toggle('active-pane', key === side);
    });
  }

  function placeholder(side, line = 'یک کارت سایت را انتخاب کنید.') {
    const label = side === 'right' ? 'پنجره راست' : 'پنجره چپ';
    return `<div class="pane-placeholder"><strong>${label}</strong><span>${line}</span></div>`;
  }

  function openSite(site, side) {
    const pane = panes[side];
    if (!pane) return;

    if (pane.webview) {
      try { pane.webview.remove(); } catch {}
      pane.webview = null;
    }

    pane.slot.innerHTML = '';
    const webview = document.createElement('webview');
    const partition = `cafedesk-${side}-${Date.now()}-${++webviewCounter}`;

    webview.setAttribute('partition', partition);
    webview.setAttribute('src', site.url);
    webview.setAttribute('allowpopups', 'false');
    webview.setAttribute('webpreferences', 'contextIsolation=yes,nodeIntegration=no,sandbox=yes');
    webview.setAttribute('aria-label', site.name);

    webview.addEventListener('did-start-loading', () => {
      pane.title.textContent = site.name + ' …';
    });

    webview.addEventListener('did-stop-loading', () => {
      pane.title.textContent = site.name;
    });

    webview.addEventListener('did-fail-load', (event) => {
      if (event.errorCode === -3) return;
      pane.title.textContent = site.name + ' — خطا در بارگذاری';
    });

    pane.slot.appendChild(webview);
    pane.webview = webview;
    pane.title.textContent = site.name;
    setActivePane(side);
    showWorkspace();
  }

  function closePane(side) {
    const pane = panes[side];
    if (pane.webview) {
      try { pane.webview.remove(); } catch {}
      pane.webview = null;
    }
    pane.title.textContent = side === 'right' ? 'پنجره راست' : 'پنجره چپ';
    pane.slot.innerHTML = placeholder(side);
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
      id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()),
      name,
      url,
      createdAt: Date.now()
    });
    saveSites();
    renderSites();
    siteDialog.close();
  });

  siteForm.addEventListener('submit', (event) => {
    if (event.submitter?.value === 'cancel') return;
    event.preventDefault();
  });

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
    const x = Number(a), y = Number(b);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return 0;
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
      calcCurrent = '0'; calcStored = null; calcOperator = null; calcReset = false;
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
    else copyStatus.textContent = 'رمز جدید ساخته شد';
  }

  passwordLength.addEventListener('input', () => {
    passwordLengthValue.textContent = passwordLength.value;
  });
  generatePasswordBtn.addEventListener('click', generatePassword);
  copyPasswordBtn.addEventListener('click', () => copyText(passwordOutput.value));
  passwordOutput.addEventListener('click', () => passwordOutput.select());

  renderSites();
  generatePassword();
  window.cafeDesk.getVersion().then((version) => {
    $('versionText').textContent = 'v' + version;
  }).catch(() => {});
})();
