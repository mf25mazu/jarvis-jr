import { DB } from '../../db.js';
import { formatarData, toast } from '../../utils.js';
import { diagnosticarEstudante } from '../../ai.js';
import { Router } from '../../router.js';
import { renderShell } from '../shared/shell.js';

const navItems = [
  { icon: 'layout-dashboard', label: 'Dashboard', href: '/estudante', active: true },
  { icon: 'clipboard-list', label: 'Minhas Listas', href: '/estudante/listas' },
  { icon: 'bar-chart-2', label: 'Meu Relatório', href: '/estudante/relatorio' },
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
  if (Date.now() > lista.dataFim) return 'encerrada';
  if (Date.now() < lista.dataInicio) return 'encerrada';
  return 'disponivel';
}

export async function renderEstudanteDashboard(container, usuario) {
  // Load all listas for this student
  const todasListas = getListasParaEstudante(usuario);

  // Map submissions
  const submissoes = {};
  for (const lista of todasListas) {
    const sub = DB.submissoes.porEstudanteELista(usuario.id, lista.id);
    if (sub) submissoes[lista.id] = sub;
  }

  // Stats
  const listasDisponiveis = todasListas.filter(l => getStatusLista(l, submissoes[l.id]) === 'disponivel');
  const listasConcluidas = todasListas.filter(l => !!submissoes[l.id]);

  // AI Diagnostic
  let diag = null;
  try { diag = diagnosticarEstudante(usuario.id); } catch (_) {}

  const mediaGeral = diag ? diag.mediaGeral + '%' : '—';
  const scoreRisco = diag ? diag.scoreRisco : null;

  function scoreRiscoBadge(score) {
    if (score === null) return '<span class="badge">—</span>';
    if (score < 30) return `<span class="badge badge-success">${score}/100</span>`;
    if (score < 60) return `<span class="badge badge-warning">${score}/100</span>`;
    return `<span class="badge badge-danger">${score}/100</span>`;
  }

  // Last 3 scores
  const ultimasPontuacoes = diag ? (diag.pontuacoes || []).slice(-3) : [];

  function badgePct(pct) {
    const color = pct >= 70 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
    return `<span style="background:${color};color:#fff;padding:4px 12px;border-radius:999px;font-weight:600;font-size:0.9rem;">${pct}%</span>`;
  }

  const ultimasHtml = ultimasPontuacoes.length
    ? ultimasPontuacoes.map(p => badgePct(p)).join(' ')
    : '<span style="color:var(--text-muted)">Nenhum dado disponível ainda.</span>';

  function statusBadge(status) {
    if (status === 'respondida') return '<span class="badge badge-success">Respondida</span>';
    if (status === 'encerrada') return '<span class="badge" style="background:var(--bg-muted,#e5e7eb);color:var(--text-muted,#6b7280)">Encerrada</span>';
    return '<span class="badge" style="background:#dbeafe;color:#1d4ed8">Disponível</span>';
  }

  function actionButton(lista, status) {
    if (status === 'disponivel') {
      return `<button class="btn btn-primary btn-sm responder-btn" data-listaid="${lista.id}">
        <i data-lucide="play-circle"></i> Responder
      </button>`;
    }
    if (status === 'respondida') {
      return `<button class="btn btn-sm ver-relatorio-btn" style="border:1px solid var(--border)">
        <i data-lucide="bar-chart-2"></i> Ver resultado
      </button>`;
    }
    return '';
  }

  const listasRows = todasListas.slice(0, 10).map(lista => {
    const status = getStatusLista(lista, submissoes[lista.id]);
    return `<tr>
      <td><strong>${lista.titulo}</strong></td>
      <td>${formatarData(lista.dataFim)}</td>
      <td>${statusBadge(status)}</td>
      <td>${actionButton(lista, status)}</td>
    </tr>`;
  }).join('');

  const conteudo = `
    <div class="stats-grid" style="margin-bottom:1.5rem">
      <div class="card" style="padding:1.25rem;text-align:center">
        <div style="font-size:2rem;font-weight:700;color:var(--primary)">${listasDisponiveis.length}</div>
        <div style="color:var(--text-muted);font-size:0.875rem;margin-top:0.25rem">Listas disponíveis</div>
      </div>
      <div class="card" style="padding:1.25rem;text-align:center">
        <div style="font-size:2rem;font-weight:700;color:#22c55e">${listasConcluidas.length}</div>
        <div style="color:var(--text-muted);font-size:0.875rem;margin-top:0.25rem">Listas concluídas</div>
      </div>
      <div class="card" style="padding:1.25rem;text-align:center">
        <div style="font-size:2rem;font-weight:700;color:var(--primary)">${mediaGeral}</div>
        <div style="color:var(--text-muted);font-size:0.875rem;margin-top:0.25rem">Média geral</div>
      </div>
      <div class="card" style="padding:1.25rem;text-align:center">
        <div style="font-size:1.5rem;font-weight:700;margin-bottom:0.25rem">${scoreRiscoBadge(scoreRisco)}</div>
        <div style="color:var(--text-muted);font-size:0.875rem">Score de risco</div>
      </div>
    </div>

    <div class="card" style="margin-bottom:1.5rem">
      <div style="padding:1rem 1.25rem;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:0.5rem">
        <i data-lucide="clipboard-list"></i>
        <h3 style="margin:0;font-size:1rem;font-weight:600">Listas disponíveis</h3>
      </div>
      ${todasListas.length === 0 ? `
        <div style="padding:2rem;text-align:center;color:var(--text-muted)">
          <i data-lucide="inbox" style="width:2.5rem;height:2.5rem;margin-bottom:0.75rem;opacity:0.4"></i>
          <p>Nenhuma lista encontrada para suas turmas.</p>
        </div>
      ` : `
        <div class="table-wrap">
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr style="border-bottom:1px solid var(--border)">
                <th style="padding:0.75rem 1rem;text-align:left;font-size:0.8rem;color:var(--text-muted)">Título</th>
                <th style="padding:0.75rem 1rem;text-align:left;font-size:0.8rem;color:var(--text-muted)">Prazo</th>
                <th style="padding:0.75rem 1rem;text-align:left;font-size:0.8rem;color:var(--text-muted)">Status</th>
                <th style="padding:0.75rem 1rem;text-align:left;font-size:0.8rem;color:var(--text-muted)">Ação</th>
              </tr>
            </thead>
            <tbody>
              ${listasRows}
            </tbody>
          </table>
        </div>
      `}
    </div>

    <div class="card">
      <div style="padding:1rem 1.25rem;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:0.5rem">
        <i data-lucide="trending-up"></i>
        <h3 style="margin:0;font-size:1rem;font-weight:600">Preview de desempenho</h3>
        <span style="font-size:0.78rem;color:var(--text-muted);margin-left:auto">Últimas 3 listas</span>
      </div>
      <div style="padding:1.25rem;display:flex;gap:0.75rem;align-items:center;flex-wrap:wrap">
        ${ultimasHtml}
      </div>
    </div>
  `;

  renderShell({
    usuario,
    navItems,
    titulo: 'Dashboard',
    subtitulo: `Bem-vindo, ${usuario.nome?.split(' ')[0] || ''}!`,
    conteudo,
  });

  if (window.lucide) window.lucide.createIcons();

  // Event listeners
  document.querySelectorAll('.responder-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const listaId = btn.dataset.listaid;
      Router.navigate(`/estudante/responder?listaId=${listaId}`);
    });
  });

  document.querySelectorAll('.ver-relatorio-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      Router.navigate('/estudante/relatorio');
    });
  });
}
