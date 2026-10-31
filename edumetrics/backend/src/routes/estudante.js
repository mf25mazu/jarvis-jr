// routes/estudante.js — Dados e submissões do estudante
import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { queries, get, run, uuid, now } from '../models/index.js';

const router = Router();
router.use(requireAuth);

router.get('/dashboard', async (req, res) => {
  const studentId = req.user.role === 'STUDENT' ? req.user.id : req.query.studentId;
  if (!studentId) return res.status(400).json({ error: 'studentId obrigatório.' });
  const aluno = await queries.users.get(studentId);
  const turmas = await queries.classes.byStudent(studentId);
  const listas = [];
  for (const t of turmas) listas.push(...(await queries.assignments.all(t.id)));
  const submissions = await queries.submissions.byStudent(studentId);
  res.json({ aluno, turmas, listas, submissions });
});

router.get('/listas', async (req, res) => {
  const studentId = req.user.role === 'STUDENT' ? req.user.id : req.query.studentId;
  const turmas = await queries.classes.byStudent(studentId);
  const listas = [];
  for (const t of turmas) listas.push(...(await queries.assignments.all(t.id)));
  res.json(listas);
});

router.get('/listas/:id', async (req, res) => {
  const assignmentId = req.params.id;
  const lista = await queries.assignments.get(assignmentId);
  if (!lista) return res.status(404).json({ error: 'Lista não encontrada.' });
  const questoes = await queries.questions.byAssignment(assignmentId);
  res.json({ lista, questoes });
});

router.post('/submissoes', requireRole(['STUDENT']), async (req, res) => {
  const { assignmentId, respostas } = req.body || {};
  if (!assignmentId || !Array.isArray(respostas)) {
    return res.status(400).json({ error: 'assignmentId e respostas são obrigatórios.' });
  }
  const studentId = req.user.id;
  let acertos = 0;
  for (const r of respostas) {
    const isCorrect = r.tipoConclusao === 'nao_fiz' ? null : r.statusAutodeclarado === 'acerto';
    if (r.tipoConclusao === 'fiz' && isCorrect) acertos++;
    await queries.submissions.upsert({
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
  const total = respostas.length;
  const existing = await get('SELECT id FROM assignment_sessions WHERE student_id = ? AND assignment_id = ?', [studentId, assignmentId]);
  if (existing) {
    await run('UPDATE assignment_sessions SET finished_at = ?, status = ?, score = ?, total_questions = ? WHERE id = ?',
      [now(), 'completed', acertos, total, existing.id]);
  } else {
    await run('INSERT INTO assignment_sessions (id, student_id, assignment_id, finished_at, status, score, total_questions) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [uuid(), studentId, assignmentId, now(), 'completed', acertos, total]);
  }
  res.json({ ok: true, acertos, total });
});

export default router;
