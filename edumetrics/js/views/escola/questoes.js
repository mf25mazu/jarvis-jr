// views/escola/questoes.js — Banco de Questões (Escola)

import { renderBancoQuestoes } from '../shared/questoes-core.js';

function getNavItems(rota) {
  return [
    { icon: 'layout-dashboard', label: 'Dashboard',         href: '/escola',             active: rota === '/escola' },
    { section: 'Gestão' },
    { icon: 'users',            label: 'Professores',       href: '/escola/professores', active: rota === '/escola/professores' },
    { icon: 'book-open',        label: 'Turmas',            href: '/escola/turmas',      active: rota === '/escola/turmas' },
    { icon: 'graduation-cap',   label: 'Estudantes',        href: '/escola/estudantes',  active: rota === '/escola/estudantes' },
    { separator: true },
    { section: 'Conteúdo' },
    { icon: 'file-question',    label: 'Banco de Questões', href: '/escola/questoes',    active: rota === '/escola/questoes' },
    { icon: 'clipboard-list',   label: 'Listas',            href: '/escola/listas',      active: rota === '/escola/listas' },
    { separator: true },
    { section: 'Análise' },
    { icon: 'bar-chart-2',      label: 'Relatórios',        href: '/escola/relatorios',  active: rota === '/escola/relatorios' },
  ];
}

export function renderEscolaQuestoes(container, usuario) {
  renderBancoQuestoes({
    usuario,
    navItems: getNavItems('/escola/questoes'),
    titulo: 'Banco de Questões',
    subtitulo: 'Crie e gerencie questões da escola',
  });
}
