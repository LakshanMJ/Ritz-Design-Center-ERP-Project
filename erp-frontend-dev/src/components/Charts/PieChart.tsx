import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import ColorHelper from '@/helpers/purchaseOrder/ColorHelper';
ChartJS.register(ArcElement, Tooltip, Legend);

const PieChart = ({ labels, data, isUseRandomColors, predefinedColors, measuringUnit }: any) => {
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
          }
       }
    };
    return (
        <Pie data={formattedData} options={options} />
    );
};
export default PieChart;