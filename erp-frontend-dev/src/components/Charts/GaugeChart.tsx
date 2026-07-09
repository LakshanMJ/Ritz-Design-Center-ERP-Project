import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { Box, Typography } from '@mui/material';

ChartJS.register(ArcElement, Tooltip, Legend);

const GaugeChart = ({ value1, value2, max, labels, measuringUnit, colors }: any) => {
    const totalValue = value1 + value2;

    const data = {
        labels: labels,
        datasets: [
            {
                data: [value1, value2, max - totalValue],
                backgroundColor: colors,
                borderWidth: 0,
                circumference: 180,
                rotation: 270,
            },
        ],
    };

    const options = {
        responsive: true,
        cutout: '80%',
        plugins: {
            tooltip: {
                callbacks: {
                    label: (tooltipItem: { raw: any; }) => {
                        return `${tooltipItem.raw} ${measuringUnit}`;
                    },
                },
            },
            legend: {
                display: false,
            },
        },
    };

    const barStyle = {
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '100%',
        height: '20px',
        backgroundColor: '#E0E0E0',
    };

    const progressStyle = {
        width: `${(totalValue / max) * 100}%`,
        height: '100%',
        backgroundColor: '#FF5F6D',
    };

    return (
        <Box sx={{ position: 'relative', width: '500px', height: '300px' }}>
            <Doughnut data={data} options={options} />
            <Box sx={barStyle}>
                <Box sx={progressStyle} />
            </Box>
            <Typography sx={{ position: 'absolute', bottom: '-30px', left: '50%', transform: 'translateX(-50%)', fontWeight: 'bold' }}>
                {totalValue} {measuringUnit}
            </Typography>
        </Box>
    );
};

export default GaugeChart;