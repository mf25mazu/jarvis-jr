// ai.js — Diagnóstico automático baseado em estatística local

import {
  media, desvio, pct, mediasMoveis,
  mediaMovelAcertos, taxaNaoFiz, evolucaoTiposErro,
  calcularDeltaDPercebida, mediaDeltaD, ritmoAprendizagem
} from './utils.js';
import { DB } from './db.js';

/**
 * Gera diagnóstico completo de um estudante.
 * @param {string} estudanteId
 * @returns {Object} diagnóstico com score, lacunas, tendência, recomendações
 */
export function diagnosticarEstudante(estudanteId) {
  const submissoes = DB.submissoes.porEstudante(estudanteId)
    .filter(s => s.status === 'concluida')
    .sort((a, b) => a.dataInicio - b.dataInicio);

  if (!submissoes.length) return null;

  const pontuacoes = submissoes.map(s => pct(s.pontuacao, s.totalQuestoes));

  // ─── Lacunas por tópico ───────────────────────────────────────────────────
  const lacunasMapa = {};
  submissoes.forEach(sub => {
    sub.respostas?.forEach(r => {
      const q = DB.questoes.porId(r.questaoId);
      if (!q) return;
      const chave = `${q.disciplina} › ${q.topico}`;
      if (!lacunasMapa[chave]) lacunasMapa[chave] = { acertos: 0, total: 0, erros: 0, naoFiz: 0, disciplina: q.disciplina, topico: q.topico };
      // Apenas questões finalizadas entram na taxa de acerto; não-finalizadas são lacunas conceituais
      if (r.naoFinalizada || r.tipoConclusao === 'nao_fiz') {
        lacunasMapa[chave].naoFiz++;
        lacunasMapa[chave].total++;
      } else if (r.tipoConclusao === 'fiz') {
        lacunasMapa[chave].total++;
        if (r.statusAutodeclarado === 'acerto') lacunasMapa[chave].acertos++;
        else lacunasMapa[chave].erros++;
      }
    });
  });

  const lacunas = Object.entries(lacunasMapa).map(([chave, d]) => ({
    chave, ...d, taxa: pct(d.acertos, d.total),
    critica: pct(d.acertos, d.total) < 50,
  })).sort((a, b) => a.taxa - b.taxa);

  // ─── Metacognição (confiança × acerto) ───────────────────────────────────
  const metacog = analisarMetacognicao(submissoes);

  // ─── Tendência (média móvel 3) ────────────────────────────────────────────
  const mm3 = mediasMoveis(pontuacoes, 3);
  const ultimasMM3 = mm3.filter(v => v !== null);
  let tendencia = 'estavel';
  if (ultimasMM3.length >= 2) {
    const delta = ultimasMM3[ultimasMM3.length - 1] - ultimasMM3[0];
    tendencia = delta > 8 ? 'melhora' : delta < -8 ? 'piora' : 'estavel';
  }

  // ─── Score de risco ────────────────────────────────────────────────────────
  const mediaGeral = media(pontuacoes);
  const lacunasCriticas = lacunas.filter(l => l.critica).length;
  const volat = desvio(pontuacoes);
  const scoreRisco = calcularRisco(mediaGeral, lacunasCriticas, volat, tendencia);

  // ─── Recomendações ────────────────────────────────────────────────────────
  const recomendacoes = gerarRecomendacoes(lacunas, metacog, tendencia, mediaGeral);

  // ─── Padrão temporal ──────────────────────────────────────────────────────
  const temposResposta = submissoes.flatMap(s => s.respostas?.map(r => r.tempoResposta) || []);
  const tempoMedio = media(temposResposta);

  // ─── Janelas acumuladas ───────────────────────────────────────────────────
  const listasMap = Object.fromEntries(submissoes.map(s => [s.listaId, DB.listas.porId(s.listaId)]));
  const janelas = calcularJanelas(submissoes, listasMap);
  const deltaDGeral = mediaDeltaD(DB, submissoes, listasMap, submissoes.length);

  return {
    pontuacoes,
    mediaGeral: Math.round(mediaGeral),
    mm3,
    tendencia,
    lacunas,
    lacunasCriticas,
    metacog,
    scoreRisco,
    recomendacoes,
    tempoMedio: Math.round(tempoMedio),
    totalSubmissoes: submissoes.length,
    submissoes,
    janelas,
    deltaDGeral,
  };
}

function calcularJanelas(submissoes, listasMap) {
  const janelas = {};
  [3, 5, 10].forEach(n => {
    janelas[n] = {
      mediaAcertos: mediaMovelAcertos(submissoes, n),
      taxaNaoFiz: taxaNaoFiz(submissoes, n),
      mediaDeltaD: mediaDeltaD(DB, submissoes, listasMap, n),
      ritmo: ritmoAprendizagem(submissoes, n),
      evolucaoErros: evolucaoTiposErro(submissoes, n),
    };
  });
  return janelas;
}

function analisarMetacognicao(submissoes) {
  const pares = submissoes.flatMap(s =>
    (s.respostas || [])
      .filter(r => r.tipoConclusao === 'fiz' && r.dificuldadePercebida !== undefined)
      .map(r => {
        const q = DB.questoes.porId(r.questaoId);
        const acertou = r.statusAutodeclarado === 'acerto';
        // Superestimou: achou fácil (D_percebida baixa) mas errou
        // Subestimou: achou difícil (D_percebida alta) mas acertou
        return {
          acertou,
          dificuldadePercebida: r.dificuldadePercebida,
          superestimou: acertou === false && r.dificuldadePercebida <= 2,
          subestimou: acertou === true && r.dificuldadePercebida >= 4,
        };
      })
  );

  if (!pares.length) return null;

  const superestimacao = pares.filter(p => p.superestimou).length;
  const subestimacao = pares.filter(p => p.subestimou).length;
  const total = pares.length;

  let perfil = 'calibrado';
  if (superestimacao > total * 0.2) perfil = 'superestimacao';
  else if (subestimacao > total * 0.2) perfil = 'subestimacao';

  return {
    perfil,
    superestimacao,
    subestimacao,
    mediaDificuldadePercebida: Math.round(pares.reduce((a, p) => a + p.dificuldadePercebida, 0) / total),
  };
}

function calcularRisco(media, lacunasCrit, volat, tendencia) {
  let score = 0;
  if (media < 40) score += 40;
  else if (media < 60) score += 25;
  else if (media < 75) score += 10;
  score += Math.min(lacunasCrit * 8, 30);
  if (volat > 20) score += 15;
  if (tendencia === 'piora') score += 15;
  else if (tendencia === 'melhora') score -= 10;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function gerarRecomendacoes(lacunas, metacog, tendencia, mediaGeral) {
  const rec = [];
  const criticas = lacunas.filter(l => l.critica).slice(0, 3);
  criticas.forEach(l => rec.push({
    tipo: 'lacuna',
    prioridade: 'alta',
    msg: `Reforçar: ${l.chave} (apenas ${l.taxa}% de acerto). Revise o conteúdo e resolva exercícios extras.`,
  }));

  if (metacog?.perfil === 'superestimacao') rec.push({
    tipo: 'metacognicao',
    prioridade: 'alta',
    msg: 'Atenção: você tende a se sentir seguro em questões que erra. Revise antes de confirmar respostas.',
  });
  if (metacog?.perfil === 'subestimacao') rec.push({
    tipo: 'metacognicao',
    prioridade: 'media',
    msg: 'Você acerta mais do que acredita! Confie mais no seu conhecimento ao responder.',
  });

  if (tendencia === 'piora') rec.push({
    tipo: 'tendencia',
    prioridade: 'alta',
    msg: 'Queda no desempenho detectada. Identifique o que mudou na sua rotina de estudos.',
  });
  if (tendencia === 'melhora') rec.push({
    tipo: 'tendencia',
    prioridade: 'baixa',
    msg: 'Ótima trajetória! Continue com a rotina atual de estudos.',
  });

  if (mediaGeral >= 75 && rec.length === 0) rec.push({
    tipo: 'geral',
    prioridade: 'baixa',
    msg: 'Excelente desempenho! Mantenha a consistência e desafie-se com questões mais difíceis.',
  });

  return rec;
}

/**
 * Diagnóstico para uma turma.
 */
export function diagnosticarTurma(turmaId) {
  const estudantes = DB.usuarios.porTurma(turmaId, 'estudante');
  const dados = estudantes.map(e => {
    const diag = diagnosticarEstudante(e.id);
    return { estudante: e, diag };
  }).filter(d => d.diag);

  if (!dados.length) return null;

  const medias = dados.map(d => d.diag.mediaGeral);
  const riscos = dados.map(d => d.diag.scoreRisco);

  const topicosMapa = {};
  dados.forEach(({ diag }) => {
    diag.lacunas.forEach(l => {
      if (!topicosMapa[l.chave]) topicosMapa[l.chave] = { acertos: 0, total: 0 };
      topicosMapa[l.chave].acertos += l.acertos;
      topicosMapa[l.chave].total  += l.total;
    });
  });

  const topicosOrdenados = Object.entries(topicosMapa)
    .map(([chave, d]) => ({ chave, taxa: pct(d.acertos, d.total) }))
    .sort((a, b) => a.taxa - b.taxa);

  // Submissões da turma para janelas acumuladas
  const submissoesTurma = estudantes
    .flatMap(e => DB.submissoes.porEstudante(e.id))
    .filter(s => s.status === 'concluida');
  const listasMapTurma = Object.fromEntries(
    [...new Set(submissoesTurma.map(s => s.listaId))].map(id => [id, DB.listas.porId(id)])
  );
  const janelas = calcularJanelas(submissoesTurma, listasMapTurma);
  const deltaDGeral = mediaDeltaD(DB, submissoesTurma, listasMapTurma, submissoesTurma.length);

  return {
    totalEstudantes: estudantes.length,
    comDados: dados.length,
    mediaGeral: Math.round(media(medias)),
    melhorMedia: Math.max(...medias),
    piorMedia: Math.min(...medias),
    desvio: Math.round(desvio(medias)),
    riscoMedio: Math.round(media(riscos)),
    estudantesAltoRisco: dados.filter(d => d.diag.scoreRisco >= 60).length,
    topicosProblema: topicosOrdenados.slice(0, 5),
    janelas,
    deltaDGeral,
    dados,
  };
}
