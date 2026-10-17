/**
 * Notes Business Logic Service
 * Demonstrates: Separation of Concerns, High Cohesion, Functional Independence
 */

import { notesRepository } from '../data/repository.js';
import { publish } from '../core/eventBus.js';

export const NOTE_CATEGORIES = Object.freeze(['lecture', 'revision', 'exam', 'general']);

/**
 * Validate note input payload
 * @param {Object} data
 * @throws {Error} if validation fails
 */
function validateNotePayload(data, isUpdate = false) {
  if (!data || typeof data !== 'object') {
    throw new Error('Note data must be an object.');
  }

  if (isUpdate && (!data.id || typeof data.id !== 'string')) {
    throw new Error('A valid note ID is required for updating.');
  }

  if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
    throw new Error('Note title is required and cannot be empty.');
  }

  if (data.title.trim().length > 200) {
    throw new Error('Note title cannot exceed 200 characters.');
  }

  if (data.category && !NOTE_CATEGORIES.includes(data.category)) {
    throw new Error(`Invalid category "${data.category}". Must be one of: ${NOTE_CATEGORIES.join(', ')}.`);
  }
}

/**
 * Create a new note
 * @param {Object} payload
 * @param {string} payload.title
 * @param {string} [payload.content='']
 * @param {string} [payload.category='general']
 * @returns {Promise<Object>}
 */
export async function createNote({ title, content = '', category = 'general' }) {
  const cleanCategory = NOTE_CATEGORIES.includes(category) ? category : 'general';
  const cleanTitle = title ? title.trim() : '';
  const cleanContent = content ? String(content).trim() : '';

  validateNotePayload({ title: cleanTitle, content: cleanContent, category: cleanCategory }, false);

  const newNote = await notesRepository.add({
    title: cleanTitle,
    content: cleanContent,
    category: cleanCategory
  });

  publish('notes:changed', { action: 'create', note: newNote });
  return newNote;
}

/**
 * Update an existing note
 * @param {Object} payload
 * @param {string} payload.id
 * @param {string} payload.title
 * @param {string} [payload.content='']
 * @param {string} [payload.category='general']
 * @returns {Promise<Object>}
 */
export async function updateNote({ id, title, content = '', category = 'general' }) {
  const cleanCategory = NOTE_CATEGORIES.includes(category) ? category : 'general';
  const cleanTitle = title ? title.trim() : '';
  const cleanContent = content ? String(content).trim() : '';

  validateNotePayload({ id, title: cleanTitle, content: cleanContent, category: cleanCategory }, true);

  const updatedNote = await notesRepository.update({
    id,
    title: cleanTitle,
    content: cleanContent,
    category: cleanCategory
  });

  publish('notes:changed', { action: 'update', note: updatedNote });
  return updatedNote;
}

/**
 * Delete a note by its ID
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function deleteNote(id) {
  if (!id || typeof id !== 'string') {
    throw new Error('Valid note ID required for deletion.');
  }

  await notesRepository.delete(id);
  publish('notes:changed', { action: 'delete', id });
  return true;
}

/**
 * Retrieve a note by its ID
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export async function getNoteById(id) {
  if (!id) return null;
  return await notesRepository.getById(id);
}

/**
 * Retrieve all notes, sorted by latest updated first
 * @returns {Promise<Array<Object>>}
 */
export async function getAllNotes() {
  const notes = await notesRepository.getAll();
  return notes.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
}

/**
 * Search and filter notes
 * @param {string} [query='']
 * @param {string} [category='all']
 * @returns {Promise<Array<Object>>}
 */
export async function searchNotes(query = '', category = 'all') {
  const allNotes = await getAllNotes();
  const lowerQuery = query.toLowerCase().trim();

  return allNotes.filter((note) => {
    const matchesCategory = category === 'all' || note.category === category;
    const matchesQuery = !lowerQuery ||
      note.title.toLowerCase().includes(lowerQuery) ||
      (note.content && note.content.toLowerCase().includes(lowerQuery));

    return matchesCategory && matchesQuery;
  });
}

/**
 * Get total notes count
 * @returns {Promise<number>}
 */
export async function getNotesCount() {
  return await notesRepository.count();
}
