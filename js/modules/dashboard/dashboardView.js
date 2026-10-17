/**
 * Dashboard View Module
 * Demonstrates: Presentation Layer, EventBus Pub/Sub (Low Coupling), High Cohesion
 */

import { navigateTo } from '../../core/router.js';
import { subscribe } from '../../core/eventBus.js';
import { getNotesCount, getAllNotes } from '../../services/notesService.js';
import { getTaskMetrics, getAllTasks } from '../../services/tasksService.js';
import { getQuizMetrics } from '../../services/quizService.js';
import { getPlannerMetrics } from '../../services/plannerService.js';
import { escapeHTML } from '../../utils/dom.js';

export const dashboardView = {
  id: 'dashboard',
  title: 'Student Dashboard',

  async render(container) {
    container.innerHTML = `
      <!-- Stats Overview Cards -->
      <section class="stats-grid" aria-label="Student Overview Metrics">
        <article class="stat-card" id="card-metric-notes" style="cursor: pointer;">
          <div class="stat-content">
            <span class="stat-label">Total Notes</span>
            <span class="stat-value" id="dash-notes-count">...</span>
            <span class="stat-subtext" id="dash-notes-sub">IndexedDB Local</span>
          </div>
          <div class="stat-icon-wrapper stat-icon-blue" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          </div>
        </article>

        <article class="stat-card" id="card-metric-tasks" style="cursor: pointer;">
          <div class="stat-content">
            <span class="stat-label">Pending Tasks</span>
            <span class="stat-value" id="dash-tasks-count">...</span>
            <span class="stat-subtext" id="dash-tasks-sub">Loading...</span>
          </div>
          <div class="stat-icon-wrapper stat-icon-emerald" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
          </div>
        </article>

        <article class="stat-card" id="card-metric-quiz" style="cursor: pointer;">
          <div class="stat-content">
            <span class="stat-label">Quiz Average</span>
            <span class="stat-value" id="dash-quiz-score">...</span>
            <span class="stat-subtext" id="dash-quiz-sub">Offline Bank</span>
          </div>
          <div class="stat-icon-wrapper stat-icon-purple" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
          </div>
        </article>

        <article class="stat-card" id="card-metric-planner" style="cursor: pointer;">
          <div class="stat-content">
            <span class="stat-label">Study Hours Today</span>
            <span class="stat-value" id="dash-study-hours">...</span>
            <span class="stat-subtext" id="dash-study-sub">Target: 4.0h</span>
          </div>
          <div class="stat-icon-wrapper stat-icon-amber" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          </div>
        </article>
      </section>

      <!-- Main Dashboard Grid -->
      <div class="dashboard-grid">
        <!-- Quick Actions Card -->
        <section class="card" aria-labelledby="dash-quick-actions-title">
          <div class="card-header">
            <h2 class="card-title" id="dash-quick-actions-title">Quick Actions</h2>
            <span class="badge badge-primary">Offline Mode Ready</span>
          </div>
          <div class="card-body">
            <p style="margin-bottom: var(--space-4);">Select an activity below to get started with your offline study session:</p>
            <div class="feature-grid">
              <button type="button" class="btn btn-secondary" id="dash-btn-note" style="justify-content: flex-start; height: 50px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                <span>Take a New Note</span>
              </button>
              <button type="button" class="btn btn-secondary" id="dash-btn-task" style="justify-content: flex-start; height: 50px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
                <span>Add Study Task</span>
              </button>
              <button type="button" class="btn btn-secondary" id="dash-btn-quiz" style="justify-content: flex-start; height: 50px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                <span>Start Practice Quiz</span>
              </button>
              <button type="button" class="btn btn-secondary" id="dash-btn-plan" style="justify-content: flex-start; height: 50px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                <span>Schedule Study Plan</span>
              </button>
            </div>
          </div>
          <div class="card-footer">
            <span style="font-size: var(--font-size-xs); color: var(--text-muted);">
              IndexedDB local storage active • Zero cloud data tracking
            </span>
          </div>
        </section>

        <!-- Software Engineering Principles Showcase Card -->
        <aside class="card" aria-labelledby="dash-se-title">
          <div class="card-header">
            <h2 class="card-title" id="dash-se-title">Design Principles</h2>
            <span class="badge badge-success">8 Principles Active</span>
          </div>
          <div class="card-body">
            <ul style="display: flex; flex-direction: column; gap: var(--space-2); font-size: var(--font-size-xs);">
              <li><strong>1. Abstraction:</strong> Repository hides IDB transactions.</li>
              <li><strong>2. Modularity:</strong> Decoupled BLL Services & UI Views.</li>
              <li><strong>3. Information Hiding:</strong> Private fields and closure states.</li>
              <li><strong>4. Separation of Concerns:</strong> Distinct UI, Logic & DAL layers.</li>
              <li><strong>5. Functional Independence:</strong> Single-purpose components.</li>
              <li><strong>6. Low Coupling:</strong> Mediated events via EventBus.</li>
              <li><strong>7. High Cohesion:</strong> Domain validation in services.</li>
              <li><strong>8. Reusability:</strong> Generic CRUD repo & UI modals/toasts.</li>
            </ul>
          </div>
        </aside>
      </div>

      <!-- Recent Activity & Upcoming Section -->
      <section style="margin-top: var(--space-6);" aria-labelledby="dash-activity-title">
        <h2 id="dash-activity-title" style="font-size: var(--font-size-lg); margin-bottom: var(--space-3);">Recent Activity & Upcoming Sessions</h2>
        <div id="dash-activity-feed">
          <p style="color: var(--text-muted);">Loading student activity...</p>
        </div>
      </section>
    `;

    // References to DOM elements
    const notesCountEl = container.querySelector('#dash-notes-count');
    const tasksCountEl = container.querySelector('#dash-tasks-count');
    const tasksSubEl = container.querySelector('#dash-tasks-sub');
    const quizScoreEl = container.querySelector('#dash-quiz-score');
    const quizSubEl = container.querySelector('#dash-quiz-sub');
    const studyHoursEl = container.querySelector('#dash-study-hours');
    const studySubEl = container.querySelector('#dash-study-sub');
    const activityFeedEl = container.querySelector('#dash-activity-feed');

    // Load and update real metrics
    const updateDashboardMetrics = async () => {
      try {
        const [notesCount, taskMetrics, quizMetrics, plannerMetrics] = await Promise.all([
          getNotesCount(),
          getTaskMetrics(),
          getQuizMetrics(),
          getPlannerMetrics()
        ]);

        // 1. Notes Metric
        if (notesCountEl) notesCountEl.textContent = String(notesCount);

        // 2. Tasks Metric
        if (tasksCountEl) tasksCountEl.textContent = String(taskMetrics.pending);
        if (tasksSubEl) {
          tasksSubEl.textContent = taskMetrics.overdue > 0
            ? `⚠️ ${taskMetrics.overdue} overdue (${taskMetrics.completed} done)`
            : `${taskMetrics.completed} completed`;
        }

        // 3. Quiz Metric
        if (quizScoreEl) {
          quizScoreEl.textContent = quizMetrics.attempts > 0 ? `${quizMetrics.averageScore}%` : '--';
        }
        if (quizSubEl) {
          quizSubEl.textContent = quizMetrics.attempts > 0
            ? `${quizMetrics.attempts} attempt${quizMetrics.attempts !== 1 ? 's' : ''}`
            : 'No attempts yet';
        }

        // 4. Study Hours Metric
        if (studyHoursEl) studyHoursEl.textContent = plannerMetrics.todayHoursFormatted;
        if (studySubEl) {
          studySubEl.textContent = `${plannerMetrics.todaySessionsCount} session${plannerMetrics.todaySessionsCount !== 1 ? 's' : ''} today`;
        }

        // 5. Activity Feed
        await updateActivityFeed(plannerMetrics.upcomingSessions);

      } catch (err) {
        console.error('Failed to compute dashboard metrics:', err);
      }
    };

    // Update activity feed
    const updateActivityFeed = async (upcomingSessions = []) => {
      if (!activityFeedEl) return;

      const [recentNotes, recentTasks] = await Promise.all([
        getAllNotes(),
        getAllTasks()
      ]);

      const hasActivity = recentNotes.length > 0 || recentTasks.length > 0 || upcomingSessions.length > 0;

      if (!hasActivity) {
        activityFeedEl.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg>
            </div>
            <h3 class="empty-state-title">No Study Activity Yet</h3>
            <p class="empty-state-desc">Your notes, pending tasks, study sessions, and quiz records will populate your study dashboard automatically.</p>
          </div>
        `;
        return;
      }

      activityFeedEl.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: var(--space-4);">
          <!-- Next Upcoming Sessions -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title" style="font-size: var(--font-size-sm);">Upcoming Study Sessions</h3>
              <span class="badge badge-primary">${upcomingSessions.length}</span>
            </div>
            <div class="card-body" style="padding: var(--space-3);">
              ${upcomingSessions.length === 0 ? `
                <p style="font-size: var(--font-size-xs); color: var(--text-muted); padding: var(--space-2);">No upcoming sessions scheduled.</p>
              ` : `
                <ul style="display: flex; flex-direction: column; gap: var(--space-2);">
                  ${upcomingSessions.slice(0, 3).map(s => `
                    <li style="font-size: var(--font-size-xs); padding: var(--space-2); background: var(--bg-primary); border-radius: var(--radius-sm); display: flex; justify-content: space-between;">
                      <span style="font-weight: var(--font-weight-medium);">${escapeHTML(s.title)}</span>
                      <span style="color: var(--text-muted);">${escapeHTML(s.date)} @ ${escapeHTML(s.startTime)}</span>
                    </li>
                  `).join('')}
                </ul>
              `}
            </div>
          </div>

          <!-- Top Pending Tasks -->
          <div class="card">
            <div class="card-header">
              <h3 class="card-title" style="font-size: var(--font-size-sm);">Priority Tasks</h3>
              <span class="badge badge-warning">${recentTasks.filter(t => !t.completed).length} Pending</span>
            </div>
            <div class="card-body" style="padding: var(--space-3);">
              ${recentTasks.filter(t => !t.completed).length === 0 ? `
                <p style="font-size: var(--font-size-xs); color: var(--text-muted); padding: var(--space-2);">All tasks completed!</p>
              ` : `
                <ul style="display: flex; flex-direction: column; gap: var(--space-2);">
                  ${recentTasks.filter(t => !t.completed).slice(0, 3).map(t => `
                    <li style="font-size: var(--font-size-xs); padding: var(--space-2); background: var(--bg-primary); border-radius: var(--radius-sm); display: flex; justify-content: space-between;">
                      <span style="font-weight: var(--font-weight-medium);">${escapeHTML(t.title)}</span>
                      <span class="badge badge-muted" style="text-transform: capitalize;">${escapeHTML(t.priority)}</span>
                    </li>
                  `).join('')}
                </ul>
              `}
            </div>
          </div>
        </div>
      `;
    };

    // Card navigation clicks
    container.querySelector('#card-metric-notes')?.addEventListener('click', () => navigateTo('notes'));
    container.querySelector('#card-metric-tasks')?.addEventListener('click', () => navigateTo('tasks'));
    container.querySelector('#card-metric-quiz')?.addEventListener('click', () => navigateTo('quiz'));
    container.querySelector('#card-metric-planner')?.addEventListener('click', () => navigateTo('planner'));

    // Quick Action button clicks
    container.querySelector('#dash-btn-note')?.addEventListener('click', () => navigateTo('notes'));
    container.querySelector('#dash-btn-task')?.addEventListener('click', () => navigateTo('tasks'));
    container.querySelector('#dash-btn-quiz')?.addEventListener('click', () => navigateTo('quiz'));
    container.querySelector('#dash-btn-plan')?.addEventListener('click', () => navigateTo('planner'));

    // Clean up any prior active subscriptions before re-registering
    this.destroy();

    // Listen to decoupled events via EventBus (Low Coupling)
    this._unsubscribers = [
      subscribe('notes:changed', updateDashboardMetrics),
      subscribe('tasks:changed', updateDashboardMetrics),
      subscribe('quiz:changed', updateDashboardMetrics),
      subscribe('planner:changed', updateDashboardMetrics),
      subscribe('data:imported', updateDashboardMetrics),
      subscribe('data:cleared', updateDashboardMetrics)
    ];

    // Initial metrics calculation
    await updateDashboardMetrics();
  },

  /**
   * Lifecycle cleanup hook: unregisters EventBus subscribers to avoid memory leaks
   */
  destroy() {
    if (this._unsubscribers && Array.isArray(this._unsubscribers)) {
      for (const unsub of this._unsubscribers) {
        if (typeof unsub === 'function') unsub();
      }
      this._unsubscribers = [];
    }
  }
};
