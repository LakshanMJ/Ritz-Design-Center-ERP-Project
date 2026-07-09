import React, { useEffect, useState } from 'react';
import * as restUrls from '@/helpers/constants/RestUrls';
import api from '@/services/api';
import DefaultLoader from '@/components/DefaultLoader';
import { toast } from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';
import { Box, Card, darken, Grid, IconButton, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import PreviewIcon from '@mui/icons-material/Preview';
import { ReactKeyHelper } from '@/helpers/KeyHelper';

const CostingSummary = ({ orderId, versionId, packId }: any) => {
    const keyHelper = new ReactKeyHelper();
    const [isLoading, setIsLoading] = useState(true);
    const [summaryDetails, setSummaryDetails] = useState<any>({});
    const costingSummaryHeaders = [
        { financeCost: 'fabric_financing_cost', financePercentage: 'fabric_financing_cost_percentage', label: 'Fabric Cost' },
        { financeCost: 'trim_financing_cost', financePercentage: 'trim_financing_cost_percentage', label: 'Trims Cost' },
    ]
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
            api.get(restUrls.costingPackSummaryDetailsURL(orderId, versionId, packId)),
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
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold'}}>Qty Per Pack</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{summaryDetails?.meta_data?.quantity_per_pack}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold', color: 'primary.main' }}>Final Offer Price</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{summaryDetails?.pack_total_cost} USD</TableCell>
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
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{summaryDetails?.fabric_cost_summary?.fabric_cost}</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{summaryDetails?.fabric_financing_cost_percentage || 0}</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{summaryDetails?.fabric_cost_summary?.total_fabric_finance_cost}</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, color: (theme) => theme.palette.primary.main }}>{summaryDetails?.fabric_cost_summary?.total_fabric_cost || 0}</TableCell>
                                        </TableRow>
                                        <TableRow key={`${keyHelper.getNextKeyValue()}`} >
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Trims Cost</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{summaryDetails?.trim_cost_summary?.trim_cost || 0}</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{summaryDetails?.trim_financing_cost_percentage  || 0}</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{summaryDetails?.trim_cost_summary?.total_trim_finance_cost || 0}</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, color: (theme) => theme.palette.primary.main }}>{summaryDetails?.trim_cost_summary?.total_trim_cost || 0}</TableCell>
                                        </TableRow>
                                        <TableRow key={`${keyHelper.getNextKeyValue()}`} >
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Service Cost</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{summaryDetails?.service_cost_summary?.service_cost || 0}</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{summaryDetails?.service_cost_summary?.service_financing_cost_percentage || 0}</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{summaryDetails?.service_cost_summary?.total_service_finance_cost || 0}</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, color: (theme) => theme.palette.primary.main }}>{summaryDetails?.service_cost_summary?.total_service_cost || 0}</TableCell>
                                        </TableRow>
                                        <TableRow key={`${keyHelper.getNextKeyValue()}`} >
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Other Cost</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>--</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>--</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>--</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, color: (theme) => theme.palette.primary.main }}>{summaryDetails?.total_other_cost || 0}</TableCell>
                                        </TableRow>
                                        <TableRow key={`${keyHelper.getNextKeyValue()}`} >
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>CM</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>--</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>--</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>--</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, color: (theme) => theme.palette.primary.main }}>{summaryDetails?.total_ie_operation_cost || 0}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell colSpan={4} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Buying Commission</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, color: (theme) => theme.palette.primary.main }}>{summaryDetails?.buyer_commission_cost_percentage}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell colSpan={4} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold', color: 'primary.main' }}>Cost Total</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, color: (theme) => theme.palette.primary.main , fontWeight:'bold'}}>{summaryDetails?.pack_total_cost} USD</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </Box>
                        </Grid>
                    </Grid>
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold', mb: 2 }}>Costing Details </Typography>
                    </Box>
                    {summaryDetails?.pack_item_data?.map((item: any, itemIndex: any) => (
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
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Placement</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Supplier</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Ship Mode</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Consumption</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Wastage %</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Cost Per Unit (USD)</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Cost Per Unit Type</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Total (USD)</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {Object.values(item?.fabric_data)?.map((fabric: any, fabricIndex: any) => (
                                                <TableRow key={`${keyHelper.getNextKeyValue()}`}>
                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{fabric?.material?.material_label}</TableCell>
                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{fabric?.placement_name}</TableCell>
                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{fabric?.supplier_inquiry_detail_data?.supplier}</TableCell>
                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{fabric?.supplier_inquiry_detail_data?.ship_mode}</TableCell>
                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{fabric?.placement_material_consumption?.consumption_ratio} {fabric?.placement_material_consumption?.consumption_ratio_units}</TableCell>
                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{fabric?.placement_material_consumption?.wastage}</TableCell>
                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{fabric?.supplier_inquiry_detail_data?.cost_per_unit?.cost} {fabric?.supplier_inquiry_detail_data?.cost_per_unit?.costing_unit_display}</TableCell>
                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{fabric?.supplier_inquiry_detail_data?.cost_per_unit_type}</TableCell>
                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, color: (theme) => theme.palette.primary.main }}>{fabric?.placement_material_consumption?.total_cost}</TableCell>
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
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Placement</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Supplier</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Ship Mode</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Consumption</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Wastage %</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Cost Per Unit (USD)</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Cost Per Unit Type</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Total (USD)</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {item?.sewing_trim_data?.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={9} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` , textAlign:'center' }}>No available data</TableCell>
                                                </TableRow>
                                            ) : (
                                                item?.sewing_trim_data?.map((sewingTrim: any, sewingIndex: any) => (
                                                    <TableRow key={`${keyHelper.getNextKeyValue()}`}>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{sewingTrim?.material?.material_label}</TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{sewingTrim?.placement_name}</TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{sewingTrim?.supplier_inquiry_detail_data?.supplier}</TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{sewingTrim?.supplier_inquiry_detail_data?.ship_mode}</TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{sewingTrim?.placement_material_consumption?.consumption_ratio} {sewingTrim?.placement_material_consumption?.consumption_ratio_units}</TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{sewingTrim?.placement_material_consumption?.wastage}</TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{sewingTrim?.supplier_inquiry_detail_data?.cost_per_unit?.cost} {sewingTrim?.supplier_inquiry_detail_data?.cost_per_unit?.costing_unit_display}</TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{sewingTrim?.supplier_inquiry_detail_data?.cost_per_unit_type}</TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, color: (theme) => theme.palette.primary.main}}>{sewingTrim?.placement_material_consumption?.total_cost} </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </Box>
                                <Box>
                                    <Box sx={{ mt: 1 }}>
                                        <Typography color="primary" variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>Service Cost</Typography>
                                    </Box>
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Type</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Cost Per Unit (USD)</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Total (USD)</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {item?.service_data?.length === 0 ? (
                                                <TableRow >
                                                    <TableCell colSpan={4} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign:'center' }}>No available data</TableCell>
                                                </TableRow>
                                            ) : (
                                                item?.service_data?.map((service: any, serviceIndex: any) => (
                                                    <TableRow key={`${keyHelper.getNextKeyValue()}`}>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{service?.service_type?.display_value}</TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{service?.supplier_inquiry_detail_data?.cost_per_unit?.cost}</TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, color: (theme) => theme.palette.primary.main }}>{service?.supplier_inquiry_detail_data?.cost_per_unit?.cost}</TableCell>
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
                                            {item?.ie_operation_data?.length === 0 ? (
                                                <TableRow >
                                                    <TableCell colSpan={4} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign:'center' }}>No available data</TableCell>
                                                </TableRow>
                                            ) : (
                                                <>
                                                {item?.ie_operation_data?.map((operation: any, operationIndex: any) => (
                                                    <TableRow key={`${keyHelper.getNextKeyValue()}`}>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{operation?.operation_name}</TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{operation?.costing_smv}</TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{operation?.earnings_per_minute}</TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` , color: (theme) => theme.palette.primary.main}}>{operation?.operation_cost}</TableCell>
                                                    </TableRow>
                                                ))}
                                                    <TableRow>
                                                        <TableCell colSpan={3} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign:'center', fontWeight:'bold' }}>Total</TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` , color: (theme) => theme.palette.primary.main}}>{item?.total_ie_operation_cost}</TableCell>
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
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Placement</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Supplier</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Ship Mode</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Consumption</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Wastage %</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Cost Per Unit (USD)</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Cost Per Unit Type</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Total (USD)</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                    {summaryDetails?.packaging_data?.map((packaging: any, packagingIndex: any) => (
                                        <TableRow>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`}}>{packaging?.material?.material_label}</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`}}>{packaging?.placement_name}</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`}}>{packaging?.supplier_inquiry_detail_data?.supplier}</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`}}>{packaging?.supplier_inquiry_detail_data?.ship_mode}</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`}}>{packaging?.placement_material_consumption?.consumption_ratio} {packaging?.placement_material_consumption?.consumption_ratio_units}</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`}}>{packaging?.placement_material_consumption?.wastage}</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`}}>{packaging?.supplier_inquiry_detail_data?.cost_per_unit?.cost} {packaging?.supplier_inquiry_detail_data?.cost_per_unit?.costing_unit_display}</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{packaging?.supplier_inquiry_detail_data?.cost_per_unit_type}</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, color: (theme) => theme.palette.primary.main }}>{packaging?.placement_material_consumption?.total_cost}</TableCell>
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
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Total (USD)</TableCell>
                                </TableRow>
                            </TableHead>
                                <TableBody>
                                    {summaryDetails?.other_costs?.map((otherCost: any, otherCostIndex: any) => (
                                        <TableRow>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`}}>{otherCost?.other_cost_type_name}</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{otherCost?.remark || '--'}</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, color: (theme) => theme.palette.primary.main}}>{otherCost?.cost}</TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow>
                                        <TableCell colSpan={2} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign:'center', fontWeight:'bold'}}>Total</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, color: (theme) => theme.palette.primary.main}}>{summaryDetails?.total_other_cost || 0}</TableCell>
                                    </TableRow>
                                </TableBody>
                        </Table>
                    </Box>
                </Box>
            )}
        </>
    );
};

export default CostingSummary;