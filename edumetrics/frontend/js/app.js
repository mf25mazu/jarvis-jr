// app.js — Entry point e roteador principal

import { DB } from './db.js';
import { Auth } from './auth.js';
import { Router } from './router.js';
import { uuid, hashSenha } from './utils.js';

// Expor utils globalmente para o DB.seed (que é chamado antes dos módulos)
window._edm_utils = { uuid };

// Seed de dados demo
DB.seed();

// ─── Views (lazy-ish imports) ─────────────────────────────────────────────────
import { renderLogin, renderCadastro } from './views/login.js';

// Escola
import { renderEscolaDashboard  } from './views/escola/dashboard.js';
import { renderEscolaTurmas     } from './views/escola/turmas.js';
import { renderEscolaProfessores} from './views/escola/professores.js';
import { renderEscolaEstudantes } from './views/escola/estudantes.js';
import { renderEscolaQuestoes   } from './views/escola/questoes.js';
import { renderEscolaListas     } from './views/escola/listas.js';
import { renderEscolaRelatorios } from './views/escola/relatorios.js';

// Professor
import { renderProfessorDashboard     } from './views/professor/dashboard.js';
import { renderProfessorTurmas        } from './views/professor/turmas.js';
import { renderProfessorQuestoes      } from './views/professor/questoes.js';
import { renderProfessorListas        } from './views/professor/listas.js';
import { renderProfessorRelatorios    } from './views/professor/relatorios.js';
import { renderProfessorRelatorioAluno} from './views/professor/relatorio-aluno.js';

// Estudante
import { renderEstudanteDashboard } from './views/estudante/dashboard.js';
import { renderEstudanteListas    } from './views/estudante/listas.js';
import { renderEstudanteResponder } from './views/estudante/responder.js';
import { renderEstudanteRelatorio } from './views/estudante/relatorio.js';

const app = document.getElementById('app');

// ─── Guard de autenticação ────────────────────────────────────────────────────
function guard(tipo) {
  const u = Auth.requer(tipo ? [tipo] : null);
  return u;
}

function getU() { return Auth.sessao(); }

// ─── Rotas ────────────────────────────────────────────────────────────────────
Router
  // Auth
  .on('/login',   () => { if (getU()) return redirecionarLogado(); renderLogin(app); })
  .on('/cadastro',() => { renderCadastro(app); })

  // Escola
  .on('/escola',             () => { const u = guard('escola'); if(u) renderEscolaDashboard(app, u); })
  .on('/escola/professores', () => { const u = guard('escola'); if(u) renderEscolaProfessores(app, u); })
  .on('/escola/turmas',      () => { const u = guard('escola'); if(u) renderEscolaTurmas(app, u); })
  .on('/escola/estudantes',  () => { const u = guard('escola'); if(u) renderEscolaEstudantes(app, u); })
  .on('/escola/questoes',    () => { const u = guard('escola'); if(u) renderEscolaQuestoes(app, u); })
  .on('/escola/listas',      () => { const u = guard('escola'); if(u) renderEscolaListas(app, u); })
  .on('/escola/relatorios',  () => { const u = guard('escola'); if(u) renderEscolaRelatorios(app, u); })

  // Professor
  .on('/professor',                () => { const u = guard('professor'); if(u) renderProfessorDashboard(app, u); })
  .on('/professor/turmas',         () => { const u = guard('professor'); if(u) renderProfessorTurmas(app, u); })
  .on('/professor/questoes',       () => { const u = guard('professor'); if(u) renderProfessorQuestoes(app, u); })
  .on('/professor/listas',         () => { const u = guard('professor'); if(u) renderProfessorListas(app, u); })
  .on('/professor/relatorios',     ({ query }) => { const u = guard('professor'); if(u) renderProfessorRelatorios(app, u, query); })
  .on('/professor/relatorio-aluno',({ query }) => { const u = guard('professor'); if(u) renderProfessorRelatorioAluno(app, u, query); })

  // Estudante
  .on('/estudante',          () => { const u = guard('estudante'); if(u) renderEstudanteDashboard(app, u); })
  .on('/estudante/listas',   () => { const u = guard('estudante'); if(u) renderEstudanteListas(app, u); })
  .on('/estudante/responder',({ query }) => { const u = guard('estudante'); if(u) renderEstudanteResponder(app, u, query); })
  .on('/estudante/relatorio',({ query }) => { const u = guard('estudante'); if(u) renderEstudanteRelatorio(app, u, query); })

  // Fallback
  .on('/nao-autorizado', () => {
    app.innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;">
        <div>
          <div style="font-size:4rem;margin-bottom:16px;">🚫</div>
          <h1 style="margin-bottom:8px;">Acesso negado</h1>
          <p style="color:var(--text-2);margin-bottom:24px;">Você não tem permissão para acessar esta página.</p>
          <a href="#/login" class="btn btn-primary">Voltar ao login</a>
        </div>
      </div>`;
  })
  .on('/404', () => {
    app.innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;">
        <div>
          <div style="font-size:4rem;margin-bottom:16px;">🔍</div>
          <h1 style="margin-bottom:8px;">Página não encontrada</h1>
          <p style="color:var(--text-2);margin-bottom:24px;">A página que você procura não existe.</p>
          <a href="#/login" class="btn btn-primary">Início</a>
        </div>
      </div>`;
  });

function redirecionarLogado() {
  const u = Auth.sessao();
  if (!u) return;
  const rotas = { escola: '/escola', professor: '/professor', estudante: '/estudante' };
  Router.navigate(rotas[u.tipo] || '/login');
}

// ─── Iniciar ──────────────────────────────────────────────────────────────────
Router.start();

// Adicionar estilo de animação do toast
const style = document.createElement('style');
style.textContent = `@keyframes slideIn { from { transform: translateX(120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`;
document.head.appendChild(style);
