import React, { useEffect, useState } from 'react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { formatAmount, getDefaultError, hasRole } from '@/helpers/Utilities';
import { createdPCLDetailUpdateURL, pclMergedPoClubsList, pclStatesURL, pclSummaryDetailUrl, pendingPCLPOClubListURL } from '@/helpers/constants/rest_urls/FinanceUrls';
import DefaultLoader from '@/components/DefaultLoader';
import { ReactKeyHelper } from '@/helpers/KeyHelper';
import { useRouter } from 'next/router';
import { Alert, Box, Button, Card, CardContent, Checkbox, Grid, IconButton, InputAdornment, InputLabel, Link, TextField, Typography } from '@mui/material';
import RitzSelection from '@/components/Ritz/RitzSelection';
import { purchaseOrderClubDetailsPageURL } from '@/helpers/constants/front_end/POUrls';
import SaveSpinner from '@/components/SaveSpinner';
import { ADMIN } from '@/helpers/constants/RoleManager';
import { PCL_DRAFT_STATE } from '@/helpers/constants/PCLStates';
import RitzTablePagination from '@/components/Ritz/RitzTablePagination';
import SearchIcon from '@mui/icons-material/Search';
import { DEFAULT_SUCCESS } from '@/helpers/constants/Constants';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from "dayjs";

const EditPCLInformation = ({ pclDetailId, currentState, startDate, endDate, mergedPOClubs, refreshData }: any) => {
    const router = useRouter();
    const canEdit = hasRole(ADMIN);
    const keyHelper = new ReactKeyHelper();
    const [isLoading, setIsLoading] = useState(true)
    const [isLoadingPendingPoClubs, setIsLoadingPendingPoClubs] = useState(true)
    const [pclStates, setPclStates] = useState<any>([])
    const [isSaving, setIsSaving] = useState(false)
    const [selectedState, setSelectedState] = useState<any>({ state: currentState, pcl_facility_start_date: startDate , pcl_facility_end_date: endDate  })
    const [selectedIdDataSet, setSelectedIdDataSet] = useState<any>({ selectedIds: mergedPOClubs, unSelectedIds: [] });
    const [pendingPCLPoClubList, setPendingPCLPoClubList] = useState<any>({})
    const [mergedPCLList, setMergedPCLList] = useState<any>([])
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [searchText, setSearchText] = useState('');

    const loadPendingPCList = () => {
        setIsLoadingPendingPoClubs(true)
        const requests = [
            api.get(pendingPCLPOClubListURL(searchText, page + 1, rowsPerPage > 5 ? rowsPerPage : 5, 0)),
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

    const fetchMetaData = () => {
        const requests = [
            api.get(pclStatesURL()),
            api.get(pclMergedPoClubsList(pclDetailId)),
        ]
        Promise.all(requests).then(response => {
            const [pclStates, mergedPCLData] = response.map((r: any) => r.data);
            setPclStates([...pclStates])
            setMergedPCLList([...mergedPCLData])
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false);
        });
    }

    const handleCheckboxChange = (event: any, id: any, index: number, type: any) => {
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
                if (!updatedUnSelectedIds.includes(id) && type === 'merged_pos') {
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
    }

    const handleSaveEditInformation = () => {
        const { selectedIds, unSelectedIds } = selectedIdDataSet;
        const request = {
            method: 'post', 
            url: createdPCLDetailUpdateURL(pclDetailId),
            data: {
                state: selectedState?.state,
                pcl_facility_start_date: selectedState?.pcl_facility_start_date,
                pcl_facility_end_date: selectedState?.pcl_facility_end_date,
                pcl_settle_date: selectedState?.pcl_settle_date,
                po_club_ids: selectedIds || [],
                deleted_po_club_ids: unSelectedIds || []
            }
        }
        api(request).then(() => {
            toast.success(DEFAULT_SUCCESS);
            refreshData()
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally();
    }

    const handleChange = (value: any, field: any) => {
        setSelectedState({
            ...selectedState, [field]: value
        })
    }
    const handleChangePage = (event: any, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: any) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    useEffect(() => {
        fetchMetaData()
    }, [])

    useEffect(() => {
        loadPendingPCList()
    }, [page, rowsPerPage])

    return (
        <>
            {isLoading ? <DefaultLoader /> : (
                <>
                    <Box sx={{ mb: 3 }}>
                        <Typography variant='h6' color='text.primary'>PCL State</Typography>
                        <RitzSelection
                            id={'new_state'}
                            name={'new_state'}
                            optionValue={'id'}
                            optionText={'name'}
                            selectedValue={selectedState.state}
                            isRequired={true}
                            options={pclStates}
                            handleOnChange={(event: any) => { handleChange(event.target.value, 'state') }}
                            isReadOnly={!canEdit}
                        />
                    </Box>
                    <Box sx={{ mb: 3 }}>
                        <Typography variant='h6' color='text.primary'>Start Date</Typography>
                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                            <DatePicker
                                format='DD/MM/YYYY'
                                value={selectedState.pcl_facility_start_date ? dayjs(selectedState.pcl_facility_start_date) : null}
                                onChange={(e: any) => handleChange(dayjs(e.$d).format('YYYY-MM-DD'),'pcl_facility_start_date')}
                            />
                        </LocalizationProvider>
                    </Box>
                    <Box sx={{ mb: 3 }}>
                        <Typography variant='h6' color='text.primary'>End Date</Typography>
                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                            <DatePicker
                                format='DD/MM/YYYY'
                                value={selectedState.pcl_facility_end_date ? dayjs(selectedState.pcl_facility_end_date) : null}
                                onChange={(e: any) => handleChange(dayjs(e.$d).format('YYYY-MM-DD'),'pcl_facility_end_date')}
                            />
                        </LocalizationProvider>
                    </Box>
                    {selectedState?.state === PCL_DRAFT_STATE && (
                        <Box sx={{ mb: 3 }}>
                            <>
                                <Box>
                                    <Typography variant='h6' color='text.primary'>PCL Mapping</Typography>
                                </Box>
                                <Box>
                                    <Box sx={{ mt: 1, mb: 1 }}>
                                        <Typography variant='h6' color='primary'>Currently Merged PO Clubs : </Typography>
                                    </Box>
                                    <Box>
                                        <Grid container spacing={2}>
                                            {mergedPCLList?.map((pos: any, index: number) => (
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
                                                                    <Typography variant="body1" color="text.secondary" sx={{ mt: -0.4 }}>{pos?.short_code}</Typography>
                                                                </Box>
                                                                <Checkbox
                                                                    edge="end"
                                                                    checked={selectedIdDataSet.selectedIds.includes(pos.id)}
                                                                    onChange={(e: any) => handleCheckboxChange(e, pos.id, index, 'merged_pos')}
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
                                                                                <Typography variant="body1" color="text.secondary" sx={{ mt: -0.4 }}>{pos?.short_code}</Typography>
                                                                            </Box>
                                                                            <Checkbox
                                                                                edge="end"
                                                                                checked={selectedIdDataSet.selectedIds.includes(pos.id)}
                                                                                onChange={(e: any) => handleCheckboxChange(e, pos.id, index, 'pending_pos')}
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
                            </>
                        </Box>
                    )}
                    <Box style={{ display: 'flex', justifyContent: 'end' }}>
                        <Button variant="contained" color="primary" onClick={handleSaveEditInformation} disabled={isSaving}>
                            {isSaving && <SaveSpinner />}Save
                        </Button>
                    </Box>

                </>
            )}
        </>
    );
};

export default EditPCLInformation;