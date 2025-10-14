import { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface TrendData {
  month: string;
  cases: number;
  riskLevel: string;
}

interface TrendChartProps {
  data: TrendData[];
  cityName: string;
}

const getRiskColor = (riskLevel: string) => {
  switch (riskLevel) {
    case 'High':
      return 'rgba(239, 68, 68, 0.8)';
    case 'Medium':
      return 'rgba(245, 158, 11, 0.8)';
    case 'Low':
      return 'rgba(16, 185, 129, 0.8)';
    default:
      return 'rgba(107, 114, 128, 0.8)';
  }
};

export default function TrendChart({ data, cityName }: TrendChartProps) {
  const chartData = {
    labels: data.map(d => d.month),
    datasets: [
      {
        label: 'Dengue Cases',
        data: data.map(d => d.cases),
        backgroundColor: data.map(d => getRiskColor(d.riskLevel)),
        borderColor: data.map(d => getRiskColor(d.riskLevel).replace('0.8', '1')),
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: `Dengue Cases Trend - ${cityName}`,
        font: {
          size: 16,
          weight: 'bold' as const,
        },
      },
      tooltip: {
        callbacks: {
          afterLabel: function(context: any) {
            const index = context.dataIndex;
            const riskLevel = data[index].riskLevel;
            return `Risk Level: ${riskLevel}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Number of Cases',
        },
      },
      x: {
        title: {
          display: true,
          text: 'Month',
        },
      },
    },
  };

  return (
    <div className="w-full h-full">
      <Bar data={chartData} options={options} />
    </div>
  );
}
