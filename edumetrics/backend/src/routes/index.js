// routes/index.js — Agrupa todas as rotas da API
import { Router } from 'express';
import authRoutes from './auth.js';
import escolaRoutes from './escola.js';
import professorRoutes from './professor.js';
import estudanteRoutes from './estudante.js';
import metricasRoutes from './metricas.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/escola', escolaRoutes);
router.use('/professor', professorRoutes);
router.use('/estudante', estudanteRoutes);
router.use('/metricas', metricasRoutes);

export default router;
