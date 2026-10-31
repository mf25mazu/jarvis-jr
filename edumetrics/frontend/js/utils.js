// utils.js — Helpers, UUID, formatação

export function uuid() {
  return 'xxxx-xxxx-4xxx-yxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

export function hashSenha(senha) {
  let hash = 0;
  for (let i = 0; i < senha.length; i++) {
    const char = senha.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash.toString(36);
}

export function formatarData(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
}

export function formatarDataHora(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

export function formatarTempo(segundos) {
  if (!segundos && segundos !== 0) return '—';
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

export function pct(valor, total) {
  if (!total) return 0;
  return Math.round((valor / total) * 100);
}

export function media(arr) {
  if (!arr || !arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function desvio(arr) {
  if (!arr || arr.length < 2) return 0;
  const m = media(arr);
  const variance = arr.reduce((acc, v) => acc + (v - m) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

export function mediasMoveis(arr, janela) {
  return arr.map((_, i) => {
    if (i < janela - 1) return null;
    const slice = arr.slice(i - janela + 1, i + 1);
    return media(slice);
  });
}

export function corDificuldade(d) {
  return { facil: '#22c55e', medio: '#f59e0b', dificil: '#ef4444' }[d] || '#64748b';
}

export function labelDificuldade(d) {
  return { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil' }[d] || d;
}

// Escala 1–5 de dificuldade esperada (D_esperada)
const DIFICULDADE_CORES = ['#22c55e', '#4ade80', '#f59e0b', '#f97316', '#ef4444'];
const DIFICULDADE_ROTULOS = ['1 — Muito Fácil', '2 — Fácil', '3 — Médio', '4 — Difícil', '5 — Muito Difícil'];

export function corDificuldadeEsperada(d) {
  return DIFICULDADE_CORES[Math.max(1, Math.min(5, d || 3)) - 1] || '#64748b';
}

export function labelDificuldadeEsperada(d) {
  return DIFICULDADE_ROTULOS[Math.max(1, Math.min(5, d || 3)) - 1] || d;
}

export function calcularDeltaD(dEsperada, taxaAcerto) {
  // D_observada: mapeia taxa de acerto (0–100) para escala 1–5
  // 100% -> 1, 0% -> 5 (quanto menor a taxa, mais difícil a questão foi para os alunos)
  const dObservada = 5 - (taxaAcerto / 100) * 4;
  return +(dObservada - dEsperada).toFixed(2);
}

export function interpretarDeltaD(delta) {
  if (delta <= -1.5) return { label: 'Mais fácil que o esperado', cor: '#22c55e' };
  if (delta <= -0.5) return { label: 'Ligeiramente mais fácil', cor: '#4ade80' };
  if (delta < 0.5)   return { label: 'Alinhada à expectativa', cor: '#64748b' };
  if (delta < 1.5)   return { label: 'Ligeiramente mais difícil', cor: '#f59e0b' };
  return { label: 'Mais difícil que o esperado', cor: '#ef4444' };
}

export function stripHtml(html) {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

// Estatísticas de uma questão dentro de uma turma (submissões concluídas)
// Recebe o DB para evitar import cíclico em ES modules
export function estatisticasQuestaoTurma(DB, questaoId, turmaId) {
  const submissoes = DB.submissoes.todas().filter(s =>
    s.status === 'concluida' &&
    s.respostas?.some(r => r.questaoId === questaoId) &&
    DB.usuarios.porId(s.estudanteId)?.turmaIds?.includes(turmaId)
  );
  const respostas = submissoes.flatMap(s => s.respostas.filter(r => r.questaoId === questaoId && !r.naoFinalizada));
  const total = respostas.length;
  const acertos = respostas.filter(r => r.statusAutodeclarado === 'acerto').length;
  const tempoMedio = total ? Math.round(respostas.reduce((a, r) => a + (r.tempoResposta || 0), 0) / total) : 0;
  return {
    total,
    acertos,
    taxaAcerto: total ? Math.round((acertos / total) * 100) : 0,
    tempoMedio,
  };
}

export function labelCategoriaErro(c) {
  return {
    falta_teoria: 'Falta de Teoria',
    erro_conta: 'Erro de Conta',
    interpretacao: 'Interpretação de Texto',
    falta_atencao: 'Falta de Atenção',
  }[c] || c;
}

export function corDificuldadePercebida(d) {
  return ['#22c55e', '#4ade80', '#f59e0b', '#f97316', '#ef4444'][Math.max(1, Math.min(5, d || 3)) - 1] || '#64748b';
}

// ─── Análise por Janelas Acumuladas ─────────────────────────────────────────

function submissoesOrdenadas(submissoes) {
  return [...submissoes].filter(s => s.status === 'concluida' && s.dataFim).sort((a, b) => a.dataFim - b.dataFim);
}

function janela(submissoes, n) {
  const ord = submissoesOrdenadas(submissoes);
  return ord.slice(-n);
}

export function mediaMovelAcertos(submissoes, n) {
  const slice = janela(submissoes, n);
  if (!slice.length) return 0;
  return Math.round(media(slice.map(s => pct(s.pontuacao, s.totalQuestoes))));
}

export function taxaNaoFiz(submissoes, n) {
  const slice = janela(submissoes, n);
  if (!slice.length) return 0;
  const total = slice.reduce((acc, s) => acc + (s.respostas?.length || 0), 0);
  const naoFiz = slice.reduce((acc, s) => acc + (s.respostas?.filter(r => r.naoFinalizada).length || 0), 0);
  return total ? Math.round((naoFiz / total) * 100) : 0;
}

export function evolucaoTiposErro(submissoes, n) {
  const slice = janela(submissoes, n);
  const categorias = { falta_teoria: 0, erro_conta: 0, interpretacao: 0, falta_atencao: 0 };
  slice.forEach(s => {
    (s.respostas || []).forEach(r => {
      if (r.tipoConclusao === 'fiz' && r.statusAutodeclarado === 'erro' && r.categoriaErro) {
        categorias[r.categoriaErro] = (categorias[r.categoriaErro] || 0) + 1;
      }
    });
  });
  const total = Object.values(categorias).reduce((a, b) => a + b, 0);
  return Object.entries(categorias).map(([id, valor]) => ({
    id, valor, pct: total ? Math.round((valor / total) * 100) : 0,
  }));
}

// ΔD = D_percebida média dos estudantes - D_esperada do professor
// Recebe DB para evitar import cíclico
export function calcularDeltaDPercebida(DB, submissao, lista) {
  if (!submissao || !lista) return 0;
  const finalizadas = submissao.respostas?.filter(r => r.tipoConclusao === 'fiz' && r.dificuldadePercebida);
  if (!finalizadas?.length) return 0;
  const dPercebidaMedia = finalizadas.reduce((a, r) => a + r.dificuldadePercebida, 0) / finalizadas.length;
  // D_esperada da lista = média das dificuldades esperadas do snapshot ou das questões
  const questoes = (lista.questaoIds || []).map(qid => DB.questoes.porId(qid)).filter(Boolean);
  const snapshot = lista.questoesSnapshot || [];
  const dEsperada = snapshot.length
    ? media(snapshot.map(s => s.dificuldadeEsperada || 0))
    : media(questoes.map(q => q.dificuldadeEsperada || 0));
  return +(dPercebidaMedia - dEsperada).toFixed(2);
}

export function mediaDeltaD(DB, submissoes, listasMap, n) {
  const slice = janela(submissoes, n);
  if (!slice.length) return 0;
  const deltas = slice.map(s => {
    const lista = listasMap[s.listaId] || DB.listas.porId(s.listaId);
    return calcularDeltaDPercebida(DB, s, lista);
  }).filter(v => v !== null);
  return deltas.length ? +(media(deltas).toFixed(2)) : 0;
}

// Ritmo = média móvel atual - média móvel da janela anterior
export function ritmoAprendizagem(submissoes, n) {
  const ord = submissoesOrdenadas(submissoes);
  if (ord.length < n * 2) return null;
  const atual = mediaMovelAcertos(ord.slice(-n), n);
  const anteriorSlice = ord.slice(-(n * 2), -n);
  if (!anteriorSlice.length) return null;
  const anterior = mediaMovelAcertos(anteriorSlice, n);
  return atual - anterior;
}

// Regra de privacidade: turma só exibe comparativos com ≥ 5 estudantes concluintes
export function turmaComparavel(listaId, turmaId, DB) {
  const estudantes = DB.usuarios.porTurma(turmaId, 'estudante');
  const concluintes = estudantes.filter(e => {
    const sub = DB.submissoes.porEstudanteELista(e.id, listaId);
    return sub?.status === 'concluida';
  }).length;
  return concluintes >= 5;
}

export function toast(msg, tipo = 'info') {
  const cores = { success: '#22c55e', error: '#ef4444', info: '#3b82f6', warning: '#f59e0b' };
  const el = document.createElement('div');
  el.className = 'toast';
  el.style.cssText = `
    position:fixed;bottom:24px;right:24px;z-index:9999;
    background:${cores[tipo]};color:#fff;padding:12px 20px;border-radius:10px;
    font-size:14px;font-weight:500;box-shadow:0 4px 20px rgba(0,0,0,.2);
    animation:slideIn .3s ease;max-width:320px;
  `;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

export function confirm2(msg) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:10000;
      display:flex;align-items:center;justify-content:center;
    `;
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:16px;padding:32px;max-width:380px;width:90%;text-align:center;">
        <p style="margin:0 0 24px;font-size:16px;color:#1e293b;">${msg}</p>
        <div style="display:flex;gap:12px;justify-content:center;">
          <button id="c-no" style="padding:10px 24px;border:2px solid #e2e8f0;border-radius:8px;background:#fff;cursor:pointer;font-size:14px;">Cancelar</button>
          <button id="c-yes" style="padding:10px 24px;border:none;border-radius:8px;background:#ef4444;color:#fff;cursor:pointer;font-size:14px;">Confirmar</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('#c-yes').onclick = () => { overlay.remove(); resolve(true); };
    overlay.querySelector('#c-no').onclick = () => { overlay.remove(); resolve(false); };
  });
}

export function sanitize(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function sanitizeHtml(html) {
  if (!html) return '';
  const allowed = ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'ol', 'ul', 'li', 'sub', 'sup'];
  const div = document.createElement('div');
  div.innerHTML = html;
  // Remove todos os atributos e tags não permitidas
  const walker = document.createTreeWalker(div, NodeFilter.SHOW_ELEMENT);
  const toRemove = [];
  let el;
  while ((el = walker.nextNode())) {
    const tag = el.tagName.toLowerCase();
    if (!allowed.includes(tag)) {
      toRemove.push(el);
      continue;
    }
    // remove atributos, exceto os essenciais de sub/sup
    const keepAttr = (tag === 'sub' || tag === 'sup') ? [] : [];
    [...el.attributes].forEach(a => {
      if (!keepAttr.includes(a.name)) el.removeAttribute(a.name);
    });
  }
  toRemove.forEach(el => {
    const frag = document.createDocumentFragment();
    while (el.firstChild) frag.appendChild(el.firstChild);
    el.parentNode.replaceChild(frag, el);
  });
  return div.innerHTML;
}

export function debounce(fn, delay = 300) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}
