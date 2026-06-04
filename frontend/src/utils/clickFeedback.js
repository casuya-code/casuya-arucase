const BUSY_BUTTON_SELECTOR = 'button.excel-btn, button.photo-btn, button.mute-toggle-btn';

function isInternalNavAnchor(el) {
  if (!el || el.tagName !== 'A' || !el.hasAttribute('href')) return false;
  if (el.target === '_blank' || el.hasAttribute('download')) return false;
  const href = el.getAttribute('href');
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
    return false;
  }
  try {
    const url = new URL(href, window.location.origin);
    return url.origin === window.location.origin;
  } catch {
    return false;
  }
}
const BUSY_CARD_SELECTOR = [
  '.score-type-card',
  '.subject-card',
  '.guideline-card',
  '[class$="-selection-card-item"]',
  '[class*="-selection-card-item"]',
].join(', ');

const SAFETY_MS = 60000;
const SYNC_CLEAR_MS = 200;

export function markBusy(el) {
  if (!el || el.dataset?.noBusy !== undefined) return;
  el.classList.add('is-busy');
  el.setAttribute('aria-busy', 'true');
}

export function clearBusy(el) {
  if (!el) return;
  el.classList.remove('is-busy');
  el.removeAttribute('aria-busy');
  if (el._busyObserver) {
    el._busyObserver.disconnect();
    el._busyObserver = null;
  }
  if (el._busySafetyTimer) {
    clearTimeout(el._busySafetyTimer);
    el._busySafetyTimer = null;
  }
}

function attachBusyClearWhenEnabled(el) {
  if (el._busyObserver) return;

  el._busyObserver = new MutationObserver(() => {
    if (!el.disabled && el.classList.contains('is-busy')) {
      setTimeout(() => clearBusy(el), 80);
    }
  });
  el._busyObserver.observe(el, { attributes: true, attributeFilter: ['disabled'] });

  el._busySafetyTimer = setTimeout(() => clearBusy(el), SAFETY_MS);
}

/**
 * Call from a capture-phase document click handler.
 */
export function handleActionClick(event) {
  if (event.defaultPrevented) return null;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;

  const card = event.target.closest(BUSY_CARD_SELECTOR);
  const button = event.target.closest(BUSY_BUTTON_SELECTOR);

  let el = card || button;
  if (!el) return null;

  if (isInternalNavAnchor(el)) return null;
  if (el.disabled || el.classList.contains('is-busy')) return null;
  if (el.dataset?.noBusy !== undefined) return null;

  markBusy(el);

  window.setTimeout(() => {
    if (el.disabled) {
      attachBusyClearWhenEnabled(el);
      return;
    }
    if (!el.classList.contains('is-busy')) return;
    clearBusy(el);
  }, SYNC_CLEAR_MS);

  return el;
}

export function clearAllBusy() {
  document.querySelectorAll('.is-busy').forEach((el) => clearBusy(el));
  document.querySelectorAll('a.is-navigating').forEach((el) => {
    el.classList.remove('is-navigating');
    el.removeAttribute('aria-busy');
  });
}
