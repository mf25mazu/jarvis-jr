// routes/metricas.js — Métricas agregadas (janelas, ΔD, recomendações)
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { queries, all, get } from '../models/index.js';

const router = Router();
router.use(requireAuth);

function janelas(submissoes) {
  const porData = {};
  submissoes.forEach(s => {
    const key = s.assignment_id;
    porData[key] = porData[key] || { date: s.created_at, fiz: 0, acertos: 0, naoFiz: 0, total: 0, perceived: [] };
    porData[key].total++;
    porData[key].perceived.push(s.perceived_difficulty);
    if (s.completion_status === 'FIZ') {
      porData[key].fiz++;
      if (s.is_correct) porData[key].acertos++;
    } else {
      porData[key].naoFiz++;
    }
  });
  const lista = Object.values(porData).sort((a, b) => new Date(a.date) - new Date(b.date));
  const calc = n => {
    const slice = lista.slice(-n);
    if (!slice.length) return null;
    const total = slice.reduce((a, x) => a + x.total, 0);
    const fiz = slice.reduce((a, x) => a + x.fiz, 0);
    const acertos = slice.reduce((a, x) => a + x.acertos, 0);
    const naoFiz = slice.reduce((a, x) => a + x.naoFiz, 0);
    const perc = total ? Math.round((acertos / total) * 100) : 0;
    const naoFizPerc = total ? Math.round((naoFiz / total) * 100) : 0;
    const avgDiff = slice.flatMap(x => x.perceived.filter(Boolean));
    const deltaD = avgDiff.length ? (avgDiff.reduce((a, b) => a + b, 0) / avgDiff.length) - 3 : 0; // placeholder esperado = 3
    return { n, perc, naoFizPerc, deltaD: Number(deltaD.toFixed(2)) };
  };
  return { 3: calc(3), 5: lista.length >= 5 ? calc(5) : null, 10: lista.length >= 10 ? calc(10) : null };
}

router.get('/estudante/:id', (req, res) => {
  const studentId = req.params.id;
  if (req.user.role === 'STUDENT' && req.user.id !== studentId) {
    return res.status(403).json({ error: 'Acesso negado.' });
  }
  const submissions = queries.submissions.byStudent(studentId);
  res.json({ janelas: janelas(submissions), total: submissions.length });
});

router.get('/turma/:id', (req, res) => {
  const classId = req.params.id;
  const submissions = queries.submissions.byClass(classId);
  res.json({ janelas: janelas(submissions), total: submissions.length });
});

router.get('/delta-d/:assignmentId', (req, res) => {
  const assignmentId = req.params.assignmentId;
  const rows = all(`SELECT q.expected_difficulty, AVG(s.perceived_difficulty) AS avg_perceived
                    FROM submissions s
                    JOIN questions q ON q.id = s.question_id
                    WHERE s.assignment_id = ? AND s.perceived_difficulty IS NOT NULL
                    GROUP BY s.question_id, q.expected_difficulty`, assignmentId);
  const result = rows.map(r => ({
    expected: r.expected_difficulty,
    perceived: Math.round(r.avg_perceived * 10) / 10,
    deltaD: Number((r.avg_perceived - r.expected_difficulty).toFixed(2)),
  }));
  res.json(result);
});

export default router;
