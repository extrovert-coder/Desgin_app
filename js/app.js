/**
 * Main Application Bootstrap
 * Demonstrates: Modularity, Separation of Concerns, High Cohesion
 */

import { initTheme, toggleTheme, getTheme } from './core/theme.js';
import { initRouter, registerRoute } from './core/router.js';
import { subscribe } from './core/eventBus.js';
import { toast } from './components/toast.js';
import { $ } from './utils/dom.js';

// Import Presentation Layer Views
import { dashboardView } from './modules/dashboard/dashboardView.js';
import { notesView } from './modules/notes/notesView.js';
import { tasksView } from './modules/tasks/tasksView.js';
import { quizView } from './modules/quiz/quizView.js';
import { plannerView } from './modules/planner/plannerView.js';
import { settingsView } from './modules/settings/settingsView.js';

let deferredInstallPrompt = null;
let updatePromptShown = false;

/**
 * Update the header theme toggle icon and accessibility attributes
 * @param {string} theme 'light' | 'dark'
 */
function updateHeaderThemeIcon(theme) {
  const btn = $('#btn-header-theme-toggle');
  if (!btn) return;

  const isDark = theme === 'dark';
  btn.setAttribute('aria-label', `Switch to ${isDark ? 'light' : 'dark'} theme`);
  btn.innerHTML = isDark
    ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`
    : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
}

/**
 * Initialize global navigation and responsive drawer controls
 */
function initNavigationEvents() {
  const mobileMenuBtn = $('#btn-mobile-menu');
  const sidebar = $('#app-sidebar');
  const backdrop = $('#sidebar-backdrop');

  const toggleSidebar = () => {
    if (!sidebar || !backdrop) return;
    const isOpen = sidebar.classList.toggle('open');
    backdrop.classList.toggle('active', isOpen);
    mobileMenuBtn?.setAttribute('aria-expanded', String(isOpen));
  };

  const closeSidebar = () => {
    if (!sidebar || !backdrop) return;
    sidebar.classList.remove('open');
    backdrop.classList.remove('active');
    mobileMenuBtn?.setAttribute('aria-expanded', 'false');
  };

  mobileMenuBtn?.addEventListener('click', toggleSidebar);
  backdrop?.addEventListener('click', closeSidebar);

  // Close sidebar when pressing Escape
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar?.classList.contains('open')) {
      closeSidebar();
    }
  });

  // Header Theme Toggle button
  const themeBtn = $('#btn-header-theme-toggle');
  themeBtn?.addEventListener('click', () => {
    const newTheme = toggleTheme();
    toast.info('Theme Changed', `Switched to ${newTheme} mode.`);
  });
}

/**
 * Register Service Worker for offline capabilities
 */
function initServiceWorker() {
  const isSecureContext = window.location.protocol === 'https:' ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

  if ('serviceWorker' in navigator && isSecureContext) {
    navigator.serviceWorker.register('./sw.js')
      .then((registration) => {
        console.log('[ServiceWorker] Registered with scope:', registration.scope);

        // Listen for cache/worker updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller && !updatePromptShown) {
              updatePromptShown = true;
              toast.info('App Update Ready', 'A new version of Offline Student Assistant is ready. Reload to update.', 6000);
            }
          });
        });
      })
      .catch((err) => {
        console.warn('[ServiceWorker] Registration failed:', err);
      });
  } else {
    console.log('[ServiceWorker] Service Workers not supported or not running in a secure origin.');
  }
}

/**
 * Configure PWA installation prompt handling
 */
function initPWAInstallation() {
  const installBtn = $('#btn-pwa-install');

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    deferredInstallPrompt = e;

    // Reveal custom install button in header
    if (installBtn) {
      installBtn.style.display = 'inline-flex';
    }
  });

  installBtn?.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;

    // Show prompt to install app
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;

    if (outcome === 'accepted') {
      toast.success('Installation Started', 'Adding Offline Student Assistant to your home screen/apps.');
    }

    deferredInstallPrompt = null;
    installBtn.style.display = 'none';
  });

  window.addEventListener('appinstalled', () => {
    if (installBtn) installBtn.style.display = 'none';
    deferredInstallPrompt = null;
    toast.success('App Installed', 'Offline Student Assistant is now installed as a desktop/mobile app.');
  });
}

/**
 * Bootstrap the application
 */
function bootstrap() {
  // 1. Initialize Theme Engine
  initTheme();
  updateHeaderThemeIcon(getTheme());

  // Subscribe to theme changes via EventBus (Low Coupling)
  subscribe('theme:changed', ({ theme }) => {
    updateHeaderThemeIcon(theme);
  });

  // 2. Initialize Navigation Controls & PWA Installation
  initNavigationEvents();
  initPWAInstallation();

  // 3. Register Presentation Modules with the Router
  registerRoute('dashboard', dashboardView);
  registerRoute('notes', notesView);
  registerRoute('tasks', tasksView);
  registerRoute('quiz', quizView);
  registerRoute('planner', plannerView);
  registerRoute('settings', settingsView);

  // 4. Initialize Router (reads current window.location.hash)
  initRouter();

  // 5. Initialize Service Worker
  initServiceWorker();

  console.log('[App] Offline Student Assistant Phase 5 initialized successfully.');
}

// Start application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
