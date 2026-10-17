/**
 * Theme Management Module
 * Demonstrates: Information Hiding, High Cohesion, and Low Coupling
 */

import { publish } from './eventBus.js';

const STORAGE_KEY = 'osa_theme_preference';
const THEME_LIGHT = 'light';
const THEME_DARK = 'dark';

// Private state hidden inside module scope
let currentTheme = THEME_LIGHT;

/**
 * Determine the user's preferred theme (stored preference or system query)
 * @returns {string} 'light' | 'dark'
 */
function resolveInitialTheme() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === THEME_LIGHT || saved === THEME_DARK) {
    return saved;
  }
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return THEME_DARK;
  }
  return THEME_LIGHT;
}

/**
 * Apply the theme to the DOM and notify subscribers
 * @param {string} theme
 */
function applyTheme(theme) {
  currentTheme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch (e) {
    console.warn('[Theme] Unable to persist theme preference to localStorage', e);
  }
  publish('theme:changed', { theme });
}

/**
 * Initialize theme listeners and apply initial theme
 */
export function initTheme() {
  const initial = resolveInitialTheme();
  applyTheme(initial);

  // Listen for system theme changes if user hasn't set an explicit preference
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem(STORAGE_KEY)) {
        applyTheme(e.matches ? THEME_DARK : THEME_LIGHT);
      }
    });
  }
}

/**
 * Toggle between light and dark themes
 * @returns {string} The newly active theme
 */
export function toggleTheme() {
  const next = currentTheme === THEME_DARK ? THEME_LIGHT : THEME_DARK;
  applyTheme(next);
  return next;
}

/**
 * Set an explicit theme
 * @param {string} theme 'light' | 'dark'
 */
export function setTheme(theme) {
  if (theme === THEME_LIGHT || theme === THEME_DARK) {
    applyTheme(theme);
  }
}

/**
 * Get current theme
 * @returns {string}
 */
export function getTheme() {
  return currentTheme;
}
