// views/shared/shell.js — Shell com sidebar compartilhada

import { Auth } from '../../auth.js';
import { Router } from '../../router.js';
import { Charts } from '../../charts.js';

export function renderShell({ usuario, navItems, titulo, subtitulo, conteudo }) {
  // Limpar gráficos anteriores
  Charts.destroyAll();

  const initials = usuario.nome.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
  const escola = usuario.tipo;
  const roleLabel = { escola: '🏫 Escola', professor: '👩‍🏫 Professor', estudante: '👩‍🎓 Estudante' }[escola] || escola;
  const roleClass = `role-${escola}`;

  document.getElementById('app').innerHTML = `
  <div class="app-shell">
    <div class="sidebar-overlay" id="sidebarOverlay"></div>
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-logo">
        <div class="brand">EduMetrics</div>
        <span class="role-badge ${roleClass}">${roleLabel}</span>
      </div>
      <nav class="sidebar-nav">
        ${navItems.map(item => {
          if (item.separator) return `<div style="margin:8px 20px;border-top:1px solid var(--border);"></div>`;
          if (item.section)   return `<div class="nav-section">${item.section}</div>`;
          return `
          <div class="nav-item ${item.active ? 'active' : ''}" data-href="${item.href}">
            <i data-lucide="${item.icon}" style="width:18px;height:18px;"></i>
            ${item.label}
            ${item.badge ? `<span class="badge badge-danger" style="margin-left:auto;">${item.badge}</span>` : ''}
          </div>`;
        }).join('')}
      </nav>
      <div class="sidebar-footer">
        <div class="user-info">
          <div class="avatar">${initials}</div>
          <div>
            <div class="user-name">${usuario.nome}</div>
            <div class="user-email">${usuario.email}</div>
          </div>
        </div>
        <button class="btn-logout" id="btnLogout">
          <i data-lucide="log-out" style="width:14px;height:14px;"></i> Sair
        </button>
      </div>
    </aside>

    <div class="main-content">
      <div class="topbar">
        <div style="display:flex;align-items:center;gap:16px;">
          <button class="hamburger" id="hamburger">
            <span></span><span></span><span></span>
          </button>
          <div>
            <div class="topbar-title">${titulo}</div>
            ${subtitulo ? `<div class="topbar-sub">${subtitulo}</div>` : ''}
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <div class="avatar" style="width:32px;height:32px;font-size:.75rem;">${initials}</div>
        </div>
      </div>
      <div class="page-body" id="pageBody">
        ${conteudo}
      </div>
    </div>
  </div>
  `;

  lucide.createIcons();

  // Nav items click
  document.querySelectorAll('.nav-item[data-href]').forEach(el => {
    el.onclick = () => Router.navigate(el.dataset.href);
  });

  // Logout
  document.getElementById('btnLogout').onclick = () => Auth.logout();

  // Hamburger / sidebar mobile
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  document.getElementById('hamburger').onclick = () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('show');
  };
  overlay.onclick = () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
  };
}
