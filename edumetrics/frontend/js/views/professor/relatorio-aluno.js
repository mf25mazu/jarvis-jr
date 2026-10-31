// views/professor/relatorio-aluno.js — Relatório individual do aluno (visão do professor)

import { renderShell } from '../shared/shell.js';
import { DB } from '../../db.js';
import { Router } from '../../router.js';
import { diagnosticarEstudante } from '../../ai.js';
import {
  formatarData, formatarTempo, stripHtml, labelCategoriaErro,
  calcularDeltaD, interpretarDeltaD, pct
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

export function renderProfessorRelatorioAluno(container, usuario, params = {}) {
  const query = params.query || params || {};
  const turmaId = query.turmaId || '';
  const alunoId = query.alunoId || '';

  const minhasTurmas = DB.turmas.porProfessor(usuario.id);
  const turmaSelecionada = turmaId ? DB.turmas.porId(turmaId) : minhasTurmas[0];
  const estudantes = turmaSelecionada ? DB.usuarios.porTurma(turmaSelecionada.id, 'estudante') : [];
  const alunoSelecionado = alunoId ? DB.usuarios.porId(alunoId) : estudantes[0];

  function renderContent() {
    const turmasOptions = minhasTurmas.map(t =>
      `<option value="${t.id}" ${t.id === turmaSelecionada?.id ? 'selected' : ''}>${t.nome} (${t.serie})</option>`
    ).join('');

    const alunosOptions = estudantes.map(e =>
      `<option value="${e.id}" ${e.id === alunoSelecionado?.id ? 'selected' : ''}>${e.nome}</option>`
    ).join('');

    if (!turmaSelecionada || !alunoSelecionado) {
      return `
        <div class="empty-state">
          <i data-lucide="user" style="width:40px;height:40px;opacity:.4;"></i>
          <h3>Selecione uma turma e um aluno</h3>
          <p>Escolha os filtros acima para visualizar o relatório individual.</p>
        </div>
      `;
    }

    const diag = diagnosticarEstudante(alunoSelecionado.id);
    const submissoes = DB.submissoes.porEstudante(alunoSelecionado.id).filter(s => s.status === 'concluida');
    const ultimaSub = submissoes[submissoes.length - 1];
    const ultimaLista = ultimaSub ? DB.listas.porId(ultimaSub.listaId) : null;
    const questoes = (ultimaLista?.questaoIds || []).map(qid => DB.questoes.porId(qid)).filter(Boolean);

    const finalizadas = ultimaSub?.respostas?.filter(r => r.tipoConclusao === 'fiz') || [];
    const lacunas = ultimaSub?.respostas?.filter(r => r.tipoConclusao === 'nao_fiz') || [];
    const erros = finalizadas.filter(r => r.statusAutodeclarado === 'erro');

    const categorias = {};
    erros.forEach(r => {
      const cat = r.categoriaErro || 'outros';
      categorias[cat] = (categorias[cat] || 0) + 1;
    });

    const linhas = questoes.map(q => {
      const r = ultimaSub.respostas.find(x => x.questaoId === q.id);
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
          <td>${q.dificuldadeEsperada} → ΔD ${delta > 0 ? '+' : ''}${delta}</td>
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

    return `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:12px;">
        <div>
          <h2 style="font-size:1.25rem;margin-bottom:4px;">Relatório do Aluno</h2>
          <p style="color:var(--text-2);font-size:.9rem;margin:0;">${alunoSelecionado.nome} — ${turmaSelecionada.nome}</p>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <select class="form-select" id="selTurma" style="width:auto;min-width:180px;">
            ${turmasOptions}
          </select>
          <select class="form-select" id="selAluno" style="width:auto;min-width:180px;">
            ${alunosOptions}
          </select>
        </div>
      </div>

      <h3 style="font-size:1rem;margin-bottom:12px;">Janelas acumuladas do aluno</h3>
      ${janelasHtml || `<p style="color:var(--text-2);margin-bottom:24px;">Ainda não há dados suficientes para janelas acumuladas.</p>`}

      <div class="stats-grid" style="margin-bottom:24px;">
        <div class="card" style="padding:20px;text-align:center;">
          <div style="font-size:13px;color:var(--text-muted);margin-bottom:8px;">Média geral</div>
          <div style="font-size:32px;font-weight:700;color:var(--primary);">${diag ? diag.mediaGeral + '%' : '—'}</div>
        </div>
        <div class="card" style="padding:20px;text-align:center;">
          <div style="font-size:13px;color:var(--text-muted);margin-bottom:8px;">Risco</div>
          <div style="font-size:32px;font-weight:700;color:${diag && diag.scoreRisco >= 60 ? 'var(--danger)' : 'var(--success)'}">${diag ? diag.scoreRisco : '—'}</div>
        </div>
        <div class="card" style="padding:20px;text-align:center;">
          <div style="font-size:13px;color:var(--text-muted);margin-bottom:8px;">Dificuldade percebida média</div>
          <div style="font-size:32px;font-weight:700;color:var(--text);">${diag?.metacog?.mediaDificuldadePercebida || '—'}/5</div>
        </div>
        <div class="card" style="padding:20px;text-align:center;">
          <div style="font-size:13px;color:var(--text-muted);margin-bottom:8px;">Perfil metacognitivo</div>
          <div style="font-size:24px;font-weight:700;color:var(--text);">${diag?.metacog?.perfil === 'superestimacao' ? 'Superestimação' : diag?.metacog?.perfil === 'subestimacao' ? 'Subestimação' : 'Calibrado'}</div>
        </div>
      </div>

      <div class="grid-2" style="margin-bottom:24px;">
        <div class="card" style="padding:20px;">
          <h3 style="font-size:1rem;margin-bottom:16px;">Categorias de erro</h3>
          ${Object.keys(categorias).length === 0
            ? '<p style="color:var(--text-2);font-size:.9rem;">Nenhum erro registrado na última lista.</p>'
            : `<div style="display:flex;flex-direction:column;gap:8px;">
                ${Object.entries(categorias).map(([cat, n]) => `
                  <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span style="font-size:.9rem;">${labelCategoriaErro(cat)}</span>
                    <span class="badge badge-warning">${n}</span>
                  </div>
                `).join('')}
               </div>`
          }
        </div>
        <div class="card" style="padding:20px;">
          <h3 style="font-size:1rem;margin-bottom:16px;">Lacunas por tópico</h3>
          ${!diag?.lacunas?.length
            ? '<p style="color:var(--text-2);font-size:.9rem;">Nenhuma lacuna identificada.</p>'
            : `<div style="display:flex;flex-direction:column;gap:8px;">
                ${diag.lacunas.slice(0, 5).map(l => `
                  <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span style="font-size:.9rem;">${l.chave}</span>
                    <span class="badge ${l.critica ? 'badge-danger' : 'badge-warning'}">${l.taxa}%</span>
                  </div>
                `).join('')}
               </div>`
          }
        </div>
      </div>

      <div class="card" style="padding:0;overflow:hidden;">
        <div class="card-header" style="padding:20px 24px;">
          <h3 class="card-title">Última lista: ${ultimaLista?.titulo || '—'}</h3>
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
  }

  renderShell({
    usuario,
    navItems: getNavItems('/professor/relatorio-aluno'),
    titulo: 'Relatório por Aluno',
    subtitulo: 'Visão individual com janelas acumuladas',
    conteudo: renderContent(),
  });

  const selTurma = document.getElementById('selTurma');
  if (selTurma) {
    selTurma.onchange = e => {
      const t = DB.turmas.porId(e.target.value);
      const alunos = t ? DB.usuarios.porTurma(t.id, 'estudante') : [];
      const primeiro = alunos[0]?.id || '';
      Router.navigate(`/professor/relatorio-aluno?turmaId=${e.target.value}&alunoId=${primeiro}`);
    };
  }

  const selAluno = document.getElementById('selAluno');
  if (selAluno) {
    selAluno.onchange = e => {
      Router.navigate(`/professor/relatorio-aluno?turmaId=${turmaSelecionada.id}&alunoId=${e.target.value}`);
    };
  }
}
