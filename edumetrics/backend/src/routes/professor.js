// routes/professor.js — Dados para professores
import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { queries, all, get } from '../models/index.js';

const router = Router();
router.use(requireAuth);

router.get('/turmas', (req, res) => {
  if (req.user.role === 'SCHOOL') {
    return res.json(queries.classes.all(req.user.schoolId));
  }
  res.json(queries.classes.byTeacher(req.user.id));
});

router.get('/turmas/:id/dashboard', (req, res) => {
  const classId = req.params.id;
  const turma = queries.classes.get(classId);
  if (!turma) return res.status(404).json({ error: 'Turma não encontrada.' });
  if (req.user.role !== 'SCHOOL' && turma.school_id !== req.user.schoolId) {
    return res.status(403).json({ error: 'Acesso negado.' });
  }
  const estudantes = queries.users.byClass(classId, 'STUDENT');
  const listas = queries.assignments.all(classId);
  const submissions = queries.submissions.byClass(classId);
  res.json({ turma, estudantes, listas, submissions });
});

router.get('/turmas/:id/alunos/:alunoId/relatorio', (req, res) => {
  const { id: classId, alunoId } = req.params;
  const turma = queries.classes.get(classId);
  if (!turma || turma.school_id !== req.user.schoolId) return res.status(404).json({ error: 'Turma não encontrada.' });
  const aluno = queries.users.get(alunoId);
  if (!aluno || aluno.role !== 'STUDENT') return res.status(404).json({ error: 'Estudante não encontrado.' });
  const submissions = queries.submissions.byStudent(alunoId);
  res.json({ aluno, turma, submissions });
});

export default router;
