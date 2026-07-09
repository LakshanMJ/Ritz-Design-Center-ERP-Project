import React, { useEffect, useState } from 'react';
import { formatAmount, getDefaultError } from '@/helpers/Utilities';
import toast from 'react-hot-toast';
import DefaultLoader from '@/components/DefaultLoader';
import { ReactKeyHelper } from '@/helpers/KeyHelper';
import api from '@/services/api';
import { Box, Button, Card, CardContent, CardHeader, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, ToggleButton, ToggleButtonGroup, Typography, Paper, Tooltip, IconButton, Link, useTheme, LinearProgress, Alert, Input } from '@mui/material';
import { customersURL } from '@/helpers/constants/RestUrls';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RitzTablePagination from '@/components/Ritz/RitzTablePagination';
import NextLink from 'next/link';
import { pclFacilityDetailsPageURL, pclSummaryDetailsPageURL } from '@/helpers/constants/front_end/FinanceUrls';
import { pclFacilityListURL } from '@/helpers/constants/rest_urls/FinanceUrls';

const PCLFacilityList = () => {
    const theme = useTheme();
    const keyHelper = new ReactKeyHelper();
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingFacilityData, setIsLoadingFacilityData] = useState(false);
    const [customers, setCustomers] = useState<any>([])
    const [selectedCustomer, setSelectedCustomer] = useState<any>(0);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(50);
    const [globalFilter, setGlobalFilter] = useState('');
    const [customerPCLFacilityList, setCustomerPCLFacilityList] = useState<any>({});
    console.log(customerPCLFacilityList, "customerPCLFacilityList")
    const fetchData = () => {
        api.get(customersURL()).then(resp => {
            setCustomers(resp.data);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoading(false));
    }

    const loadFacilityData = (supplierId: any) => {
        setIsLoadingFacilityData(true)
        api.get(pclFacilityListURL(supplierId, globalFilter)).then(resp => {
            setCustomerPCLFacilityList({ ...resp.data });
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoadingFacilityData(false));
    }

    const handleCustomerOnChange = (event: any, newCustomer: any) => {
        setSelectedCustomer(newCustomer || 0);
        loadFacilityData(newCustomer || 0)
    };

    const handleChangePage = (event: any, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: any) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        loadFacilityData(0)
    }, [page, rowsPerPage]);

    return (
        <>
            {isLoading ? (
                <DefaultLoader />
            ) : (
                <>
                    <Box>
                        <Typography variant='h1' color='text.primary'>PCL Facility DashBoard</Typography>
                    </Box>
                    <Box>
                        <ToggleButtonGroup
                            color="primary"
                            value={selectedCustomer}
                            exclusive
                            onChange={handleCustomerOnChange}
                            aria-label="Customer"
                            sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}
                        >
                            <ToggleButton style={{
                                height: '4em',
                                minWidth: '150px',
                                border: '1px solid #E0E0E0',
                                borderRadius: '5px',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                textAlign: 'center',
                                marginBottom: '10px',
                            }} value={0}>
                                All
                            </ToggleButton>
                            {customers.map((customer: any) => (
                                <ToggleButton key={customer.id} style={{
                                    height: '4em',
                                    minWidth: '150px',
                                    border: '1px solid #E0E0E0',
                                    borderRadius: '5px',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    textAlign: 'center',
                                    marginBottom: '10px',
                                }} value={customer.id}>
                                    {customer.name}
                                </ToggleButton>
                            ))}
                        </ToggleButtonGroup>
                    </Box>
                    <Box display="flex" justifyContent="flex-end" sx={{ mb: 1 }} >
                        <Input
                            size='small'
                            autoFocus
                            value={globalFilter ?? ''}
                            onChange={e => { setGlobalFilter(String(e.target.value)) }}
                            placeholder='Search'
                            sx={{
                                mr: 0.5,
                                '& .MuiInputBase-input': {
                                    background: 'none'
                                }
                            }}
                        />
                        <Button
                            size='small'
                            variant='outlined'
                            sx={{ ml: 0.5 }}
                            onClick={() => { loadFacilityData(selectedCustomer) }}
                            disabled={isLoading}
                        >
                            Search
                        </Button>
                    </Box>
                    <Box>
                        {isLoadingFacilityData ? (
                            <DefaultLoader />
                        ) : (
                            <>
                                {customerPCLFacilityList?.results?.length > 0 ? (
                                    <>
                                        {customerPCLFacilityList?.results?.map((facility: any) => (
                                            <Card key={facility.id} sx={{ mb: 3 }}>
                                                <CardHeader
                                                    title={
                                                        <Box display="flex" justifyContent="space-between" alignItems="center">
                                                            <Box sx={{ color: 'primary.main' }}> {facility.display_number} </Box>
                                                            <Tooltip title="View Details" arrow>
                                                                <Link component={NextLink} href={pclFacilityDetailsPageURL(facility.id)}>
                                                                    <IconButton color="primary">
                                                                        <VisibilityIcon fontSize="inherit" />
                                                                    </IconButton>
                                                                </Link>
                                                            </Tooltip>
                                                        </Box>
                                                    }
                                                    sx={{
                                                        fontWeight: 'bold',
                                                        background: (theme) => theme.palette.grey[100],
                                                        borderBottom: (theme) => `1px solid ${theme.palette.grey[300]}`,
                                                    }}
                                                />
                                                <CardContent>
                                                    {/* Progress Bar Section */}
                                                    <Box>
                                                        <Typography variant="body2" fontWeight="bold" gutterBottom>
                                                            Facility Usage
                                                        </Typography>
                                                        <Box display="flex" justifyContent="flex-end">
                                                            <Typography variant="body2">
                                                                Total: {facility.pcl_threshold_amount?.amount.toLocaleString()} USD
                                                            </Typography>
                                                        </Box>
                                                        <Box sx={{ position: 'relative', width: '100%', mt: 1 }}>
                                                            <LinearProgress
                                                                variant="determinate"
                                                                value={(facility.used_amount.amount / facility.pcl_threshold_amount.amount) * 100}
                                                                sx={{
                                                                    height: 15,
                                                                    borderRadius: 5,
                                                                    backgroundColor: (theme) => theme.palette.grey[300],
                                                                    '& .MuiLinearProgress-bar': {
                                                                        backgroundColor: 'green'
                                                                    },
                                                                }}
                                                            />
                                                        </Box>
                                                        <Typography variant="body2" align="right" mt={1} color="textSecondary">
                                                            Used: {facility.used_amount.amount.toLocaleString()} USD
                                                        </Typography>
                                                    </Box>
                                                    {/* PO Club Data Loop */}
                                                    <Box sx={{ mt: 2 }}>
                                                        {facility?.po_club_data?.map((poClub: any) => {
                                                            const totalFacilityValue = facility.pcl_threshold_amount?.amount || 1;
                                                            const maxAmount = poClub?.max_pcl_value?.amount || 1;
                                                            const usedAmount = poClub?.used_amount?.amount || 0;

                                                            const progress = (usedAmount / maxAmount) * 100;
                                                            const scaledWidth = (maxAmount / totalFacilityValue) * 100;

                                                            return (
                                                                <React.Fragment key={poClub.id}>
                                                                    <Box sx={{ mt: 4, mb: 2 }}>
                                                                        {/* PO Club Title & FOB Percentage */}
                                                                        <Box sx={{ mb: 4 }}>
                                                                            <Typography variant="body2" sx={{ fontWeight: 'bold' }} gutterBottom>
                                                                                <Link
                                                                                    component={NextLink}
                                                                                    href={"poClubDetailsPageURL(poClub.id)"}
                                                                                    sx={{ textDecoration: 'none', color: 'primary.main' }}
                                                                                >
                                                                                    {poClub.short_code}
                                                                                </Link>
                                                                                {" - "}
                                                                                <Tooltip title={`FOB Percentage: ${poClub.material_fob_presentage}%`} arrow>
                                                                                    <Typography component="span" sx={{ color: 'text.secondary', cursor: 'pointer' }}>
                                                                                        {poClub.material_fob_presentage}%
                                                                                    </Typography>
                                                                                </Tooltip>
                                                                            </Typography>
                                                                        </Box>
                                                                        {/* Progress Bar Container */}
                                                                        <Box sx={{ position: 'relative', width: `${scaledWidth}%`, mt: 1 }}>
                                                                            <LinearProgress
                                                                                variant="determinate"
                                                                                value={progress}
                                                                                sx={{
                                                                                    height: 15,
                                                                                    borderRadius: 5,
                                                                                    backgroundColor: (theme) => theme.palette.grey[300],
                                                                                    '& .MuiLinearProgress-bar': {
                                                                                        backgroundColor: 'success.main'
                                                                                    },
                                                                                }}
                                                                            />
                                                                            <Box display="flex" justifyContent="space-between" sx={{ mt: -5, position: 'relative' }}>
                                                                                <Typography variant="body2" sx={{ position: 'absolute', right: 0 }}>
                                                                                    Max PCL: {maxAmount.toLocaleString()} USD
                                                                                </Typography>
                                                                            </Box>
                                                                            <Box display="flex" justifyContent="space-between" sx={{ mt: 5.5, position: 'relative' }}>
                                                                                <Typography variant="body2" sx={{ position: 'absolute', right: 0, color: 'text.secondary' }}>
                                                                                    Used: {usedAmount.toLocaleString()} USD
                                                                                </Typography>
                                                                            </Box>
                                                                        </Box>
                                                                    </Box>
                                                                </React.Fragment>
                                                            );
                                                        })}
                                                        {facility?.foreign_pcl_po_clubs?.map((foreignPoClub: any) => {
                                                            const totalFacilityValue = facility.pcl_threshold_amount?.amount || 1;
                                                            const maxAmount = facility.pcl_threshold_amount?.amount || 1;
                                                            const usedAmount = foreignPoClub?.used_amount?.amount || 0;

                                                            const progress = (usedAmount / maxAmount) * 100;
                                                            const scaledWidth = (maxAmount / totalFacilityValue) * 100;

                                                            return (
                                                                <React.Fragment key={foreignPoClub.id}>
                                                                    <Box sx={{ mt: 4, mb: 2 }}>
                                                                        {/* Foreign PO Club Title & FOB Percentage */}
                                                                        <Box sx={{ mb: 4 }}>
                                                                            <Typography variant="body2" sx={{ fontWeight: 'bold' }} gutterBottom>

                                                                                <Link
                                                                                    component={NextLink}
                                                                                    href={"foreignPoClubDetailsPageURL(foreignPoClub.id)"}
                                                                                    sx={{ textDecoration: 'none', color: 'primary.main' }}
                                                                                >
                                                                                    {foreignPoClub.short_code}
                                                                                </Link>
                                                                                {" - "}
                                                                                <Tooltip title={`FOB Percentage: ${foreignPoClub.material_fob_presentage}%`} arrow>
                                                                                    <Typography component="span" sx={{ color: 'text.secondary', cursor: 'pointer' }}>
                                                                                        {foreignPoClub.material_fob_presentage}%
                                                                                    </Typography>
                                                                                </Tooltip>
                                                                                {" - "}
                                                                                <Typography component="span" sx={{ color: "error.main", fontWeight: 'bold' }}>
                                                                                    Foreign
                                                                                </Typography>
                                                                            </Typography>
                                                                        </Box>
                                                                        {/* Progress Bar Container */}
                                                                        <Box sx={{ position: 'relative', width: `${scaledWidth}%`, mt: 1 }}>
                                                                            <LinearProgress
                                                                                variant="determinate"
                                                                                value={progress}
                                                                                sx={{
                                                                                    height: 15,
                                                                                    borderRadius: 5,
                                                                                    backgroundColor: (theme) => theme.palette.grey[300],
                                                                                    '& .MuiLinearProgress-bar': {
                                                                                        backgroundColor: 'success.main'
                                                                                    },
                                                                                }}
                                                                            />
                                                                            <Box display="flex" justifyContent="space-between" sx={{ mt: -5, position: 'relative' }}>
                                                                                <Typography variant="body2" sx={{ position: 'absolute', right: 0 }}>
                                                                                    Max PCL: {maxAmount.toLocaleString()} USD
                                                                                </Typography>
                                                                            </Box>
                                                                            <Box display="flex" justifyContent="space-between" sx={{ mt: 5.5, position: 'relative' }}>
                                                                                <Typography variant="body2" sx={{ position: 'absolute', right: 0, color: 'text.secondary' }}>
                                                                                    Used: {usedAmount.toLocaleString()} USD
                                                                                </Typography>
                                                                            </Box>
                                                                        </Box>
                                                                    </Box>
                                                                </React.Fragment>
                                                            );
                                                        })}
                                                    </Box>
                                                </CardContent>
                                            </Card>
                                        ))}
                                        {customerPCLFacilityList?.results?.length > 0 && (
                                            < Box sx={{ display: 'flex', justifyContent: 'flex-end', width: '100%', mt: 1 }}>
                                                <RitzTablePagination
                                                    count={customerPCLFacilityList?.results?.length || 0}
                                                    page={page}
                                                    rowsPerPage={rowsPerPage}
                                                    onPageChange={handleChangePage}
                                                    onRowsPerPageChange={handleChangeRowsPerPage}
                                                    next={customerPCLFacilityList?.next}
                                                />
                                            </Box>
                                        )}
                                    </>) : (
                                    <Alert sx={{ mt: 2 }} severity="info" >No available PCL Facilities .</Alert>
                                )}

                            </>
                        )}
                    </Box>
                </>
            )}
        </>
    );
};

export default PCLFacilityList;