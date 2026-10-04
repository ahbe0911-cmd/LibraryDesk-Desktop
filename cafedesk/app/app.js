(() => {
  'use strict';

  const STORAGE_KEY = 'cafedesk.sites.v1';
  const tones = 8;
  const state = {
    activePane: 'right',
    sites: loadSites(),
    panes: {
      right: { webview: null, title: 'پنجره راست' },
      left: { webview: null, title: 'پنجره چپ' }
    },
    calc: '0'
  };

  const $ = (id) => document.getElementById(id);
  const dashboardView = $('dashboardView');
  const workspaceView = $('workspaceView');
  const sitesGrid = $('sitesGrid');
  const sitesEmpty = $('sitesEmpty');
  const workspaceSites = $('workspaceSites');
  const siteDialog = $('siteDialog');
  const siteNameInput = $('siteNameInput');
  const siteUrlInput = $('siteUrlInput');
  const siteFormError = $('siteFormError');

  function loadSites() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (!Array.isArray(raw)) return [];
      return raw.filter(x => x && typeof x.name === 'string' && typeof x.url === 'string');
    } catch {
      return [];
    }
  }

  function saveSites() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.sites));
  }

  function normalizeUrl(value) {
    let url = String(value || '').trim();
    if (!url) return null;
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) url = 'https://' + url;
    try {
      const parsed = new URL(url);
      if (!/^https?:$/i.test(parsed.protocol)) return null;
      return parsed.href;
    } catch {
      return null;
    }
  }

  function displayUrl(url) {
    try {
      const u = new URL(url);
      return u.hostname.replace(/^www\./i, '');
    } catch {
      return url;
    }
  }

  function randomId() {
    const a = new Uint32Array(4);
    crypto.getRandomValues(a);
    return [...a].map(n => n.toString(36)).join('');
  }

  function showDashboard() {
    dashboardView.classList.remove('hidden');
    workspaceView.classList.add('hidden');
    $('showDashboardBtn').classList.add('active');
    $('showWorkspaceBtn').classList.remove('active');
  }

  function showWorkspace() {
    dashboardView.classList.add('hidden');
    workspaceView.classList.remove('hidden');
    $('showDashboardBtn').classList.remove('active');
    $('showWorkspaceBtn').classList.add('active');
  }

  function setActivePane(side) {
    state.activePane = side;
    document.querySelectorAll('.browser-pane').forEach(pane => {
      pane.classList.toggle('active-pane', pane.dataset.pane === side);
    });
  }

  function createSiteCard(site, index, compact = false) {
    if (compact) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `workspace-site-pill tone-${index % tones}`;
      btn.textContent = site.name;
      btn.title = site.url;
      btn.addEventListener('click', () => openSite(site, state.activePane));
      return btn;
    }

    const card = document.createElement('article');
    card.className = `site-card tone-${index % tones}`;
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `باز کردن ${site.name}`);

    const top = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = site.name;
    const url = document.createElement('div');
    url.className = 'url';
    url.textContent = displayUrl(site.url);
    top.append(title, url);

    const open = document.createElement('div');
    open.className = 'site-open';
    open.innerHTML = '<span>باز کردن در پنجره فعال</span><span aria-hidden="true">←</span>';

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'remove-site';
    remove.textContent = '×';
    remove.title = 'حذف سایت';
    remove.addEventListener('click', (event) => {
      event.stopPropagation();
      const yes = confirm(`سایت «${site.name}» حذف شود؟`);
      if (!yes) return;
      state.sites = state.sites.filter(x => x.id !== site.id);
      saveSites();
      renderSites();
    });

    card.append(top, open, remove);
    card.addEventListener('click', () => openSite(site, state.activePane));
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openSite(site, state.activePane);
      }
    });
    return card;
  }

  function renderSites() {
    sitesGrid.replaceChildren();
    workspaceSites.replaceChildren();

    state.sites.forEach((site, index) => {
      sitesGrid.append(createSiteCard(site, index, false));
      workspaceSites.append(createSiteCard(site, index, true));
    });

    const empty = state.sites.length === 0;
    sitesEmpty.classList.toggle('hidden', !empty);

    if (empty) {
      const hint = document.createElement('span');
      hint.className = 'workspace-empty';
      hint.textContent = 'ابتدا از صفحه اصلی یک سایت اضافه کنید.';
      workspaceSites.append(hint);
    }
  }

  function clearPane(side) {
    const pane = state.panes[side];
    if (pane.webview) {
      try { pane.webview.remove(); } catch {}
      pane.webview = null;
    }
    const slot = $(`${side}Slot`);
    slot.replaceChildren();
    const holder = document.createElement('div');
    holder.className = 'pane-placeholder';
    const strong = document.createElement('strong');
    strong.textContent = side === 'right' ? 'پنجره راست' : 'پنجره چپ';
    const span = document.createElement('span');
    span.textContent = 'یک کارت سایت را انتخاب کنید.';
    holder.append(strong, span);
    slot.append(holder);
    pane.title = side === 'right' ? 'پنجره راست' : 'پنجره چپ';
    $(`${side}Title`).textContent = pane.title;
  }

  function openSite(site, side) {
    const slot = $(`${side}Slot`);
    const old = state.panes[side].webview;
    if (old) {
      try { old.remove(); } catch {}
    }

    slot.replaceChildren();
    const webview = document.createElement('webview');
    const partition = `cafedesk-${side}-${Date.now()}-${randomId()}`;
    webview.setAttribute('partition', partition);
    webview.setAttribute('src', site.url);
    webview.setAttribute('webpreferences', 'contextIsolation=yes,nodeIntegration=no,sandbox=yes');
    webview.setAttribute('allowpopups', 'false');
    webview.setAttribute('aria-label', site.name);

    const loading = document.createElement('div');
    loading.className = 'pane-loading';
    loading.innerHTML = '<span class="spinner"></span><span>در حال باز کردن سایت…</span>';
    slot.append(loading, webview);

    state.panes[side].webview = webview;
    state.panes[side].title = site.name;
    $(`${side}Title`).textContent = site.name;
    setActivePane(side);
    showWorkspace();

    webview.addEventListener('dom-ready', () => {
      loading.remove();
      try { webview.setZoomFactor(1); } catch {}
    });
    webview.addEventListener('did-start-loading', () => {
      if (!loading.isConnected) slot.prepend(loading);
    });
    webview.addEventListener('did-stop-loading', () => loading.remove());
    webview.addEventListener('page-title-updated', (event) => {
      const title = String(event.title || '').trim();
      if (title) $(`${side}Title`).textContent = title.slice(0, 42);
    });
    webview.addEventListener('did-fail-load', (event) => {
      if (event.errorCode === -3) return;
      loading.remove();
      const msg = document.createElement('div');
      msg.className = 'pane-error';
      msg.textContent = 'بارگذاری سایت انجام نشد. اتصال اینترنت یا آدرس سایت را بررسی کنید.';
      slot.append(msg);
    });
  }

  function handleBrowserAction(action, side) {
    const webview = state.panes[side].webview;
    if (action === 'home') {
      clearPane(side);
      return;
    }
    if (!webview) return;
    try {
      if (action === 'back' && webview.canGoBack()) webview.goBack();
      else if (action === 'forward' && webview.canGoForward()) webview.goForward();
      else if (action === 'reload') webview.reload();
    } catch {}
  }

  function openAddSiteDialog() {
    siteNameInput.value = '';
    siteUrlInput.value = '';
    siteFormError.textContent = '';
    siteDialog.showModal();
    setTimeout(() => siteNameInput.focus(), 40);
  }

  function addSite() {
    const name = siteNameInput.value.trim();
    const url = normalizeUrl(siteUrlInput.value);
    if (!name) {
      siteFormError.textContent = 'نام سایت را وارد کنید.';
      siteNameInput.focus();
      return;
    }
    if (!url) {
      siteFormError.textContent = 'لینک سایت معتبر نیست.';
      siteUrlInput.focus();
      return;
    }

    state.sites.push({
      id: `${Date.now()}-${randomId()}`,
      name,
      url,
      createdAt: Date.now()
    });
    saveSites();
    renderSites();
    siteDialog.close();
  }

  function updateClock() {
    const now = new Date();
    const seconds = now.getSeconds() + now.getMilliseconds() / 1000;
    const minutes = now.getMinutes() + seconds / 60;
    const hours = (now.getHours() % 12) + minutes / 60;
    $('secondHand').style.transform = `rotate(${seconds * 6}deg)`;
    $('minuteHand').style.transform = `rotate(${minutes * 6}deg)`;
    $('hourHand').style.transform = `rotate(${hours * 30}deg)`;
  }

  function calcSet(value) {
    state.calc = value;
    $('calcDisplay').value = value;
  }

  function calculate() {
    let expr = state.calc.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
    if (!/^[0-9+\-*/%.()\s]+$/.test(expr)) {
      calcSet('خطا');
      return;
    }
    try {
      const result = Function(`""use strict"; return (${{expr}})`)();
      if (typeof result !== 'number' || !Number.isFinite(result)) throw new Error();
      calcSet(String(Math.round((result + Number.EPSILON) * 1e12) / 1e12));
    } catch {
      calcSet('خطا');
    }
  }

  function onCalc(key) {
    if (key === 'C') return calcSet('0');
    if (key === '⌫') {
      if (state.calc === 'خطا' || state.calc.length <= 1) return calcSet('0');
      return calcSet(state.calc.slice(0, -1));
    }
    if (key === '=') return calculate();

    if (state.calc === 'خطا') state.calc = '0';
    const operators = ['+', '-', '×', '÷', '%'];
    if (operators.includes(key)) {
      if (operators.includes(state.calc.slice(-1))) calcSet(state.calc.slice(0, -1) + key);
      else calcSet(state.calc + key);
      return;
    }

    if (key === '.') {
      const tail = state.calc.split(/[+\-×÷%]/).pop();
      if (tail.includes('.')) return;
    }

    if (state.calc === '0' && key !== '.') calcSet(key);
    else calcSet(state.calc + key);
  }

  function securePick(chars) {
    if (!chars.length) return '';
    const limit = Math.floor(0x100000000 / chars.length) * chars.length;
    const buf = new Uint32Array(1);
    do crypto.getRandomValues(buf); while (buf[0] >= limit);
    return chars[buf[0] % chars.length];
  }

  function shuffleSecure(chars) {
    const arr = [...chars];
    const buf = new Uint32Array(1);
    for (let i = arr.length - 1; i > 0; i--) {
      const limit = Math.floor(0x100000000 / (i + 1)) * (i + 1);
      do crypto.getRandomValues(buf); while (buf[0] >= limit);
      const j = buf[0] % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.join('');
  }

  async function copyText(value, message = 'کپی شد') {
    try {
      if (window.cafeDesk?.copyText) await window.cafeDesk.copyText(value);
      else await navigator.clipboard.writeText(value);
      $('copyStatus').textContent = message;
      clearTimeout(copyText.timer);
      copyText.timer = setTimeout(() => $('copyStatus').textContent = '', 1600);
      return true;
    } catch {
      $('copyStatus').textContent = 'کپی انجام نشد';
      return false;
    }
  }

  async function generatePassword({ copy = true } = {}) {
    const length = Math.max(10, Math.min(32, Number($('passwordLength').value) || 16));
    const groups = [
      'ABCDEFGHJKLMNPQRSTUVWXYZ',
      'abcdefghijkmnopqrstuvwxyz',
      '23456789',
      '!@#$%&*+-_?'
    ];
    const all = groups.join('');
    let result = groups.map(securePick).join('');
    while (result.length < length) result += securePick(all);
    result = shuffleSecure(result).slice(0, length);
    $('passwordOutput').value = result;
    if (copy && $('autoCopyPassword').checked) {
      await copyText(result, 'رمز ساخته و کپی شد');
    } else {
      $('copyStatus').textContent = 'رمز جدید ساخته شد';
      clearTimeout(copyText.timer);
      copyText.timer = setTimeout(() => $('copyStatus').textContent = '', 1400);
    }
  }

  $('showDashboardBtn').addEventListener('click', showDashboard);
  $('showWorkspaceBtn').addEventListener('click', showWorkspace);
  $('backDashboardBtn').addEventListener('click', showDashboard);
  $('addSiteBtn').addEventListener('click', openAddSiteDialog);
  $('saveSiteBtn').addEventListener('click', addSite);

  siteNameInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      siteUrlInput.focus();
    }
  });
  siteUrlInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSite();
    }
  });

  document.querySelectorAll('[data-activate-pane]').forEach(btn => {
    btn.addEventListener('click', () => setActivePane(btn.dataset.activatePane));
  });
  document.querySelectorAll('.browser-pane').forEach(pane => {
    pane.addEventListener('pointerdown', () => setActivePane(pane.dataset.pane));
  });
  document.querySelectorAll('[data-browser-action]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      handleBrowserAction(btn.dataset.browserAction, btn.dataset.side);
    });
  });

  $('calcKeys').addEventListener('click', event => {
    const btn = event.target.closest('[data-calc]');
    if (btn) onCalc(btn.dataset.calc);
  });

  $('passwordLength').addEventListener('input', () => {
    $('passwordLengthValue').textContent = $('passwordLength').value;
  });
  $('generatePasswordBtn').addEventListener('click', () => generatePassword({ copy: true }));
  $('copyPasswordBtn').addEventListener('click', () => copyText($('passwordOutput').value, 'رمز کپی شد'));

  window.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !siteDialog.open && !workspaceView.classList.contains('hidden')) showDashboard();
  });

  renderSites();
  updateClock();
  setInterval(updateClock, 250);
  generatePassword({ copy: false });

  if (window.cafeDesk?.getVersion) {
    window.cafeDesk.getVersion().then(v => {
      $('versionText').textContent = `v${v}`;
    }).catch(() => {});
  }
})();
