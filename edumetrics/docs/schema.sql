-- schema.sql — Modelo relacional do EduMetrics (PostgreSQL)
-- Baseado na seção 7 de requisitos técnicos e modelagem de dados.
-- As tabelas refletem as entidades atuais do sistema e preparam a migração
-- para uma stack React / Next.js + Node.js + PostgreSQL.

-- Extensão para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Escolas
CREATE TABLE schools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Anos / séries escolares (ex: 9º Ano, 1º Ano do Ensino Médio)
CREATE TABLE grade_years (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  level INTEGER CHECK (level > 0), -- ordem opcional para agrupar anos
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Disciplinas
CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Usuários (Escola, Professor, Estudante)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('SCHOOL', 'TEACHER', 'STUDENT')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Turmas / Classes
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  grade_year_id UUID NOT NULL REFERENCES grade_years(id) ON DELETE RESTRICT,
  name VARCHAR(100) NOT NULL, -- ex: "9º A", "9º B"
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Vínculo professor-turma (N:N)
CREATE TABLE class_teachers (
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  PRIMARY KEY (class_id, teacher_id, subject_id)
);

-- Vínculo estudante-turma (N:N, permite histórico)
CREATE TABLE class_students (
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  PRIMARY KEY (class_id, student_id, joined_at)
);

-- Questões
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  statement TEXT NOT NULL,
  answer_key TEXT,
  expected_difficulty INTEGER CHECK (expected_difficulty BETWEEN 1 AND 5),
  expected_time_seconds INTEGER CHECK (expected_time_seconds > 0),
  question_type VARCHAR(50) NOT NULL DEFAULT 'multiple_choice',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Listas / Atividades (Assignments)
CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed')),
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Questões de uma lista (ordem e peso opcional)
CREATE TABLE assignment_questions (
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  item_order INTEGER NOT NULL DEFAULT 0,
  weight INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (assignment_id, question_id)
);

-- Submissões por questão (o frontend atual armazena por lista; o schema relacional segue a granularidade da seção 7)
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  completion_status VARCHAR(20) NOT NULL CHECK (completion_status IN ('FIZ', 'NAO_FIZ')),
  is_correct BOOLEAN,
  error_category VARCHAR(20) CHECK (error_category IN ('TEORIA', 'CONTA', 'INTERPRETACAO', 'ATENCAO')),
  perceived_difficulty INTEGER CHECK (perceived_difficulty BETWEEN 1 AND 5),
  time_spent_seconds INTEGER CHECK (time_spent_seconds >= 0),
  self_reported BOOLEAN NOT NULL DEFAULT TRUE, -- distingue autodeclaração do estudante
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, question_id, assignment_id) -- um estudante submete uma única resposta por questão/lista
);

-- Sessões de resolução de lista (equivalente ao "Submission" atual do frontend, opcional para histórico)
CREATE TABLE assignment_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  score INTEGER,
  total_questions INTEGER NOT NULL
);

-- Índices de performance
CREATE INDEX idx_users_school_role ON users(school_id, role);
CREATE INDEX idx_classes_school_grade ON classes(school_id, grade_year_id);
CREATE INDEX idx_questions_school_subject ON questions(school_id, subject_id);
CREATE INDEX idx_assignments_class ON assignments(class_id);
CREATE INDEX idx_submissions_student ON submissions(student_id);
CREATE INDEX idx_submissions_assignment ON submissions(assignment_id);
CREATE INDEX idx_submissions_created ON submissions(created_at);

-- View/Tabela materializada de métricas móveis por estudante/lista
CREATE OR REPLACE VIEW rolling_window_metrics AS
WITH ranked AS (
  SELECT
    s.student_id,
    s.assignment_id,
    a.class_id,
    a.subject_id,
    s.created_at,
    ROW_NUMBER() OVER (PARTITION BY s.student_id ORDER BY s.created_at) AS rn
  FROM submissions s
  JOIN assignments a ON a.id = s.assignment_id
),
windowed AS (
  SELECT
    r.student_id,
    r.assignment_id,
    r.class_id,
    r.subject_id,
    r.rn,
    AVG(CASE WHEN s.completion_status = 'FIZ' THEN 1 ELSE 0 END) OVER w AS acerto_rate,
    AVG(CASE WHEN s.completion_status = 'NAO_FIZ' THEN 1 ELSE 0 END) OVER w AS nao_fiz_rate,
    AVG(CASE WHEN s.perceived_difficulty IS NOT NULL THEN s.perceived_difficulty END) OVER w AS avg_perceived_difficulty
  FROM ranked r
  JOIN submissions s ON s.student_id = r.student_id AND s.created_at <= r.created_at
  WINDOW w AS (PARTITION BY r.student_id ORDER BY r.created_at ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)
)
SELECT
  student_id,
  assignment_id,
  class_id,
  subject_id,
  rn,
  ROUND(acerto_rate * 100, 2) AS acerto_rate_pct,
  ROUND(nao_fiz_rate * 100, 2) AS nao_fiz_rate_pct,
  avg_perceived_difficulty,
  CASE
    WHEN rn >= 3 THEN 'J3'
    WHEN rn >= 5 THEN 'J5'
    WHEN rn >= 10 THEN 'J10'
  END AS window_label
FROM windowed;

-- Materialized view para consultas rápidas no dashboard (atualizar via cron/job)
CREATE MATERIALIZED VIEW rolling_window_metrics_materialized AS
SELECT * FROM rolling_window_metrics;

CREATE UNIQUE INDEX idx_rwm_materialized ON rolling_window_metrics_materialized(student_id, assignment_id, rn);
