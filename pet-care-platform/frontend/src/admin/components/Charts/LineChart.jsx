import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Регистрируем компоненты Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const LineChart = ({
  data,
  title,
  height = 300,
  showLegend = true,
  showGrid = true,
  fill = false,
  tension = 0.4,
  className = ''
}) => {
  // Проверка валидности данных
  if (!data || !data.labels || !data.datasets || !Array.isArray(data.labels) || !Array.isArray(data.datasets)) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div style={{ height: `${height}px` }} className="flex items-center justify-center">
          <div className="text-center text-gray-500">
            <div className="text-4xl mb-2">📈</div>
            <p>Загрузка данных графика...</p>
          </div>
        </div>
      </div>
    );
  }

  // Конфигурация графика
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: showLegend,
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            family: 'Inter, sans-serif'
          }
        }
      },
      title: {
        display: !!title,
        text: title,
        font: {
          size: 16,
          weight: 'bold',
          family: 'Inter, sans-serif'
        },
        padding: {
          top: 10,
          bottom: 30
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#374151',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        padding: 12,
        titleFont: {
          size: 14,
          weight: 'bold'
        },
        bodyFont: {
          size: 13
        }
      }
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: showGrid,
          color: 'rgba(156, 163, 175, 0.2)'
        },
        ticks: {
          font: {
            size: 11,
            family: 'Inter, sans-serif'
          },
          color: '#6B7280'
        }
      },
      y: {
        display: true,
        grid: {
          display: showGrid,
          color: 'rgba(156, 163, 175, 0.2)'
        },
        ticks: {
          font: {
            size: 11,
            family: 'Inter, sans-serif'
          },
          color: '#6B7280',
          callback: function(value) {
            // Форматирование больших чисел
            if (value >= 1000000) {
              return (value / 1000000).toFixed(1) + 'M';
            } else if (value >= 1000) {
              return (value / 1000).toFixed(1) + 'K';
            }
            return value;
          }
        }
      }
    },
    elements: {
      point: {
        radius: 4,
        hoverRadius: 6,
        borderWidth: 2,
        hoverBorderWidth: 3
      },
      line: {
        tension: tension,
        fill: fill
      }
    },
    interaction: {
      intersect: false,
      mode: 'index'
    },
    animation: {
      duration: 1000,
      easing: 'easeInOutQuart'
    }
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <div style={{ height: `${height}px` }}>
        <Line data={data} options={options} />
      </div>
    </div>
  );
};

export default LineChart;
