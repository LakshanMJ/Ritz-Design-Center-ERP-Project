import React, { useEffect, useState } from 'react';
import * as restUrls from '@/helpers/constants/RestUrls';
import api from '@/services/api';
import DefaultLoader from '@/components/DefaultLoader';
import { toast } from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';
import { Box, Card, darken, Grid, IconButton, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import PreviewIcon from '@mui/icons-material/Preview';
import { ReactKeyHelper } from '@/helpers/KeyHelper';

const PostCostingSummary = ({ orderId, versionId, packId }: any) => {
    const keyHelper = new ReactKeyHelper();
    const [isLoading, setIsLoading] = useState(true);
    const [summaryDetails, setSummaryDetails] = useState<any>({});

    const orderInformationHeaders = [
        { value: 'display_number', label: 'Inquiry Number' },
        { value: 'date', label: 'Costing Date' },
        { value: 'style_number', label: 'Style Number' },
        { value: 'customer_name', label: 'Customer' },
        { value: 'style_description', label: 'Description' },
        { value: 'season_name', label: 'Season' },
    ]

    const fetchData = () => {
        const requests = [
            api.get(restUrls.preSeenSummaryDetailsURL(packId)),
        ];
        Promise.all(requests).then(resp => {
            const respData = resp.map((r: any) => r.data);
            const [summaryDetails] = respData;
            setSummaryDetails({ ...summaryDetails });
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoading(false));
    };

    const handleViewImage = () => {

    }

    useEffect(() => {
        setIsLoading(true);
        fetchData();
    }, []);

    return (
        <>
            {isLoading ? (
                <DefaultLoader />
            ) : (
                <Box>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <Box>
                                <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold', mb: 2 }}>
                                    Order Information
                                </Typography>
                                <Table>
                                    <TableBody>
                                        {orderInformationHeaders?.map((header: any, headerIndex: any) => (
                                            <TableRow key={`${keyHelper.getNextKeyValue()}`}>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '25%' }}>{header?.label}</TableCell>
                                                {header?.value == 'style_name' ? (
                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <Box>{summaryDetails?.[header?.value]}</Box>
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => handleViewImage()}
                                                                sx={{ cursor: 'pointer' }}
                                                            >
                                                                <PreviewIcon color="primary" />
                                                            </IconButton>
                                                        </Box>
                                                    </TableCell>
                                                ) : (
                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{summaryDetails?.meta_data?.[header?.value]}</TableCell>
                                                )}
                                            </TableRow>
                                        ))}
                                        <TableRow>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold' }}>Qty Per Pack</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{summaryDetails?.meta_data?.quantity_per_pack}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold', color: 'primary.main' }}>Final Offer Price</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{summaryDetails?.pack_total_cost || 0} USD</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </Box>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Box>
                                <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold', mb: 2 }}>
                                    Costing Summary
                                </Typography>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Costing Element</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Tot. Cost (USD)</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Fin %</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Fin Cost (USD)</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Final Cost (USD)</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        <TableRow >
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Fabric Cost</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{summaryDetails?.total_fabric_cost || 0}</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{summaryDetails?.total_fabric_financing_percentage || 0}</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{Number(summaryDetails?.total_fabric_financing_cost).toFixed(4) || 0}</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{summaryDetails?.total_fabric_cost || 0}</TableCell>
                                        </TableRow>
                                        <TableRow key={`${keyHelper.getNextKeyValue()}`} >
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Trims Cost</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{summaryDetails?.total_sewing_trim_cost || 0}</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{summaryDetails?.total_trim_financing_percentage || 0}</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{Number(summaryDetails?.total_trim_financing_cost).toFixed(4) || 0}</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{summaryDetails?.total_sewing_trim_cost || 0}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell colSpan={4} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Buying Commission</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{summaryDetails?.buyer_commission || '--'}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell colSpan={4} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold', color: 'primary.main' }}>Cost Total</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{Number(summaryDetails?.pack_total_cost || 0).toFixed(4) || 0} USD</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </Box>
                        </Grid>

                    </Grid>
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold', mb: 2 }}>Costing Details </Typography>
                    </Box>
                    {summaryDetails?.pack_item_costs?.map((item: any, itemIndex: any) => (
                        <React.Fragment key={`${keyHelper.getNextKeyValue()}`}>
                            <Box sx={{ mt: 2 }}>
                                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>{item?.pack_item_display}</Typography>
                            </Box>
                            <Card variant="outlined" sx={{ p: 1 }}>
                                <Box>
                                    <Box sx={{ mt: 1 }}>
                                        <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold', mb: 2 }}>Fabric Cost</Typography>
                                    </Box>
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Material Category</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Ritz Code</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Suplier</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Consumption</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Wastage %</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Cost Per Unit (USD)</TableCell>
                                                {/* <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Cost Per Unit Type</TableCell> */}
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Total (USD)</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {item?.fabric_costs?.cost_data?.map((fabric: any, fabricIndex: any) => (
                                                    <TableRow key={`${keyHelper.getNextKeyValue()}`}>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{fabric?.material_data?.fabric_texture_description_display_value}</TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{fabric?.material_data?.ritz_customer_brand_reference_code}</TableCell>
                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{fabric?.material_suppliers?.length > 0
                                                        ? fabric?.material_suppliers?.map((supplier: any) => supplier?.supplier_name).join(', ')
                                                        : '-'}</TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}> {Number(fabric?.consumption_ratio).toFixed(4)}</TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{fabric?.wastage || '--'}</TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{Number(fabric?.average_cost?.cost).toFixed(3)} {fabric?.average_cost?.cost_unit}</TableCell>
                                                        {/* <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{fabric?.supplier_inquiry_detail_data?.cost_per_unit_type || '--'}</TableCell> */}
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{Number(fabric?.cost).toFixed(3) || 0}</TableCell>
                                                    </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </Box>
                                <Box>
                                    <Box sx={{ mt: 1 }}>
                                        <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold', mb: 2 }}>Sewing Trim Cost</Typography>
                                    </Box>
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Material Category</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Ritz Code</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Suplier</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Consumption</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Wastage %</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Cost Per Unit (USD)</TableCell>
                                                {/* <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Cost Per Unit Type</TableCell> */}
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Total (USD)</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {item?.sewing_trim_costs?.cost_data?.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={9} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>No available data</TableCell>
                                                </TableRow>
                                            ) : (
                                                item?.sewing_trim_costs?.cost_data?.map((sewingTrim: any, sewingIndex: any) => (
                                                    <TableRow key={`${keyHelper.getNextKeyValue()}`}>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{sewingTrim?.material_data?.material_label}</TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{sewingTrim?.material_data?.ritz_customer_brand_reference_code}</TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{sewingTrim?.material_suppliers?.length > 0
                                                        ? sewingTrim?.material_suppliers?.map((supplier: any) => supplier?.supplier_name).join(', ')
                                                        : '-'}</TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{sewingTrim?.consumption_ratio} {sewingTrim?.placement_material_consumption?.consumption_ratio_units}</TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{sewingTrim?.wastage}</TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{Number(sewingTrim?.average_cost?.cost).toFixed(4) || 0} {sewingTrim?.average_cost?.cost_unit}</TableCell>
                                                        {/* <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{sewingTrim?.supplier_inquiry_detail_data?.cost_per_unit_type || '--'}</TableCell> */}
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{Number(sewingTrim?.cost).toFixed(4) || 0}</TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </Box>
                                <Box>
                                    <Box sx={{ mt: 1 }}>
                                        <Typography color="primary" variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>Embelishment Cost</Typography>
                                    </Box>
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Type</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Sub Type</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Total (USD)</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {item?.service_costs?.service_cost_data?.length === 0 ? (
                                                <TableRow >
                                                    <TableCell colSpan={4} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>No available data</TableCell>
                                                </TableRow>
                                            ) : (
                                                item?.service_costs?.service_cost_data?.map((service: any, serviceIndex: any) => (
                                                    <TableRow key={`${keyHelper.getNextKeyValue()}`}>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{service?.service_attributes?.type}</TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{service?.service_attributes?.sub_type}</TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{service?.cost_per_unit}</TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </Box>
                                <Box>
                                    <Box sx={{ mt: 1 }}>
                                        <Typography color="primary" variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>Operations Cost</Typography>
                                    </Box>
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Operation</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Costing SMV</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Earnings Per Minute (EPM)</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Total (USD)</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {item?.ie_costs?.operation_data?.length === 0 ? (
                                                <TableRow >
                                                    <TableCell colSpan={4} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>No available data</TableCell>
                                                </TableRow>
                                            ) : (
                                                <>
                                                    {item?.ie_costs?.operation_data?.map((operation: any, operationIndex: any) => (
                                                        <TableRow key={`${keyHelper.getNextKeyValue()}`}>
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{operation?.operation_name}</TableCell>
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{operation?.costing_smv}</TableCell>
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{item?.ie_costs?.earnings_per_minute}</TableCell>
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{operation?.smv_cost}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                    <TableRow>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center', fontWeight: 'bold' }}>Total</TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{item?.ie_costs?.total_costing_smv}</TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{item?.ie_costs?.earnings_per_minute}</TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{item?.ie_costs?.total_cost}</TableCell>
                                                    </TableRow>
                                                </>
                                            )}
                                        </TableBody>
                                    </Table>
                                </Box>
                            </Card>
                        </React.Fragment>
                    ))}
                    <Box>
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold', mb: 2 }}>Packaging Cost</Typography>
                        </Box>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Material Category</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Ritz Code</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Supllier</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Consumption</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Wastage %</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Cost Per Unit (USD)</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Total (USD)</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {summaryDetails?.packaging_costs?.cost_data?.map((packaging: any, packagingIndex: any) => (
                                    <TableRow>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{packaging?.material_data?.material_label}</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{packaging?.material_data?.ritz_customer_brand_reference_code}</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{packaging?.material_suppliers?.length > 0
                                            ? packaging?.material_suppliers?.map((supplier: any) => supplier?.supplier_name).join(', ')
                                            : '-'}</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{packaging?.consumption_ratio}</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{packaging?.wastage}</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{Number(packaging?.average_cost?.cost).toFixed(4) || 0} {packaging?.average_cost?.cost_unit}</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{Number(packaging?.cost).toFixed(4) || 0}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Box>
                    <Box>
                        <Box sx={{ mt: 1 }}>
                            <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold', mb: 2 }}>Other Cost</Typography>
                        </Box>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Item Description</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Remarks</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Total</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {summaryDetails?.other_costs?.other_cost_data?.map((otherCost: any, otherCostIndex: any) => (
                                    <TableRow>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{otherCost?.other_cost_type_name}</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{otherCost?.remark || '--'}</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{otherCost?.cost}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Box>
                </Box>
            )}
        </>
    );
};

export default PostCostingSummary;