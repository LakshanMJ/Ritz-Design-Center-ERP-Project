import React, { useEffect, useState } from 'react';
import { formatAmount, getDefaultError } from '@/helpers/Utilities';
import toast from 'react-hot-toast';
import DefaultLoader from '@/components/DefaultLoader';
import { ReactKeyHelper } from '@/helpers/KeyHelper';
import api from '@/services/api';
import { dueAdvancePaymentsListInDateURL, dueAllPaymentsListInDateURL, dueInvoicePaymentListInDateURL } from '@/helpers/constants/rest_urls/FinanceUrls';
import { Box, Button, Grid, IconButton, Link, Table, TableBody, TableCell, TableHead, TablePagination, TableRow, TextField, Tooltip, Typography, useTheme } from '@mui/material';
import Checkbox from '@mui/material/Checkbox';
import SearchIcon from '@mui/icons-material/Search';

const DueSettlementDetails = ({selectedType, selectedDate, openSettlementModal}: any) => {
    const theme = useTheme();
    const keyHelper = new ReactKeyHelper();
    const [isLoading, setIsLoading] = useState(true);
    const [pclSettlementData, setPclSettlementData] = useState<any>({})
    const [selectedRowData, setSelectedRowData] = useState<any>([])
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(50);
    const [searchText, setSearchText] = useState('');

    const LoadSettlementData = () => {
        let dataURL;
        if (selectedType === 'due_payments') {
            dataURL = dueAllPaymentsListInDateURL(selectedDate,page + 1, rowsPerPage > 50 ? rowsPerPage : 50, searchText)
        } else if (selectedType === 'on_grn') {
            dataURL = dueInvoicePaymentListInDateURL(selectedDate,page + 1, rowsPerPage > 50 ? rowsPerPage : 50, searchText)
        } else if (selectedType === 'advance') {
            dataURL = dueAdvancePaymentsListInDateURL(selectedDate,page + 1, rowsPerPage > 50 ? rowsPerPage : 50, searchText)
        }
        api.get(dataURL)
            .then((response) => {
                const settlementData = response?.data;
                setPclSettlementData({ ...settlementData })
            })
            .catch((error) => {
                toast.error(getDefaultError(error?.response?.status));
            })
            .finally(() => {
                setIsLoading(false);
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

    const handleChangePage = (event: any, newPage: number) => {
        setPage(newPage);
      };

    const handleChangeRowsPerPage = (event: any) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
      };
    
    const isAllChecked = selectedRowData.length === pclSettlementData?.results?.length;

    useEffect(() => {
        LoadSettlementData()
    }, [page, rowsPerPage, selectedType]);

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
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Amount(USD)</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Paid Amount(USD)</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Balance Amount(USD)</TableCell>
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
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{supplier?.paid_amount?.amount}</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{supplier?.balance?.amount}</TableCell>
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

export default DueSettlementDetails;
