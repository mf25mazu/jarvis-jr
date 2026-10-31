// views/estudante/listas.js — Listas disponíveis para o estudante

import { renderShell } from '../shared/shell.js';
import { DB } from '../../db.js';
import { Router } from '../../router.js';
import { formatarData, formatarTempo } from '../../utils.js';

const navItems = [
  { icon: 'layout-dashboard', label: 'Dashboard', href: '/estudante', active: false },
  { icon: 'clipboard-list', label: 'Minhas Listas', href: '/estudante/listas', active: true },
  { icon: 'bar-chart-2', label: 'Meu Relatório', href: '/estudante/relatorio', active: false },
];

function statusLista(lista, submissao) {
  const agora = new Date();
  const inicio = lista.dataInicio ? new Date(lista.dataInicio) : null;
  const fim = lista.dataFim ? new Date(lista.dataFim) : null;

  if (submissao?.status === 'concluida') {
    return `<span class="badge badge-success">Concluída</span>`;
  }
  if (submissao?.status === 'em_andamento') {
    return `<span class="badge badge-warning">Continuar</span>`;
  }
  if (inicio && agora < inicio) {
    return `<span class="badge badge-gray">Não iniciada</span>`;
  }
  if (fim && agora > fim) {
    return `<span class="badge badge-danger">Encerrada</span>`;
  }
  return `<span class="badge badge-success">Disponível</span>`;
}

function cardLista(lista, submissao) {
  const totalQuestoes = (lista.questaoIds || []).length;
  const respondidas = submissao?.respostas?.length || 0;
  const progresso = totalQuestoes ? Math.round((respondidas / totalQuestoes) * 100) : 0;
  const agora = new Date();
  const inicio = lista.dataInicio ? new Date(lista.dataInicio) : null;
  const fim = lista.dataFim ? new Date(lista.dataFim) : null;

  let acao = '';
  if (submissao?.status === 'concluida') {
    acao = `<button class="btn btn-outline btn-ver-resultado" data-id="${lista.id}">Ver resultado</button>`;
  } else if (submissao?.status === 'em_andamento') {
    acao = `<button class="btn btn-primary btn-continuar" data-id="${lista.id}">Continuar lista</button>`;
  } else if (inicio && agora < inicio) {
    acao = `<button class="btn btn-outline" disabled>Aguarde o início</button>`;
  } else if (fim && agora > fim) {
    acao = `<button class="btn btn-outline" disabled>Encerrada</button>`;
  } else {
    acao = `<button class="btn btn-primary btn-iniciar" data-id="${lista.id}">Iniciar lista</button>`;
  }

  return `
    <div class="card" style="padding:20px;display:flex;flex-direction:column;gap:12px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
        <div>
          <h3 style="font-size:1rem;margin-bottom:4px;">${lista.titulo || 'Lista sem título'}</h3>
          <p style="font-size:.85rem;color:var(--text-2);margin:0;">${lista.descricao || ''}</p>
        </div>
        ${statusLista(lista, submissao)}
      </div>
      <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:.85rem;color:var(--text-2);">
        <span><i data-lucide="calendar" style="width:14px;height:14px;vertical-align:text-bottom;"></i> Início: ${formatarData(lista.dataInicio)}</span>
        <span><i data-lucide="clock" style="width:14px;height:14px;vertical-align:text-bottom;"></i> Fim: ${formatarData(lista.dataFim)}</span>
        <span><i data-lucide="hourglass" style="width:14px;height:14px;vertical-align:text-bottom;"></i> Limite: ${lista.tempoLimite ? lista.tempoLimite + ' min' : 'Sem limite'}</span>
        <span><i data-lucide="file-question" style="width:14px;height:14px;vertical-align:text-bottom;"></i> ${totalQuestoes} questões</span>
      </div>
      ${submissao ? `
        <div style="margin-top:4px;">
          <div style="display:flex;justify-content:space-between;font-size:.8rem;color:var(--text-2);margin-bottom:4px;">
            <span>Progresso</span>
            <span>${respondidas}/${totalQuestoes}</span>
          </div>
          <div class="progress">
            <div class="progress-fill" style="width:${progresso}%;background:var(--primary);"></div>
          </div>
        </div>
      ` : ''}
      <div style="margin-top:auto;padding-top:8px;">${acao}</div>
    </div>
  `;
}

export function renderEstudanteListas(container, usuario) {
  const turmaIds = usuario.turmaIds || [];
  const listas = DB.listas.todas().filter(l =>
    l.status === 'publicada' && l.turmaIds?.some(tid => turmaIds.includes(tid))
  );

  const cards = listas.map(l => {
    const sub = DB.submissoes.porEstudanteELista(usuario.id, l.id);
    return cardLista(l, sub);
  }).join('');

  const conteudo = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
      <div>
        <h2 style="font-size:1.25rem;margin-bottom:4px;">Minhas Listas</h2>
        <p style="color:var(--text-2);font-size:.9rem;margin:0;">${listas.length} lista(s) disponível(is)</p>
      </div>
    </div>
    ${listas.length === 0 ? `
      <div class="empty-state">
        <i data-lucide="clipboard-list" style="width:40px;height:40px;opacity:.4;"></i>
        <h3>Nenhuma lista disponível</h3>
        <p style="max-width:400px;">Suas turmas ainda não possuem listas publicadas. Volte mais tarde.</p>
      </div>
    ` : `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px;">
        ${cards}
      </div>
    `}
  `;

  renderShell({
    usuario,
    navItems,
    titulo: 'Minhas Listas',
    subtitulo: 'Inicie ou acompanhe suas avaliações',
    conteudo,
  });

  document.querySelectorAll('.btn-iniciar, .btn-continuar').forEach(btn => {
    btn.onclick = () => Router.navigate(`/estudante/responder?listaId=${btn.dataset.id}`);
  });
  document.querySelectorAll('.btn-ver-resultado').forEach(btn => {
    btn.onclick = () => Router.navigate(`/estudante/relatorio?listaId=${btn.dataset.id}`);
  });
}
