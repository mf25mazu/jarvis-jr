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

  linha({ id, labels, datasets, titulo }) {
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
          legend: { display: datasets.length > 1 },
          title: titulo ? { display: true, text: titulo, font: { size: 14 } } : undefined,
        },
        scales: {
          y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' }, grid: { color: '#f1f5f9' } },
          x: { grid: { color: '#f1f5f9' } },
        },
      }
    });
  },

  barra({ id, labels, datasets, titulo, horizontal = false }) {
    return criar(id, {
      type: 'bar',
      data: { labels, datasets },
      options: {
        indexAxis: horizontal ? 'y' : 'x',
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: datasets.length > 1 },
          title: titulo ? { display: true, text: titulo } : undefined,
        },
        scales: {
          [horizontal ? 'x' : 'y']: {
            beginAtZero: true, max: 100,
            ticks: { callback: v => v + '%' },
            grid: { color: '#f1f5f9' }
          },
          [horizontal ? 'y' : 'x']: { grid: { color: '#f1f5f9' } },
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

  radar({ id, labels, dados, nome, cor }) {
    return criar(id, {
      type: 'radar',
      data: {
        labels,
        datasets: [{
          label: nome,
          data: dados,
          backgroundColor: cor + '33',
          borderColor: cor,
          pointBackgroundColor: cor,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
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
};
