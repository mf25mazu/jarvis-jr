// server.js — Ponto de entrada do backend EduMetrics
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { migrate } from './migrations.js';
import routes from './routes/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

await migrate();

app.use(cors());
app.use(express.json());

// Serve o frontend estático
app.use(express.static(path.resolve(__dirname, '../../frontend')));

app.use('/api', routes);

app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../../frontend/index.html'));
});

app.listen(PORT, () => {
  console.log(`EduMetrics backend rodando em http://localhost:${PORT}`);
});
