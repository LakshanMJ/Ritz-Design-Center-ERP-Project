import { Box, Tooltip, Typography } from "@mui/material";
import dayjs from "dayjs";
import React from "react";

const WeeklyCalendar = (plant:any, selectedDates:any) => {
  const firstOfMonth = dayjs().startOf('month');
  const daysInMonth = firstOfMonth.daysInMonth();

  const allWeeks = Array.from({ length: Math.ceil(daysInMonth / 7) }, (value, weekIndex) =>
    Array.from({ length: 7 }, (value, dayIndex) => {
      const dayNumber = weekIndex * 7 + dayIndex;
      return dayNumber < daysInMonth ? firstOfMonth.add(dayNumber, 'day') : null;
    }).filter(Boolean)
  );

  return (
    <Box padding={2}>
      <Box display="flex" flexDirection="row" gap={10} overflow="auto">
        {allWeeks.map((week, weekIndex) => (
            <Box key={weekIndex} sx={{ minWidth: 220, flexShrink: 0 }}>
            <Typography
              variant="body2"
              align="center"
              fontWeight="bold"
              marginBottom={0.5}
              sx={{ fontSize: '0.75rem' }}
            >
              Week {weekIndex + 1}
            </Typography>

            <Box display="flex" alignItems="center">
              {weekIndex === 0 && (
                <Box sx={{ width: 80, marginRight: 1 }}>
                  <Typography
                    variant="body2"
                    fontWeight="medium"
                    sx={{ fontSize: '0.75rem' }}
                  >
                    {plant}
                  </Typography>
                </Box>
              )}

              <Box display="flex" gap={0.5} alignItems="center" marginBottom={2}>
                {week.map((day) => {
                  const isToday = day.isSame(dayjs(), 'day');
                  const isSelected = selectedDates.some((date: string) =>
                    day.isSame(dayjs(date), 'day')
                  );

                  return (
                    <Tooltip
                      key={day.format('YYYY-MM-DD')}
                      title={`Details for ${day.format('dddd, MMM D')}`}
                      arrow
                      enterDelay={300}
                      leaveDelay={100}
                    >
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          backgroundColor: isToday
                            ? '#1976d2'
                            : isSelected
                            ? '#81c784'
                            : '#e0e0e0',
                          color: isToday || isSelected ? '#fff' : '#000',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.65rem',
                          cursor: 'default',
                          '&:hover': {
                            backgroundColor: isToday
                              ? '#1565c0'
                              : isSelected
                              ? '#66bb6a'
                              : '#d5d5d5',
                          },
                        }}
                      >
                        <Typography variant="caption" lineHeight={1} sx={{ fontSize: '0.6rem' }}>
                          {day.format('dd')}
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: '0.65rem'}}>
                          {day.format('D')}
                        </Typography>
                      </Box>
                    </Tooltip>
                  );
                })}
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );


};

export default WeeklyCalendar;