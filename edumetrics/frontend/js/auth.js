// auth.js — Autenticação e controle de sessão
import { DB } from './db.js';
import { API, setToken, clearToken, setUser } from './api.js';
import { hashSenha } from './utils.js';

const SESS_KEY = 'edm_sessao';

function mapRole(role) {
  return { SCHOOL: 'escola', TEACHER: 'professor', STUDENT: 'estudante' }[role] || role;
}

export const Auth = {
  async login(email, senha) {
    // Tenta backend primeiro
    try {
      const data = await API.auth.login(email, senha);
      if (data.token) {
        setToken(data.token);
        const usuario = {
          id: data.user.id,
          nome: data.user.name,
          email: data.user.email,
          tipo: mapRole(data.user.role),
          escolaId: data.user.schoolId,
          turmaIds: [],
        };
        setUser(usuario);
        sessionStorage.setItem(SESS_KEY, JSON.stringify(usuario));
        return { ok: true, usuario, api: true };
      }
    } catch (e) {
      // fallback para LocalStorage
    }

    const u = DB.usuarios.porEmail(email);
    if (!u) return { ok: false, erro: 'E-mail não encontrado.' };
    if (u.senha !== hashSenha(senha)) return { ok: false, erro: 'Senha incorreta.' };
    sessionStorage.setItem(SESS_KEY, JSON.stringify(u));
    return { ok: true, usuario: u, api: false };
  },

  logout() {
    clearToken();
    sessionStorage.removeItem(SESS_KEY);
    window.location.hash = '#/login';
  },

  sessao() {
    try {
      const s = sessionStorage.getItem(SESS_KEY);
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  },

  atualizar(usuario) {
    sessionStorage.setItem(SESS_KEY, JSON.stringify(usuario));
  },

  requer(tiposPermitidos) {
    const u = this.sessao();
    if (!u) { window.location.hash = '#/login'; return null; }
    if (tiposPermitidos && !tiposPermitidos.includes(u.tipo)) {
      window.location.hash = '#/nao-autorizado';
      return null;
    }
    return u;
  },

  pode(usuario, acao) {
    const perms = {
      escola: ['cadastrarQuestao', 'criarLista', 'verGabarito', 'relatorioTurma', 'gerenciarProfessores', 'gerenciarTurmas', 'gerenciarEstudantes'],
      professor: ['cadastrarQuestao', 'criarLista', 'verGabarito', 'relatorioTurma', 'relatorioAluno'],
      estudante: ['responderLista', 'relatorioIndividual'],
    };
    return perms[usuario?.tipo]?.includes(acao) || false;
  },

  registrar({ nome, email, senha, tipo, escolaId, turmaIds, cnpj }) {
    if (!nome || !email || !senha) return { ok: false, erro: 'Preencha todos os campos obrigatórios.' };
    if (DB.usuarios.porEmail(email)) return { ok: false, erro: 'E-mail já cadastrado.' };

    const { uuid } = window._edm_utils || {};
    const id = typeof uuid === 'function' ? uuid() : 'u-' + Date.now();

    const usuario = {
      id, nome, email: email.toLowerCase(),
      senha: hashSenha(senha),
      tipo, escolaId: escolaId || null,
      turmaIds: turmaIds || [],
      criadoEm: Date.now(),
    };

    if (tipo === 'escola') {
      const eid = 'esc-' + Date.now();
      usuario.escolaId = eid;
      DB.escolas.salvar({ id: eid, nome, cnpj: cnpj || '', userId: id });
    }

    DB.usuarios.salvar(usuario);
    return { ok: true, usuario };
  }
};
