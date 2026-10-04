const { ipcRenderer } = require('electron');

let lastFingerprint = '';
let lastSentAt = 0;
let savedCredentials = [];

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

function loginFields() {
  const inputs = Array.from(document.querySelectorAll('input')).filter(visibleInput);
  const passwordInput = inputs.find((input) => String(input.type || '').toLowerCase() === 'password');
  if (!passwordInput) return { usernameInput: null, passwordInput: null };

  const usernameHint = /user|login|email|mail|phone|mobile|national|melli|identity|شناسه|کاربر|موبایل|همراه|ملی/i;
  const passwordIndex = inputs.indexOf(passwordInput);

  const usernameInput = inputs.find((input) => {
    if (input === passwordInput) return false;
    const type = String(input.type || 'text').toLowerCase();
    if (!['text','email','tel','number'].includes(type)) return false;
    return usernameHint.test(textHint(input));
  }) || inputs.slice(0, Math.max(0, passwordIndex)).reverse().find((input) => {
    const type = String(input.type || 'text').toLowerCase();
    return ['text','email','tel','number'].includes(type);
  }) || null;

  return { usernameInput, passwordInput };
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
  const { usernameInput, passwordInput } = loginFields();
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
  const { usernameInput, passwordInput } = loginFields();
  if (!passwordInput?.value) return null;
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

function openInternalTab(url) {
  if (!/^https?:/i.test(String(url || ''))) return false;
  ipcRenderer.sendToHost('open-new-tab', { url: String(url) });
  return true;
}

function bind() {
  const { usernameInput } = loginFields();
  if (usernameInput) {
    ['input', 'change', 'blur'].forEach((name) => usernameInput.addEventListener(name, maybeAutofill, true));
  }

  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (form?.matches?.('form[target="_blank"],form[target="blank"]')) {
      const method = String(form.method || 'get').toLowerCase();
      if (method === 'get') {
        try {
          const destination = new URL(form.action || location.href, location.href);
          const data = new FormData(form);
          for (const [key, value] of data.entries()) {
            if (typeof value === 'string') destination.searchParams.set(key, value);
          }
          event.preventDefault();
          openInternalTab(destination.toString());
        } catch {
          form.target = '_self';
        }
      } else {
        form.target = '_self';
      }
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

  window.addEventListener('beforeunload', captureCredential, true);
  setTimeout(maybeAutofill, 100);
  setTimeout(maybeAutofill, 700);
}

ipcRenderer.on('cafedesk:credentials', (_event, entries) => {
  savedCredentials = Array.isArray(entries) ? entries.filter((entry) => entry && typeof entry === 'object') : [];
  maybeAutofill();
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bind, { once: true });
} else {
  bind();
}
