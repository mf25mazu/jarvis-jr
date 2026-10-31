// views/shared/questoes-core.js — Componente reutilizável do Banco de Questões

import { DB } from '../../db.js';
import { uuid, toast, confirm2, sanitize, sanitizeHtml, stripHtml, labelDificuldadeEsperada, formatarTempo } from '../../utils.js';
import { renderShell } from './shell.js';

export const TIPO_LABEL = {
  multipla_escolha: 'Múltipla Escolha (A–E)',
  resposta_curta: 'Resposta Curta',
  discursiva: 'Discursiva',
};

const ALT_KEYS = ['a', 'b', 'c', 'd', 'e'];

export function safeHtml(texto) {
  return sanitizeHtml(texto);
}

// ─── MODAL CRIAR / EDITAR ───────────────────────────────────────────────────

export function abrirModalQuestao(usuario, questaoExistente, onSalvo) {
  const isEdit = !!questaoExistente;
  const q = questaoExistente || {
    alternativas: [
      { id: 'a', texto: '', correta: false },
      { id: 'b', texto: '', correta: false },
      { id: 'c', texto: '', correta: false },
      { id: 'd', texto: '', correta: false },
    ],
    tipo: 'multipla_escolha',
    dificuldadeEsperada: 3,
    tempoEsperado: 120,
  };

  const disciplinasExistentes = DB.questoes.disciplinasPorEscola(usuario.escolaId);

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'modalQuestao';
  modal.innerHTML = `
    <div class="modal" style="max-width:760px;max-height:92vh;overflow-y:auto;">
      <div class="modal-header">
        <h3>${isEdit ? 'Editar Questão' : 'Nova Questão'}</h3>
        <button class="modal-close" id="fecharModal">
          <i data-lucide="x" style="width:18px;height:18px;"></i>
        </button>
      </div>
      <div class="modal-body">

        <div class="form-group">
          <label class="form-label">Enunciado *</label>
          <div class="rich-toolbar" style="display:flex;gap:4px;padding:6px;border:1.5px solid var(--border);border-bottom:none;border-radius:8px 8px 0 0;background:var(--bg);flex-wrap:wrap;">
            <button type="button" class="rt-btn" data-cmd="bold" title="Negrito"><b>B</b></button>
            <button type="button" class="rt-btn" data-cmd="italic" title="Itálico"><i>I</i></button>
            <button type="button" class="rt-btn" data-cmd="underline" title="Sublinhado"><u>U</u></button>
            <button type="button" class="rt-btn" data-cmd="strikeThrough" title="Tachado"><s>S</s></button>
            <span style="border-left:1px solid var(--border);margin:0 4px;"></span>
            <button type="button" class="rt-btn" data-cmd="insertUnorderedList" title="Lista">• Lista</button>
            <button type="button" class="rt-btn" data-cmd="insertOrderedList" title="Numeração">1. Lista</button>
            <span style="border-left:1px solid var(--border);margin:0 4px;"></span>
            <button type="button" class="rt-btn" data-cmd="superscript" title="Sobrescrito">x²</button>
            <button type="button" class="rt-btn" data-cmd="subscript" title="Subscrito">x₂</button>
          </div>
          <div id="qEnunciado" contenteditable="true" class="form-control" style="min-height:120px;border-radius:0 0 8px 8px;">${isEdit ? safeHtml(q.enunciado) : '<p><br></p>'}</div>
          <div class="form-hint">Use o editor acima para formatar o enunciado. Imagens podem ser anexadas abaixo.</div>
        </div>

        <div class="form-group">
          <label class="form-label">Imagem do enunciado (opcional)</label>
          <div id="previewImagem" style="display:${q.imagem ? 'block' : 'none'};margin-bottom:10px;">
            ${q.imagem ? `<img src="${sanitize(q.imagem)}" style="max-height:160px;border-radius:8px;border:1px solid var(--border);">` : ''}
          </div>
          <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
            <label class="btn btn-outline" style="cursor:pointer;">
              <i data-lucide="image" style="width:14px;height:14px;"></i> Anexar imagem
              <input type="file" id="qImagem" accept="image/*" style="display:none;">
            </label>
            <button type="button" class="btn btn-ghost" id="removerImagem" style="${q.imagem ? '' : 'display:none;'}">Remover imagem</button>
          </div>
          <input type="hidden" id="qImagemData" value="${sanitize(q.imagem || '')}">
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="form-group">
            <label class="form-label">Matéria / Disciplina *</label>
            <input class="form-control" id="qDisciplina" type="text" list="listaDisciplinas" placeholder="Ex: Matemática" value="${sanitize(q.disciplina || '')}">
            <datalist id="listaDisciplinas">
              ${disciplinasExistentes.map(d => `<option value="${sanitize(d)}">`).join('')}
            </datalist>
          </div>
          <div class="form-group">
            <label class="form-label">Tópico</label>
            <input class="form-control" id="qTopico" type="text" placeholder="Ex: Álgebra" value="${sanitize(q.topico || '')}">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Dificuldade Esperada (D<sub>esperada</sub>) *</label>
          <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
            <input type="range" id="qDificuldade" min="1" max="5" step="1" value="${q.dificuldadeEsperada || 3}" style="flex:1;min-width:180px;">
            <div id="dificuldadeDisplay" style="font-weight:700;color:var(--primary);white-space:nowrap;">${labelDificuldadeEsperada(q.dificuldadeEsperada || 3)}</div>
          </div>
          <div class="form-hint">1 = Muito Fácil · 5 = Muito Difícil. Esse valor será preservado imutável ao vincular a uma lista.</div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="form-group">
            <label class="form-label">Tempo Esperado de Resolução (segundos) *</label>
            <div style="display:flex;gap:8px;">
              <input class="form-control" id="qTempoEsperado" type="number" min="5" step="5" value="${q.tempoEsperado || 60}" style="flex:1;">
              <select class="form-control" id="qTempoUnidade" style="width:auto;min-width:90px;">
                <option value="s">Segundos</option>
                <option value="m">Minutos</option>
              </select>
            </div>
            <div class="form-hint" id="tempoHint">${formatarTempo(q.tempoEsperado || 60)}</div>
          </div>
          <div class="form-group">
            <label class="form-label">Tipo de Questão *</label>
            <select class="form-control" id="qTipo">
              <option value="multipla_escolha" ${q.tipo === 'multipla_escolha' ? 'selected' : ''}>Múltipla Escolha (A–E)</option>
              <option value="resposta_curta" ${q.tipo === 'resposta_curta' ? 'selected' : ''}>Resposta Curta</option>
              <option value="discursiva" ${q.tipo === 'discursiva' ? 'selected' : ''}>Discursiva</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Gabarito de Referência *</label>
          <input class="form-control" id="qGabarito" type="text" placeholder="Resposta correta esperada (apoio ao professor/corretor)" value="${sanitize(q.gabaritoReferencia || '')}">
          <div class="form-hint">Texto-base da resposta correta. Para múltipla escolha, também marque a alternativa correta abaixo.</div>
        </div>

        <div id="secaoAlternativas" class="form-group" style="${q.tipo !== 'multipla_escolha' ? 'display:none;' : ''}">
          <label class="form-label">Alternativas (A–E)</label>
          <div id="listaAlternativas" style="display:flex;flex-direction:column;gap:8px;">
          </div>
        </div>

      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="cancelarModal">Cancelar</button>
        <button class="btn btn-primary" id="salvarModal">
          <i data-lucide="save" style="width:14px;height:14px;"></i> Salvar
        </button>
      </div>
    </div>
    <style>
      .rt-btn { padding: 4px 10px; border: 1px solid var(--border); background: #fff; border-radius: 6px; cursor: pointer; font-size: .8rem; color: var(--text); }
      .rt-btn:hover { background: var(--primary-l); border-color: var(--primary); }
      .alt-row { display: flex; align-items: center; gap: 8px; }
      .alt-key-badge { width: 28px; height: 28px; border-radius: 6px; background: var(--border); display: flex; align-items: center; justify-content: center; font-size: .8rem; font-weight: 700; flex-shrink: 0; }
    </style>
  `;
  document.body.appendChild(modal);
  window.lucide?.createIcons?.();

  // Editor rico
  const editor = modal.querySelector('#qEnunciado');
  modal.querySelectorAll('.rt-btn').forEach(btn => {
    btn.onclick = () => {
      document.execCommand(btn.dataset.cmd, false, null);
      editor.focus();
    };
  });

  // Imagem
  const inputImagem = modal.querySelector('#qImagem');
  const previewImagem = modal.querySelector('#previewImagem');
  const imagemData = modal.querySelector('#qImagemData');
  const btnRemoverImagem = modal.querySelector('#removerImagem');

  inputImagem.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast('Imagem deve ter até 2 MB.', 'error'); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target.result;
      imagemData.value = dataUrl;
      previewImagem.innerHTML = `<img src="${sanitize(dataUrl)}" style="max-height:160px;border-radius:8px;border:1px solid var(--border);">`;
      previewImagem.style.display = 'block';
      btnRemoverImagem.style.display = '';
    };
    reader.readAsDataURL(file);
  };

  btnRemoverImagem.onclick = () => {
    imagemData.value = '';
    previewImagem.innerHTML = '';
    previewImagem.style.display = 'none';
    btnRemoverImagem.style.display = 'none';
    inputImagem.value = '';
  };

  // Dificuldade
  const rangeDif = modal.querySelector('#qDificuldade');
  const displayDif = modal.querySelector('#dificuldadeDisplay');
  rangeDif.oninput = () => {
    displayDif.textContent = labelDificuldadeEsperada(+rangeDif.value);
    displayDif.style.color = ['#22c55e', '#4ade80', '#f59e0b', '#f97316', '#ef4444'][+rangeDif.value - 1];
  };
  displayDif.style.color = ['#22c55e', '#4ade80', '#f59e0b', '#f97316', '#ef4444'][+rangeDif.value - 1];

  // Tempo
  const inputTempo = modal.querySelector('#qTempoEsperado');
  const selUnidade = modal.querySelector('#qTempoUnidade');
  const tempoHint = modal.querySelector('#tempoHint');
  function atualizaTempoHint() {
    let s = parseInt(inputTempo.value) || 0;
    if (selUnidade.value === 'm') s = s * 60;
    tempoHint.textContent = formatarTempo(s);
  }
  if ((q.tempoEsperado || 60) >= 60 && (q.tempoEsperado || 60) % 60 === 0) {
    selUnidade.value = 'm';
    inputTempo.value = Math.floor((q.tempoEsperado || 60) / 60);
  }
  inputTempo.oninput = atualizaTempoHint;
  selUnidade.onchange = atualizaTempoHint;
  atualizaTempoHint();

  // Alternativas
  let alternativas = ALT_KEYS.map(k => {
    const existente = (q.alternativas || []).find(a => a.id === k);
    return { id: k, texto: existente?.texto || '', correta: existente?.correta || false };
  });
  const listaAlts = modal.querySelector('#listaAlternativas');
  const secaoAlts = modal.querySelector('#secaoAlternativas');
  const selTipo = modal.querySelector('#qTipo');

  function renderAlts() {
    listaAlts.innerHTML = alternativas.map(a => `
      <div class="alt-row" data-id="${a.id}">
        <span class="alt-key-badge">${a.id.toUpperCase()}</span>
        <input type="text" class="form-control alt-texto" data-id="${a.id}" placeholder="Texto da alternativa ${a.id.toUpperCase()}" value="${sanitize(a.texto || '')}">
        <label style="display:flex;align-items:center;gap:6px;white-space:nowrap;cursor:pointer;font-size:.85rem;">
          <input type="radio" name="altCorreta" class="alt-correta" value="${a.id}" ${a.correta ? 'checked' : ''}> Correta
        </label>
      </div>
    `).join('');

    listaAlts.querySelectorAll('.alt-texto').forEach(inp => {
      inp.oninput = e => {
        const a = alternativas.find(x => x.id === e.target.dataset.id);
        if (a) a.texto = e.target.value;
      };
    });
    listaAlts.querySelectorAll('.alt-correta').forEach(rad => {
      rad.onchange = e => {
        alternativas.forEach(a => { a.correta = (a.id === e.target.value); });
      };
    });
  }

  selTipo.onchange = () => {
    secaoAlts.style.display = selTipo.value === 'multipla_escolha' ? '' : 'none';
  };
  renderAlts();

  // Fechar
  const fechar = () => document.body.removeChild(modal);
  modal.querySelector('#fecharModal').onclick = fechar;
  modal.querySelector('#cancelarModal').onclick = fechar;
  modal.onclick = e => { if (e.target === modal) fechar(); };

  // Salvar
  modal.querySelector('#salvarModal').onclick = () => {
    const enunciadoHtml = sanitizeHtml(editor.innerHTML).trim();
    const enunciadoTexto = stripHtml(enunciadoHtml);
    const disciplina = modal.querySelector('#qDisciplina').value.trim();
    const topico = modal.querySelector('#qTopico').value.trim();
    const dificuldadeEsperada = parseInt(modal.querySelector('#qDificuldade').value, 10);
    let tempoEsperado = parseInt(modal.querySelector('#qTempoEsperado').value, 10) || 0;
    if (selUnidade.value === 'm') tempoEsperado = tempoEsperado * 60;
    const tipo = selTipo.value;
    const gabaritoReferencia = modal.querySelector('#qGabarito').value.trim();
    const imagem = imagemData.value.trim() || null;

    if (!enunciadoTexto) { toast('Informe o enunciado da questão.', 'error'); return; }
    if (!disciplina) { toast('Informe a disciplina.', 'error'); return; }
    if (tempoEsperado < 5) { toast('O tempo esperado deve ser de pelo menos 5 segundos.', 'error'); return; }
    if (!gabaritoReferencia) { toast('Informe o gabarito de referência.', 'error'); return; }

    if (tipo === 'multipla_escolha') {
      const altsPreenchidas = alternativas.filter(a => a.texto.trim());
      if (altsPreenchidas.length < 2) { toast('Preencha pelo menos 2 alternativas.', 'error'); return; }
      const temCorreta = alternativas.some(a => a.correta && a.texto.trim());
      if (!temCorreta) { toast('Marque uma alternativa preenchida como correta.', 'error'); return; }
    }

    const questao = {
      ...(isEdit ? q : {}),
      id: isEdit ? q.id : uuid(),
      enunciado: enunciadoHtml,
      imagem,
      disciplina,
      topico,
      dificuldadeEsperada,
      tempoEsperado,
      gabaritoReferencia,
      tipo,
      alternativas: tipo === 'multipla_escolha' ? alternativas.map(a => ({ ...a })) : [],
      escolaId: usuario.escolaId,
      criadoPorId: usuario.id,
      criadoEm: isEdit ? q.criadoEm : Date.now(),
    };

    DB.questoes.salvar(questao);
    toast(isEdit ? 'Questão atualizada!' : 'Questão criada!', 'success');
    fechar();
    onSalvo();
  };
}

// ─── MODAL GABARITO ─────────────────────────────────────────────────────────

export function abrirModalGabarito(questao) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal" style="max-width:560px;">
      <div class="modal-header">
        <h3>Gabarito de Referência</h3>
        <button class="modal-close" id="fecharModal">
          <i data-lucide="x" style="width:18px;height:18px;"></i>
        </button>
      </div>
      <div class="modal-body">
        <div style="padding:12px;border:1px solid var(--border);border-radius:8px;background:var(--bg);margin-bottom:16px;max-height:180px;overflow:auto;">
          ${questao.enunciado || '<p><em>Sem enunciado.</em></p>'}
        </div>
        ${questao.tipo === 'multipla_escolha'
          ? `<div style="display:flex;flex-direction:column;gap:8px;">
              ${(questao.alternativas || []).map(a => `
                <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:6px;
                  background:${a.correta ? '#dcfce7' : 'var(--surface)'};border:1px solid ${a.correta ? '#86efac' : 'var(--border)'};">
                  <span style="font-weight:700;color:${a.correta ? '#16a34a' : 'var(--text-2)'};">${a.id.toUpperCase()}</span>
                  <span style="flex:1;${a.correta ? 'font-weight:600;' : ''}">${sanitize(a.texto)}</span>
                  ${a.correta ? '<span style="font-size:.8rem;color:#16a34a;font-weight:600;">✓ Correta</span>' : ''}
                </div>
              `).join('')}
            </div>`
          : `<div style="padding:12px;border-radius:8px;background:#eff6ff;border:1px solid #bfdbfe;">
              <div style="font-size:.75rem;font-weight:700;text-transform:uppercase;color:#1d4ed8;margin-bottom:4px;">Resposta de referência</div>
              <div style="font-size:.9rem;color:#1e293b;">${sanitize(questao.gabaritoReferencia)}</div>
            </div>`
        }
        <div style="margin-top:16px;display:flex;gap:12px;flex-wrap:wrap;font-size:.85rem;color:var(--text-2);">
          <span><strong>Dificuldade esperada:</strong> ${questao.dificuldadeEsperada}/5</span>
          <span><strong>Tempo esperado:</strong> ${formatarTempo(questao.tempoEsperado)}</span>
          <span><strong>Tipo:</strong> ${TIPO_LABEL[questao.tipo] || questao.tipo}</span>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-primary" id="fecharBtn">Fechar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  window.lucide?.createIcons?.();

  const fechar = () => document.body.removeChild(modal);
  modal.querySelector('#fecharModal').onclick = fechar;
  modal.querySelector('#fecharBtn').onclick = fechar;
  modal.onclick = e => { if (e.target === modal) fechar(); };
}

// ─── MODAL ESTATÍSTICA ─────────────────────────────────────────────────────

export function abrirModalEstatistica(questao) {
  const subs = DB.submissoes.todas().filter(s =>
    s.status === 'concluida' && s.respostas?.some(r => r.questaoId === questao.id)
  );
  const respQuestao = subs.flatMap(s => s.respostas.filter(r => r.questaoId === questao.id));
  const total = respQuestao.length;
  const acertos = respQuestao.filter(r => r.correta).length;
  const taxa = total ? Math.round((acertos / total) * 100) : 0;
  const tempoMedio = total ? Math.round(respQuestao.reduce((a, b) => a + (b.tempoResposta || 0), 0) / total) : 0;

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal" style="max-width:480px;">
      <div class="modal-header">
        <h3>Desempenho da Questão</h3>
        <button class="modal-close" id="fecharModal">
          <i data-lucide="x" style="width:18px;height:18px;"></i>
        </button>
      </div>
      <div class="modal-body">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px;">
          <div style="text-align:center;padding:12px;background:var(--bg);border-radius:8px;">
            <div style="font-size:1.5rem;font-weight:800;color:var(--primary);">${total}</div>
            <div style="font-size:.75rem;color:var(--text-2);">Respostas</div>
          </div>
          <div style="text-align:center;padding:12px;background:var(--bg);border-radius:8px;">
            <div style="font-size:1.5rem;font-weight:800;color:${taxa >= 70 ? 'var(--success)' : taxa >= 40 ? 'var(--warning)' : 'var(--danger)'}">${taxa}%</div>
            <div style="font-size:.75rem;color:var(--text-2);">Acerto</div>
          </div>
          <div style="text-align:center;padding:12px;background:var(--bg);border-radius:8px;">
            <div style="font-size:1.5rem;font-weight:800;color:var(--text);">${formatarTempo(tempoMedio)}</div>
            <div style="font-size:.75rem;color:var(--text-2);">Tempo médio</div>
          </div>
        </div>
        <div style="padding:14px;border-radius:8px;background:#f8fafc;border:1px solid var(--border);">
          <div style="font-size:.75rem;font-weight:700;text-transform:uppercase;color:var(--text-3);margin-bottom:6px;">Dificuldade esperada vs. observada</div>
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
            <div style="flex:1;">
              <div style="font-size:.75rem;color:var(--text-2);">Esperada</div>
              <div style="font-size:1.25rem;font-weight:800;">${questao.dificuldadeEsperada}/5</div>
            </div>
            <div style="font-size:1.5rem;color:var(--text-3);">→</div>
            <div style="flex:1;">
              <div style="font-size:.75rem;color:var(--text-2);">Observada</div>
              <div style="font-size:1.25rem;font-weight:800;">${total ? (5 - (taxa / 100) * 4).toFixed(1) : '—'}/5</div>
            </div>
          </div>
          <div style="font-size:.85rem;color:var(--text-2);">A dificuldade esperada original é preservada imutável em todas as listas.</div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-primary" id="fecharBtn">Fechar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  window.lucide?.createIcons?.();

  const fechar = () => document.body.removeChild(modal);
  modal.querySelector('#fecharModal').onclick = fechar;
  modal.querySelector('#fecharBtn').onclick = fechar;
  modal.onclick = e => { if (e.target === modal) fechar(); };
}

// ─── VIEW PRINCIPAL ──────────────────────────────────────────────────────────

export function renderBancoQuestoes({ usuario, navItems, titulo, subtitulo }) {
  let filtroDisciplina = '';
  let filtroDificuldade = '';
  let filtroTipo = '';
  let busca = '';

  function renderizar() {
    const todasQuestoes = DB.questoes.porEscola(usuario.escolaId);
    const disciplinas = [...new Set(todasQuestoes.map(q => q.disciplina).filter(Boolean))].sort();

    const filtradas = todasQuestoes.filter(q => {
      const okDisc = !filtroDisciplina || q.disciplina === filtroDisciplina;
      const okDif = !filtroDificuldade || q.dificuldadeEsperada === parseInt(filtroDificuldade, 10);
      const okTipo = !filtroTipo || q.tipo === filtroTipo;
      const texto = stripHtml(q.enunciado).toLowerCase();
      const okBusca = !busca || texto.includes(busca.toLowerCase()) || q.disciplina?.toLowerCase().includes(busca.toLowerCase());
      return okDisc && okDif && okTipo && okBusca;
    });

    const linhas = filtradas.map(q => {
      const texto = stripHtml(q.enunciado) || '';
      const enunciadoCurto = texto.length > 70 ? texto.substring(0, 70) + '…' : texto;
      const cor = ['#22c55e', '#4ade80', '#f59e0b', '#f97316', '#ef4444'][q.dificuldadeEsperada - 1] || '#64748b';
      const tipoLabel = TIPO_LABEL[q.tipo] || q.tipo;
      return `
        <tr>
          <td style="max-width:300px;" title="${sanitize(texto)}">
            <div style="font-weight:500;">${sanitize(enunciadoCurto)}</div>
            ${q.imagem ? '<span style="font-size:.7rem;color:var(--text-3);">🖼️ Com imagem</span>' : ''}
          </td>
          <td>${sanitize(q.disciplina || '—')}</td>
          <td>${sanitize(q.topico || '—')}</td>
          <td>
            <span class="badge" style="background:${cor}20;color:${cor};">
              ${q.dificuldadeEsperada}/5
            </span>
          </td>
          <td>${formatarTempo(q.tempoEsperado)}</td>
          <td>${tipoLabel}</td>
          <td style="display:flex;gap:6px;">
            <button class="btn btn-sm btn-secondary btn-stats-q" data-id="${q.id}" title="Estatísticas">
              <i data-lucide="bar-chart-2" style="width:13px;height:13px;"></i>
            </button>
            <button class="btn btn-sm btn-secondary btn-gabarito" data-id="${q.id}" title="Ver gabarito">
              <i data-lucide="key" style="width:13px;height:13px;"></i>
            </button>
            <button class="btn btn-sm btn-secondary btn-edit-q" data-id="${q.id}" title="Editar">
              <i data-lucide="pencil" style="width:13px;height:13px;"></i>
            </button>
            <button class="btn btn-sm btn-danger btn-del-q" data-id="${q.id}" title="Excluir">
              <i data-lucide="trash-2" style="width:13px;height:13px;"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    const conteudo = `
      <div class="card">
        <div class="card-header" style="flex-wrap:wrap;gap:12px;">
          <h3 class="card-title">Banco de Questões</h3>
          <div style="display:flex;align-items:center;gap:8px;margin-left:auto;flex-wrap:wrap;">
            <input type="text" class="form-control" id="buscaQuestao" placeholder="Buscar enunciado ou disciplina..." value="${sanitize(busca)}" style="width:auto;min-width:180px;">
            <select class="form-select" id="filtroDisc" style="width:auto;min-width:150px;">
              <option value="">Todas as disciplinas</option>
              ${disciplinas.map(d => `<option value="${sanitize(d)}" ${d === filtroDisciplina ? 'selected' : ''}>${sanitize(d)}</option>`).join('')}
            </select>
            <select class="form-select" id="filtroDif" style="width:auto;min-width:150px;">
              <option value="">Todas as dificuldades</option>
              <option value="1" ${filtroDificuldade === '1' ? 'selected' : ''}>1 — Muito Fácil</option>
              <option value="2" ${filtroDificuldade === '2' ? 'selected' : ''}>2 — Fácil</option>
              <option value="3" ${filtroDificuldade === '3' ? 'selected' : ''}>3 — Médio</option>
              <option value="4" ${filtroDificuldade === '4' ? 'selected' : ''}>4 — Difícil</option>
              <option value="5" ${filtroDificuldade === '5' ? 'selected' : ''}>5 — Muito Difícil</option>
            </select>
            <select class="form-select" id="filtroTipo" style="width:auto;min-width:150px;">
              <option value="">Todos os tipos</option>
              <option value="multipla_escolha" ${filtroTipo === 'multipla_escolha' ? 'selected' : ''}>Múltipla Escolha</option>
              <option value="resposta_curta" ${filtroTipo === 'resposta_curta' ? 'selected' : ''}>Resposta Curta</option>
              <option value="discursiva" ${filtroTipo === 'discursiva' ? 'selected' : ''}>Discursiva</option>
            </select>
            <button class="btn btn-primary" id="btnNovaQuestao">
              <i data-lucide="plus" style="width:15px;height:15px;"></i> Nova Questão
            </button>
          </div>
        </div>
        ${filtradas.length === 0 ? `
          <div class="empty-state">
            <i data-lucide="file-question" style="width:32px;height:32px;opacity:.4;"></i>
            <p>Nenhuma questão encontrada.</p>
          </div>
        ` : `
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Enunciado</th>
                  <th>Disciplina</th>
                  <th>Tópico</th>
                  <th>Dificuldade</th>
                  <th>Tempo</th>
                  <th>Tipo</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>${linhas}</tbody>
            </table>
          </div>
          <div style="padding:12px 16px;font-size:.82rem;color:var(--text-muted);">
            ${filtradas.length} questão${filtradas.length !== 1 ? 'ões' : ''} encontrada${filtradas.length !== 1 ? 's' : ''}.
          </div>
        `}
      </div>

      <div class="card" style="margin-top:24px;">
        <div class="card-header">
          <h3 class="card-title">Legenda de Dificuldade Esperada</h3>
        </div>
        <div style="padding:16px 24px;">
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            ${[1, 2, 3, 4, 5].map(n => {
              const cor = ['#22c55e', '#4ade80', '#f59e0b', '#f97316', '#ef4444'][n - 1];
              return `<span class="badge" style="background:${cor}20;color:${cor};font-size:.8rem;">${n} — ${labelDificuldadeEsperada(n).split(' — ')[1]}</span>`;
            }).join('')}
          </div>
          <p style="margin-top:12px;font-size:.85rem;color:var(--text-2);">
            <strong>Regra de Imutabilidade:</strong> a dificuldade esperada original (D<sub>esperada</sub>) é congelada no momento em que a questão é atribuída a uma lista, servindo de parâmetro fixo para o cálculo do ΔD.
          </p>
        </div>
      </div>
    `;

    renderShell({ usuario, navItems, titulo, subtitulo, conteudo });

    document.getElementById('buscaQuestao').oninput = e => { busca = e.target.value; renderizar(); };
    document.getElementById('filtroDisc').onchange = e => { filtroDisciplina = e.target.value; renderizar(); };
    document.getElementById('filtroDif').onchange = e => { filtroDificuldade = e.target.value; renderizar(); };
    document.getElementById('filtroTipo').onchange = e => { filtroTipo = e.target.value; renderizar(); };
    document.getElementById('btnNovaQuestao').onclick = () => {
      abrirModalQuestao(usuario, null, renderizar);
    };

    document.querySelectorAll('.btn-stats-q').forEach(btn => {
      btn.onclick = () => {
        const q = DB.questoes.porId(btn.dataset.id);
        if (q) abrirModalEstatistica(q);
      };
    });
    document.querySelectorAll('.btn-gabarito').forEach(btn => {
      btn.onclick = () => {
        const q = DB.questoes.porId(btn.dataset.id);
        if (q) abrirModalGabarito(q);
      };
    });
    document.querySelectorAll('.btn-edit-q').forEach(btn => {
      btn.onclick = () => {
        const q = DB.questoes.porId(btn.dataset.id);
        if (q) abrirModalQuestao(usuario, q, renderizar);
      };
    });
    document.querySelectorAll('.btn-del-q').forEach(btn => {
      btn.onclick = async () => {
        const ok = await confirm2('Excluir esta questão? Ela pode estar em uso em listas ativas.');
        if (!ok) return;
        DB.questoes.remover(btn.dataset.id);
        toast('Questão excluída.', 'success');
        renderizar();
      };
    });
  }

  renderizar();
}
