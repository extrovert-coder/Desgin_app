/**
 * Study Planner Business Logic Service
 * Demonstrates: Domain Invariant Enforcement, Collision Detection, High Cohesion
 */

import { plannerRepository } from '../data/repository.js';
import { publish } from '../core/eventBus.js';

/**
 * Convert HH:MM time string to minutes from midnight
 * @param {string} timeStr - "14:30"
 * @returns {number}
 */
export function timeStringToMinutes(timeStr) {
  if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) {
    throw new Error(`Invalid time format "${timeStr}". Expected HH:MM.`);
  }
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes from midnight to HH:MM time string
 * @param {number} totalMinutes
 * @returns {string}
 */
export function minutesToTimeString(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const mins = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Validate study session payload
 * @param {Object} data
 * @param {boolean} [isUpdate=false]
 */
function validateSessionPayload(data, isUpdate = false) {
  if (!data || typeof data !== 'object') {
    throw new Error('Study session payload must be an object.');
  }

  if (isUpdate && (!data.id || typeof data.id !== 'string')) {
    throw new Error('A valid session ID is required for updating.');
  }

  if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
    throw new Error('Session title is required and cannot be empty.');
  }

  if (!data.date || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
    throw new Error('Valid date in YYYY-MM-DD format is required.');
  }

  if (!data.startTime || !/^\d{2}:\d{2}$/.test(data.startTime)) {
    throw new Error('Valid start time in HH:MM format is required.');
  }

  const duration = Number(data.duration);
  if (isNaN(duration) || duration < 15 || duration > 480) {
    throw new Error('Duration must be between 15 and 480 minutes (8 hours).');
  }
}

/**
 * Check for time block collisions on the same date
 * @param {string} date
 * @param {number} startMinutes
 * @param {number} endMinutes
 * @param {string|null} [excludeId=null]
 * @returns {Promise<Object|null>} Colliding session or null
 */
async function findOverlappingSession(date, startMinutes, endMinutes, excludeId = null) {
  const existingOnDate = await plannerRepository.queryByIndex('by_date', date);

  for (const session of existingOnDate) {
    if (excludeId && session.id === excludeId) continue;

    const existingStart = timeStringToMinutes(session.startTime);
    const existingEnd = existingStart + Number(session.duration);

    // Overlap condition: startA < endB && endA > startB
    if (startMinutes < existingEnd && endMinutes > existingStart) {
      return {
        ...session,
        formattedStart: session.startTime,
        formattedEnd: minutesToTimeString(existingEnd)
      };
    }
  }

  return null;
}

/**
 * Create a new study session
 * @param {Object} payload
 * @param {string} payload.title
 * @param {string} payload.date
 * @param {string} payload.startTime
 * @param {number} payload.duration
 * @returns {Promise<Object>}
 */
export async function createSession({ title, date, startTime, duration }) {
  const cleanTitle = title ? title.trim() : '';
  const numDuration = Math.round(Number(duration));

  validateSessionPayload({
    title: cleanTitle,
    date,
    startTime,
    duration: numDuration
  }, false);

  const startMin = timeStringToMinutes(startTime);
  const endMin = startMin + numDuration;

  // Collision detection
  const collision = await findOverlappingSession(date, startMin, endMin);
  if (collision) {
    throw new Error(`Schedule conflict: Overlaps with existing session "${collision.title}" (${collision.formattedStart} - ${collision.formattedEnd}).`);
  }

  const newSession = await plannerRepository.add({
    title: cleanTitle,
    date,
    startTime,
    duration: numDuration
  });

  publish('planner:changed', { action: 'create', session: newSession });
  return newSession;
}

/**
 * Update an existing study session
 * @param {Object} payload
 * @returns {Promise<Object>}
 */
export async function updateSession(payload) {
  const existing = await plannerRepository.getById(payload.id);
  if (!existing) {
    throw new Error(`Session with ID "${payload.id}" not found.`);
  }

  const cleanTitle = payload.title !== undefined ? payload.title.trim() : existing.title;
  const cleanDate = payload.date !== undefined ? payload.date : existing.date;
  const cleanStartTime = payload.startTime !== undefined ? payload.startTime : existing.startTime;
  const cleanDuration = payload.duration !== undefined ? Math.round(Number(payload.duration)) : existing.duration;

  validateSessionPayload({
    id: payload.id,
    title: cleanTitle,
    date: cleanDate,
    startTime: cleanStartTime,
    duration: cleanDuration
  }, true);

  const startMin = timeStringToMinutes(cleanStartTime);
  const endMin = startMin + cleanDuration;

  // Collision detection excluding itself
  const collision = await findOverlappingSession(cleanDate, startMin, endMin, payload.id);
  if (collision) {
    throw new Error(`Schedule conflict: Overlaps with existing session "${collision.title}" (${collision.formattedStart} - ${collision.formattedEnd}).`);
  }

  const updated = await plannerRepository.update({
    id: payload.id,
    title: cleanTitle,
    date: cleanDate,
    startTime: cleanStartTime,
    duration: cleanDuration
  });

  publish('planner:changed', { action: 'update', session: updated });
  return updated;
}

/**
 * Delete a study session
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function deleteSession(id) {
  if (!id || typeof id !== 'string') {
    throw new Error('Valid session ID required for deletion.');
  }

  await plannerRepository.delete(id);
  publish('planner:changed', { action: 'delete', id });
  return true;
}

/**
 * Retrieve session by ID
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export async function getSessionById(id) {
  if (!id) return null;
  return await plannerRepository.getById(id);
}

/**
 * Retrieve all study sessions sorted by date and start time
 * @returns {Promise<Array<Object>>}
 */
export async function getAllSessions() {
  const sessions = await plannerRepository.getAll();
  return sessions.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.startTime.localeCompare(b.startTime);
  });
}

/**
 * Retrieve sessions scheduled for a specific date
 * @param {string} date
 * @returns {Promise<Array<Object>>}
 */
export async function getSessionsForDate(date) {
  const sessions = await plannerRepository.queryByIndex('by_date', date);
  return sessions.sort((a, b) => a.startTime.localeCompare(b.startTime));
}

/**
 * Compute planner metrics for dashboard summary
 * @returns {Promise<{ totalSessions: number, totalMinutesToday: number, todaySessionsCount: number, upcomingSessions: Array<Object> }>}
 */
export async function getPlannerMetrics() {
  const allSessions = await getAllSessions();
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const todaySessions = allSessions.filter(s => s.date === todayStr);
  const totalMinutesToday = todaySessions.reduce((sum, s) => sum + Number(s.duration || 0), 0);
  const upcomingSessions = allSessions.filter(s => s.date >= todayStr).slice(0, 5);

  return {
    totalSessions: allSessions.length,
    totalMinutesToday,
    todayHoursFormatted: (totalMinutesToday / 60).toFixed(1) + 'h',
    todaySessionsCount: todaySessions.length,
    upcomingSessions
  };
}
