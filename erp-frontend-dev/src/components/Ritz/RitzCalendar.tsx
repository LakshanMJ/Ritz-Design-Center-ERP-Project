import React, { useEffect, useState } from "react";
import { Box, Typography, IconButton, Card, Tooltip } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import TodayIcon from "@mui/icons-material/Today";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

interface CalendarProps {
  data: { [key: string]: any[] };
  showAddIcon?: boolean;
  showDeleteIcon?: boolean;
  showTooltip?: boolean;
  tooltipComponent?: (dateKey: string) => React.ReactNode;
  onAddIconClick?: (date: Date) => void;
  onDeleteIconClick?: (date: Date, id: number) => void;
}

const Calendar: React.FC<CalendarProps> = ({
  data = {},
  showAddIcon,
  showDeleteIcon,
  showTooltip,
  tooltipComponent,
  onAddIconClick,
  onDeleteIconClick,
}) => {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [isLoading, setIsLoading] = useState(false);

  const handlePreviousMonth = () => {
    setIsLoading(true);
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setIsLoading(true);
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setIsLoading(true);
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  const handleSearchDate = (newDate: any) => {
    setIsLoading(true);
    setCurrentDate(new Date(newDate.getFullYear(), newDate.getMonth(), 1));
  };

  const generateCalendarDays = () => {
    const days = [];
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDayOfWeek = startOfMonth.getDay();

    for (let i = 0; i < startDayOfWeek; i++) {
      const prevMonthDay = new Date(startOfMonth);
      prevMonthDay.setDate(prevMonthDay.getDate() - (startDayOfWeek - i));
      days.push({ date: prevMonthDay, isCurrentMonth: false });
    }

    for (let i = 1; i <= endOfMonth.getDate(); i++) {
      days.push({
        date: new Date(currentDate.getFullYear(), currentDate.getMonth(), i),
        isCurrentMonth: true,
      });
    }

    const endDayOfWeek = endOfMonth.getDay();
    for (let i = 1; i <= 6 - endDayOfWeek; i++) {
      const nextMonthDay = new Date(endOfMonth);
      nextMonthDay.setDate(endOfMonth.getDate() + i);
      days.push({ date: nextMonthDay, isCurrentMonth: false });
    }

    return days;
  };

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatMonthYear = () => {
    return currentDate.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  };

  useEffect(() => {
    if (currentDate) {
      setIsLoading(false);
    }
  }, [currentDate]);

  return (
    <Box
      sx={{
        width: "100%",
        margin: "auto",
        padding: 1,
        display: "flex",
        flexDirection: "column",
        backgroundColor: "background.paper",
        borderRadius: 1,
        boxShadow: 1,
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 1,
        }}
      >
        <IconButton size="small" onClick={handlePreviousMonth}>
          <ChevronLeftIcon fontSize="small" />
        </IconButton>
        <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
          {formatMonthYear()}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              format="DD/MM/YYYY"
              value={currentDate ? dayjs(currentDate) : null}
              onChange={(newValue) => {
                if (newValue) {
                  handleSearchDate(newValue.toDate());
                }
              }}
              slotProps={{
                textField: {
                  size: "small",
                  sx: { width: "150px" },
                },
              }}
            />
          </LocalizationProvider>
          <IconButton size="small" onClick={handleToday}>
            <TodayIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={handleNextMonth}>
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          textAlign: "center",
          mb: 0.5,
        }}
      >
        {WEEKDAYS.map((day) => (
          <Typography
            key={day}
            sx={{ fontWeight: "bold", fontSize: "0.7rem" }}
            variant="caption"
            color="textSecondary"
          >
            {day}
          </Typography>
        ))}
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 0.5,
        }}
      >
        {generateCalendarDays().map((day, index) => {
          const dateKey = formatDate(day.date);
          const hasEvents = data && data[dateKey] && data[dateKey].length > 0;
          return (
            <Card
              key={index}
              sx={{
                height: "35px",
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid",
                borderColor: hasEvents ? "success.light" : "grey.200",
                backgroundColor: day.isCurrentMonth
                  ? hasEvents
                    ? "#D4EBF8"
                    : "background.paper"
                  : "grey.100",
                padding: 0,
                borderRadius: 1,
                position: "relative",
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  textAlign: "center",
                  fontSize: "0.8rem",
                  fontWeight:
                    day.date.getDate() === today.getDate() &&
                    day.date.getMonth() === today.getMonth() &&
                    day.date.getFullYear() === today.getFullYear()
                      ? "bold"
                      : "normal",
                }}
                color={day.isCurrentMonth ? "text.primary" : "text.secondary"}
              >
                {day.date.getDate()}
              </Typography>
              {showTooltip && tooltipComponent && hasEvents && (
                <Box sx={{ position: "absolute", top: "3px", left: "3px" }}>
                  {tooltipComponent(dateKey)}
                </Box>
              )}
              {showAddIcon && (
                <IconButton
                  size="small"
                  sx={{
                    position: "absolute",
                    top: "3px",
                    right: showDeleteIcon ? "20px" : "3px",
                    padding: "1px",
                  }}
                  onClick={() => onAddIconClick?.(day.date)}
                >
                  <AddIcon fontSize="inherit" sx={{ fontSize: "0.75rem" }} />
                </IconButton>
              )}
              {showDeleteIcon && hasEvents && (
                <IconButton
                  size="small"
                  sx={{
                    position: "absolute",
                    top: "3px",
                    right: "3px",
                    padding: "1px",
                  }}
                  onClick={() => onDeleteIconClick?.(day.date, data[dateKey][0].id)}
                >
                  <DeleteIcon fontSize="inherit" sx={{ fontSize: "0.75rem" }} />
                </IconButton>
              )}
            </Card>
          );
        })}
      </Box>
    </Box>
  );
};

export default Calendar;