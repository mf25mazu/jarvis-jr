// router.js — Roteamento hash-based

const routes = {};
let beforeEach = null;

export const Router = {
  on(path, handler) {
    routes[path] = handler;
    return this;
  },

  beforeEach(fn) {
    beforeEach = fn;
    return this;
  },

  navigate(path) {
    window.location.hash = '#' + path;
  },

  resolve() {
    const hash = window.location.hash || '#/login';
    const path = hash.replace('#', '').split('?')[0];
    const query = {};
    if (hash.includes('?')) {
      hash.split('?')[1].split('&').forEach(p => {
        const [k, v] = p.split('=');
        query[k] = decodeURIComponent(v || '');
      });
    }

    if (beforeEach) {
      const ok = beforeEach(path, query);
      if (ok === false) return;
    }

    // Correspondência exata ou pattern matching simples
    let handler = routes[path];
    if (!handler) {
      // tenta match com parâmetros ex: /lista/:id
      for (const [pattern, fn] of Object.entries(routes)) {
        const regex = new RegExp('^' + pattern.replace(/:[^/]+/g, '([^/]+)') + '$');
        const match = path.match(regex);
        if (match) {
          const params = {};
          const keys = [...pattern.matchAll(/:([^/]+)/g)].map(m => m[1]);
          keys.forEach((k, i) => { params[k] = match[i + 1]; });
          handler = () => fn({ params, query });
          break;
        }
      }
    } else {
      const origHandler = handler;
      handler = () => origHandler({ params: {}, query });
    }

    if (handler) {
      handler();
    } else {
      routes['/404']?.({ params: {}, query });
    }
  },

  start() {
    window.addEventListener('hashchange', () => this.resolve());
    this.resolve();
  }
};
