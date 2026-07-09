import React, { useEffect, useState } from "react";
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Tooltip, Typography, useTheme } from "@mui/material";
import RitzModal from "../Ritz/RitzModal";

const Gantt = ({ dataList }: any) => {
  const theme = useTheme();
  const [chartStartDate, setChartStartDate] = useState(null);
  const [chartEndDate, setChartEndDate] = useState(null);
  const [selectedDate, setSelectedDate] = useState<any>({});
  const [showDebitNoteDetailsModal, setShowDebitNoteDetailsModal] = useState({ modalActiveStatus: false });
  const calculatePosition = (date: any) => {
    const totalDuration = chartEndDate - chartStartDate;
    const position = ((date - chartStartDate) / totalDuration) * 100;
    console.log(position,"position")
    return position;
  };

  const generateTimelineLabels = () => {
    const labels = [];
    const currentDate = new Date(chartStartDate);
    while (currentDate <= chartEndDate) {
      labels.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 7);
    }
    return labels;

  };

  const formatDate = (date: any) => {
    const year = String(date.getFullYear()).slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const timelineLabels = generateTimelineLabels();

  const handleBarClick = (item: any) => {
    setSelectedDate(item);
    setShowDebitNoteDetailsModal({ modalActiveStatus: true });
  };

  useEffect(() => {
    if (dataList.length > 0) {
      const validDataList = dataList.filter((item: { actual_date: any; due_date: any; }) => item.actual_date && item.due_date);
      if (validDataList.length > 0) {
        const firstDeliveryDate = new Date(validDataList[0].actual_date);
        const oneMonthBeforeStartDate = new Date(firstDeliveryDate);
       // oneMonthBeforeStartDate.setMonth(oneMonthBeforeStartDate.getMonth() - 1);
  
        const lastDeliveryDate = new Date(validDataList[validDataList.length - 1].due_date);
        const oneMonthAfterEndDate = new Date(lastDeliveryDate);
        oneMonthAfterEndDate.setMonth(oneMonthAfterEndDate.getMonth() + 1);
  
        setChartStartDate(oneMonthBeforeStartDate);
        setChartEndDate(oneMonthAfterEndDate);
      }
    }
  }, [dataList]);

  if (!chartStartDate || !chartEndDate) return null;

  return (
    <>
      {showDebitNoteDetailsModal.modalActiveStatus &&
        <RitzModal maxWidth='md' open={showDebitNoteDetailsModal.modalActiveStatus} title={'Price Breakdown'} onClose={() => setShowDebitNoteDetailsModal({ modalActiveStatus: false })}>
          <Table>
            <TableHead>
              <TableRow sx={{ background: theme.palette.grey[100] }}>
                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Description</TableCell>
                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Material Type</TableCell>
                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Ritz Code</TableCell>
                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>Value</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {selectedDate?.price_breaddown?.length === 0 ? (
                <TableRow>
                  <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }} colSpan={4}>No available shade details.</TableCell>
                </TableRow>
              ) : (
                selectedDate?.price_breaddown?.map((material: any, index: any) => (
                  <TableRow key={index}>
                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>{material.display_number}</TableCell>
                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>{material.material_label}</TableCell>
                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>{material.verbose_reference_code}</TableCell>
                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>{material.total_price}</TableCell>
                  </TableRow>
                ))
              )}
              { }
            </TableBody>
          </Table>
        </RitzModal>
      }
      <Box sx={{ overflowY: 'auto' }}>
        <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: 650 }} aria-label="simple table">
            <TableHead>
              <TableRow>
                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Display Number</TableCell>
                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Actual Date</TableCell>
                <TableCell colSpan={timelineLabels.length} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    {timelineLabels.map((label, index) => (
                      <Box key={index} sx={{ textAlign: 'center' }}>
                        {formatDate(label)}
                      </Box>
                    ))}
                  </Box>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dataList.map((item: any) => {
                const startPosition = calculatePosition(new Date(item.actual_date));
                const endPosition = calculatePosition(new Date(item.due_date));
                const duration = endPosition - startPosition;
                return (
                  <TableRow key={item.id}>
                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>{item.display_number}</TableCell>
                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>{item.actual_date}</TableCell>
                    <TableCell colSpan={timelineLabels.length} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>
                      <Box sx={{ position: 'relative', height: '20px', backgroundColor: '#f0f0f0' }}>
                        <Tooltip title={`Actual Date: ${formatDate(new Date(item.actual_date))} / Due Date: ${formatDate(new Date(item.due_date))}`} arrow>
                          <Box
                            sx={{
                              position: 'absolute',
                              left: `${startPosition}%`,
                              width: `${duration}%`,
                              height: '100%',
                              backgroundColor: '#36AE7C',
                              cursor: 'pointer',
                            }}
                            onClick={() => handleBarClick(item)}
                          >
                            <Typography
                              sx={{
                                color: 'white',
                                fontWeight: 'bold',
                                position: 'absolute',
                                left: '50%',
                                transform: 'translateX(-50%)',
                              }}
                            >
                              Total Value: {item.total_price}
                            </Typography>
                          </Box>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </>
  );
};

export default Gantt;