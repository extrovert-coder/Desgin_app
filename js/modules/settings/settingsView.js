/**
 * Settings and Data Export View Module
 * Demonstrates: Presentation Layer, Separation of Concerns, Modularity
 */

import { toggleTheme, getTheme } from '../../core/theme.js';
import {
  downloadBackupFile,
  validateBackup,
  restoreBackupData,
  purgeAllLocalData
} from '../../services/exportService.js';
import { confirmDialog } from '../../components/confirm.js';
import { toast } from '../../components/toast.js';

export const settingsView = {
  id: 'settings',
  title: 'Settings & Data Export',

  render(container) {
    const activeTheme = getTheme();

    container.innerHTML = `
      <section class="settings-shell" aria-label="Application Settings and Data Storage">
        <div style="display: flex; flex-direction: column; gap: var(--space-6);">
          
          <!-- Appearance & Theming Card -->
          <div class="card">
            <div class="card-header">
              <h2 class="card-title">Appearance & Theming</h2>
              <span class="badge badge-primary" id="theme-status-badge">Current: ${activeTheme.toUpperCase()}</span>
            </div>
            <div class="card-body">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-4);">
                <div>
                  <h3 style="font-size: var(--font-size-base); margin-bottom: 2px;">Interface Theme</h3>
                  <p style="font-size: var(--font-size-xs); color: var(--text-secondary);">Toggle between high-contrast Light mode and eye-friendly Dark mode.</p>
                </div>
                <button type="button" class="btn btn-secondary" id="btn-toggle-theme-action">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
                  <span id="theme-toggle-label">Switch to ${activeTheme === 'dark' ? 'Light' : 'Dark'} Mode</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Local Storage & Privacy Status -->
          <div class="card">
            <div class="card-header">
              <h2 class="card-title">Storage & Offline Privacy</h2>
              <span class="badge badge-success">Zero Cloud Dependency</span>
            </div>
            <div class="card-body">
              <ul style="display: flex; flex-direction: column; gap: var(--space-3); font-size: var(--font-size-sm);">
                <li style="display: flex; justify-content: space-between; padding-bottom: var(--space-2); border-bottom: 1px solid var(--border-color);">
                  <span style="color: var(--text-secondary);">Persistence Engine</span>
                  <strong>Client-Side IndexedDB</strong>
                </li>
                <li style="display: flex; justify-content: space-between; padding-bottom: var(--space-2); border-bottom: 1px solid var(--border-color);">
                  <span style="color: var(--text-secondary);">Remote Telemetry / CDNs</span>
                  <strong style="color: var(--accent-success);">Disabled / None</strong>
                </li>
                <li style="display: flex; justify-content: space-between; padding-bottom: var(--space-2); border-bottom: 1px solid var(--border-color);">
                  <span style="color: var(--text-secondary);">Authentication / Sign-in</span>
                  <strong>None (Private to your browser)</strong>
                </li>
              </ul>
            </div>
          </div>

          <!-- Data Backup & Portability Card -->
          <div class="card">
            <div class="card-header">
              <h2 class="card-title">Data Backup & Portability</h2>
              <span class="badge badge-muted">JSON Schema</span>
            </div>
            <div class="card-body">
              <p style="font-size: var(--font-size-sm); margin-bottom: var(--space-4);">
                Because your data is stored locally in your browser's IndexedDB, you can export your entire study history as a structured JSON backup file, or restore it onto another device at any time.
              </p>

              <!-- Hidden File Input for JSON Restore -->
              <input type="file" id="input-backup-file" accept=".json,application/json" style="display: none;" aria-hidden="true" />

              <div style="display: flex; flex-wrap: wrap; gap: var(--space-3);">
                <button type="button" class="btn btn-secondary" id="btn-export-backup">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                  <span>Export Backup (.json)</span>
                </button>
                <button type="button" class="btn btn-secondary" id="btn-import-backup">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                  <span>Restore from Backup</span>
                </button>
                <button type="button" class="btn btn-ghost" id="btn-clear-data" style="color: var(--accent-danger);">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  <span>Reset All Local Data</span>
                </button>
              </div>
            </div>
          </div>

        </div>
      </section>
    `;

    // Theme Toggle
    const themeBtn = container.querySelector('#btn-toggle-theme-action');
    const themeBadge = container.querySelector('#theme-status-badge');
    const themeLabel = container.querySelector('#theme-toggle-label');

    themeBtn?.addEventListener('click', () => {
      const next = toggleTheme();
      if (themeBadge) themeBadge.textContent = `Current: ${next.toUpperCase()}`;
      if (themeLabel) themeLabel.textContent = `Switch to ${next === 'dark' ? 'Light' : 'Dark'} Mode`;
      toast.info('Theme Updated', `Switched interface to ${next} theme.`);
    });

    // Export Backup
    container.querySelector('#btn-export-backup')?.addEventListener('click', async () => {
      try {
        const filename = await downloadBackupFile();
        toast.success('Backup Downloaded', `Saved local data to "${filename}".`);
      } catch (err) {
        toast.error('Export Failed', err.message);
      }
    });

    // Restore Backup via File Input
    const fileInput = container.querySelector('#input-backup-file');
    const importBtn = container.querySelector('#btn-import-backup');

    importBtn?.addEventListener('click', () => {
      fileInput?.click();
    });

    fileInput?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const content = evt.target?.result;
          const validation = validateBackup(content);

          if (!validation.valid) {
            toast.error('Import Incompatible', validation.error || 'Invalid backup structure.');
            return;
          }

          const { counts, parsedData } = validation;
          const confirmed = await confirmDialog({
            title: 'Restore Backup Data',
            message: `Found: ${counts.notes} notes, ${counts.tasks} tasks, ${counts.quiz_results} quiz records, and ${counts.planner} study sessions.\n\nRestoring will replace your current local data with this backup. Continue?`,
            confirmText: 'Restore & Overwrite',
            isDanger: true
          });

          if (confirmed) {
            await restoreBackupData(parsedData, 'replace');
            toast.success('Restore Complete', 'All study notes, tasks, and schedules have been restored.');
          }
        } catch (err) {
          toast.error('Import Failed', err.message);
        } finally {
          fileInput.value = '';
        }
      };

      reader.onerror = () => {
        toast.error('File Read Error', 'Unable to read the chosen backup file.');
        fileInput.value = '';
      };

      reader.readAsText(file);
    });

    // Reset All Data
    container.querySelector('#btn-clear-data')?.addEventListener('click', async () => {
      const confirmed = await confirmDialog({
        title: 'Reset All Local Data',
        message: 'Are you sure you want to completely erase all local notes, tasks, study schedules, and quiz records? This action is permanent and cannot be undone.',
        confirmText: 'Erase Everything',
        isDanger: true
      });

      if (confirmed) {
        try {
          await purgeAllLocalData();
          toast.warning('Data Reset', 'All local IndexedDB stores have been cleared.');
        } catch (err) {
          toast.error('Reset Failed', err.message);
        }
      }
    });
  }
};
