# EduMetrics

Sistema de métricas educacionais com foco em janelas acumuladas, análise de erros metacognitivos, visualização de dados e recomendações objetivas baseadas em regras.

## Arquitetura

```
edumetrics/
├── backend/          # API REST + servidor estático (Node.js + Express + SQLite)
│   ├── src/
│   │   ├── migrations.js      # Schema do banco SQLite
│   │   ├── seed.js            # Dados de exemplo
│   │   ├── server.js          # Ponto de entrada único
│   │   ├── routes/            # Rotas da API
│   │   ├── models/            # Acesso ao banco
│   │   └── middleware/        # Autenticação e RBAC
│   ├── data/                  # Banco SQLite (não versionado)
│   └── package.json
├── frontend/         # SPA HTML/CSS/JS puro
│   ├── index.html
│   ├── css/
│   └── js/
│       ├── api.js             # Cliente HTTP
│       ├── auth.js            # Login (API ou LocalStorage)
│       ├── db.js              # Persistência local (fallback)
│       └── views/
└── docs/             # Documentação do banco e mapeamento
    ├── schema.sql
    └── mapeamento-dados.md
```

## Pré-requisitos

- [Node.js](https://nodejs.org/) 18+ (com npm)
- Navegador moderno

## Instalação local

### 1. Acessar o backend

```bash
cd edumetrics/backend
```

### 2. Instalar dependências

```bash
npm install
```

### 3. Criar o banco e popular com dados de exemplo

```bash
npm run seed
```

O comando cria `backend/data/edumetrics.db` com:
- 1 escola
- 2 professores
- 2 turmas do 9º ano
- 8 estudantes (4 por turma)
- 2 disciplinas (Matemática e Língua Portuguesa)
- 22 questões
- 24 listas (12 por turma)
- Submissões simuladas suficientes para testar janelas 3/5/10, radar e recomendações.

### 4. Iniciar o servidor

```bash
npm start
# ou, para desenvolvimento com recarga automática:
npm run dev
```

O backend ficará disponível em `http://localhost:3000` e servirá o frontend automaticamente.

## Acesso

| Perfil | Email | Senha |
| --- | --- | --- |
| Professor 1 | `ana@edumetrics.local` | `prof123` |
| Professor 2 | `bruno@edumetrics.local` | `prof456` |
| Alunos | `aluno1@edumetrics.local` a `aluno8@edumetrics.local` | `aluno123` |

> **Nota:** O painel de escola (`SCHOOL`) não tem seed de usuário próprio. Em produção, crie um usuário com `role = 'SCHOOL'`.

## Deploy (Railway / Render / um único serviço Node)

O projeto é preparado para rodar como **um único serviço Node.js** que serve tanto a API REST quanto o frontend estático. O banco SQLite deve estar em um **volume persistente** (Railway Volume / Render Disk).

### Variáveis de ambiente obrigatórias

| Variável | Descrição | Exemplo |
| --- | --- | --- |
| `NODE_ENV` | Ambiente de execução | `production` |
| `JWT_SECRET` | Chave secreta para assinar tokens. **Obrigatória em produção.** | `uma-chave-muito-secreta-e-longa` |
| `PORT` | Porta da aplicação | `3000` |
| `DB_PATH` | Caminho absoluto do SQLite no volume persistente | `/data/edumetrics.db` |

### Configuração de plataformas

**Railway**
- Build command: `cd backend && npm install`
- Start command: `cd backend && npm start`
- Volume: monte um volume em `/data` e defina `DB_PATH=/data/edumetrics.db`

**Render**
- Build command: `cd backend && npm install`
- Start command: `cd backend && npm start`
- Disk: crie um Disk, monte em `/data` e defina `DB_PATH=/data/edumetrics.db`

### Seed em produção

Após o primeiro deploy, execute o seed para popular o banco. Na maioria das plataformas, isso é feito via console/SSH ou job one-off:

```bash
cd backend
node src/seed.js
```

> Atenção: o seed apaga todos os dados antes de inserir os novos. Rode apenas uma vez no ambiente de produção.

### Health check

A rota `GET /health` pode ser usada para health checks:

```bash
curl https://seudominio.com/health
```

Resposta esperada:

```json
{ "status": "ok", "env": "production", "timestamp": "..." }
```

### Segurança no deploy

- `JWT_SECRET` é obrigatório em produção; o servidor falha ao iniciar se não estiver definido.
- CORS foi removido: frontend e API compartilham a mesma origem.
- Senhas são hashadas com `bcrypt` (custo 10).
- O SQLite fica fora do versionamento (`.gitignore`); em produção, ele reside em volume persistente.

## Modo offline (frontend standalone)

Caso prefira executar apenas o frontend sem backend, abra o `frontend/index.html` diretamente no navegador ou sirva com um servidor estático qualquer. O sistema usará o LocalStorage como banco de dados. A autenticação do backend será tentada primeiro; se falhar, o login cai no modo LocalStorage.

```bash
cd edumetrics/frontend
python3 -m http.server 8080
# Acesse http://localhost:8080
```

## API REST

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/health` | Health check |
| POST | `/api/auth/login` | Login (retorna JWT) |
| GET | `/api/escola/dashboard` | Dashboard da escola |
| GET | `/api/escola/comparativo` | Comparativo inter-turmas |
| GET | `/api/professor/turmas` | Turmas do professor |
| GET | `/api/professor/turmas/:id/dashboard` | Dashboard da turma |
| GET | `/api/estudante/dashboard` | Dashboard do estudante |
| GET | `/api/estudante/listas` | Listas disponíveis |
| POST | `/api/estudante/submissoes` | Enviar respostas |
| GET | `/api/metricas/estudante/:id` | Janelas acumuladas do aluno |
| GET | `/api/metricas/turma/:id` | Janelas acumuladas da turma |
| GET | `/api/metricas/delta-d/:assignmentId` | ΔD de uma lista |

## Banco de Dados

O schema completo está em `docs/schema.sql` (PostgreSQL) e a versão SQLite aplicada pelo backend está em `backend/src/migrations.js`.

O mapeamento entre as entidades do frontend e as tabelas SQL está documentado em `docs/mapeamento-dados.md`.

## Scripts úteis

```bash
# Resetar banco e popular novamente (local)
npm run reset

# Apenas popular (mantém banco existente)
npm run seed

# Modo desenvolvimento
npm run dev
```

## Segurança

- Senhas são hashadas com `bcrypt`.
- Todas as queries SQL usam prepared statements para evitar injeção.
- `JWT_SECRET` é obrigatório em produção.
- O banco SQLite nunca deve ser commitado (`.gitignore`).
