// views/professor/turmas.js

import { DB } from '../../db.js';
import { Router } from '../../router.js';
import { renderShell } from '../shared/shell.js';

const navItems = [
  { icon: 'layout-dashboard', label: 'Dashboard', href: '/professor' },
  { section: 'Minhas turmas' },
  { icon: 'users', label: 'Turmas', href: '/professor/turmas', active: true },
  { separator: true },
  { section: 'Conteúdo' },
  { icon: 'file-question', label: 'Banco de Questões', href: '/professor/questoes' },
  { icon: 'clipboard-list', label: 'Listas', href: '/professor/listas' },
  { separator: true },
  { section: 'Análise' },
  { icon: 'bar-chart-2', label: 'Relatórios por Turma', href: '/professor/relatorios' },
  { icon: 'user', label: 'Relatório por Aluno', href: '/professor/relatorio-aluno' },
];

export function renderProfessorTurmas(container, usuario) {
  const turmas = DB.turmas.porProfessor(usuario.id);
  const todasSubmissoes = DB.submissoes.todas();
  const todasListas = DB.listas.todas();

  const turmasDados = turmas.map(t => {
    const estudantes = DB.usuarios.porTurma(t.id, 'estudante');
    // Conta submissões de listas que pertencem a esta turma
    const listasNaTurma = todasListas.filter(l => l.turmaIds?.includes(t.id));
    const listaIds = new Set(listasNaTurma.map(l => l.id));
    const subs = todasSubmissoes.filter(s => listaIds.has(s.listaId));
    return { turma: t, estudantes, submissoes: subs };
  });

  const conteudo = `
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
        <h3>Minhas Turmas</h3>
        <span class="badge" style="background:#e0e7ff;color:#4f46e5;">${turmas.length} turma${turmas.length !== 1 ? 's' : ''}</span>
      </div>
      ${turmasDados.length === 0 ? `
        <div style="text-align:center;padding:48px 24px;">
          <i data-lucide="users" style="width:48px;height:48px;color:#94a3b8;margin-bottom:16px;"></i>
          <p class="text-2">Nenhuma turma atribuída a você.</p>
        </div>
      ` : `
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Turma</th><th>Série</th><th>Estudantes</th><th>Submissões</th><th></th>
          </tr></thead>
          <tbody>
            ${turmasDados.map(({ turma, estudantes, submissoes }) => `
            <tr>
              <td><strong>${turma.nome}</strong></td>
              <td>${turma.serie || '—'}</td>
              <td>
                <span class="badge" style="background:#e0f2fe;color:#0891b2;">${estudantes.length} aluno${estudantes.length !== 1 ? 's' : ''}</span>
              </td>
              <td>${submissoes.length}</td>
              <td>
                <button class="btn btn-sm btn-primary" data-id="${turma.id}">
                  <i data-lucide="bar-chart-2" style="width:14px;height:14px;"></i> Ver relatório
                </button>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`}
    </div>
  `;

  renderShell({
    usuario,
    navItems,
    titulo: 'Minhas Turmas',
    subtitulo: 'Visão geral das turmas que você leciona',
    conteudo,
  });

  document.querySelectorAll('[data-id]').forEach(btn => {
    btn.onclick = () => Router.navigate(`/professor/relatorios?turmaId=${btn.dataset.id}`);
  });
}
