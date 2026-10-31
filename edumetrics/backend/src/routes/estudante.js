// routes/estudante.js — Dados e submissões do estudante
import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { queries, all, get, uuid, now } from '../models/index.js';

const router = Router();
router.use(requireAuth);

router.get('/dashboard', (req, res) => {
  const studentId = req.user.role === 'STUDENT' ? req.user.id : req.query.studentId;
  if (!studentId) return res.status(400).json({ error: 'studentId obrigatório.' });
  const aluno = queries.users.get(studentId);
  const turmas = queries.classes.byStudent(studentId);
  const listas = turmas.flatMap(t => queries.assignments.all(t.id));
  const submissions = queries.submissions.byStudent(studentId);
  res.json({ aluno, turmas, listas, submissions });
});

router.get('/listas', (req, res) => {
  const studentId = req.user.role === 'STUDENT' ? req.user.id : req.query.studentId;
  const turmas = queries.classes.byStudent(studentId);
  const listas = turmas.flatMap(t => queries.assignments.all(t.id));
  res.json(listas);
});

router.get('/listas/:id', (req, res) => {
  const assignmentId = req.params.id;
  const lista = queries.assignments.get(assignmentId);
  if (!lista) return res.status(404).json({ error: 'Lista não encontrada.' });
  const questoes = queries.questions.byAssignment(assignmentId);
  res.json({ lista, questoes });
});

router.post('/submissoes', requireRole(['STUDENT']), (req, res) => {
  const { assignmentId, respostas } = req.body || {};
  if (!assignmentId || !Array.isArray(respostas)) {
    return res.status(400).json({ error: 'assignmentId e respostas são obrigatórios.' });
  }
  const studentId = req.user.id;
  let acertos = 0;
  for (const r of respostas) {
    const isCorrect = r.tipoConclusao === 'nao_fiz' ? null : r.statusAutodeclarado === 'acerto';
    if (r.tipoConclusao === 'fiz' && isCorrect) acertos++;
    queries.submissions.upsert({
      id: uuid(),
      studentId,
      questionId: r.questaoId,
      assignmentId,
      completionStatus: r.tipoConclusao === 'nao_fiz' ? 'NAO_FIZ' : 'FIZ',
      isCorrect,
      errorCategory: r.categoriaErro ? r.categoriaErro.toUpperCase() : null,
      perceivedDifficulty: r.dificuldadePercebida,
      timeSpentSeconds: r.tempoResposta,
    });
  }
  // Atualiza sessão da lista
  const total = respostas.length;
  const existing = get('SELECT id FROM assignment_sessions WHERE student_id = ? AND assignment_id = ?', [studentId, assignmentId]);
  if (existing) {
    all('UPDATE assignment_sessions SET finished_at = ?, status = ?, score = ?, total_questions = ? WHERE id = ?',
      [now(), 'completed', acertos, total, existing.id]);
  } else {
    all('INSERT INTO assignment_sessions (id, student_id, assignment_id, finished_at, status, score, total_questions) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [uuid(), studentId, assignmentId, now(), 'completed', acertos, total]);
  }
  res.json({ ok: true, acertos, total });
});

export default router;
