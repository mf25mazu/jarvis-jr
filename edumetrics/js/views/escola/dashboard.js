// views/escola/dashboard.js — Dashboard da Escola com comparativo inter-turmas e radar multidisciplinar

import { renderShell } from '../shared/shell.js';
import { DB } from '../../db.js';
import { Router } from '../../router.js';
import { Charts } from '../../charts.js';
import { diagnosticarTurma } from '../../ai.js';
import { pct, media, labelCategoriaErro } from '../../utils.js';

function getNavItems(rota) {
  return [
    { icon: 'layout-dashboard', label: 'Dashboard',        href: '/escola',             active: rota === '/escola' },
    { section: 'Gestão' },
    { icon: 'users',            label: 'Professores',      href: '/escola/professores', active: rota === '/escola/professores' },
    { icon: 'book-open',        label: 'Turmas',           href: '/escola/turmas',      active: rota === '/escola/turmas' },
    { icon: 'graduation-cap',   label: 'Estudantes',       href: '/escola/estudantes',  active: rota === '/escola/estudantes' },
    { separator: true },
    { section: 'Conteúdo' },
    { icon: 'file-question',    label: 'Banco de Questões',href: '/escola/questoes',    active: rota === '/escola/questoes' },
    { icon: 'clipboard-list',   label: 'Listas',           href: '/escola/listas',      active: rota === '/escola/listas' },
    { separator: true },
    { section: 'Análise' },
    { icon: 'bar-chart-2',      label: 'Relatórios',       href: '/escola/relatorios',  active: rota === '/escola/relatorios' },
  ];
}

function calcularMetricasTurma(turmaId) {
  const estudantes = DB.usuarios.porTurma(turmaId, 'estudante');
  const submissoes = estudantes.flatMap(e =>
    DB.submissoes.porEstudante(e.id).filter(s => s.status === 'concluida')
  );
  if (!submissoes.length) return null;
  const medias = submissoes.map(s => pct(s.pontuacao, s.totalQuestoes));
  return {
    media: Math.round(media(medias)),
    risco: diagnosticarTurma(turmaId)?.riscoMedio || 0,
    naoFiz: Math.round((submissoes.flatMap(s => s.respostas).filter(r => r.naoFinalizada).length /
      Math.max(1, submissoes.flatMap(s => s.respostas).length)) * 100),
  };
}

function radarMultidisciplinar(turmas) {
  const disciplinasSet = new Set();
  DB.questoes.porEscola(turmas[0]?.escolaId).forEach(q => {
    if (q.disciplina) disciplinasSet.add(q.disciplina);
  });
  const disciplinas = [...disciplinasSet].sort();

  const datasets = turmas.map((t, idx) => {
    const estudantes = DB.usuarios.porTurma(t.id, 'estudante');
    const submissoes = estudantes.flatMap(e =>
      DB.submissoes.porEstudante(e.id).filter(s => s.status === 'concluida')
    );
    const dados = disciplinas.map(disc => {
      const resps = submissoes.flatMap(s =>
        (s.respostas || []).filter(r => {
          const q = DB.questoes.porId(r.questaoId);
          return q?.disciplina === disc && !r.naoFinalizada && r.tipoConclusao === 'fiz';
        })
      );
      if (!resps.length) return 0;
      const acertos = resps.filter(r => r.statusAutodeclarado === 'acerto').length;
      return Math.round((acertos / resps.length) * 100);
    });
    const cores = ['#4f46e5', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];
    return { nome: t.nome, dados, cor: cores[idx % cores.length] };
  });

  return { disciplinas, datasets };
}

export function renderEscolaDashboard(container, usuario) {
  const rota = '/escola';
  const escolaId = usuario.escolaId;

  const turmas = DB.turmas.porEscola(escolaId);
  const professores = DB.usuarios.porEscola(escolaId, 'professor');
  const estudantes = DB.usuarios.porEscola(escolaId, 'estudante');
  const listas = DB.listas.porEscola(escolaId);
  const listasAtivas = listas.filter(l => l.status === 'publicada');

  const series = [...new Set(turmas.map(t => t.serie).filter(Boolean))].sort();
  const serieSelecionada = series[0];
  const turmasSerie = turmas.filter(t => t.serie === serieSelecionada);

  const conteudo = `
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:20px;">
      <div>
        <h2 style="font-size:1.25rem;margin-bottom:4px;">Dashboard</h2>
        <p style="color:var(--text-2);font-size:.9rem;margin:0;">Visão geral da escola</p>
      </div>
    </div>

    <div class="stats-grid" style="margin-bottom:24px;">
      <div class="stat-card">
        <div class="stat-icon"><i data-lucide="users" style="width:22px;height:22px;"></i></div>
        <div class="stat-info"><div class="stat-value">${professores.length}</div><div class="stat-label">Professores</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon"><i data-lucide="book-open" style="width:22px;height:22px;"></i></div>
        <div class="stat-info"><div class="stat-value">${turmas.length}</div><div class="stat-label">Turmas</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon"><i data-lucide="graduation-cap" style="width:22px;height:22px;"></i></div>
        <div class="stat-info"><div class="stat-value">${estudantes.length}</div><div class="stat-label">Estudantes</div></div>
      </div>
      <div class="stat-card">
        <div class="stat-icon"><i data-lucide="clipboard-list" style="width:22px;height:22px;"></i></div>
        <div class="stat-info"><div class="stat-value">${listasAtivas.length}</div><div class="stat-label">Listas Ativas</div></div>
      </div>
    </div>

    <div class="grid-2" style="margin-bottom:24px;">
      <div class="card" style="padding:20px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
          <h3 style="font-size:1rem;margin:0;">Comparativo Inter-turmas</h3>
          <select class="form-select" id="selSerie" style="width:auto;min-width:140px;">
            ${series.map(s => `<option value="${s}" ${s === serieSelecionada ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="chart-box" style="height:280px;">
          <canvas id="comparativoTurmas"></canvas>
        </div>
      </div>
      <div class="card" style="padding:20px;">
        <h3 style="font-size:1rem;margin-bottom:12px;">Radar Multidisciplinar Acumulado</h3>
        <div class="chart-box" style="height:280px;">
          <canvas id="radarMultidisciplinar"></canvas>
        </div>
      </div>
    </div>

    <div class="card" style="padding:0;overflow:hidden;margin-bottom:24px;">
      <div class="card-header" style="padding:20px 24px;">
        <h3 class="card-title">Turmas da Escola</h3>
        <button class="btn btn-primary btn-sm" id="btnNovaTurmaTable">
          <i data-lucide="plus" style="width:14px;height:14px;"></i> Nova Turma
        </button>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Turma</th>
              <th>Série</th>
              <th>Estudantes</th>
              <th>Média</th>
              <th>Risco</th>
              <th>Não finalizadas</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            ${turmas.map(t => {
              const metricas = calcularMetricasTurma(t.id);
              return `
                <tr>
                  <td>${t.nome}</td>
                  <td>${t.serie || '—'}</td>
                  <td>${(t.estudanteIds || []).length}</td>
                  <td>${metricas ? metricas.media + '%' : '—'}</td>
                  <td>${metricas ? metricas.risco : '—'}</td>
                  <td>${metricas ? metricas.naoFiz + '%' : '—'}</td>
                  <td><button class="btn btn-sm btn-primary btn-ver-turma" data-id="${t.id}">Ver</button></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="card" style="padding:16px;">
      <h3 class="card-title" style="margin-bottom:12px;">Acesso Rápido</h3>
      <div style="display:flex;flex-wrap:wrap;gap:12px;">
        <button class="btn btn-primary" id="qaNovaTurma"><i data-lucide="plus-circle" style="width:16px;height:16px;"></i> Nova Turma</button>
        <button class="btn btn-secondary" id="qaProf"><i data-lucide="user-plus" style="width:16px;height:16px;"></i> Cadastrar Professor</button>
        <button class="btn btn-secondary" id="qaQuestao"><i data-lucide="file-plus" style="width:16px;height:16px;"></i> Nova Questão</button>
        <button class="btn btn-secondary" id="qaLista"><i data-lucide="clipboard-plus" style="width:16px;height:16px;"></i> Nova Lista</button>
        <button class="btn btn-secondary" id="qaRelatorio"><i data-lucide="bar-chart-2" style="width:16px;height:16px;"></i> Ver Relatórios</button>
      </div>
    </div>
  `;

  renderShell({
    usuario,
    navItems: getNavItems(rota),
    titulo: 'Dashboard',
    subtitulo: 'Visão geral da escola',
    conteudo,
  });

  // Renderiza gráficos
  const dadosComparativo = turmasSerie.map(t => {
    const m = calcularMetricasTurma(t.id);
    return { nome: t.nome, media: m?.media || 0, risco: m?.risco || 0 };
  });

  Charts.barra({
    id: 'comparativoTurmas',
    labels: dadosComparativo.map(d => d.nome),
    datasets: [{
      label: 'Média de acertos (%)',
      data: dadosComparativo.map(d => d.media),
      backgroundColor: '#4f46e5',
    }],
    titulo: `Comparativo ${serieSelecionada}`,
  });

  const radar = radarMultidisciplinar(turmasSerie);
  if (radar.disciplinas.length) {
    Charts.radar({
      id: 'radarMultidisciplinar',
      labels: radar.disciplinas,
      datasets: radar.datasets,
      titulo: 'Vulnerabilidades por matéria'
    });
  } else {
    document.getElementById('radarMultidisciplinar').parentElement.innerHTML =
      '<p style="color:var(--text-2);text-align:center;padding-top:100px;">Sem dados multidisciplinares suficientes.</p>';
  }

  // Event listeners
  document.getElementById('selSerie').onchange = e => {
    // Recarrega a página com a série selecionada (armazena em localStorage para simplicidade)
    localStorage.setItem('edm_escola_serie', e.target.value);
    renderEscolaDashboard(container, usuario);
  };
  document.querySelectorAll('.btn-ver-turma').forEach(btn => {
    btn.onclick = () => Router.navigate('/escola/turmas');
  });
  document.getElementById('qaNovaTurma')?.addEventListener('click', () => Router.navigate('/escola/turmas'));
  document.getElementById('btnNovaTurmaTable')?.addEventListener('click', () => Router.navigate('/escola/turmas'));
  document.getElementById('qaProf')?.addEventListener('click', () => Router.navigate('/escola/professores'));
  document.getElementById('qaQuestao')?.addEventListener('click', () => Router.navigate('/escola/questoes'));
  document.getElementById('qaLista')?.addEventListener('click', () => Router.navigate('/escola/listas'));
  document.getElementById('qaRelatorio')?.addEventListener('click', () => Router.navigate('/escola/relatorios'));
}
