import { Box, Typography } from '@mui/material';
import React, { useState } from 'react';

const CustomCalendar = ({ dateRange, cutOffDates }: any) => {
  const [currentDate] = useState(new Date());
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getDaysInMonth = (date: any) => {
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const days = [];

    const startDay = startOfMonth.getDay();

    for (let i = 0; i < startDay; i++) {
      days.push(null); 
    }

    for (let i = 1; i <= endOfMonth.getDate(); i++) {
      days.push(i);
    }
    return days;
  };


  const getDateRange = () => {
    const range = [];
    if (dateRange) {
      const start = new Date(dateRange.start_date);
      const end = new Date(dateRange.end_date);

      let currentDate = start;
      while (currentDate <= end) {
        range.push(currentDate.getDate());
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
    return range;
  };
  
  const getDynamicDayNames = (startDate: Date) => {
    const startDayIndex = startDate.getDay();
    return [...dayNames.slice(startDayIndex), ...dayNames.slice(0, startDayIndex)];
  };

  const dynamicDayNames = dateRange.start_date ? getDynamicDayNames(new Date(dateRange.start_date)) : dayNames;

  const shouldHighlightDay = (day: any) => {
    console.log(day, 'day');
    if (!cutOffDates || cutOffDates.length === 0) return false;
    const tempDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const formattedDay = tempDate.toISOString().split('T')[0];
    return cutOffDates.includes(formattedDay);
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const dateSet = getDateRange();
  const today = currentDate.getDate();

  return (
    <Box>
      <Box
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)', 
          gridTemplateRows: 'auto 1fr', 
          gap: '10px', 
          maxWidth: '300px', 
          marginLeft: '0', 
        }}
      >

        {dynamicDayNames.map((day, index) => (
          <Typography
            key={index}
            style={{
              textAlign: 'center',
              fontWeight: 'bold',
              fontSize: '12px', 
              padding: '2px', 
            }}
          >
            {day}
          </Typography>
        ))}


          {(dateRange.start_date && dateRange.end_date ? dateSet : daysInMonth).map((day, index) => (
            <Box
              key={index}
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '5px', 
                width: '50px', 
                height: '50px',
                border: '1px solid #ddd',
                borderRadius: '50%',
                backgroundColor: shouldHighlightDay(day) ? '#87CEFA' : '#f0f0f0',
                fontSize: '12px', 
                ...(day === today
                  ? {
                      border: '2px solid red', 
                      backgroundColor: '#ffcccc', 
                    }
                  : {}),
              }}
            >
              <Typography>{day}</Typography>
            </Box>
          ))}
      </Box>
    </Box>
  );
};

export default CustomCalendar;
