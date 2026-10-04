const { ipcRenderer } = require('electron');

let lastFingerprint = '';
let lastSentAt = 0;

function textHint(input) {
  return [
    input?.name,
    input?.id,
    input?.autocomplete,
    input?.placeholder,
    input?.getAttribute?.('aria-label')
  ].filter(Boolean).join(' ');
}

function visibleInput(input) {
  if (!input || input.disabled || input.readOnly) return false;
  const style = getComputedStyle(input);
  return style.display !== 'none' && style.visibility !== 'hidden';
}

function collectCredential() {
  const inputs = Array.from(document.querySelectorAll('input')).filter(visibleInput);
  const passwordInput = inputs.find((input) => String(input.type || '').toLowerCase() === 'password' && input.value);
  if (!passwordInput) return null;

  const usernameHint = /user|login|email|mail|phone|mobile|national|melli|identity|شناسه|کاربر|موبایل|همراه|ملی/i;
  const passwordIndex = inputs.indexOf(passwordInput);

  const usernameInput = inputs.find((input) => {
    if (input === passwordInput || !input.value) return false;
    const type = String(input.type || 'text').toLowerCase();
    if (!['text','email','tel','number'].includes(type)) return false;
    return usernameHint.test(textHint(input));
  }) || inputs.slice(0, Math.max(0, passwordIndex)).reverse().find((input) => {
    if (!input.value) return false;
    const type = String(input.type || 'text').toLowerCase();
    return ['text','email','tel','number'].includes(type);
  });

  return {
    url: location.href,
    username: String(usernameInput?.value || ''),
    password: String(passwordInput.value || '')
  };
}

function captureCredential() {
  const payload = collectCredential();
  if (!payload?.password) return;

  const fingerprint = [location.origin, payload.username, payload.password].join('\u0000');
  const now = Date.now();
  if (fingerprint === lastFingerprint && now - lastSentAt < 8000) return;

  lastFingerprint = fingerprint;
  lastSentAt = now;
  ipcRenderer.sendToHost('credential-submitted', payload);
}

function bind() {
  document.addEventListener('submit', () => setTimeout(captureCredential, 0), true);

  document.addEventListener('click', (event) => {
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

  window.addEventListener('beforeunload', captureCredential, true);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bind, { once: true });
} else {
  bind();
}
