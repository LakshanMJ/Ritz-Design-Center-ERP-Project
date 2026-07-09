import React, { useEffect, useState } from 'react';
import { getDefaultError } from '@/helpers/Utilities';
import toast from 'react-hot-toast';
import { Alert, Box, Card, CardHeader, Grid, InputLabel, Link, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, useTheme } from '@mui/material';
import DefaultLoader from '@/components/DefaultLoader';
import api from '@/services/api';
import { supplierPOGRNShadeSummaryUsingDeliveryIdURL, supplierPOGRNShadeSummaryUsingDeliveryNoteURL, supplierPOGRNShadeSummaryUsingInvoiceIdURL, supplierPOGRNShadeSummaryUsingPackListIdURL, supplierPOGRNShadeSummaryUsingSPOIdURL } from '@/helpers/constants/rest_urls/SupplierPoUrls';
import { createdGrnDetailsPageURL } from '@/helpers/constants/front_end/GrnUrls';
import CustomerBrandMaterialDetail from '@/views/settings/userdefine_material/MaterialDetail';

const ShadeSummary = ({ spoId, reportId, reportType }: any) => {
    const theme = useTheme()
    const spoTypeKey = 'spo'
    const deliveryNoteTypeKey = 'delivery'
    const deliveryDateTypeKey = 'deliveryDate'
    const packListTypeKey = 'packList'
    const invoiceeTypeKey = 'invoice'
   // alert(reportType)
    const [isLoading, setIsLoading] = useState(true);
    const [shadeDetails, setShadeDetails] = useState([]);
    const [showMaterialDetails, setShowMaterialDetails] = useState(false);
    const [selectedMaterialId, setSelectedMaterialId] = useState(null);

    const fetchData = () => {
        setIsLoading(true);
        let reportUrl;
        if (reportType === spoTypeKey) {
            reportUrl = supplierPOGRNShadeSummaryUsingSPOIdURL(reportId);
        } else if (reportType === deliveryNoteTypeKey) {
            reportUrl = supplierPOGRNShadeSummaryUsingDeliveryNoteURL(reportId);
        } else if (reportType === packListTypeKey) {
            reportUrl = supplierPOGRNShadeSummaryUsingPackListIdURL(reportId);
        }else if (reportType === invoiceeTypeKey) {
            reportUrl = supplierPOGRNShadeSummaryUsingInvoiceIdURL(reportId);
        }else if (reportType === deliveryDateTypeKey) {
            reportUrl = supplierPOGRNShadeSummaryUsingDeliveryIdURL(reportId);
        }
        

        api.get(reportUrl).then(resp => {
            const resdata = resp?.data || [];
            setShadeDetails([...resdata]);
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
    const dummyData={
        shade_groups: [
            { shade_group_name:"Groupe01", id:1, }, { shade_group_name:"Groupe01", id:2, }, { shade_group_name:"Groupe01", id:3, }
            
        ],
        // shade_group_batches: [
        //     {id:12, batch_number:"Batch01", shades: { shade_group_id:1, [{batch_shade, id}, ] }},
        // ] 
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
                    {shadeDetails.length === 0 && (
                        <Alert severity="info">Shade reports not available at the moment</Alert>
                    )}
                    <TableContainer>
                        {shadeDetails.map((inspectionDetail: any, materialIndex: number) => (
                            <React.Fragment key={materialIndex}>
                                <Card variant="outlined" sx={{ mb: 3, mt: 1 }} key={materialIndex}>
                                    {inspectionDetail.materials.map((material: any, materialIndex: number) => (
                                        <Table key={materialIndex}>
                                            <TableHead>
                                                <TableRow sx={{ background: (theme) => theme.palette.grey[100] }}>
                                                    <TableCell> 
                                                        <Typography variant='h6' >
                                                            <Link sx={{ cursor: 'pointer' }} href={createdGrnDetailsPageURL(inspectionDetail.grn_id)} target="_blank">
                                                                {inspectionDetail?.grn_number}
                                                            </Link>
                                                            /
                                                            <Link component="button" onClick={() => handleReferenceCodeDetailOnClick(material.material_id)}>
                                                                 {material.material}
                                                            </Link>
                                                        </Typography>
                                                    </TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {material.batch_numbers.map((batch: any, batchIndex: number) => (
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
                                                                    {batch.shades?.map((shade: any, shadeIndex: number) => (
                                                                        <Grid item xs={3} sm={3} key={shadeIndex}>
                                                                            <Card sx={{ mb: 1, mt: 1, ml: 1, mr: 1, border: shade.name === 'Final' ? '3px solid green' : '1px solid transparent' }}>
                                                                                <Table aria-label="simple table">
                                                                                    <TableBody>
                                                                                        <TableRow>
                                                                                            <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%' }}>Shade </TableCell>
                                                                                            <TableCell sx={{ width: '50%', wordBreak: 'break-all' }}>{shade.shade}</TableCell>
                                                                                        </TableRow>
                                                                                        <TableRow>
                                                                                            <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%' }}>Roll Numbers</TableCell>
                                                                                            <TableCell sx={{ width: '50%', wordBreak: 'break-all' }}>{shade.roll_data?.join(', ')}</TableCell>
                                                                                        </TableRow>
                                                                                    </TableBody>
                                                                                </Table>
                                                                            </Card>
                                                                        </Grid>
                                                                    ))}
                                                                </Grid>
                                                                
                                                            </Card>
                                                        </Grid>
                                                    </TableRow>
                                                ))}
                                                <Typography sx={{ p: 1, mt: 2, mb: 1 }} variant='h6' >Shade Group Details</Typography>
                                                <Box >
                                                    {material.shade_groups.length == 0 ? (
                                                       <Alert sx={{mb:1}} severity="info">No available Shade Groupes</Alert>
                                                    ) : (
                                                        <Table aria-label="simple table">
                                                            <TableHead>
                                                                <TableRow>
                                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}></TableCell>
                                                                    {material.shade_groups.map((shadeGroupe: any, shadeGroupeIndex: number) => (
                                                                        <TableCell key={shadeGroupeIndex} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>{shadeGroupe.shade_name}</TableCell>
                                                                    ))}
                                                                </TableRow>
                                                            </TableHead>
                                                            <TableBody>
                                                                {material.batch_numbers.map((batchNumber: any, batchIndex: number) => (
                                                                    <TableRow key={batchIndex}>
                                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left', fontWeight: 'bold' }}>
                                                                            {batchNumber.batch_number}
                                                                        </TableCell>
                                                                        {material.shade_groups.map((shadeGroup: any, shadeGroupIndex: number) => {
                                                                            const matchingShades = batchNumber.shades.filter((shade: any) => shade.shade_group_id === shadeGroup.shade_group_id).map((shade: any) => shade.shade).join(', ');
                                                                            return (
                                                                                <TableCell
                                                                                    key={shadeGroupIndex}
                                                                                    sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}
                                                                                >
                                                                                    {matchingShades || '--'}
                                                                                </TableCell>
                                                                            );
                                                                        })}
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    )}
                                                </Box>
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

export default ShadeSummary;
