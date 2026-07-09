import React, { useEffect, useState } from 'react';
import DefaultLoader from '@/components/DefaultLoader';
import RitzTable from '@/components/Ritz/RitzTable';
import { ColumnDef } from '@tanstack/react-table';
import { Table, TableHead, TableRow, TableCell, TableBody, IconButton, Box, Link, List, ListItem, ListItemText, Typography, useTheme, Tooltip } from '@mui/material';
import NextLink from 'next/link';
import { ReactKeyHelper } from '@/helpers/KeyHelper';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { incomingPaymentDetailPageURL } from '@/helpers/constants/front_end/FinanceUrls';
import EditIcon from '@mui/icons-material/Edit';
import RitzModal from '@/components/Ritz/RitzModal';
import CreateIncomingPayment from './CreateIncomingPayment';
import PCLCreateIncomingPayment from './PCLCreateIncomingPayment';
import api from '@/services/api';
import { pclSupplierGRNSummaryURL } from '@/helpers/constants/rest_urls/FinanceUrls';
import toast from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';
import { purchaseOrderDetailPageURL } from '@/helpers/constants/FrontEndUrls';
import { createdGrnDetailsPageURL } from '@/helpers/constants/front_end/GrnUrls';
import PrintRitzHeader from '@/components/PrintRitzHeader';

const PCLSupplierGRNSummary = ({ clubId }: any) => {
    const LOGO_PATH = '/images/logo-new.png';
    const theme = useTheme()
    const keyHelper = new ReactKeyHelper();
    const [isLoading, setIsLoading] = useState(true);
    const [pclSummaryData, setPCLSummaryData] = useState<any>({});

    const fetchData = () => {
        const requests = [
            api.get(pclSupplierGRNSummaryURL(clubId)),
        ]
        Promise.all(requests).then(response => {
            const [poClubDetails] = response.map((r: any) => r.data);
            setPCLSummaryData({ ...poClubDetails })
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false)
        });
    }

    useEffect(() => {
        if (clubId) {
            fetchData()
        }
    }, [clubId])


    return (
        <>
            <PrintRitzHeader logoPath={LOGO_PATH} title="PCL Order Summary" />
            
            {isLoading ? (
                <DefaultLoader />
            ) : (
                <>
                    <Box>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ background: theme.palette.grey[200], border: (theme) => `1px solid ${theme.palette.grey[100]}` }}>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Supplier</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Materials</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Country</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Production Lead Time</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Shipment Time</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Payment Term</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {pclSummaryData?.supplier_details?.map((supplier: any, supplierIndex: any) => (
                                    <TableRow  key={`${keyHelper.getNextKeyValue()}`}>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>{supplier?.supplier_name}</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>{supplier?.materials?.join(' / ') || 'N/A'}</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>{supplier?.country || '--'}</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>{supplier?.production_lead_time || 0} Days</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>{supplier?.shipment_time || 0} Days</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>{supplier?.payment_term || '--'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }} colSpan={3}>
                                        <Typography fontWeight={'bold'} fontSize="1rem">GRN Details</Typography>
                                    </TableCell>
                                </TableRow>
                                <TableRow sx={{ background: theme.palette.grey[200], border: (theme) => `1px solid ${theme.palette.grey[100]}` }}>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Material Category</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>GRN No</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Date</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {pclSummaryData?.purchase_order_details?.grns?.map((grn: any, grnIndex: any) => (
                                    <TableRow key={`${keyHelper.getNextKeyValue()}`}>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }} >{grn?.material_categories?.join(' / ') || 'N/A'}</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }} >
                                            <Link sx={{ cursor: 'pointer' }} target={'_blank'} href={createdGrnDetailsPageURL(grn?.id)}>{grn?.display_number}</Link>
                                        </TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>{grn?.complete_date}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold' }} colSpan={8}>
                                        <Typography  fontWeight={'bold'} fontSize="1rem">PCD / PSD / PED Details</Typography>
                                    </TableCell>
                                </TableRow>
                                <TableRow sx={{ background: theme.palette.grey[200], border: (theme) => `1px solid ${theme.palette.grey[100]}` }}>
                                    <TableCell sx={{ background: theme.palette.grey[100], border: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold' }}>Purchase Order</TableCell>
                                    <TableCell sx={{ background: theme.palette.grey[100], border: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold' }} >Production Cut Date (PCD)</TableCell>
                                    <TableCell sx={{ background: theme.palette.grey[100], border: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold' }} >PCD To PSD Days</TableCell>
                                    <TableCell sx={{ background: theme.palette.grey[100], border: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold' }} >Production Start Date (PSD)</TableCell>
                                    <TableCell sx={{ background: theme.palette.grey[100], border: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold' }} >PSD To PED Days</TableCell>
                                    <TableCell sx={{ background: theme.palette.grey[100], border: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold' }} >Production End Date (PED)</TableCell>
                                    <TableCell sx={{ background: theme.palette.grey[100], border: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold' }} >PED To Ex-factory Days </TableCell>
                                    <TableCell sx={{ background: theme.palette.grey[100], border: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold' }} >Ex-factory Date</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {pclSummaryData?.purchase_order_details?.purchase_order_date_details?.map((PODateDetails: any, poDateIndex: any) => (
                                    <TableRow key={`${keyHelper.getNextKeyValue()}`}>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>
                                            <Link sx={{ cursor: 'pointer' }} target={'_blank'} href={purchaseOrderDetailPageURL(PODateDetails?.id)}>{PODateDetails?.display_number}</Link>
                                        </TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }} >{PODateDetails?.production_cut_date || '--'}</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }} >{PODateDetails?.pcd_to_psd  || '--'}</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }} >{PODateDetails?.production_start_date || '--'}</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }} >{PODateDetails?.psd_to_ped  || '--'}</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }} >{PODateDetails?.production_end_date || '--'}</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }} >{PODateDetails?.ped_to_efd  || '--'}</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }} >{PODateDetails?.ex_factory_date || '--'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <Table>
                            <TableHead>
                                <TableRow >
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold' }} colSpan={3} > <Typography fontWeight={'bold'} fontSize="1rem">Shipments</Typography></TableCell>
                                </TableRow>
                                <TableRow sx={{ background: theme.palette.grey[200], border: (theme) => `1px solid ${theme.palette.grey[100]}` }}>
                                    <TableCell sx={{ background: theme.palette.grey[100], border: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold' }} >Purchase Order</TableCell>
                                    <TableCell sx={{ background: theme.palette.grey[100], border: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold' }} >Shipment</TableCell>
                                    <TableCell sx={{ background: theme.palette.grey[100], border: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold' }} >Shipment Date</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {pclSummaryData?.purchase_order_details?.shipments?.map((shipmentPO: any, poDateIndex: any) => (
                                    shipmentPO?.shipments?.map((shipment: any, shipmentIndex: any) => (
                                        <TableRow key={`${keyHelper.getNextKeyValue()}`}>
                                            {shipmentIndex === 0 && (
                                                <TableCell rowSpan={shipmentPO?.shipments?.length} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }} >
                                                    <Link sx={{ cursor: 'pointer' }} target={'_blank'} href={purchaseOrderDetailPageURL(shipmentPO?.id)}>{shipmentPO?.display_number}</Link>
                                                </TableCell>
                                            )}
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }} >{shipment?.display_number || '--'}</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }} >{shipment?.delivery_date || '--'}</TableCell>
                                        </TableRow>
                                    ))
                                ))}
                            </TableBody>
                        </Table>
                        <Table>
                            <TableHead>
                                 <TableRow >
                                    <TableCell sx={{fontWeight: 'bold',border: (theme) => `1px solid ${theme.palette.grey[200]}` }} colSpan={2}><Typography fontWeight={'bold'} fontSize="1rem">Payments</Typography></TableCell>
                                </TableRow>
                                <TableRow sx={{ background: theme.palette.grey[200], border: (theme) => `1px solid ${theme.palette.grey[100]}` }}>
                                    <TableCell sx={{ background: theme.palette.grey[100], border: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold' }} >Payment No</TableCell>
                                    <TableCell sx={{ background: theme.palette.grey[100], border: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold' }} >Date</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                            {pclSummaryData?.purchase_order_details?.payments?.length === 0 ?(
                                <TableRow >
                                    <TableCell colSpan={2} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }} >No available payments</TableCell>
                                </TableRow>
                            ):(
                                pclSummaryData?.purchase_order_details?.payments?.map((payment: any, paymentIndex: any) => (
                                    <TableRow key={`${keyHelper.getNextKeyValue()}`}>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }} >
                                            <Link component={NextLink} target="_blank" href={incomingPaymentDetailPageURL(payment.id)}>{payment?.display_number}</Link>
                                        </TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }} >{payment?.payment_date || '--'}</TableCell>
                                    </TableRow>
                                ))
                            )}
                                
                            </TableBody>
                        </Table>
                    </Box>
                </>
            )}

        </>
    );
};

export default PCLSupplierGRNSummary;