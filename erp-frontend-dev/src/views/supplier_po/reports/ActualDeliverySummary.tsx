import React, { useEffect, useState } from "react"
import Button from "@mui/material/Button";
import { Box, IconButton, Link, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography, useTheme } from '@mui/material';
import api from "@/services/api";
import DefaultLoader from "@/components/DefaultLoader";
import { toast } from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';
import { grnSummaryBreakdownUsingActualDeliveryURL } from "@/helpers/constants/rest_urls/SupplierPoUrls";
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import NextLink from 'next/link';
import RitzModal from "@/components/Ritz/RitzModal";
import InvoiceDetails from "./InvoiceDetails";


const ActualDeliverySummary = ({ spoId }: any) => {
    const theme = useTheme()
    const [isLoading, setIsLoading] = useState(true);
    const [acutalDeliveryMaterialData, setAcutalDeliveryMaterialData] = useState<any>({});
    const [isOpenInvModal, setIsOpenInvModal] = useState(false);
    const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);

    const fetchData = () => {
        setIsLoading(true);
        api.get(grnSummaryBreakdownUsingActualDeliveryURL( spoId)).then(resp => {
            const resdata = resp?.data || [];
            setAcutalDeliveryMaterialData(resdata);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoading(false));
    };
   
    const handleInvoiceModal = (invoiceId:any) => {
        setIsOpenInvModal(true)
        setSelectedInvoiceId(invoiceId)
    };
    const handleModalClose = () => {
        setIsOpenInvModal(false)
    }

    useEffect(() => {
        if (spoId) {
            fetchData();
        }
    }, [spoId]);

    return (
        <>
            {isLoading ? <DefaultLoader /> : <>
                {isOpenInvModal && (
                    <RitzModal
                        open={selectedInvoiceId}
                        onClose={handleModalClose}
                        maxWidth='lg'
                        title='Invoice Details'
                    >
                        <InvoiceDetails invoiceId={selectedInvoiceId} spoId={spoId} />
                    </RitzModal>)
                }
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ background: theme.palette.grey[100] }}>
                                <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>Material</TableCell>
                                <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>Ritz Code</TableCell>
                                <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>Delivery Type</TableCell>
                                <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>Plan Date</TableCell>
                                <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>Actual Date</TableCell>
                                <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>CI Quantity</TableCell>
                                <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>PL Quantity</TableCell>
                                {acutalDeliveryMaterialData?.pos?.length==0 ?(
                                    <TableCell  colSpan={2}  sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>Other Quantities</TableCell>
                                ):(
                                    acutalDeliveryMaterialData?.pos?.map((po: any, poIndex: number) => (
                                        <TableCell colSpan={2} key={poIndex} sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>{po.purchase_order_name}</TableCell>
                                    ))
                                )}
                                
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {acutalDeliveryMaterialData?.materials?.map((material: any, materialIndex: number) => (
                                material.delivery_dates.map((date: any, dateIndex: number) => (
                                    <>
                                        <TableRow key={`${materialIndex}-${dateIndex}`}>
                                            {dateIndex == 0 &&
                                             <>
                                                <TableCell rowSpan={(material.delivery_dates.length * 4)} sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold', width: '200px' }}>
                                                    {material.material_label}
                                                </TableCell>
                                                <TableCell rowSpan={(material.delivery_dates.length * 4)} sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold', width: '200px' }}>
                                                    {material.ritz_customer_brand_reference_code}
                                                </TableCell>
                                             </>
                                                
                                            }
                                            <TableCell rowSpan={4} sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>
                                                <Box sx={{ textAlign: 'center' }}>
                                                    <Box sx={{ fontWeight: 'bold' }}>
                                                        {date.display_value} ({date.confirmed_delivery_date})
                                                    </Box>
                                                    {date.invoice_id && (
                                                        <Box sx={{ display: 'flex', mt: 1, justifyContent: 'left' }}>
                                                            <FiberManualRecordIcon color={'primary'} sx={{ mr: 1 }} />
                                                            <Link component="button" onClick={() => handleInvoiceModal(date.invoice_id)}>
                                                                {date.invoice_display_number}
                                                            </Link>
                                                        </Box>
                                                    )}

                                                </Box>
                                            </TableCell>
                                            <TableCell rowSpan={2} sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{date.confirmed_delivery_date || '--'}</TableCell>
                                            <TableCell rowSpan={2} sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{date.actual_delivery_date || '--'}</TableCell>
                                            <TableCell rowSpan={2} sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{date.summary?.grn_indicated_quantity?.quantity || 0} {date.summary?.grn_indicated_quantity?.quantity_units_display}</TableCell>
                                            <TableCell rowSpan={2} sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{date.summary?.grn_indicated_quantity?.quantity || 0} {date.summary?.grn_indicated_quantity?.quantity_units_display}</TableCell>
                                            {acutalDeliveryMaterialData?.pos?.length == 0 ? (
                                                <>
                                                    <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left', fontWeight: 'bold', }}>
                                                        Expected PI Quantity
                                                    </TableCell>
                                                    <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>
                                                    {date?.summary?.supplier_po_total_pi_quantity?.quantity ?
                                                        `${date.summary.supplier_po_total_pi_quantity.quantity} ${date.summary.supplier_po_total_pi_quantity.quantity_units_display}` : '--'}
                                                    </TableCell>
                                                </>
                                            ) : (
                                                acutalDeliveryMaterialData.pos.map((po: any, poIndex: number) => (
                                                    <>
                                                        <TableCell key={poIndex} sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left', fontWeight: 'bold', }}>
                                                            Expected PI Quantity
                                                        </TableCell>
                                                        <TableCell key={poIndex} sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>
                                                            {(() => {
                                                                const expectedAllocation = date.summary?.purchaser_order_allocations?.find((poAllocation: { po_id: any; }) => poAllocation?.po_id === po.purchase_order_id);
                                                                return expectedAllocation ? `${expectedAllocation.supplier_po_purchase_order_allocated_pi_quantity?.quantity ?? ''} ${expectedAllocation.supplier_po_purchase_order_allocated_pi_quantity?.quantity_units_display ?? ''}` : '';
                                                            })()}
                                                        </TableCell>
                                                    </>
                                                ))
                                            )}
                                            
                                        </TableRow>
                                        <TableRow>
                                        {acutalDeliveryMaterialData?.pos?.length == 0 ? (
                                                <>
                                                    <TableCell  sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left', fontWeight: 'bold' }}>Actual Quantity</TableCell>
                                                    <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}> 
                                                        {date?.summary?.grn_total_actual_quantity?.quantity ?
                                                        `${date.summary.grn_total_actual_quantity.quantity} ${date.summary.grn_total_actual_quantity.quantity_units_display}` :
                                                        '--'}
                                                    </TableCell>
                                                </>
                                            ) : (
                                                acutalDeliveryMaterialData.pos.map((po: any, poIndex: number) => (
                                                    <>
                                                        <TableCell key={poIndex} sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left', fontWeight: 'bold' }}>
                                                            Actual Quantity
                                                        </TableCell>
                                                        <TableCell key={poIndex} sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>
                                                            {(() => {
                                                                const actualQuantity = date.summary?.purchaser_order_allocations?.find((poAllocation: { po_id: any; }) => poAllocation?.po_id == po.purchase_order_id);
                                                                return actualQuantity ? `${actualQuantity.purchase_order_allocated_quantity?.quantity ?? ''} ${actualQuantity.purchase_order_allocated_quantity?.quantity_units_display ?? ''}` : '';
                                                            })()}
                                                        </TableCell>
                                                    </>
                                                ))
                                        )}
                                        </TableRow>
                                        <TableRow>
                                            <TableCell colSpan={4} sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center', fontWeight: 'bold', color: '#1976d2' }}>
                                                Short/Excess Quantity
                                            </TableCell>
                                            {acutalDeliveryMaterialData?.pos?.length == 0 ? (
                                                <>
                                                    <TableCell colSpan={2} sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>
                                                        {date?.summary?.grn_deficit_quantity?.quantity ?
                                                            `${date.summary.grn_deficit_quantity.quantity} ${date.summary.grn_deficit_quantity.quantity_units_display}` :
                                                            '--'}
                                                    </TableCell>
                                                </>
                                            ) : (
                                                acutalDeliveryMaterialData.pos.map((po: any, poIndex: number) => (
                                                    <TableCell colSpan={2} key={poIndex} sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>
                                                        {(() => {
                                                            const shortQuantity = date.summary?.purchaser_order_allocations?.find((poAllocation: { po_id: any; }) => poAllocation?.po_id == po.purchase_order_id);
                                                            return shortQuantity ? `${shortQuantity.supplier_po_deficit_impact?.quantity ?? ''} ${shortQuantity.supplier_po_deficit_impact?.quantity_units_display ?? ''}` : '';
                                                        })()}
                                                    </TableCell>
                                                ))
                                            )}
                                        </TableRow>
                                        <TableRow>
                                            <TableCell colSpan={4} sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center', fontWeight: 'bold', color: 'red' }}>
                                                Rejected Quantity
                                            </TableCell>
                                            {acutalDeliveryMaterialData?.pos?.length == 0 ? (
                                                <>
                                                    <TableCell colSpan={2} sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>
                                                    {date?.summary?.grn_rejected_quantity?.quantity ?
                                                            `${date.summary.grn_rejected_quantity.quantity} ${date.summary.grn_rejected_quantity.quantity_units_display}` :
                                                            '--'}
                                                    </TableCell>
                                                </>
                                            ) : (
                                                acutalDeliveryMaterialData.pos.map((po: any, poIndex: number) => (
                                                    <TableCell colSpan={2} key={poIndex} sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>
                                                        {(() => {
                                                            const rejectQuantity = date.summary?.purchaser_order_allocations?.find((poAllocation: { po_id: any; }) => poAllocation?.po_id == po.purchase_order_id);
                                                            return rejectQuantity ? `${rejectQuantity.supplier_po_rejection_impact?.quantity ?? ''} ${rejectQuantity.supplier_po_rejection_impact?.quantity_units_display ?? ''}` : '';
                                                        })()}
                                                    </TableCell>
                                                ))
                                            )}
                                        </TableRow>
                                    </>
                                ))
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </>}
        </>
    );
};

export default ActualDeliverySummary;