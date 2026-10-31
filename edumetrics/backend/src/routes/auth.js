// routes/auth.js — Autenticação simples via JWT
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { queries, get } from '../models/index.js';

const JWT_SECRET = process.env.JWT_SECRET;
const router = Router();

async function compare(password, hash) {
  return bcrypt.compare(password, hash);
}

router.post('/login', async (req, res) => {
  if (!JWT_SECRET) {
    return res.status(500).json({ error: 'JWT_SECRET não configurado no servidor.' });
  }
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
  }
  const user = await queries.users.byEmail(email);
  if (!user || !(await compare(password, user.password_hash))) {
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
