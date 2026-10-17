/**
 * Toast Notification Component
 * Demonstrates: Reusability, Information Hiding, and Accessibility
 */

import { createElement, $ } from '../utils/dom.js';

let container = null;

/**
 * Ensure the toast container exists in the DOM
 * @returns {HTMLElement}
 */
function getOrCreateContainer() {
  if (!container || !document.body.contains(container)) {
    container = $('#toast-container');
    if (!container) {
      container = createElement('div', {
        className: 'toast-container',
        attrs: {
          id: 'toast-container',
          'aria-live': 'polite',
          'aria-atomic': 'true'
        }
      });
      document.body.appendChild(container);
    }
  }
  return container;
}

/**
 * SVG icons for each notification type (inlined to avoid external assets)
 */
const ICONS = {
  info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
  success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
  warning: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
  error: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>'
};

/**
 * Show a toast notification
 * @param {Object} options
 * @param {'info'|'success'|'warning'|'error'} [options.type='info']
 * @param {string} options.title
 * @param {string} [options.message='']
 * @param {number} [options.duration=3500]
 */
export function showToast({ type = 'info', title, message = '', duration = 3500 }) {
  const targetContainer = getOrCreateContainer();
  const iconMarkup = ICONS[type] || ICONS.info;

  const toastEl = createElement('div', {
    className: `toast toast-${type}`,
    attrs: {
      role: type === 'error' ? 'alert' : 'status'
    }
  });

  toastEl.innerHTML = `
    <span class="toast-icon" aria-hidden="true">${iconMarkup}</span>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      ${message ? `<div class="toast-message">${message}</div>` : ''}
    </div>
    <button type="button" class="toast-close" aria-label="Close notification">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
    </button>
  `;

  let dismissTimeout = null;

  const dismiss = () => {
    if (dismissTimeout) clearTimeout(dismissTimeout);
    toastEl.classList.add('toast-closing');
    toastEl.addEventListener('animationend', () => {
      toastEl.remove();
    }, { once: true });
  };

  const closeBtn = toastEl.querySelector('.toast-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', dismiss);
  }

  if (duration > 0) {
    dismissTimeout = setTimeout(dismiss, duration);
  }

  targetContainer.appendChild(toastEl);
  return { dismiss };
}

export const toast = {
  info: (title, message, duration) => showToast({ type: 'info', title, message, duration }),
  success: (title, message, duration) => showToast({ type: 'success', title, message, duration }),
  warning: (title, message, duration) => showToast({ type: 'warning', title, message, duration }),
  error: (title, message, duration) => showToast({ type: 'error', title, message, duration })
};
