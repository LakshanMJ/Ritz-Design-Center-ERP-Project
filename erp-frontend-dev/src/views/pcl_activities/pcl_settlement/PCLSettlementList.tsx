import React, { useEffect, useState } from 'react';
import { formatAmount, getDefaultError } from '@/helpers/Utilities';
import toast from 'react-hot-toast';
import DefaultLoader from '@/components/DefaultLoader';
import { ReactKeyHelper } from '@/helpers/KeyHelper';
import api from '@/services/api';
import { pclSettlementListURL } from '@/helpers/constants/rest_urls/FinanceUrls';
import { Badge, Box, Button, Grid, IconButton, Link, Table, TableBody, TableCell, TableHead, TablePagination, TableRow, Tooltip, Typography, useTheme } from '@mui/material';
import CircularLoader from '@/components/CircularLoader';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import RitzSearchableServerRender from '@/components/Ritz/RitzSearchableServerRender';
import SearchIcon from '@mui/icons-material/Search';
import RitzSelection from '@/components/Ritz/RitzSelection';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from "dayjs";
import { customersURL } from '@/helpers/constants/RestUrls';
import RitzModal from '@/components/Ritz/RitzModal';
import { getPaginateSupplierListURL } from '@/helpers/constants/rest_urls/SharedUrls';
import SettlementDetails from './SettlementDetails';
import Checkbox from '@mui/material/Checkbox';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PCLDueCalender from './PCLDueCalender';
import { outgoingPaymentDetailPageURL } from '@/helpers/constants/front_end/FinanceUrls';
import NotificationImportantIcon from '@mui/icons-material/NotificationImportant';
import PCLDueSettlementList from './PCLDueSettlementList';

const PCLSettlementList = () => {
    const theme = useTheme();
    const keyHelper = new ReactKeyHelper();
    const [isLoading, setIsLoading] = useState(true);
    const [isFiltering, setIsFiltering] = useState(false)
    const [isLoadingCircularLoader, setIsLoadingCircularLoader] = useState(false);
    const [openSettlementModal, setOpenSettlementModal] = useState(false);
    const [openDueSettlementList, setOpenDueSettlementList] = useState(false);
    const [pclSettlementData, setPclSettlementData] = useState<any>({})
    const [selectedSearchValues, setSelectedSearchValues] = useState<any>({})
    const [customers, setCustomers] = useState<any>([])
    const [selectedRowData, setSelectedRowData] = useState<any>([])
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(50);

    const LoadSettlementData = () => {
        api.get(pclSettlementListURL(
            selectedSearchValues?.customer || '', 
            selectedSearchValues?.supplier || '', 
            selectedSearchValues?.start_date || '', 
            selectedSearchValues?.end_date || '',
            page + 1, 
            rowsPerPage > 50 ? rowsPerPage : 50, 
        ))
            .then((response) => {
                const settlementData = response?.data;
                 setPclSettlementData({ ...settlementData })
                setSelectedSearchValues({
                    ...selectedSearchValues,
                    start_date: settlementData?.meta_data?.start_date,
                    end_date: settlementData?.meta_data?.end_date,
                });
            })
            .catch((error) => {
                toast.error(getDefaultError(error?.response?.status));
            })
            .finally(() => {
                setIsLoading(false);
                setIsLoadingCircularLoader(false);
            });
    };

    const fetchMetaData = () => {
        const requests = [
            api.get(customersURL()),
        ];
        Promise.all(requests).then(resp => {
            const respData = resp.map((r: any) => r.data);
            const [customers] = respData;
            const updatedCustomers = [{ id: 'all', name: 'All' }, ...customers];
            setCustomers([...updatedCustomers])
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false),
                setIsLoadingCircularLoader(false)
        });
    }
    const handleFilterToggle = () => {
        setIsFiltering((prev) => !prev);
    }
    const handleSearchTextValue = (selectValue: any, feild: any) => {
        setSelectedSearchValues((prevState: any) => ({
            ...prevState,
            [feild]: selectValue || '',
        }));
    }
    const handleOpenSettlementModal = (status: any) => {
        setOpenSettlementModal(status)
    }
    const handleCheckboxChange = (isChecked: boolean, supplier: any, supplierIndex: any) => {
        if (isChecked) {
            setSelectedRowData((prev: any) => [...prev, supplier]);
        } else {
            setSelectedRowData((prev: any[]) => prev.filter((item) => item.index !== supplierIndex));
        }
    };
    const handleCheckAll = (isChecked: boolean) => {
        if (isChecked) {
            setSelectedRowData(pclSettlementData?.results || []);
        } else {
            setSelectedRowData([]);
        }
    };
    const handleChangePage = (event: any, newPage: number) => {
        setPage(newPage);
      };

    const handleChangeRowsPerPage = (event: any) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
      };
    const handleOpenDueSettlements = (status: any) => {
        setOpenDueSettlementList(status)
    }

    const handleOpenDueSettlementModal =(selectedRowData: any) => { 
        setOpenDueSettlementList(false);
        setSelectedRowData(selectedRowData);
        setOpenSettlementModal(true);
    }

    const refreshStates = () => {
        setSelectedRowData([]);
    }
    
    
    const isAllChecked = selectedRowData.length === pclSettlementData?.results?.length;

    useEffect(() => {
        fetchMetaData()
    }, []);

    useEffect(() => {
        LoadSettlementData()
    }, [page, rowsPerPage]);

    return (
        <>
            {isLoadingCircularLoader && (<CircularLoader />)}
            {openSettlementModal && (
                <RitzModal open={openSettlementModal} onClose={() => { setOpenSettlementModal(false), refreshStates() }} maxWidth='lg' fullWidth={true} title={"Settlement Details"}>
                    <SettlementDetails selectedData={selectedRowData} refreshData={(status: any) => { setOpenSettlementModal(false); LoadSettlementData() }} />
                </RitzModal>
            )}
             {openDueSettlementList && (
                <RitzModal open={openDueSettlementList} onClose={() => { setOpenDueSettlementList(false), refreshStates() }} maxWidth='lg' fullWidth={true} title={"Due Settlement List"}>
                   <PCLDueSettlementList openSettlementModal={handleOpenDueSettlementModal} />
                </RitzModal>
            )}

            {isLoading ? (
                <DefaultLoader />
            ) : (
                <>

                    <Box>
                        <Typography variant='h1' color='text.primary' sx={{ mt: 2 }}>PCL Settlement List</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                        <Tooltip title={isFiltering ? "Remove Filter" : "Filter"} arrow>
                            <IconButton size="small" color="primary" onClick={handleFilterToggle}>
                                {isFiltering ? <FilterAltOffIcon /> : <FilterAltIcon />}
                            </IconButton>
                        </Tooltip>
                        <Tooltip title={"Due Settlements"} arrow>
                            <IconButton size="small" sx={{ color: "error.main" }} onClick={() => { handleOpenDueSettlements(true) }}>
                                <Badge badgeContent={pclSettlementData?.meta_data?.due_count || 0} color="secondary">
                                    <NotificationImportantIcon />
                                </Badge>
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
                                        onClick={() => { setIsLoadingCircularLoader(true); LoadSettlementData() }}
                                    > <SearchIcon /> Search</Button>
                                </Grid>
                            </Grid>
                        </Box>
                    )}
                    <Box sx={{ display: 'flex', justifyContent: 'end', mt: 2 }}>
                        {/* <Tooltip title={'Settlement Calender'} arrow>
                            <IconButton size="small" color="primary" onClick={() => { handleOpenSettlementCalender(true) }}>
                                <CalendarMonthIcon />
                            </IconButton>
                        </Tooltip> */}
                        <Button disabled={selectedRowData?.length === 0} variant="contained" sx={{ ml: 2 }} color="primary" onClick={() => { handleOpenSettlementModal(true) }}>Settle</Button>
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
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>SPO / CI</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Customer</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Buyer PO</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Material Types</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Supplier</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Payment Term</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Outgoing Payments</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Balance Amount Due (USD)</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Amount (USD)</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Due Date</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Document</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {pclSettlementData?.results?.length === 0 ? (
                                    <TableRow sx={{ background: '#fff' }}>
                                        <TableCell colSpan={12} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>No available data.</TableCell>
                                    </TableRow>
                                ) : (
                                    pclSettlementData?.results?.map((supplier: any, supplierIndex: any) => (
                                        <TableRow key={keyHelper.getNextKeyValue()} sx={{ background: '#fff' }}>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}><Checkbox
                                                checked={selectedRowData.some((row: any) => row.index === supplier.index)}
                                                onChange={(e) => handleCheckboxChange(e.target.checked, supplier, supplier?.index)}
                                            /></TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                                    <Typography>{supplier?.display_number}</Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{supplier?.customer_name}</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{supplier?.costing_or_po_club}</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{supplier?.material_types?.map((material: any) => material).join(' , ')}</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{supplier?.supplier_name}</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{supplier?.payment_term}</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                {supplier?.outgoing_payment_data?.map((outgoingPayment: any, index: number) => (
                                                    <Box key={outgoingPayment?.id || index}>
                                                        <Link
                                                            href={outgoingPaymentDetailPageURL(outgoingPayment?.id)} 
                                                            target='_blank'
                                                            color="primary"
                                                        >
                                                            {outgoingPayment?.display_number}
                                                        </Link>
                                                        {index < supplier?.outgoing_payment_data.length - 1 && ', '}
                                                    </Box>
                                                ))}
                                            </TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{formatAmount(supplier?.balance?.amount)}</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{formatAmount(supplier?.amount?.amount)}</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{supplier?.payment_due_date}</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}><Link href={supplier.file_path?.file_path || '#'} target="_blank">{supplier.file_path?.display_name || '--'}</Link></TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                        <TablePagination
                            rowsPerPageOptions={[50, 100, 150]}
                            component="div"
                            count={pclSettlementData?.results?.length || 0}
                            rowsPerPage={rowsPerPage}
                            page={page}
                            onPageChange={handleChangePage}
                            onRowsPerPageChange={handleChangeRowsPerPage}
                        />
                    </Box>
                </>
            )}
        </>
    );
};

export default PCLSettlementList;
