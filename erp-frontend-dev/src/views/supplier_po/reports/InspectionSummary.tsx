import React, { useEffect, useState } from 'react';
import { getDefaultError } from '@/helpers/Utilities';
import toast from 'react-hot-toast';
import { Alert, Box, Card, CardHeader, Grid, InputLabel, Link, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, useTheme } from '@mui/material';
import DefaultLoader from '@/components/DefaultLoader';
import api from '@/services/api';
import RitzUploader from '@/components/Ritz/RitzUploader';
import RitzImageUploader from '@/components/Ritz/RitzImageUploader';
import { THUMBNAILVIEW } from '@/helpers/constants/FileUpload';
import { inspectionSummaryUsingDeliveryDateUrl, inspectionSummaryUsingDeliveryNoteIdUrl, inspectionSummaryUsingInvoiceIdUrl, inspectionSummaryUsingPackListIdUrl, inspectionSummaryUsingSPOIdUrl } from '@/helpers/constants/rest_urls/SupplierPoUrls';
import { createdGrnDetailsPageURL } from '@/helpers/constants/front_end/GrnUrls';
import CustomerBrandMaterialDetail from '@/views/settings/userdefine_material/MaterialDetail';

const InspectionSummary = ({ spoId, reportId, reportType }: any) => {
    const theme = useTheme()
    const spoTypeKey = 'spo'
    const deliveryDateTypeKey = 'deliveryDate'
    const packListTypeKey = 'packList'
    const invoiceeTypeKey = 'invoice'
    const deliveryNoteTypeKey = 'delivery'

    const [isLoading, setIsLoading] = useState(true);
    const [inspectionDetails, setInspectionDetails] = useState([]);
    const [showMaterialDetails, setShowMaterialDetails] = useState(false);
    const [selectedMaterialId, setSelectedMaterialId] = useState(null);

    const fetchData = () => {
        setIsLoading(true);
        let reportUrl;
        if (reportType === spoTypeKey) {
            reportUrl = inspectionSummaryUsingSPOIdUrl(reportId);
        } else if (reportType === deliveryNoteTypeKey) {
            reportUrl = inspectionSummaryUsingDeliveryNoteIdUrl(reportId);
        } else if (reportType === packListTypeKey) {
            reportUrl = inspectionSummaryUsingPackListIdUrl(reportId);
        }else if (reportType === invoiceeTypeKey) {
            reportUrl = inspectionSummaryUsingInvoiceIdUrl(reportId);
        }else if (reportType === deliveryDateTypeKey) {
            reportUrl = inspectionSummaryUsingDeliveryDateUrl(reportId);
        }

        api.get(reportUrl).then(resp => {
            const resdata = resp?.data || [];
            setInspectionDetails([...resdata]);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoading(false));
    };

    const handleReferenceCodeDetailOnClick = (materialId:any) => {
        setShowMaterialDetails(true);
        setSelectedMaterialId(materialId);
    }
    const handleModalClose = () => {
        setShowMaterialDetails(false)
    }

    useEffect(() => {
        if (spoId) {
            fetchData();
        }
    }, []);

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
                    {inspectionDetails.length === 0 && (
                        <Alert severity="info">Inspection reports not available at the moment</Alert>
                    )}
                    <TableContainer>
                        {inspectionDetails.map((inspectionDetail: any, materialIndex: number) => (
                            <React.Fragment key={materialIndex}>
                                <Card variant="outlined" sx={{ mb: 3, mt: 1 }} key={materialIndex}>
                                    {inspectionDetail.materials.map((material: any, materialIndex: number) => (
                                        <Table key={materialIndex}>
                                            <TableHead>
                                                <TableRow sx={{background: (theme) => theme.palette.grey[100]}}>
                                                    <TableCell>
                                                        <Typography variant='h6' >
                                                            <Link sx={{ cursor: 'pointer' }} href={createdGrnDetailsPageURL(inspectionDetail.grn_id)} target="_blank">
                                                                {inspectionDetail.grn_name}
                                                            </Link>
                                                            /
                                                            <Link component="button" onClick={() => handleReferenceCodeDetailOnClick(material.material_id)}>
                                                                 {material.name}
                                                            </Link>
                                                        </Typography>
                                                    </TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {material.batches.map((batch: any, batchIndex: number) => (
                                                   <TableRow key={batchIndex}>
                                                        <Grid item xs={12} key={batchIndex}>
                                                            <Card key={batchIndex} >
                                                                <CardHeader
                                                                    title={`${batch.batch_number}`}
                                                                    sx={{
                                                                        background: (theme) => theme.palette.grey[100],
                                                                        fontWeight: 'bold',
                                                                        borderBottom: (theme) => `1px solid ${theme.palette.grey[100]}`,
                                                                    }}
                                                                ></CardHeader>
                                                                <Grid container spacing={1}>
                                                                    {batch.summary?.map((summaryItem: any, summaryIndex: number) => (
                                                                        <Grid item xs={3} sm={3} key={summaryIndex}>
                                                                            <Card sx={{ mb: 1, mt: 1, ml: 1, mr: 1, border: summaryItem.name === 'Final' ? '3px solid green' : '1px solid transparent' }}>
                                                                                {summaryItem.name == 'Final' ? (
                                                                                    <Table aria-label="simple table">
                                                                                        <TableBody>
                                                                                            <TableRow>
                                                                                                <TableCell colSpan={2} sx={{ fontWeight: 'bold', textAlign: 'center' }}>{summaryItem.name}</TableCell>
                                                                                            </TableRow>
                                                                                            <TableRow>
                                                                                                <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%' }}>Average Defect Rate</TableCell>
                                                                                                <TableCell sx={{ width: '50%', wordBreak: 'break-all',color: summaryItem.qa_status === 'inspection_passed' ? 'green' : 'red' }}> {summaryItem.avg_defect_rate_per_100_square_yards || '--'}</TableCell>
                                                                                            </TableRow>
                                                                                            <TableRow>
                                                                                                <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%' }}>Inspect Result</TableCell>
                                                                                                <TableCell sx={{ width: '50%', wordBreak: 'break-all',color: summaryItem.qa_status === 'inspection_passed' ? 'green' : 'red' }}>{summaryItem.qa_status === 'inspection_passed' ? 'Pass' : summaryItem.qa_status === null ? '--' : 'Fail'}</TableCell>
                                                                                            </TableRow>
                                                                                            <TableRow>
                                                                                                <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%' }}>Total Inspected Quantity</TableCell>
                                                                                                <TableCell sx={{ width: '50%', wordBreak: 'break-all'}}>{summaryItem.total_inspection_quantity} {summaryItem.total_inspection_quantity_units}</TableCell>
                                                                                            </TableRow>
                                                                                        </TableBody>
                                                                                    </Table>
                                                                                ) : (
                                                                                    <Table aria-label="simple table">
                                                                                        <TableBody>
                                                                                            <TableRow>
                                                                                                <TableCell sx={{ fontWeight: 'bold' }}>{summaryItem.name}</TableCell>
                                                                                                <TableCell />
                                                                                            </TableRow>
                                                                                            <TableRow>
                                                                                                <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%' }}>Average Point Value</TableCell>
                                                                                                <TableCell sx={{ width: '50%', wordBreak: 'break-all' }}>{summaryItem.average_point_value}</TableCell>
                                                                                            </TableRow>
                                                                                            <TableRow>
                                                                                                <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%' }}>Remarks</TableCell>
                                                                                                <TableCell sx={{ width: '50%', wordBreak: 'break-all' }}>{summaryItem.Remarks || '--'}</TableCell>
                                                                                            </TableRow>
                                                                                            <TableRow>
                                                                                                <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%' }}>Rolls with Roll to Roll Shade</TableCell>
                                                                                                <TableCell sx={{ width: '50%', wordBreak: 'break-all' }}>{summaryItem.roll_to_roll_shading_rolls?.join(', ') || '--'}</TableCell>
                                                                                            </TableRow>
                                                                                            <TableRow>
                                                                                                <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%' }}>Rolls with Within the Roll Shade</TableCell>
                                                                                                <TableCell sx={{ width: '50%', wordBreak: 'break-all' }}>{summaryItem.within_the_roll_shading_rolls?.join(', ') || '--'}</TableCell>
                                                                                            </TableRow>
                                                                                            <TableRow>
                                                                                                <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%' }}>Failed Rolls</TableCell>
                                                                                                <TableCell sx={{ width: '50%', wordBreak: 'break-all' }}>{summaryItem.failed_rolls?.join(', ') || '--'}</TableCell>
                                                                                            </TableRow>
                                                                                        </TableBody>
                                                                                    </Table>
                                                                                )}

                                                                            </Card>
                                                                        </Grid>
                                                                    ))}
                                                                </Grid>
                                                            </Card>
                                                        </Grid>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    ))}

                                </Card>
                            </React.Fragment>
                        ))}
                    </TableContainer>
                </>
            )}
        </>
    );
};

export default InspectionSummary;
