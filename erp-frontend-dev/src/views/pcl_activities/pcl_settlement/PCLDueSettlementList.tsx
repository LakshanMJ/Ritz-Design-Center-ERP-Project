import React, { useEffect, useState } from 'react';
import { formatAmount, getDefaultError } from '@/helpers/Utilities';
import toast from 'react-hot-toast';
import DefaultLoader from '@/components/DefaultLoader';
import { ReactKeyHelper } from '@/helpers/KeyHelper';
import api from '@/services/api';
import { pclDueSettlementListURL, pclSettlementListURL } from '@/helpers/constants/rest_urls/FinanceUrls';
import { Box, Button, Grid, IconButton, Link, Table, TableBody, TableCell, TableHead, TablePagination, TableRow, TextField, Tooltip, Typography, useTheme } from '@mui/material';
import { customersURL } from '@/helpers/constants/RestUrls';
import Checkbox from '@mui/material/Checkbox';
import { outgoingPaymentDetailPageURL } from '@/helpers/constants/front_end/FinanceUrls';
import SearchIcon from '@mui/icons-material/Search';

const PCLDueSettlementList = ({openSettlementModal}: any) => {
    const theme = useTheme();
    const keyHelper = new ReactKeyHelper();
    const [isLoading, setIsLoading] = useState(true);
    const [isFiltering, setIsFiltering] = useState(false)
    const [isLoadingCircularLoader, setIsLoadingCircularLoader] = useState(false);
    const [openSettlementCalender, setOpenSettlementCalender] = useState(false);
    const [openDueSettlementList, setOpenDueSettlementList] = useState(false);
    const [pclSettlementData, setPclSettlementData] = useState<any>({})
    const [selectedSearchValues, setSelectedSearchValues] = useState<any>({})
    const [customers, setCustomers] = useState<any>([])
    const [selectedRowData, setSelectedRowData] = useState<any>([])
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(50);
    const [searchText, setSearchText] = useState('');

    const LoadSettlementData = () => {
        api.get(pclDueSettlementListURL(page + 1, rowsPerPage > 50 ? rowsPerPage : 50, searchText ))
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

    const handleOpenSettlementModal = () => {
        openSettlementModal(selectedRowData)
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
    const handleOpenSettlementCalender = (status: any) => {
        setOpenSettlementCalender(status)
    }
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
    
    const isAllChecked = selectedRowData.length === pclSettlementData?.results?.length;

    useEffect(() => {
        LoadSettlementData()
    }, [page, rowsPerPage]);

    return (
        <>
            {isLoading ? (
                <DefaultLoader />
            ) : (
                <>
                    <Box sx={{ display: 'flex', justifyContent: 'end', mt: 2 }}>
                        <Button variant="contained" sx={{ ml: 2 }} color="primary" onClick={() => { handleOpenSettlementModal() }}>View</Button>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 1 }}>
                        <TextField
                            id="standard-basic"
                            label="SPO/CI"
                            variant="standard"
                            onChange={(e: any) => setSearchText(e.target.value)}
                            sx={{ mr: 1 }}
                        />
                        <IconButton  onClick={LoadSettlementData}>
                            <SearchIcon />
                        </IconButton>
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
                                                onChange={(e) => handleCheckboxChange(e.target.checked, supplier, supplierIndex)}
                                            /></TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                                    <Typography>{supplier?.display_number}</Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{supplier?.customer_name}</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{supplier?.costing_or_po_club}</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{formatAmount(supplier?.amount?.amount)}</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{supplier?.payment_due_date}</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}><Link href={'#'} target="_blank">{supplier.file_path?.display_name || '--'}</Link></TableCell>
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

export default PCLDueSettlementList;
