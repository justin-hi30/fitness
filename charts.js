import { Chart, registerables } from 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.esm.min.js';
Chart.register(...registerables);

export class ChartManager {
    constructor() {
        this.charts = new Map();
    }

    destroy(chartId) {
        const chart = this.charts.get(chartId);
        if (chart) {
            chart.destroy();
            this.charts.delete(chartId);
        }
    }

    renderLineChart(chartId, labels, values, label, color = '#22c55e') {
        this.destroy(chartId);
        const canvas = document.getElementById(chartId);
        if (!canvas) return;
        const context = canvas.getContext('2d');
        const chart = new Chart(context, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label,
                        data: values,
                        borderColor: color,
                        backgroundColor: 'rgba(34, 197, 94, 0.18)',
                        fill: true,
                        tension: 0.32,
                        pointRadius: 4,
                        pointBackgroundColor: '#fff',
                        pointBorderColor: color,
                        borderWidth: 3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { mode: 'index', intersect: false }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#cbd5e1' } },
                    y: { grid: { color: 'rgba(255,255,255,0.08)' }, ticks: { color: '#cbd5e1' } }
                }
            }
        });
        this.charts.set(chartId, chart);
    }

    renderBarChart(chartId, labels, values, label, color = '#10b981') {
        this.destroy(chartId);
        const canvas = document.getElementById(chartId);
        if (!canvas) return;
        const context = canvas.getContext('2d');
        const chart = new Chart(context, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label,
                        data: values,
                        backgroundColor: color,
                        borderRadius: 14,
                        barThickness: 'flex'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { mode: 'index', intersect: false }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#cbd5e1' } },
                    y: { grid: { color: 'rgba(255,255,255,0.08)' }, ticks: { color: '#cbd5e1' } }
                }
            }
        });
        this.charts.set(chartId, chart);
    }
}
