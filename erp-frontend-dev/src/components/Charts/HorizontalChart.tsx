import React from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { Box } from '@mui/material';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const HorizontalBarChart = ({ labels, data, isUseRandomColors, predefinedColors }: any) => {
    const getRandomColor = () => {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    };

    const datasets = {
        label: '',
        data: data.map((point: any) => point.quantity), 
        units: data.map((point: any) => point.unit),
        backgroundColor: isUseRandomColors
            ? data.map(() => getRandomColor()) 
            : predefinedColors || new Array(data.length).fill('')
    };

    const formattedData = {
        labels: labels,
        datasets: [datasets]
    };

    const customTooltip = (context: any) => {
        const tooltipItems = context?.dataset|| [];
        const dataIndex = context.dataIndex;
        const quantity = tooltipItems?.data[dataIndex];
        const unit = tooltipItems?.units[dataIndex];
        return `${quantity} ${unit}`; 
    };

    const options: any = {
        indexAxis: 'y',
        scales: {
            x: {
                beginAtZero: true
            }
        },
        plugins: {
            tooltip: {
                 callbacks: {
                    label: (tooltipItem: any) => customTooltip(tooltipItem)
                }
            },
            legend: {
                display: false
            }
        }
    };

    return (
        <Box sx={{ width: '600px', height: '300px' }}>
            <Bar
                data={formattedData}
                options={options}
            />
        </Box>
    );
};

export default HorizontalBarChart;