// views/estudante/dashboard.js — Dashboard do estudante com janelas acumuladas e gráficos

import { DB } from '../../db.js';
import { Router } from '../../router.js';
import { renderShell } from '../shared/shell.js';
import { Charts } from '../../charts.js';
import { diagnosticarEstudante } from '../../ai.js';
import {
  formatarData, formatarTempo, stripHtml, pct, media, desvio,
  labelCategoriaErro, turmaComparavel, ritmoAprendizagem
} from '../../utils.js';

const navItems = [
  { icon: 'layout-dashboard', label: 'Dashboard', href: '/estudante', active: true },
  { icon: 'clipboard-list', label: 'Minhas Listas', href: '/estudante/listas' },
  { icon: 'bar-chart-2', label: 'Meu Relatório', href: '/estudante/relatorio' },
];

const JANELAS = [
  { id: 1, label: 'Lista Atual' },
  { id: 3, label: 'Últimas 3' },
  { id: 5, label: 'Últimas 5' },
  { id: 10, label: 'Últimas 10' },
];

function getListasParaEstudante(usuario) {
  const turmas = DB.turmas.todas().filter(t => t.estudanteIds?.includes(usuario.id));
  const listaSet = new Map();
  for (const turma of turmas) {
    const listas = DB.listas.porTurma(turma.id) || [];
    for (const lista of listas) {
      if (!listaSet.has(lista.id)) listaSet.set(lista.id, lista);
    }
  }
  return Array.from(listaSet.values()).filter(l => l.status === 'publicada');
}

function getStatusLista(lista, submissao) {
  if (submissao) return 'respondida';
  if (Date.now() > new Date(lista.dataFim).getTime()) return 'encerrada';
  if (Date.now() < new Date(lista.dataInicio).getTime()) return 'encerrada';
  return 'disponivel';
}

function obterSubmissoesJanela(usuario, janela) {
  const todas = DB.submissoes.porEstudante(usuario.id)
    .filter(s => s.status === 'concluida')
    .sort((a, b) => a.dataFim - b.dataFim);
  if (janela === 1) return todas.slice(-1);
  return todas.slice(-janela);
}

function perfilErros(submissoes) {
  const cats = { falta_teoria: 0, erro_conta: 0, interpretacao: 0, falta_atencao: 0 };
  let totalErros = 0;
  submissoes.forEach(s => {
    (s.respostas || []).forEach(r => {
      if (r.tipoConclusao === 'fiz' && r.statusAutodeclarado === 'erro' && r.categoriaErro) {
        cats[r.categoriaErro]++;
        totalErros++;
      }
    });
  });
  return Object.entries(cats).map(([k, v]) => ({
    id: k,
    label: labelCategoriaErro(k),
    pct: totalErros ? Math.round((v / totalErros) * 100) : 0,
  }));
}

function perfilErrosTurma(turmaId, submissoesAluno) {
  const estudantes = DB.usuarios.porTurma(turmaId, 'estudante');
  const listaIds = new Set(submissoesAluno.map(s => s.listaId));
  const cats = { falta_teoria: 0, erro_conta: 0, interpretacao: 0, falta_atencao: 0 };
  let totalErros = 0;
  estudantes.forEach(e => {
    DB.submissoes.porEstudante(e.id)
      .filter(s => s.status === 'concluida' && listaIds.has(s.listaId))
      .forEach(s => {
        (s.respostas || []).forEach(r => {
          if (r.tipoConclusao === 'fiz' && r.statusAutodeclarado === 'erro' && r.categoriaErro) {
            cats[r.categoriaErro]++;
            totalErros++;
          }
        });
      });
  });
  return Object.entries(cats).map(([k, v]) => ({
    id: k,
    pct: totalErros ? Math.round((v / totalErros) * 100) : 0,
  }));
}

function notasPorLista(submissoes, listasMap) {
  return submissoes.map(s => {
    const lista = listasMap[s.listaId] || DB.listas.porId(s.listaId);
    return {
      listaId: s.listaId,
      titulo: lista?.titulo?.substring(0, 20) || 'Lista',
      nota: pct(s.pontuacao, s.totalQuestoes),
    };
  });
}

function notasTurmaPorLista(turmaId, submissoesAluno) {
  const estudantes = DB.usuarios.porTurma(turmaId, 'estudante');
  const listaIds = submissoesAluno.map(s => s.listaId);
  const porLista = {};
  listaIds.forEach(lid => { porLista[lid] = []; });
  estudantes.forEach(e => {
    DB.submissoes.porEstudante(e.id)
      .filter(s => s.status === 'concluida' && porLista[s.listaId])
      .forEach(s => porLista[s.listaId].push(pct(s.pontuacao, s.totalQuestoes)));
  });
  return listaIds.map(lid => ({
    listaId: lid,
    media: porLista[lid].length ? Math.round(media(porLista[lid])) : 0,
  }));
}

function ultimaRespostaInfo(sub) {
  if (!sub?.respostas?.length) return null;
  const ultima = sub.respostas[sub.respostas.length - 1];
  const questao = DB.questoes.porId(ultima.questaoId);
  return { resposta: ultima, questao };
}

function renderCardUltimaResposta(info) {
  if (!info) return '';
  const { resposta, questao } = info;
  const isFiz = resposta.tipoConclusao === 'fiz';
  return `
    <div class="card" style="padding:20px;margin-bottom:24px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        <i data-lucide="check-circle" style="color:var(--primary);"></i>
        <h3 style="font-size:1rem;margin:0;">Sua última resposta</h3>
      </div>
      <p style="color:var(--text-2);font-size:.9rem;margin-bottom:12px;">${stripHtml(questao?.enunciado || '').substring(0, 100)}…</p>
      ${isFiz ? `
        <div style="display:flex;gap:12px;flex-wrap:wrap;">
          <span class="badge ${resposta.statusAutodeclarado === 'acerto' ? 'badge-success' : 'badge-warning'}">
            ${resposta.statusAutodeclarado === 'acerto' ? '✅ Acertei' : '⚠️ Errei'}
          </span>
          <span class="badge badge-info">
            <i data-lucide="clock" style="width:12px;height:12px;"></i> ${formatarTempo(resposta.tempoResposta)}
          </span>
        </div>
      ` : `
        <div class="alert alert-warning" style="margin:0;">
          <strong>Questão não finalizada</strong> — registrada como lacuna conceitual.
        </div>
      `}
    </div>
  `;
}

export function renderEstudanteDashboard(container, usuario) {
  const turmaIds = usuario.turmaIds || [];
  const turmaId = turmaIds[0];
  const todasListas = getListasParaEstudante(usuario);

  let janelaAtual = 3;

  function renderDashboard() {
    const submissoes = obterSubmissoesJanela(usuario, janelaAtual);
    const listasMap = Object.fromEntries(todasListas.map(l => [l.id, l]));
    const diag = diagnosticarEstudante(usuario.id);

    const listasDisponiveis = todasListas.filter(l => {
      const sub = DB.submissoes.porEstudanteELista(usuario.id, l.id);
      return getStatusLista(l, sub) === 'disponivel';
    });
    const listasConcluidas = todasListas.filter(l =>
      DB.submissoes.porEstudanteELista(usuario.id, l.id)?.status === 'concluida'
    );

    const scoreRisco = diag ? diag.scoreRisco : null;
    function scoreRiscoBadge(score) {
      if (score === null) return '<span class="badge">—</span>';
      if (score < 30) return `<span class="badge badge-success">${score}/100</span>`;
      if (score < 60) return `<span class="badge badge-warning">${score}/100</span>`;
      return `<span class="badge badge-danger">${score}/100</span>`;
    }

    const ultimaSub = obterSubmissoesJanela(usuario, 100).slice(-1)[0];
    const ultimaInfo = ultimaSub ? ultimaRespostaInfo(ultimaSub) : null;

    const ritmo = ritmoAprendizagem(DB.submissoes.porEstudante(usuario.id).filter(s => s.status === 'concluida'), 3);
    const ritmoHtml = ritmo === null ? '—'
      : `<span style="color:${ritmo > 0 ? 'var(--success)' : 'var(--danger)'};font-weight:700;">${ritmo > 0 ? '+' : ''}${ritmo}pp</span>`;

    const seletorJanela = `
      <div class="tabs" style="margin-bottom:24px;">
        ${JANELAS.map(j => `
          <button type="button" class="tab ${janelaAtual === j.id ? 'active' : ''}" data-janela="${j.id}">
            ${j.label}
          </button>
        `).join('')}
      </div>
    `;

    const conteudo = `
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:20px;">
        <div>
          <h2 style="font-size:1.25rem;margin-bottom:4px;">Dashboard</h2>
          <p style="color:var(--text-2);font-size:.9rem;margin:0;">Bem-vindo, ${usuario.nome?.split(' ')[0] || ''}!</p>
        </div>
        ${scoreRiscoBadge(scoreRisco)}
      </div>

      ${seletorJanela}

      <div class="stats-grid" style="margin-bottom:24px;">
        <div class="card" style="padding:20px;text-align:center;">
          <div style="font-size:13px;color:var(--text-muted);margin-bottom:8px;">Listas disponíveis</div>
          <div style="font-size:32px;font-weight:700;color:var(--primary);">${listasDisponiveis.length}</div>
        </div>
        <div class="card" style="padding:20px;text-align:center;">
          <div style="font-size:13px;color:var(--text-muted);margin-bottom:8px;">Listas concluídas</div>
          <div style="font-size:32px;font-weight:700;color:#22c55e;">${listasConcluidas.length}</div>
        </div>
        <div class="card" style="padding:20px;text-align:center;">
          <div style="font-size:13px;color:var(--text-muted);margin-bottom:8px;">Média geral</div>
          <div style="font-size:32px;font-weight:700;color:var(--primary);">${diag ? diag.mediaGeral + '%' : '—'}</div>
        </div>
        <div class="card" style="padding:20px;text-align:center;">
          <div style="font-size:13px;color:var(--text-muted);margin-bottom:8px;">Ritmo (3 listas)</div>
          <div style="font-size:32px;font-weight:700;">${ritmoHtml}</div>
        </div>
      </div>

      ${renderCardUltimaResposta(ultimaInfo)}

      <div class="grid-2" style="margin-bottom:24px;">
        <div class="card" style="padding:20px;">
          <h3 style="font-size:1rem;margin-bottom:12px;">Perfil de erros vs. turma</h3>
          <div class="chart-box" style="height:260px;">
            <canvas id="radarErros"></canvas>
          </div>
        </div>
        <div class="card" style="padding:20px;">
          <h3 style="font-size:1rem;margin-bottom:12px;">Tendência: você vs. turma</h3>
          <div class="chart-box" style="height:260px;">
            <canvas id="linhaTendencia"></canvas>
          </div>
        </div>
      </div>

      <div class="card" style="padding:20px;margin-bottom:24px;">
        <h3 style="font-size:1rem;margin-bottom:12px;">Sua posição na distribuição da turma</h3>
        <div class="chart-box" style="height:240px;">
          <canvas id="curvaGaussiana"></canvas>
        </div>
      </div>

      <div class="card" style="padding:0;overflow:hidden;">
        <div class="card-header" style="padding:20px 24px;">
          <h3 class="card-title">Listas disponíveis</h3>
        </div>
        <div class="table-wrap">
          <table style="width:100%;">
            <thead>
              <tr>
                <th>Título</th>
                <th>Prazo</th>
                <th>Status</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              ${todasListas.slice(0, 8).map(lista => {
                const sub = DB.submissoes.porEstudanteELista(usuario.id, lista.id);
                const status = getStatusLista(lista, sub);
                return `<tr>
                  <td><strong>${lista.titulo}</strong></td>
                  <td>${formatarData(lista.dataFim)}</td>
                  <td>${status === 'respondida' ? '<span class="badge badge-success">Respondida</span>' : status === 'encerrada' ? '<span class="badge badge-gray">Encerrada</span>' : '<span class="badge" style="background:#dbeafe;color:#1d4ed8">Disponível</span>'}</td>
                  <td>
                    ${status === 'disponivel'
                      ? `<button class="btn btn-primary btn-sm responder-btn" data-listaid="${lista.id}">Responder</button>`
                      : status === 'respondida'
                        ? `<button class="btn btn-outline btn-sm ver-relatorio-btn">Ver resultado</button>`
                        : '—'
                    }
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    renderShell({
      usuario,
      navItems,
      titulo: 'Dashboard',
      subtitulo: 'Visão geral do seu desempenho',
      conteudo,
    });

    bindEventos();
    renderGraficos(submissoes, listasMap, turmaId);
  }

  function bindEventos() {
    document.querySelectorAll('[data-janela]').forEach(btn => {
      btn.onclick = () => {
        janelaAtual = parseInt(btn.dataset.janela, 10);
        renderDashboard();
      };
    });
    document.querySelectorAll('.responder-btn').forEach(btn => {
      btn.onclick = () => Router.navigate(`/estudante/responder?listaId=${btn.dataset.listaid}`);
    });
    document.querySelectorAll('.ver-relatorio-btn').forEach(btn => {
      btn.onclick = () => Router.navigate('/estudante/relatorio');
    });
  }

  function renderGraficos(submissoes, listasMap, turmaId) {
    if (!submissoes.length) return;

    // Radar de erros
    const perfilAluno = perfilErros(submissoes);
    const labelsRadar = perfilAluno.map(p => p.label);
    const dadosAluno = perfilAluno.map(p => p.pct);
    let datasetsRadar = [{
      nome: 'Você',
      dados: dadosAluno,
      cor: '#4f46e5'
    }];
    if (turmaId && turmaComparavel(submissoes[submissoes.length - 1].listaId, turmaId, DB)) {
      const perfilTurma = perfilErrosTurma(turmaId, submissoes);
      datasetsRadar.push({
        nome: 'Média da turma',
        dados: labelsRadar.map(l => {
          const item = perfilTurma.find(p => p.label === l);
          return item ? item.pct : 0;
        }),
        cor: '#94a3b8'
      });
    }
    Charts.radar({ id: 'radarErros', labels: labelsRadar, datasets: datasetsRadar });

    // Linha de tendência
    const notasAluno = notasPorLista(submissoes, listasMap);
    const datasetsLinha = [{
      label: 'Você',
      data: notasAluno.map(n => n.nota),
      borderColor: '#4f46e5',
      backgroundColor: '#4f46e533',
      fill: true,
    }];
    const labelsLinha = notasAluno.map(n => n.titulo);
    if (turmaId) {
      const notasTurma = notasTurmaPorLista(turmaId, submissoes);
      datasetsLinha.push({
        label: 'Média da turma',
        data: notasTurma.map(n => n.media),
        borderColor: '#94a3b8',
        borderDash: [5, 5],
        fill: false,
      });
    }
    Charts.linha({ id: 'linhaTendencia', labels: labelsLinha, datasets: datasetsLinha, titulo: '' });

    // Curva gaussiana (última lista)
    const ultimaSub = submissoes[submissoes.length - 1];
    const notaAluno = pct(ultimaSub.pontuacao, ultimaSub.totalQuestoes);
    const estudantes = turmaId ? DB.usuarios.porTurma(turmaId, 'estudante') : [];
    const notasTurmaUltima = [];
    estudantes.forEach(e => {
      const s = DB.submissoes.porEstudanteELista(e.id, ultimaSub.listaId);
      if (s?.status === 'concluida') notasTurmaUltima.push(pct(s.pontuacao, s.totalQuestoes));
    });
    if (notasTurmaUltima.length >= 2) {
      const m = media(notasTurmaUltima);
      const dp = desvio(notasTurmaUltima) || 1;
      Charts.gaussiana({
        id: 'curvaGaussiana',
        media: m,
        desvioPadrao: dp,
        posicaoAluno: notaAluno,
        titulo: `Você está na nota ${notaAluno}%`
      });
    } else {
      document.getElementById('curvaGaussiana').parentElement.innerHTML =
        '<p style="color:var(--text-2);text-align:center;padding-top:80px;">Dados insuficientes para a curva de distribuição.</p>';
    }
  }

  renderDashboard();
}
