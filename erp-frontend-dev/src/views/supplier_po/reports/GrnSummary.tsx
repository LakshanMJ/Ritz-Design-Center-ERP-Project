import React, { useEffect, useState } from "react"
import Button from "@mui/material/Button";
import { Alert, Box, Card, CardHeader, Grid, IconButton, Link, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography, darken, useTheme } from '@mui/material';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import VisibilityIcon from '@mui/icons-material/Visibility';
import api from "@/services/api";
import DefaultLoader from "@/components/DefaultLoader";
import { toast } from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';
import { getClubSupplierPODetailsURL, grnSummaryBreakdownUsingDeliveryDateIdURL, grnSummaryBreakdownUsingDeliveryIdURL, grnSummaryBreakdownUsingInvoiceIdURL, grnSummaryBreakdownUsingPackListIdURL, grnSummaryBreakdownUsingPerfomaInvoiceIdURL, grnSummaryBreakdownUsingSpoIdURL } from "@/helpers/constants/rest_urls/SupplierPoUrls";
import RitzMultipleFileUploader from "@/components/Ritz/RitzMultipleFileUploader";
import { LISTVIEW } from "@/helpers/constants/FileUpload";
import { purchaseOrderDetailPageURL } from "@/helpers/constants/FrontEndUrls";
import DoughnutChart from "@/components/Charts/DougnutChart";
import ActualDeliverySummary from "./ActualDeliverySummary";
import InspectionSummary from "./InspectionSummary";

const GRNSummary = ({ spoId, reportId, reportType }: any) => {
    const spoTypeKey = 'spo'
    const deliveryTypeKey = 'delivery'
    const packListTypeKey = 'packList'
    const invoiceTypeKey = 'invoice'
    const deliveryDateKey = 'deliveryDate'
    const performaInvoiceKey = 'performa'

    const orderQuantityKey = 'supplier_po_purchase_order_allocated_total_pi_quantity';
    const totalOrderQuantityKey = 'supplier_po_total_pi_quantity'


    const spoQuantityKey = 'supplier_po_purchase_order_allocated_quantity'
    const totalSpoQuantityKey = 'delivery_date_requested_quantity'

    const piQuantityKey = 'supplier_po_purchase_order_allocated_pi_quantity'
    const totalPiQuantityKey = 'delivery_date_pi_quantity'

    const grnQuantityKey = 'purchase_order_allocated_quantity'
    const totalGrnQuantityKey = 'grn_total_actual_quantity'

    const excessFOBQuantityKey = 'supplier_po_excess_impact'
    const totalExcessFOBQuantityKey = 'grn_in_housed_excess'

    const totalExcessReturnQuantityKey = 'grn_excess_quantity'

    const shortQuantityKey = 'supplier_po_deficit_impact'
    const totalShortQuantityKey = 'grn_deficit_quantity'

    const rejectQuantityKey = 'supplier_po_rejection_impact'
    const totalRejectQuantityKey = 'grn_rejected_quantity'

    const usableQuantityKey = 'supplier_po_allocated_quantity'
    const totalUsableQuantityKey = 'grn_usable_quantity'

    const poTotalRequiredQuantityKey = 'purchase_order_required_quantity';
    const poTotalAllocatedQuantityKey = 'purchase_order_allocated_quantity'
    const poGRNAllocatedQuantityKey = 'supplier_po_purchase_order_actual_allocated_quantity'
    const relatedPOTotalRequiredQuantityKey = 'related_purchase_orders_required_total_quantity'
    const supplierPOUsableQuantityKey = 'supplier_po_usable_quantity'


    const [isLoading, setIsLoading] = useState(true);
    const [materialDetails, setMaterialDetails] = useState<any>([]);

    const fetchData = () => {
        setIsLoading(true);
        let reportUrl;
        if (reportType === spoTypeKey) {
            reportUrl = grnSummaryBreakdownUsingSpoIdURL(reportId);
        } else if (reportType === deliveryTypeKey) {
            reportUrl = grnSummaryBreakdownUsingDeliveryIdURL(reportId, spoId);
        } else if (reportType === packListTypeKey) {
            reportUrl = grnSummaryBreakdownUsingPackListIdURL(reportId, spoId);
        } else if (reportType === invoiceTypeKey) {
            reportUrl = grnSummaryBreakdownUsingInvoiceIdURL(reportId, spoId);
        }
        else if (reportType === deliveryDateKey) {
            reportUrl = grnSummaryBreakdownUsingDeliveryDateIdURL(reportId, spoId);
        }
        else if (reportType === performaInvoiceKey) {
            reportUrl = grnSummaryBreakdownUsingPerfomaInvoiceIdURL(reportId, spoId);
        }

        api.get(reportUrl).then(resp => {
            const resdata = resp?.data || [];
            setMaterialDetails([...resdata]);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoading(false));
    };

    useEffect(() => {
        if (reportId) {
            fetchData();
        }
    }, [reportId]);


    return (
        <>
            {isLoading ? <DefaultLoader /> : <>
                <Box>
                    {
                        materialDetails.length === 0 ? (
                            <Alert severity="info">Material Details are not available </Alert>
                        ) : (
                            materialDetails.map((material: any, materialIndex: number) => {
                                const totalpendingQuantity = material[totalPiQuantityKey]?.quantity - material[totalGrnQuantityKey]?.quantity;
                                const finalTotalPendingQuantity = totalpendingQuantity < 0 ? 0 : totalpendingQuantity;

                                const supplierPOPendingQuantity = material[totalOrderQuantityKey]?.quantity - material?.[supplierPOUsableQuantityKey]?.quantity;
                                const totalSupplierPOPendingQuantity = supplierPOPendingQuantity < 0 ? 0 : supplierPOPendingQuantity;

                                return (
                                <React.Fragment key={materialIndex}>
                                    <Card variant="outlined" sx={{ mb: 3, mt: 1 }} key={materialIndex}>
                                        <CardHeader
                                            title={`${material?.material?.material_label} (${material?.material?.ritz_customer_brand_reference_code})`}
                                            sx={{
                                                background: (theme) => theme.palette.grey[100],
                                                fontWeight: 'bold',
                                                borderBottom: (theme) => `1px solid ${theme.palette.grey[300]}`,
                                            }}
                                        ></CardHeader>
                                        <Grid container spacing={1}>
                                            <TableContainer>
                                                <Table >
                                                    <TableHead>
                                                        <TableRow>
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}></TableCell>
                                                            {material.purchaser_order_allocations?.map((po: any, poIndex: any) => (
                                                                <TableCell key={poIndex} sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center', }}>
                                                                    <Link sx={{ cursor: 'pointer' }} href={purchaseOrderDetailPageURL(po.po_id)} target="_blank"> {po?.purchase_order_display_number} </Link>
                                                                </TableCell>
                                                            ))}
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center', fontWeight: "bold" }}>Total</TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody >
                                                        <TableRow>
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left', fontWeight: "bold" }}>Total Required Quantity</TableCell>
                                                            {material.purchaser_order_allocations?.map((po: any, poIndex: any) => (
                                                                <TableCell key={poIndex} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>
                                                                    {po[poTotalRequiredQuantityKey]?.quantity || 0} {po[poTotalRequiredQuantityKey]?.quantity_units_display}
                                                                </TableCell>
                                                            ))}
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>{material[totalOrderQuantityKey]?.quantity} {material[totalOrderQuantityKey]?.quantity_units_display}</TableCell>
                                                        </TableRow>
                                                        <TableRow>
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left', fontWeight: "bold" }}>Supplier PO Quantity</TableCell>
                                                            {material.purchaser_order_allocations?.map((po: any, poIndex: any) => (
                                                                <TableCell key={poIndex} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>
                                                                    {po[spoQuantityKey]?.quantity} {po[spoQuantityKey]?.quantity_units_display}
                                                                </TableCell>
                                                            ))}
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>{material[totalSpoQuantityKey]?.quantity} {material[totalSpoQuantityKey]?.quantity_units_display}</TableCell>
                                                        </TableRow>
                                                        <TableRow>
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left', fontWeight: "bold" }}>PI Quantity</TableCell>
                                                            {material.purchaser_order_allocations?.map((po: any, poIndex: any) => (
                                                                <TableCell key={poIndex} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>
                                                                    {po[piQuantityKey]?.quantity || 0} {po[piQuantityKey]?.quantity_units_display}
                                                                </TableCell>
                                                            ))}
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>{material[totalPiQuantityKey]?.quantity || 0} {material[totalPiQuantityKey]?.quantity_units_display}</TableCell>
                                                        </TableRow>
                                                        <TableRow>
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left', fontWeight: "bold" }}>GRN Quantity</TableCell>
                                                            {material.purchaser_order_allocations?.map((po: any, poIndex: any) => (
                                                                <TableCell key={poIndex} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>
                                                                    {po[poGRNAllocatedQuantityKey]?.quantity || 0}  {po[poGRNAllocatedQuantityKey]?.quantity_units_display}
                                                                </TableCell>
                                                            ))}
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>{material[totalGrnQuantityKey]?.quantity} {material[totalGrnQuantityKey]?.quantity_units_display}</TableCell>
                                                        </TableRow>
                                                        <TableRow>
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}></TableCell>
                                                            {material.purchaser_order_allocations?.map((po: any, poIndex: any) => {
                                                                const pendingQuantity = po[orderQuantityKey]?.quantity - po[poGRNAllocatedQuantityKey]?.quantity;
                                                                const finalQuantity = pendingQuantity < 0 ? 0 : pendingQuantity;
                                                                
                                                                return(
                                                                <TableCell key={poIndex} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>
                                                                    <Box sx={{ textAlign: 'center' }}>
                                                                        <DoughnutChart
                                                                            labels={['Received  Qty', 'Pending Qty']}
                                                                            data={[po[grnQuantityKey]?.quantity, finalQuantity]}
                                                                            isUseRandomColors={false}
                                                                            predefinedColors={['#508D69', '#800000']}
                                                                            measuringUnit={po[grnQuantityKey]?.quantity_units_display}
                                                                        />
                                                                    </Box>
                                                                </TableCell>
                                                                )
                                                            })}
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                                <Box sx={{ textAlign: 'center' }}>
                                                                    <DoughnutChart
                                                                        labels={['Total Received  Qty', 'Total Pending Qty']}
                                                                        data={[material[totalGrnQuantityKey]?.quantity, finalTotalPendingQuantity]}
                                                                        isUseRandomColors={false}
                                                                        predefinedColors={['#508D69', '#800000']}
                                                                        measuringUnit={material[totalOrderQuantityKey]?.quantity_units_display}
                                                                    />
                                                                </Box>
                                                            </TableCell>
                                                        </TableRow>
                                                        
                                                        <TableRow  sx={{ background: (theme) => theme.palette.grey[100] }}>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left',fontWeight: "bold" }}>Excess Quantity :</TableCell>
                                                            {material.purchaser_order_allocations?.map((po: any, poIndex: any) => (
                                                                <TableCell key={poIndex} sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center', fontWeight: "bold"}}>
                                                                    <Link sx={{ cursor: 'pointer' }} href={purchaseOrderDetailPageURL(po.po_id)} target="_blank"> {po.display_number} </Link>
                                                                </TableCell>
                                                            ))}
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center', fontWeight: "bold" }}>Total</TableCell>
                                                        </TableRow>
                                                        <TableRow>
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left', fontWeight: "bold" }}>FOB Quantity</TableCell>
                                                            {material.purchaser_order_allocations?.map((po: any, poIndex: any) => (
                                                                <TableCell key={poIndex} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>
                                                                    {/*{po[excessFOBQuantityKey]?.quantity || 0} {po[excessFOBQuantityKey]?.quantity_units_display}*/}
                                                                    --
                                                                </TableCell>
                                                            ))}
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>
                                                                {material[totalExcessFOBQuantityKey]?.quantity} {material[totalExcessFOBQuantityKey]?.quantity_units_display}
                                                            </TableCell>
                                                        </TableRow>
                                                        <TableRow >
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left', fontWeight: "bold" }}>Return Quantity</TableCell>
                                                            {material.purchaser_order_allocations.length >0 &&(
                                                                <TableCell colSpan={material.purchaser_order_allocations.length} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>
                                                                    {/*{material[totalExcessReturnQuantityKey]?.quantity} {material[totalExcessReturnQuantityKey]?.quantity_units_display}*/}
                                                                    --
                                                                </TableCell>
                                                            )}
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>
                                                                {material[totalExcessReturnQuantityKey]?.quantity} {material[totalExcessReturnQuantityKey]?.quantity_units_display}
                                                            </TableCell>
                                                        </TableRow>
                                                        <TableRow sx={{ background: (theme) => theme.palette.grey[100] }}>
        
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left',fontWeight: "bold" }}>Short Quantity :</TableCell>
                                                            {material.purchaser_order_allocations?.map((po: any, poIndex: any) => (
                                                                <TableCell key={poIndex} sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center', fontWeight: "bold"}}>
                                                                    <Link sx={{ cursor: 'pointer' }} href={purchaseOrderDetailPageURL(po.po_id)} target="_blank"> {po.display_number} </Link>
                                                                </TableCell>
                                                            ))}
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center', fontWeight: "bold" }}>Total</TableCell>
                                                        </TableRow>
                                                        <TableRow>
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left', fontWeight: "bold" }}></TableCell>
                                                            {material.purchaser_order_allocations?.map((po: any, poIndex: any) => (
                                                                <TableCell key={poIndex} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>
                                                                    {po[shortQuantityKey]?.quantity} {po[shortQuantityKey]?.quantity_units_display}
                                                                </TableCell>
                                                            ))}
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>
                                                                {material[totalShortQuantityKey]?.quantity}  {material[totalShortQuantityKey]?.quantity_units_display}
                                                            </TableCell>
                                                        </TableRow>
        
                                                        <TableRow sx={{ background: (theme) => theme.palette.grey[100] }}>
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left',fontWeight: "bold" }}>Reject Quantity :</TableCell>
                                                            {material.purchaser_order_allocations?.map((po: any, poIndex: any) => (
                                                                <TableCell key={poIndex} sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center', fontWeight: "bold"}}>
                                                                    <Link sx={{ cursor: 'pointer' }} href={purchaseOrderDetailPageURL(po.po_id)} target="_blank"> {po.display_number} </Link>
                                                                </TableCell>
                                                            ))}
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center', fontWeight: "bold" }}>Total</TableCell>
                                                        </TableRow>
                                                        <TableRow>
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left', fontWeight: "bold" }}></TableCell>
                                                            {material.purchaser_order_allocations?.map((po: any, poIndex: any) => (
                                                                <TableCell key={poIndex} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>
                                                                    {po[rejectQuantityKey]?.quantity || 0} {po[rejectQuantityKey]?.quantity_units_display}
                                                                </TableCell>
                                                            ))}
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>{material[totalRejectQuantityKey]?.quantity}  {material[totalRejectQuantityKey]?.quantity_units_display}</TableCell>
                                                        </TableRow>
                                                        <TableRow sx={{ background: (theme) => theme.palette.grey[100] }}>
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left',fontWeight: "bold" }}>Usable Quantity :</TableCell>
                                                            {material.purchaser_order_allocations?.map((po: any, poIndex: any) => (
                                                                <TableCell key={poIndex} sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center', fontWeight: "bold"}}>
                                                                    <Link sx={{ cursor: 'pointer' }} href={purchaseOrderDetailPageURL(po.po_id)} target="_blank"> {po.display_number} </Link>
                                                                </TableCell>
                                                            ))}
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center', fontWeight: "bold" }}>Total</TableCell>
                                                        </TableRow>
                                                        <TableRow>
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left', fontWeight: "bold" }}></TableCell>
                                                            {material.purchaser_order_allocations?.map((po: any, poIndex: any) => (
                                                                <TableCell key={poIndex} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>
                                                                    {po[poGRNAllocatedQuantityKey]?.quantity || 0} {po[poGRNAllocatedQuantityKey]?.quantity_units_display}
                                                                </TableCell>
                                                            ))}
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>{material[totalUsableQuantityKey]?.quantity || 0}  {material[totalUsableQuantityKey]?.quantity_units_display}</TableCell>
                                                        </TableRow>
                                                        <TableRow>
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center', fontWeight: "bold" }}></TableCell>
                                                                {material.purchaser_order_allocations?.map((po: any, poIndex: any) => {
                                                                    let shortQuantity = po[poTotalRequiredQuantityKey]?.quantity - po[poTotalAllocatedQuantityKey]?.quantity;
                                                                    shortQuantity = shortQuantity > 0 ? shortQuantity : 0
                                                                    return (
                                                                    <TableCell key={poIndex} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>
                                                                        <DoughnutChart
                                                                            labels={['Usable Qty', 'Short Qty']}
                                                                            data={[po[poTotalAllocatedQuantityKey]?.quantity, shortQuantity]}
                                                                            isUseRandomColors={false}
                                                                            predefinedColors={['#508D69', '#800000']}
                                                                            measuringUnit={po[poTotalAllocatedQuantityKey]?.quantity_units_display}
                                                                        />
                                                                    </TableCell>
                                                                )
                                                                })}
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>
                                                                <DoughnutChart
                                                                    labels={['Total Usable Qty', 'Supplier PO Pending Qty']}
                                                                    data={[material[supplierPOUsableQuantityKey]?.quantity, totalSupplierPOPendingQuantity]}
                                                                    isUseRandomColors={false}
                                                                    predefinedColors={['#508D69', '#800000']}
                                                                    measuringUnit={material[supplierPOUsableQuantityKey]?.quantity_units_display}
                                                                /></TableCell>
                                                        </TableRow>
                                                    </TableBody>
                                                </Table>
                                            </TableContainer>
                                        </Grid>
        
                                    </Card>
                                </React.Fragment>
                                )
                            })
                        )
                    }

                    {/* <Box sx={{ mt: 2 }}>
                        <Typography variant='h6' sx={{ mb: 2 }}>Delivery Summary :</Typography>
                    </Box>
                    <Box>
                        <ActualDeliverySummary spoId={spoId} />
                    </Box>
                    <Box sx={{ mt: 2 }}>
                        <Typography variant='h6' sx={{ mb: 2 }}>Inspection Summary :</Typography>
                    </Box>
                    <Box>
                        <InspectionSummary spoId={spoId} />
                    </Box> */}



                </Box>
            </>
            }
        </>
    );
};

export default GRNSummary;
