// middleware/auth.js — Verificação de JWT e RBAC
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'edumetrics-dev-secret';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : header;
  if (!token) return res.status(401).json({ error: 'Token não fornecido.' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido.' });
  }
}

export function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Não autenticado.' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Permissão insuficiente.' });
    }
    next();
  };
}
