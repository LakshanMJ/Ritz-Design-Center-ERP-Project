import React, { useEffect, useState } from 'react';
import { getDefaultError } from '@/helpers/Utilities';
import toast from 'react-hot-toast';
import { Alert, Box, Card, CardHeader, Link, Typography, useTheme } from '@mui/material';
import DefaultLoader from '@/components/DefaultLoader';
import api from '@/services/api';
import { finacialSummaryDetailsURL } from '@/helpers/constants/rest_urls/SupplierPoUrls';
import { createdGrnDetailsPageURL } from '@/helpers/constants/front_end/GrnUrls';
import DebitNoteSummary from './DebitNoteSummary';
import CPISummary from './CPISummary';
import ReplacementSummary from './ReplacementSummary';
import ReceivingSummary from './ReceivingSummary';
import LeftOverSummary from './LeftOverSummary';
import StackBarChart from '@/components/Charts/StackBarChart';
import CustomerBrandMaterialDetail from '@/views/settings/userdefine_material/MaterialDetail';
import HorizontalChart from '@/components/Charts/HorizontalChart';
import GanttChart from '@/components/Charts/GanttChart';

const GRNIssues = ({ spoId, selectedId, isPOClub }: any) => {

    const [isLoading, setIsLoading] = useState(false);
    const [summaryDetails, setSummaryDetails] = useState({materials:[],pcl_data:[]});
    const [showMaterialDetails, setShowMaterialDetails] = useState(false);
    const [selectedMaterialId, setSelectedMaterialId] = useState(null);
    const fetchData = () => {
        setIsLoading(true);
        let reportUrl;
        reportUrl = finacialSummaryDetailsURL(spoId);

        api.get(reportUrl).then(resp => {
            const resdata = resp?.data || [];
            setSummaryDetails(resdata);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoading(false));
    };
    const chartLabels = ['Short Tolerance ', 'Order Quantity', 'Excess Tolerance ', 'Actual Quantity'];
    const predefinedColors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#FF6384'];

    const handleReferenceCodeDetailOnClick = (openState: boolean, materialId: any) => {
        setShowMaterialDetails(openState);
        setSelectedMaterialId(materialId);
    }
    const handleModalClose = () => {
        setShowMaterialDetails(false)
    }

    useEffect(() => {
        if (spoId) {
            fetchData();
        }
    }, [spoId]);

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
                    <Box sx={{ mt: 1, mb: 2 }}>
                        <Card>
                            <Box sx={{ mt: 1, mb: 2, p: 1 }} >
                                <Typography variant="h4" fontWeight="bold" sx={{ color: '#1976d2' }}>PCL - Statement : </Typography>
                                <GanttChart dataList={summaryDetails.pcl_data} />
                            </Box>

                        </Card>
                        {summaryDetails.materials?.map((material:any, materialIndex:any) => {
                            return (
                                material.deliveries?.map((delivery: any, deliveryIndex: any) => (
                                    <Card variant="outlined" sx={{ mb: 1, mt: 1 }} key={`${materialIndex}-${deliveryIndex}`}>
                                        <CardHeader
                                            title={
                                                <Typography variant='h4'>
                                                    <Link
                                                        sx={{ cursor: 'pointer' }}
                                                        onClick={() => handleReferenceCodeDetailOnClick(true, material.attributes?.customer_brand_material_id)}
                                                        target="_blank"
                                                    >

                                                        {material.attributes?.ritz_customer_brand_reference_code}
                                                    </Link>
                                                </Typography>
                                            }
                                            sx={{
                                                background: (theme) => theme.palette.grey[200],
                                                fontWeight: 'bold',
                                                borderBottom: (theme) => `1px solid ${theme.palette.grey[300]}`,
                                            }}
                                        />
                                        {delivery.grns?.length == 0 ? (
                                            <>
                                                <Alert severity="info" variant='outlined' sx={{ border: 0, }}>report details not available at the moment</Alert>
                                            </>
                                        ) : (
                                            <>
                                                {delivery.grns?.map((grn: any, grnIndex: any) => {

                                                    const totalOrderQuantity = grn.calculated_summary?.supplier_po_total_pi_quantity?.quantity;
                                                    const totalOrderQuantityUnit = grn.calculated_summary?.supplier_po_total_pi_quantity?.quantity_units_display;

                                                    const shortQuantiy = grn.calculated_summary?.short_tolerance_value?.quantity;
                                                    const shortQuantiyUnit = grn.calculated_summary?.short_tolerance_value?.quantity_units_display;

                                                    const excessQuantity = grn.calculated_summary?.excess_tolerance_value?.quantity;
                                                    const excessQuantityUnit = grn.calculated_summary?.excess_tolerance_value?.quantity_units_display;

                                                    const actualQuantity = grn.calculated_summary?.grn_total_actual_quantity?.quantity;
                                                    const actualQuantityUnit = grn.calculated_summary?.grn_total_actual_quantity?.quantity_units_display;

                                                    const chartData = [
                                                        { quantity: shortQuantiy, unit: shortQuantiyUnit },
                                                        { quantity: totalOrderQuantity, unit: totalOrderQuantityUnit },
                                                        { quantity: excessQuantity, unit: excessQuantityUnit },
                                                        { quantity: actualQuantity, unit: actualQuantityUnit }
                                                    ];
                                                    return (
                                                        <Box key={`${materialIndex}-${deliveryIndex}-${grnIndex}`}>
                                                            <CardHeader
                                                                title={
                                                                    <Typography variant="h5" fontWeight="bold">
                                                                        <Link
                                                                            sx={{ cursor: 'pointer' }}
                                                                            href={createdGrnDetailsPageURL(1)}
                                                                            target="_blank"
                                                                        >
                                                                            {delivery.display_number}
                                                                        </Link> / <Link
                                                                            sx={{ cursor: 'pointer' }}
                                                                            href={createdGrnDetailsPageURL(grn.id)}
                                                                            target="_blank"
                                                                        >
                                                                            {grn.display_number}
                                                                        </Link>
                                                                    </Typography>
                                                                }
                                                                sx={{
                                                                    background: (theme) => theme.palette.grey[100],
                                                                    fontWeight: 'bold',
                                                                    borderBottom: (theme) => `1px solid ${theme.palette.grey[300]}`,
                                                                }}
                                                            />
                                                            <Box sx={{ mt: 1, mb: 2, p: 1 }} >
                                                                <Typography variant="h6" fontWeight="bold" sx={{ color: '#1976d2' }}>GRN Tolerance : </Typography>
                                                                <Box sx={{ mt: 1 }}>
                                                                    <HorizontalChart
                                                                        labels={chartLabels}
                                                                        data={chartData}
                                                                        isUseRandomColors={false}
                                                                        predefinedColors={predefinedColors}
                                                                    />

                                                                </Box>
                                                            </Box>
                                                            <Box sx={{ mt: 1, mb: 2, p: 1 }} >
                                                                <Typography variant="h6" fontWeight="bold" sx={{ color: '#1976d2' }}>Finance Claims : </Typography>
                                                                <Box sx={{ mt: 1 }}>
                                                                    <Box sx={{ p: 1 }}><Typography variant="h6" fontWeight="bold">Debit Note :</Typography></Box>
                                                                    {grn.debit_note && Object.keys(grn.debit_note).length != 0 ? (
                                                                        <DebitNoteSummary dataList={grn.debit_note} spoId={spoId} selectedId={selectedId} isPOClub={isPOClub} />
                                                                    ) : (
                                                                        <Alert severity="info" variant='outlined' sx={{ border: 0, }}>Debit Note details not available at the moment</Alert>
                                                                    )}

                                                                </Box>
                                                                <Box sx={{ mt: 1 }}>
                                                                    <Box sx={{ p: 1 }}><Typography variant="h6" fontWeight="bold">Cut Panel Inspections :</Typography></Box>
                                                                    {grn.cpi_breakdown?.batches.length != 0 ? (
                                                                        <CPISummary dataList={grn.cpi_breakdown} />
                                                                    ) : (
                                                                        <Alert severity="info" variant='outlined' sx={{ border: 0, }}>CPI details not available at the moment</Alert>
                                                                    )}
                                                                </Box>
                                                                <Box sx={{ mt: 1 }}>
                                                                    <Box sx={{ p: 1 }}><Typography variant="h6" fontWeight="bold"> Replacements :</Typography></Box>
                                                                    {grn.replacement_data.length != 0 ? (
                                                                        <ReplacementSummary dataList={grn.replacement_data} />
                                                                    ) : (
                                                                        <Alert severity="info" variant='outlined' sx={{ border: 0, }}>Replacement details not available at the moment</Alert>
                                                                    )}
                                                                </Box>
                                                                <Box sx={{ mt: 1 }}>
                                                                    <Box sx={{ p: 1 }}><Typography variant="h6" fontWeight="bold">Receivings :</Typography></Box>
                                                                    {grn.receiving_breakdown.length != 0 ? (
                                                                        <ReceivingSummary dataList={grn.receiving_breakdown} />
                                                                    ) : (
                                                                        <Alert severity="info" variant='outlined' sx={{ border: 0, }}>Receiving details not available at the moment</Alert>
                                                                    )}
                                                                </Box>
                                                                <Box sx={{ mt: 1 }}>
                                                                    <Box sx={{ p: 1 }}><Typography variant="h6" fontWeight="bold">Replacement / Receivings:</Typography></Box>
                                                                    {grn.leftover_breakdown && Object.keys(grn.leftover_breakdown).length != 0 ? (
                                                                        <LeftOverSummary dataList={grn.leftover_breakdown} spoId={spoId} selectedId={selectedId} isPOClub={isPOClub} />
                                                                    ) : (
                                                                        <Alert severity="info" variant='outlined' sx={{ border: 0, }}>Receiving details not available at the moment</Alert>
                                                                    )}
                                                                </Box>
                                                            </Box>
                                                        </Box>
                                                    )
                                                })}
                                            </>
                                        )}
                                    </Card>
                                ))
                            )
                        })}
                    </Box>

                </>
            )}
        </>
    );
};

export default GRNIssues;
