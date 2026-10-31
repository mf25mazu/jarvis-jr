// views/escola/professores.js — Gerenciamento de Professores

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

function abrirModalAdicionarProfessor(usuario, onSalvo) {
  const turmas = DB.turmas.porEscola(usuario.escolaId);
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal" style="max-width:480px;">
      <div class="modal-header">
        <h3>Adicionar Professor</h3>
        <button class="modal-close" id="fecharModal">
          <i data-lucide="x" style="width:18px;height:18px;"></i>
        </button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">ID ou E-mail do Professor *</label>
          <input class="form-input" id="inputProfId" type="text" placeholder="ID ou e-mail do usuário professor">
          <div style="font-size:.75rem;color:var(--text-muted);margin-top:4px;">
            Informe o ID ou e-mail de um usuário já cadastrado como professor.
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Vincular às Turmas</label>
          <div style="display:flex;flex-direction:column;gap:6px;max-height:180px;overflow-y:auto;padding:4px 0;">
            ${turmas.length === 0
              ? '<span style="color:var(--text-muted);font-size:.85rem;">Nenhuma turma disponível.</span>'
              : turmas.map(t => `
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                  <input type="checkbox" class="chk-turma" value="${t.id}">
                  ${sanitize(t.nome)} <span style="color:var(--text-muted);font-size:.8rem;">(${sanitize(t.serie || '')})</span>
                </label>
              `).join('')
            }
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" id="cancelarModal">Cancelar</button>
        <button class="btn-primary" id="salvarModal">
          <i data-lucide="user-plus" style="width:14px;height:14px;"></i> Adicionar
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  lucide.createIcons();

  const fechar = () => document.body.removeChild(modal);
  modal.querySelector('#fecharModal').onclick  = fechar;
  modal.querySelector('#cancelarModal').onclick = fechar;
  modal.onclick = e => { if (e.target === modal) fechar(); };

  modal.querySelector('#salvarModal').onclick = () => {
    const idOuEmail = modal.querySelector('#inputProfId').value.trim();
    if (!idOuEmail) { toast('Informe o ID ou e-mail do professor.', 'erro'); return; }

    let prof = DB.usuarios.porId(idOuEmail) || DB.usuarios.porEmail(idOuEmail);
    if (!prof)         { toast('Usuário não encontrado.', 'erro'); return; }
    if (prof.tipo !== 'professor') { toast('Este usuário não é um professor.', 'erro'); return; }

    const turmasSelecionadas = [...modal.querySelectorAll('.chk-turma:checked')].map(c => c.value);

    // Vincular professor à escola
    prof = { ...prof, escolaId: usuario.escolaId };

    // Atualizar turmaIds do professor (union)
    const turmaIdsAtuais = prof.turmaIds || [];
    prof.turmaIds = [...new Set([...turmaIdsAtuais, ...turmasSelecionadas])];
    DB.usuarios.salvar(prof);

    // Atualizar professorIds nas turmas
    turmasSelecionadas.forEach(tid => {
      const turma = DB.turmas.porId(tid);
      if (!turma) return;
      const pIds = turma.professorIds || [];
      if (!pIds.includes(prof.id)) {
        DB.turmas.salvar({ ...turma, professorIds: [...pIds, prof.id] });
      }
    });

    toast('Professor adicionado com sucesso!', 'sucesso');
    fechar();
    onSalvo();
  };
}

function abrirModalGerenciarTurmas(professor, usuario, onSalvo) {
  const todasTurmas = DB.turmas.porEscola(usuario.escolaId);
  const turmasDoProf = professor.turmaIds || [];

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal" style="max-width:480px;">
      <div class="modal-header">
        <h3>Turmas de ${sanitize(professor.nome)}</h3>
        <button class="modal-close" id="fecharModal">
          <i data-lucide="x" style="width:18px;height:18px;"></i>
        </button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Selecionar Turmas</label>
          <div style="display:flex;flex-direction:column;gap:6px;max-height:220px;overflow-y:auto;padding:4px 0;">
            ${todasTurmas.length === 0
              ? '<span style="color:var(--text-muted);font-size:.85rem;">Nenhuma turma cadastrada.</span>'
              : todasTurmas.map(t => `
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                  <input type="checkbox" class="chk-turma-edit" value="${t.id}" ${turmasDoProf.includes(t.id) ? 'checked' : ''}>
                  ${sanitize(t.nome)} <span style="color:var(--text-muted);font-size:.8rem;">(${sanitize(t.serie || '')})</span>
                </label>
              `).join('')
            }
          </div>
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
  lucide.createIcons();

  const fechar = () => document.body.removeChild(modal);
  modal.querySelector('#fecharModal').onclick  = fechar;
  modal.querySelector('#cancelarModal').onclick = fechar;
  modal.onclick = e => { if (e.target === modal) fechar(); };

  modal.querySelector('#salvarModal').onclick = () => {
    const novasTurmas = [...modal.querySelectorAll('.chk-turma-edit:checked')].map(c => c.value);
    const removidas   = todasTurmas.map(t => t.id).filter(id => !novasTurmas.includes(id));

    // Atualizar turmaIds do professor
    DB.usuarios.salvar({ ...professor, turmaIds: novasTurmas });

    // Atualizar professorIds em cada turma
    todasTurmas.forEach(turma => {
      const pIds = turma.professorIds || [];
      if (novasTurmas.includes(turma.id) && !pIds.includes(professor.id)) {
        DB.turmas.salvar({ ...turma, professorIds: [...pIds, professor.id] });
      } else if (removidas.includes(turma.id) && pIds.includes(professor.id)) {
        DB.turmas.salvar({ ...turma, professorIds: pIds.filter(id => id !== professor.id) });
      }
    });

    toast('Turmas atualizadas!', 'sucesso');
    fechar();
    onSalvo();
  };
}

export function renderEscolaProfessores(container, usuario) {
  const rota = '/escola/professores';

  function renderizar() {
    const professores = DB.usuarios.porEscola(usuario.escolaId, 'professor');
    const turmas      = DB.turmas.porEscola(usuario.escolaId);

    const linhas = professores.map(p => {
      const turmasNomes = (p.turmaIds || [])
        .map(id => turmas.find(t => t.id === id)?.nome)
        .filter(Boolean)
        .join(', ') || '—';
      return `
        <tr>
          <td>
            <div style="font-weight:500;">${sanitize(p.nome)}</div>
            <div style="font-size:.8rem;color:var(--text-muted);">${sanitize(p.email)}</div>
          </td>
          <td style="max-width:260px;">${sanitize(turmasNomes)}</td>
          <td style="display:flex;gap:8px;">
            <button class="btn-sm btn-secondary btn-editar-turmas-prof" data-id="${p.id}" title="Gerenciar turmas">
              <i data-lucide="settings" style="width:14px;height:14px;"></i>
            </button>
            <button class="btn-sm btn-danger btn-desvincular-prof" data-id="${p.id}" title="Desvincular professor">
              <i data-lucide="user-minus" style="width:14px;height:14px;"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    const conteudo = `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Professores</h3>
          <button class="btn-primary" id="btnAdicionarProf">
            <i data-lucide="user-plus" style="width:15px;height:15px;"></i> Adicionar Professor
          </button>
        </div>
        ${professores.length === 0 ? `
          <div class="empty-state">
            <i data-lucide="users" style="width:32px;height:32px;opacity:.4;"></i>
            <p>Nenhum professor vinculado à escola ainda.</p>
          </div>
        ` : `
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Professor</th>
                  <th>Turmas</th>
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
      titulo: 'Professores',
      subtitulo: 'Gerencie os professores da escola',
      conteudo,
    });

    document.getElementById('btnAdicionarProf').onclick = () => {
      abrirModalAdicionarProfessor(usuario, renderizar);
    };

    document.querySelectorAll('.btn-editar-turmas-prof').forEach(btn => {
      btn.onclick = () => {
        const prof = DB.usuarios.porId(btn.dataset.id);
        if (prof) abrirModalGerenciarTurmas(prof, usuario, renderizar);
      };
    });

    document.querySelectorAll('.btn-desvincular-prof').forEach(btn => {
      btn.onclick = async () => {
        const ok = await confirm2('Desvincular este professor da escola?');
        if (!ok) return;
        const prof = DB.usuarios.porId(btn.dataset.id);
        if (!prof) return;

        // Remover professor das turmas
        (prof.turmaIds || []).forEach(tid => {
          const turma = DB.turmas.porId(tid);
          if (!turma) return;
          DB.turmas.salvar({
            ...turma,
            professorIds: (turma.professorIds || []).filter(id => id !== prof.id),
          });
        });

        // Limpar escola e turmas do professor
        DB.usuarios.salvar({ ...prof, escolaId: null, turmaIds: [] });
        toast('Professor desvinculado.', 'sucesso');
        renderizar();
      };
    });
  }

  renderizar();
}
