import { Box, Button, Card, CardContent, Divider, Grid, Link, List, ListItem, ListItemIcon, ListItemText, Table, TableBody, TableCell, TableHead, TableRow, Typography, useTheme } from '@mui/material';
import React, { useEffect, useState } from 'react';
import SearchIcon from '@mui/icons-material/Search';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from "dayjs";
import api from '@/services/api';
import toast from 'react-hot-toast';
import { formatAmount, getDefaultError } from '@/helpers/Utilities';
import { pclDuePaymentsCalenderDetailsURL } from '@/helpers/constants/rest_urls/FinanceUrls';
import CircularLoader from '@/components/CircularLoader';
import RitzModal from '@/components/Ritz/RitzModal';
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import { grey } from '@mui/material/colors';
import { ReactKeyHelper } from '@/helpers/KeyHelper';
import DueSettlementDetails from './DueSettlementDetails';
import SettlementDetails from './SettlementDetails';

const PCLDueCalendar = () => {
    const theme = useTheme();
    const keyHelper = new ReactKeyHelper();
    const [isLoadingCircularLoader, setIsLoadingCircularLoader] = useState(false);
    const [filterData, setFilterData] = useState<any>({
        from_date: dayjs().format("YYYY-MM-DD"),
        to_date: dayjs().add(7, "day").format("YYYY-MM-DD")
    });
    const [calendarData, setCalendarData] = useState<any>([]);
    const [currentData, setCurrentData] = useState<any>({});
    const [modalData, setModalData] = useState<any>({});
    const [selectedRowData, setSelectedRowData] = useState<any>([])
    const [openSettlementModal, setOpenSettlementModal] = useState(false);

    const loadCurrentDateDetails = () => {
        setIsLoadingCircularLoader(true)
        api.get(pclDuePaymentsCalenderDetailsURL(filterData?.from_date, filterData?.to_date))
            .then((response) => {
                const settlementData = response?.data;
                setCurrentData({ ...settlementData })
            })
            .catch((error) => {
                toast.error(getDefaultError(error?.response?.status));
            })
            .finally(() => {
                setIsLoadingCircularLoader(false);
            });
    };


    const generateCalendar = (fromDate: string) => {
        const calendar = [];
        for (let i = 0; i < 7; i++) {
            const date = dayjs(fromDate).add(i, "day").format("YYYY-MM-DD");
            const dayName = dayjs(date).format("dddd");

            calendar.push({
                date,
                dayName,
            });
        }
        setCalendarData(calendar);
    };

    const handleDateChange = (direction: "next" | "previous") => {
        setFilterData((prev: any) => {
            const newFromDate =
                direction === "next"
                    ? dayjs(prev.from_date).add(7, "day").format("YYYY-MM-DD")
                    : dayjs(prev.from_date).subtract(7, "day").format("YYYY-MM-DD");

            const newToDate =
                direction === "next"
                    ? dayjs(prev.to_date).add(7, "day").format("YYYY-MM-DD")
                    : dayjs(prev.to_date).subtract(7, "day").format("YYYY-MM-DD");

            generateCalendar(newFromDate);

            return {
                from_date: newFromDate,
                to_date: newToDate,
            };
        });
    };

    const handleFilterChange = (date: string, key: "from_date" | "to_date") => {
        setFilterData((prev: any) => {
            if (key === "from_date") {
                generateCalendar(date);
                const toDate = dayjs(date).add(7, "day").format("YYYY-MM-DD");
                return {
                    ...prev,
                    from_date: date,
                    to_date: toDate,
                };
            } else {
                return {
                    ...prev,
                    [key]: date,
                };
            }
        });
    };

    const handleClickCount = (date: string, type: any) => {
        let title;
        if(type =='on_grn') {
            title = "On GRN"
        }else if(type =='due_payments') {
            title = "Total Due Payments"
        }else if(type =='advance'){
            title = "Advance"
        }
        setModalData({ modalStatus: true, date: date, type: type, title: title});
    }
    const handleOpenSettlementModal =(selectedRowData: any) => { 
        setModalData({ modalStatus: false })
        setSelectedRowData(selectedRowData);
        setOpenSettlementModal(true);
    }

    useEffect(() => {
        generateCalendar(filterData.from_date);
        loadCurrentDateDetails();
    }, [filterData.from_date]);

    return (
        <>
            <Box>
                <Typography variant='h1' color='text.primary' sx={{ mt: 2 }}>PCL Due Calendar</Typography>
            </Box>
            {isLoadingCircularLoader && (<CircularLoader />)}
            {modalData?.modalStatus && (
                <RitzModal maxWidth='lg' open={modalData?.modalStatus} title={modalData?.title} onClose={() => setModalData({ modalStatus: false })}>
                    <DueSettlementDetails selectedType={modalData?.type} selectedDate={modalData?.date} openSettlementModal={handleOpenSettlementModal}/>
                </RitzModal>
            )}
             {openSettlementModal && (
                <RitzModal open={openSettlementModal} onClose={() => { setOpenSettlementModal(false) }} maxWidth='lg' fullWidth={true} title={"Settlement Details"}>
                    <SettlementDetails selectedData={selectedRowData} refreshData={(status: any) => { setOpenSettlementModal(false);}} />
                </RitzModal>
            )}
            <Box>
                <Card variant='outlined' sx={{ p: 2 }}>
                    <Grid container alignItems="center" spacing={2}>
                        <Grid item xs={12} sm={6} md={3}>
                            <Typography>From Date :</Typography>
                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <DatePicker
                                    //minDate={dayjs(Date.now())}
                                    format="DD/MM/YYYY"
                                    value={filterData.from_date ? dayjs(filterData.from_date) : null}
                                    onChange={(event: any) =>
                                        handleFilterChange(dayjs(event.$d).format("YYYY-MM-DD"), "from_date")
                                    }
                                />
                            </LocalizationProvider>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Typography>To Date :</Typography>
                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <DatePicker
                                    //minDate={dayjs(Date.now())}
                                    format="DD/MM/YYYY"
                                    value={filterData.to_date ? dayjs(filterData.to_date) : null}
                                    onChange={(event: any) =>
                                        handleFilterChange(dayjs(event.$d).format("YYYY-MM-DD"), "to_date")
                                    }
                                    disabled
                                />
                            </LocalizationProvider>
                        </Grid>
                        <Grid item xs={12} sm={12} md={6} display="flex" justifyContent="flex-end">
                            <Button variant="contained" color="primary" size="small" sx={{ mr: 2 }}> <SearchIcon /> Search </Button>
                        </Grid>
                    </Grid>
                </Card>
            </Box>

            <Box sx={{ mt: 2 }}>
                {calendarData.length > 0 && (
                    <Table>
                        <TableBody>
                            {calendarData.map((row: any, index: any) => (
                                <TableRow key={index} sx={{ backgroundColor: '#fff' }} >
                                    <TableCell sx={{
                                        border: (theme) => `1px solid ${theme.palette.grey[200]}`,
                                        backgroundColor: currentData[row?.date] ? '#FFFAEC' : null,
                                        width: '15%'
                                    }}>
                                        <Box display="flex" flexDirection="column" alignItems="left">
                                            <Typography sx={{ fontSize: '1.4rem' }} color="text.secondary">
                                                {row.dayName}
                                            </Typography>
                                            <Typography variant="body1" sx={{ fontWeight: 'bold' }} color="text.primary">
                                                {row.date}
                                            </Typography>
                                        </Box>
                                    </TableCell>

                                    <TableCell
                                        sx={{
                                            border: (theme) => `1px solid ${theme.palette.grey[200]}`,
                                            backgroundColor: currentData[row?.date] ? '#FFFAEC' : null,
                                            padding: '8px',
                                        }}
                                    >
                                        <Box>
                                            {currentData[row?.date] ? (
                                                <Box key={row?.date}>
                                                    {currentData?.[row?.date]?.customers?.map((customer: any, customerIndex: any) => (
                                                        <Box key={customerIndex} sx={{ mb: 2 }}>
                                                            <Grid container>
                                                                <Grid item xs={12}>
                                                                    <Typography variant="h4" color="primary" sx={{ fontWeight: 'bold' }}>
                                                                        {customer?.name}
                                                                    </Typography>
                                                                </Grid>
                                                                <Grid container item xs={12} spacing={1} alignItems="center">
                                                                    <Grid item xs={6}>
                                                                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>ON GRN</Typography>
                                                                    </Grid>
                                                                    <Grid item xs={6}>
                                                                        <Link 
                                                                            onClick={() => handleClickCount(row?.date,'on_grn')} 
                                                                            sx={{ cursor: 'pointer' }}>
                                                                            <Typography variant="h6"> : {customer?.on_grn_count}</Typography>
                                                                        </Link>
                                                                    </Grid>
                                                                </Grid>
                                                                <Grid container item xs={12} spacing={1} alignItems="center">
                                                                    <Grid item xs={6}>
                                                                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Advance</Typography>
                                                                    </Grid>
                                                                    <Grid item xs={6}>
                                                                        <Link 
                                                                            onClick={() => handleClickCount(row?.date,'advance')} 
                                                                            sx={{ cursor: 'pointer' }}>
                                                                            <Typography variant="h6"> : {customer?.advance_count}</Typography>
                                                                        </Link>
                                                                    </Grid>
                                                                </Grid>
                                                                <Grid container item xs={12} spacing={1} alignItems="center">
                                                                    <Grid item xs={6}>
                                                                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Total Due PCL Settlements</Typography>
                                                                    </Grid>
                                                                    <Grid item xs={6}>
                                                                        <Link onClick={() => handleClickCount(row?.date, 'due_payments')} sx={{ cursor: 'pointer' }}><Typography variant="h6"> : {customer?.total_count || '--'}</Typography></Link>
                                                                    </Grid>
                                                                </Grid>
                                                                <Grid container item xs={12} spacing={1} alignItems="center">
                                                                    <Grid item xs={6}>
                                                                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Cash Receive</Typography>
                                                                    </Grid>
                                                                    <Grid item xs={6}>
                                                                        <Typography variant="h6"> : {customer?.cash || '--'}</Typography>
                                                                    </Grid>
                                                                </Grid>
                                                                <Grid container item xs={12} spacing={1} alignItems="center">
                                                                    <Grid item xs={6}>
                                                                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Credit Value</Typography>
                                                                    </Grid>
                                                                    <Grid item xs={6}>
                                                                        <Typography variant="h6"> : {customer?.value?.amount || '--'} {customer?.value?.amount_currency}</Typography>
                                                                    </Grid>
                                                                </Grid>
                                                            </Grid>
                                                        </Box>
                                                    ))}
                                                    <Divider sx={{ mb: 2, mt: 2 }} />
                                                    <Box display="flex" alignItems="center" sx={{ mb: 1 }}>
                                                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Total Payable :</Typography>
                                                        <Typography variant="h6" sx={{ marginLeft: 1 }}>{formatAmount(currentData?.[row?.date]?.total_payable?.amount)} {currentData?.[row?.date]?.total_payable?.amount_currency}</Typography>
                                                    </Box>
                                                    <Box display="flex" alignItems="center">
                                                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Total Receivable :</Typography>
                                                        <Typography variant="h6" sx={{ marginLeft: 1 }}>{formatAmount(currentData?.[row?.date]?.total_receivable?.amount)} {currentData?.[row?.date]?.total_receivable?.amount_currency}</Typography>
                                                    </Box>
                                                </Box>
                                            ) : (

                                                <Typography sx={{ textAlign: 'center' }} variant="body2" color="text.secondary">No available Data</Typography>

                                            )}
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                <Button sx={{ mr: 2 }} variant="contained" onClick={() => handleDateChange("previous")}>
                    Previous
                </Button>
                <Button variant="contained" onClick={() => handleDateChange("next")}>
                    Next
                </Button>
            </Box>
        </>
    );
};

export default PCLDueCalendar;