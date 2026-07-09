import React, { useState } from 'react';
import DefaultLoader from '@/components/DefaultLoader';
import { Table, TableHead, TableRow, TableCell, TableBody, Box, Typography, useTheme, Tooltip, Link } from '@mui/material';
import { ReactKeyHelper } from '@/helpers/KeyHelper';
import InfoIcon from '@mui/icons-material/Info';
import RitzToolTip from '@/components/Ritz/RitzTooltip';
import { purchaseOrderDetailPageURL } from '@/helpers/constants/FrontEndUrls';
import { formatAmount } from '@/helpers/Utilities';

const OrderProfitabilityDetails = ({ dataSet, totalAmountDataSet }: any) => {
    const theme = useTheme()
    const keyHelper = new ReactKeyHelper();
    const [isLoading, setIsLoading] = useState(false);
    
    return (
        <>
            {isLoading ? (
                <DefaultLoader />
            ) : (
                <>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ background: theme.palette.grey[200], border: (theme) => `1px solid ${theme.palette.grey[100]}` }}>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Material Category</TableCell>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Supplier</TableCell>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Supplier PO</TableCell>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Payment Term</TableCell>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Confirmed Delivery Date</TableCell>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Amount</TableCell>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Settlement(PCL)</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {dataSet?.map((materialCategory: any, materialCategoryIndex: any) => (
                                <React.Fragment  key={`${keyHelper.getNextKeyValue()}`}>
                                    <TableRow key={`${keyHelper.getNextKeyValue()}`}>
                                        <TableCell colSpan={7} sx={{ background: theme.palette.grey[100], border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                            <Typography sx={{ mr: 1 }} fontWeight={'bold'} fontSize={'1.3rem'} >
                                                {materialCategory?.category ==="fabric"
                                                    ? "Fabric"
                                                    : materialCategory.category ==="sewing_trim"
                                                        ? "Sewing Trim"
                                                        : materialCategory.category ==="packaging_trim"
                                                            ? "Packaging"
                                                            : '#'}
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                    {materialCategory.supplier_data?.map((supplier: any, supplierIndex: any) => (
                                        supplier?.delivery_dates?.map((delivery:any, spoIndex:any)=>(
                                        <React.Fragment  key={`${keyHelper.getNextKeyValue()}`}>
                                            <TableRow>
                                            {supplierIndex === 0 && spoIndex === 0 && (
                                                <>
                                                    <TableCell 
                                                        rowSpan={materialCategory.supplier_data.reduce((acc: number, supplier: any) => acc + (supplier?.delivery_dates?.length || 0), 0)} 
                                                        sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left', p: 1 }}
                                                    >
                                                        <Typography sx={{ mr: 1 }} textAlign={'left'} >{materialCategory?.material_categories?.join(' / ') || 'N/A'}</Typography>
                                                    </TableCell>
                                                </>
                                              
                                            )}
                                            {spoIndex===0 &&(
                                                <>
                                                    <TableCell rowSpan={supplier?.delivery_dates?.length} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left', p: 1 }}>
                                                        <Typography sx={{ mr: 1 }} textAlign={'left'} >{supplier?.supplier_name}</Typography>
                                                    </TableCell>
                                                    <TableCell rowSpan={supplier?.delivery_dates?.length} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left', p: 1 }}>
                                                        <Link sx={{cursor: 'pointer'}} target={'_blank'} href={supplier?.file_path}>{supplier?.display_number}</Link>
                                                    </TableCell>
                                                </>
                                              
                                            )}
                                             <TableCell  sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>{supplier?.payment_terms?.join(' / ') || 'N/A'}</TableCell>
                                             <TableCell  sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>{delivery?.confirmed_delivery_date || '--'}</TableCell>
                                             <TableCell  sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>{formatAmount(delivery?.amount?.amount)} {delivery?.amount?.amount_currency_display}</TableCell>
                                             <TableCell  sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>
                                                <Link sx={{cursor: 'pointer'}} target={'_blank'} href={purchaseOrderDetailPageURL(delivery?.purchase_order_id)}>{delivery?.settlement || '--'}</Link>
                                             </TableCell>
                                            </TableRow>
                                        </React.Fragment>
                                         ))
                                    ))}  
                                </React.Fragment>

                            ))}
                                <TableRow >
                                    <TableCell colSpan={7} sx={{ background: theme.palette.grey[100], border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                    <Typography sx={{ mr: 1 }} fontWeight={'bold'} fontSize={'1.3rem'} >
                                               Summary
                                            </Typography>
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell colSpan={5} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left', fontWeight:'bold' }}>Description</TableCell>
                                    <TableCell colSpan={2} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left', fontWeight:'bold' }}>Amount</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell colSpan={5} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            Total Supplier Payment
                                            <Tooltip title={"Total expected amount to settle SPO for all materials."} disableInteractive>
                                                <InfoIcon fontSize="small" sx={{ opacity: 0.6 }} />
                                            </Tooltip>
                                        </Box>
                                    </TableCell>
                                    <TableCell colSpan={2} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>
                                        {formatAmount(totalAmountDataSet?.supplier_pos_total_amount?.amount)} {totalAmountDataSet?.supplier_pos_total_amount?.amount_currency_display}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell colSpan={5} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            Total Supplier Paid Amount
                                            <Tooltip title={"Currently paid amount, excluding advance payments."} disableInteractive>
                                                <InfoIcon fontSize="small" sx={{ opacity: 0.6 }} />
                                            </Tooltip>
                                        </Box>
                                    </TableCell>
                                    <TableCell colSpan={2} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>
                                        {formatAmount(totalAmountDataSet?.supplier_pos_total_paid_amount?.amount)} {totalAmountDataSet?.supplier_pos_total_paid_amount?.amount_currency_display}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell colSpan={5} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            Total Supplier Advance Amount
                                            <Tooltip title={"Total advance payment  paid  for  all suppliers"} disableInteractive>
                                                <InfoIcon fontSize="small" sx={{ opacity: 0.6 }} />
                                            </Tooltip>
                                        </Box>
                                    </TableCell>
                                    <TableCell colSpan={2} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>
                                        {formatAmount(totalAmountDataSet?.supplier_pos_total_advance_amount?.amount)} {totalAmountDataSet?.supplier_pos_total_advance_amount?.amount_currency_display}
                                    </TableCell>
                                </TableRow>
                        </TableBody>
                    </Table>

                </>
            )}

        </>
    );
};

export default OrderProfitabilityDetails;