/**
 * Offline Quiz Business Logic Service & Question Bank
 * Demonstrates: Functional Independence, High Cohesion, Zero External Dependencies
 */

import { quizRepository } from '../data/repository.js';
import { publish } from '../core/eventBus.js';

/**
 * High-quality offline question bank categorized by subject
 */
export const QUESTION_BANK = Object.freeze({
  se: {
    id: 'se',
    title: 'Software Engineering Principles',
    description: 'Abstraction, Information Hiding, Coupling, Cohesion & Modular Architecture.',
    questions: [
      {
        id: 'se-1',
        prompt: 'Which software engineering concept focuses on hiding internal implementation details behind a clean public interface?',
        options: ['Modularity', 'Information Hiding', 'High Coupling', 'Reusability'],
        correctIndex: 1,
        explanation: 'Information Hiding suppresses internal data structures and implementation specifics from other modules.'
      },
      {
        id: 'se-2',
        prompt: 'What is the primary characteristic of "High Cohesion" in software design?',
        options: [
          'A module depends on many other modules',
          'A module performs a single, tightly-focused set of related responsibilities',
          'A module contains unrelated helper methods',
          'A module shares global variables with other modules'
        ],
        correctIndex: 1,
        explanation: 'High Cohesion means all elements within a module work together toward a single well-defined task.'
      },
      {
        id: 'se-3',
        prompt: 'Why is "Low Coupling" desirable between application layers?',
        options: [
          'It makes modules easier to modify, test, and reuse without unexpected side effects',
          'It forces all functions to be in a single file',
          'It eliminates the need for data validation',
          'It makes the code run faster by bypassing functions'
        ],
        correctIndex: 0,
        explanation: 'Low Coupling minimizes dependencies between modules, reducing ripple effects when code changes.'
      },
      {
        id: 'se-4',
        prompt: 'How is Abstraction demonstrated in the Offline Student Assistant database layer?',
        options: [
          'By exposing raw IDBTransaction and IDBRequest to UI views',
          'By providing high-level repository methods (add, getById, update) that conceal raw database cursors',
          'By keeping all data in global window variables',
          'By disabling database indexes'
        ],
        correctIndex: 1,
        explanation: 'The Repository pattern abstracts low-level IndexedDB transactions behind generic CRUD operations.'
      },
      {
        id: 'se-5',
        prompt: 'Which architectural principle is achieved by keeping UI rendering, business rules, and database operations in distinct layers?',
        options: [
          'Separation of Concerns',
          'Code Redundancy',
          'Monolithic Coupling',
          'Hardware Abstraction'
        ],
        correctIndex: 0,
        explanation: 'Separation of Concerns divides the software into distinct sections, each addressing a separate concern (UI, Logic, Data).'
      }
    ]
  },
  dsa: {
    id: 'dsa',
    title: 'Data Structures & Algorithms',
    description: 'Arrays, Hash Tables, Trees, and Algorithmic Complexity.',
    questions: [
      {
        id: 'dsa-1',
        prompt: 'What is the average time complexity of retrieving a value by its key in a Hash Table (Map)?',
        options: ['O(1)', 'O(n)', 'O(log n)', 'O(n^2)'],
        correctIndex: 0,
        explanation: 'Hash tables offer O(1) constant average lookup time through direct index hashing.'
      },
      {
        id: 'dsa-2',
        prompt: 'Which data structure operates on a Last-In, First-Out (LIFO) order?',
        options: ['Queue', 'Stack', 'Linked List', 'Binary Search Tree'],
        correctIndex: 1,
        explanation: 'A Stack stores items in a LIFO order (like a stack of plates).'
      },
      {
        id: 'dsa-3',
        prompt: 'What is the worst-case time complexity of QuickSort?',
        options: ['O(n log n)', 'O(n)', 'O(n^2)', 'O(log n)'],
        correctIndex: 2,
        explanation: 'QuickSort has a worst-case time complexity of O(n^2) when poor pivots are chosen (e.g. already sorted array).'
      },
      {
        id: 'dsa-4',
        prompt: 'In a balanced Binary Search Tree with N nodes, what is the maximum search depth?',
        options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
        correctIndex: 1,
        explanation: 'Balanced BSTs (such as AVL or Red-Black trees) guarantee O(log n) search depth.'
      },
      {
        id: 'dsa-5',
        prompt: 'Which algorithm is optimal for finding the shortest path in a graph with non-negative edge weights?',
        options: ["Dijkstra's Algorithm", "Kruskal's Algorithm", 'Depth-First Search', 'Bubble Sort'],
        correctIndex: 0,
        explanation: "Dijkstra's Algorithm finds the shortest path between nodes in a graph with non-negative edge weights."
      }
    ]
  },
  web: {
    id: 'web',
    title: 'Web Technologies & Offline APIs',
    description: 'IndexedDB, Service Workers, DOM APIs, and Progressive Web Apps.',
    questions: [
      {
        id: 'web-1',
        prompt: 'Which browser storage API is asynchronous, transactional, and capable of storing large structured objects offline?',
        options: ['Cookies', 'localStorage', 'IndexedDB', 'sessionStorage'],
        correctIndex: 2,
        explanation: 'IndexedDB is a transactional, asynchronous NoSQL database built natively into modern browsers.'
      },
      {
        id: 'web-2',
        prompt: 'What is the primary role of a Service Worker in an offline-first web application?',
        options: [
          'To manipulate the DOM directly',
          'To act as a programmable network proxy intercepting requests and serving cached assets',
          'To manage client cookies',
          'To encrypt CSS files'
        ],
        correctIndex: 1,
        explanation: 'A Service Worker intercepts network requests and serves cached resources when offline.'
      },
      {
        id: 'web-3',
        prompt: 'Why are JavaScript ES Modules advantageous for modular design?',
        options: [
          'They execute in module scope, preventing pollution of the global namespace',
          'They require jQuery',
          'They only run on servers',
          'They cannot import other files'
        ],
        correctIndex: 0,
        explanation: 'ES Modules enforce strict scoping, explicit exports/imports, and prevent global variable collisions.'
      },
      {
        id: 'web-4',
        prompt: 'Which CSS unit is relative to the root font-size and ideal for accessible typographic scaling?',
        options: ['px', 'rem', 'vh', 'pt'],
        correctIndex: 1,
        explanation: 'The rem unit is relative to the root element (html) font size, respecting user browser settings.'
      },
      {
        id: 'web-5',
        prompt: 'What is the purpose of ARIA live regions (`aria-live="polite"`) in accessible UI design?',
        options: [
          'To speed up page loading',
          'To announce dynamic updates (like toasts) to assistive screen-reader technologies',
          'To automatically translate text to another language',
          'To disable keyboard navigation'
        ],
        correctIndex: 1,
        explanation: 'ARIA live regions announce dynamic DOM updates without interrupting the user current interaction.'
      }
    ]
  }
});

/**
 * Get available quiz subjects
 * @returns {Array<Object>}
 */
export function getAvailableSubjects() {
  return Object.values(QUESTION_BANK).map(s => ({
    id: s.id,
    title: s.title,
    description: s.description,
    totalQuestions: s.questions.length
  }));
}

/**
 * Get questions for a specific subject
 * @param {string} subjectId
 * @returns {Array<Object>}
 */
export function getQuizQuestions(subjectId) {
  const bank = QUESTION_BANK[subjectId];
  if (!bank) {
    throw new Error(`Subject "${subjectId}" not found in question bank.`);
  }
  // Return question metadata (without revealing answers to callers)
  return bank.questions.map(q => ({
    id: q.id,
    prompt: q.prompt,
    options: [...q.options]
  }));
}

/**
 * Grade user quiz submission and persist result
 * @param {string} subjectId
 * @param {Object} userAnswers - Map of { [questionId]: selectedIndex }
 * @returns {Promise<Object>} Grade evaluation breakdown
 */
export async function gradeAndSaveQuiz(subjectId, userAnswers = {}) {
  const bank = QUESTION_BANK[subjectId];
  if (!bank) {
    throw new Error(`Subject "${subjectId}" not found.`);
  }

  const breakdown = [];
  let score = 0;

  for (const q of bank.questions) {
    const selected = userAnswers[q.id];
    const isCorrect = selected === q.correctIndex;
    if (isCorrect) score++;

    breakdown.push({
      questionId: q.id,
      prompt: q.prompt,
      options: q.options,
      selectedIndex: selected !== undefined ? selected : null,
      correctIndex: q.correctIndex,
      isCorrect,
      explanation: q.explanation
    });
  }

  const totalQuestions = bank.questions.length;
  const percentage = Math.round((score / totalQuestions) * 100);

  // Persist to IndexedDB
  const resultRecord = await quizRepository.add({
    subject: bank.title,
    subjectId: bank.id,
    score,
    totalQuestions,
    percentage,
    completedAt: new Date().toISOString()
  });

  publish('quiz:changed', { action: 'submit', result: resultRecord });

  return {
    id: resultRecord.id,
    subject: bank.title,
    score,
    totalQuestions,
    percentage,
    breakdown
  };
}

/**
 * Retrieve past quiz history sorted by latest first
 * @returns {Promise<Array<Object>>}
 */
export async function getQuizHistory() {
  const history = await quizRepository.getAll();
  return history.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
}

/**
 * Compute quiz metrics for dashboard summary
 * @returns {Promise<{ attempts: number, averageScore: number, latestQuiz: Object|null }>}
 */
export async function getQuizMetrics() {
  const history = await getQuizHistory();
  if (history.length === 0) {
    return {
      attempts: 0,
      averageScore: 0,
      latestQuiz: null
    };
  }

  const totalScore = history.reduce((sum, h) => sum + (h.percentage || Math.round((h.score / h.totalQuestions) * 100)), 0);
  const averageScore = Math.round(totalScore / history.length);

  return {
    attempts: history.length,
    averageScore,
    latestQuiz: history[0]
  };
}
