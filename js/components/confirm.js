/**
 * Reusable Confirmation Dialog
 * Demonstrates: Reusability, Low Coupling, Abstraction
 */

import { openModal } from './modal.js';
import { createElement } from '../utils/dom.js';

/**
 * Display an accessible confirmation prompt
 * @param {Object} options
 * @param {string} [options.title='Confirm Action']
 * @param {string} options.message
 * @param {string} [options.confirmText='Confirm']
 * @param {string} [options.cancelText='Cancel']
 * @param {boolean} [options.isDanger=false]
 * @returns {Promise<boolean>} Resolves to true if confirmed, false otherwise
 */
export function confirmDialog({
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDanger = false
}) {
  return new Promise((resolve) => {
    let decided = false;

    openModal({
      title,
      renderBody: (bodyEl) => {
        const text = createElement('p', {
          className: 'confirm-message',
          text: message,
          attrs: { style: 'font-size: var(--font-size-sm); color: var(--text-secondary); line-height: 1.5;' }
        });
        bodyEl.appendChild(text);
      },
      footerButtons: [
        {
          text: cancelText,
          className: 'btn btn-secondary',
          onClick: (_, close) => {
            decided = true;
            resolve(false);
            close();
          }
        },
        {
          text: confirmText,
          className: isDanger ? 'btn btn-primary' : 'btn btn-primary',
          type: 'button',
          onClick: (_, close) => {
            decided = true;
            resolve(true);
            close();
          }
        }
      ],
      onClose: () => {
        if (!decided) {
          resolve(false);
        }
      }
    });
  });
}
