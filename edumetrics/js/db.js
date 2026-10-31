// db.js — Camada de dados com LocalStorage

const PREFIX = 'edm_';

function get(key) {
  try { return JSON.parse(localStorage.getItem(PREFIX + key)) || []; }
  catch { return []; }
}

function set(key, val) {
  localStorage.setItem(PREFIX + key, JSON.stringify(val));
}

function getObj(key) {
  try { return JSON.parse(localStorage.getItem(PREFIX + key)) || {}; }
  catch { return {}; }
}

// ─── CRUD genérico ───────────────────────────────────────────────────────────

export const DB = {
  // USUÁRIOS
  usuarios: {
    todos: () => get('usuarios'),
    porId: id => get('usuarios').find(u => u.id === id) || null,
    porEmail: email => get('usuarios').find(u => u.email === email?.toLowerCase()) || null,
    salvar: u => {
      const lista = get('usuarios').filter(x => x.id !== u.id);
      set('usuarios', [...lista, u]);
    },
    remover: id => set('usuarios', get('usuarios').filter(u => u.id !== id)),
    porEscola: (escolaId, tipo) => get('usuarios').filter(u =>
      u.escolaId === escolaId && (!tipo || u.tipo === tipo)
    ),
    porTurma: (turmaId, tipo) => get('usuarios').filter(u =>
      u.tipo === (tipo || 'estudante') && u.turmaIds?.includes(turmaId)
    ),
  },

  // ESCOLAS
  escolas: {
    todas: () => get('escolas'),
    porId: id => get('escolas').find(e => e.id === id) || null,
    salvar: e => {
      const lista = get('escolas').filter(x => x.id !== e.id);
      set('escolas', [...lista, e]);
    },
    remover: id => set('escolas', get('escolas').filter(e => e.id !== id)),
  },

  // TURMAS
  turmas: {
    todas: () => get('turmas'),
    porId: id => get('turmas').find(t => t.id === id) || null,
    porEscola: escolaId => get('turmas').filter(t => t.escolaId === escolaId),
    porProfessor: profId => get('turmas').filter(t => t.professorIds?.includes(profId)),
    salvar: t => {
      const lista = get('turmas').filter(x => x.id !== t.id);
      set('turmas', [...lista, t]);
    },
    remover: id => set('turmas', get('turmas').filter(t => t.id !== id)),
  },

  // QUESTÕES
  questoes: {
    todas: () => get('questoes'),
    porId: id => get('questoes').find(q => q.id === id) || null,
    porEscola: escolaId => get('questoes').filter(q => q.escolaId === escolaId),
    salvar: q => {
      const lista = get('questoes').filter(x => x.id !== q.id);
      set('questoes', [...lista, q]);
    },
    remover: id => set('questoes', get('questoes').filter(q => q.id !== id)),
  },

  // LISTAS
  listas: {
    todas: () => get('listas'),
    porId: id => get('listas').find(l => l.id === id) || null,
    porEscola: escolaId => get('listas').filter(l => l.escolaId === escolaId),
    porTurma: turmaId => get('listas').filter(l =>
      l.status === 'publicada' && l.turmaIds?.includes(turmaId)
    ),
    salvar: l => {
      const lista = get('listas').filter(x => x.id !== l.id);
      set('listas', [...lista, l]);
    },
    remover: id => set('listas', get('listas').filter(l => l.id !== id)),
  },

  // SUBMISSÕES
  submissoes: {
    todas: () => get('submissoes'),
    porId: id => get('submissoes').find(s => s.id === id) || null,
    porEstudante: estudanteId => get('submissoes').filter(s => s.estudanteId === estudanteId),
    porLista: listaId => get('submissoes').filter(s => s.listaId === listaId),
    porEstudanteELista: (eId, lId) =>
      get('submissoes').find(s => s.estudanteId === eId && s.listaId === lId) || null,
    salvar: s => {
      const lista = get('submissoes').filter(x => x.id !== s.id);
      set('submissoes', [...lista, s]);
    },
    remover: id => set('submissoes', get('submissoes').filter(s => s.id !== id)),
  },

  // CONFIGURAÇÕES
  config: {
    get: key => getObj('config')[key],
    set: (key, val) => {
      const cfg = getObj('config');
      cfg[key] = val;
      set('config', cfg);
    },
  },

  // SEED: dados de demonstração
  seed() {
    if (get('seeded').length) return;
    set('seeded', [1]);

    const { uuid } = window._edm_utils || {};
    // Importação dinâmica não funciona aqui; usamos valores estáticos
    const ids = {
      escola: 'escola-1',
      escolaUser: 'user-escola-1',
      prof1: 'user-prof-1',
      prof2: 'user-prof-2',
      aluno1: 'user-aluno-1',
      aluno2: 'user-aluno-2',
      aluno3: 'user-aluno-3',
      turma1: 'turma-1',
      turma2: 'turma-2',
      q1: 'q-1', q2: 'q-2', q3: 'q-3', q4: 'q-4', q5: 'q-5',
      lista1: 'lista-1',
    };

    // Escola
    set('escolas', [{
      id: ids.escola, nome: 'Escola Demo Integrada', cnpj: '00.000.000/0001-00', userId: ids.escolaUser
    }]);

    // Turmas
    set('turmas', [
      { id: ids.turma1, nome: '9º Ano A', serie: '9º Ano', escolaId: ids.escola, professorIds: [ids.prof1], estudanteIds: [ids.aluno1, ids.aluno2] },
      { id: ids.turma2, nome: '8º Ano B', serie: '8º Ano', escolaId: ids.escola, professorIds: [ids.prof1, ids.prof2], estudanteIds: [ids.aluno3] },
    ]);

    // Usuários
    set('usuarios', [
      { id: ids.escolaUser, tipo: 'escola', nome: 'Gestão Demo', email: 'escola@demo.com', senha: '-1680838627', escolaId: ids.escola, turmaIds: [] },
      { id: ids.prof1, tipo: 'professor', nome: 'Prof. Ana Lima', email: 'ana@demo.com', senha: '-1680838627', escolaId: ids.escola, turmaIds: [ids.turma1, ids.turma2] },
      { id: ids.prof2, tipo: 'professor', nome: 'Prof. Bruno Melo', email: 'bruno@demo.com', senha: '-1680838627', escolaId: ids.escola, turmaIds: [ids.turma2] },
      { id: ids.aluno1, tipo: 'estudante', nome: 'Maria Souza', email: 'maria@demo.com', senha: '-1680838627', escolaId: ids.escola, turmaIds: [ids.turma1] },
      { id: ids.aluno2, tipo: 'estudante', nome: 'João Pedro', email: 'joao@demo.com', senha: '-1680838627', escolaId: ids.escola, turmaIds: [ids.turma1] },
      { id: ids.aluno3, tipo: 'estudante', nome: 'Carla Ramos', email: 'carla@demo.com', senha: '-1680838627', escolaId: ids.escola, turmaIds: [ids.turma2] },
    ]);

    // Questões
    set('questoes', [
      {
        id: ids.q1, enunciado: 'Qual é o resultado de 2² + 3²?', disciplina: 'Matemática',
        topico: 'Potenciação', subtopico: 'Quadrado perfeito', dificuldade: 'facil',
        tipo: 'multipla_escolha', escolaId: ids.escola, criadoPorId: ids.prof1,
        alternativas: [
          { id: 'a', texto: '10', correta: false },
          { id: 'b', texto: '13', correta: true },
          { id: 'c', texto: '25', correta: false },
          { id: 'd', texto: '12', correta: false },
        ]
      },
      {
        id: ids.q2, enunciado: 'A célula é a unidade básica da vida. Afirmação:', disciplina: 'Biologia',
        topico: 'Citologia', subtopico: 'Célula', dificuldade: 'facil',
        tipo: 'verdadeiro_falso', escolaId: ids.escola, criadoPorId: ids.prof1,
        alternativas: [
          { id: 'v', texto: 'Verdadeiro', correta: true },
          { id: 'f', texto: 'Falso', correta: false },
        ]
      },
      {
        id: ids.q3, enunciado: 'Qual é a fórmula química da água?', disciplina: 'Química',
        topico: 'Substâncias', subtopico: 'Fórmulas', dificuldade: 'facil',
        tipo: 'multipla_escolha', escolaId: ids.escola, criadoPorId: ids.prof2,
        alternativas: [
          { id: 'a', texto: 'H₂O', correta: true },
          { id: 'b', texto: 'CO₂', correta: false },
          { id: 'c', texto: 'NaCl', correta: false },
          { id: 'd', texto: 'O₂', correta: false },
        ]
      },
      {
        id: ids.q4, enunciado: 'Se x + 5 = 12, qual é o valor de x?', disciplina: 'Matemática',
        topico: 'Álgebra', subtopico: 'Equações do 1º grau', dificuldade: 'medio',
        tipo: 'multipla_escolha', escolaId: ids.escola, criadoPorId: ids.prof1,
        alternativas: [
          { id: 'a', texto: '5', correta: false },
          { id: 'b', texto: '6', correta: false },
          { id: 'c', texto: '7', correta: true },
          { id: 'd', texto: '8', correta: false },
        ]
      },
      {
        id: ids.q5, enunciado: 'Explique brevemente o que é fotossíntese.', disciplina: 'Biologia',
        topico: 'Fisiologia Vegetal', subtopico: 'Fotossíntese', dificuldade: 'medio',
        tipo: 'dissertativa', escolaId: ids.escola, criadoPorId: ids.prof2,
        alternativas: []
      },
    ]);

    // Lista
    set('listas', [{
      id: ids.lista1, titulo: 'Lista Diagnóstica — Outubro', descricao: 'Avaliação inicial do bimestre.',
      questaoIds: [ids.q1, ids.q2, ids.q3, ids.q4], turmaIds: [ids.turma1, ids.turma2],
      escolaId: ids.escola, criadoPorId: ids.prof1,
      dataInicio: Date.now() - 86400000 * 2,
      dataFim: Date.now() + 86400000 * 5,
      tempoLimite: 30, status: 'publicada',
    }]);

    // Submissões de exemplo
    const sub = (id, alunoId, resps) => ({
      id, listaId: ids.lista1, estudanteId: alunoId,
      status: 'concluida',
      dataInicio: Date.now() - 3600000,
      dataFim: Date.now() - 1800000,
      tempoTotal: 1800,
      pontuacao: resps.filter(r => r.correta).length,
      totalQuestoes: resps.length,
      respostas: resps,
    });

    set('submissoes', [
      sub('sub-1', ids.aluno1, [
        { questaoId: ids.q1, resposta: 'b', correta: true, tempoResposta: 45, confianca: 4 },
        { questaoId: ids.q2, resposta: 'v', correta: true, tempoResposta: 20, confianca: 5 },
        { questaoId: ids.q3, resposta: 'a', correta: true, tempoResposta: 15, confianca: 5 },
        { questaoId: ids.q4, resposta: 'b', correta: false, tempoResposta: 120, confianca: 3 },
      ]),
      sub('sub-2', ids.aluno2, [
        { questaoId: ids.q1, resposta: 'c', correta: false, tempoResposta: 90, confianca: 2 },
        { questaoId: ids.q2, resposta: 'v', correta: true, tempoResposta: 10, confianca: 5 },
        { questaoId: ids.q3, resposta: 'b', correta: false, tempoResposta: 60, confianca: 3 },
        { questaoId: ids.q4, resposta: 'c', correta: true, tempoResposta: 75, confianca: 4 },
      ]),
      sub('sub-3', ids.aluno3, [
        { questaoId: ids.q1, resposta: 'b', correta: true, tempoResposta: 30, confianca: 5 },
        { questaoId: ids.q2, resposta: 'f', correta: false, tempoResposta: 25, confianca: 2 },
        { questaoId: ids.q3, resposta: 'a', correta: true, tempoResposta: 20, confianca: 5 },
        { questaoId: ids.q4, resposta: 'c', correta: true, tempoResposta: 50, confianca: 4 },
      ]),
    ]);
  }
};
