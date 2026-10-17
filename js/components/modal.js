/**
 * Accessible Modal Dialog Component
 * Demonstrates: Reusability, Information Hiding, Accessibility
 */

import { createElement } from '../utils/dom.js';

let activeModal = null;
let lastFocusedElement = null;

/**
 * Open an accessible modal dialog
 * @param {Object} options
 * @param {string} options.title
 * @param {Function} options.renderBody - (modalBodyElement, closeModalFn) => void
 * @param {Array<Object>} [options.footerButtons=[]] - [{ text, className, onClick, type }]
 * @param {Function} [options.onClose]
 * @returns {{ close: () => void }}
 */
export function openModal({ title, renderBody, footerButtons = [], onClose = null }) {
  if (activeModal) {
    activeModal.close();
  }

  lastFocusedElement = document.activeElement;

  const backdrop = createElement('div', {
    className: 'modal-backdrop',
    attrs: { 'aria-hidden': 'false' }
  });

  const dialog = createElement('div', {
    className: 'modal-dialog',
    attrs: {
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'modal-dialog-title'
    }
  });

  // Header
  const header = createElement('div', { className: 'modal-header' });
  const titleEl = createElement('h2', {
    className: 'modal-title',
    text: title,
    attrs: { id: 'modal-dialog-title' }
  });
  const closeBtn = createElement('button', {
    className: 'btn-icon',
    attrs: { 'aria-label': 'Close dialog', type: 'button' },
    html: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'
  });
  header.appendChild(titleEl);
  header.appendChild(closeBtn);

  // Body
  const body = createElement('div', { className: 'modal-body' });

  // Footer (optional)
  let footer = null;
  if (footerButtons.length > 0) {
    footer = createElement('div', { className: 'modal-footer' });
  }

  dialog.appendChild(header);
  dialog.appendChild(body);
  if (footer) dialog.appendChild(footer);
  backdrop.appendChild(dialog);

  const closeModal = () => {
    backdrop.classList.add('closing');
    window.removeEventListener('keydown', handleKeyDown);
    backdrop.remove();
    activeModal = null;
    if (onClose) onClose();
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
      lastFocusedElement.focus();
    }
  };

  closeBtn.addEventListener('click', closeModal);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal();
  });

  // Render buttons into footer
  if (footer) {
    for (const btnConfig of footerButtons) {
      const btn = createElement('button', {
        className: btnConfig.className || 'btn btn-secondary',
        text: btnConfig.text || 'Action',
        attrs: { type: btnConfig.type || 'button' },
        events: {
          click: (e) => {
            if (btnConfig.onClick) {
              btnConfig.onClick(e, closeModal);
            }
          }
        }
      });
      footer.appendChild(btn);
    }
  }

  // Keyboard trap & Escape listener
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeModal();
      return;
    }

    if (e.key === 'Tab') {
      const focusable = dialog.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  document.body.appendChild(backdrop);

  // Call user render callback
  if (typeof renderBody === 'function') {
    renderBody(body, closeModal);
  }

  // Initial focus
  const initialFocus = dialog.querySelector('input, textarea, select, button.btn-primary') || closeBtn;
  if (initialFocus) initialFocus.focus();

  activeModal = { close: closeModal };
  return activeModal;
}
