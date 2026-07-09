import React, { useEffect, useRef } from 'react';
import Chart, { ChartType } from 'chart.js/auto';
import Colors from '@/helpers/purchaseOrder/ColorHelper';
import { grey } from '@mui/material/colors';
import ColorHelper from '@/helpers/purchaseOrder/ColorHelper';


const RitzStackedBarChart = ({ labels, datasets, xAxisName , yAxisName, isUseRandomColors }: any) => {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  let previousIndex = -1;
  const getRandomColor = () => {
      let index;
      do {
          index = Math.floor(Math.random() * Colors.length);
      } while (index === previousIndex);
      previousIndex = index;
      return Colors[index];
  };

  const renderChart = (ctx: any, labels: any, datasets: any) => {
    
    const formattedDatasets = datasets.map((dataset: any, index: number) => ({
      ...dataset,
      barThickness: 50,
      backgroundColor: isUseRandomColors ? getRandomColor() : (ColorHelper[index] || getRandomColor()),
    }));

    const chartConfig = {
      type: 'bar' as ChartType,
      data: {
        labels: labels,
        datasets: formattedDatasets,
      },
      options: {
        responsive: true,
        maintainAspectRation: false,

        scales: {
          x: {
            stacked: true,
            grid: {
              display:  false
            },
            title: {
              display: true,
              text: xAxisName
            },
            barPercentage: 1.0,
            categoryPercentage: 1.0,
            offset: true,
            anchor: 'start'
          },
          y: {
            stacked: true,
            grid: {
              display:  true
            },
            title: {
              display: true,
              text: yAxisName
            },
            beginAtZero: true
          },
        },
        plugins: {
          legend: {
            display: false,
          },
        },
      },
    };
    if (chartRef.current) {
      chartRef.current.destroy();
    }
    chartRef.current = new Chart(ctx, chartConfig);
  };
  useEffect(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      renderChart(ctx, labels, datasets);
    }
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [labels, datasets]);
  return <canvas ref={canvasRef} width="400" height="200" style={{ marginLeft: '10px', marginRight: '10px' }}></canvas>;
};
export default RitzStackedBarChart;