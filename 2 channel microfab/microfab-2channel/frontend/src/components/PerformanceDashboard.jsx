import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const PerformanceDashboard = () => {
  const tpsData = {
    labels: ['10 TPS', '50 TPS', '100 TPS'],
    datasets: [{
      label: 'TPS Gov Channel',
      data: [8, 42, 85],
      borderColor: 'rgb(59, 130, 246)',
      backgroundColor: 'rgba(59, 130, 246, 0.2)',
    }]
  };

  const latencyData = {
    labels: ['10 TPS', '50 TPS', '100 TPS'],
    datasets: [{
      label: 'Avg Latency (ms)',
      data: [120, 250, 450],
      backgroundColor: 'rgba(34, 197, 94, 0.6)',
    }]
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
      },
    },
  };

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-900 mb-8">Performance Dashboard</h2>
      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-xl font-semibold mb-4">TPS by Load</h3>
          <Line data={tpsData} options={options} />
        </div>
        <div>
          <h3 className="text-xl font-semibold mb-4">Latency by Load</h3>
          <Bar data={latencyData} options={options} />
        </div>
      </div>
      <div className="mt-8 p-6 bg-blue-50 rounded-lg">
        <h3 className="text-xl font-semibold mb-4">Run Performance Test</h3>
        <p className="text-gray-600 mb-4">Data is demo. Run analyze.js in performance/ to generate real results.</p>
        <button className="bg-orange-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-orange-700">
          Load Test Results
        </button>
      </div>
    </div>
  )
}

export default PerformanceDashboard

