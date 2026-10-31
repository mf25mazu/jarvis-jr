// views/estudante/relatorio.js — Relatório individual do estudante com janelas acumuladas

import { renderShell } from '../shared/shell.js';
import { DB } from '../../db.js';
import { Router } from '../../router.js';
import { diagnosticarEstudante } from '../../ai.js';
import {
  formatarData, formatarTempo, stripHtml, labelCategoriaErro,
  calcularDeltaD, interpretarDeltaD
} from '../../utils.js';

const navItems = [
  { icon: 'layout-dashboard', label: 'Dashboard', href: '/estudante', active: false },
  { icon: 'clipboard-list', label: 'Minhas Listas', href: '/estudante/listas', active: false },
  { icon: 'bar-chart-2', label: 'Meu Relatório', href: '/estudante/relatorio', active: true },
];

function cardJanela(n, dados) {
  const ritmo = dados.ritmo;
  const corDelta = interpretarDeltaD(dados.mediaDeltaD).cor;
  return `
    <div class="card" style="padding:16px;">
      <div style="font-size:.75rem;font-weight:700;text-transform:uppercase;color:var(--text-3);margin-bottom:10px;">Últimas ${n} listas</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div style="text-align:center;padding:10px;background:var(--bg);border-radius:8px;">
          <div style="font-size:.7rem;color:var(--text-2);">Média acertos</div>
          <div style="font-size:1.25rem;font-weight:800;color:var(--primary);">${dados.mediaAcertos}%</div>
        </div>
        <div style="text-align:center;padding:10px;background:var(--bg);border-radius:8px;">
          <div style="font-size:.7rem;color:var(--text-2);">Não fiz</div>
          <div style="font-size:1.25rem;font-weight:800;color:${dados.taxaNaoFiz > 20 ? 'var(--danger)' : 'var(--text)'}">${dados.taxaNaoFiz}%</div>
        </div>
        <div style="text-align:center;padding:10px;background:var(--bg);border-radius:8px;">
          <div style="font-size:.7rem;color:var(--text-2);">ΔD médio</div>
          <div style="font-size:1.25rem;font-weight:800;color:${corDelta};">${dados.mediaDeltaD > 0 ? '+' : ''}${dados.mediaDeltaD}</div>
        </div>
        <div style="text-align:center;padding:10px;background:var(--bg);border-radius:8px;">
          <div style="font-size:.7rem;color:var(--text-2);">Ritmo</div>
          <div style="font-size:1.25rem;font-weight:800;color:${ritmo === null ? 'var(--text-3)' : ritmo > 0 ? 'var(--success)' : ritmo < 0 ? 'var(--danger)' : 'var(--text)'}">
            ${ritmo === null ? '—' : (ritmo > 0 ? '+' : '') + ritmo + 'pp'}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderEvolucaoErros(janelas) {
  const ultima = janelas[3]?.evolucaoErros || [];
  if (!ultima.length || ultima.every(e => e.valor === 0)) {
    return '<p style="color:var(--text-2);font-size:.9rem;">Sem erros categorizados nas últimas listas.</p>';
  }
  return `
    <div style="display:flex;flex-direction:column;gap:10px;">
      ${ultima.map(e => `
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="font-size:.85rem;flex:1;">${labelCategoriaErro(e.id)}</div>
          <div class="progress" style="flex:2;height:8px;">
            <div class="progress-fill" style="width:${e.pct}%;background:var(--warning);"></div>
          </div>
          <div style="font-size:.8rem;font-weight:700;min-width:36px;text-align:right;">${e.pct}%</div>
        </div>
      `).join('')}
    </div>
  `;
}

export function renderEstudanteRelatorio(container, usuario, params = {}) {
  const listaId = params.listaId || params.query?.listaId;
  const lista = listaId ? DB.listas.porId(listaId) : null;

  let submissoes = [];
  if (listaId) {
    const sub = DB.submissoes.porEstudanteELista(usuario.id, listaId);
    if (sub) submissoes = [sub];
  } else {
    submissoes = DB.submissoes.porEstudante(usuario.id).filter(s => s.status === 'concluida');
  }

  if (!submissoes.length) {
    renderShell({
      usuario,
      navItems,
      titulo: 'Meu Relatório',
      subtitulo: 'Acompanhe sua evolução',
      conteudo: `
        <div class="empty-state">
          <i data-lucide="bar-chart-2" style="width:40px;height:40px;opacity:.4;"></i>
          <h3>Nenhum dado disponível</h3>
          <p style="max-width:400px;">Você ainda não concluiu nenhuma lista. Responda uma avaliação para visualizar seu relatório.</p>
          <button class="btn btn-primary" id="btnVerListas">Ver minhas listas</button>
        </div>
      `,
    });
    document.getElementById('btnVerListas')?.addEventListener?.('click', () => Router.navigate('/estudante/listas'));
    return;
  }

  // Diagnóstico do estudante com janelas
  const diag = diagnosticarEstudante(usuario.id);

  // Render focado na lista selecionada ou na última concluída
  const sub = submissoes[submissoes.length - 1];
  const listaAtual = lista || DB.listas.porId(sub.listaId);
  const questoes = (listaAtual?.questaoIds || []).map(qid => DB.questoes.porId(qid)).filter(Boolean);

  const finalizadas = sub.respostas.filter(r => r.tipoConclusao === 'fiz');
  const lacunas = sub.respostas.filter(r => r.tipoConclusao === 'nao_fiz');
  const erros = finalizadas.filter(r => r.statusAutodeclarado === 'erro');
  const acertos = finalizadas.filter(r => r.statusAutodeclarado === 'acerto');

  const categorias = {};
  erros.forEach(r => {
    const cat = r.categoriaErro || 'outros';
    categorias[cat] = (categorias[cat] || 0) + 1;
  });

  const corDif = ['#22c55e', '#4ade80', '#f59e0b', '#f97316', '#ef4444'][sub.dificuldadePercebidaMedia - 1] || '#64748b';

  const linhas = questoes.map(q => {
    const r = sub.respostas.find(x => x.questaoId === q.id);
    if (!r) return '';
    const isFiz = r.tipoConclusao === 'fiz';
    const gabarito = q.tipo === 'multipla_escolha'
      ? (q.alternativas.find(a => a.correta)?.id?.toUpperCase() || '—')
      : q.gabaritoReferencia;
    const delta = calcularDeltaD(q.dificuldadeEsperada,
      isFiz ? (r.statusAutodeclarado === 'acerto' ? 100 : 0) : 0);
    return `
      <tr>
        <td style="max-width:240px;">${stripHtml(q.enunciado).substring(0, 70)}…</td>
        <td>${isFiz ? (r.statusAutodeclarado === 'acerto' ? '✅ Acertei' : '⚠️ Errei') : '❌ Não fiz'}</td>
        <td>${gabarito}</td>
        <td>${r.dificuldadePercebida}/5</td>
        <td>
          <span class="badge" style="background:${corDif}20;color:${corDif};">
            ${q.dificuldadeEsperada} → ΔD ${delta > 0 ? '+' : ''}${delta}
          </span>
        </td>
      </tr>
    `;
  }).join('');

  const janelasHtml = diag?.janelas
    ? `<div class="grid-3" style="margin-bottom:24px;">
        ${cardJanela(3, diag.janelas[3])}
        ${diag.janelas[5] ? cardJanela(5, diag.janelas[5]) : ''}
        ${diag.janelas[10] ? cardJanela(10, diag.janelas[10]) : ''}
      </div>`
    : '';

  const deltaDGeralHtml = diag?.deltaDGeral !== undefined
    ? `<div class="card" style="padding:16px;margin-bottom:24px;display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
        <div>
          <div style="font-size:.75rem;font-weight:700;text-transform:uppercase;color:var(--text-3);">ΔD geral acumulado</div>
          <div style="font-size:1.5rem;font-weight:800;color:${interpretarDeltaD(diag.deltaDGeral).cor};">
            ${diag.deltaDGeral > 0 ? '+' : ''}${diag.deltaDGeral}
          </div>
          <div style="font-size:.85rem;color:var(--text-2);">${interpretarDeltaD(diag.deltaDGeral).label}</div>
        </div>
       </div>`
    : '';

  const conteudo = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;flex-wrap:wrap;gap:12px;">
      <div>
        <h2 style="font-size:1.25rem;margin-bottom:4px;">Relatório: ${listaAtual?.titulo || 'Todas as listas'}</h2>
        <p style="color:var(--text-2);font-size:.9rem;margin:0;">Concluída em ${formatarData(sub.dataFim)}</p>
      </div>
      <button class="btn btn-outline" id="btnVoltarListas">Voltar às listas</button>
    </div>

    ${deltaDGeralHtml}

    <h3 style="font-size:1rem;margin-bottom:12px;">Análise por janelas acumuladas</h3>
    ${janelasHtml}

    <div class="stats-grid" style="margin-bottom:24px;margin-top:24px;">
      <div class="card" style="padding:20px;text-align:center;">
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:8px;">Pontuação autodeclarada</div>
        <div style="font-size:32px;font-weight:700;color:var(--primary);">${sub.pontuacao}/${sub.totalQuestoes}</div>
      </div>
      <div class="card" style="padding:20px;text-align:center;">
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:8px;">Tempo total</div>
        <div style="font-size:32px;font-weight:700;color:var(--text);">${formatarTempo(sub.tempoTotal)}</div>
      </div>
      <div class="card" style="padding:20px;text-align:center;">
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:8px;">Dificuldade percebida geral</div>
        <div style="font-size:32px;font-weight:700;color:${corDif};">${sub.dificuldadePercebidaMedia || '—'}/5</div>
      </div>
      <div class="card" style="padding:20px;text-align:center;">
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:8px;">Lacunas conceituais</div>
        <div style="font-size:32px;font-weight:700;color:${lacunas.length ? 'var(--danger)' : 'var(--success)'}">${lacunas.length}</div>
      </div>
    </div>

    <div class="grid-2" style="margin-bottom:24px;">
      <div class="card" style="padding:20px;">
        <h3 style="font-size:1rem;margin-bottom:16px;">Distribuição de acertos e erros</h3>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <span class="badge badge-success">${acertos.length} acertos</span>
          <span class="badge badge-warning">${erros.length} erros</span>
          <span class="badge badge-gray">${lacunas.length} não finalizadas</span>
        </div>
      </div>
      <div class="card" style="padding:20px;">
        <h3 style="font-size:1rem;margin-bottom:16px;">Evolução dos tipos de erro</h3>
        ${renderEvolucaoErros(diag?.janelas || {})}
      </div>
    </div>

    <div class="card" style="padding:0;overflow:hidden;">
      <div class="card-header" style="padding:20px 24px;">
        <h3 class="card-title">Questões respondidas</h3>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Enunciado</th>
              <th>Declaração</th>
              <th>Gabarito</th>
              <th>Dif. percebida</th>
              <th>ΔD</th>
            </tr>
          </thead>
          <tbody>${linhas}</tbody>
        </table>
      </div>
    </div>
  `;

  renderShell({
    usuario,
    navItems: navItems.map(n => ({ ...n, active: n.href === '/estudante/relatorio' })),
    titulo: 'Meu Relatório',
    subtitulo: 'Autoavaliação e metacognição',
    conteudo,
  });

  document.getElementById('btnVoltarListas').onclick = () => Router.navigate('/estudante/listas');
}
