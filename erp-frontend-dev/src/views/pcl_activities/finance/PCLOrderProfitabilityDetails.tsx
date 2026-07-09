import React, { useEffect, useState } from 'react';
import DefaultLoader from '@/components/DefaultLoader';
import { Table, TableHead, TableRow, TableCell, TableBody, Box, useTheme} from '@mui/material';
import { ReactKeyHelper } from '@/helpers/KeyHelper';
import { formatAmount, getDefaultError } from '@/helpers/Utilities';
import PrintRitzHeader from '@/components/PrintRitzHeader';
import api from '@/services/api';
import toast from 'react-hot-toast';

const PCLOrderProfitabilityDetails = ({ dataURL }: any) => {
    const keyHelper = new ReactKeyHelper();
    const LOGO_PATH = '/images/logo-new.png';
    const theme = useTheme()
    const [isLoading, setIsLoading] = useState(true);
    const [profitabilityDetails, setProfitabilityDetails] = useState<any>({})

    const fetchData = () => {
        api.get(dataURL)
            .then(response => {
                const profitabilityDetails = response?.data || [];
                setProfitabilityDetails({ ...profitabilityDetails });
            })
            .catch(error => {
                toast.error(getDefaultError(error?.response?.status));
            })
            .finally(() => {
                setIsLoading(false);
            });
    }

    useEffect(() => {
        fetchData()
    }, [dataURL])

    return (
        <>
            <PrintRitzHeader logoPath={LOGO_PATH} title="PCL Order Summary" />
            {isLoading ? (
                <DefaultLoader />
            ) : (
                <>
                    <Table aria-label="simple table">
                        <TableBody>
                            <TableRow>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%' }}>
                                    Order Number
                                </TableCell>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%', wordBreak: 'break-all' }}>
                                    {profitabilityDetails?.order_number}
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%' }}>
                                    Ship To
                                </TableCell>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%', wordBreak: 'break-all' }}>
                                    {profitabilityDetails.shipto?.join(', ') || '--'}
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%' }}>
                                    Total Value
                                </TableCell>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%', wordBreak: 'break-all' }}>
                                    {formatAmount(profitabilityDetails?.total_fob_value?.amount)} {profitabilityDetails?.total_fob_value?.amount_currency_display}
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                    <Box sx={{ mt: 2 }}>
                        <Table aria-label="simple table">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%' }}>
                                        Cost Element
                                    </TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%', wordBreak: 'break-all' }}>
                                        Values
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <TableRow>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%' }}>
                                        Fabric Cost
                                    </TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%', wordBreak: 'break-all' }}>
                                        {formatAmount(profitabilityDetails?.total_fabric_cost?.amount)} {profitabilityDetails?.total_fabric_cost?.amount_currency}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%' }}>
                                        Sewing Trim Cost
                                    </TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%', wordBreak: 'break-all' }}>
                                        {formatAmount(profitabilityDetails?.total_sewing_trim_cost?.amount)} {profitabilityDetails?.total_sewing_trim_cost?.amount_currency}

                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%' }}>
                                        Packing Trim Cost
                                    </TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%', wordBreak: 'break-all' }}>
                                        {formatAmount(profitabilityDetails?.total_packing_trim_cost?.amount)} {profitabilityDetails?.total_packing_trim_cost?.amount_currency}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%' }}>
                                        Fabric Financing Cost
                                    </TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%', wordBreak: 'break-all' }}>
                                        {formatAmount(profitabilityDetails?.fabric_financing_cost?.amount)} {profitabilityDetails?.fabric_financing_cost?.amount_currency}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%' }}>
                                        Trim Financing Cost
                                    </TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%', wordBreak: 'break-all' }}>
                                        {formatAmount(profitabilityDetails?.trim_financing_cost?.amount)} {profitabilityDetails?.trim_financing_cost?.amount_currency}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%' }}>
                                        Embelishment Cost
                                    </TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%', wordBreak: 'break-all' }}>
                                        {formatAmount(profitabilityDetails?.total_embellishment_cost?.amount)} {profitabilityDetails?.total_embellishment_cost?.amount_currency}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%' }}>
                                        Wash Service Cost
                                    </TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%', wordBreak: 'break-all' }}>
                                        {formatAmount(profitabilityDetails?.total_wash_service_cost?.amount)} {profitabilityDetails?.total_wash_service_cost?.amount_currency}
                                    </TableCell>
                                </TableRow>
                                    {profitabilityDetails?.other_costs_data?.map((otherCost: any, otherCostIndex: any) => (
                                        <TableRow  key={`${keyHelper.getNextKeyValue()}`}>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%' }}>
                                               {otherCost?.name || '--'}
                                            </TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%', wordBreak: 'break-all' }}>
                                                {formatAmount(otherCost?.total_cost?.amount)} {otherCost?.total_cost?.amount_currency}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                <TableRow>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%', fontWeight: 'bold' }}>
                                        Total
                                    </TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%', wordBreak: 'break-all' }}>
                                        {formatAmount(profitabilityDetails?.total?.amount)} {profitabilityDetails?.total?.amount_currency_display}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </Box>
                    <Box sx={{ mt: 2 }}>
                        <Table aria-label="simple table">
                            <TableBody>
                                <TableRow>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%', fontWeight: 'bold' }}>
                                        Profit of the Order
                                    </TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%', wordBreak: 'break-all' }}>
                                        {formatAmount(profitabilityDetails?.total_order_profit?.amount)} {profitabilityDetails?.total_order_profit?.amount_currency}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%', fontWeight: 'bold' }}>
                                        Order Profitability Ratio (%)
                                    </TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%', wordBreak: 'break-all' }}>
                                        {profitabilityDetails?.total_profitability_ratio}
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </Box>

                </>
            )}

        </>
    );
};

export default PCLOrderProfitabilityDetails;