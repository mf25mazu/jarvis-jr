// views/professor/dashboard.js — Dashboard do Professor com ΔD, evolução de erros e risco

import { DB } from '../../db.js';
import { Router } from '../../router.js';
import { renderShell } from '../shared/shell.js';
import { Charts } from '../../charts.js';
import { diagnosticarTurma, diagnosticarEstudante } from '../../ai.js';
import {
  formatarData, pct, media,
  evolucaoTiposErro, calcularDeltaDPercebida, ritmoAprendizagem, labelCategoriaErro
} from '../../utils.js';

const JANELAS = [
  { id: 1, label: 'Lista Atual' },
  { id: 3, label: 'Últimas 3' },
  { id: 5, label: 'Últimas 5' },
  { id: 10, label: 'Últimas 10' },
];

const navItems = [
  { icon: 'layout-dashboard', label: 'Dashboard', href: '/professor', active: true },
  { section: 'Minhas turmas' },
  { icon: 'users', label: 'Turmas', href: '/professor/turmas' },
  { separator: true },
  { section: 'Conteúdo' },
  { icon: 'file-question', label: 'Banco de Questões', href: '/professor/questoes' },
  { icon: 'clipboard-list', label: 'Listas', href: '/professor/listas' },
  { separator: true },
  { section: 'Análise' },
  { icon: 'bar-chart-2', label: 'Relatórios por Turma', href: '/professor/relatorios' },
  { icon: 'user', label: 'Relatório por Aluno', href: '/professor/relatorio-aluno' },
];

function obterSubmissoesTurma(turmaId, janela) {
  const estudantes = DB.usuarios.porTurma(turmaId, 'estudante');
  const todas = estudantes.flatMap(e =>
    DB.submissoes.porEstudante(e.id).filter(s => s.status === 'concluida')
  ).sort((a, b) => a.dataFim - b.dataFim);
  const unicas = [];
  const visto = new Set();
  for (const s of [...todas].reverse()) {
    if (!visto.has(s.listaId)) {
      visto.add(s.listaId);
      unicas.unshift(s);
    }
  }
  if (janela === 1) return unicas.slice(-1);
  return unicas.slice(-janela);
}

function dadosMatrizDeltaD(submissoes) {
  return submissoes.map(s => {
    const lista = DB.listas.porId(s.listaId);
    return {
      x: lista ? media((lista.questoesSnapshot || []).map(q => q.dificuldadeEsperada || 0)) || 0 : 0,
      y: s.dificuldadePercebidaMedia || 0,
      deltaD: calcularDeltaDPercebida(DB, s, lista),
      lista: lista?.titulo || 'Lista',
    };
  }).filter(p => p.x > 0 && p.y > 0);
}

function evolucaoErrosTurma(turmaId, janela) {
  const estudantes = DB.usuarios.porTurma(turmaId, 'estudante');
  const todas = estudantes.flatMap(e =>
    DB.submissoes.porEstudante(e.id).filter(s => s.status === 'concluida')
  ).sort((a, b) => a.dataFim - b.dataFim);
  const unicas = [];
  const visto = new Set();
  for (const s of [...todas].reverse()) {
    if (!visto.has(s.listaId)) {
      visto.add(s.listaId);
      unicas.unshift(s);
    }
  }
  const slice = janela === 1 ? unicas.slice(-1) : unicas.slice(-janela);
  const labels = slice.map(s => {
    const lista = DB.listas.porId(s.listaId);
    return lista?.titulo?.substring(0, 12) || 'Lista';
  });
  const categorias = ['falta_teoria', 'erro_conta', 'interpretacao', 'falta_atencao'];
  const cores = ['#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444'];
  const datasets = categorias.map((cat, idx) => ({
    label: labelCategoriaErro(cat),
    data: slice.map(s => {
      const resps = s.respostas || [];
      const erros = resps.filter(r => r.tipoConclusao === 'fiz' && r.statusAutodeclarado === 'erro' && r.categoriaErro === cat).length;
      const total = resps.filter(r => r.tipoConclusao === 'fiz').length || 1;
      return Math.round((erros / total) * 100);
    }),
    borderColor: cores[idx],
    backgroundColor: cores[idx] + '33',
    fill: false,
  }));
  return { labels, datasets };
}

export function renderProfessorDashboard(container, usuario) {
  const turmas = DB.turmas.porProfessor(usuario.id);
  let turmaAtual = turmas[0];
  let janelaAtual = 3;

  function renderDashboard() {
    if (!turmaAtual) {
      renderShell({
        usuario,
        navItems,
        titulo: 'Dashboard',
        subtitulo: 'Visão geral das suas turmas',
        conteudo: `
          <div class="empty-state">
            <i data-lucide="users" style="width:48px;height:48px;opacity:.4;"></i>
            <h3>Nenhuma turma vinculada</h3>
            <p>Você ainda não está vinculado a nenhuma turma.</p>
          </div>
        `,
      });
      return;
    }

    const diag = diagnosticarTurma(turmaAtual.id);
    const submissoes = obterSubmissoesTurma(turmaAtual.id, janelaAtual);
    const estudantes = DB.usuarios.porTurma(turmaAtual.id, 'estudante');
    const totalEstudantes = estudantes.length;

    const seletores = `
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:20px;">
        <div>
          <h2 style="font-size:1.25rem;margin-bottom:4px;">Dashboard</h2>
          <p style="color:var(--text-2);font-size:.9rem;margin:0;">${turmaAtual.nome} — ${turmaAtual.serie}</p>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <select class="form-select" id="selTurma" style="width:auto;min-width:180px;">
            ${turmas.map(t => `<option value="${t.id}" ${t.id === turmaAtual.id ? 'selected' : ''}>${t.nome}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="tabs" style="margin-bottom:24px;">
        ${JANELAS.map(j => `
          <button type="button" class="tab ${janelaAtual === j.id ? 'active' : ''}" data-janela="${j.id}">${j.label}</button>
        `).join('')}
      </div>
    `;

    const estudantesRisco = estudantes.map(e => {
      const diagAluno = diagnosticarEstudante(e.id);
      const ritmo = diagAluno ? ritmoAprendizagem(DB.submissoes.porEstudante(e.id).filter(s => s.status === 'concluida'), 3) : null;
      return { estudante: e, diag: diagAluno, ritmo };
    }).filter(d => d.diag && (d.diag.scoreRisco >= 60 || d.ritmo < 0))
      .sort((a, b) => b.diag.scoreRisco - a.diag.scoreRisco);

    const riscoRows = estudantesRisco.map(d => `
      <tr>
        <td>${d.estudante.nome}</td>
        <td>${d.diag.mediaGeral}%</td>
        <td><span class="badge ${d.diag.scoreRisco >= 60 ? 'badge-danger' : 'badge-warning'}">${d.diag.scoreRisco}</span></td>
        <td>${d.ritmo === null ? '—' : `<span style="color:${d.ritmo < 0 ? 'var(--danger)' : 'var(--success)'}">${d.ritmo < 0 ? '' : '+'}${d.ritmo}pp</span>`}</td>
        <td><button class="btn btn-sm btn-primary btn-ver-aluno" data-id="${d.estudante.id}">Ver</button></td>
      </tr>
    `).join('');

    const conteudo = `
      ${seletores}

      <div class="stats-grid" style="margin-bottom:24px;">
        <div class="card" style="padding:20px;text-align:center;">
          <div style="font-size:13px;color:var(--text-muted);margin-bottom:8px;">Estudantes</div>
          <div style="font-size:32px;font-weight:700;color:var(--primary);">${totalEstudantes}</div>
        </div>
        <div class="card" style="padding:20px;text-align:center;">
          <div style="font-size:13px;color:var(--text-muted);margin-bottom:8px;">Média geral</div>
          <div style="font-size:32px;font-weight:700;color:var(--primary);">${diag ? diag.mediaGeral + '%' : '—'}</div>
        </div>
        <div class="card" style="padding:20px;text-align:center;">
          <div style="font-size:13px;color:var(--text-muted);margin-bottom:8px;">Risco médio</div>
          <div style="font-size:32px;font-weight:700;color:${diag && diag.riscoMedio >= 60 ? 'var(--danger)' : 'var(--text)'}">${diag ? diag.riscoMedio : '—'}</div>
        </div>
        <div class="card" style="padding:20px;text-align:center;">
          <div style="font-size:13px;color:var(--text-muted);margin-bottom:8px;">Alto risco</div>
          <div style="font-size:32px;font-weight:700;color:${diag && diag.estudantesAltoRisco > 0 ? 'var(--danger)' : 'var(--success)'}">${diag ? diag.estudantesAltoRisco : 0}</div>
        </div>
      </div>

      <div class="grid-2" style="margin-bottom:24px;">
        <div class="card" style="padding:20px;">
          <h3 style="font-size:1rem;margin-bottom:12px;">Matriz de Descompasso (ΔD)</h3>
          <div class="chart-box" style="height:280px;">
            <canvas id="matrizDeltaD"></canvas>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;justify-content:center;">
            <span class="badge" style="background:#22c55e20;color:#22c55e;">Mais fácil</span>
            <span class="badge" style="background:#f59e0b20;color:#f59e0b;">Alinhado</span>
            <span class="badge" style="background:#ef444420;color:#ef4444;">Mais difícil</span>
          </div>
        </div>
        <div class="card" style="padding:20px;">
          <h3 style="font-size:1rem;margin-bottom:12px;">Evolução de Causa Raiz</h3>
          <div class="chart-box" style="height:280px;">
            <canvas id="evolucaoErros"></canvas>
          </div>
        </div>
      </div>

      <div class="card" style="padding:0;overflow:hidden;margin-bottom:24px;">
        <div class="card-header" style="padding:20px 24px;">
          <h3 class="card-title">Relatório de Risco da Turma</h3>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Aluno</th>
                <th>Média</th>
                <th>Risco</th>
                <th>Ritmo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${estudantesRisco.length ? riscoRows : `<tr><td colspan="5" style="text-align:center;color:var(--text-2);padding:24px;">Nenhum aluno em risco ou com ritmo negativo.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>

      <div class="card" style="padding:0;overflow:hidden;">
        <div class="card-header" style="padding:20px 24px;">
          <h3 class="card-title">Listas recentes</h3>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Título</th>
                <th>Data Fim</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${DB.listas.todas().filter(l => l.criadoPorId === usuario.id).slice(0, 5).map(l => `
                <tr>
                  <td>${l.titulo}</td>
                  <td>${formatarData(l.dataFim)}</td>
                  <td>${l.status === 'publicada' ? '<span class="badge badge-success">Publicada</span>' : '<span class="badge badge-warning">Rascunho</span>'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    renderShell({ usuario, navItems, titulo: 'Dashboard', subtitulo: 'Análise da turma', conteudo });
    bindEventos();
    renderGraficos(submissoes);
  }

  function bindEventos() {
    document.getElementById('selTurma').onchange = e => {
      turmaAtual = DB.turmas.porId(e.target.value);
      renderDashboard();
    };
    document.querySelectorAll('[data-janela]').forEach(btn => {
      btn.onclick = () => {
        janelaAtual = parseInt(btn.dataset.janela, 10);
        renderDashboard();
      };
    });
    document.querySelectorAll('.btn-ver-aluno').forEach(btn => {
      btn.onclick = () => Router.navigate(`/professor/relatorio-aluno?turmaId=${turmaAtual.id}&alunoId=${btn.dataset.id}`);
    });
  }

  function renderGraficos(submissoes) {
    // Matriz ΔD
    const pontos = dadosMatrizDeltaD(submissoes);
    if (pontos.length) {
      // Fallback para scatter simples se annotation plugin não estiver disponível
      Charts.matrizDeltaD({ id: 'matrizDeltaD', pontos, titulo: 'Expectativa vs. Percepção' });
    } else {
      document.getElementById('matrizDeltaD').parentElement.innerHTML =
        '<p style="color:var(--text-2);text-align:center;padding-top:100px;">Dados insuficientes para a matriz ΔD.</p>';
    }

    // Evolução de erros
    const ev = evolucaoErrosTurma(turmaAtual.id, janelaAtual);
    if (ev.datasets.some(d => d.data.some(v => v > 0))) {
      Charts.linha({ id: 'evolucaoErros', labels: ev.labels, datasets: ev.datasets, titulo: 'Tipos de erro ao longo do tempo', yMax: 100 });
    } else {
      document.getElementById('evolucaoErros').parentElement.innerHTML =
        '<p style="color:var(--text-2);text-align:center;padding-top:100px;">Sem erros categorizados no período.</p>';
    }
  }

  renderDashboard();
}
