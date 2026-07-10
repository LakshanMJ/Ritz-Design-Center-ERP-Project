import React, { useEffect, useState } from 'react';
import DefaultLoader from '@/components/DefaultLoader';
import { Box, Link, Typography, Grid, Card, CardContent, Checkbox, Button, TextField, Alert, Divider } from '@mui/material';
import { DEFAULT_SUCCESS } from "@/helpers/constants/Constants";
import SearchIcon from '@mui/icons-material/Search';
import { purchaseOrderClubDetailsPageURL } from '@/helpers/constants/front_end/POUrls';
import { formatAmount, getDefaultError } from '@/helpers/Utilities';
import api from '@/services/api';
import { pclMatchingDetailsURL, pendingPCLPOClubListURL, savePCLMatchingDetailsURL } from '@/helpers/constants/rest_urls/FinanceUrls';
import toast from 'react-hot-toast';
import { ReactKeyHelper } from '@/helpers/KeyHelper';
import RitzTablePagination from '@/components/Ritz/RitzTablePagination';
import InfoIcon from '@mui/icons-material/Info';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from "dayjs";

const PCLMatching = ({ clubId, refreshData }: any) => {
    const keyHelper = new ReactKeyHelper();
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingPendingPoClubs, setIsLoadingPendingPoClubs] = useState(true)
    const [pclData, setPclData] = useState<any>({});
    const [pendingPCLPoClubList, setPendingPCLPoClubList] = useState<any>({})
    const [selectedIdDataSet, setSelectedIdDataSet] = useState<any>({ selectedIds: [], unSelectedIds: [] });
    const [showCriteria, setShowCriteria] = useState(false);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [searchText, setSearchText] = useState('');
    const [selectedDates, setSelectedDates] = useState<any>({})

    const fetchData = () => {
        const requests = [
            api.post(pclMatchingDetailsURL(clubId)),
        ]
        Promise.all(requests).then(response => {
            const [poClubDetails] = response.map((r: any) => r.data);
            setPclData({ ...poClubDetails })
            const selectedIds = poClubDetails?.automap_po_club_data?.map((item: any) => item.id);
            console.log(selectedIds, "selectedIds")
            setSelectedIdDataSet({ selectedIds: selectedIds, unSelectedIds: [] });
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false);
        });
    }

    const loadPendingPCList = () => {
        setIsLoadingPendingPoClubs(true)
        const requests = [
            api.get(pendingPCLPOClubListURL(searchText, page + 1, rowsPerPage > 5 ? rowsPerPage : 5, clubId)),
        ]
        Promise.all(requests).then(response => {
            const [pendingPCLPoClub] = response.map((r: any) => r.data);
            setPendingPCLPoClubList({ ...pendingPCLPoClub })
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoadingPendingPoClubs(false)
        });
    }

    const handleCheckboxChange = (event: any, id: any, index: number) => {
        setSelectedIdDataSet((prevIdData: any) => {
            const updatedSelectedIds = [...prevIdData.selectedIds];
            const updatedUnSelectedIds = [...prevIdData.unSelectedIds];
            if (event.target.checked) {
                if (!updatedSelectedIds.includes(id)) {
                    updatedSelectedIds.push(id);
                }
                const unSelectedIndex = updatedUnSelectedIds.indexOf(id);
                if (unSelectedIndex > -1) {
                    updatedUnSelectedIds.splice(unSelectedIndex, 1);
                }
            } else {
                if (!updatedUnSelectedIds.includes(id)) {
                    updatedUnSelectedIds.push(id);
                }
                const selectedIndex = updatedSelectedIds.indexOf(id);
                if (selectedIndex > -1) {
                    updatedSelectedIds.splice(selectedIndex, 1);
                }
            }
            return {
                selectedIds: updatedSelectedIds,
                unSelectedIds: updatedUnSelectedIds,
            };
        });
    };

    const handleSave = () => {
        const { selectedIds, unSelectedIds } = selectedIdDataSet;
        const request = {
            method: 'post',
            url: savePCLMatchingDetailsURL(clubId),
            data: {
                po_club_ids: selectedIds || [],
                pcl_facility_start_date: selectedDates?.pcl_facility_start_date,
                pcl_facility_end_date: selectedDates?.pcl_facility_end_date,
            }
        }
        api(request).then(() => {
            toast.success(DEFAULT_SUCCESS);
            refreshData()
            fetchData()

        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally();
    }
    const handleChangePage = (event: any, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: any) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };
    const handleChange = (value: any, field: any) => {
        setSelectedDates({
            ...selectedDates, [field]: value
        })
    }

    useEffect(() => {
        fetchData()
    }, [])

    useEffect(() => {
        loadPendingPCList()
    }, [page, rowsPerPage])
    return (
        <>

            {isLoading ? (
                <DefaultLoader />
            ) : (
                <>
                    <Box sx={{ mb: 3 }}>
                            <Typography variant='h6' color='text.primary'>PCL Facility Start Date</Typography>
                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <DatePicker
                                    format='DD/MM/YYYY'
                                    value={selectedDates.pcl_facility_start_date ? dayjs(selectedDates.pcl_facility_start_date) : null}
                                    onChange={(e: any) => handleChange(dayjs(e.$d).format('YYYY-MM-DD'), 'pcl_facility_start_date')}
                                />
                            </LocalizationProvider>
                    </Box>
                    <Box sx={{ mb: 3 }}>
                        <Typography variant='h6' color='text.primary'>PCL Facility End Date</Typography>
                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <DatePicker
                                    format='DD/MM/YYYY'
                                    value={selectedDates.pcl_facility_end_date ? dayjs(selectedDates.pcl_facility_end_date) : null}
                                    onChange={(e: any) => handleChange(dayjs(e.$d).format('YYYY-MM-DD'), 'pcl_facility_end_date')}
                                />
                            </LocalizationProvider>
                    </Box>
                    <Divider sx={{mb:1}}/>
                    <Card sx={{ boxShadow: 1, borderRadius: 2, border: '1px solid #ddd', }}>
                        <CardContent>
                            <Box>
                                {[
                                    { label: 'PO Club :', value: <Link sx={{ cursor: 'pointer' }} target={'_blank'} href={purchaseOrderClubDetailsPageURL(pclData?.base_po_club_data?.id)}>{pclData?.base_po_club_data?.short_code}</Link> },
                                    { label: 'Material FOB (%) :', value: `${pclData?.base_po_club_data?.fob_presentage || '--'}` },
                                    { label: 'Max PCL :', value: `${formatAmount(pclData?.base_po_club_data?.max_pcl_value?.amount)}  ${pclData?.base_po_club_data?.max_pcl_value?.amount_currency_display}` },
                                    { label: 'Utilized Value :', value: `${formatAmount(pclData?.base_po_club_data?.pcl_utilized_value?.amount)}  ${pclData?.base_po_club_data?.pcl_utilized_value?.amount_currency_display}` },
                                    { label: 'Excess Value :', value: `${formatAmount(pclData?.base_po_club_data?.pcl_excess_value?.amount)}  ${pclData?.base_po_club_data?.pcl_excess_value?.amount_currency_display}` },
                                    { label: 'Shipment Date:', value: pclData?.base_po_club_data?.shipments?.map((shipment: any) => shipment.shipment_date)?.join(', ') || '--'}
                                ].map((item, index) => (
                                    <Box
                                        key={`${keyHelper.getNextKeyValue()}`}
                                        display="flex"
                                        alignItems="center"
                                        mb={1}
                                        sx={{ width: '100%' }}
                                    >
                                        <Typography
                                            variant="body1"
                                            sx={{ fontWeight: 'bold', width: '150px', flexShrink: 0 }}
                                        >
                                            {item.label}
                                        </Typography>
                                        <Typography variant="body1">{item.value}</Typography>
                                    </Box>
                                ))}
                            </Box>
                        </CardContent>
                    </Card>
                    <Box>
                        <Box sx={{ mt: 1, mb: 1 }}>
                            <Typography variant='h6' color='primary'>Auto Mapped PO Clubs : </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'end' }}>
                            <Button sx={{mb:1}} onClick={()=>{setShowCriteria(!showCriteria)}}  variant='outlined'> <InfoIcon sx={{ color: 'primary.main', mr:1 }} />Auto Map Criteria</Button>
                        </Box>
                            {showCriteria && (
                                <Box>
                                    <Divider sx={{mb:1}}/>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                        <Box sx={{ mr: 2 }}>1.</Box>
                                        <Typography variant="body1" sx={{ color: 'error.main' }}>Same Buyer</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                        <Box sx={{ mr: 2 }}>2.</Box>
                                        <Typography variant="body1" sx={{ color: 'error.main' }}>Same Style</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                        <Box sx={{ mr: 2 }}>3.</Box>
                                        <Typography variant="body1" sx={{ color: 'error.main' }}>Merge the POs based on:</Typography>
                                    </Box>
                                    <Box sx={{ pl: 4, display: 'flex', alignItems: 'center', mb: 1 }}>
                                        <Box sx={{ mr: 2 }}>*</Box>
                                        <Typography variant="body2" sx={{ color: 'error.main' }}>To reduce the FOB Percentage below 70%</Typography>
                                    </Box>
                                    <Box sx={{ pl: 4, display: 'flex', alignItems: 'center', mb: 1 }}>
                                        <Box sx={{ mr: 2 }}>*</Box>
                                        <Typography variant="body2" sx={{ color: 'error.main' }}>Less than or equal to 14 days of period of shipment days</Typography>
                                    </Box>
                                    <Box sx={{ pl: 4, display: 'flex', alignItems: 'center', mb: 1 }}>
                                        <Box sx={{ mr: 2 }}>*</Box>
                                        <Typography variant="body2" sx={{ color: 'error.main' }}>At least 2 POs should have common fabric supplier</Typography>
                                    </Box>
                                    <Divider sx={{mb:1}}/>
                                </Box>
                                
                            )}
                        <Box>
                            <Grid container spacing={2}>
                                {pclData?.automap_po_club_data?.map((pos: any, index: number) => (
                                    <Grid item xs={12} md={6} key={index}>
                                        <Card
                                            sx={{
                                                boxShadow: 1,
                                                borderRadius: 2,
                                                border: selectedIdDataSet.selectedIds.includes(pos.id) ? '2px solid green' : '1px solid #ddd',
                                            }}
                                        >
                                            <CardContent>
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        mb: 1
                                                    }}
                                                >
                                                    <Box>
                                                        <Typography variant="h4">
                                                            <Link sx={{ cursor: 'pointer' }} target={'_blank'} href={purchaseOrderClubDetailsPageURL(pos?.id)}>
                                                                {pos?.display_number}
                                                            </Link>
                                                        </Typography>
                                                        <Typography variant="body1" color="text.secondary" sx={{ mt: -0.5 }}>{pos?.short_code}</Typography>
                                                    </Box>
                                                    <Checkbox
                                                        edge="end"
                                                        checked={selectedIdDataSet.selectedIds.includes(pos.id)}
                                                        onChange={(e) => handleCheckboxChange(e, pos.id, index)}
                                                    />
                                                </Box>
                                                <Typography variant="body1">
                                                    <Typography component="span" fontWeight={'bold'}>
                                                        Material FOB (%):
                                                    </Typography> {pos?.fob_presentage || '--'}
                                                </Typography>
                                                <Typography variant="body1">
                                                    <Typography component="span" fontWeight={'bold'}>
                                                        Max PCL:
                                                    </Typography> {formatAmount(pos?.max_pcl_value?.amount || '--')} {pos?.max_pcl_value?.amount_currency_display}
                                                </Typography>
                                                <Typography variant="body1">
                                                    <Typography component="span" fontWeight={'bold'}>
                                                        Short Value:
                                                    </Typography> {formatAmount(pos?.pcl_short_value?.amount || '--')} {pos?.pcl_short_value?.amount_currency_display}
                                                </Typography>
                                                <Typography variant="body1">
                                                    <Typography component="span" fontWeight={'bold'}>
                                                        Earliest PCL Date:
                                                    </Typography> {pos?.earliest_pcl_date || '--'}
                                                </Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        </Box>
                    </Box>
                    <Box>
                        <Box sx={{ mt: 2, mb: 1 }}>
                            <Typography variant='h6' color='primary'>Pending PCL PO Clubs :</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 1 }}>
                            <TextField
                                id="standard-basic"
                                label="PO Club"
                                variant="standard"
                                onChange={(e: any) => setSearchText(e.target.value)}
                                sx={{ mr: 1 }}
                            />
                            <Button size="small" variant="outlined" onClick={loadPendingPCList}>
                                Search
                            </Button>
                        </Box>
                        {isLoadingPendingPoClubs ? <DefaultLoader /> : (
                            <Box>
                                {pendingPCLPoClubList?.results?.length === 0 ? (
                                    <Alert severity='info' sx={{ mb: 2 }}>No available Po Club.</Alert>
                                ) : (
                                    <>
                                        <Grid container spacing={2}>
                                            {pendingPCLPoClubList?.results?.map((pos: any, index: number) => (
                                                <Grid item xs={12} md={6} key={index}>
                                                    <Card
                                                        sx={{
                                                            boxShadow: 1,
                                                            borderRadius: 2,
                                                            border: selectedIdDataSet.selectedIds.includes(pos.id) ? '2px solid green' : '1px solid #ddd',
                                                        }}
                                                    >
                                                        <CardContent>
                                                            <Box
                                                                sx={{
                                                                    display: 'flex',
                                                                    justifyContent: 'space-between',
                                                                    alignItems: 'center',
                                                                    mb: 1
                                                                }}
                                                            >
                                                                <Box>
                                                                    <Typography variant="h4">
                                                                        <Link sx={{ cursor: 'pointer' }} target={'_blank'} href={purchaseOrderClubDetailsPageURL(pos?.id)}>
                                                                            {pos?.display_number}
                                                                        </Link>
                                                                    </Typography>
                                                                    <Typography variant="body1" color="text.secondary" sx={{ mt: -0.5 }}>{pos?.short_code}</Typography>
                                                                </Box>
                                                                <Checkbox
                                                                    edge="end"
                                                                    checked={selectedIdDataSet.selectedIds.includes(pos.id)}
                                                                    onChange={(e: any) => handleCheckboxChange(e, pos.id, index)}
                                                                />
                                                            </Box>
                                                            <Typography variant="body1">
                                                                <Typography component="span" fontWeight={'bold'}>
                                                                    Material FOB (%):
                                                                </Typography> {pos?.fob_presentage || '--'}
                                                            </Typography>
                                                            <Typography variant="body1">
                                                                <Typography component="span" fontWeight={'bold'}>
                                                                    Max PCL:
                                                                </Typography> {formatAmount(pos?.max_pcl_value?.amount || '--')} {pos?.max_pcl_value?.amount_currency_display}
                                                            </Typography>
                                                            <Typography variant="body1">
                                                                <Typography component="span" fontWeight={'bold'}>
                                                                    Short Value:
                                                                </Typography> {formatAmount(pos?.pcl_short_value?.amount || '--')} {pos?.pcl_short_value?.amount_currency_display}
                                                            </Typography>
                                                            <Typography variant="body1">
                                                                <Typography component="span" fontWeight={'bold'}>
                                                                    Earliest PCL Date:
                                                                </Typography> {pos?.earliest_pcl_date || '--'}
                                                            </Typography>
                                                        </CardContent>
                                                    </Card>
                                                </Grid>
                                            ))}
                                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', width: '100%', mt: 1 }}>
                                                <RitzTablePagination
                                                    count={pendingPCLPoClubList?.results?.length || 0}
                                                    page={page}
                                                    rowsPerPage={rowsPerPage}
                                                    onPageChange={handleChangePage}
                                                    onRowsPerPageChange={handleChangeRowsPerPage}
                                                    next={pendingPCLPoClubList?.next}
                                                />
                                            </Box>
                                        </Grid>
                                    </>
                                )}
                            </Box>
                        )}
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
                        <Button
                            variant="contained"
                            color="primary"
                            size="small"
                            onClick={handleSave}
                            sx={{ mt: 1 }}
                        >
                            Save
                        </Button>
                    </Box>
                </>
            )}
        </>
    );
};

export default PCLMatching;