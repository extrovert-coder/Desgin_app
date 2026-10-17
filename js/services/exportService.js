/**
 * Data Backup, Export, and Restoration Service
 * Demonstrates: Information Hiding, Low Coupling, Error Handling
 */

import { notesRepository, tasksRepository, quizRepository, plannerRepository } from '../data/repository.js';
import { publish } from '../core/eventBus.js';

export const BACKUP_FORMAT_VERSION = 1;
export const APP_IDENTIFIER = 'Offline Student Assistant';

/**
 * Compile all local data into a unified backup object
 * @returns {Promise<Object>}
 */
export async function createBackupData() {
  const [notes, tasks, quiz_results, planner] = await Promise.all([
    notesRepository.getAll(),
    tasksRepository.getAll(),
    quizRepository.getAll(),
    plannerRepository.getAll()
  ]);

  return {
    appName: APP_IDENTIFIER,
    version: BACKUP_FORMAT_VERSION,
    exportDate: new Date().toISOString(),
    counts: {
      notes: notes.length,
      tasks: tasks.length,
      quiz_results: quiz_results.length,
      planner: planner.length
    },
    data: {
      notes,
      tasks,
      quiz_results,
      planner
    }
  };
}

/**
 * Trigger client-side JSON download
 * @returns {Promise<string>} File name downloaded
 */
export async function downloadBackupFile() {
  const backup = await createBackupData();
  const jsonString = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `student-assistant-backup-${dateStr}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return filename;
}

/**
 * Validate imported JSON backup structure
 * @param {string|Object} input
 * @returns {{ valid: boolean, error?: string, counts?: Object, parsedData?: Object }}
 */
export function validateBackup(input) {
  let parsed;
  try {
    parsed = typeof input === 'string' ? JSON.parse(input) : input;
  } catch (err) {
    return { valid: false, error: 'Invalid JSON format: File could not be parsed.' };
  }

  if (!parsed || typeof parsed !== 'object') {
    return { valid: false, error: 'Backup root must be an object.' };
  }

  if (!parsed.data || typeof parsed.data !== 'object') {
    return { valid: false, error: 'Backup is missing the essential "data" property.' };
  }

  const { notes, tasks, quiz_results, planner } = parsed.data;

  if (!Array.isArray(notes) || !Array.isArray(tasks) || !Array.isArray(quiz_results) || !Array.isArray(planner)) {
    return { valid: false, error: 'Incompatible structure: All entity sets (notes, tasks, quiz_results, planner) must be arrays.' };
  }

  // Validate items have IDs and strings
  for (const note of notes) {
    if (!note || typeof note !== 'object' || !note.id || !note.title) {
      return { valid: false, error: 'Malformed notes entry detected in backup.' };
    }
  }

  for (const task of tasks) {
    if (!task || typeof task !== 'object' || !task.id || !task.title) {
      return { valid: false, error: 'Malformed tasks entry detected in backup.' };
    }
  }

  return {
    valid: true,
    counts: {
      notes: notes.length,
      tasks: tasks.length,
      quiz_results: quiz_results.length,
      planner: planner.length
    },
    parsedData: parsed.data
  };
}

/**
 * Restore data from a validated backup object
 * @param {Object} dataPayload
 * @param {'replace'|'merge'} [mode='replace']
 * @returns {Promise<Object>} Summary of restored counts
 */
export async function restoreBackupData(dataPayload, mode = 'replace') {
  const { notes, tasks, quiz_results, planner } = dataPayload;

  if (mode === 'replace') {
    // Clear existing data safely
    await Promise.all([
      notesRepository.clear(),
      tasksRepository.clear(),
      quizRepository.clear(),
      plannerRepository.clear()
    ]);
  }

  // Restore Notes
  for (const note of notes) {
    if (mode === 'merge') {
      const existing = await notesRepository.getById(note.id);
      if (existing) {
        await notesRepository.update(note);
      } else {
        await notesRepository.add(note);
      }
    } else {
      await notesRepository.add(note);
    }
  }

  // Restore Tasks
  for (const task of tasks) {
    if (mode === 'merge') {
      const existing = await tasksRepository.getById(task.id);
      if (existing) {
        await tasksRepository.update(task);
      } else {
        await tasksRepository.add(task);
      }
    } else {
      await tasksRepository.add(task);
    }
  }

  // Restore Quiz Results
  for (const quiz of quiz_results) {
    if (mode === 'merge') {
      const existing = await quizRepository.getById(quiz.id);
      if (existing) {
        await quizRepository.update(quiz);
      } else {
        await quizRepository.add(quiz);
      }
    } else {
      await quizRepository.add(quiz);
    }
  }

  // Restore Planner Sessions
  for (const session of planner) {
    if (mode === 'merge') {
      const existing = await plannerRepository.getById(session.id);
      if (existing) {
        await plannerRepository.update(session);
      } else {
        await plannerRepository.add(session);
      }
    } else {
      await plannerRepository.add(session);
    }
  }

  const resultCounts = {
    notes: notes.length,
    tasks: tasks.length,
    quiz_results: quiz_results.length,
    planner: planner.length
  };

  publish('data:imported', { mode, counts: resultCounts });
  return resultCounts;
}

/**
 * Purge all local records across all stores
 * @returns {Promise<void>}
 */
export async function purgeAllLocalData() {
  await Promise.all([
    notesRepository.clear(),
    tasksRepository.clear(),
    quizRepository.clear(),
    plannerRepository.clear()
  ]);

  publish('data:cleared', {});
}
