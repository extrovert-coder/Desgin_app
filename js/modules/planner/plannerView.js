/**
 * Study Planner View Module
 * Demonstrates: Presentation Layer, Separation of Concerns, Modularity
 */

import {
  createSession,
  updateSession,
  deleteSession,
  getAllSessions,
  timeStringToMinutes,
  minutesToTimeString
} from '../../services/plannerService.js';
import { openModal } from '../../components/modal.js';
import { confirmDialog } from '../../components/confirm.js';
import { toast } from '../../components/toast.js';
import { escapeHTML } from '../../utils/dom.js';

export const plannerView = {
  id: 'planner',
  title: 'Study Planner',

  async render(container) {
    container.innerHTML = `
      <section class="planner-shell" aria-label="Study Timetable and Goal Planning">
        <!-- Controls & Toolbar -->
        <div class="card" style="margin-bottom: var(--space-6);">
          <div class="card-body" style="display: flex; flex-wrap: wrap; gap: var(--space-4); align-items: center; justify-content: space-between;">
            <div>
              <h2 style="font-size: var(--font-size-base); font-weight: var(--font-weight-semibold); margin-bottom: 2px;">Study Timetable</h2>
              <p style="font-size: var(--font-size-xs); color: var(--text-secondary);">Manage revision blocks with automatic time collision prevention.</p>
            </div>
            <div>
              <button type="button" class="btn btn-primary" id="btn-add-session">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                <span>Add Study Session</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Schedule List Container -->
        <div id="planner-schedule-container" aria-live="polite">
          <p style="text-align: center; color: var(--text-muted); padding: var(--space-8);">Loading study timetable...</p>
        </div>
      </section>
    `;

    const scheduleContainer = container.querySelector('#planner-schedule-container');
    const addSessionBtn = container.querySelector('#btn-add-session');

    // Helper to format date
    const formatDate = (dateStr) => {
      try {
        const [y, m, d] = dateStr.split('-');
        const date = new Date(Number(y), Number(m) - 1, Number(d));
        return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
      } catch (e) {
        return dateStr;
      }
    };

    // Calculate end time
    const getEndTime = (startTime, duration) => {
      try {
        const startMin = timeStringToMinutes(startTime);
        return minutesToTimeString(startMin + Number(duration));
      } catch (e) {
        return '';
      }
    };

    // Render list of sessions
    const refreshSchedule = async () => {
      try {
        const sessions = await getAllSessions();

        if (sessions.length === 0) {
          scheduleContainer.innerHTML = `
            <div class="empty-state">
              <div class="empty-state-icon" aria-hidden="true">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              </div>
              <h3 class="empty-state-title">No Study Sessions Scheduled</h3>
              <p class="empty-state-desc">Organize your revision schedule with automated collision detection to prevent overlapping study blocks.</p>
              <button type="button" class="btn btn-secondary" id="btn-add-session-empty">
                <span>Schedule First Session</span>
              </button>
            </div>
          `;
          scheduleContainer.querySelector('#btn-add-session-empty')?.addEventListener('click', () => openSessionEditor());
          return;
        }

        // Group sessions by date
        const grouped = {};
        for (const s of sessions) {
          if (!grouped[s.date]) grouped[s.date] = [];
          grouped[s.date].push(s);
        }

        scheduleContainer.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: var(--space-6);">
            ${Object.entries(grouped).map(([date, dateSessions]) => `
              <div class="card">
                <div class="card-header" style="background: var(--bg-muted);">
                  <h3 style="font-size: var(--font-size-sm); font-weight: var(--font-weight-bold);">${escapeHTML(formatDate(date))}</h3>
                  <span class="badge badge-primary">${dateSessions.length} Session${dateSessions.length !== 1 ? 's' : ''}</span>
                </div>
                <div class="card-body" style="display: flex; flex-direction: column; gap: var(--space-3); padding: var(--space-4);">
                  ${dateSessions.map(session => {
                    const endTime = getEndTime(session.startTime, session.duration);
                    return `
                      <div class="card" style="padding: var(--space-4); display: flex; flex-direction: row; justify-content: space-between; align-items: center; border-left: 4px solid var(--accent-primary);">
                        <div>
                          <div style="font-size: var(--font-size-base); font-weight: var(--font-weight-semibold); color: var(--text-primary); margin-bottom: 2px;">
                            ${escapeHTML(session.title)}
                          </div>
                          <div style="display: flex; gap: var(--space-3); font-size: var(--font-size-xs); color: var(--text-muted); align-items: center;">
                            <span>🕒 ${escapeHTML(session.startTime)} – ${escapeHTML(endTime)}</span>
                            <span>⏳ ${session.duration} mins</span>
                          </div>
                        </div>

                        <div style="display: flex; gap: var(--space-1);">
                          <button type="button" class="btn-icon btn-edit-session" aria-label="Edit session ${escapeHTML(session.title)}" data-id="${escapeHTML(session.id)}">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                          </button>
                          <button type="button" class="btn-icon btn-delete-session" aria-label="Delete session ${escapeHTML(session.title)}" data-id="${escapeHTML(session.id)}" style="color: var(--accent-danger);">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                          </button>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        `;

        // Bind Edit buttons
        scheduleContainer.querySelectorAll('.btn-edit-session').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            const session = sessions.find(s => s.id === id);
            if (session) openSessionEditor(session);
          });
        });

        // Bind Delete buttons
        scheduleContainer.querySelectorAll('.btn-delete-session').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            const session = sessions.find(s => s.id === id);
            const confirmed = await confirmDialog({
              title: 'Delete Study Session',
              message: `Remove study session "${session ? session.title : 'this session'}" from your timetable?`,
              confirmText: 'Delete',
              isDanger: true
            });

            if (confirmed) {
              await deleteSession(id);
              toast.success('Session Deleted', 'Study session removed from IndexedDB.');
              refreshSchedule();
            }
          });
        });

      } catch (err) {
        scheduleContainer.innerHTML = `<p style="color: var(--accent-danger);">Failed to load schedule: ${escapeHTML(err.message)}</p>`;
      }
    };

    // Open Session Editor
    const openSessionEditor = (session = null) => {
      const isEditing = Boolean(session);
      const todayStr = new Date().toISOString().split('T')[0];

      openModal({
        title: isEditing ? 'Edit Study Session' : 'Schedule Study Session',
        renderBody: (bodyEl, closeModal) => {
          bodyEl.innerHTML = `
            <form id="session-form" novalidate>
              <div class="form-group">
                <label for="session-title-input" class="form-label">Subject / Topic *</label>
                <input 
                  type="text" 
                  id="session-title-input" 
                  class="form-input" 
                  required 
                  maxlength="200" 
                  placeholder="e.g. Discrete Mathematics Revision"
                  value="${session ? escapeHTML(session.title) : ''}"
                />
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4);">
                <div class="form-group">
                  <label for="session-date-input" class="form-label">Date *</label>
                  <input 
                    type="date" 
                    id="session-date-input" 
                    class="form-input" 
                    required 
                    value="${session ? escapeHTML(session.date) : todayStr}"
                  />
                </div>

                <div class="form-group">
                  <label for="session-time-input" class="form-label">Start Time *</label>
                  <input 
                    type="time" 
                    id="session-time-input" 
                    class="form-input" 
                    required 
                    value="${session ? escapeHTML(session.startTime) : '10:00'}"
                  />
                </div>
              </div>

              <div class="form-group">
                <label for="session-duration-input" class="form-label">Duration (Minutes) *</label>
                <select id="session-duration-input" class="form-select">
                  <option value="30" ${session && session.duration === 30 ? 'selected' : ''}>30 Minutes</option>
                  <option value="45" ${session && session.duration === 45 ? 'selected' : ''}>45 Minutes</option>
                  <option value="60" ${!session || (session && session.duration === 60) ? 'selected' : ''}>60 Minutes (1 Hour)</option>
                  <option value="90" ${session && session.duration === 90 ? 'selected' : ''}>90 Minutes (1.5 Hours)</option>
                  <option value="120" ${session && session.duration === 120 ? 'selected' : ''}>120 Minutes (2 Hours)</option>
                  <option value="180" ${session && session.duration === 180 ? 'selected' : ''}>180 Minutes (3 Hours)</option>
                </select>
              </div>

              <div class="form-error" id="session-error" style="display: none; margin-bottom: var(--space-3);"></div>

              <div style="display: flex; justify-content: flex-end; gap: var(--space-2); margin-top: var(--space-4);">
                <button type="button" class="btn btn-secondary" id="btn-cancel-session">Cancel</button>
                <button type="submit" class="btn btn-primary" id="btn-save-session">
                  <span>${isEditing ? 'Save Changes' : 'Schedule Session'}</span>
                </button>
              </div>
            </form>
          `;

          const form = bodyEl.querySelector('#session-form');
          const titleInput = bodyEl.querySelector('#session-title-input');
          const dateInput = bodyEl.querySelector('#session-date-input');
          const timeInput = bodyEl.querySelector('#session-time-input');
          const durationInput = bodyEl.querySelector('#session-duration-input');
          const errorEl = bodyEl.querySelector('#session-error');
          const cancelBtn = bodyEl.querySelector('#btn-cancel-session');
          const saveBtn = bodyEl.querySelector('#btn-save-session');

          cancelBtn.addEventListener('click', closeModal);

          form.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorEl.style.display = 'none';

            const title = titleInput.value.trim();
            if (!title) {
              errorEl.textContent = 'Please enter a session topic or title.';
              errorEl.style.display = 'block';
              titleInput.focus();
              return;
            }

            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';

            try {
              if (isEditing) {
                await updateSession({
                  id: session.id,
                  title,
                  date: dateInput.value,
                  startTime: timeInput.value,
                  duration: Number(durationInput.value)
                });
                toast.success('Session Updated', 'Study timetable updated in IndexedDB.');
              } else {
                await createSession({
                  title,
                  date: dateInput.value,
                  startTime: timeInput.value,
                  duration: Number(durationInput.value)
                });
                toast.success('Session Scheduled', 'New study session added to your schedule.');
              }

              closeModal();
              refreshSchedule();
            } catch (err) {
              errorEl.textContent = err.message;
              errorEl.style.display = 'block';
              saveBtn.disabled = false;
              saveBtn.textContent = isEditing ? 'Save Changes' : 'Schedule Session';
            }
          });
        }
      });
    };

    addSessionBtn?.addEventListener('click', () => openSessionEditor());

    // Initial render
    await refreshSchedule();
  }
};
