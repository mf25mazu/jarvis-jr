// models/index.js — Helpers de acesso ao banco
import { db } from '../migrations.js';
import crypto from 'crypto';

export function uuid() {
  return crypto.randomUUID();
}

export function now() {
  return new Date().toISOString();
}

// Converte row do SQLite para objeto JS tipado
export function normalize(row) {
  if (!row) return null;
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    if (k.startsWith('is_') || k === 'active' || k === 'self_reported') {
      out[k] = v === 1 ? true : v === 0 ? false : v;
    } else {
      out[k] = v;
    }
  }
  return out;
}

export function all(sql, params = []) {
  return db.prepare(sql).all(params).map(normalize);
}

export function get(sql, params = []) {
  return normalize(db.prepare(sql).get(params));
}

export function run(sql, params = []) {
  return db.prepare(sql).run(params);
}

export const queries = {
  schools: {
    all: () => all('SELECT * FROM schools ORDER BY name'),
    get: id => get('SELECT * FROM schools WHERE id = ?', id),
    create: ({ id, name }) => run('INSERT INTO schools (id, name) VALUES (?, ?)', [id, name]),
  },
  users: {
    all: schoolId => all('SELECT id, school_id, name, email, role, active, created_at FROM users WHERE school_id = ? ORDER BY name', schoolId),
    get: id => get('SELECT id, school_id, name, email, role, active, created_at FROM users WHERE id = ?', id),
    byEmail: email => get('SELECT * FROM users WHERE email = ?', email),
    create: ({ id, schoolId, name, email, passwordHash, role, active = true }) =>
      run('INSERT INTO users (id, school_id, name, email, password_hash, role, active) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, schoolId, name, email, passwordHash, role, active ? 1 : 0]),
    bySchoolAndRole: (schoolId, role) =>
      all('SELECT id, school_id, name, email, role, active, created_at FROM users WHERE school_id = ? AND role = ? ORDER BY name', [schoolId, role]),
    byClass: (classId, role = 'STUDENT') =>
      all(`SELECT u.id, u.school_id, u.name, u.email, u.role, u.active, u.created_at
           FROM users u
           JOIN class_students cs ON cs.student_id = u.id
           WHERE cs.class_id = ? AND u.role = ? ORDER BY u.name`, [classId, role]),
  },
  classes: {
    all: schoolId => all('SELECT c.*, gy.name AS grade_year_name FROM classes c JOIN grade_years gy ON gy.id = c.grade_year_id WHERE c.school_id = ? ORDER BY gy.level, c.name', schoolId),
    get: id => get('SELECT c.*, gy.name AS grade_year_name FROM classes c JOIN grade_years gy ON gy.id = c.grade_year_id WHERE c.id = ?', id),
    byTeacher: teacherId =>
      all(`SELECT c.*, gy.name AS grade_year_name FROM classes c
           JOIN class_teachers ct ON ct.class_id = c.id
           JOIN grade_years gy ON gy.id = c.grade_year_id
           WHERE ct.teacher_id = ? ORDER BY gy.level, c.name`, teacherId),
    byStudent: studentId =>
      all(`SELECT c.*, gy.name AS grade_year_name FROM classes c
           JOIN class_students cs ON cs.class_id = c.id
           JOIN grade_years gy ON gy.id = c.grade_year_id
           WHERE cs.student_id = ? ORDER BY gy.level, c.name`, studentId),
    create: ({ id, schoolId, gradeYearId, name }) =>
      run('INSERT INTO classes (id, school_id, grade_year_id, name) VALUES (?, ?, ?, ?)', [id, schoolId, gradeYearId, name]),
  },
  subjects: {
    all: schoolId => all('SELECT * FROM subjects WHERE school_id = ? ORDER BY name', schoolId),
    get: id => get('SELECT * FROM subjects WHERE id = ?', id),
    create: ({ id, schoolId, name, code }) =>
      run('INSERT INTO subjects (id, school_id, name, code) VALUES (?, ?, ?, ?)', [id, schoolId, name, code]),
  },
  questions: {
    all: schoolId => all('SELECT * FROM questions WHERE school_id = ? ORDER BY created_at DESC', schoolId),
    get: id => get('SELECT * FROM questions WHERE id = ?', id),
    byAssignment: assignmentId =>
      all(`SELECT q.*, aq.item_order, aq.weight FROM questions q
           JOIN assignment_questions aq ON aq.question_id = q.id
           WHERE aq.assignment_id = ? ORDER BY aq.item_order`, assignmentId),
    create: ({ id, schoolId, subjectId, statement, answerKey, expectedDifficulty, expectedTimeSeconds, questionType, createdBy }) =>
      run(`INSERT INTO questions (id, school_id, subject_id, statement, answer_key, expected_difficulty, expected_time_seconds, question_type, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, schoolId, subjectId, statement, answerKey, expectedDifficulty, expectedTimeSeconds, questionType, createdBy]),
  },
  assignments: {
    all: classId => all('SELECT a.*, s.name AS subject_name FROM assignments a LEFT JOIN subjects s ON s.id = a.subject_id WHERE a.class_id = ? ORDER BY a.created_at DESC', classId),
    get: id => get('SELECT a.*, s.name AS subject_name FROM assignments a LEFT JOIN subjects s ON s.id = a.subject_id WHERE a.id = ?', id),
    create: ({ id, title, subjectId, classId, createdBy, status = 'published', dueDate }) =>
      run(`INSERT INTO assignments (id, title, subject_id, class_id, created_by, status, due_date)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, title, subjectId, classId, createdBy, status, dueDate]),
    linkQuestion: ({ assignmentId, questionId, itemOrder = 0, weight = 1 }) =>
      run('INSERT INTO assignment_questions (assignment_id, question_id, item_order, weight) VALUES (?, ?, ?, ?)',
        [assignmentId, questionId, itemOrder, weight]),
  },
  submissions: {
    byStudent: studentId => all('SELECT * FROM submissions WHERE student_id = ? ORDER BY created_at', studentId),
    byClass: classId =>
      all(`SELECT s.* FROM submissions s
           JOIN assignments a ON a.id = s.assignment_id
           WHERE a.class_id = ? ORDER BY s.created_at`, classId),
    byAssignment: assignmentId => all('SELECT * FROM submissions WHERE assignment_id = ? ORDER BY created_at', assignmentId),
    upsert: ({ id, studentId, questionId, assignmentId, completionStatus, isCorrect, errorCategory, perceivedDifficulty, timeSpentSeconds }) => {
      const existing = get('SELECT id FROM submissions WHERE student_id = ? AND question_id = ? AND assignment_id = ?', [studentId, questionId, assignmentId]);
      if (existing) {
        run(`UPDATE submissions SET completion_status = ?, is_correct = ?, error_category = ?, perceived_difficulty = ?, time_spent_seconds = ?, updated_at = ?
             WHERE id = ?`,
          [completionStatus, isCorrect === null ? null : isCorrect ? 1 : 0, errorCategory, perceivedDifficulty, timeSpentSeconds, now(), existing.id]);
        return existing.id;
      }
      run(`INSERT INTO submissions (id, student_id, question_id, assignment_id, completion_status, is_correct, error_category, perceived_difficulty, time_spent_seconds)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, studentId, questionId, assignmentId, completionStatus, isCorrect === null ? null : isCorrect ? 1 : 0, errorCategory, perceivedDifficulty, timeSpentSeconds]);
      return id;
    },
  },
};
