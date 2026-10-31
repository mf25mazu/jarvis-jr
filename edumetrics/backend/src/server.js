// server.js — Ponto de entrada do backend EduMetrics
import express from 'express';
import path from 'path';
// CORS removido: frontend e API são servidos pelo mesmo domínio/origem.
import { fileURLToPath } from 'url';
import { migrate } from './migrations.js';
import routes from './routes/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET não está definido em produção.');
  process.exit(1);
}

await migrate();

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', env: process.env.NODE_ENV || 'development', timestamp: new Date().toISOString() });
});

// Serve o frontend estático
app.use(express.static(path.resolve(__dirname, '../../frontend')));

app.use('/api', routes);

app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../../frontend/index.html'));
});

app.listen(PORT, () => {
  console.log(`EduMetrics backend rodando em http://localhost:${PORT}`);
});
