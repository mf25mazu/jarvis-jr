// views/professor/questoes.js — Banco de Questões (Professor)

import { renderBancoQuestoes } from '../shared/questoes-core.js';

function getNavItems(rota) {
  return [
    { icon: 'layout-dashboard', label: 'Dashboard',         href: '/professor',             active: rota === '/professor' },
    { section: 'Minhas turmas' },
    { icon: 'users',            label: 'Turmas',            href: '/professor/turmas',      active: rota === '/professor/turmas' },
    { separator: true },
    { section: 'Conteúdo' },
    { icon: 'file-question',    label: 'Banco de Questões', href: '/professor/questoes',    active: rota === '/professor/questoes' },
    { icon: 'clipboard-list',   label: 'Listas',            href: '/professor/listas',      active: rota === '/professor/listas' },
    { separator: true },
    { section: 'Análise' },
    { icon: 'bar-chart-2',      label: 'Relatórios por Turma', href: '/professor/relatorios', active: rota === '/professor/relatorios' },
    { icon: 'user',             label: 'Relatório por Aluno',  href: '/professor/relatorio-aluno', active: rota === '/professor/relatorio-aluno' },
  ];
}

export function renderProfessorQuestoes(container, usuario) {
  renderBancoQuestoes({
    usuario,
    navItems: getNavItems('/professor/questoes'),
    titulo: 'Banco de Questões',
    subtitulo: 'Crie e gerencie questões do seu repertório',
  });
}
