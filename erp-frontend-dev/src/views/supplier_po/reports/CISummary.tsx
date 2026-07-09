import React, { useEffect, useState } from 'react';
import { getDefaultError } from '@/helpers/Utilities';
import toast from 'react-hot-toast';
import { Alert, Box, Button, Card, CardHeader, Divider, Grid, IconButton, Link, List, ListItem, Table, TableBody, TableCell, TableHead, TableRow, ToggleButton, ToggleButtonGroup, Tooltip, Typography, useTheme } from '@mui/material';
import DefaultLoader from '@/components/DefaultLoader';
import api from '@/services/api';
import { CISummaryDetailsURL, createDebitNoteURL } from '@/helpers/constants/rest_urls/SupplierPoUrls';
import { createdGrnDetailsPageURL, grnSummaryReportURL } from '@/helpers/constants/front_end/GrnUrls';
import CustomerBrandMaterialDetail from '@/views/settings/userdefine_material/MaterialDetail';
import { purchaseOrderDetailPageURL } from '@/helpers/constants/FrontEndUrls';
import { Checkbox } from '@mui/material';
import HorizontalChart from '@/components/Charts/HorizontalChart';
import CachedIcon from '@mui/icons-material/Cached';
import RitzModal from '@/components/Ritz/RitzModal';
import { DEFAULT_SUCCESS } from '@/helpers/constants/Constants';
import CreatedDebitNoteDetails from './CreatedDebitNoteDetails';
import InfoIcon from '@mui/icons-material/Info';
import CombineDetails from './CombineDetails';
import AddCombineDetails from './AddCombineDetails';
import CircularLoader from '@/components/CircularLoader';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import EditIcon from '@mui/icons-material/Edit';
type ColorMapping = {
    Red: string;
    Green: string;
    Blue: string;
    Yellow: string;
  };

const CISummary = ({ spoId, invoiceId, sourceId, isPoClub }: any) => {
    const theme = useTheme()
    const colorMapping: ColorMapping | any = {
        Red: '#EB5353',
        Green: '#36AE7C',
        Blue: '#187498',
        Yellow: '#F9D923',
      };

    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingCircle, setIsLoadingCircle] = useState(false);
    const [cISummaryDetails, setCISummaryDetails] = useState({
        data: {
            is_editable: '',
            supplier_po_id: '',
            display_number: '',
            performa_invoice: {
                display_name: '',
                file_path: ''
            },
            invoice: {
                file_path: ''
            },
            delivery_note_display_number: [],
            grns: []
        },
        pos: []
    });
    const [showMaterialDetails, setShowMaterialDetails] = useState(false);
    const [selectedMaterialId, setSelectedMaterialId] = useState(null);

    const fetchData = () => {
        setIsLoadingCircle(true);
        let reportUrl;
        reportUrl = CISummaryDetailsURL(spoId, invoiceId);

        api.get(reportUrl).then(resp => {
            const resdata = resp?.data || [];
            setCISummaryDetails({...resdata});
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false);
            setIsLoadingCircle(false);
        });
    };
    const handleModalClose = () => {
        setShowMaterialDetails(false)
    }
    const labels = ['Short Tolerance ','Order Quantity' , 'Excess Tolerance ', 'Actual Quantity'];
    const predefinedColors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#FF6384'];
    const measuringUnit = 'Units';
    const hasSolid = true; //Todo-Pending


    const [showDebitNoteDetailsModal, setShowDebitNoteDetailsModal] = useState({ modalActiveStatus: false, debitId: null, materialId: null, deliveryId: null });
    const [showConfirmModal, setShowConfirmModal] = useState({ modalActiveStatus: false, modalType: '', modalBody: '', modalTitle: '' });
    const [showReplacementModal, setShowReplacementModal] = useState({ modalActiveStatus: false, materialId: null, deliveryId: null, grnMaterilId: null });
    const [showCombineModal, setShowCombineModal] = useState({ modalActiveStatus: false, materialId: null, deliveryId: null, grnMaterilId: null, modalType: null, remediationType: null, materialType: null });

    const handleConfirm = () => {
        console.log(showConfirmModal, "showConfirmModal")
        showConfirmModal.modalType == 'debit_note'
        let reportUrl;
        if (showConfirmModal.modalType === 'debit_note') {
            reportUrl = createDebitNoteURL(21, 15, 14);
        }
        api.post(reportUrl, showConfirmModal.modalType).then(resp => {
            const responseData = resp?.data || [];
            if (responseData) {
                toast.success(DEFAULT_SUCCESS);
            }
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoading(false));
    };

    const handleOpenCombineModal = (materialId: any, deliveryId: any, grnMaterialId: any, modalType: any, remediationType: any, materialType:any) => {
        setShowCombineModal({ modalActiveStatus: true, materialId: materialId, deliveryId: deliveryId, grnMaterilId: grnMaterialId, modalType: modalType, remediationType: remediationType, materialType: materialType })
    };

    const handleSavedCombineData = () => {
        setShowCombineModal({ modalActiveStatus: false, materialId: null, deliveryId: null, grnMaterilId: null, modalType: null, remediationType: null, materialType: null  })
        fetchData();
    }

    const handleReferenceCodeDetailOnClick = (openState: boolean, materialId: any) => {
        setShowMaterialDetails(openState);
        setSelectedMaterialId(materialId);
    }

    const handleViewGRNSummary = (spoId: any, reportId: any, reportType: any) => {
        const url = grnSummaryReportURL(spoId, reportId, reportType, sourceId, isPoClub);
        window.open(url, '_blank');
    };

    useEffect(() => {
        if (invoiceId) {
            fetchData();
        }
    }, [invoiceId]);

    return (
        <>
            {isLoading ? (
                <DefaultLoader />
            ) : (
                <>
                    {showMaterialDetails &&
                        <CustomerBrandMaterialDetail
                            customerBrandMaterialReferenceCodeId={selectedMaterialId}
                            modalOpen={showMaterialDetails}
                            setModalOpen={handleModalClose}
                        />
                    }
                    {cISummaryDetails?.data?.grns?.length === 0 && (
                        <Alert severity="info">CI reports not available at the moment</Alert>
                    )}
                    {showConfirmModal.modalActiveStatus &&
                        <RitzModal open={showConfirmModal.modalActiveStatus} title={showConfirmModal.modalTitle} onClose={() => setShowConfirmModal({ modalActiveStatus: false, modalType: '', modalBody: '', modalTitle: '' })}>
                            <Box sx={{ mb: 3 }}>
                                Are you sure you want to {showConfirmModal.modalBody} ?
                            </Box>

                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                                <Button variant='contained' onClick={handleConfirm}>Confirm </Button>
                            </Box>
                        </RitzModal>
                    }
                    {showDebitNoteDetailsModal.modalActiveStatus &&
                        <RitzModal maxWidth='md' open={showDebitNoteDetailsModal.modalActiveStatus} title={'Debit Note Details'} onClose={() => setShowDebitNoteDetailsModal({ modalActiveStatus: false, debitId: null, materialId: null, deliveryId: null })}>
                            <CreatedDebitNoteDetails debitNoteId={showDebitNoteDetailsModal.debitId} materialId={showDebitNoteDetailsModal.materialId} deliveryId={showDebitNoteDetailsModal.deliveryId} />
                        </RitzModal>
                    }
                    {showCombineModal.modalActiveStatus &&
                        <RitzModal maxWidth='md' open={showCombineModal.modalActiveStatus} title={'Raise Debit Note / Replacement / CPI'} onClose={() => setShowCombineModal({ modalActiveStatus: false, materialId: null, deliveryId: null, grnMaterilId: null, modalType: null, remediationType: null, materialType: null  })}>
                            <AddCombineDetails materialId={showCombineModal.materialId} deliveryId={showCombineModal.deliveryId} grnMaterialId={showCombineModal.grnMaterilId} invoiceId={invoiceId} type={showCombineModal.modalType} remediationType={showCombineModal.remediationType} invoice={invoiceId} materialType={showCombineModal.materialType} savedStatus={handleSavedCombineData} />
                        </RitzModal>
                    }
                    {isLoadingCircle && (<CircularLoader />)}
                    <Card variant='outlined' sx={{ mb: 2 }}>
                        <Grid container columnSpacing={2} px={2}>
                            <Grid item sm={3} xs={3}>
                                <dl>
                                    <dt>Invoice No</dt>
                                    <dd>
                                        {'Test Invoive2342'}
                                    </dd>
                                </dl>
                            </Grid>
                            <Divider orientation='vertical' variant='middle' flexItem />
                            <Grid item sm={3} xs={3}>
                                <dl>
                                    <dt style={{ marginTop: 5 }}>Profoma Invoice</dt>
                                    <dd><Link
                                        component="a"
                                        href={cISummaryDetails?.data?.performa_invoice?.file_path}
                                        download
                                    >
                                        {cISummaryDetails?.data?.performa_invoice?.display_name}
                                    </Link></dd>
                                </dl>
                            </Grid>
                            <Divider orientation='vertical' variant='middle' flexItem />
                            <Grid item sm={3} xs={3}>
                                <dl>
                                    <dt>Delivery Notes</dt>
                                    <dd>
                                        <Box display="flex" flexDirection="row" flexWrap="wrap" alignItems="center">
                                            {cISummaryDetails?.data?.delivery_note_display_number.map((deliveryNote, deliveryNoteIndex) => (
                                                <ListItem key={deliveryNoteIndex} sx={{ display: 'flex', alignItems: 'center', p: 0, mr: 2 }}>
                                                    <FiberManualRecordIcon color="info" sx={{ mr: 1 }} fontSize="small" /> {'Test DNote32423'}
                                                </ListItem>
                                            ))}
                                        </Box>
                                    </dd>
                                </dl>
                            </Grid>
                        </Grid>
                    </Card>

                    {cISummaryDetails?.data?.grns?.map((grn: any, grnIndex: number) => (
                        grn.materials?.map((material: any, materialIndex: number) => {

                            const totalOrderQuantity = material.current_delivery_data?.summary?.supplier_po_total_pi_quantity?.quantity;
                            const totalOrderQuantityUnit = material.current_delivery_data?.summary?.supplier_po_total_pi_quantity?.quantity_units_display;

                            const shortQuantiy = Math.abs(material.current_delivery_data?.summary?.short_tolerance_value?.quantity);
                            const shortQuantiyUnit = material.current_delivery_data?.summary?.short_tolerance_value?.quantity_units_display;

                            const excessQuantity = material.current_delivery_data?.summary?.excess_tolerance_value?.quantity;
                            const excessQuantityUnit = material.current_delivery_data?.summary?.excess_tolerance_value?.quantity_units_display;

                            const actualQuantity = material.current_delivery_data?.summary?.grn_total_actual_quantity?.quantity;
                            const actualQuantityUnit = material.current_delivery_data?.summary?.grn_total_actual_quantity?.quantity_units_display;

                            const data = [
                                { quantity: shortQuantiy, unit: shortQuantiyUnit },
                                { quantity: totalOrderQuantity, unit: totalOrderQuantityUnit },
                                { quantity: excessQuantity, unit: excessQuantityUnit },
                                { quantity: actualQuantity, unit: actualQuantityUnit }
                            ];
                            return (
                                <React.Fragment key={`${grnIndex}-${materialIndex}`}>
                                    <Card variant="outlined" sx={{ mb: 1, mt: 1 }}>
                                        <CardHeader
                                            title={
                                                <Typography variant='h4'>
                                                    <Link
                                                        sx={{ cursor: 'pointer' }}
                                                        href={createdGrnDetailsPageURL(grn.grn_id)}
                                                        target="_blank"
                                                    >
                                                        {grn.display_number}
                                                    </Link> / <Link
                                                        sx={{ cursor: 'pointer' }}
                                                        onClick={() => handleReferenceCodeDetailOnClick(true, material.customer_brand_material_id)}
                                                        target="_blank"
                                                    >

                                                        {material.ritz_customer_brand_reference_code}
                                                    </Link>
                                                </Typography>
                                            }
                                            sx={{
                                                background: (theme) => theme.palette.grey[100],
                                                fontWeight: 'bold',
                                                borderBottom: (theme) => `1px solid ${theme.palette.grey[300]}`,
                                            }}
                                        />
                                        <>
                                        <Box sx={{ mt: 1, mb: 2, p: 1 }} >
                                        <Typography variant='h6' fontWeight='bold' sx={{ color: '#1976d2' }} >Past Delivery Details : </Typography>
                                            {material.previous_delivery_dates.length != 0 ? (
                                             
                                                    <Box sx={{ mt: 1 }}>
                                                        <Table >
                                                            <TableHead>
                                                                <TableRow sx={{ background: theme.palette.grey[100] }}>
                                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>Delivery</TableCell>
                                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>Plan Date</TableCell>
                                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>Plan Quantity</TableCell>
                                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>Actual Date</TableCell>
                                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>Order Quantity/FOC</TableCell>
                                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>CI Quantity</TableCell>
                                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>PL Quantity</TableCell>
                                                                </TableRow>
                                                            </TableHead>
                                                            <TableBody>
                                                                {material.previous_delivery_dates.length === 0 ? (
                                                                    <TableRow>
                                                                        <TableCell colSpan={7} sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center' }}>
                                                                            No available delivery dates.
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ) : (
                                                                    material.previous_delivery_dates.map((previousDeliveryDate: any, previousDeliveryDateIndex: number) => (
                                                                        <TableRow key={previousDeliveryDateIndex}>
                                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>
                                                                                <Link
                                                                                    component="button"
                                                                                    onClick={() =>
                                                                                        handleViewGRNSummary(cISummaryDetails?.data?.supplier_po_id, previousDeliveryDate.id, 'deliveryDate')
                                                                                    }
                                                                                    sx={{ mr: 1 }}
                                                                                >
                                                                                    {previousDeliveryDate.display_value}
                                                                                </Link>
                                                                            </TableCell>
                                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>{previousDeliveryDate.confirmed_delivery_date}</TableCell>
                                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>
                                                                                {previousDeliveryDate.summary?.total_order_quantity?.quantity} {previousDeliveryDate.summary?.total_order_quantity?.quantity_units_display}
                                                                            </TableCell>
                                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>{previousDeliveryDate.actual_delivery_date}</TableCell>
                                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>
                                                                                {previousDeliveryDate.summary?.total_supplier_po_order_quantity?.quantity} {previousDeliveryDate.summary?.total_supplier_po_order_quantity?.quantity_units_display}
                                                                            </TableCell>
                                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>
                                                                                {previousDeliveryDate.summary?.total_delivery_date_quantity?.quantity} {previousDeliveryDate.summary?.total_delivery_date_quantity?.quantity_units_display}
                                                                            </TableCell>
                                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>
                                                                                {previousDeliveryDate.summary?.grn_indicated_quantity?.quantity} {previousDeliveryDate.summary?.grn_indicated_quantity?.quantity_units_display}
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    ))
                                                                )}
                                                            </TableBody>
                                                        </Table>
                                                    </Box>
                                               
                                            ):(
                                                <>
                                                    <Box sx={{ width: '50%', p: 1 }}>
                                                        <Alert severity="info">Past Deliveries not available at the moment</Alert>
                                                    </Box>
                                                </>
                                                
                                            )}
                                             </Box>
                                            
                                             <Box sx={{ mt: 1, mb: 2, p: 1 }} >
                                                <Typography variant='h6' fontWeight='bold' sx={{ color: '#1976d2' }} >Total Quantities : </Typography>
                                                <Box sx={{ mt: 1, width:"50%" }}>
                                                    <Table >
                                                        <TableHead>
                                                            <TableRow sx={{ background: theme.palette.grey[100] }}>
                                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>Descrption</TableCell>
                                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>Quantity</TableCell>
                                                            </TableRow>
                                                        </TableHead>
                                                        <TableBody>
                                                            <TableRow>
                                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>Total Order Quantity</TableCell>
                                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>{material.current_delivery_data?.summary?.supplier_po_total_pi_quantity?.quantity || '--'} {material.current_delivery_data?.summary?.supplier_po_total_pi_quantity?.quantity_units_display}</TableCell>
                                                            </TableRow>
                                                            <TableRow>
                                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>Planned Replacement Quantity</TableCell>
                                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>{material.current_delivery_data?.summary?.total_planned_replacement_quantity?.quantity || '--'} {material.current_delivery_data?.summary?.total_planned_replacement_quantity?.quantity_units_display}</TableCell>
                                                            </TableRow>
                                                            <TableRow>
                                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>GRN Actual Quantity</TableCell>
                                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>{material.current_delivery_data?.summary?.grn_total_actual_quantity?.quantity || '--'} {material.current_delivery_data?.summary?.grn_total_actual_quantity?.quantity_units_display}</TableCell>
                                                            </TableRow>
                                                            <TableRow>
                                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>Reject Quantity</TableCell>
                                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>{material.current_delivery_data?.summary?.supplier_po_rejected_quantity?.quantity || '--'} {material.current_delivery_data?.summary?.supplier_po_rejected_quantity?.quantity_units_display}</TableCell>
                                                            </TableRow>
                                                        </TableBody>
                                                    </Table>
                                                </Box>
                                            </Box>

                                            <Box sx={{ mt: 1, mb: 2, p: 1 }} >
                                                <Typography variant='h6' fontWeight='bold' sx={{ color: '#1976d2' }} >PO Details : </Typography>
                                                <Box sx={{ mt: 1 }}>
                                                    <Table >
                                                        <TableHead>
                                                            <TableRow sx={{ background: theme.palette.grey[100] }}>
                                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}></TableCell>
                                                                {cISummaryDetails?.pos?.map((po: any, poIndex: number) => (
                                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center' }}><Link sx={{ cursor: 'pointer' }} href={purchaseOrderDetailPageURL(po.purchase_order_id)} target="_blank"> {po.display_number} </Link></TableCell>
                                                                ))}
                                                            </TableRow>
                                                        </TableHead>
                                                        <TableBody>
                                                            <TableRow>
                                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>Order Quantity</TableCell>
                                                                {cISummaryDetails?.pos?.map((po: any, poIndex: number) => {
                                                                    const allocation = material.current_delivery_data?.summary?.purchaser_order_allocations.find((allocation: any) => allocation.po_id === po.purchase_order_id);
                                                                    return (
                                                                        <TableCell key={poIndex} sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center' }}>
                                                                            {allocation ? `${allocation.supplier_po_purchase_order_allocated_total_pi_quantity?.quantity} ${allocation.supplier_po_purchase_order_allocated_total_pi_quantity?.quantity_units_display}` : 'N/A'}
                                                                        </TableCell>
                                                                    );
                                                                })}

                                                            </TableRow>
                                                            <TableRow>
                                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>Allocated Quantity</TableCell>
                                                                {cISummaryDetails?.pos?.map((po: any, poIndex: number) => {
                                                                    const allocation = material.current_delivery_data?.summary?.purchaser_order_allocations.find((allocation: any) => allocation.po_id === po.purchase_order_id);
                                                                    return (
                                                                        <TableCell key={poIndex} sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center' }}>
                                                                            {allocation ? `${allocation.purchase_order_allocated_quantity?.quantity} ${allocation.purchase_order_allocated_quantity?.quantity_units_display}` : 'N/A'}
                                                                        </TableCell>
                                                                    );
                                                                })}
                                                            </TableRow>
                                                        </TableBody>
                                                    </Table>
                                                </Box>
                                            </Box>

                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, mb: 2, p: 1 }}>
                                                {material.material_type === 'fabric' && (
                                                    <>
                                                        {hasSolid && (
                                                            <>
                                                                <Box sx={{ width: '50%', p: 1 }}>
                                                                    <Typography variant='h6' fontWeight='bold' sx={{ color: '#1976d2' }} >Reject Color Tones : </Typography>
                                                                    <Box sx={{ mt: 1, width: '100%' }}>
                                                                        <Table>
                                                                            <TableHead>
                                                                                <TableRow sx={{ background: theme.palette.grey[100] }}>
                                                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>
                                                                                        Batch Number
                                                                                    </TableCell>
                                                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center' }}>
                                                                                        Color Tones
                                                                                    </TableCell>
                                                                                </TableRow>
                                                                            </TableHead>
                                                                            <TableBody>
                                                                                {material.current_delivery_data?.rejected_color_tones.length === 0 ? (
                                                                                    <>
                                                                                        <TableRow>
                                                                                            <TableCell colSpan={2} sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center' }}>
                                                                                                No details available
                                                                                            </TableCell>
                                                                                        </TableRow>
                                                                                    </>
                                                                                ) : (
                                                                                    <>
                                                                                        {material.current_delivery_data?.rejected_color_tones?.map((batch: any, batchIndex: number) => (
                                                                                            batch.color_tones?.map((colorTone: any, colorToneIndex: number) => (
                                                                                                <TableRow key={`${batch.batch_id}}`}>
                                                                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>
                                                                                                        {batch.batch_name}
                                                                                                    </TableCell>
                                                                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>
                                                                                                        {(() => {
                                                                                                            const colorParts = colorTone?.display_name.split(" - ");
                                                                                                            return (
                                                                                                                <Box sx={{ display: 'flex', gap: 1 }}>
                                                                                                                    {colorParts.map((colorPart: string, index: number) => {
                                                                                                                        const backgroundColor = colorMapping[colorPart.replace(/\s+/g, '')];
                                                                                                                        return (
                                                                                                                            <Box
                                                                                                                                key={index}
                                                                                                                                sx={{
                                                                                                                                    width: 70,
                                                                                                                                    height: 30,
                                                                                                                                    backgroundColor: backgroundColor,
                                                                                                                                    display: 'flex',
                                                                                                                                    alignItems: 'center',
                                                                                                                                    justifyContent: 'center',
                                                                                                                                    borderRadius: 1,
                                                                                                                                    fontWeight: 'bold',
                                                                                                                                    color: '#FFFFFF',
                                                                                                                                }}
                                                                                                                            >
                                                                                                                                {colorPart}
                                                                                                                            </Box>
                                                                                                                        );
                                                                                                                    })}
                                                                                                                </Box>
                                                                                                            );
                                                                                                        })()}
                                                                                                    </TableCell>
                                                                                                </TableRow>
                                                                                            ))
                                                                                        ))}
                                                                                    </>
                                                                                )}

                                                                            </TableBody>
                                                                        </Table>
                                                                    </Box>
                                                                </Box>
                                                            </>
                                                        )}
                                                    </>
                                                )}

                                                <Box sx={{ width: '50%', p: 1 }}>
                                                    <Typography variant='h6' fontWeight='bold' sx={{ color: '#1976d2' }} >Tolerance : </Typography>
                                                    <Box sx={{ mt: 1 }}>
                                                        <HorizontalChart
                                                            labels={labels}
                                                            data={data}
                                                            isUseRandomColors={false}
                                                            predefinedColors={predefinedColors}
                                                            measuringUnit={measuringUnit}
                                                        />

                                                    </Box>
                                                </Box>
                                            </Box>
                                            {material.material_type === 'fabric' && (
                                                <>
                                                    {hasSolid && (
                                                        <>
                                                            <Box sx={{ mt: 1, mb: 2, p: 1 }} >
                                                                <Typography variant='h6' fontWeight='bold' sx={{ color: '#1976d2' }} >Color Tones Details : </Typography>
                                                                <Box sx={{ mt: 1 }}>
                                                                    <Table >
                                                                        <TableHead>
                                                                            <TableRow sx={{ background: theme.palette.grey[100] }}>
                                                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>Delivery</TableCell>
                                                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>Fabric Descrption </TableCell>
                                                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>Color</TableCell>
                                                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>PL</TableCell>
                                                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>Batch No#</TableCell>
                                                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>Roll No#</TableCell>
                                                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>Actual Quantity</TableCell>
                                                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>QA Pass Quantity</TableCell>
                                                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>Quality Rejection Color Tone </TableCell>
                                                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center' }}>Buyer & Mill Approved Status</TableCell>
                                                                            </TableRow>
                                                                        </TableHead>
                                                                        <TableBody>
                                                                            {material.current_delivery_data?.roll_detalis?.batches?.map((batch: any, batchIndex: number) => (
                                                                                batch.rolls?.map((roll: any, rollIndex: number) => {
                                                                                    // Calculate total rows for the entire pack list
                                                                                    const totalRows = material.current_delivery_data?.roll_detalis?.batches?.reduce((batchRollLength: number, currentBatch: any) => {
                                                                                        return batchRollLength + currentBatch.rolls.length;
                                                                                    }, 0);

                                                                                    return (
                                                                                        <TableRow key={`${batchIndex}-${rollIndex}`}>
                                                                                            {batchIndex === 0 && rollIndex === 0 && (
                                                                                                <>
                                                                                                    <TableCell rowSpan={totalRows} sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>
                                                                                                        <Link
                                                                                                            component="button"
                                                                                                            onClick={() =>
                                                                                                                handleViewGRNSummary(cISummaryDetails?.data?.supplier_po_id, material.current_delivery_data?.delivery_date_id, 'deliveryDate')
                                                                                                            }
                                                                                                            sx={{ mr: 1 }}
                                                                                                        >
                                                                                                            {material.current_delivery_data?.display_value}
                                                                                                        </Link>
                                                                                                    </TableCell>
                                                                                                    <TableCell rowSpan={totalRows} sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>
                                                                                                        <Link
                                                                                                            sx={{ cursor: 'pointer' }}
                                                                                                            onClick={() => handleReferenceCodeDetailOnClick(true, material.customer_brand_material_id)}
                                                                                                            target="_blank"
                                                                                                        >

                                                                                                            {material.ritz_customer_brand_reference_code}
                                                                                                        </Link>
                                                                                                    </TableCell>
                                                                                                    <TableCell rowSpan={totalRows} sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>{material?.fabric_color} - {material?.fabric_type_display_value}</TableCell>
                                                                                                </>
                                                                                            )}
                                                                                            {batchIndex === 0 && rollIndex === 0 && (
                                                                                                <>
                                                                                                    <TableCell rowSpan={totalRows} sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>
                                                                                                        <Link sx={{ cursor: 'pointer' }} href={createdGrnDetailsPageURL(material.current_delivery_data?.roll_detalis?.id)} target="_blank">
                                                                                                            {material.current_delivery_data?.roll_detalis?.pack_list_name}
                                                                                                        </Link>
                                                                                                    </TableCell>
                                                                                                </>
                                                                                            )}
                                                                                            {rollIndex === 0 && (
                                                                                                <>
                                                                                                    <TableCell rowSpan={batch.rolls.length} sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>{batch.batch_name}</TableCell>
                                                                                                </>
                                                                                            )}
                                                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>{roll.pack_number}</TableCell>
                                                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>{roll.quantity} {roll.quantity_units}</TableCell>
                                                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>{roll.qa_passed_quantity?.qa_passed_quantity} {roll.qa_passed_quantity?.qa_passed_quantity_units}</TableCell>
                                                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center' }}>
                                                                                                {(() => {
                                                                                                    const colorParts = roll.color_tone?.color_tone_display.split("-");
                                                                                                    return (
                                                                                                        <Box sx={{ display: 'flex', gap: 1 }}>
                                                                                                            {colorParts?.map((colorPart: any, index: any) => {
                                                                                                                const backgroundColor = colorMapping[colorPart.replace(/\s+/g, '')];
                                                                                                                return (
                                                                                                                    <Box
                                                                                                                        key={index}
                                                                                                                        sx={{
                                                                                                                            width: 70,
                                                                                                                            height: 30,
                                                                                                                            backgroundColor: backgroundColor,
                                                                                                                            display: 'flex',
                                                                                                                            alignItems: 'center',
                                                                                                                            justifyContent: 'center',
                                                                                                                            borderRadius: 1,
                                                                                                                            fontWeight: 'bold',
                                                                                                                            color: '#FFFFFF',
                                                                                                                        }}
                                                                                                                    >
                                                                                                                        {colorPart}
                                                                                                                    </Box>
                                                                                                                );
                                                                                                            })}
                                                                                                        </Box>
                                                                                                    );
                                                                                                })()}
                                                                                            </TableCell>
                                                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'center' }}> <Checkbox checked={roll?.is_valid_color_tone} name="mandatory" /></TableCell>
                                                                                        </TableRow>
                                                                                    );
                                                                                })
                                                                            ))

                                                                            }
                                                                        </TableBody>
                                                                    </Table>
                                                                </Box>
                                                            </Box>
                                                            {material.current_delivery_data?.color_tone_remediation?.has_total_value && (
                                                                <Box sx={{ mt: 1, mb: 2, p: 1 }}>
                                                                    <Typography variant='h6' fontWeight='bold' sx={{ color: '#1976d2' }}>Color Tone Remediation :</Typography>
                                                                    <Box sx={{ mt: 1 }}>
                                                                        {/* <ToggleButtonGroup
                                                        value={material.current_delivery_data?.color_tone_remediation?.raise_type =='not_created' ? 'combine': material.current_delivery_data?.color_tone_remediation?.raise_type}
                                                        exclusive
                                                        onChange={(event, newActiveButton) => handleChangeColorToneButtons(event, newActiveButton, grnIndex, materialIndex, 'color_tone_remediation')}
                                                        aria-label="text alignment"
                                                    >
                                                        <ToggleButton value="combine" aria-label="centered" style={{ marginBottom: "20px" }}>
                                                            <MergeTypeIcon style={{ marginRight: 3 }} />Combine
                                                        </ToggleButton>
                                                        <ToggleButton value="replacement" aria-label="left aligned" style={{ marginBottom: "20px" }}>
                                                            <FindReplaceIcon style={{ marginRight: 3 }} />Replacement
                                                        </ToggleButton>
                                                        <ToggleButton value="debit_note" aria-label="centered" style={{ marginBottom: "20px" }}>
                                                            <NoteAddIcon style={{ marginRight: 3 }} />Debit Note
                                                        </ToggleButton>
                                                    </ToggleButtonGroup> */}
                                                                        {cISummaryDetails?.data?.is_editable && (
                                                                            <Box>
                                                                                <Button
                                                                                    sx={{ mb: 2 }}
                                                                                    variant="outlined"
                                                                                    color="primary"
                                                                                    onClick={() => handleOpenCombineModal(material.customer_brand_material_id, material.current_delivery_data?.delivery_date_id, material.grn_material_id, material.current_delivery_data?.color_tone_remediation?.raise_type, 'color_tone_remediation', material.material_type)}
                                                                                    startIcon={material.current_delivery_data?.color_tone_remediation?.raise_type == 'not_created' ? <CachedIcon /> : <EditIcon />}
                                                                                >Remediate</Button>
                                                                            </Box>
                                                                        )}
                                                                        <Box sx={{ mt: 1 }}>
                                                                            <CombineDetails
                                                                                dataList={material.current_delivery_data?.color_tone_remediation}
                                                                                isVisibleReplacement={true}
                                                                                deliveryId={material.current_delivery_data?.delivery_date_id}
                                                                                spoId={cISummaryDetails?.data?.supplier_po_id}
                                                                                materialType={material.material_type}
                                                                                materialData={{
                                                                                    ritz_code: material.ritz_customer_brand_reference_code,
                                                                                    customer_brand_material_id: material.customer_brand_material_id,
                                                                                    delivery_date: material.current_delivery_data?.display_value,
                                                                                    color: `${material.fabric_color}-${material.fabric_type_display_value}`
                                                                                }}
                                                                                sourceId={sourceId}
                                                                                isPoClub={isPoClub}
                                                                            />
                                                                        </Box>
                                                                    </Box>
                                                                </Box>
                                                            )}
                                                        </>
                                                    )}
                                                </>
                                            )}

                                            {material.current_delivery_data?.defected_batches_remediation?.has_total_value && (
                                                <Box sx={{ mt: 1, mb: 2, p: 1 }}>
                                                    <Typography variant='h6' fontWeight='bold' sx={{ color: '#1976d2' }}>
                                                        {material.material_type == 'fabric' ? 'Defected Batches Remediation' : 'Rejected Material Remediation'}
                                                    </Typography>
                                                    <Box sx={{ mt: 1 }}>
                                                        {/* <ToggleButtonGroup
                                                       value={material.current_delivery_data?.defected_batches_remediation?.raise_type =='not_created' ? 'combine': material.current_delivery_data?.defected_batches_remediation?.raise_type}
                                                        exclusive
                                                        onChange={(event, newActiveButton) => handleChangeColorToneButtons(event, newActiveButton, grnIndex, materialIndex, 'defected_batches_remediation')}
                                                        aria-label="text alignment"
                                                    >
                                                        <ToggleButton value="combine" aria-label="centered" sx={{ mb: 2, width: '150px' }}>
                                                            <MergeTypeIcon style={{ marginRight: 3 }} />Combine
                                                        </ToggleButton>
                                                        <ToggleButton value="cpi" aria-label="centered" sx={{ mb: 2, width: '150px' }}>
                                                            <CheckroomIcon style={{ marginRight: 3 }} />CPI
                                                        </ToggleButton>
                                                        <ToggleButton value="replacement" aria-label="centered" sx={{ mb: 2, width: '150px' }}>
                                                            <FindReplaceIcon style={{ marginRight: 3 }} />Replacement
                                                        </ToggleButton>
                                                        <ToggleButton value="debit_note" aria-label="centered" sx={{ mb: 2, width: '150px' }}>
                                                            <NoteAddIcon style={{ marginRight: 3 }} />Debit Note
                                                        </ToggleButton>
                                                    </ToggleButtonGroup> */}
                                                        {cISummaryDetails?.data?.is_editable && (
                                                            <Box>
                                                                <Button
                                                                    sx={{ mb: 2 }}
                                                                    variant="outlined"
                                                                    color="primary"
                                                                    onClick={() => handleOpenCombineModal(material.customer_brand_material_id, material.current_delivery_data?.delivery_date_id, material.grn_material_id, material.current_delivery_data?.defected_batches_remediation?.raise_type, 'defected_batches_remediation', material.material_type)}
                                                                    startIcon={material.current_delivery_data?.defected_batches_remediation?.raise_type == 'not_created' ? <CachedIcon /> : <EditIcon />}
                                                                >Remediate</Button>
                                                            </Box>
                                                        )}
                                                        <Box sx={{ mt: 1 }}>
                                                            <CombineDetails
                                                                isVisibleCPI={material.material_type == 'fabric' ? true : false}
                                                                isVisibleReplacement={true}
                                                                deliveryId={material.current_delivery_data?.delivery_date_id}
                                                                spoId={cISummaryDetails?.data?.supplier_po_id}
                                                                dataList={material.current_delivery_data?.defected_batches_remediation}
                                                                materialType={material.material_type}
                                                                materialData={{
                                                                    ritz_code: material.ritz_customer_brand_reference_code,
                                                                    customer_brand_material_id: material.customer_brand_material_id,
                                                                    delivery_date: material.current_delivery_data?.display_value,
                                                                    color: `${material.fabric_color}-${material.fabric_type_display_value}`
                                                                }}
                                                                sourceId={sourceId}
                                                                isPoClub={isPoClub}
                                                            />
                                                        </Box>
                                                    </Box>
                                                </Box>
                                            )}
                                            {material.current_delivery_data?.excess_remediation?.has_total_value && (
                                                <Box sx={{ mt: 1, mb: 2, p: 1 }}>
                                                    <Typography variant='h6' fontWeight='bold' sx={{ color: '#1976d2' }}>Excess Remediation :</Typography>
                                                    <Box sx={{ mt: 1 }}>
                                                        {/* <ToggleButtonGroup
                                                        value={material.current_delivery_data?.excess_remediation?.raise_type == 'not_created' ? 'combine' : material.current_delivery_data?.excess_remediation?.raise_type}
                                                        exclusive
                                                        onChange={(event, newActiveButton) => handleChangeColorToneButtons(event, newActiveButton, grnIndex, materialIndex, 'excess_remediation')}
                                                        aria-label="text alignment"
                                                    >
                                                        <ToggleButton value="combine" aria-label="centered" style={{ marginBottom: "20px" }}>
                                                            <MergeTypeIcon style={{ marginRight: 3 }} />Combine
                                                        </ToggleButton>
                                                        <ToggleButton value="debit_note" aria-label="centered" style={{ marginBottom: "20px" }}>
                                                            <NoteAddIcon style={{ marginRight: 3 }} />Debit Note
                                                        </ToggleButton>
                                                    </ToggleButtonGroup> */}
                                                        {cISummaryDetails?.data?.is_editable && (
                                                            <Box>
                                                                <Button
                                                                    sx={{ mb: 2 }}
                                                                    variant="outlined"
                                                                    color="primary"
                                                                    onClick={() => handleOpenCombineModal(material.customer_brand_material_id, material.current_delivery_data?.delivery_date_id, material.grn_material_id, material.current_delivery_data?.excess_remediation?.raise_type, 'excess_remediation', material.material_type)}
                                                                    startIcon={material.current_delivery_data?.excess_remediation?.raise_type == 'not_created' ? <CachedIcon /> : <EditIcon />}
                                                                >Remediate</Button>
                                                            </Box>
                                                        )}
                                                        <Box sx={{ mt: 1 }}>
                                                            <CombineDetails
                                                                dataList={material.current_delivery_data?.excess_remediation}
                                                                deliveryId={material.current_delivery_data?.delivery_date_id}
                                                                spoId={cISummaryDetails?.data?.supplier_po_id}
                                                                materialType={material.material_type}
                                                                materialData={{
                                                                    ritz_code: material.ritz_customer_brand_reference_code,
                                                                    customer_brand_material_id: material.customer_brand_material_id,
                                                                    delivery_date: material.current_delivery_data?.display_value,
                                                                    color: `${material.fabric_color}-${material.fabric_type_display_value}`
                                                                }}
                                                                sourceId={sourceId}
                                                                isPoClub={isPoClub}
                                                            />
                                                        </Box>
                                                    </Box>
                                                </Box>
                                            )}
                                            {material.current_delivery_data?.short_remediation?.has_total_value && (
                                                <Box sx={{ mt: 1, mb: 2, p: 1 }}>
                                                    <Typography variant='h6' fontWeight='bold' sx={{ color: '#1976d2' }}>Short Remediation :</Typography>
                                                    <Box sx={{ mt: 1 }}>
                                                        {/* <ToggleButtonGroup
                                                        value={material.current_delivery_data?.short_remediation?.raise_type == 'not_created' ? 'combine' : material.current_delivery_data?.short_remediation?.raise_type}
                                                        exclusive
                                                        onChange={(event, newActiveButton) => handleChangeColorToneButtons(event, newActiveButton, grnIndex, materialIndex, 'short_remediation')}
                                                        aria-label="text alignment"
                                                    >
                                                        <ToggleButton value="combine" aria-label="centered" style={{ marginBottom: "20px" }}>
                                                            <MergeTypeIcon style={{ marginRight: 3 }} />Combine
                                                        </ToggleButton>
                                                        <ToggleButton value="replacement" aria-label="left aligned" style={{ marginBottom: "20px" }}>
                                                            <FindReplaceIcon style={{ marginRight: 3 }} />Replacement
                                                        </ToggleButton>
                                                        <ToggleButton value="debit_note" aria-label="centered" style={{ marginBottom: "20px" }}>
                                                            <NoteAddIcon style={{ marginRight: 3 }} />Debit Note
                                                        </ToggleButton>
                                                    </ToggleButtonGroup> */}
                                                        {cISummaryDetails?.data?.is_editable && (
                                                            <Box>
                                                                <Button
                                                                    sx={{ mb: 2 }}
                                                                    variant="outlined"
                                                                    color="primary"
                                                                    onClick={() => handleOpenCombineModal(material.customer_brand_material_id, material.current_delivery_data?.delivery_date_id, material.grn_material_id, material.current_delivery_data?.short_remediation?.raise_type, 'short_remediation', material.material_type)}
                                                                    startIcon={material.current_delivery_data?.short_remediation?.raise_type == 'not_created' ? <CachedIcon /> : <EditIcon />}
                                                                >Remediate</Button>
                                                            </Box>
                                                        )}
                                                        <Box sx={{ mt: 1 }}>
                                                            <CombineDetails
                                                                dataList={material.current_delivery_data?.short_remediation}
                                                                modalType={'short_remediation'}
                                                                deliveryId={material.current_delivery_data?.delivery_date_id}
                                                                spoId={cISummaryDetails?.data?.supplier_po_id}
                                                                isVisibleReplacement={true}
                                                                materialType={material.material_type}
                                                                materialData={{
                                                                    ritz_code: material.ritz_customer_brand_reference_code,
                                                                    customer_brand_material_id: material.customer_brand_material_id,
                                                                    delivery_date: material.current_delivery_data?.display_value,
                                                                    color: `${material.fabric_color}-${material.fabric_type_display_value}`
                                                                }}
                                                                sourceId={sourceId}
                                                                isPoClub={isPoClub}
                                                            />
                                                        </Box>
                                                    </Box>
                                                </Box>
                                            )}
                                            {material.current_delivery_data?.mismatch_remediation?.has_total_value && (
                                                <Box sx={{ mt: 1, mb: 2, p: 1 }}>
                                                    <Typography variant='h6' fontWeight='bold' sx={{ color: '#1976d2' }}>Mismatch Remediation :</Typography>
                                                    <Box sx={{ mt: 1 }}>
                                                        {/* <ToggleButtonGroup
                                                        value={material.current_delivery_data?.mismatch_remediation?.raise_type == 'not_created' ? 'combine' : material.current_delivery_data?.mismatch_remediation?.raise_type}
                                                        exclusive
                                                        onChange={(event, newActiveButton) => handleChangeColorToneButtons(event, newActiveButton, grnIndex, materialIndex, 'mismatch_remediation')}
                                                        aria-label="text alignment"
                                                    >
                                                        <ToggleButton value="combine" aria-label="centered" style={{ marginBottom: "20px" }}>
                                                            <MergeTypeIcon style={{ marginRight: 3 }} />Combine
                                                        </ToggleButton>
                                                        <ToggleButton value="debit_note" aria-label="centered" style={{ marginBottom: "20px" }}>
                                                            <NoteAddIcon style={{ marginRight: 3 }} />Debit Note
                                                        </ToggleButton>
                                                    </ToggleButtonGroup> */}
                                                        {cISummaryDetails?.data?.is_editable && (
                                                            <Box>
                                                                <Button
                                                                    sx={{ mb: 2 }}
                                                                    variant="outlined"
                                                                    color="primary"
                                                                    onClick={() => handleOpenCombineModal(material.customer_brand_material_id, material.current_delivery_data?.delivery_date_id, material.grn_material_id, material.current_delivery_data?.mismatch_remediation?.raise_type, 'mismatch_remediation', material.material_type)}
                                                                    startIcon={material.current_delivery_data?.mismatch_remediation?.raise_type == 'not_created' ? <CachedIcon /> : <EditIcon />}
                                                                >Remediate</Button>
                                                            </Box>
                                                        )}
                                                        <Box sx={{ mt: 1 }}>
                                                            <CombineDetails
                                                                dataList={material.current_delivery_data?.mismatch_remediation}
                                                                modalType={'mismatch_remediation'}
                                                                deliveryId={material.current_delivery_data?.delivery_date_id}
                                                                spoId={cISummaryDetails?.data?.supplier_po_id}
                                                                materialType={material.material_type}
                                                                materialData={{
                                                                    ritz_code: material.ritz_customer_brand_reference_code,
                                                                    customer_brand_material_id: material.customer_brand_material_id,
                                                                    delivery_date: material.current_delivery_data?.display_value,
                                                                    color: `${material.fabric_color}-${material.fabric_type_display_value}`
                                                                }}
                                                                sourceId={sourceId}
                                                                isPoClub={isPoClub}
                                                            />
                                                        </Box>
                                                    </Box>
                                                </Box>
                                            )}
                                            {material.current_delivery_data?.width_remediation?.has_total_value && (
                                                <Box sx={{ mt: 1, mb: 2, p: 1 }}>
                                                    <Typography variant='h6' fontWeight='bold' sx={{ color: '#1976d2' }}>Width Remediation :</Typography>
                                                    <Box sx={{ mt: 1 }}>
                                                        {cISummaryDetails?.data?.is_editable && (
                                                            <Box>
                                                                <Button
                                                                    sx={{ mb: 2 }}
                                                                    variant="outlined"
                                                                    color="primary"
                                                                    onClick={() => handleOpenCombineModal(material.customer_brand_material_id, material.current_delivery_data?.delivery_date_id, material.grn_material_id, material.current_delivery_data?.width_remediation?.raise_type, 'width_remediation', material.material_type)}
                                                                    startIcon={material.current_delivery_data?.width_remediation?.raise_type == 'not_created' ? <CachedIcon /> : <EditIcon />}
                                                                >Remediate</Button>
                                                            </Box>
                                                        )}
                                                        <Box sx={{ mt: 1 }}>
                                                            <CombineDetails
                                                                dataList={material.current_delivery_data?.width_remediation}
                                                                modalType={'width_remediation'}
                                                                isVisibleReplacement={true}
                                                                isVisibleDebitNote={false}
                                                                deliveryId={material.current_delivery_data?.delivery_date_id}
                                                                spoId={cISummaryDetails?.data?.supplier_po_id}
                                                                materialType={material.material_type}
                                                                materialData={{
                                                                    ritz_code: material.ritz_customer_brand_reference_code,
                                                                    customer_brand_material_id: material.customer_brand_material_id,
                                                                    delivery_date: material.current_delivery_data?.display_value,
                                                                    color: `${material.fabric_color}-${material.fabric_type_display_value}`
                                                                }}
                                                                sourceId={sourceId}
                                                                isPoClub={isPoClub}
                                                            />
                                                        </Box>
                                                    </Box>
                                                </Box>
                                            )} 
                                                

                                        </>

                                    </Card>
                                </React.Fragment>
                            )
                        }
                        )
                    ))}
                </>
            )}
        </>
    );
};

export default CISummary;
