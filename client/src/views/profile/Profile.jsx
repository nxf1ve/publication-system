import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js'
ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)
export default function Profile() { return <main><h1>Профиль</h1><Bar data={{ labels: ['Публикации'], datasets: [{ label: 'Количество', data: [0], backgroundColor: '#4299e1' }] }} /></main> }
