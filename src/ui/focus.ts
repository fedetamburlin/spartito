/**
 * Keyboard focus containment for modal dialogs: focus starts inside, Tab and
 * Shift+Tab cycle within the dialog, and closing returns focus to the element
 * that opened it. A fallback selector covers dialogs opened after their
 * trigger has already been removed (for example the pre-print guard).
 */

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

function focusable(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (element) => element.getClientRects().length > 0
  );
}

export interface FocusTrapOptions {
  /** Focused when the dialog closes if the original trigger is gone. */
  fallbackSelector?: string;
}

export function trapFocus(node: HTMLElement, options: FocusTrapOptions = {}) {
  const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const initial = node.querySelector<HTMLElement>('[data-autofocus]') ?? focusable(node)[0] ?? node;
  const frame = requestAnimationFrame(() => initial.focus());

  function onKeydown(event: KeyboardEvent) {
    if (event.key !== 'Tab') return;
    const items = focusable(node);
    if (items.length === 0) {
      event.preventDefault();
      node.focus();
      return;
    }

    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    const inside = active instanceof Node && node.contains(active);

    if (event.shiftKey && (!inside || active === first)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (!inside || active === last)) {
      event.preventDefault();
      first.focus();
    }
  }

  node.addEventListener('keydown', onKeydown);

  return {
    destroy() {
      cancelAnimationFrame(frame);
      node.removeEventListener('keydown', onKeydown);
      const fallback = options.fallbackSelector
        ? document.querySelector<HTMLElement>(options.fallbackSelector)
        : null;
      const target = previous?.isConnected ? previous : fallback;
      target?.focus();
    }
  };
}
