// views/escola/turmas.js — Gerenciamento de Turmas

import { renderShell } from '../shared/shell.js';
import { DB } from '../../db.js';
import { uuid, toast, confirm2, sanitize } from '../../utils.js';

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

function abrirModalTurma(usuario, turmaExistente, onSalvo) {
  const isEdit = !!turmaExistente;
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal" style="max-width:440px;">
      <div class="modal-header">
        <h3>${isEdit ? 'Editar Turma' : 'Nova Turma'}</h3>
        <button class="modal-close" id="fecharModal">
          <i data-lucide="x" style="width:18px;height:18px;"></i>
        </button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Nome da Turma *</label>
          <input class="form-input" id="inputNome" type="text" placeholder="Ex: 9º Ano A" value="${isEdit ? sanitize(turmaExistente.nome) : ''}">
        </div>
        <div class="form-group">
          <label class="form-label">Série *</label>
          <input class="form-input" id="inputSerie" type="text" placeholder="Ex: 9º Ano" value="${isEdit ? sanitize(turmaExistente.serie || '') : ''}">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" id="cancelarModal">Cancelar</button>
        <button class="btn-primary" id="salvarModal">
          <i data-lucide="save" style="width:14px;height:14px;"></i> Salvar
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

  modal.querySelector('#salvarModal').onclick = () => {
    const nome  = modal.querySelector('#inputNome').value.trim();
    const serie = modal.querySelector('#inputSerie').value.trim();
    if (!nome)  { toast('Informe o nome da turma.', 'erro'); return; }
    if (!serie) { toast('Informe a série.', 'erro'); return; }

    const turma = isEdit
      ? { ...turmaExistente, nome, serie }
      : { id: uuid(), nome, serie, escolaId: usuario.escolaId, professorIds: [], estudanteIds: [] };

    DB.turmas.salvar(turma);
    toast(isEdit ? 'Turma atualizada!' : 'Turma criada!', 'sucesso');
    fechar();
    onSalvo();
  };
}

export function renderEscolaTurmas(container, usuario) {
  const rota = '/escola/turmas';

  function renderizar() {
    const turmas      = DB.turmas.porEscola(usuario.escolaId);
    const professores = DB.usuarios.porEscola(usuario.escolaId, 'professor');
    const estudantes  = DB.usuarios.porEscola(usuario.escolaId, 'estudante');
    const listas      = DB.listas.porEscola(usuario.escolaId);

    const linhas = turmas.map(t => {
      const nProfs  = (t.professorIds  || []).length;
      const nAlunos = (t.estudanteIds  || []).length;
      const nListas = listas.filter(l => l.status === 'publicada' && (l.turmaIds || []).includes(t.id)).length;
      return `
        <tr>
          <td>${sanitize(t.nome)}</td>
          <td>${sanitize(t.serie || '—')}</td>
          <td>${nProfs}</td>
          <td>${nAlunos}</td>
          <td>${nListas}</td>
          <td style="display:flex;gap:8px;">
            <button class="btn-sm btn-secondary btn-edit-turma" data-id="${t.id}">
              <i data-lucide="pencil" style="width:14px;height:14px;"></i>
            </button>
            <button class="btn-sm btn-danger btn-del-turma" data-id="${t.id}">
              <i data-lucide="trash-2" style="width:14px;height:14px;"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    const conteudo = `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Turmas</h3>
          <button class="btn-primary" id="btnNovaTurma">
            <i data-lucide="plus" style="width:15px;height:15px;"></i> Nova Turma
          </button>
        </div>
        ${turmas.length === 0 ? `
          <div class="empty-state">
            <i data-lucide="inbox" style="width:32px;height:32px;opacity:.4;"></i>
            <p>Nenhuma turma cadastrada ainda.</p>
          </div>
        ` : `
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Série</th>
                  <th>Professores</th>
                  <th>Estudantes</th>
                  <th>Listas Ativas</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>${linhas}</tbody>
            </table>
          </div>
        `}
      </div>
    `;

    renderShell({
      usuario,
      navItems: getNavItems(rota),
      titulo: 'Turmas',
      subtitulo: 'Gerencie as turmas da escola',
      conteudo,
    });

    document.getElementById('btnNovaTurma').onclick = () => {
      abrirModalTurma(usuario, null, renderizar);
    };

    document.querySelectorAll('.btn-edit-turma').forEach(btn => {
      btn.onclick = () => {
        const turma = DB.turmas.porId(btn.dataset.id);
        if (turma) abrirModalTurma(usuario, turma, renderizar);
      };
    });

    document.querySelectorAll('.btn-del-turma').forEach(btn => {
      btn.onclick = async () => {
        const ok = await confirm2('Excluir esta turma? Esta ação não pode ser desfeita.');
        if (!ok) return;
        DB.turmas.remover(btn.dataset.id);
        toast('Turma removida.', 'sucesso');
        renderizar();
      };
    });
  }

  renderizar();
}
