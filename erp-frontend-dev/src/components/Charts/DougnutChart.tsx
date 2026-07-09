import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2'; // Import Doughnut from react-chartjs-2
import ColorHelper from '@/helpers/purchaseOrder/ColorHelper';
import { Box, Typography } from '@mui/material';
ChartJS.register(ArcElement, Tooltip, Legend);

const DoughnutChart = ({ labels, data, isUseRandomColors, predefinedColors, measuringUnit, boxWrapperStyle={}}: any) => {
    const getRandomColor = () => {
        return ColorHelper[Math.floor(Math.random() * ColorHelper.length)];
    };
    let datasets = {
        data: data,
        backgroundColor: new Array(data.length).fill('')
    };
    if (!isUseRandomColors && predefinedColors && predefinedColors.length > 0) {
        datasets.backgroundColor = predefinedColors;
    } else {
        datasets.backgroundColor = data.map(() => getRandomColor());
    }
    const formattedData = {
        labels: labels,
        datasets: [datasets]
    };
    const customTooltip = (tooltipModel: any) => {
        console.log(tooltipModel)
        let tooltipText: string[] = [];
            tooltipText.push(tooltipModel.formattedValue + ' ' +measuringUnit);
        return tooltipText;
    };
    const options = {
        plugins: {
            tooltip: {
                callbacks: {
                    label: customTooltip
                }
            },
        legend: {
            display:false
          },
       },
    };
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' }}>
        <Box sx={{ width: '200px', height: '200px', ...boxWrapperStyle}}>
            <Doughnut
                data={formattedData}
                options={options}
            />
        </Box>
    </Box>
      
    );
};
export default DoughnutChart;