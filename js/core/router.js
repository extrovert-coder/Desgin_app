/**
 * Client-Side Hash Router
 * Demonstrates: Modularity, Information Hiding, Separation of Concerns
 */

import { $, $$ } from '../utils/dom.js';
import { publish } from './eventBus.js';

// Private routing registry
const routes = new Map();
let currentRoute = null;
let currentHandler = null;
let mainContainer = null;
let titleElement = null;

/**
 * Register a route
 * @param {string} path - e.g., 'dashboard'
 * @param {Object} module - Object with { title, render: (container) => void }
 */
export function registerRoute(path, module) {
  if (!module || typeof module.render !== 'function') {
    throw new Error(`Router: Route handler for "${path}" must provide a render function`);
  }
  routes.set(path.replace(/^#\/?/, ''), module);
}

/**
 * Update UI navigation indicators
 * @param {string} routePath
 */
function updateNavigationActiveState(routePath) {
  // Update desktop sidebar links
  $$('.nav-link').forEach((link) => {
    const href = link.getAttribute('href') || '';
    const linkRoute = href.replace(/^#\/?/, '');
    if (linkRoute === routePath) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    } else {
      link.classList.remove('active');
      link.removeAttribute('aria-current');
    }
  });

  // Update mobile bottom nav links
  $$('.mobile-nav-item').forEach((link) => {
    const href = link.getAttribute('href') || '';
    const linkRoute = href.replace(/^#\/?/, '');
    if (linkRoute === routePath) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    } else {
      link.classList.remove('active');
      link.removeAttribute('aria-current');
    }
  });
}

/**
 * Handle route changes
 */
function handleHashChange() {
  const hash = window.location.hash.slice(1).replace(/^\//, '');
  const targetPath = hash || 'dashboard';

  const handler = routes.get(targetPath) || routes.get('dashboard');

  if (!handler) {
    console.error(`[Router] No handler registered for route: ${targetPath}`);
    return;
  }

  // Teardown previous view if it defines a destroy lifecycle hook
  if (currentHandler && typeof currentHandler.destroy === 'function') {
    try {
      currentHandler.destroy();
    } catch (err) {
      console.warn('[Router] Error in view destroy lifecycle:', err);
    }
  }

  currentHandler = handler;
  currentRoute = targetPath;

  // Update document title and header title
  const viewTitle = handler.title || 'Offline Student Assistant';
  document.title = `${viewTitle} — Student Assistant`;

  if (!titleElement) {
    titleElement = $('#header-page-title');
  }
  if (titleElement) {
    titleElement.textContent = viewTitle;
  }

  // Update active state in navbars
  updateNavigationActiveState(targetPath);

  // Render view
  if (!mainContainer) {
    mainContainer = $('#app-main');
  }

  if (mainContainer) {
    // Clear previous view
    mainContainer.innerHTML = '';
    
    // Create view wrapper with animation
    const viewWrapper = document.createElement('div');
    viewWrapper.className = 'view-container';
    viewWrapper.setAttribute('data-view', targetPath);
    
    handler.render(viewWrapper);
    mainContainer.appendChild(viewWrapper);

    // Accessible focus management: move focus to main container
    mainContainer.focus();
  }

  // Close mobile sidebar if open
  const sidebar = $('.sidebar');
  const backdrop = $('.sidebar-backdrop');
  if (sidebar && sidebar.classList.contains('open')) {
    sidebar.classList.remove('open');
  }
  if (backdrop && backdrop.classList.contains('active')) {
    backdrop.classList.remove('active');
  }

  // Notify system of route change via low-coupling event
  publish('route:changed', { route: targetPath, title: viewTitle });
}

/**
 * Initialize the router and attach hashchange listener
 */
export function initRouter() {
  mainContainer = $('#app-main');
  titleElement = $('#header-page-title');

  window.addEventListener('hashchange', handleHashChange);

  // Trigger initial route
  if (!window.location.hash) {
    window.location.hash = '#/dashboard';
  } else {
    handleHashChange();
  }
}

/**
 * Programmatically navigate to a route
 * @param {string} path e.g. 'notes'
 */
export function navigateTo(path) {
  window.location.hash = `#/${path.replace(/^#\/?/, '')}`;
}

/**
 * Get the currently active route
 * @returns {string|null}
 */
export function getCurrentRoute() {
  return currentRoute;
}
