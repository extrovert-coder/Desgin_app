/**
 * Notes Manager View Module
 * Demonstrates: Presentation Layer, Separation of Concerns, Modularity
 */

import {
  createNote,
  updateNote,
  deleteNote,
  searchNotes,
  NOTE_CATEGORIES
} from '../../services/notesService.js';
import { openModal } from '../../components/modal.js';
import { confirmDialog } from '../../components/confirm.js';
import { toast } from '../../components/toast.js';
import { escapeHTML } from '../../utils/dom.js';

export const notesView = {
  id: 'notes',
  title: 'Notes Manager',

  async render(container) {
    container.innerHTML = `
      <section class="notes-shell" aria-label="Notes Management">
        <!-- Controls & Filter Toolbar -->
        <div class="card" style="margin-bottom: var(--space-6);">
          <div class="card-body" style="display: flex; flex-wrap: wrap; gap: var(--space-4); align-items: center; justify-content: space-between;">
            <div style="flex: 1; min-width: 240px; position: relative;">
              <label for="notes-search-input" class="sr-only">Search notes</label>
              <input 
                type="search" 
                id="notes-search-input" 
                placeholder="Search notes by title or keywords..." 
                style="width: 100%; padding: var(--space-2) var(--space-4); border-radius: var(--radius-md); border: 1px solid var(--border-color); background: var(--bg-primary); color: var(--text-primary);"
              />
            </div>
            <div style="display: flex; gap: var(--space-2); align-items: center;">
              <label for="notes-filter-category" class="sr-only">Filter by category</label>
              <select id="notes-filter-category" style="padding: var(--space-2) var(--space-3); border-radius: var(--radius-md); border: 1px solid var(--border-color); background: var(--bg-surface); color: var(--text-primary);">
                <option value="all">All Categories</option>
                <option value="lecture">Lectures</option>
                <option value="revision">Revision</option>
                <option value="exam">Exam Prep</option>
                <option value="general">General</option>
              </select>
              <button type="button" class="btn btn-primary" id="btn-create-note">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                <span>New Note</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Notes List Container -->
        <div id="notes-cards-container" aria-live="polite">
          <p style="text-align: center; color: var(--text-muted); padding: var(--space-8);">Loading offline notes...</p>
        </div>
      </section>
    `;

    const searchInput = container.querySelector('#notes-search-input');
    const categorySelect = container.querySelector('#notes-filter-category');
    const cardsContainer = container.querySelector('#notes-cards-container');
    const createBtn = container.querySelector('#btn-create-note');

    // Helper to format timestamps
    const formatDate = (isoString) => {
      if (!isoString) return '';
      try {
        const d = new Date(isoString);
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      } catch (e) {
        return isoString;
      }
    };

    // Render list of note cards
    const refreshNotes = async () => {
      const query = searchInput ? searchInput.value : '';
      const category = categorySelect ? categorySelect.value : 'all';

      try {
        const notes = await searchNotes(query, category);

        if (notes.length === 0) {
          cardsContainer.innerHTML = `
            <div class="empty-state">
              <div class="empty-state-icon" aria-hidden="true">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
              </div>
              <h3 class="empty-state-title">${query ? 'No matching notes found' : 'No Notes Created Yet'}</h3>
              <p class="empty-state-desc">${query ? 'Try adjusting your search terms or filter category.' : 'Create lecture summaries, formulae, and study notes saved permanently to your device.'}</p>
              ${!query ? `<button type="button" class="btn btn-secondary" id="btn-create-note-empty"><span>Create Your First Note</span></button>` : ''}
            </div>
          `;
          cardsContainer.querySelector('#btn-create-note-empty')?.addEventListener('click', () => openNoteEditor());
          return;
        }

        cardsContainer.innerHTML = `
          <div class="notes-grid">
            ${notes.map(note => `
              <article class="note-card" data-note-id="${escapeHTML(note.id)}">
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-2); margin-bottom: var(--space-2);">
                    <h3 class="note-card-title">${escapeHTML(note.title)}</h3>
                    <span class="badge badge-primary" style="text-transform: capitalize;">${escapeHTML(note.category || 'general')}</span>
                  </div>
                  <div class="note-card-body">${escapeHTML(note.content || 'No text content.')}</div>
                </div>
                <div class="note-card-footer">
                  <span title="Created: ${escapeHTML(formatDate(note.createdAt))}">Updated ${escapeHTML(formatDate(note.updatedAt || note.createdAt))}</span>
                  <div style="display: flex; gap: var(--space-1);">
                    <button type="button" class="btn-icon btn-edit-note" aria-label="Edit note ${escapeHTML(note.title)}" data-id="${escapeHTML(note.id)}">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button type="button" class="btn-icon btn-delete-note" aria-label="Delete note ${escapeHTML(note.title)}" data-id="${escapeHTML(note.id)}" style="color: var(--accent-danger);">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                  </div>
                </div>
              </article>
            `).join('')}
          </div>
        `;

        // Attach action handlers
        cardsContainer.querySelectorAll('.btn-edit-note').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            const note = notes.find(n => n.id === id);
            if (note) openNoteEditor(note);
          });
        });

        cardsContainer.querySelectorAll('.btn-delete-note').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            const note = notes.find(n => n.id === id);
            const confirmed = await confirmDialog({
              title: 'Delete Note',
              message: `Are you sure you want to delete note "${note ? note.title : 'this note'}"? This action cannot be undone.`,
              confirmText: 'Delete',
              isDanger: true
            });

            if (confirmed) {
              await deleteNote(id);
              toast.success('Note Deleted', 'The note was removed from local storage.');
              refreshNotes();
            }
          });
        });

      } catch (err) {
        cardsContainer.innerHTML = `<p style="color: var(--accent-danger);">Failed to load notes: ${escapeHTML(err.message)}</p>`;
      }
    };

    // Open Note Editor (Create or Edit)
    const openNoteEditor = (note = null) => {
      const isEditing = Boolean(note);

      openModal({
        title: isEditing ? 'Edit Study Note' : 'Create New Note',
        renderBody: (bodyEl, closeModal) => {
          bodyEl.innerHTML = `
            <form id="note-form" novalidate>
              <div class="form-group">
                <label for="note-title-input" class="form-label">Title *</label>
                <input 
                  type="text" 
                  id="note-title-input" 
                  class="form-input" 
                  required 
                  maxlength="200" 
                  placeholder="e.g. Operating Systems: Virtual Memory"
                  value="${note ? escapeHTML(note.title) : ''}"
                />
                <div class="form-error" id="note-title-error" style="display: none;"></div>
              </div>

              <div class="form-group">
                <label for="note-category-input" class="form-label">Category</label>
                <select id="note-category-input" class="form-select">
                  ${NOTE_CATEGORIES.map(cat => `
                    <option value="${cat}" ${note && note.category === cat ? 'selected' : ''}>
                      ${cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  `).join('')}
                </select>
              </div>

              <div class="form-group">
                <label for="note-content-input" class="form-label">Content</label>
                <textarea 
                  id="note-content-input" 
                  class="form-textarea" 
                  rows="6" 
                  placeholder="Record lecture summaries, code snippets, formulas, or key concepts..."
                >${note ? escapeHTML(note.content || '') : ''}</textarea>
              </div>

              <div style="display: flex; justify-content: flex-end; gap: var(--space-2); margin-top: var(--space-4);">
                <button type="button" class="btn btn-secondary" id="btn-cancel-note">Cancel</button>
                <button type="submit" class="btn btn-primary" id="btn-save-note">
                  <span>${isEditing ? 'Save Changes' : 'Create Note'}</span>
                </button>
              </div>
            </form>
          `;

          const form = bodyEl.querySelector('#note-form');
          const titleInput = bodyEl.querySelector('#note-title-input');
          const titleError = bodyEl.querySelector('#note-title-error');
          const categoryInput = bodyEl.querySelector('#note-category-input');
          const contentInput = bodyEl.querySelector('#note-content-input');
          const cancelBtn = bodyEl.querySelector('#btn-cancel-note');
          const saveBtn = bodyEl.querySelector('#btn-save-note');

          cancelBtn.addEventListener('click', closeModal);

          form.addEventListener('submit', async (e) => {
            e.preventDefault();
            titleError.style.display = 'none';

            const title = titleInput.value.trim();
            if (!title) {
              titleError.textContent = 'Please enter a note title.';
              titleError.style.display = 'block';
              titleInput.focus();
              return;
            }

            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';

            try {
              if (isEditing) {
                await updateNote({
                  id: note.id,
                  title,
                  category: categoryInput.value,
                  content: contentInput.value
                });
                toast.success('Note Updated', 'Your changes have been saved to IndexedDB.');
              } else {
                await createNote({
                  title,
                  category: categoryInput.value,
                  content: contentInput.value
                });
                toast.success('Note Created', 'New note successfully saved to IndexedDB.');
              }

              closeModal();
              refreshNotes();
            } catch (err) {
              titleError.textContent = err.message;
              titleError.style.display = 'block';
              saveBtn.disabled = false;
              saveBtn.textContent = isEditing ? 'Save Changes' : 'Create Note';
            }
          });
        }
      });
    };

    // Event Listeners for Filters
    createBtn?.addEventListener('click', () => openNoteEditor());
    searchInput?.addEventListener('input', () => refreshNotes());
    categorySelect?.addEventListener('change', () => refreshNotes());

    // Initial load
    await refreshNotes();
  }
};
