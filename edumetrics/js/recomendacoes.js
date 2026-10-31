// recomendacoes.js — Motor de recomendações objetivas baseado em regras determinísticas
// Zero API / Zero LLM: apenas if/else e análise estatística local.

import { DB } from './db.js';
import {
  calcularDeltaDPercebida, evolucaoTiposErro, taxaNaoFiz, ritmoAprendizagem, labelCategoriaErro
} from './utils.js';

const CATEGORIAS = ['falta_teoria', 'erro_conta', 'interpretacao', 'falta_atencao'];

function categoriaPrevalente(submissoes) {
  const evolucao = evolucaoTiposErro(submissoes, submissoes.length);
  const ordenado = [...evolucao].sort((a, b) => b.valor - a.valor);
  return ordenado[0]?.valor > 0 ? ordenado[0].id : null;
}

function mediaTempoPorAcerto(submissoes) {
  const respostas = submissoes.flatMap(s => s.respostas || []);
  const acertos = respostas.filter(r => r.tipoConclusao === 'fiz' && r.statusAutodeclarado === 'acerto');
  if (!acertos.length) return 0;
  return acertos.reduce((a, r) => a + (r.tempoResposta || 0), 0) / acertos.length;
}

function temDeltaDElevado(submissoes, listasMap) {
  for (const s of submissoes) {
    const lista = listasMap[s.listaId] || DB.listas.porId(s.listaId);
    if (calcularDeltaDPercebida(DB, s, lista) > 1.5) return true;
  }
  return false;
}

// ─── A. RECOMENDAÇÕES PARA O ESTUDANTE ──────────────────────────────────────

export function recomendarEstudante(estudanteId, janela = Infinity) {
  const submissoes = DB.submissoes.porEstudante(estudanteId)
    .filter(s => s.status === 'concluida')
    .sort((a, b) => a.dataFim - b.dataFim)
    .slice(-janela);

  if (!submissoes.length) return [];

  const recs = [];
  const listasMap = Object.fromEntries(submissoes.map(s => [s.listaId, DB.listas.porId(s.listaId)]));

  // 1. Causa prevalente de erro
  const cat = categoriaPrevalente(submissoes);
  switch (cat) {
    case 'falta_teoria':
      recs.push({
        tipo: 'erro',
        alerta: 'Seu maior gargalo nesta matéria é a base conceitual.',
        recomendacao: 'Revise a teoria e os conceitos fundamentais do tópico antes de tentar novos exercícios.'
      });
      break;
    case 'erro_conta':
      recs.push({
        tipo: 'erro',
        alerta: 'Seu raciocínio lógico está correto, mas ocorrem falhas na execução.',
        recomendacao: 'Você precisa de mais exercícios práticos focados na etapa de cálculo e desenvolvimento algébrico.'
      });
      break;
    case 'interpretacao':
      recs.push({
        tipo: 'erro',
        alerta: 'Você compreende a matéria, mas tem dificuldade em traduzir o enunciado.',
        recomendacao: 'Treine a leitura ativa: destaque os dados e identifique a pergunta central antes de começar a resolver.'
      });
      break;
    case 'falta_atencao':
      recs.push({
        tipo: 'erro',
        alerta: 'Você domina o conteúdo, mas comete deslizes por pressa.',
        recomendacao: 'Crie o hábito de conferir os dados finais, unidades e sinais antes de confirmar o envio da resposta.'
      });
      break;
  }

  // 2. Alta taxa de "Não Fiz" (> 30%)
  const txNaoFiz = taxaNaoFiz(submissoes, submissoes.length);
  if (txNaoFiz > 30) {
    recs.push({
      tipo: 'bloqueio',
      alerta: 'Identificada dificuldade em iniciar o raciocínio.',
      recomendacao: 'Busque exemplos de questões resolvidas passo a passo para entender a estrutura de partida do problema.'
    });
  }

  // 3. Baixa fluência (tempo alto + acerto)
  const mediaTempo = mediaTempoPorAcerto(submissoes);
  if (mediaTempo > 180) { // mais de 3 minutos por questão acertada
    recs.push({
      tipo: 'fluencia',
      alerta: 'Você acertou, mas levou um tempo considerável para concluir.',
      recomendacao: 'Você compreendeu o conteúdo, mas precisa de mais prática no assunto para ganhar agilidade.'
    });
  }

  // 4. ΔD elevado (percepção mais difícil que esperado)
  if (temDeltaDElevado(submissoes, listasMap)) {
    recs.push({
      tipo: 'dificuldade',
      alerta: 'A atividade foi percebida como mais difícil do que o esperado pelo professor.',
      recomendacao: 'Considere revisar os pré-requisitos do tópico e resolver exercícios de complexidade gradual antes de avançar.'
    });
  }

  return recs;
}

// ─── B. RECOMENDAÇÕES PARA O PROFESSOR ────────────────────────────────────────

export function recomendarProfessor(turmaId, janela = Infinity) {
  const estudantes = DB.usuarios.porTurma(turmaId, 'estudante');
  const todasSubmissoes = estudantes.flatMap(e =>
    DB.submissoes.porEstudante(e.id).filter(s => s.status === 'concluida')
  ).sort((a, b) => a.dataFim - b.dataFim);

  // Considera apenas as últimas listas distintas
  const unicas = [];
  const visto = new Set();
  for (const s of [...todasSubmissoes].reverse()) {
    if (!visto.has(s.listaId)) {
      visto.add(s.listaId);
      unicas.unshift(s);
    }
  }
  const submissoes = unicas.slice(-janela);
  if (!submissoes.length) return [];

  const recs = [];
  const listasMap = Object.fromEntries(submissoes.map(s => [s.listaId, DB.listas.porId(s.listaId)]));

  // 1. Causa prevalente de erro
  const cat = categoriaPrevalente(submissoes);
  switch (cat) {
    case 'falta_teoria':
      recs.push({
        tipo: 'erro',
        alerta: 'Defasagem conceitual coletiva detectada no tópico.',
        recomendacao: 'Promover uma aula de nivelamento/revisão conceitual antes de avançar para conteúdos novos.'
      });
      break;
    case 'erro_conta':
      recs.push({
        tipo: 'erro',
        alerta: 'A turma entendeu a lógica, mas peca na execução.',
        recomendacao: 'Aplicar treinos práticos de resolução acompanhada para reforçar a parte operacional.'
      });
      break;
    case 'interpretacao':
      recs.push({
        tipo: 'erro',
        alerta: 'Dificuldade coletiva na modelagem do problema.',
        recomendacao: 'Fazer a leitura guiada e o mapeamento dos enunciados na lousa junto com a turma.'
      });
      break;
  }

  // 2. Alta taxa de "Não Fiz" (> 30%)
  const txNaoFiz = taxaNaoFiz(submissoes, submissoes.length);
  if (txNaoFiz > 30) {
    recs.push({
      tipo: 'bloqueio',
      alerta: 'Bloqueio de entrada no conteúdo trabalhado.',
      recomendacao: 'O ponto de partida da matéria não ficou claro. Fornecer guias de resolução com o primeiro passo estruturado.'
    });
  }

  // 3. ΔD elevado
  if (temDeltaDElevado(submissoes, listasMap)) {
    recs.push({
      tipo: 'dificuldade',
      alerta: 'A turma achou o nível muito superior ao esperado.',
      recomendacao: 'Reduzir a complexidade dos problemas temporariamente para consolidar os fundamentos da matéria.'
    });
  }

  return recs;
}

// ─── C. RECOMENDAÇÕES PARA A ESCOLA ─────────────────────────────────────────

export function recomendarEscola(escolaId) {
  const turmas = DB.turmas.porEscola(escolaId);
  const recs = [];

  if (!turmas.length) return recs;

  // 1. Desaceleração de turma vs. outras do mesmo ano (Ritmo < 0)
  const series = [...new Set(turmas.map(t => t.serie).filter(Boolean))];
  series.forEach(serie => {
    const turmasSerie = turmas.filter(t => t.serie === serie);
    if (turmasSerie.length < 2) return;
    const ritmos = turmasSerie.map(t => {
      const estudantes = DB.usuarios.porTurma(t.id, 'estudante');
      const submissoes = estudantes.flatMap(e =>
        DB.submissoes.porEstudante(e.id).filter(s => s.status === 'concluida')
      );
      return { turma: t, ritmo: ritmoAprendizagem(submissoes, 3) };
    }).filter(r => r.ritmo !== null);

    const ritmoMedio = ritmos.length ? ritmos.reduce((a, r) => a + r.ritmo, 0) / ritmos.length : 0;
    ritmos.forEach(r => {
      if (r.ritmo < 0 && r.ritmo < ritmoMedio - 2) {
        recs.push({
          tipo: 'ritmo',
          alerta: `Divergência de ritmo detectada entre turmas equivalentes (${serie}).`,
          recomendacao: 'Realizar alinhamento pedagógico entre os professores da série para equilibrar a cadência dos conteúdos.',
          turma: r.turma.nome,
        });
      }
    });
  });

  // 2. Disciplina com alta ocorrência de "Teoria" ou "Não Fiz"
  const estudantes = DB.usuarios.porEscola(escolaId, 'estudante');
  const submissoes = estudantes.flatMap(e =>
    DB.submissoes.porEstudante(e.id).filter(s => s.status === 'concluida')
  );

  const porDisciplina = {};
  submissoes.forEach(s => {
    (s.respostas || []).forEach(r => {
      const q = DB.questoes.porId(r.questaoId);
      if (!q?.disciplina) return;
      if (!porDisciplina[q.disciplina]) porDisciplina[q.disciplina] = { teoria: 0, naoFiz: 0, total: 0 };
      porDisciplina[q.disciplina].total++;
      if (r.tipoConclusao === 'nao_fiz' || r.naoFinalizada) porDisciplina[q.disciplina].naoFiz++;
      if (r.categoriaErro === 'falta_teoria') porDisciplina[q.disciplina].teoria++;
    });
  });

  Object.entries(porDisciplina).forEach(([disc, d]) => {
    const pctTeoria = d.total ? Math.round((d.teoria / d.total) * 100) : 0;
    const pctNaoFiz = d.total ? Math.round((d.naoFiz / d.total) * 100) : 0;
    if (pctTeoria > 25 || pctNaoFiz > 30) {
      recs.push({
        tipo: 'disciplina',
        alerta: `Vulnerabilidade institucional em ${disc}.`,
        recomendacao: 'Avaliar a necessidade de oficinas de apoio ou reforço pedagógico no contra-turno para essa matéria.',
        disciplina: disc,
      });
    }
  });

  return recs;
}
