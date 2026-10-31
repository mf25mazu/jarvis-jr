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
    disciplinasPorEscola: escolaId =>
      [...new Set(get('questoes').filter(q => q.escolaId === escolaId).map(q => q.disciplina).filter(Boolean))].sort(),
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

    // Questões — schema v2: dificuldadeEsperada 1–5, tempoEsperado (s), gabaritoReferencia
    set('questoes', [
      {
        id: ids.q1,
        enunciado: '<p>Qual é o resultado de <strong>2² + 3²</strong>?</p>',
        imagem: null,
        disciplina: 'Matemática',
        topico: 'Potenciação',
        dificuldadeEsperada: 1,
        tempoEsperado: 60,
        gabaritoReferencia: '13',
        tipo: 'multipla_escolha',
        escolaId: ids.escola,
        criadoPorId: ids.prof1,
        criadoEm: Date.now() - 86400000 * 5,
        alternativas: [
          { id: 'a', texto: '10', correta: false },
          { id: 'b', texto: '13', correta: true },
          { id: 'c', texto: '25', correta: false },
          { id: 'd', texto: '12', correta: false },
        ]
      },
      {
        id: ids.q2,
        enunciado: '<p>A célula é a unidade básica da vida. Classifique a afirmação:</p>',
        imagem: null,
        disciplina: 'Biologia',
        topico: 'Citologia',
        dificuldadeEsperada: 1,
        tempoEsperado: 45,
        gabaritoReferencia: 'Verdadeiro',
        tipo: 'multipla_escolha',
        escolaId: ids.escola,
        criadoPorId: ids.prof1,
        criadoEm: Date.now() - 86400000 * 4,
        alternativas: [
          { id: 'a', texto: 'Verdadeiro', correta: true },
          { id: 'b', texto: 'Falso', correta: false },
        ]
      },
      {
        id: ids.q3,
        enunciado: '<p>Qual é a fórmula química da água?</p>',
        imagem: null,
        disciplina: 'Química',
        topico: 'Substâncias',
        dificuldadeEsperada: 1,
        tempoEsperado: 40,
        gabaritoReferencia: 'H₂O',
        tipo: 'multipla_escolha',
        escolaId: ids.escola,
        criadoPorId: ids.prof2,
        criadoEm: Date.now() - 86400000 * 3,
        alternativas: [
          { id: 'a', texto: 'H₂O', correta: true },
          { id: 'b', texto: 'CO₂', correta: false },
          { id: 'c', texto: 'NaCl', correta: false },
          { id: 'd', texto: 'O₂', correta: false },
        ]
      },
      {
        id: ids.q4,
        enunciado: '<p>Se <strong>x + 5 = 12</strong>, qual é o valor de <em>x</em>?</p>',
        imagem: null,
        disciplina: 'Matemática',
        topico: 'Álgebra',
        dificuldadeEsperada: 3,
        tempoEsperado: 90,
        gabaritoReferencia: '7',
        tipo: 'multipla_escolha',
        escolaId: ids.escola,
        criadoPorId: ids.prof1,
        criadoEm: Date.now() - 86400000 * 2,
        alternativas: [
          { id: 'a', texto: '5', correta: false },
          { id: 'b', texto: '6', correta: false },
          { id: 'c', texto: '7', correta: true },
          { id: 'd', texto: '8', correta: false },
        ]
      },
      {
        id: ids.q5,
        enunciado: '<p>Explique brevemente o que é fotossíntese e cite seus reagentes principais.</p>',
        imagem: null,
        disciplina: 'Biologia',
        topico: 'Fisiologia Vegetal',
        dificuldadeEsperada: 4,
        tempoEsperado: 300,
        gabaritoReferencia: 'Processo pelo qual plantas convertem luz, água e CO₂ em glicose e oxigênio.',
        tipo: 'discursiva',
        escolaId: ids.escola,
        criadoPorId: ids.prof2,
        criadoEm: Date.now() - 86400000 * 1,
        alternativas: []
      },
    ]);

    // Lista com snapshot de dificuldade esperada (imutabilidade)
    const questoesLista = [ids.q1, ids.q2, ids.q3, ids.q4];
    set('listas', [{
      id: ids.lista1, titulo: 'Lista Diagnóstica — Outubro', descricao: 'Avaliação inicial do bimestre.',
      questaoIds: questoesLista,
      questoesSnapshot: questoesLista.map(qid => {
        const q = get('questoes').find(x => x.id === qid);
        return { questaoId: qid, dificuldadeEsperada: q?.dificuldadeEsperada || 0 };
      }),
      turmaIds: [ids.turma1, ids.turma2],
      escolaId: ids.escola, criadoPorId: ids.prof1,
      dataInicio: new Date(Date.now() - 86400000 * 2).toISOString().slice(0, 16),
      dataFim: new Date(Date.now() + 86400000 * 5).toISOString().slice(0, 16),
      tempoLimite: 30, status: 'publicada',
    }]);

    // Submissões de exemplo (schema v2: metacognição + D_percebida)
    const sub = (id, alunoId, resps) => {
      const finalizadas = resps.filter(r => r.tipoConclusao === 'fiz');
      return {
        id, listaId: ids.lista1, estudanteId: alunoId,
        status: 'concluida',
        dataInicio: Date.now() - 3600000,
        dataFim: Date.now() - 1800000,
        tempoTotal: resps.reduce((a, r) => a + (r.tempoResposta || 0), 0),
        pontuacao: finalizadas.filter(r => r.statusAutodeclarado === 'acerto').length,
        totalQuestoes: resps.length,
        dificuldadePercebidaMedia: Math.round(finalizadas.reduce((a, r) => a + (r.dificuldadePercebida || 3), 0) / (finalizadas.length || 1)),
        respostas: resps,
      };
    };

    const fiz = (questaoId, tempo, statusErro, categoriaErro, dPercebida) => ({
      questaoId,
      tipoConclusao: 'fiz',
      respostaEstudante: '',
      statusAutodeclarado: statusErro,
      categoriaErro: statusErro === 'erro' ? categoriaErro : null,
      dificuldadePercebida: dPercebida,
      tempoResposta: tempo,
      naoFinalizada: false,
      lacunaConceitual: false,
    });

    const naoFiz = (questaoId, tempo, dPercebida = 3) => ({
      questaoId,
      tipoConclusao: 'nao_fiz',
      respostaEstudante: '',
      statusAutodeclarado: null,
      categoriaErro: null,
      dificuldadePercebida: dPercebida,
      tempoResposta: tempo,
      naoFinalizada: true,
      lacunaConceitual: true,
    });

    set('submissoes', [
      sub('sub-1', ids.aluno1, [
        fiz(ids.q1, 45, 'acerto', null, 2),
        fiz(ids.q2, 20, 'acerto', null, 1),
        fiz(ids.q3, 15, 'acerto', null, 1),
        fiz(ids.q4, 120, 'erro', 'falta_teoria', 4),
      ]),
      sub('sub-2', ids.aluno2, [
        fiz(ids.q1, 90, 'erro', 'erro_conta', 3),
        fiz(ids.q2, 10, 'acerto', null, 1),
        fiz(ids.q3, 60, 'erro', 'falta_atencao', 4),
        fiz(ids.q4, 75, 'acerto', null, 3),
      ]),
      sub('sub-3', ids.aluno3, [
        fiz(ids.q1, 30, 'acerto', null, 1),
        naoFiz(ids.q2, 25, 4),
        fiz(ids.q3, 20, 'acerto', null, 1),
        fiz(ids.q4, 50, 'acerto', null, 3),
      ]),
    ]);
  }
};
