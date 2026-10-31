import { DB } from '../../db.js';
import { uuid, formatarData, formatarDataHora, toast, confirm2, sanitize } from '../../utils.js';
import { Auth } from '../../auth.js';
import { renderShell } from '../shared/shell.js';

const navItems = [
  { icon: 'layout-dashboard', label: 'Dashboard', href: '/professor' },
  { section: 'Minhas turmas' },
  { icon: 'users', label: 'Turmas', href: '/professor/turmas' },
  { separator: true },
  { section: 'Conteúdo' },
  { icon: 'file-question', label: 'Banco de Questões', href: '/professor/questoes' },
  { icon: 'clipboard-list', label: 'Listas', href: '/professor/listas', active: true },
  { separator: true },
  { section: 'Análise' },
  { icon: 'bar-chart-2', label: 'Relatórios por Turma', href: '/professor/relatorios' },
  { icon: 'user', label: 'Relatório por Aluno', href: '/professor/relatorio-aluno' },
];

function statusBadge(status) {
  if (status === 'publicada') return `<span class="badge badge-success">Publicada</span>`;
  if (status === 'encerrada') return `<span class="badge badge-danger">Encerrada</span>`;
  return `<span class="badge" style="background:#6b7280;color:#fff">Rascunho</span>`;
}

function buildModal(turmas, questoes, lista = null) {
  const isEdit = !!lista;
  const turmaChecks = turmas.map(t => `
    <label style="display:flex;align-items:center;gap:8px;margin-bottom:6px;cursor:pointer">
      <input type="checkbox" name="turmaIds" value="${t.id}" ${lista && lista.turmaIds && lista.turmaIds.includes(t.id) ? 'checked' : ''}>
      ${sanitize(t.nome)} <small style="color:#888">(${sanitize(t.serie)})</small>
    </label>`).join('');

  const questaoChecks = questoes.map(q => {
    const enunciado = sanitize(q.enunciado || '').substring(0, 80) + (q.enunciado && q.enunciado.length > 80 ? '…' : '');
    return `
    <label style="display:flex;align-items:flex-start;gap:8px;margin-bottom:6px;cursor:pointer">
      <input type="checkbox" name="questaoIds" value="${q.id}" style="margin-top:3px" ${lista && lista.questaoIds && lista.questaoIds.includes(q.id) ? 'checked' : ''}>
      <span><strong>${sanitize(q.disciplina || '')}</strong> — ${enunciado}</span>
    </label>`;
  }).join('');

  const dataInicioVal = lista && lista.dataInicio ? lista.dataInicio.substring(0, 16) : '';
  const dataFimVal = lista && lista.dataFim ? lista.dataFim.substring(0, 16) : '';

  return `
  <div id="modal-overlay" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px">
    <div style="background:#fff;border-radius:12px;padding:32px;max-width:700px;width:100%;max-height:90vh;overflow-y:auto;position:relative">
      <button id="modal-close" style="position:absolute;top:16px;right:16px;background:none;border:none;cursor:pointer;font-size:20px;color:#6b7280">✕</button>
      <h2 style="margin:0 0 24px">${isEdit ? 'Editar Lista' : 'Nova Lista'}</h2>
      <form id="lista-form">
        <div style="margin-bottom:16px">
          <label style="display:block;font-weight:600;margin-bottom:4px">Título *</label>
          <input name="titulo" type="text" class="input" value="${sanitize(lista ? lista.titulo : '')}" required style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px">
        </div>
        <div style="margin-bottom:16px">
          <label style="display:block;font-weight:600;margin-bottom:4px">Descrição</label>
          <textarea name="descricao" rows="3" style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;resize:vertical">${sanitize(lista ? lista.descricao || '' : '')}</textarea>
        </div>
        <div style="margin-bottom:16px">
          <label style="display:block;font-weight:600;margin-bottom:8px">Turmas</label>
          <div style="border:1px solid #d1d5db;border-radius:8px;padding:12px;max-height:150px;overflow-y:auto">
            ${turmaChecks || '<em style="color:#9ca3af">Nenhuma turma disponível</em>'}
          </div>
        </div>
        <div style="margin-bottom:16px">
          <label style="display:block;font-weight:600;margin-bottom:8px">Questões</label>
          <div style="border:1px solid #d1d5db;border-radius:8px;padding:12px;max-height:200px;overflow-y:auto;font-size:13px">
            ${questaoChecks || '<em style="color:#9ca3af">Nenhuma questão disponível</em>'}
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
          <div>
            <label style="display:block;font-weight:600;margin-bottom:4px">Data de Início</label>
            <input name="dataInicio" type="datetime-local" value="${dataInicioVal}" style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px">
          </div>
          <div>
            <label style="display:block;font-weight:600;margin-bottom:4px">Data de Fim</label>
            <input name="dataFim" type="datetime-local" value="${dataFimVal}" style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px">
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px">
          <div>
            <label style="display:block;font-weight:600;margin-bottom:4px">Tempo Limite (minutos)</label>
            <input name="tempoLimite" type="number" min="1" value="${lista && lista.tempoLimite ? lista.tempoLimite : ''}" placeholder="Sem limite" style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px">
          </div>
          <div>
            <label style="display:block;font-weight:600;margin-bottom:4px">Status</label>
            <select name="status" style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px">
              <option value="rascunho" ${!lista || lista.status === 'rascunho' ? 'selected' : ''}>Rascunho</option>
              <option value="publicada" ${lista && lista.status === 'publicada' ? 'selected' : ''}>Publicada</option>
            </select>
          </div>
        </div>
        <div style="display:flex;gap:12px;justify-content:flex-end">
          <button type="button" id="modal-cancel" class="btn">Cancelar</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Salvar Alterações' : 'Criar Lista'}</button>
        </div>
      </form>
    </div>
  </div>`;
}

function renderTabela(listas, turmasMap) {
  if (!listas.length) {
    return `<div style="text-align:center;padding:48px;color:#9ca3af">
      <i data-lucide="clipboard-list" style="width:48px;height:48px;margin-bottom:16px"></i>
      <p>Nenhuma lista criada ainda.</p>
    </div>`;
  }

  const rows = listas.map(l => {
    const turmasNomes = (l.turmaIds || []).map(id => turmasMap[id] ? sanitize(turmasMap[id].nome) : '—').join(', ') || '—';
    const nQuestoes = (l.questaoIds || []).length;
    return `
      <tr>
        <td><strong>${sanitize(l.titulo)}</strong></td>
        <td style="font-size:13px;color:#6b7280">${turmasNomes}</td>
        <td>${l.dataInicio ? formatarData(l.dataInicio) : '—'}</td>
        <td>${l.dataFim ? formatarData(l.dataFim) : '—'}</td>
        <td>${l.tempoLimite ? l.tempoLimite + ' min' : '—'}</td>
        <td style="text-align:center">${nQuestoes}</td>
        <td>${statusBadge(l.status)}</td>
        <td>
          <div style="display:flex;gap:8px">
            <button class="btn btn-sm btn-edit" data-id="${l.id}">
              <i data-lucide="pencil" style="width:14px;height:14px"></i>
            </button>
            <button class="btn btn-sm btn-danger btn-delete" data-id="${l.id}" style="background:#fee2e2;color:#dc2626;border:none">
              <i data-lucide="trash-2" style="width:14px;height:14px"></i>
            </button>
          </div>
        </td>
      </tr>`;
  }).join('');

  return `
    <div class="table-wrap">
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="background:#f9fafb;font-size:12px;text-transform:uppercase;color:#6b7280">
            <th style="padding:12px 16px;text-align:left">Título</th>
            <th style="padding:12px 16px;text-align:left">Turmas</th>
            <th style="padding:12px 16px;text-align:left">Início</th>
            <th style="padding:12px 16px;text-align:left">Fim</th>
            <th style="padding:12px 16px;text-align:left">Tempo</th>
            <th style="padding:12px 16px;text-align:center">Questões</th>
            <th style="padding:12px 16px;text-align:left">Status</th>
            <th style="padding:12px 16px;text-align:left">Ações</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

export function renderProfessorListas(container, usuario) {
  const minhasTurmas = DB.turmas.todas().filter(t =>
    t.professorIds && t.professorIds.includes(usuario.id)
  );
  const turmasMap = Object.fromEntries(minhasTurmas.map(t => [t.id, t]));
  const minhasQuestoes = DB.questoes.todas().filter(q => q.escolaId === usuario.escolaId);

  function getListas() {
    return DB.listas.todas().filter(l => l.criadoPorId === usuario.id);
  }

  function renderContent() {
    const listas = getListas();
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
        <div>
          <p style="color:#6b7280;margin:0">${listas.length} lista(s) criada(s)</p>
        </div>
        <button id="btn-nova-lista" class="btn btn-primary" style="display:flex;align-items:center;gap:8px">
          <i data-lucide="plus" style="width:16px;height:16px"></i>
          Nova Lista
        </button>
      </div>
      <div class="card" style="padding:0;overflow:hidden">
        ${renderTabela(listas, turmasMap)}
      </div>`;
  }

  renderShell({
    usuario,
    navItems,
    titulo: 'Listas de Exercícios',
    subtitulo: 'Gerencie suas listas e avaliações',
    conteudo: renderContent(),
  });

  window.lucide?.createIcons?.();

  function openModal(lista = null) {
    const modalHtml = buildModal(minhasTurmas, minhasQuestoes, lista);
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    window.lucide?.createIcons?.();

    const overlay = document.getElementById('modal-overlay');
    const closeModal = () => overlay.remove();

    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('modal-cancel').addEventListener('click', closeModal);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });

    document.getElementById('lista-form').addEventListener('submit', e => {
      e.preventDefault();
      const form = e.target;
      const titulo = form.titulo.value.trim();
      if (!titulo) { toast('Informe o título da lista.', 'error'); return; }

      const turmaIds = [...form.querySelectorAll('input[name="turmaIds"]:checked')].map(el => el.value);
      const questaoIds = [...form.querySelectorAll('input[name="questaoIds"]:checked')].map(el => el.value);
      const tempoLimiteVal = form.tempoLimite.value ? parseInt(form.tempoLimite.value) : null;

      const questoesSnapshot = questaoIds.map(qid => {
        const q = DB.questoes.porId(qid);
        return { questaoId: qid, dificuldadeEsperada: q?.dificuldadeEsperada || 0 };
      });

      const payload = {
        id: lista ? lista.id : uuid(),
        titulo,
        descricao: form.descricao.value.trim(),
        turmaIds,
        questaoIds,
        questoesSnapshot,
        dataInicio: form.dataInicio.value || null,
        dataFim: form.dataFim.value || null,
        tempoLimite: tempoLimiteVal,
        status: form.status.value,
        escolaId: usuario.escolaId,
        criadoPorId: usuario.id,
      };

      DB.listas.salvar(payload);
      toast(lista ? 'Lista atualizada!' : 'Lista criada!', 'success');
      closeModal();
      refreshPage();
    });
  }

  function refreshPage() {
    const pageBody = document.querySelector('.page-body');
    if (pageBody) {
      pageBody.innerHTML = renderContent();
      window.lucide?.createIcons?.();
      bindEvents();
    }
  }

  function bindEvents() {
    const btnNova = document.getElementById('btn-nova-lista');
    if (btnNova) btnNova.addEventListener('click', () => openModal());

    document.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const lista = DB.listas.todas().find(l => l.id === btn.dataset.id);
        if (lista) openModal(lista);
      });
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        const lista = DB.listas.todas().find(l => l.id === btn.dataset.id);
        if (!lista) return;
        const ok = await confirm2(`Excluir a lista "${lista.titulo}"? Esta ação não pode ser desfeita.`);
        if (ok) {
          DB.listas.remover(lista.id);
          toast('Lista excluída.', 'info');
          refreshPage();
        }
      });
    });
  }

  bindEvents();
}
