// views/escola/estudantes.js — Gerenciamento de Estudantes

import { renderShell } from '../shared/shell.js';
import { DB } from '../../db.js';
import { toast, confirm2, sanitize } from '../../utils.js';

function getNavItems(rota) {
  return [
    { icon: 'layout-dashboard', label: 'Dashboard',         href: '/escola',             active: rota === '/escola' },
    { section: 'Gestão' },
    { icon: 'users',            label: 'Professores',       href: '/escola/professores', active: rota === '/escola/professores' },
    { icon: 'book-open',        label: 'Turmas',            href: '/escola/turmas',      active: rota === '/escola/turmas' },
    { icon: 'graduation-cap',   label: 'Estudantes',        href: '/escola/estudantes',  active: rota === '/escola/estudantes' },
    { separator: true },
    { section: 'Conteúdo' },
    { icon: 'file-question',    label: 'Banco de Questões', href: '/escola/questoes',    active: rota === '/escola/questoes' },
    { icon: 'clipboard-list',   label: 'Listas',            href: '/escola/listas',      active: rota === '/escola/listas' },
    { separator: true },
    { section: 'Análise' },
    { icon: 'bar-chart-2',      label: 'Relatórios',        href: '/escola/relatorios',  active: rota === '/escola/relatorios' },
  ];
}

function abrirModalMoverTurma(estudante, turmas, onSalvo) {
  const turmaAtualId = (estudante.turmaIds || [])[0] || '';

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal" style="max-width:440px;">
      <div class="modal-header">
        <h3>Mover ${sanitize(estudante.nome)}</h3>
        <button class="modal-close" id="fecharModal">
          <i data-lucide="x" style="width:18px;height:18px;"></i>
        </button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Selecionar Turma</label>
          <select class="form-select" id="selectTurma">
            <option value="">— Sem turma —</option>
            ${turmas.map(t => `
              <option value="${t.id}" ${t.id === turmaAtualId ? 'selected' : ''}>${sanitize(t.nome)}</option>
            `).join('')}
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" id="cancelarModal">Cancelar</button>
        <button class="btn-primary" id="confirmarMover">
          <i data-lucide="move" style="width:14px;height:14px;"></i> Mover
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  window.lucide?.createIcons?.();

  const fechar = () => document.body.removeChild(modal);
  modal.querySelector('#fecharModal').onclick  = fechar;
  modal.querySelector('#cancelarModal').onclick = fechar;
  modal.onclick = e => { if (e.target === modal) fechar(); };

  modal.querySelector('#confirmarMover').onclick = () => {
    const novaTurmaId = modal.querySelector('#selectTurma').value;

    // Remover estudante da turma atual
    if (turmaAtualId) {
      const turmaAntiga = DB.turmas.porId(turmaAtualId);
      if (turmaAntiga) {
        DB.turmas.salvar({
          ...turmaAntiga,
          estudanteIds: (turmaAntiga.estudanteIds || []).filter(id => id !== estudante.id),
        });
      }
    }

    // Adicionar à nova turma
    if (novaTurmaId) {
      const novaTurma = DB.turmas.porId(novaTurmaId);
      if (novaTurma) {
        const eIds = novaTurma.estudanteIds || [];
        if (!eIds.includes(estudante.id)) {
          DB.turmas.salvar({ ...novaTurma, estudanteIds: [...eIds, estudante.id] });
        }
      }
    }

    // Atualizar turmaIds do estudante
    DB.usuarios.salvar({
      ...estudante,
      turmaIds: novaTurmaId ? [novaTurmaId] : [],
    });

    toast('Estudante movido com sucesso!', 'sucesso');
    fechar();
    onSalvo();
  };
}

export function renderEscolaEstudantes(container, usuario) {
  const rota = '/escola/estudantes';
  let filtroTurmaId = '';

  function renderizar() {
    const turmas     = DB.turmas.porEscola(usuario.escolaId);
    const estudantes = DB.usuarios.porEscola(usuario.escolaId, 'estudante');

    const filtrados = filtroTurmaId
      ? estudantes.filter(e => (e.turmaIds || []).includes(filtroTurmaId))
      : estudantes;

    const linhas = filtrados.map(e => {
      const turmaId = (e.turmaIds || [])[0];
      const turma   = turmas.find(t => t.id === turmaId);
      return `
        <tr>
          <td>
            <div style="font-weight:500;">${sanitize(e.nome)}</div>
          </td>
          <td style="font-size:.85rem;color:var(--text-muted);">${sanitize(e.email)}</td>
          <td>
            ${turma
              ? `<span class="badge badge-info">${sanitize(turma.nome)}</span>`
              : '<span style="color:var(--text-muted);">—</span>'
            }
          </td>
          <td>
            <button class="btn-sm btn-secondary btn-mover-estudante" data-id="${e.id}" title="Mover de turma">
              <i data-lucide="move" style="width:14px;height:14px;"></i> Mover
            </button>
          </td>
        </tr>
      `;
    }).join('');

    const conteudo = `
      <div class="card">
        <div class="card-header" style="flex-wrap:wrap;gap:12px;">
          <h3 class="card-title">Estudantes</h3>
          <div style="display:flex;align-items:center;gap:10px;margin-left:auto;">
            <label style="font-size:.85rem;color:var(--text-muted);">Filtrar por turma:</label>
            <select class="form-select" id="filtroTurma" style="width:auto;min-width:160px;">
              <option value="">Todas as turmas</option>
              ${turmas.map(t => `
                <option value="${t.id}" ${t.id === filtroTurmaId ? 'selected' : ''}>${sanitize(t.nome)}</option>
              `).join('')}
            </select>
          </div>
        </div>
        ${filtrados.length === 0 ? `
          <div class="empty-state">
            <i data-lucide="graduation-cap" style="width:32px;height:32px;opacity:.4;"></i>
            <p>${filtroTurmaId ? 'Nenhum estudante nesta turma.' : 'Nenhum estudante cadastrado.'}</p>
          </div>
        ` : `
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Turma</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>${linhas}</tbody>
            </table>
          </div>
        `}
        <div style="padding:12px 16px;color:var(--text-muted);font-size:.82rem;">
          ${filtrados.length} estudante${filtrados.length !== 1 ? 's' : ''} encontrado${filtrados.length !== 1 ? 's' : ''}.
        </div>
      </div>
    `;

    renderShell({
      usuario,
      navItems: getNavItems(rota),
      titulo: 'Estudantes',
      subtitulo: 'Visualize e gerencie estudantes da escola',
      conteudo,
    });

    document.getElementById('filtroTurma').onchange = e => {
      filtroTurmaId = e.target.value;
      renderizar();
    };

    document.querySelectorAll('.btn-mover-estudante').forEach(btn => {
      btn.onclick = () => {
        const est = DB.usuarios.porId(btn.dataset.id);
        if (est) abrirModalMoverTurma(est, turmas, renderizar);
      };
    });
  }

  renderizar();
}
