// views/professor/dashboard.js — Dashboard do Professor

import { DB } from '../../db.js';
import { formatarData, toast } from '../../utils.js';
import { diagnosticarTurma } from '../../ai.js';
import { Router } from '../../router.js';
import { renderShell } from '../shared/shell.js';

export function renderProfessorDashboard(container, usuario) {
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

  // ── Coleta dados ──────────────────────────────────────────────────
  const turmas = DB.turmas.porProfessor(usuario.id);
  const totalEstudantes = turmas.reduce((acc, t) => acc + (t.estudanteIds?.length || 0), 0);
  const listas = DB.listas.todas().filter(l => l.criadoPorId === usuario.id);

  // Diagnósticos por turma (pode ser null se sem dados)
  const diagnosticos = turmas.map(t => ({ turma: t, diag: diagnosticarTurma(t.id) }));
  const estudantesEmRisco = diagnosticos.reduce((acc, { diag }) =>
    acc + (diag ? diag.estudantesAltoRisco : 0), 0);

  // ── Listas recentes (últimas 5) ───────────────────────────────────
  const listasRecentes = [...listas]
    .sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0))
    .slice(0, 5);

  function badgeStatus(status) {
    if (status === 'publicada') return `<span class="badge badge-success">Publicada</span>`;
    if (status === 'encerrada') return `<span class="badge badge-danger">Encerrada</span>`;
    return `<span class="badge badge-warning">Rascunho</span>`;
  }

  function badgeRisco(diag) {
    if (!diag) return `<span class="badge">Sem dados</span>`;
    if (diag.estudantesAltoRisco === 0) return `<span class="badge badge-success">Baixo</span>`;
    if (diag.estudantesAltoRisco <= 2) return `<span class="badge badge-warning">Médio</span>`;
    return `<span class="badge badge-danger">Alto (${diag.estudantesAltoRisco})</span>`;
  }

  const turmasRows = diagnosticos.map(({ turma, diag }) => `
    <tr>
      <td>${turma.nome}</td>
      <td>${turma.serie || '—'}</td>
      <td>${turma.estudanteIds?.length || 0}</td>
      <td>${diag ? diag.mediaGeral + '%' : '—'}</td>
      <td>${badgeRisco(diag)}</td>
      <td>
        <button class="btn btn-sm btn-primary btn-ver-turma" data-id="${turma.id}">
          <i data-lucide="bar-chart-2" style="width:14px;height:14px;"></i> Ver turma
        </button>
      </td>
    </tr>`).join('');

  const listasRows = listasRecentes.map(l => {
    const turmasNomes = (l.turmaIds || [])
      .map(tid => DB.turmas.porId(tid)?.nome || tid)
      .join(', ') || '—';
    return `
    <tr>
      <td>${l.titulo || l.nome || '—'}</td>
      <td>${turmasNomes}</td>
      <td>${l.dataFim ? formatarData(l.dataFim) : '—'}</td>
      <td>${badgeStatus(l.status)}</td>
    </tr>`;
  }).join('');

  const conteudo = `
    <div class="stats-grid" style="margin-bottom:24px;">
      <div class="card" style="padding:20px;">
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:8px;">Minhas Turmas</div>
        <div style="font-size:32px;font-weight:700;color:var(--primary);">${turmas.length}</div>
      </div>
      <div class="card" style="padding:20px;">
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:8px;">Total de Estudantes</div>
        <div style="font-size:32px;font-weight:700;color:var(--primary);">${totalEstudantes}</div>
      </div>
      <div class="card" style="padding:20px;">
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:8px;">Listas Criadas</div>
        <div style="font-size:32px;font-weight:700;color:var(--primary);">${listas.length}</div>
      </div>
      <div class="card" style="padding:20px;">
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:8px;">Estudantes em Risco</div>
        <div style="font-size:32px;font-weight:700;color:${estudantesEmRisco > 0 ? 'var(--danger)' : 'var(--success)'};">${estudantesEmRisco}</div>
      </div>
    </div>

    <div class="card" style="margin-bottom:24px;">
      <div style="padding:20px 24px 0;display:flex;align-items:center;justify-content:space-between;">
        <h3 style="margin:0;font-size:16px;font-weight:600;">Minhas Turmas</h3>
      </div>
      <div class="table-wrap" style="padding:16px 24px 20px;">
        ${turmas.length === 0
          ? `<p style="color:var(--text-muted);text-align:center;padding:24px 0;">Nenhuma turma encontrada.</p>`
          : `<table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Série</th>
                  <th>Estudantes</th>
                  <th>Média Geral</th>
                  <th>Risco</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>${turmasRows}</tbody>
            </table>`
        }
      </div>
    </div>

    <div class="card">
      <div style="padding:20px 24px 0;">
        <h3 style="margin:0;font-size:16px;font-weight:600;">Listas Recentes</h3>
      </div>
      <div class="table-wrap" style="padding:16px 24px 20px;">
        ${listasRecentes.length === 0
          ? `<p style="color:var(--text-muted);text-align:center;padding:24px 0;">Nenhuma lista criada ainda.</p>`
          : `<table>
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Turmas</th>
                  <th>Data Fim</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>${listasRows}</tbody>
            </table>`
        }
      </div>
    </div>
  `;

  renderShell({ usuario, navItems, titulo: 'Dashboard', subtitulo: 'Visão geral das suas turmas', conteudo });

  // ── Event listeners ───────────────────────────────────────────────
  document.querySelectorAll('.btn-ver-turma').forEach(btn => {
    btn.addEventListener('click', () => {
      Router.navigate(`/professor/relatorios?turmaId=${btn.dataset.id}`);
    });
  });
}
