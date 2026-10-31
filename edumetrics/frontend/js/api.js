// api.js — Cliente HTTP para o backend EduMetrics
const API_BASE = '';

function getToken() {
  return localStorage.getItem('edm_token') || '';
}

async function request(method, path, body) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
    },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(`${API_BASE}/api${path}`, opts);
  const data = res.headers.get('content-type')?.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

export const API = {
  auth: {
    login: (email, password) => request('POST', '/auth/login', { email, password }),
  },
  escola: {
    dashboard: () => request('GET', '/escola/dashboard'),
    metricasTurma: id => request('GET', `/escola/turmas/${id}/metricas`),
    comparativo: gradeYearId => request('GET', `/escola/comparativo${gradeYearId ? '?gradeYearId=' + gradeYearId : ''}`),
  },
  professor: {
    turmas: () => request('GET', '/professor/turmas'),
    dashboardTurma: id => request('GET', `/professor/turmas/${id}/dashboard`),
    relatorioAluno: (classId, studentId) => request('GET', `/professor/turmas/${classId}/alunos/${studentId}/relatorio`),
  },
  estudante: {
    dashboard: studentId => request('GET', `/estudante/dashboard${studentId ? '?studentId=' + studentId : ''}`),
    listas: studentId => request('GET', `/estudante/listas${studentId ? '?studentId=' + studentId : ''}`),
    lista: id => request('GET', `/estudante/listas/${id}`),
    enviar: (assignmentId, respostas) => request('POST', '/estudante/submissoes', { assignmentId, respostas }),
  },
  metricas: {
    estudante: id => request('GET', `/metricas/estudante/${id}`),
    turma: id => request('GET', `/metricas/turma/${id}`),
    deltaD: assignmentId => request('GET', `/metricas/delta-d/${assignmentId}`),
  },
};

export function setToken(token) {
  localStorage.setItem('edm_token', token);
}

export function clearToken() {
  localStorage.removeItem('edm_token');
}

export function getUser() {
  try { return JSON.parse(localStorage.getItem('edm_user')); }
  catch { return null; }
}

export function setUser(user) {
  localStorage.setItem('edm_user', JSON.stringify(user));
}
