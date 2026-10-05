const { ipcRenderer } = require('electron');

const EBLAGH_CANONICAL_URL = 'https://eblagh.adliran.ir/';
let lastFingerprint = '';
let lastSentAt = 0;
let savedCredentials = [];
let scopeTimer = null;
const EBLAGH_PENDING_KEY = 'cafedesk.eblagh.pending.v1';

function textHint(input) {
  return [
    input?.name,
    input?.id,
    input?.autocomplete,
    input?.placeholder,
    input?.getAttribute?.('aria-label')
  ].filter(Boolean).join(' ');
}

function fieldContext(input) {
  return [
    textHint(input),
    input?.previousElementSibling?.textContent,
    input?.nextElementSibling?.textContent,
    input?.parentElement?.textContent
  ].filter(Boolean).join(' ').replace(/\s+/g, ' ').slice(0, 1200);
}

function visibleInput(input) {
  if (!input || input.disabled || input.readOnly) return false;
  const style = getComputedStyle(input);
  return style.display !== 'none' && style.visibility !== 'hidden';
}

function isAdliranHost() {
  const host = String(location.hostname || '').toLowerCase();
  return host === 'adliran.ir' || host.endsWith('.adliran.ir');
}

function eblaghStage() {
  if (!isAdliranHost()) return 'other';

  const inputs = Array.from(document.querySelectorAll('input')).filter(visibleInput);
  const contexts = inputs.map((input) => ({
    input,
    text: fieldContext(input)
  }));

  const nationalInput = contexts.find(({ input, text }) => {
    const type = String(input.type || 'text').toLowerCase();
    return ['text','tel','number'].includes(type) &&
      /شماره\s*ملی|کد\s*ملی|national|melli/i.test(text);
  })?.input || null;

  const otpInput = contexts.find(({ text }) =>
    /رمز\s*موقت|رمز\s*پویا|یک\s*بار\s*مصرف|otp|one[- ]?time|کد\s*(?:تایید|تأیید)|پیامک/i.test(text)
  )?.input || null;

  const personalPasswordInput = contexts.find(({ input, text }) => {
    if (otpInput && input === otpInput) return false;
    return /رمز\s*شخصی|رمز\s*ثنا|personal\s*(?:pass|password)/i.test(text) &&
      !/رمز\s*موقت|رمز\s*پویا|یک\s*بار\s*مصرف|otp|پیامک/i.test(text);
  })?.input || null;

  if (otpInput && !personalPasswordInput) return 'otp';
  if (nationalInput && personalPasswordInput) return 'login';
  return 'other';
}

function isEblaghLoginPage() {
  return eblaghStage() === 'login';
}

function hasEblaghLoginError() {
  if (!isAdliranHost()) return false;
  const text = String(document.body?.innerText || '').replace(/\s+/g, ' ').slice(0, 9000);
  return /رمز.{0,20}(?:اشتباه|نادرست|غلط)|نام\s*کاربری.{0,20}(?:اشتباه|نادرست)|اطلاعات.{0,20}(?:اشتباه|نادرست)|ورود.{0,20}(?:ناموفق|موفق\s*نبود)|invalid\s*(?:password|credential)|incorrect\s*(?:password|credential)/i.test(text);
}

function readPendingEblaghCredential() {
  try {
    const raw = sessionStorage.getItem(EBLAGH_PENDING_KEY);
    if (!raw) return null;
    const pending = JSON.parse(raw);
    if (!pending?.password || !pending?.submittedAt) return null;
    if (Date.now() - Number(pending.submittedAt) > 2 * 60 * 1000) {
      sessionStorage.removeItem(EBLAGH_PENDING_KEY);
      return null;
    }
    return pending;
  } catch {
    return null;
  }
}

function rememberPendingEblaghCredential(payload) {
  try {
    sessionStorage.setItem(EBLAGH_PENDING_KEY, JSON.stringify({
      url: EBLAGH_CANONICAL_URL,
      actualUrl: String(payload.actualUrl || location.href),
      username: String(payload.username || '').trim(),
      password: String(payload.password || ''),
      submittedAt: Date.now()
    }));
  } catch {}
}

function clearPendingEblaghCredential() {
  try { sessionStorage.removeItem(EBLAGH_PENDING_KEY); } catch {}
}

function commitPendingEblaghIfVerified() {
  if (!isAdliranHost()) return;

  const pending = readPendingEblaghCredential();
  if (!pending) return;

  const stage = eblaghStage();
  if (stage === 'login' || hasEblaghLoginError()) return;

  const movedToNextUrl = String(location.href || '') !== String(pending.actualUrl || '');
  const verified = stage === 'otp' || (stage === 'other' && movedToNextUrl);
  if (!verified) return;

  clearPendingEblaghCredential();

  const payload = {
    url: EBLAGH_CANONICAL_URL,
    actualUrl: location.href,
    username: pending.username,
    password: pending.password,
    verified: true,
    verifiedStage: stage
  };

  const fingerprint = [payload.url, payload.username, payload.password, 'verified'].join('\u0000');
  const now = Date.now();
  if (fingerprint === lastFingerprint && now - lastSentAt < 8000) return;

  lastFingerprint = fingerprint;
  lastSentAt = now;
  ipcRenderer.sendToHost('credential-submitted', payload);
}

function credentialScopeUrl() {
  return isEblaghLoginPage() ? EBLAGH_CANONICAL_URL : location.href;
}

function notifyCredentialScope() {
  clearTimeout(scopeTimer);
  scopeTimer = setTimeout(() => {
    if (eblaghStage() === 'login') {
      ipcRenderer.sendToHost('credential-scope', { url: EBLAGH_CANONICAL_URL });
    }
  }, 80);
}

function loginFields() {
  const inputs = Array.from(document.querySelectorAll('input')).filter(visibleInput);
  const stage = eblaghStage();

  // Critical Eblagh exception: on step two the only credential is the temporary/OTP code.
  // Never inject the saved personal Sana password into that field.
  if (stage === 'otp') {
    return { usernameInput: null, passwordInput: null, eblagh: true, eblaghStage: stage };
  }

  const eblagh = stage === 'login';
  let passwordInput = null;

  if (eblagh) {
    passwordInput = inputs.find((input) =>
      /رمز\s*شخصی|رمز\s*ثنا|personal\s*(?:pass|password)/i.test(fieldContext(input)) &&
      !/رمز\s*موقت|رمز\s*پویا|یک\s*بار\s*مصرف|otp|پیامک/i.test(fieldContext(input))
    );
  }

  if (!eblagh) {
    passwordInput = inputs.find((input) => String(input.type || '').toLowerCase() === 'password');
  }

  if (!passwordInput) {
    return { usernameInput: null, passwordInput: null, eblagh, eblaghStage: stage };
  }

  const passwordIndex = inputs.indexOf(passwordInput);
  let usernameInput = null;

  if (eblagh) {
    usernameInput = inputs.find((input) =>
      input !== passwordInput &&
      /شماره\s*ملی|کد\s*ملی|national|melli/i.test(fieldContext(input))
    );
  }

  const usernameHint = /user|login|email|mail|phone|mobile|national|melli|identity|شناسه|کاربر|موبایل|همراه|ملی/i;
  usernameInput ||= inputs.find((input) => {
    if (input === passwordInput) return false;
    const type = String(input.type || 'text').toLowerCase();
    if (!['text','email','tel','number'].includes(type)) return false;
    return usernameHint.test(textHint(input));
  });

  usernameInput ||= inputs.slice(0, Math.max(0, passwordIndex)).reverse().find((input) => {
    const type = String(input.type || 'text').toLowerCase();
    return ['text','email','tel','number'].includes(type);
  }) || null;

  return { usernameInput, passwordInput, eblagh, eblaghStage: stage };
}

function setNativeValue(input, value) {
  if (!input || value == null) return;
  const proto = input.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
  if (descriptor?.set) descriptor.set.call(input, String(value));
  else input.value = String(value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function maybeAutofill() {
  const fields = loginFields();
  const { usernameInput, passwordInput } = fields;
  if (fields.eblaghStage === 'otp') return;
  if (!passwordInput || !savedCredentials.length) return;

  const typedUsername = String(usernameInput?.value || '').trim();
  let match = null;

  if (typedUsername) {
    match = savedCredentials.find((entry) =>
      String(entry.username || '').trim().toLocaleLowerCase() === typedUsername.toLocaleLowerCase()
    );
  } else if (savedCredentials.length === 1) {
    match = savedCredentials[0];
  }

  if (!match) return;
  if (usernameInput && !typedUsername && match.username) setNativeValue(usernameInput, match.username);
  if (!passwordInput.value && match.password) setNativeValue(passwordInput, match.password);
}

function collectCredential() {
  const fields = loginFields();
  const { usernameInput, passwordInput } = fields;
  if (fields.eblaghStage === 'otp') return null;
  if (!passwordInput?.value) return null;

  return {
    url: credentialScopeUrl(),
    actualUrl: location.href,
    username: String(usernameInput?.value || '').trim(),
    password: String(passwordInput.value || ''),
    eblagh: Boolean(fields.eblagh),
    eblaghStage: fields.eblaghStage
  };
}

function captureCredential() {
  const payload = collectCredential();
  if (!payload?.password) return;

  // Eblagh/Sana: never persist immediately on submit. Keep the entered values
  // only in this webview session and release them after the page proves that
  // login succeeded by advancing to OTP or another post-login URL.
  if (payload.eblagh && payload.eblaghStage === 'login') {
    rememberPendingEblaghCredential(payload);
    return;
  }

  const fingerprint = [payload.url, payload.username, payload.password].join('\u0000');
  const now = Date.now();
  if (fingerprint === lastFingerprint && now - lastSentAt < 8000) return;

  lastFingerprint = fingerprint;
  lastSentAt = now;
  ipcRenderer.sendToHost('credential-submitted', payload);
}

function openInternalTab(url, navigation = null) {
  if (!/^https?:/i.test(String(url || ''))) return false;
  ipcRenderer.sendToHost('open-new-tab', {
    url: String(url),
    ...(navigation && typeof navigation === 'object' ? navigation : {})
  });
  return true;
}

function bind() {
  document.addEventListener('input', (event) => {
    const { usernameInput } = loginFields();
    if (event.target === usernameInput) setTimeout(maybeAutofill, 0);
  }, true);

  document.addEventListener('change', (event) => {
    const { usernameInput } = loginFields();
    if (event.target === usernameInput) setTimeout(maybeAutofill, 0);
  }, true);

  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (form?.matches?.('form[target="_blank"],form[target="blank"]')) {
      const method = String(form.method || 'get').toLowerCase();
      try {
        const destination = new URL(form.action || location.href, location.href);
        const data = new FormData(form);

        if (method === 'get') {
          for (const [key, value] of data.entries()) {
            if (typeof value === 'string') destination.searchParams.append(key, value);
          }
          event.preventDefault();
          openInternalTab(destination.toString());
        } else if (method === 'post') {
          const fields = [];
          for (const [key, value] of data.entries()) {
            if (typeof value === 'string') fields.push({ name: key, value });
          }
          event.preventDefault();
          openInternalTab(destination.toString(), {
            method: 'post',
            fields,
            enctype: String(form.enctype || 'application/x-www-form-urlencoded')
          });
        }
      } catch {}
    }
    setTimeout(captureCredential, 0);
  }, true);

  document.addEventListener('click', (event) => {
    const anchor = event.target?.closest?.('a[target="_blank"][href],a[target="blank"][href]');
    if (anchor) {
      try {
        const url = new URL(anchor.href, location.href).toString();
        if (openInternalTab(url)) {
          event.preventDefault();
          event.stopPropagation();
        }
      } catch {}
    }

    const target = event.target?.closest?.('button,input[type="submit"],input[type="button"],[role="button"]');
    if (target) setTimeout(captureCredential, 50);
  }, true);

  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && String(event.key).toLowerCase() === 'p') {
      event.preventDefault();
      ipcRenderer.sendToHost('print-request');
      return;
    }
    if (event.key === 'Enter') setTimeout(captureCredential, 50);
  }, true);

  const observer = new MutationObserver(() => {
    notifyCredentialScope();
    setTimeout(maybeAutofill, 20);
    setTimeout(commitPendingEblaghIfVerified, 40);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener('beforeunload', captureCredential, true);
  notifyCredentialScope();
  setTimeout(maybeAutofill, 100);
  setTimeout(maybeAutofill, 500);
  setTimeout(maybeAutofill, 1200);
  setTimeout(commitPendingEblaghIfVerified, 120);
  setTimeout(commitPendingEblaghIfVerified, 700);
  setTimeout(commitPendingEblaghIfVerified, 1600);
}

ipcRenderer.on('cafedesk:credentials', (_event, entries) => {
  savedCredentials = Array.isArray(entries)
    ? entries.filter((entry) => entry && typeof entry === 'object')
    : [];
  maybeAutofill();
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bind, { once: true });
} else {
  bind();
}
