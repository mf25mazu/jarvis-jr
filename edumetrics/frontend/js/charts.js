// charts.js — Wrappers Chart.js

let chartInstances = {};

function destroy(id) {
  if (chartInstances[id]) {
    chartInstances[id].destroy();
    delete chartInstances[id];
  }
}

function criar(id, config) {
  destroy(id);
  const ctx = document.getElementById(id);
  if (!ctx) return null;
  const inst = new Chart(ctx, config);
  chartInstances[id] = inst;
  return inst;
}

export const Charts = {
  destroyAll() {
    Object.keys(chartInstances).forEach(id => {
      chartInstances[id]?.destroy();
    });
    chartInstances = {};
  },

  linha({ id, labels, datasets, titulo, yMax = 100 }) {
    return criar(id, {
      type: 'line',
      data: { labels, datasets: datasets.map(d => ({
        tension: 0.4, fill: d.fill ?? false, pointRadius: 4,
        pointBackgroundColor: d.borderColor,
        ...d
      })) },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: datasets.length > 1, position: 'bottom' },
          title: titulo ? { display: true, text: titulo, font: { size: 14 } } : undefined,
        },
        scales: {
          y: { beginAtZero: true, max: yMax, ticks: { callback: v => v + '%' }, grid: { color: '#f1f5f9' } },
          x: { grid: { color: '#f1f5f9' } },
        },
      }
    });
  },

  barra({ id, labels, datasets, titulo, horizontal = false, stacked = false }) {
    return criar(id, {
      type: 'bar',
      data: { labels, datasets },
      options: {
        indexAxis: horizontal ? 'y' : 'x',
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: datasets.length > 1, position: 'bottom' },
          title: titulo ? { display: true, text: titulo } : undefined,
        },
        scales: {
          [horizontal ? 'x' : 'y']: {
            beginAtZero: true, max: stacked ? undefined : 100,
            ticks: { callback: v => v + '%' },
            stacked,
            grid: { color: '#f1f5f9' }
          },
          [horizontal ? 'y' : 'x']: { stacked, grid: { color: '#f1f5f9' } },
        },
      }
    });
  },

  rosca({ id, labels, dados, cores, titulo }) {
    return criar(id, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{ data: dados, backgroundColor: cores, borderWidth: 2, borderColor: '#fff' }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: { position: 'bottom' },
          title: titulo ? { display: true, text: titulo } : undefined,
        },
      }
    });
  },

  radar({ id, labels, datasets, titulo }) {
    return criar(id, {
      type: 'radar',
      data: {
        labels,
        datasets: datasets.map(d => ({
          label: d.nome,
          data: d.dados,
          backgroundColor: d.cor + '33',
          borderColor: d.cor,
          pointBackgroundColor: d.cor,
          borderWidth: 2,
        }))
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' },
          title: titulo ? { display: true, text: titulo } : undefined,
        },
        scales: { r: { beginAtZero: true, max: 100, ticks: { stepSize: 20 } } },
      }
    });
  },

  scatter({ id, dados, titulo }) {
    return criar(id, {
      type: 'scatter',
      data: {
        datasets: [{
          label: titulo || '',
          data: dados,
          backgroundColor: dados.map(d => d.correta ? '#22c55e88' : '#ef444488'),
          pointRadius: 6,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { min: 0, max: 5, title: { display: true, text: 'Confiança (1–5)' } },
          y: { min: 0, max: 1, ticks: { callback: v => v === 0 ? 'Errou' : 'Acertou', stepSize: 1 } },
        }
      }
    });
  },

  // Distribuição normal com posição do aluno destacada
  gaussiana({ id, media, desvioPadrao, posicaoAluno, titulo }) {
    const pontos = [];
    const min = Math.max(0, media - 3 * desvioPadrao);
    const max = Math.min(100, media + 3 * desvioPadrao);
    const step = (max - min) / 40;
    for (let x = min; x <= max; x += step) {
      const y = (1 / (desvioPadrao * Math.sqrt(2 * Math.PI))) *
        Math.exp(-0.5 * Math.pow((x - media) / desvioPadrao, 2));
      pontos.push({ x: +x.toFixed(1), y: +y.toFixed(4) });
    }

    return criar(id, {
      type: 'line',
      data: {
        datasets: [
          {
            label: 'Distribuição da turma',
            data: pontos,
            borderColor: '#6366f1',
            backgroundColor: '#6366f133',
            fill: true,
            tension: 0.4,
            pointRadius: 0,
          },
          {
            label: 'Você',
            data: [{ x: posicaoAluno, y: 0 }],
            backgroundColor: '#ef4444',
            borderColor: '#ef4444',
            pointRadius: 8,
            pointHoverRadius: 10,
            showLine: false,
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'bottom' },
          title: titulo ? { display: true, text: titulo } : undefined,
          tooltip: {
            callbacks: {
              label: ctx => ctx.datasetIndex === 1 ? `Sua nota: ${posicaoAluno}%` : undefined
            }
          }
        },
        scales: {
          x: { type: 'linear', title: { display: true, text: 'Nota (%)' }, grid: { color: '#f1f5f9' } },
          y: { display: false },
        }
      }
    });
  },

  // Matriz de dispersão Expectativa vs Percepção
  matrizDeltaD({ id, pontos, titulo }) {
    return criar(id, {
      type: 'scatter',
      data: {
        datasets: [{
          label: 'Listas',
          data: pontos,
          backgroundColor: pontos.map(p =>
            p.deltaD > 1.5 ? '#ef4444' : p.deltaD < -1.5 ? '#22c55e' : '#f59e0b'
          ),
          pointRadius: 6,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: titulo ? { display: true, text: titulo } : undefined,
          annotation: {
            annotations: {
              linhaReferencia: {
                type: 'line',
                xMin: 1, xMax: 5, yMin: 1, yMax: 5,
                borderColor: '#94a3b8',
                borderWidth: 1,
                borderDash: [5, 5],
              }
            }
          }
        },
        scales: {
          x: { min: 1, max: 5, title: { display: true, text: 'Dificuldade esperada (professor)' }, ticks: { stepSize: 1 } },
          y: { min: 1, max: 5, title: { display: true, text: 'Dificuldade percebida média (turma)' }, ticks: { stepSize: 1 } },
        }
      }
    });
  }
};
