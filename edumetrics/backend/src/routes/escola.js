// routes/escola.js — Dados para o painel da escola
import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { queries, all, get } from '../models/index.js';

const router = Router();
router.use(requireAuth);
router.use(requireRole(['SCHOOL']));

router.get('/dashboard', (req, res) => {
  const schoolId = req.user.schoolId;
  const escola = queries.schools.get(schoolId);
  const professores = queries.users.bySchoolAndRole(schoolId, 'TEACHER');
  const estudantes = queries.users.bySchoolAndRole(schoolId, 'STUDENT');
  const turmas = queries.classes.all(schoolId);
  const listas = all(`SELECT a.*, s.name AS subject_name FROM assignments a
                      LEFT JOIN subjects s ON s.id = a.subject_id
                      JOIN classes c ON c.id = a.class_id
                      WHERE c.school_id = ? AND a.status = 'published'`, schoolId);
  res.json({ escola, professores, estudantes, turmas, listasAtivas: listas });
});

router.get('/turmas/:id/metricas', (req, res) => {
  const classId = req.params.id;
  const turma = queries.classes.get(classId);
  if (!turma || turma.school_id !== req.user.schoolId) return res.status(404).json({ error: 'Turma não encontrada.' });
  const estudantes = queries.users.byClass(classId, 'STUDENT');
  const listas = queries.assignments.all(classId);
  const submissions = queries.submissions.byClass(classId);
  res.json({ turma, estudantes, listas, submissions });
});

router.get('/comparativo', (req, res) => {
  const schoolId = req.user.schoolId;
  const gradeYearId = req.query.gradeYearId;
  const turmas = gradeYearId
    ? all(`SELECT c.* FROM classes c WHERE c.school_id = ? AND c.grade_year_id = ? ORDER BY c.name`, [schoolId, gradeYearId])
    : queries.classes.all(schoolId);
  const resultado = turmas.map(t => {
    const subs = queries.submissions.byClass(t.id);
    const fiz = subs.filter(s => s.completion_status === 'FIZ');
    const acertos = fiz.filter(s => s.is_correct === true);
    const naoFiz = subs.filter(s => s.completion_status === 'NAO_FIZ');
    const media = fiz.length ? acertos.length / fiz.length : 0;
    const taxaNaoFiz = subs.length ? naoFiz.length / subs.length : 0;
    return {
      id: t.id, nome: t.name, serie: t.grade_year_name,
      mediaAproveitamento: Math.round(media * 100),
      taxaNaoFiz: Math.round(taxaNaoFiz * 100),
      totalSubmissoes: subs.length,
    };
  });
  res.json(resultado);
});

export default router;
