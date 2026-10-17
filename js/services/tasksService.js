/**
 * Tasks Business Logic Service
 * Demonstrates: Separation of Concerns, High Cohesion, Functional Independence
 */

import { tasksRepository } from '../data/repository.js';
import { publish } from '../core/eventBus.js';

export const TASK_PRIORITIES = Object.freeze(['low', 'medium', 'high']);

/**
 * Get today's date formatted as YYYY-MM-DD in local time
 * @returns {string}
 */
export function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Determine if a task is overdue
 * @param {Object} task
 * @returns {boolean}
 */
export function isTaskOverdue(task) {
  if (!task || task.completed || !task.dueDate) return false;
  return task.dueDate < getTodayDateString();
}

/**
 * Validate task input payload
 * @param {Object} data
 * @param {boolean} [isUpdate=false]
 */
function validateTaskPayload(data, isUpdate = false) {
  if (!data || typeof data !== 'object') {
    throw new Error('Task payload must be an object.');
  }

  if (isUpdate && (!data.id || typeof data.id !== 'string')) {
    throw new Error('A valid task ID is required for updating.');
  }

  if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
    throw new Error('Task title is required and cannot be empty.');
  }

  if (data.title.trim().length > 200) {
    throw new Error('Task title cannot exceed 200 characters.');
  }

  if (data.priority && !TASK_PRIORITIES.includes(data.priority)) {
    throw new Error(`Invalid priority "${data.priority}". Must be one of: ${TASK_PRIORITIES.join(', ')}.`);
  }

  if (data.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(data.dueDate)) {
    throw new Error('Due date must be in YYYY-MM-DD format.');
  }
}

/**
 * Create a new task
 * @param {Object} payload
 * @param {string} payload.title
 * @param {string} [payload.description='']
 * @param {string} [payload.dueDate='']
 * @param {string} [payload.priority='medium']
 * @returns {Promise<Object>}
 */
export async function createTask({ title, description = '', dueDate = '', priority = 'medium' }) {
  const cleanTitle = title ? title.trim() : '';
  const cleanDesc = description ? String(description).trim() : '';
  const cleanPriority = TASK_PRIORITIES.includes(priority) ? priority : 'medium';
  const cleanDueDate = dueDate ? dueDate.trim() : '';

  validateTaskPayload({
    title: cleanTitle,
    description: cleanDesc,
    dueDate: cleanDueDate,
    priority: cleanPriority
  }, false);

  const newTask = await tasksRepository.add({
    title: cleanTitle,
    description: cleanDesc,
    dueDate: cleanDueDate,
    priority: cleanPriority,
    completed: false
  });

  publish('tasks:changed', { action: 'create', task: newTask });
  return newTask;
}

/**
 * Update an existing task
 * @param {Object} payload
 * @returns {Promise<Object>}
 */
export async function updateTask(payload) {
  const existing = await tasksRepository.getById(payload.id);
  if (!existing) {
    throw new Error(`Task with id "${payload.id}" not found.`);
  }

  const cleanTitle = payload.title !== undefined ? payload.title.trim() : existing.title;
  const cleanDesc = payload.description !== undefined ? String(payload.description).trim() : existing.description;
  const cleanPriority = payload.priority && TASK_PRIORITIES.includes(payload.priority) ? payload.priority : existing.priority;
  const cleanDueDate = payload.dueDate !== undefined ? payload.dueDate.trim() : existing.dueDate;
  const cleanCompleted = payload.completed !== undefined ? Boolean(payload.completed) : existing.completed;

  validateTaskPayload({
    id: payload.id,
    title: cleanTitle,
    description: cleanDesc,
    dueDate: cleanDueDate,
    priority: cleanPriority
  }, true);

  const updated = await tasksRepository.update({
    id: payload.id,
    title: cleanTitle,
    description: cleanDesc,
    dueDate: cleanDueDate,
    priority: cleanPriority,
    completed: cleanCompleted
  });

  publish('tasks:changed', { action: 'update', task: updated });
  return updated;
}

/**
 * Toggle task completion status
 * @param {string} id
 * @returns {Promise<Object>}
 */
export async function toggleTaskComplete(id) {
  const task = await tasksRepository.getById(id);
  if (!task) {
    throw new Error(`Task with ID "${id}" does not exist.`);
  }

  const updated = await tasksRepository.update({
    id,
    completed: !task.completed
  });

  publish('tasks:changed', { action: 'toggle', task: updated });
  return updated;
}

/**
 * Delete a task
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function deleteTask(id) {
  if (!id || typeof id !== 'string') {
    throw new Error('Valid task ID required for deletion.');
  }

  await tasksRepository.delete(id);
  publish('tasks:changed', { action: 'delete', id });
  return true;
}

/**
 * Retrieve task by ID
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export async function getTaskById(id) {
  if (!id) return null;
  return await tasksRepository.getById(id);
}

/**
 * Retrieve all tasks sorted by completion (pending first), then priority (high first), then due date
 * @returns {Promise<Array<Object>>}
 */
export async function getAllTasks() {
  const tasks = await tasksRepository.getAll();
  const priorityOrder = { high: 0, medium: 1, low: 2 };

  return tasks.sort((a, b) => {
    // 1. Pending tasks before completed
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    // 2. Priority
    const pA = priorityOrder[a.priority] ?? 1;
    const pB = priorityOrder[b.priority] ?? 1;
    if (pA !== pB) return pA - pB;
    // 3. Due Date
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    // 4. Creation Date
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
}

/**
 * Filter tasks by status
 * @param {'all'|'pending'|'completed'|'overdue'} status
 * @returns {Promise<Array<Object>>}
 */
export async function filterTasks(status = 'all') {
  const tasks = await getAllTasks();

  switch (status) {
    case 'pending':
      return tasks.filter(t => !t.completed);
    case 'completed':
      return tasks.filter(t => t.completed);
    case 'overdue':
      return tasks.filter(t => isTaskOverdue(t));
    case 'all':
    default:
      return tasks;
  }
}

/**
 * Compute real-time task metrics
 * @returns {Promise<{ total: number, pending: number, completed: number, overdue: number }>}
 */
export async function getTaskMetrics() {
  const tasks = await tasksRepository.getAll();
  let pending = 0;
  let completed = 0;
  let overdue = 0;

  for (const task of tasks) {
    if (task.completed) {
      completed++;
    } else {
      pending++;
      if (isTaskOverdue(task)) {
        overdue++;
      }
    }
  }

  return {
    total: tasks.length,
    pending,
    completed,
    overdue
  };
}
