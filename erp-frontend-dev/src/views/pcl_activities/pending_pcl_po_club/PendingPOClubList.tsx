import React, { useEffect, useState } from 'react';
import { getDefaultError } from '@/helpers/Utilities';
import toast from 'react-hot-toast';
import DefaultLoader from '@/components/DefaultLoader';
import { ReactKeyHelper } from '@/helpers/KeyHelper';
import api from '@/services/api';
import { pclPOClubAutoMappingSaveURL, pendingPCLPOClubListURL } from '@/helpers/constants/rest_urls/FinanceUrls';
import { Box, Button, Grid, IconButton, Link, List, ListItem, ListItemText, Table, TableBody, TableCell, TableHead, TablePagination, TableRow, Tooltip, Typography, useTheme } from '@mui/material';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import RitzSearchableServerRender from '@/components/Ritz/RitzSearchableServerRender';
import SearchIcon from '@mui/icons-material/Search';
import RitzSelection from '@/components/Ritz/RitzSelection';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from "dayjs";
import RitzModal from '@/components/Ritz/RitzModal';
import { getPaginateSupplierListURL } from '@/helpers/constants/rest_urls/SharedUrls';
import Checkbox from '@mui/material/Checkbox';
import SaveSpinner from '@/components/SaveSpinner';
import AutoMapPoClubs from './AutoMapPoClubs';
import CircleIcon from '@mui/icons-material/Circle';
import NextLink from 'next/link';
import { purchaseOrderClubDetailsPageURL } from '@/helpers/constants/front_end/POUrls';
import { purchaseOrderDetailPageURL } from '@/helpers/constants/FrontEndUrls';
import { DEFAULT_SUCCESS } from '@/helpers/constants/Constants';
import RitzTablePagination from '@/components/Ritz/RitzTablePagination';

const PendingPOClubList = () => {
    const theme = useTheme();
    const keyHelper = new ReactKeyHelper();
    const [isLoading, setIsLoading] = useState(true);
    const [isFiltering, setIsFiltering] = useState(false)
    const [isOpenCreatePCLConfirmationModal, setIsOpenCreatePCLConfirmationModal] = useState(false);
    const [isOpenAutoMapModal, setIsOpenAutoMapModal] = useState(false);
    const [isCreatingPCL, setIsCreatingPCL] = useState(false);
    const [selectedSearchValues, setSelectedSearchValues] = useState<any>({})
    const [customers, setCustomers] = useState<any>([])
    const [selectedIds, setSelectedIds] = useState<any>([])
    const [pendingPCLPoClubDetails, setPendingPCLPoClubDetails] = useState<any>({})
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [searchText, setSearchText] = useState('');

    const fetchData = () => {
        api.get(pendingPCLPOClubListURL(searchText, page + 1, rowsPerPage > 5 ? rowsPerPage : 5, 0))
            .then((response) => {
                const settlementData = response?.data;
                setPendingPCLPoClubDetails({ ...settlementData })
            })
            .catch((error) => {
                toast.error(getDefaultError(error?.response?.status));
            })
            .finally(() => {
                setIsLoading(false);
            });
    };

    const handleFilterToggle = () => {
        setIsFiltering((prev) => !prev);
    }
    const handleSearchTextValue = (selectValue: any, feild: any) => {
        setSelectedSearchValues((prevState: any) => ({
            ...prevState,
            [feild]: selectValue || '',
        }));
    }

    const handleCheckboxChange = (checked: boolean, id: number) => {
        setSelectedIds((prevSelectedIds: any) =>
            checked ? [...prevSelectedIds, id] : prevSelectedIds.filter((selectedId: any) => selectedId !== id)
        );
    };
    const handleCheckAll = (isChecked: boolean) => {
        setSelectedIds(isChecked ? pendingPCLPoClubDetails?.results?.map((poClub: any) => poClub.id) || [] : []);
    };
    const handleChangePage = (event: any, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: any) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleCreatePCL = (status: any) => {
        setIsOpenCreatePCLConfirmationModal(status)
    }

    const handleOpenAutoMap = (status: any) => {
        setIsOpenAutoMapModal(status)
    }

    const handleConfirmCreatePcl = () => {
        setIsCreatingPCL(true)
        const saveData = {
            type: 'manual',
            data: selectedIds
        };
        api.post(pclPOClubAutoMappingSaveURL(), saveData).then(resp => {
            toast.success(DEFAULT_SUCCESS);
            setIsOpenCreatePCLConfirmationModal(false)
            fetchData()
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => { setIsCreatingPCL(false) });
    }

    const isAllChecked = selectedIds.length === pendingPCLPoClubDetails?.results?.length;

    useEffect(() => {
        fetchData()
    }, [page, rowsPerPage]);

    return (
        <>
            {isOpenCreatePCLConfirmationModal && (
                <RitzModal open={isOpenCreatePCLConfirmationModal} onClose={() => setIsOpenCreatePCLConfirmationModal(false)} title='Confirmation' maxWidth='md'>
                    Are you sure you want to generate a PCL for the selected PO Clubs?
                    <Box>
                        <List>
                            {selectedIds.map((id: number) => {
                                const clubDetail = pendingPCLPoClubDetails?.results?.find((club: any) => club?.id === id);
                                return (
                                    <Box key={`${keyHelper.getNextKeyValue()}`} sx={{ display: 'flex', alignItems: 'center' }}>
                                        <IconButton size='small' color='primary'>
                                            <CircleIcon fontSize='inherit' sx={{ mr: 1 }} />
                                        </IconButton>
                                        <Link href={'#'}>
                                            <Typography variant="body2">{clubDetail?.display_number}</Typography>
                                        </Link>

                                    </Box>
                                );
                            })}
                        </List>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'end', mt: 2 }}>
                        <Button variant='contained' onClick={handleConfirmCreatePcl} disabled={isCreatingPCL} >{isCreatingPCL && <SaveSpinner />}Confirm</Button>
                    </Box>
                </RitzModal>
            )}
            {isOpenAutoMapModal && (
                <RitzModal open={isOpenAutoMapModal} onClose={() => setIsOpenAutoMapModal(false)} title='Auto Mapping' maxWidth='lg'>
                    <AutoMapPoClubs selectedPoClubIds={selectedIds} refreshData={()=>{setIsOpenAutoMapModal(false); fetchData()}} />
                </RitzModal>
            )}
            {isLoading ? (
                <DefaultLoader />
            ) : (
                <>

                    <Box>
                        <Typography variant='h1' color='text.primary' sx={{ mt: 2 }}>Pending PCL PO Clubs</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                        <Tooltip title={isFiltering ? "Remove Filter" : "Filter"} arrow>
                            <IconButton size="small" color="primary" onClick={handleFilterToggle}>
                                {isFiltering ? <FilterAltOffIcon /> : <FilterAltIcon />}
                            </IconButton>
                        </Tooltip>
                    </Box>
                    {isFiltering && (
                        <Box sx={{ mt: 1, mb: 1, p: 2, border: '1px solid', borderColor: 'grey.300', borderRadius: 1, }}>
                            <Grid container alignItems="center" spacing={4}>
                                <Grid item xs={12} sm={6} md={2}>
                                    <Typography>Customer :</Typography>
                                    <RitzSelection
                                        id="customer"
                                        name="customer"
                                        optionValue="id"
                                        optionText="name"
                                        selectedValue={selectedSearchValues?.customer}
                                        isRequired={true}
                                        options={customers}
                                        handleOnChange={(event: any) => handleSearchTextValue(event?.target?.value, 'customer')}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6} md={2}>
                                    <Typography>Supplier :</Typography>
                                    <RitzSearchableServerRender
                                        id={"supplier"}
                                        name={"supplier"}
                                        optionValue={"id"}
                                        optionText={"name"}
                                        selectedValue={selectedSearchValues.supplier}
                                        isRequired={true}
                                        handleOnChange={(value: any) => { handleSearchTextValue(value, 'supplier'); }}
                                        optionUrl={(searchtext: string) => getPaginateSupplierListURL(searchtext)}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6} md={2}>
                                    <Typography>Start Date :</Typography>
                                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                                        <DatePicker
                                            format='DD/MM/YYYY'
                                            value={selectedSearchValues.start_date ? dayjs(selectedSearchValues.start_date) : null}
                                            onChange={(e: any) => handleSearchTextValue(dayjs(e.$d).format('YYYY-MM-DD'), 'start_date')}
                                        />
                                    </LocalizationProvider>

                                </Grid>
                                <Grid item xs={12} sm={6} md={2}>
                                    <Typography>End Date :</Typography>
                                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                                        <DatePicker
                                            format='DD/MM/YYYY'
                                            value={selectedSearchValues.end_date ? dayjs(selectedSearchValues.end_date) : null}
                                            onChange={(e: any) => handleSearchTextValue(dayjs(e.$d).format('YYYY-MM-DD'), 'end_date')}
                                        />
                                    </LocalizationProvider>

                                </Grid>
                                <Grid item xs={12} sm={12} md={4} display="flex" justifyContent="flex-end">
                                    <Button
                                        variant="outlined"
                                        color="primary"
                                        size="small"
                                        sx={{ mr: 2 }}
                                        onClick={() => { fetchData() }}
                                    > <SearchIcon /> Search</Button>
                                </Grid>
                            </Grid>
                        </Box>
                    )}
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                        <Button disabled={true} variant="contained" onClick={() => { handleCreatePCL(true) }} >Create PCL</Button>
                        <Button disabled={true} variant="contained" onClick={() => { handleOpenAutoMap(true) }} sx={{ ml: 2 }} >Auto Map</Button>
                    </Box>
                    <Box sx={{ mt: 1 }}>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ background: theme.palette.grey[100] }}>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>
                                        <Checkbox
                                            checked={isAllChecked}
                                            onChange={(e: any) => handleCheckAll(e.target.checked)}
                                        /></TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>PO Club</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Purchase Orders</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Order/Style</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Customer</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Shipment Date</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {pendingPCLPoClubDetails?.results?.length === 0 ? (
                                    <TableRow sx={{ background: '#fff' }}>
                                        <TableCell colSpan={12} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>No available data.</TableCell>
                                    </TableRow>
                                ) : (
                                    pendingPCLPoClubDetails?.results?.map((poClub: any, poCLubIndex: any) => (
                                        <TableRow key={keyHelper.getNextKeyValue()} sx={{ background: '#fff' }}>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}><Checkbox
                                                checked={selectedIds.includes(poClub.id)}
                                                onChange={(e) => handleCheckboxChange(e.target.checked, poClub.id)}
                                            /></TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                <Link component={NextLink} href={'#'}>{poClub?.display_number}</Link>
                                            </TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                {poClub?.purchase_orders?.map((po: any, index: number) => (
                                                    <>
                                                        <Link
                                                            key={po.id}
                                                            sx={{ cursor: 'pointer', display: 'inline-block', marginRight: 1 }}
                                                            href={'#'}
                                                        >
                                                            {po?.display_number}
                                                        </Link>
                                                        {index < poClub?.purchase_orders?.length - 1 && ','} {/* Directly add a comma */}
                                                    </>
                                                ))}
                                            </TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{poClub?.style_number}</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{poClub?.customer_name}</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{poClub?.shipments?.map((po: any) => po?.shipment_date).join(' , ')}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                        <RitzTablePagination
                            count={pendingPCLPoClubDetails?.results?.length || 0}
                            page={page}
                            rowsPerPage={rowsPerPage}
                            onPageChange={handleChangePage}
                            onRowsPerPageChange={handleChangeRowsPerPage}
                            next={pendingPCLPoClubDetails?.next}
                        />  
                    </Box>
                </>
            )}
        </>
    );
};

export default PendingPOClubList;
