import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import ColorHelper from '@/helpers/purchaseOrder/ColorHelper';
import { Box } from '@mui/material';
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const StackBarChart = ({ labels, datasets, chartTitle, isUseRandomColors, predefinedColors, barThickness }: any) => {
    const options = {
        plugins: {
            title: {
                display: true,
                text: chartTitle,
            },
        },
        responsive: true,
        scales: {
            x: {
                stacked: true,
            },
            y: {
                stacked: true,
            },
        },
    };

    const getRandomColor = () => {
        return ColorHelper[Math.floor(Math.random() * ColorHelper.length)];
    };

    let formattedDatasets;

    if (isUseRandomColors) {
        formattedDatasets = datasets.map((dataset: any) => ({
            ...dataset,
            backgroundColor: getRandomColor(),
            barThickness: barThickness || 'flex', // Set bar thickness here
        }));
    } else {
        formattedDatasets = datasets.map((dataset: any, index: number) => ({
            ...dataset,
            backgroundColor: predefinedColors[index] || getRandomColor(),
            barThickness: barThickness || 'flex', // Set bar thickness here
        }));
    }

    return (
        <Box sx={{ width: "600px", height: "300px" }}>
             <Bar options={options} data={{ labels, datasets: formattedDatasets }} />
        </Box>
    );
};

export default StackBarChart;