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

export function debounce(fn, delay = 300) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}
