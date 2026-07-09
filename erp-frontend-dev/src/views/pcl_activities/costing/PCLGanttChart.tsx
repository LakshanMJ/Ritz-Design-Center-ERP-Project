import React, { useEffect, useState } from "react";
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Tooltip, useTheme, Typography } from "@mui/material";
import { ReactKeyHelper } from "@/helpers/KeyHelper";

const PCLGanttChart = ({ dataList }: any) => {
  const theme = useTheme();
  const keyHelper = new ReactKeyHelper();
  const [chartStartDate, setChartStartDate] = useState<Date | null>(null);
  const [chartEndDate, setChartEndDate] = useState<Date | null>(null);

  const calculatePosition = (date: Date) => {
    if (!chartStartDate || !chartEndDate) return 0;
    const totalDuration = chartEndDate.getTime() - chartStartDate.getTime();
    const position = ((date.getTime() - chartStartDate.getTime()) / totalDuration) * 100;
    return position;
  };

  const calculateBreakdownPosition = (breakdownDate: Date, startDate: Date, endDate: Date) => {
    const totalDuration = endDate.getTime() - startDate.getTime();
    const elapsedTime = breakdownDate.getTime() - startDate.getTime();
    return (elapsedTime / totalDuration) * 100;
  };

  const calculateWidth = (startDate: Date, endDate: Date) => {
    if (!chartStartDate || !chartEndDate) return 0;
    const totalDuration = chartEndDate.getTime() - chartStartDate.getTime();
    const segmentDuration = endDate.getTime() - startDate.getTime();
    const width = (segmentDuration / totalDuration) * 100;
    return width;
  };

  const generateTimelineLabels = () => {
    if (!chartStartDate || !chartEndDate) return [];
    const labels = [];
    const currentDate = new Date(chartStartDate);
    while (currentDate <= chartEndDate) {
      labels.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
      
    }
    return labels;
  };

  const formatDate = (date: Date) => {
    const year = String(date.getFullYear()).slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const timelineLabels = generateTimelineLabels();

  useEffect(() => {
    const filteredDataList = dataList?.filter((delivery: any) => delivery.data?.length > 0);

    if (filteredDataList?.length > 0) {
      // const allDates = filteredDataList.flatMap((delivery: any) =>
      //   delivery.data.map((entry: any) => new Date(entry.date))
      // );
      const allDates = filteredDataList.flatMap((delivery: any) =>
        delivery.data.filter((entry: any) => entry.date).map((entry: any) => new Date(entry.date)).filter((date: Date) => !isNaN(date.getTime()))
      );

      const firstDate = new Date(Math.min(...allDates.map((date: Date) => date?.getTime())));
      const lastDate = new Date(Math.max(...allDates.map((date: Date) => date?.getTime())));

      const adjustedFirstDate = new Date(firstDate);
      adjustedFirstDate.setDate(adjustedFirstDate.getDate() - 3); // Adding -5 days to start date

      const adjustedLastDate = new Date(lastDate);
      adjustedLastDate.setDate(adjustedLastDate.getDate() + 3); // Adding +5 days to end date

      setChartStartDate(adjustedFirstDate);
      setChartEndDate(adjustedLastDate);
    } else {
      setChartStartDate(null);
      setChartEndDate(null); // Reset the state if no valid deliveries
    }
  }, [dataList]);

  if (!chartStartDate || !chartEndDate) return null;

  return (
    <Box sx={{ overflowY: "auto" }}>
      <TableContainer component={Paper} sx={{ overflowX: "auto" }}>
        <Table sx={{ minWidth: 650 }} aria-label="simple table">
          <TableHead>
            <TableRow>
              <TableCell sx={{ border: `1px solid ${theme.palette.grey[200]}`, textAlign: "left" }}>Description</TableCell>
              <TableCell colSpan={timelineLabels.length} sx={{ border: `1px solid ${theme.palette.grey[200]}` }}>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  {timelineLabels.map((label, index) => (
                    <Box key={index} sx={{ textAlign: "center" ,width: "100px",}}>
                      {formatDate(label)}
                    </Box>
                  ))}
                </Box>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {dataList?.map((item: any, idx: number) => {
              const hasData = item.data && item.data.length > 0;
              const filteredAndSortedData = hasData
              ? item.data
                  .filter((entry: any) => entry.date !== null) // Remove null dates
                  .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
              : [];

              const startDate = hasData ? new Date(filteredAndSortedData[0].date) : null;
              const endDate = hasData ? new Date(filteredAndSortedData[filteredAndSortedData.length - 1].date) : null;

              const position = hasData? calculatePosition(startDate): null;
              const width = hasData?calculateWidth(startDate, endDate): null;

              return (
                <TableRow key={`${keyHelper.getNextKeyValue()}`} sx={{ height: 80 }}>
                  <TableCell sx={{ border: `1px solid ${theme.palette.grey[200]}`, textAlign: "left" }}>{item.display_number}</TableCell>
                  <TableCell colSpan={timelineLabels.length} sx={{ border: `1px solid ${theme.palette.grey[200]}`, textAlign: "left", height:'50px'}}>
                    <Box sx={{ position: "relative", height: "20px", backgroundColor: "#f0f0f0" }}>
                      {filteredAndSortedData.length > 0 && (
                          <Box sx={{ position: "absolute", left: `${position}%`, width: `${width}%`, height: "100%", backgroundColor: "#36AE7C" }} >
                            {filteredAndSortedData.map((itemBreakdown: any, breakdownIdx: number) => {
                              const breakdownDate = new Date(itemBreakdown.date);
                              const breakdownPosition = calculateBreakdownPosition(
                                breakdownDate,
                                startDate,
                                endDate
                              );
                              const formattedDate = breakdownDate.toLocaleDateString('en-US', {
                                month: '2-digit',
                                day: '2-digit',
                              });

                              return (
                                <React.Fragment key={`${keyHelper.getNextKeyValue()}`}>
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      position: "absolute",
                                      top: breakdownIdx % 2 === 0 ? "-20px" : "20px",
                                      left: `${breakdownPosition}%`,
                                      transform: "translateX(-50%)",
                                      padding: "2px 4px",
                                      mb: 6,
                                      borderRadius: "1px",
                                      zIndex: 2,
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    <Box component="span" sx={{ fontWeight: "bold" }}>
                                      {itemBreakdown.activity}
                                    </Box>{" "}
                                    ({formattedDate})
                                  </Typography>
                                  <Box
                                    sx={{
                                      position: "absolute",
                                      left: `${breakdownPosition}%`,
                                      width: "5px",
                                      height: "100%",
                                      backgroundColor: "#FF9100",
                                      transform: "translateX(-50%)",
                                    }}
                                  >
                                    {itemBreakdown.amount && (
                                      <Tooltip
                                        title={`Amount: ${itemBreakdown.amount.amount} ${itemBreakdown.amount.amount_currency_display}`}
                                        arrow
                                      >
                                        <Box
                                          sx={{
                                            width: "100%",
                                            height: "100%",
                                            cursor: "pointer",
                                          }}
                                        />
                                      </Tooltip>
                                    )}
                                  </Box>
                                </React.Fragment>
                                
                              );
                            })}
                          </Box>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default PCLGanttChart;