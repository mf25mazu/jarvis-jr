// views/estudante/responder.js — Resolução de listas com metacognição

import { DB } from '../../db.js';
import { Router } from '../../router.js';
import {
  uuid, toast, sanitize, stripHtml, formatarTempo,
  estatisticasQuestaoTurma, labelCategoriaErro
} from '../../utils.js';

const PROGRESS_KEY = 'edm_responder_progresso';
const CATEGORIAS_ERRO = [
  { id: 'falta_teoria', label: 'Falta de Teoria' },
  { id: 'erro_conta', label: 'Erro de Conta' },
  { id: 'interpretacao', label: 'Interpretação de Texto' },
  { id: 'falta_atencao', label: 'Falta de Atenção' },
];

const DIFICULDADE_LABELS = ['Muito Fácil', 'Fácil', 'Médio', 'Difícil', 'Muito Difícil'];

let timerInterval = null;
let inactivityInterval = null;

function limparTimers() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  if (inactivityInterval) { clearInterval(inactivityInterval); inactivityInterval = null; }
}

function salvarProgressoLocal(submissao, questaoAtual, tempoAcumulado) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify({
    submissaoId: submissao.id,
    questaoAtual,
    tempoAcumulado,
    atualizadoEm: Date.now(),
  }));
}

function carregarProgressoLocal() {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || null; }
  catch { return null; }
}

function removerProgressoLocal() {
  localStorage.removeItem(PROGRESS_KEY);
}

function obterOuCriarSubmissao(usuario, lista) {
  let sub = DB.submissoes.porEstudanteELista(usuario.id, lista.id);
  if (!sub) {
    sub = {
      id: uuid(),
      listaId: lista.id,
      estudanteId: usuario.id,
      status: 'em_andamento',
      dataInicio: Date.now(),
      dataFim: null,
      tempoTotal: 0,
      pontuacao: 0,
      totalQuestoes: (lista.questaoIds || []).length,
      dificuldadePercebidaMedia: 0,
      respostas: [],
    };
    DB.submissoes.salvar(sub);
  }
  // Recupera progresso salvo localmente (página fechada)
  const progresso = carregarProgressoLocal();
  if (progresso && progresso.submissaoId === sub.id) {
    sub.tempoTotal = progresso.tempoAcumulado || sub.tempoTotal || 0;
  }
  return { sub, progresso };
}

function calcularPontuacao(respostas) {
  return respostas.filter(r => r.tipoConclusao === 'fiz' && r.statusAutodeclarado === 'acerto').length;
}

function calcularDificuldadeMedia(respostas) {
  const finalizadas = respostas.filter(r => r.tipoConclusao === 'fiz');
  if (!finalizadas.length) return 0;
  return Math.round(finalizadas.reduce((a, r) => a + (r.dificuldadePercebida || 3), 0) / finalizadas.length);
}

function finalizarSubmissao(sub) {
  sub.status = 'concluida';
  sub.dataFim = Date.now();
  sub.pontuacao = calcularPontuacao(sub.respostas);
  sub.dificuldadePercebidaMedia = calcularDificuldadeMedia(sub.respostas);
  DB.submissoes.salvar(sub);
  removerProgressoLocal();
}

function renderTimer(tempo) {
  return `
    <div class="timer" id="timerDisplay">
      ${formatarTempo(tempo)}
    </div>
  `;
}

function renderBarraProgresso(atual, total) {
  const pct = total ? Math.round((atual / total) * 100) : 0;
  return `
    <div style="margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;font-size:.8rem;color:var(--text-2);margin-bottom:6px;">
        <span>Questão ${atual + 1} de ${total}</span>
        <span>${pct}%</span>
      </div>
      <div class="progress">
        <div class="progress-fill" style="width:${pct}%;background:var(--primary);"></div>
      </div>
    </div>
  `;
}

function renderQuestao(q, idx, total, tempoAtual) {
  const enunciado = q.enunciado || '<p><em>Sem enunciado.</em></p>';
  const alternativasHtml = q.tipo === 'multipla_escolha'
    ? `<div class="alternativas" style="margin-top:20px;">
        ${(q.alternativas || []).map(a => `
          <label class="alternativa" data-alt="${a.id}">
            <span class="alt-key">${a.id.toUpperCase()}</span>
            <input type="radio" name="respostaMultipla" value="${a.id}" style="display:none;">
            <span>${sanitize(a.texto)}</span>
          </label>
        `).join('')}
      </div>`
    : `<div class="form-group" style="margin-top:20px;">
        <label class="form-label">Sua resposta</label>
        <textarea class="form-control" id="respostaDiscursiva" rows="4" placeholder="Digite sua resposta..."></textarea>
      </div>`;

  return `
    <div class="questao-card" style="margin-bottom:16px;">
      ${renderBarraProgresso(idx, total)}
      <div class="questao-enunciado">${enunciado}</div>
      ${q.imagem ? `<div style="margin-bottom:20px;"><img src="${sanitize(q.imagem)}" style="max-width:100%;max-height:280px;border-radius:8px;border:1px solid var(--border);"></div>` : ''}
      ${alternativasHtml}
    </div>

    <div class="card" style="padding:20px;">
      <div style="font-weight:600;margin-bottom:14px;">Você conseguiu desenvolver esta questão?</div>
      <div class="tabs" style="margin-bottom:20px;">
        <button type="button" class="tab tab-fiz active" data-tab="fiz">✅ Fiz</button>
        <button type="button" class="tab tab-nao-fiz" data-tab="nao_fiz">❌ Não fiz</button>
      </div>

      <div id="painelFiz">
        <div style="margin-bottom:16px;">
          <div style="font-size:.875rem;font-weight:600;margin-bottom:8px;">Como você avalia seu resultado?</div>
          <div style="display:flex;gap:12px;flex-wrap:wrap;">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:10px 14px;border:1.5px solid var(--border);border-radius:8px;flex:1;min-width:120px;">
              <input type="radio" name="statusAutodeclarado" value="acerto" checked> Acertei
            </label>
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:10px 14px;border:1.5px solid var(--border);border-radius:8px;flex:1;min-width:120px;">
              <input type="radio" name="statusAutodeclarado" value="erro"> Errei
            </label>
          </div>
        </div>

        <div id="categoriaErroBox" style="display:none;margin-bottom:16px;">
          <div style="font-size:.875rem;font-weight:600;margin-bottom:8px;">Qual foi a principal causa do erro?</div>
          <select class="form-control" id="categoriaErro">
            <option value="">Selecione a categoria</option>
            ${CATEGORIAS_ERRO.map(c => `<option value="${c.id}">${c.label}</option>`).join('')}
          </select>
        </div>
      </div>

      <div id="painelNaoFiz" style="display:none;">
        <div class="alert alert-warning">
          Você declarou que <strong>não conseguiu desenvolver</strong> a questão. Ela será registrada como lacuna conceitual e o tempo não entrará no comparativo da turma.
        </div>
      </div>

      <div style="margin-bottom:16px;">
        <div style="font-size:.875rem;font-weight:600;margin-bottom:8px;">Dificuldade percebida (D<sub>percebida</sub>) *</div>
        <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
          <input type="range" id="dificuldadePercebida" min="1" max="5" step="1" value="3" style="flex:1;min-width:180px;">
          <div id="dificuldadePercebidaDisplay" style="font-weight:700;color:var(--primary);white-space:nowrap;">3 — Médio</div>
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <i data-lucide="clock" style="width:18px;height:18px;color:var(--primary);"></i>
          ${renderTimer(tempoAtual)}
        </div>
        <button class="btn btn-primary btn-lg" id="btnConfirmarQuestao" disabled>
          Confirmar e avançar <i data-lucide="arrow-right" style="width:16px;height:16px;"></i>
        </button>
      </div>
      <div class="form-error" id="erroConfirmar" style="display:none;margin-top:8px;text-align:right;"></div>
    </div>
  `;
}

function renderPosResposta(q, resposta, turmaId) {
  const stats = estatisticasQuestaoTurma(DB, q.id, turmaId);
  const isFiz = resposta.tipoConclusao === 'fiz';
  const corDif = ['#22c55e', '#4ade80', '#f59e0b', '#f97316', '#ef4444'][resposta.dificuldadePercebida - 1];

  return `
    <div class="questao-card" style="margin-bottom:16px;">
      <div style="font-size:.75rem;font-weight:700;text-transform:uppercase;color:var(--text-3);margin-bottom:8px;">Questão concluída</div>
      <div class="questao-enunciado">${stripHtml(q.enunciado).substring(0, 120)}${stripHtml(q.enunciado).length > 120 ? '…' : ''}</div>
    </div>

    <div class="card" style="padding:24px;margin-bottom:16px;">
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px;">
        <span class="badge" style="background:${isFiz ? '#dcfce7' : '#fef9c3'};color:${isFiz ? '#16a34a' : '#92400e'};font-size:.85rem;">
          ${isFiz ? (resposta.statusAutodeclarado === 'acerto' ? '✅ Fiz — Acertei' : '⚠️ Fiz — Errei') : '❌ Não fiz'}
        </span>
        <span class="badge" style="background:${corDif}20;color:${corDif};font-size:.85rem;">
          Dificuldade percebida: ${resposta.dificuldadePercebida}/5
        </span>
        ${isFiz && resposta.statusAutodeclarado === 'erro' && resposta.categoriaErro ? `
          <span class="badge badge-warning" style="font-size:.85rem;">${labelCategoriaErro(resposta.categoriaErro)}</span>
        ` : ''}
      </div>

      ${isFiz ? `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
          <div style="text-align:center;padding:20px;background:var(--bg);border-radius:12px;border:1px solid var(--border);">
            <div style="font-size:.8rem;color:var(--text-2);margin-bottom:6px;">Seu tempo</div>
            <div style="font-size:1.75rem;font-weight:800;color:var(--primary);">${formatarTempo(resposta.tempoResposta)}</div>
          </div>
          <div style="text-align:center;padding:20px;background:var(--bg);border-radius:12px;border:1px solid var(--border);">
            <div style="font-size:.8rem;color:var(--text-2);margin-bottom:6px;">Tempo médio da turma</div>
            <div style="font-size:1.75rem;font-weight:800;color:var(--text-2);">${formatarTempo(stats.tempoMedio)}</div>
          </div>
        </div>
      ` : `
        <div class="alert alert-warning" style="margin:0;">
          <strong>Questão não finalizada</strong><br>
          O tempo desta questão foi desconsiderado das médias operacionais.
        </div>
      `}
    </div>

    <div style="display:flex;justify-content:flex-end;">
      <button class="btn btn-primary btn-lg" id="btnProximaQuestao">
        Próxima questão <i data-lucide="arrow-right" style="width:16px;height:16px;"></i>
      </button>
    </div>
  `;
}

function renderResultado(sub, lista, questoes) {
  const finalizadas = sub.respostas.filter(r => r.tipoConclusao === 'fiz');
  const mediaDif = calcularDificuldadeMedia(sub.respostas);
  const corDif = ['#22c55e', '#4ade80', '#f59e0b', '#f97316', '#ef4444'][mediaDif - 1] || '#64748b';

  const linhas = questoes.map(q => {
    const resp = sub.respostas.find(r => r.questaoId === q.id);
    const isFiz = resp?.tipoConclusao === 'fiz';
    const gabaritoOficial = q.tipo === 'multipla_escolha'
      ? (q.alternativas.find(a => a.correta)?.id?.toUpperCase() || '—')
      : q.gabaritoReferencia;

    let declaracao = '';
    if (!resp) declaracao = 'Não respondida';
    else if (isFiz) declaracao = resp.statusAutodeclarado === 'acerto' ? 'Fiz — Acertei' : 'Fiz — Errei';
    else declaracao = 'Não fiz';

    return `
      <tr>
        <td style="max-width:260px;">${stripHtml(q.enunciado).substring(0, 70)}…</td>
        <td>
          <span class="badge" style="background:#eff6ff;color:#1d4ed8;">
            Gabarito: ${gabaritoOficial}
          </span>
        </td>
        <td>
          <span class="badge ${isFiz ? (resp.statusAutodeclarado === 'acerto' ? 'badge-success' : 'badge-warning') : 'badge-gray'}">
            ${declaracao}
          </span>
        </td>
        <td>${resp ? resp.dificuldadePercebida + '/5' : '—'}</td>
      </tr>
    `;
  }).join('');

  return `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:3rem;margin-bottom:8px;">🎉</div>
      <h2 style="margin-bottom:4px;">Lista concluída!</h2>
      <p style="color:var(--text-2);">${lista.titulo}</p>
    </div>

    <div class="stats-grid" style="margin-bottom:24px;">
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
        <div style="font-size:32px;font-weight:700;color:${corDif};">${mediaDif || '—'}/5</div>
      </div>
    </div>

    <div class="card" style="padding:0;overflow:hidden;margin-bottom:24px;">
      <div class="card-header" style="padding:20px 24px;">
        <h3 class="card-title">Gabarito oficial vs. suas declarações</h3>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Enunciado</th>
              <th>Gabarito oficial</th>
              <th>Sua declaração</th>
              <th>Dificuldade</th>
            </tr>
          </thead>
          <tbody>${linhas}</tbody>
        </table>
      </div>
    </div>

    <div style="display:flex;justify-content:center;gap:12px;">
      <button class="btn btn-primary" id="btnVoltarListas">Voltar às minhas listas</button>
      <button class="btn btn-outline" id="btnVerRelatorio">Ver relatório</button>
    </div>
  `;
}

function renderAviso(mensagem) {
  document.getElementById('app').innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;">
      <div>
        <div style="font-size:3rem;margin-bottom:16px;">⚠️</div>
        <h1 style="margin-bottom:8px;">Atenção</h1>
        <p style="color:var(--text-2);margin-bottom:24px;">${mensagem}</p>
        <a href="#/estudante/listas" class="btn btn-primary">Voltar às listas</a>
      </div>
    </div>
  `;
}

export function renderEstudanteResponder(container, usuario, params = {}) {
  limparTimers();
  const app = document.getElementById('app');

  const listaId = params.listaId || params.query?.listaId;
  const lista = DB.listas.porId(listaId);

  if (!lista) { renderAviso('Lista não encontrada.'); return; }
  if (lista.status !== 'publicada') { renderAviso('Esta lista não está disponível para resposta.'); return; }

  const turmaIds = usuario.turmaIds || [];
  if (!lista.turmaIds?.some(tid => turmaIds.includes(tid))) {
    renderAviso('Você não pertence a uma turma autorizada a responder esta lista.');
    return;
  }

  const questoes = (lista.questaoIds || []).map(qid => DB.questoes.porId(qid)).filter(Boolean);
  if (!questoes.length) { renderAviso('Esta lista não possui questões.'); return; }

  let { sub } = obterOuCriarSubmissao(usuario, lista);

  if (sub.status === 'concluida') {
    app.innerHTML = renderResultado(sub, lista, questoes);
    lucide.createIcons();
    bindResultado(lista.id);
    return;
  }

  // Se já respondeu algumas, continua da próxima não respondida
  let questaoAtual = sub.respostas.length;
  const progresso = carregarProgressoLocal();
  if (progresso && progresso.submissaoId === sub.id && progresso.questaoAtual > questaoAtual) {
    questaoAtual = progresso.questaoAtual;
  }

  if (questaoAtual >= questoes.length) {
    finalizarSubmissao(sub);
    app.innerHTML = renderResultado(sub, lista, questoes);
    bindResultado(lista.id);
    return;
  }

  const turmaId = lista.turmaIds.find(tid => turmaIds.includes(tid));
  let tempoQuestao = 0;
  let tempoAcumulado = sub.tempoTotal || 0;

  function renderTelaQuestao() {
    const q = questoes[questaoAtual];
    app.innerHTML = `
      <div style="min-height:100vh;background:var(--bg);padding:24px;">
        <div style="max-width:720px;margin:0 auto;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:12px;">
            <h2 style="font-size:1.1rem;margin:0;">${lista.titulo}</h2>
            <button class="btn btn-ghost btn-sm" id="btnDesistir">Desistir</button>
          </div>
          ${renderQuestao(q, questaoAtual, questoes.length, tempoAcumulado + tempoQuestao)}
        </div>
      </div>
    `;
    lucide.createIcons();
    bindEventosQuestao(q);
    iniciarTimer();
  }

  function iniciarTimer() {
    const display = document.getElementById('timerDisplay');
    timerInterval = setInterval(() => {
      tempoQuestao++;
      tempoAcumulado++;
      if (display) display.textContent = formatarTempo(tempoAcumulado + tempoQuestao);
      salvarProgressoLocal(sub, questaoAtual, tempoAcumulado + tempoQuestao);
    }, 1000);
  }

  function bindEventosQuestao(q) {
    // Alternativas múltipla escolha
    document.querySelectorAll('.alternativa').forEach(el => {
      el.onclick = () => {
        document.querySelectorAll('.alternativa').forEach(a => a.classList.remove('selected'));
        el.classList.add('selected');
        el.querySelector('input').checked = true;
        validarFormulario();
      };
    });

    // Tabs Fiz / Não fiz
    const tabFiz = document.querySelector('.tab-fiz');
    const tabNaoFiz = document.querySelector('.tab-nao-fiz');
    const painelFiz = document.getElementById('painelFiz');
    const painelNaoFiz = document.getElementById('painelNaoFiz');

    tabFiz.onclick = () => {
      tabFiz.classList.add('active');
      tabNaoFiz.classList.remove('active');
      painelFiz.style.display = '';
      painelNaoFiz.style.display = 'none';
      validarFormulario();
    };
    tabNaoFiz.onclick = () => {
      tabNaoFiz.classList.add('active');
      tabFiz.classList.remove('active');
      painelFiz.style.display = 'none';
      painelNaoFiz.style.display = '';
      validarFormulario();
    };

    // Status autodeclarado
    document.querySelectorAll('input[name="statusAutodeclarado"]').forEach(rad => {
      rad.onchange = () => {
        const cat = document.getElementById('categoriaErroBox');
        cat.style.display = rad.value === 'erro' ? '' : 'none';
        validarFormulario();
      };
    });

    document.getElementById('categoriaErro').onchange = validarFormulario;

    // Dificuldade percebida
    const rangeDif = document.getElementById('dificuldadePercebida');
    const displayDif = document.getElementById('dificuldadePercebidaDisplay');
    rangeDif.oninput = () => {
      const val = +rangeDif.value;
      displayDif.textContent = `${val} — ${DIFICULDADE_LABELS[val - 1]}`;
      displayDif.style.color = ['#22c55e', '#4ade80', '#f59e0b', '#f97316', '#ef4444'][val - 1];
    };

    // Confirmação
    document.getElementById('btnConfirmarQuestao').onclick = () => confirmarQuestao(q);

    // Desistir
    document.getElementById('btnDesistir').onclick = async () => {
      if (confirm('Deseja sair? Seu progresso foi salvo e você pode continuar depois.')) {
        salvarProgressoLocal(sub, questaoAtual, tempoAcumulado + tempoQuestao);
        Router.navigate('/estudante/listas');
      }
    };

    validarFormulario();
  }

  function validarFormulario() {
    const tabFiz = document.querySelector('.tab-fiz').classList.contains('active');
    const dificuldade = document.getElementById('dificuldadePercebida')?.value;
    const erroEl = document.getElementById('erroConfirmar');
    let ok = true;
    let msg = '';

    if (tabFiz) {
      const status = document.querySelector('input[name="statusAutodeclarado"]:checked')?.value;
      if (status === 'erro') {
        const cat = document.getElementById('categoriaErro')?.value;
        if (!cat) { ok = false; msg = 'Selecione a categoria do erro.'; }
      }
      if (q.tipo === 'multipla_escolha') {
        if (!document.querySelector('input[name="respostaMultipla"]:checked')) {
          ok = false; msg = msg || 'Selecione uma alternativa.';
        }
      }
    }

    const btn = document.getElementById('btnConfirmarQuestao');
    btn.disabled = !ok;
    if (msg && !ok) {
      erroEl.textContent = msg;
      erroEl.style.display = '';
    } else {
      erroEl.style.display = 'none';
    }
  }

  function confirmarQuestao(q) {
    const tabFiz = document.querySelector('.tab-fiz').classList.contains('active');
    const dificuldadePercebida = parseInt(document.getElementById('dificuldadePercebida').value, 10);

    let resposta = {
      questaoId: q.id,
      tipoConclusao: tabFiz ? 'fiz' : 'nao_fiz',
      respostaEstudante: '',
      statusAutodeclarado: null,
      categoriaErro: null,
      dificuldadePercebida,
      tempoResposta: tempoQuestao,
      naoFinalizada: !tabFiz,
      lacunaConceitual: !tabFiz,
    };

    if (tabFiz) {
      const status = document.querySelector('input[name="statusAutodeclarado"]:checked')?.value;
      resposta.statusAutodeclarado = status;
      if (status === 'erro') {
        resposta.categoriaErro = document.getElementById('categoriaErro').value;
      }
      if (q.tipo === 'multipla_escolha') {
        resposta.respostaEstudante = document.querySelector('input[name="respostaMultipla"]:checked')?.value || '';
      } else {
        resposta.respostaEstudante = document.getElementById('respostaDiscursiva').value.trim();
      }
    }

    // Se não finalizou, o tempo da questão é desconsiderado? 
    // O prompt diz "O tempo desta questão é desconsiderado das médias operacionais".
    // Salvamos o tempo para audit, mas marcamos naoFinalizada=true.

    sub.respostas.push(resposta);
    sub.tempoTotal = tempoAcumulado + tempoQuestao;
    DB.submissoes.salvar(sub);

    limparTimers();

    // Tela pós-resposta
    app.innerHTML = `
      <div style="min-height:100vh;background:var(--bg);padding:24px;">
        <div style="max-width:720px;margin:0 auto;">
          ${renderPosResposta(q, resposta, turmaId)}
        </div>
      </div>
    `;
    lucide.createIcons();

    document.getElementById('btnProximaQuestao').onclick = () => {
      questaoAtual++;
      tempoQuestao = 0;
      if (questaoAtual >= questoes.length) {
        finalizarSubmissao(sub);
        app.innerHTML = renderResultado(sub, lista, questoes);
        bindResultado(lista.id);
      } else {
        renderTelaQuestao();
      }
    };
  }

  function bindResultado(listaId) {
    const btnVoltar = document.getElementById('btnVoltarListas');
    if (btnVoltar) btnVoltar.onclick = () => Router.navigate('/estudante/listas');
    const btnRel = document.getElementById('btnVerRelatorio');
    if (btnRel) btnRel.onclick = () => Router.navigate(`/estudante/relatorio?listaId=${listaId}`);
  }

  // Guarda contra saída acidental
  window.onbeforeunload = () => {
    salvarProgressoLocal(sub, questaoAtual, tempoAcumulado + tempoQuestao);
  };

  renderTelaQuestao();
}
