// views/escola/dashboard.js — Dashboard principal da Escola

import { renderShell } from '../shared/shell.js';
import { DB } from '../../db.js';
import { Router } from '../../router.js';
import { formatarData } from '../../utils.js';

function getNavItems(rota) {
  return [
    { icon: 'layout-dashboard', label: 'Dashboard',        href: '/escola',             active: rota === '/escola' },
    { section: 'Gestão' },
    { icon: 'users',            label: 'Professores',      href: '/escola/professores', active: rota === '/escola/professores' },
    { icon: 'book-open',        label: 'Turmas',           href: '/escola/turmas',      active: rota === '/escola/turmas' },
    { icon: 'graduation-cap',   label: 'Estudantes',       href: '/escola/estudantes',  active: rota === '/escola/estudantes' },
    { separator: true },
    { section: 'Conteúdo' },
    { icon: 'file-question',    label: 'Banco de Questões',href: '/escola/questoes',    active: rota === '/escola/questoes' },
    { icon: 'clipboard-list',   label: 'Listas',           href: '/escola/listas',      active: rota === '/escola/listas' },
    { separator: true },
    { section: 'Análise' },
    { icon: 'bar-chart-2',      label: 'Relatórios',       href: '/escola/relatorios',  active: rota === '/escola/relatorios' },
  ];
}

export function renderEscolaDashboard(container, usuario) {
  const rota = '/escola';
  const escolaId = usuario.escolaId;

  const turmas      = DB.turmas.porEscola(escolaId);
  const professores = DB.usuarios.porEscola(escolaId, 'professor');
  const estudantes  = DB.usuarios.porEscola(escolaId, 'estudante');
  const listas      = DB.listas.porEscola(escolaId);
  const listasAtivas = listas.filter(l => l.status === 'publicada');

  const statsCards = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon"><i data-lucide="users" style="width:22px;height:22px;"></i></div>
        <div class="stat-info">
          <div class="stat-value">${professores.length}</div>
          <div class="stat-label">Professores</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon"><i data-lucide="book-open" style="width:22px;height:22px;"></i></div>
        <div class="stat-info">
          <div class="stat-value">${turmas.length}</div>
          <div class="stat-label">Turmas</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon"><i data-lucide="graduation-cap" style="width:22px;height:22px;"></i></div>
        <div class="stat-info">
          <div class="stat-value">${estudantes.length}</div>
          <div class="stat-label">Estudantes</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon"><i data-lucide="clipboard-list" style="width:22px;height:22px;"></i></div>
        <div class="stat-info">
          <div class="stat-value">${listasAtivas.length}</div>
          <div class="stat-label">Listas Ativas</div>
        </div>
      </div>
    </div>
  `;

  const turmasRows = turmas.map(t => {
    const nProfs    = (t.professorIds || []).length;
    const nAlunos   = (t.estudanteIds || []).length;
    const nListas   = listas.filter(l => l.status === 'publicada' && (l.turmaIds || []).includes(t.id)).length;
    return `
      <tr>
        <td>${t.nome}</td>
        <td>${t.serie || '—'}</td>
        <td>${nProfs}</td>
        <td>${nAlunos}</td>
        <td>${nListas}</td>
        <td>
          <button class="btn-sm btn-primary btn-ver-turma" data-id="${t.id}">
            <i data-lucide="eye" style="width:14px;height:14px;"></i> Ver
          </button>
        </td>
      </tr>
    `;
  }).join('');

  const tabelaTurmas = turmas.length === 0
    ? `<div class="empty-state"><i data-lucide="inbox" style="width:32px;height:32px;opacity:.4;"></i><p>Nenhuma turma cadastrada ainda.</p></div>`
    : `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Turma</th>
              <th>Série</th>
              <th>Professores</th>
              <th>Estudantes</th>
              <th>Listas Ativas</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>${turmasRows}</tbody>
        </table>
      </div>
    `;

  const quickActions = `
    <div class="card" style="margin-top:24px;">
      <div class="card-header">
        <h3 class="card-title">Acesso Rápido</h3>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:12px;padding:16px;">
        <button class="btn-primary" id="qaNovaT urma">
          <i data-lucide="plus-circle" style="width:16px;height:16px;"></i> Nova Turma
        </button>
        <button class="btn-secondary" id="qaProf">
          <i data-lucide="user-plus" style="width:16px;height:16px;"></i> Cadastrar Professor
        </button>
        <button class="btn-secondary" id="qaQuestao">
          <i data-lucide="file-plus" style="width:16px;height:16px;"></i> Nova Questão
        </button>
        <button class="btn-secondary" id="qaLista">
          <i data-lucide="clipboard-plus" style="width:16px;height:16px;"></i> Nova Lista
        </button>
        <button class="btn-secondary" id="qaRelatorio">
          <i data-lucide="bar-chart-2" style="width:16px;height:16px;"></i> Ver Relatórios
        </button>
      </div>
    </div>
  `;

  const conteudo = `
    ${statsCards}
    <div class="card" style="margin-top:24px;">
      <div class="card-header">
        <h3 class="card-title">Turmas da Escola</h3>
        <button class="btn-primary btn-sm" id="btnNovaTurmaTable">
          <i data-lucide="plus" style="width:14px;height:14px;"></i> Nova Turma
        </button>
      </div>
      ${tabelaTurmas}
    </div>
    ${quickActions}
  `;

  renderShell({
    usuario,
    navItems: getNavItems(rota),
    titulo: 'Dashboard',
    subtitulo: 'Visão geral da escola',
    conteudo,
  });

  // Botões "Ver" da tabela
  document.querySelectorAll('.btn-ver-turma').forEach(btn => {
    btn.onclick = () => Router.navigate('/escola/turmas');
  });

  // Quick actions
  document.getElementById('qaNovaT urma')?.addEventListener('click', () => Router.navigate('/escola/turmas'));
  document.getElementById('btnNovaTurmaTable')?.addEventListener('click', () => Router.navigate('/escola/turmas'));
  document.getElementById('qaProf')?.addEventListener('click', () => Router.navigate('/escola/professores'));
  document.getElementById('qaQuestao')?.addEventListener('click', () => Router.navigate('/escola/questoes'));
  document.getElementById('qaLista')?.addEventListener('click', () => Router.navigate('/escola/listas'));
  document.getElementById('qaRelatorio')?.addEventListener('click', () => Router.navigate('/escola/relatorios'));
}
