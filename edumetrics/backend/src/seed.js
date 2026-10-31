// seed.js — Popula o banco SQLite com dados de exemplo
import { db, migrate } from './migrations.js';
import { uuid, now, queries, run, get, all } from './models/index.js';
import crypto from 'crypto';

const SCHOOL = { id: uuid(), name: 'Escola Modelo EduMetrics' };
const GRADE_YEAR = { id: uuid(), name: '9º Ano', level: 9 };
const SUBJECTS = [
  { id: uuid(), name: 'Matemática', code: 'MAT' },
  { id: uuid(), name: 'Língua Portuguesa', code: 'LP' },
];

const TEACHERS = [
  { id: uuid(), name: 'Prof. Ana Silva', email: 'ana@edumetrics.local', password: 'prof123' },
  { id: uuid(), name: 'Prof. Bruno Costa', email: 'bruno@edumetrics.local', password: 'prof456' },
];

const CLASSES = [
  { id: uuid(), name: '9º A' },
  { id: uuid(), name: '9º B' },
];

const STUDENTS = [
  { id: uuid(), name: 'Aluno 1', turma: 0 },
  { id: uuid(), name: 'Aluno 2', turma: 0 },
  { id: uuid(), name: 'Aluno 3', turma: 0 },
  { id: uuid(), name: 'Aluno 4', turma: 0 },
  { id: uuid(), name: 'Aluno 5', turma: 1 },
  { id: uuid(), name: 'Aluno 6', turma: 1 },
  { id: uuid(), name: 'Aluno 7', turma: 1 },
  { id: uuid(), name: 'Aluno 8', turma: 1 },
];

const QUESTIONS_MAT = [
  { statement: 'Calcule o valor de x em 2x + 4 = 10.', expected_difficulty: 2, expected_time_seconds: 120 },
  { statement: 'Resolva a equação do 2º grau: x² - 5x + 6 = 0.', expected_difficulty: 3, expected_time_seconds: 180 },
  { statement: 'Qual é a área de um círculo de raio 3 cm?', expected_difficulty: 2, expected_time_seconds: 120 },
  { statement: 'Se um triângulo tem lados 3, 4 e 5, ele é retângulo?', expected_difficulty: 2, expected_time_seconds: 120 },
  { statement: 'Calcule 25% de 200.', expected_difficulty: 1, expected_time_seconds: 60 },
  { statement: 'Simplifique a fração 12/18.', expected_difficulty: 1, expected_time_seconds: 60 },
  { statement: 'Encontre o valor de f(x) = 2x + 1 quando x = 3.', expected_difficulty: 2, expected_time_seconds: 90 },
  { statement: 'Determine o MMC de 4 e 6.', expected_difficulty: 1, expected_time_seconds: 60 },
  { statement: 'Um carro percorre 240 km em 3 horas. Qual a velocidade média?', expected_difficulty: 2, expected_time_seconds: 120 },
  { statement: 'Resolva: 3(x - 2) = 9.', expected_difficulty: 2, expected_time_seconds: 120 },
  { statement: 'Calcule o volume de um cubo de aresta 4 cm.', expected_difficulty: 2, expected_time_seconds: 120 },
  { statement: 'Converta 0,75 em fração.', expected_difficulty: 1, expected_time_seconds: 60 },
];

const QUESTIONS_LP = [
  { statement: 'Identifique o sujeito da oração: "Os alunos estudaram para a prova."', expected_difficulty: 2, expected_time_seconds: 90 },
  { statement: 'Explique o que é uma metáfora.', expected_difficulty: 3, expected_time_seconds: 180 },
  { statement: 'Leia o trecho e indique a tese do texto.', expected_difficulty: 3, expected_time_seconds: 200 },
  { statement: 'Classifique a oração como simples ou composta.', expected_difficulty: 2, expected_time_seconds: 90 },
  { statement: 'Qual é a função da vírgula na frase: "Cheguei, vi e venci."?', expected_difficulty: 2, expected_time_seconds: 90 },
  { statement: 'Dê um exemplo de palavra dissílaba.', expected_difficulty: 1, expected_time_seconds: 60 },
  { statement: 'Explique o que é ironia.', expected_difficulty: 3, expected_time_seconds: 180 },
  { statement: 'Reescreva a frase na voz passiva: "O professor corrigiu as provas."', expected_difficulty: 2, expected_time_seconds: 120 },
  { statement: 'Qual o gênero textual de um editorial?', expected_difficulty: 3, expected_time_seconds: 120 },
  { statement: 'Identifique o predicado na frase: "Maria comprou um livro."', expected_difficulty: 2, expected_time_seconds: 90 },
];

const ERROR_CATEGORIES = ['TEORIA', 'CONTA', 'INTERPRETACAO', 'ATENCAO'];

function hash(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function simulateResponse(difficulty, studentSkill) {
  const roll = Math.random();
  const successChance = Math.min(0.95, Math.max(0.15, studentSkill - difficulty * 0.08 + 0.2));
  const completionStatus = roll > 0.15 ? 'FIZ' : 'NAO_FIZ';
  if (completionStatus === 'NAO_FIZ') {
    return { completionStatus: 'NAO_FIZ', isCorrect: null, errorCategory: null, perceivedDifficulty: randomInt(3, 5), timeSpentSeconds: randomInt(30, 90) };
  }
  const isCorrect = roll > 0.15 + (1 - successChance);
  let errorCategory = null;
  if (!isCorrect) {
    // tendência baseada em perfil
    errorCategory = pick(ERROR_CATEGORIES);
  }
  const perceivedDifficulty = isCorrect ? randomInt(Math.max(1, difficulty - 1), difficulty + 1) : randomInt(difficulty, Math.min(5, difficulty + 2));
  const baseTime = isCorrect ? 60 + difficulty * 40 : 90 + difficulty * 50;
  const timeSpentSeconds = randomInt(baseTime, baseTime + 120);
  return { completionStatus: 'FIZ', isCorrect, errorCategory, perceivedDifficulty, timeSpentSeconds };
}

function main() {
  migrate();
  console.log('Schema aplicado.');

  // Limpar dados anteriores
  db.exec(`DELETE FROM submissions; DELETE FROM assignment_questions; DELETE FROM assignment_sessions;
           DELETE FROM assignments; DELETE FROM questions; DELETE FROM class_students; DELETE FROM class_teachers;
           DELETE FROM classes; DELETE FROM subjects; DELETE FROM grade_years; DELETE FROM users; DELETE FROM schools;`);

  // Escola
  queries.schools.create(SCHOOL);
  console.log('Escola:', SCHOOL.name);

  // Ano/Série
  db.prepare('INSERT INTO grade_years (id, school_id, name, level) VALUES (?, ?, ?, ?)')
    .run(GRADE_YEAR.id, SCHOOL.id, GRADE_YEAR.name, GRADE_YEAR.level);

  // Disciplinas
  SUBJECTS.forEach(s => queries.subjects.create({ ...s, schoolId: SCHOOL.id }));

  // Professores
  TEACHERS.forEach(t => {
    queries.users.create({ id: t.id, schoolId: SCHOOL.id, name: t.name, email: t.email, passwordHash: hash(t.password), role: 'TEACHER' });
    console.log('Professor:', t.email);
  });

  // Turmas
  CLASSES.forEach((c, i) => {
    queries.classes.create({ id: c.id, schoolId: SCHOOL.id, gradeYearId: GRADE_YEAR.id, name: c.name });
    // Vincula professor
    db.prepare('INSERT INTO class_teachers (class_id, teacher_id, subject_id) VALUES (?, ?, ?)')
      .run(c.id, TEACHERS[i % TEACHERS.length].id, SUBJECTS[0].id);
    console.log('Turma:', c.name);
  });

  // Estudantes
  STUDENTS.forEach(s => {
    const email = `aluno${s.turma * 4 + STUDENTS.indexOf(s) + 1}@edumetrics.local`;
    queries.users.create({ id: s.id, schoolId: SCHOOL.id, name: s.name, email, passwordHash: hash('aluno123'), role: 'STUDENT' });
    db.prepare('INSERT INTO class_students (class_id, student_id) VALUES (?, ?)')
      .run(CLASSES[s.turma].id, s.id);
  });
  console.log('8 estudantes criados.');

  // Questões
  const questions = [];
  QUESTIONS_MAT.forEach((q, i) => {
    const id = uuid();
    queries.questions.create({
      id, schoolId: SCHOOL.id, subjectId: SUBJECTS[0].id, statement: q.statement,
      answerKey: '', expectedDifficulty: q.expected_difficulty,
      expectedTimeSeconds: q.expected_time_seconds, questionType: 'multiple_choice',
      createdBy: TEACHERS[0].id,
    });
    questions.push({ id, subjectId: SUBJECTS[0].id, ...q });
  });
  QUESTIONS_LP.forEach((q, i) => {
    const id = uuid();
    queries.questions.create({
      id, schoolId: SCHOOL.id, subjectId: SUBJECTS[1].id, statement: q.statement,
      answerKey: '', expectedDifficulty: q.expected_difficulty,
      expectedTimeSeconds: q.expected_time_seconds, questionType: 'multiple_choice',
      createdBy: TEACHERS[1].id,
    });
    questions.push({ id, subjectId: SUBJECTS[1].id, ...q });
  });
  console.log(`${questions.length} questões criadas.`);

  // Listas: 12 por turma, alternando matéria, para ter janelas 3/5/10
  const assignments = [];
  CLASSES.forEach(c => {
    for (let i = 1; i <= 12; i++) {
      const subject = i % 2 === 1 ? SUBJECTS[0] : SUBJECTS[1];
      const assignmentId = uuid();
      const title = `Lista ${i} — ${subject.name}`;
      queries.assignments.create({
        id: assignmentId, title, subjectId: subject.id, classId: c.id,
        createdBy: TEACHERS[c === CLASSES[0] ? 0 : 1].id, status: 'published', dueDate: null,
      });
      // Escolhe 5 questões da matéria
      const pool = questions.filter(q => q.subjectId === subject.id);
      const selected = [];
      while (selected.length < 5 && selected.length < pool.length) {
        const q = pick(pool);
        if (!selected.includes(q.id)) selected.push(q.id);
      }
      selected.forEach((qid, idx) => {
        queries.assignments.linkQuestion({ assignmentId, questionId: qid, itemOrder: idx });
      });
      assignments.push({ id: assignmentId, classId: c.id, subjectId: subject.id, questionIds: selected });
    }
  });
  console.log(`${assignments.length} listas criadas.`);

  // Submissões
  // Cada estudante responde listas da sua turma com desempenho variado
  STUDENTS.forEach((s, idx) => {
    const classId = CLASSES[s.turma].id;
    const classAssignments = assignments.filter(a => a.classId === classId);
    // Habilidade do estudante: entre 0.3 e 0.85
    const skill = 0.35 + Math.random() * 0.5;
    classAssignments.forEach((a, aIdx) => {
      // Simula evolução: turma A melhora ao longo do tempo, turma B estagnada
      const trend = s.turma === 0 ? aIdx * 0.01 : -aIdx * 0.005;
      a.questionIds.forEach(qid => {
        const q = questions.find(x => x.id === qid);
        const resp = simulateResponse(q.expected_difficulty, skill + trend);
        queries.submissions.upsert({
          id: uuid(), studentId: s.id, questionId: qid, assignmentId: a.id,
          completionStatus: resp.completionStatus,
          isCorrect: resp.isCorrect,
          errorCategory: resp.errorCategory,
          perceivedDifficulty: resp.perceivedDifficulty,
          timeSpentSeconds: resp.timeSpentSeconds,
        });
      });
    });
  });
  console.log('Submissões geradas.');

  // Contagens
  const counts = {
    schools: get('SELECT COUNT(*) AS n FROM schools').n,
    users: get('SELECT COUNT(*) AS n FROM users').n,
    classes: get('SELECT COUNT(*) AS n FROM classes').n,
    assignments: get('SELECT COUNT(*) AS n FROM assignments').n,
    questions: get('SELECT COUNT(*) AS n FROM questions').n,
    submissions: get('SELECT COUNT(*) AS n FROM submissions').n,
  };
  console.log('\nSeed concluído:');
  console.log(counts);
}

main();
