// routes/auth.js — Autenticação simples via JWT
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { queries, get } from '../models/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'edumetrics-dev-secret';
const router = Router();

function hash(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
  }
  const user = await queries.users.byEmail(email);
  if (!user || user.password_hash !== hash(password)) {
    return res.status(401).json({ error: 'Credenciais inválidas.' });
  }
  const token = jwt.sign({ id: user.id, role: user.role, schoolId: user.school_id }, JWT_SECRET, { expiresIn: '8h' });
  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      schoolId: user.school_id,
    },
  });
});

export default router;
