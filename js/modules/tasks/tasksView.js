/**
 * Tasks Manager View Module
 * Demonstrates: Presentation Layer, Separation of Concerns, Modularity
 */

import {
  createTask,
  updateTask,
  toggleTaskComplete,
  deleteTask,
  filterTasks,
  isTaskOverdue,
  TASK_PRIORITIES,
  getTodayDateString
} from '../../services/tasksService.js';
import { openModal } from '../../components/modal.js';
import { confirmDialog } from '../../components/confirm.js';
import { toast } from '../../components/toast.js';
import { escapeHTML } from '../../utils/dom.js';

export const tasksView = {
  id: 'tasks',
  title: 'Task Manager',

  async render(container) {
    let currentFilter = 'all';

    container.innerHTML = `
      <section class="tasks-shell" aria-label="Task Management">
        <!-- Controls & Filter Toolbar -->
        <div class="card" style="margin-bottom: var(--space-6);">
          <div class="card-body" style="display: flex; flex-wrap: wrap; gap: var(--space-4); align-items: center; justify-content: space-between;">
            <div style="display: flex; gap: var(--space-2); align-items: center; flex-wrap: wrap;" role="tablist" aria-label="Task status filters">
              <button type="button" class="btn btn-secondary active tab-filter" data-status="all" role="tab" aria-selected="true" id="tab-all">All Tasks</button>
              <button type="button" class="btn btn-ghost tab-filter" data-status="pending" role="tab" aria-selected="false" id="tab-pending">Pending</button>
              <button type="button" class="btn btn-ghost tab-filter" data-status="completed" role="tab" aria-selected="false" id="tab-completed">Completed</button>
              <button type="button" class="btn btn-ghost tab-filter" data-status="overdue" role="tab" aria-selected="false" id="tab-overdue">Overdue</button>
            </div>
            <div>
              <button type="button" class="btn btn-primary" id="btn-add-task">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                <span>Add Task</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Task List Content -->
        <div id="tasks-list-container" aria-live="polite">
          <p style="text-align: center; color: var(--text-muted); padding: var(--space-8);">Loading offline tasks...</p>
        </div>
      </section>
    `;

    const listContainer = container.querySelector('#tasks-list-container');
    const addTaskBtn = container.querySelector('#btn-add-task');
    const tabButtons = container.querySelectorAll('.tab-filter');

    // Helper to format due dates
    const formatDueDate = (dateStr) => {
      if (!dateStr) return 'No due date';
      try {
        const [y, m, d] = dateStr.split('-');
        const date = new Date(Number(y), Number(m) - 1, Number(d));
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      } catch (e) {
        return dateStr;
      }
    };

    // Render tasks list
    const refreshTasks = async () => {
      try {
        const tasks = await filterTasks(currentFilter);

        if (tasks.length === 0) {
          listContainer.innerHTML = `
            <div class="empty-state">
              <div class="empty-state-icon" aria-hidden="true">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
              </div>
              <h3 class="empty-state-title">No ${currentFilter !== 'all' ? currentFilter : ''} Tasks Found</h3>
              <p class="empty-state-desc">${currentFilter === 'overdue' ? 'Great job! You have no overdue assignments.' : 'Stay organized by tracking your homework, reading assignments, and exam deadlines offline.'}</p>
              ${currentFilter === 'all' ? `<button type="button" class="btn btn-secondary" id="btn-add-task-empty"><span>Create Your First Task</span></button>` : ''}
            </div>
          `;
          listContainer.querySelector('#btn-add-task-empty')?.addEventListener('click', () => openTaskEditor());
          return;
        }

        listContainer.innerHTML = `
          <div class="tasks-list">
            ${tasks.map(task => {
              const overdue = isTaskOverdue(task);
              const priorityBadges = {
                high: 'badge-warning',
                medium: 'badge-primary',
                low: 'badge-muted'
              };

              return `
                <div class="task-item ${task.completed ? 'completed' : ''}" data-task-id="${escapeHTML(task.id)}">
                  <input 
                    type="checkbox" 
                    class="task-checkbox btn-toggle-task" 
                    data-id="${escapeHTML(task.id)}" 
                    aria-label="Mark task '${escapeHTML(task.title)}' as ${task.completed ? 'pending' : 'completed'}" 
                    ${task.completed ? 'checked' : ''} 
                  />
                  <div class="task-content">
                    <div class="task-title">${escapeHTML(task.title)}</div>
                    ${task.description ? `<div class="task-desc">${escapeHTML(task.description)}</div>` : ''}
                    <div class="task-meta">
                      <span class="badge ${priorityBadges[task.priority] || 'badge-muted'}" style="text-transform: capitalize;">
                        ${escapeHTML(task.priority || 'medium')} Priority
                      </span>
                      <span class="${overdue ? 'task-overdue' : ''}">
                        ${overdue ? '⚠️ Overdue: ' : 'Due: '} ${escapeHTML(formatDueDate(task.dueDate))}
                      </span>
                    </div>
                  </div>
                  <div style="display: flex; gap: var(--space-1);">
                    <button type="button" class="btn-icon btn-edit-task" aria-label="Edit task ${escapeHTML(task.title)}" data-id="${escapeHTML(task.id)}">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button type="button" class="btn-icon btn-delete-task" aria-label="Delete task ${escapeHTML(task.title)}" data-id="${escapeHTML(task.id)}" style="color: var(--accent-danger);">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `;

        // Bind Checkboxes
        listContainer.querySelectorAll('.btn-toggle-task').forEach(checkbox => {
          checkbox.addEventListener('change', async (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            const updated = await toggleTaskComplete(id);
            toast.info('Task Status', `Task marked as ${updated.completed ? 'completed' : 'pending'}.`);
            refreshTasks();
          });
        });

        // Bind Edit buttons
        listContainer.querySelectorAll('.btn-edit-task').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            const task = tasks.find(t => t.id === id);
            if (task) openTaskEditor(task);
          });
        });

        // Bind Delete buttons
        listContainer.querySelectorAll('.btn-delete-task').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            const task = tasks.find(t => t.id === id);
            const confirmed = await confirmDialog({
              title: 'Delete Task',
              message: `Are you sure you want to delete task "${task ? task.title : 'this task'}"?`,
              confirmText: 'Delete',
              isDanger: true
            });

            if (confirmed) {
              await deleteTask(id);
              toast.success('Task Deleted', 'Task removed from your local schedule.');
              refreshTasks();
            }
          });
        });

      } catch (err) {
        listContainer.innerHTML = `<p style="color: var(--accent-danger);">Failed to load tasks: ${escapeHTML(err.message)}</p>`;
      }
    };

    // Open Task Modal
    const openTaskEditor = (task = null) => {
      const isEditing = Boolean(task);

      openModal({
        title: isEditing ? 'Edit Task' : 'Create New Task',
        renderBody: (bodyEl, closeModal) => {
          bodyEl.innerHTML = `
            <form id="task-form" novalidate>
              <div class="form-group">
                <label for="task-title-input" class="form-label">Task Title *</label>
                <input 
                  type="text" 
                  id="task-title-input" 
                  class="form-input" 
                  required 
                  maxlength="200" 
                  placeholder="e.g. Read Chapter 4 on Normalization"
                  value="${task ? escapeHTML(task.title) : ''}"
                />
                <div class="form-error" id="task-title-error" style="display: none;"></div>
              </div>

              <div class="form-group">
                <label for="task-desc-input" class="form-label">Description (Optional)</label>
                <textarea 
                  id="task-desc-input" 
                  class="form-textarea" 
                  rows="3" 
                  placeholder="Details, references, or specific textbook page numbers..."
                >${task ? escapeHTML(task.description || '') : ''}</textarea>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4);">
                <div class="form-group">
                  <label for="task-due-input" class="form-label">Due Date</label>
                  <input 
                    type="date" 
                    id="task-due-input" 
                    class="form-input" 
                    value="${task && task.dueDate ? escapeHTML(task.dueDate) : getTodayDateString()}" 
                  />
                </div>

                <div class="form-group">
                  <label for="task-priority-input" class="form-label">Priority</label>
                  <select id="task-priority-input" class="form-select">
                    ${TASK_PRIORITIES.map(p => `
                      <option value="${p}" ${task && task.priority === p ? 'selected' : (p === 'medium' && !task ? 'selected' : '')}>
                        ${p.charAt(0).toUpperCase() + p.slice(1)} Priority
                      </option>
                    `).join('')}
                  </select>
                </div>
              </div>

              <div style="display: flex; justify-content: flex-end; gap: var(--space-2); margin-top: var(--space-4);">
                <button type="button" class="btn btn-secondary" id="btn-cancel-task">Cancel</button>
                <button type="submit" class="btn btn-primary" id="btn-save-task">
                  <span>${isEditing ? 'Save Changes' : 'Create Task'}</span>
                </button>
              </div>
            </form>
          `;

          const form = bodyEl.querySelector('#task-form');
          const titleInput = bodyEl.querySelector('#task-title-input');
          const titleError = bodyEl.querySelector('#task-title-error');
          const descInput = bodyEl.querySelector('#task-desc-input');
          const dueInput = bodyEl.querySelector('#task-due-input');
          const priorityInput = bodyEl.querySelector('#task-priority-input');
          const cancelBtn = bodyEl.querySelector('#btn-cancel-task');
          const saveBtn = bodyEl.querySelector('#btn-save-task');

          cancelBtn.addEventListener('click', closeModal);

          form.addEventListener('submit', async (e) => {
            e.preventDefault();
            titleError.style.display = 'none';

            const title = titleInput.value.trim();
            if (!title) {
              titleError.textContent = 'Please enter a task title.';
              titleError.style.display = 'block';
              titleInput.focus();
              return;
            }

            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';

            try {
              if (isEditing) {
                await updateTask({
                  id: task.id,
                  title,
                  description: descInput.value,
                  dueDate: dueInput.value,
                  priority: priorityInput.value,
                  completed: task.completed
                });
                toast.success('Task Updated', 'Task changes updated in IndexedDB.');
              } else {
                await createTask({
                  title,
                  description: descInput.value,
                  dueDate: dueInput.value,
                  priority: priorityInput.value
                });
                toast.success('Task Created', 'New task added to local schedule.');
              }

              closeModal();
              refreshTasks();
            } catch (err) {
              titleError.textContent = err.message;
              titleError.style.display = 'block';
              saveBtn.disabled = false;
              saveBtn.textContent = isEditing ? 'Save Changes' : 'Create Task';
            }
          });
        }
      });
    };

    // Tab Switching
    tabButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        tabButtons.forEach(b => {
          b.classList.remove('active', 'btn-secondary');
          b.classList.add('btn-ghost');
          b.setAttribute('aria-selected', 'false');
        });
        const target = e.currentTarget;
        target.classList.add('active', 'btn-secondary');
        target.classList.remove('btn-ghost');
        target.setAttribute('aria-selected', 'true');
        currentFilter = target.getAttribute('data-status');
        refreshTasks();
      });
    });

    addTaskBtn?.addEventListener('click', () => openTaskEditor());

    // Initial render
    await refreshTasks();
  }
};
