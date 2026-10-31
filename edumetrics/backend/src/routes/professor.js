// routes/professor.js — Dados para professores
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { queries } from '../models/index.js';

const router = Router();
router.use(requireAuth);

router.get('/turmas', async (req, res) => {
  if (req.user.role === 'SCHOOL') {
    return res.json(await queries.classes.all(req.user.schoolId));
  }
  res.json(await queries.classes.byTeacher(req.user.id));
});

router.get('/turmas/:id/dashboard', async (req, res) => {
  const classId = req.params.id;
  const turma = await queries.classes.get(classId);
  if (!turma) return res.status(404).json({ error: 'Turma não encontrada.' });
  if (req.user.role !== 'SCHOOL' && turma.school_id !== req.user.schoolId) {
    return res.status(403).json({ error: 'Acesso negado.' });
  }
  const estudantes = await queries.users.byClass(classId, 'STUDENT');
  const listas = await queries.assignments.all(classId);
  const submissions = await queries.submissions.byClass(classId);
  res.json({ turma, estudantes, listas, submissions });
});

router.get('/turmas/:id/alunos/:alunoId/relatorio', async (req, res) => {
  const { id: classId, alunoId } = req.params;
  const turma = await queries.classes.get(classId);
  if (!turma || turma.school_id !== req.user.schoolId) return res.status(404).json({ error: 'Turma não encontrada.' });
  const aluno = await queries.users.get(alunoId);
  if (!aluno || aluno.role !== 'STUDENT') return res.status(404).json({ error: 'Estudante não encontrado.' });
  const submissions = await queries.submissions.byStudent(alunoId);
  res.json({ aluno, turma, submissions });
});

export default router;
