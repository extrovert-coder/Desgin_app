/**
 * Offline Quiz View Module
 * Demonstrates: Presentation Layer, Separation of Concerns, Modularity
 */

import {
  getAvailableSubjects,
  getQuizQuestions,
  gradeAndSaveQuiz,
  getQuizHistory
} from '../../services/quizService.js';
import { toast } from '../../components/toast.js';
import { escapeHTML } from '../../utils/dom.js';

export const quizView = {
  id: 'quiz',
  title: 'Offline Quiz',

  async render(container) {
    let currentSubjectId = null;
    let questions = [];
    let currentQuestionIndex = 0;
    let userAnswers = {}; // { [questionId]: selectedIndex }
    let quizState = 'select'; // 'select' | 'active' | 'result'
    let lastResult = null;

    // Helper to format timestamps
    const formatDate = (isoString) => {
      try {
        const d = new Date(isoString);
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      } catch (e) {
        return isoString;
      }
    };

    // Main render router for quiz view
    const renderStage = async () => {
      if (quizState === 'select') {
        await renderSubjectSelection();
      } else if (quizState === 'active') {
        renderActiveQuiz();
      } else if (quizState === 'result') {
        await renderQuizResults();
      }
    };

    // 1. Stage: Subject Selection & History
    const renderSubjectSelection = async () => {
      const subjects = getAvailableSubjects();
      let history = [];
      try {
        history = await getQuizHistory();
      } catch (e) {
        console.error('Failed to load quiz history:', e);
      }

      container.innerHTML = `
        <section class="quiz-shell" aria-label="Offline Self-Assessment Quizzes">
          <div class="card" style="margin-bottom: var(--space-6);">
            <div class="card-header">
              <h2 class="card-title">Choose Assessment Topic</h2>
              <span class="badge badge-success">100% Offline Bank</span>
            </div>
            <div class="card-body">
              <p style="margin-bottom: var(--space-5);">Select a subject to take a self-evaluation quiz. All grading and scoring executes immediately on your local device.</p>
              
              <div class="feature-grid">
                ${subjects.map(s => `
                  <div class="card" style="padding: var(--space-5); display: flex; flex-direction: column; justify-content: space-between;">
                    <div>
                      <h3 style="font-size: var(--font-size-base); margin-bottom: var(--space-1);">${escapeHTML(s.title)}</h3>
                      <p style="font-size: var(--font-size-xs); color: var(--text-secondary); margin-bottom: var(--space-4);">${escapeHTML(s.description)}</p>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: var(--space-3);">
                      <span class="badge badge-primary">${s.totalQuestions} Questions</span>
                      <button type="button" class="btn btn-sm btn-primary btn-start-subject" data-subject="${escapeHTML(s.id)}">
                        <span>Start Quiz</span>
                      </button>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- Past Performance History -->
          <div class="card">
            <div class="card-header">
              <h2 class="card-title">Previous Quiz Attempts</h2>
              <span class="badge badge-muted">${history.length} Record${history.length !== 1 ? 's' : ''}</span>
            </div>
            <div class="card-body">
              ${history.length === 0 ? `
                <div class="empty-state" style="padding: var(--space-6);">
                  <div class="empty-state-icon" aria-hidden="true">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg>
                  </div>
                  <h3 class="empty-state-title" style="font-size: var(--font-size-base);">No Quiz Records Yet</h3>
                  <p class="empty-state-desc" style="font-size: var(--font-size-xs); margin-bottom: 0;">Complete a quiz above to record your score in your local IndexedDB database.</p>
                </div>
              ` : `
                <div style="overflow-x: auto;">
                  <table style="width: 100%; border-collapse: collapse; font-size: var(--font-size-sm); text-align: left;">
                    <thead>
                      <tr style="border-bottom: 1px solid var(--border-color); color: var(--text-secondary);">
                        <th style="padding: var(--space-3);">Subject</th>
                        <th style="padding: var(--space-3);">Score</th>
                        <th style="padding: var(--space-3);">Percentage</th>
                        <th style="padding: var(--space-3);">Date Completed</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${history.map(item => `
                        <tr style="border-bottom: 1px solid var(--border-color);">
                          <td style="padding: var(--space-3); font-weight: var(--font-weight-medium);">${escapeHTML(item.subject)}</td>
                          <td style="padding: var(--space-3);">${item.score} / ${item.totalQuestions}</td>
                          <td style="padding: var(--space-3);">
                            <span class="badge ${item.percentage >= 70 ? 'badge-success' : (item.percentage >= 50 ? 'badge-primary' : 'badge-warning')}">
                              ${item.percentage}%
                            </span>
                          </td>
                          <td style="padding: var(--space-3); color: var(--text-muted);">${escapeHTML(formatDate(item.completedAt))}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              `}
            </div>
          </div>
        </section>
      `;

      container.querySelectorAll('.btn-start-subject').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const subjectId = e.currentTarget.getAttribute('data-subject');
          startQuiz(subjectId);
        });
      });
    };

    // Start a quiz session
    const startQuiz = (subjectId) => {
      currentSubjectId = subjectId;
      questions = getQuizQuestions(subjectId);
      currentQuestionIndex = 0;
      userAnswers = {};
      quizState = 'active';
      renderStage();
    };

    // 2. Stage: Active Quiz
    const renderActiveQuiz = () => {
      const q = questions[currentQuestionIndex];
      const total = questions.length;
      const selected = userAnswers[q.id];
      const isLastQuestion = currentQuestionIndex === total - 1;

      container.innerHTML = `
        <section class="card" aria-label="Active Quiz Assessment" style="max-width: 760px; margin: 0 auto;">
          <div class="card-header">
            <div>
              <span class="badge badge-primary">Question ${currentQuestionIndex + 1} of ${total}</span>
            </div>
            <button type="button" class="btn btn-sm btn-ghost" id="btn-quit-quiz" style="color: var(--accent-danger);">
              Quit Quiz
            </button>
          </div>

          <div class="card-body">
            <!-- Question Prompt -->
            <h2 style="font-size: var(--font-size-lg); font-weight: var(--font-weight-bold); line-height: 1.4; margin-bottom: var(--space-6);">
              ${escapeHTML(q.prompt)}
            </h2>

            <!-- Options List -->
            <div role="radiogroup" aria-label="Answer options">
              ${q.options.map((option, idx) => `
                <div 
                  class="quiz-option ${selected === idx ? 'selected' : ''}" 
                  role="radio" 
                  aria-checked="${selected === idx ? 'true' : 'false'}"
                  tabindex="0"
                  data-index="${idx}"
                >
                  <span style="font-weight: var(--font-weight-bold); min-width: 24px; color: var(--text-muted);">${String.fromCharCode(65 + idx)}.</span>
                  <span>${escapeHTML(option)}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="card-footer" style="justify-content: space-between;">
            <button type="button" class="btn btn-secondary" id="btn-prev-q" ${currentQuestionIndex === 0 ? 'disabled' : ''}>
              ◀ Previous
            </button>
            <div style="display: flex; gap: var(--space-2);">
              ${isLastQuestion ? `
                <button type="button" class="btn btn-primary" id="btn-finish-quiz" ${selected === undefined ? 'disabled' : ''}>
                  Finish & Submit Quiz
                </button>
              ` : `
                <button type="button" class="btn btn-primary" id="btn-next-q">
                  Next ▶
                </button>
              `}
            </div>
          </div>
        </section>
      `;

      // Option selection handling
      container.querySelectorAll('.quiz-option').forEach(el => {
        const handleSelect = (idx) => {
          userAnswers[q.id] = idx;
          renderActiveQuiz();
        };

        el.addEventListener('click', (e) => {
          const idx = Number(e.currentTarget.getAttribute('data-index'));
          handleSelect(idx);
        });

        el.addEventListener('keydown', (e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            const idx = Number(e.currentTarget.getAttribute('data-index'));
            handleSelect(idx);
          }
        });
      });

      // Navigation
      container.querySelector('#btn-prev-q')?.addEventListener('click', () => {
        if (currentQuestionIndex > 0) {
          currentQuestionIndex--;
          renderActiveQuiz();
        }
      });

      container.querySelector('#btn-next-q')?.addEventListener('click', () => {
        if (currentQuestionIndex < total - 1) {
          currentQuestionIndex++;
          renderActiveQuiz();
        }
      });

      container.querySelector('#btn-finish-quiz')?.addEventListener('click', async () => {
        try {
          lastResult = await gradeAndSaveQuiz(currentSubjectId, userAnswers);
          toast.success('Quiz Submitted', `Scored ${lastResult.score} / ${lastResult.totalQuestions} (${lastResult.percentage}%).`);
          quizState = 'result';
          renderStage();
        } catch (err) {
          toast.error('Quiz Error', err.message);
        }
      });

      container.querySelector('#btn-quit-quiz')?.addEventListener('click', () => {
        quizState = 'select';
        renderStage();
      });
    };

    // 3. Stage: Quiz Results & Explanations
    const renderQuizResults = async () => {
      if (!lastResult) {
        quizState = 'select';
        return renderStage();
      }

      const { subject, score, totalQuestions, percentage, breakdown } = lastResult;
      const isPassed = percentage >= 60;

      container.innerHTML = `
        <section class="card" aria-label="Quiz Results Summary" style="max-width: 820px; margin: 0 auto;">
          <div class="card-header" style="justify-content: space-between;">
            <h2 class="card-title">Assessment Results: ${escapeHTML(subject)}</h2>
            <span class="badge ${isPassed ? 'badge-success' : 'badge-warning'}">
              ${isPassed ? 'Passed' : 'Needs Review'}
            </span>
          </div>

          <div class="card-body">
            <!-- Score Banner -->
            <div style="text-align: center; padding: var(--space-6); background: var(--bg-primary); border-radius: var(--radius-lg); margin-bottom: var(--space-6); border: 1px solid var(--border-color);">
              <div style="font-size: 3rem; font-weight: var(--font-weight-bold); color: ${isPassed ? 'var(--accent-success)' : 'var(--accent-warning)'}; line-height: 1;">
                ${percentage}%
              </div>
              <p style="font-size: var(--font-size-base); font-weight: var(--font-weight-medium); margin-top: var(--space-2); color: var(--text-primary);">
                You answered ${score} out of ${totalQuestions} questions correctly.
              </p>
              <p style="font-size: var(--font-size-xs); color: var(--text-muted); margin-top: 2px;">
                Result saved locally to your device's IndexedDB.
              </p>
            </div>

            <!-- Detailed Question Breakdown -->
            <h3 style="font-size: var(--font-size-base); margin-bottom: var(--space-4);">Detailed Question Review</h3>
            <div style="display: flex; flex-direction: column; gap: var(--space-4);">
              ${breakdown.map((item, idx) => `
                <div class="card" style="padding: var(--space-4); border-left: 4px solid ${item.isCorrect ? 'var(--accent-success)' : 'var(--accent-danger)'};">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-2);">
                    <h4 style="font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold);">${idx + 1}. ${escapeHTML(item.prompt)}</h4>
                    <span class="badge ${item.isCorrect ? 'badge-success' : 'badge-warning'}">
                      ${item.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                    </span>
                  </div>

                  <div style="font-size: var(--font-size-xs); display: flex; flex-direction: column; gap: 4px; margin-bottom: var(--space-2);">
                    <div><strong>Your Answer:</strong> ${item.selectedIndex !== null ? escapeHTML(item.options[item.selectedIndex]) : 'None selected'}</div>
                    ${!item.isCorrect ? `<div style="color: var(--accent-success);"><strong>Correct Answer:</strong> ${escapeHTML(item.options[item.correctIndex])}</div>` : ''}
                  </div>

                  <div style="font-size: var(--font-size-xs); background: var(--bg-primary); padding: var(--space-2) var(--space-3); border-radius: var(--radius-sm); border-left: 2px solid var(--accent-info); color: var(--text-secondary);">
                    <strong>Explanation:</strong> ${escapeHTML(item.explanation)}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="card-footer" style="justify-content: space-between;">
            <button type="button" class="btn btn-secondary" id="btn-back-to-subjects">
              Return to Quizzes
            </button>
            <button type="button" class="btn btn-primary" id="btn-retake-quiz">
              Retake This Quiz
            </button>
          </div>
        </section>
      `;

      container.querySelector('#btn-back-to-subjects')?.addEventListener('click', () => {
        quizState = 'select';
        renderStage();
      });

      container.querySelector('#btn-retake-quiz')?.addEventListener('click', () => {
        startQuiz(currentSubjectId);
      });
    };

    // Initial render
    await renderStage();
  }
};
