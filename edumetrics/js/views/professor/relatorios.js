// views/professor/relatorios.js — Relatórios por turma com janelas acumuladas e ΔD

import { renderShell } from '../shared/shell.js';
import { DB } from '../../db.js';
import { Router } from '../../router.js';
import { diagnosticarTurma } from '../../ai.js';
import {
  formatarData, formatarTempo, pct, interpretarDeltaD,
  turmaComparavel, calcularDeltaDPercebida
} from '../../utils.js';

function getNavItems(rota) {
  return [
    { icon: 'layout-dashboard', label: 'Dashboard', href: '/professor', active: rota === '/professor' },
    { section: 'Minhas turmas' },
    { icon: 'users', label: 'Turmas', href: '/professor/turmas', active: rota === '/professor/turmas' },
    { separator: true },
    { section: 'Conteúdo' },
    { icon: 'file-question', label: 'Banco de Questões', href: '/professor/questoes', active: rota === '/professor/questoes' },
    { icon: 'clipboard-list', label: 'Listas', href: '/professor/listas', active: rota === '/professor/listas' },
    { separator: true },
    { section: 'Análise' },
    { icon: 'bar-chart-2', label: 'Relatórios por Turma', href: '/professor/relatorios', active: rota === '/professor/relatorios' },
    { icon: 'user', label: 'Relatório por Aluno', href: '/professor/relatorio-aluno', active: rota === '/professor/relatorio-aluno' },
  ];
}

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
          <div style="font-size:.85rem;flex:1;">${e.id === 'falta_teoria' ? 'Falta de Teoria' : e.id === 'erro_conta' ? 'Erro de Conta' : e.id === 'interpretacao' ? 'Interpretação' : 'Falta de Atenção'}</div>
          <div class="progress" style="flex:2;height:8px;">
            <div class="progress-fill" style="width:${e.pct}%;background:var(--warning);"></div>
          </div>
          <div style="font-size:.8rem;font-weight:700;min-width:36px;text-align:right;">${e.pct}%</div>
        </div>
      `).join('')}
    </div>
  `;
}

export function renderProfessorRelatorios(container, usuario, params = {}) {
  const query = params.query || {};
  const turmaIdInicial = query.turmaId || '';

  const minhasTurmas = DB.turmas.porProfessor(usuario.id);
  const turmaSelecionada = turmaIdInicial ? DB.turmas.porId(turmaIdInicial) : minhasTurmas[0];

  function renderContent() {
    const turmasOptions = minhasTurmas.map(t =>
      `<option value="${t.id}" ${t.id === turmaSelecionada?.id ? 'selected' : ''}>${t.nome} (${t.serie})</option>`
    ).join('');

    if (!turmaSelecionada) {
      return `
        <div class="empty-state">
          <i data-lucide="users" style="width:40px;height:40px;opacity:.4;"></i>
          <h3>Nenhuma turma encontrada</h3>
          <p>Você ainda não está vinculado a nenhuma turma.</p>
        </div>
      `;
    }

    const diag = diagnosticarTurma(turmaSelecionada.id);
    const estudantes = DB.usuarios.porTurma(turmaSelecionada.id, 'estudante');

    // Verifica regra de privacidade para comparativos
    let comparavel = false;
    const listaMaisRecente = DB.listas.porTurma(turmaSelecionada.id).sort((a, b) =>
      (b.dataFim || 0) - (a.dataFim || 0)
    )[0];
    if (listaMaisRecente) {
      comparavel = turmaComparavel(listaMaisRecente.id, turmaSelecionada.id, DB);
    }

    const rows = estudantes.map(e => {
      const sub = DB.submissoes.porEstudante(e.id)
        .filter(s => s.status === 'concluida')
        .sort((a, b) => (b.dataFim || 0) - (a.dataFim || 0))[0];
      const mediaAluno = sub ? pct(sub.pontuacao, sub.totalQuestoes) : '—';
      return `
        <tr>
          <td>${e.nome}</td>
          <td>${mediaAluno}%</td>
          <td>${sub ? formatarData(sub.dataFim) : '—'}</td>
          <td>
            <button class="btn btn-sm btn-primary btn-ver-aluno" data-id="${e.id}">
              Ver relatório
            </button>
          </td>
        </tr>
      `;
    }).join('');

    const janelas = diag?.janelas;
    const janelasHtml = janelas
      ? `<div class="grid-3" style="margin-bottom:24px;">
          ${cardJanela(3, janelas[3])}
          ${janelas[5] ? cardJanela(5, janelas[5]) : ''}
          ${janelas[10] ? cardJanela(10, janelas[10]) : ''}
        </div>`
      : '';

    const deltaDGeralHtml = diag?.deltaDGeral !== undefined
      ? `<div class="card" style="padding:16px;margin-bottom:24px;display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
          <div>
            <div style="font-size:.75rem;font-weight:700;text-transform:uppercase;color:var(--text-3);">ΔD geral acumulado da turma</div>
            <div style="font-size:1.5rem;font-weight:800;color:${interpretarDeltaD(diag.deltaDGeral).cor};">
              ${diag.deltaDGeral > 0 ? '+' : ''}${diag.deltaDGeral}
            </div>
            <div style="font-size:.85rem;color:var(--text-2);">${interpretarDeltaD(diag.deltaDGeral).label}</div>
          </div>
         </div>`
      : '';

    return `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:12px;">
        <div>
          <h2 style="font-size:1.25rem;margin-bottom:4px;">Relatório por Turma</h2>
          <p style="color:var(--text-2);font-size:.9rem;margin:0;">${turmaSelecionada.nome} — ${turmaSelecionada.serie}</p>
        </div>
        <select class="form-select" id="selTurma" style="width:auto;min-width:220px;">
          ${turmasOptions}
        </select>
      </div>

      ${!comparavel ? `
        <div class="alert alert-warning" style="margin-bottom:24px;">
          <strong>Dados comparativos ocultos:</strong> a regra de privacidade exige no mínimo 5 estudantes com a lista finalizada para exibir comparativos de turma.
        </div>
      ` : ''}

      ${deltaDGeralHtml}

      <h3 style="font-size:1rem;margin-bottom:12px;">Janelas acumuladas da turma</h3>
      ${janelasHtml || `<p style="color:var(--text-2);">Ainda não há dados suficientes para janelas acumuladas.</p>`}

      <div class="grid-2" style="margin-bottom:24px;margin-top:24px;">
        <div class="card" style="padding:20px;">
          <h3 style="font-size:1rem;margin-bottom:16px;">Resumo da turma</h3>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
            <div style="text-align:center;padding:12px;background:var(--bg);border-radius:8px;">
              <div style="font-size:.75rem;color:var(--text-2);">Estudantes</div>
              <div style="font-size:1.5rem;font-weight:800;">${estudantes.length}</div>
            </div>
            <div style="text-align:center;padding:12px;background:var(--bg);border-radius:8px;">
              <div style="font-size:.75rem;color:var(--text-2);">Média geral</div>
              <div style="font-size:1.5rem;font-weight:800;color:var(--primary);">${diag ? diag.mediaGeral + '%' : '—'}</div>
            </div>
            <div style="text-align:center;padding:12px;background:var(--bg);border-radius:8px;">
              <div style="font-size:.75rem;color:var(--text-2);">Risco médio</div>
              <div style="font-size:1.5rem;font-weight:800;color:${diag && diag.riscoMedio >= 60 ? 'var(--danger)' : 'var(--text)'}">${diag ? diag.riscoMedio : '—'}</div>
            </div>
            <div style="text-align:center;padding:12px;background:var(--bg);border-radius:8px;">
              <div style="font-size:.75rem;color:var(--text-2);">Alto risco</div>
              <div style="font-size:1.5rem;font-weight:800;color:${diag && diag.estudantesAltoRisco > 0 ? 'var(--danger)' : 'var(--success)'}">${diag ? diag.estudantesAltoRisco : 0}</div>
            </div>
          </div>
        </div>
        <div class="card" style="padding:20px;">
          <h3 style="font-size:1rem;margin-bottom:16px;">Evolução dos tipos de erro</h3>
          ${renderEvolucaoErros(janelas || {})}
        </div>
      </div>

      <div class="card" style="padding:0;overflow:hidden;">
        <div class="card-header" style="padding:20px 24px;">
          <h3 class="card-title">Estudantes</h3>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Última média</th>
                <th>Última conclusão</th>
                <th></th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  renderShell({
    usuario,
    navItems: getNavItems('/professor/relatorios'),
    titulo: 'Relatórios por Turma',
    subtitulo: 'Análise acumulada e ΔD',
    conteudo: renderContent(),
  });

  const selTurma = document.getElementById('selTurma');
  if (selTurma) {
    selTurma.onchange = e => {
      Router.navigate(`/professor/relatorios?turmaId=${e.target.value}`);
    };
  }

  document.querySelectorAll('.btn-ver-aluno').forEach(btn => {
    btn.onclick = () => Router.navigate(`/professor/relatorio-aluno?turmaId=${turmaSelecionada.id}&alunoId=${btn.dataset.id}`);
  });
}
