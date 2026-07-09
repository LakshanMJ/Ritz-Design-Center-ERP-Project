import React, { useEffect, useState } from "react";
import { Alert, Box, Button, Card, CardContent, CardHeader, Divider, Grid, InputLabel, Link, Table, TableBody, TableCell, TableHead, TablePagination, TableRow, TextField, useTheme } from "@mui/material";
import api from "@/services/api";
import Checkbox from '@mui/material/Checkbox';
import DefaultLoader from "@/components/DefaultLoader";
import RitzSelection from "@/components/Ritz/RitzSelection";
import { ReactKeyHelper } from "@/helpers/KeyHelper";
import * as RestUrls from '@/helpers/constants/RestUrls';
import toast from "react-hot-toast";
import { getDefaultError } from "@/helpers/Utilities";
import RitzSearchableSelection from "@/components/Ritz/RitzSearchableSelection";
import { consolidateMaterialInquirySaveURL, consolidateSupplierInquiryMaterialCostingList } from "@/helpers/constants/rest_urls/CostingUrls";
import { DEFAULT_SUCCESS } from "@/helpers/constants/Constants";
import RitzMultiSelectCheckBox from "@/components/Ritz/RitzMultiSelectCheckBox";
import FormErrorMessage from "@/components/FormErrorMessage";

const SendingSupplierInquiryDetails = ({ selectedMaterials, refreshData }: any) => {
    const theme = useTheme();
    const keyHelper = new ReactKeyHelper();
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [costingMaterialData, setCostingMaterialData] = useState<any>({});
    const [selectedData, setSelectedData] = useState<any>({ costingData: [], suppliers: [] });
    const [suppliers, setSuppliers] = useState<any>([]);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(50);
    const [combinedData, setCombinedData] = useState<any>([]);
    const [errors, setErrors] = useState<any>({});

    const fetchData = () => {
        setErrors({})
        const queryParams = getQueryParams(selectedMaterials);
        Promise.all([
            api.get(RestUrls.suppliersURL()),
            api.get(consolidateSupplierInquiryMaterialCostingList(1, 100, queryParams)),
        ]).then(resp => {
            const respData = resp.map((r: any) => r.data);
            const [suppliers, materialCostingData] = respData;
            setSuppliers([...suppliers])
            setCostingMaterialData({ ...materialCostingData });
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false);
        });
    }
    const getQueryParams = (customerBrandMaterialIds: any): string => {
        const params: any = {};
        params['customer_brand_material_ids'] = customerBrandMaterialIds || '';

        if (Object.keys(params).length) {
            return new URLSearchParams(params).toString();
        }
        return '';
    };

    const handleChangePage = (event: any, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: any) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };
    const handleCheckboxChange = (isChecked: boolean, material: any, buyer: any, costing: any) => {
        setSelectedData((prev: any) => {
            let updatedCostingData = [...prev.costingData];
            if (isChecked) {
                if (!updatedCostingData.some(item => item.buyer_id === buyer.id && item.id === material?.material_details?.customer_brand_material_id && item.costing_id === costing?.id)) {
                    updatedCostingData.push({
                        id: material?.material_details?.customer_brand_material_id,
                        material_name: material?.material_details?.ritz_customer_brand_reference_code,
                        buyer_id: buyer.id,
                        buyer: buyer.name,
                        costing_id: costing?.id,
                        tot_quantity: costing?.quantity?.quantity,
                    });
                }
            } else {
                updatedCostingData = updatedCostingData.filter(
                    (item) => !(item.buyer_id === buyer.id && item.id === material?.material_details?.customer_brand_material_id && item.costing_id === costing?.id)
                );
            }
            return { ...prev, costingData: updatedCostingData };
        });
    };

    const handleSave = () => {
        const materials = combinedData.flatMap((buyer: any) => 
            buyer.materials.map((material: any) => ({
                material_id: material.id,
                total_requested_estimated_quantity: material.estimate_quantity,
                costings: material.costings,
            }))
        );
        const request = {
            method: 'post',
            url: consolidateMaterialInquirySaveURL(),
            data: {
                supplier_ids: selectedData?.suppliers,
                materials: materials,
            }
        }
        api(request).then(() => {
            toast.success(DEFAULT_SUCCESS);
            refreshData()
            setErrors({})
        }).catch(error => {
            setErrors(error?.response?.data)
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsSaving(false));
    }

    const handleEstimateQuantityChange = (value: any, buyerIndex: any, materialIndex: any) => {
        const updatedData = [...combinedData];
        updatedData[buyerIndex].materials[materialIndex].estimate_quantity = value || null;
        setCombinedData(updatedData);
    };

    const handleOnChangeSelectPack = (event: any, data: any, reason: any) => {
        data.forEach((d: any) => d.size = d.id);
        const supplierIds = data.map((size: any) => size.id);
        setSelectedData((prevData: any) => ({
            ...prevData,
            suppliers: supplierIds
        }));
    };

    useEffect(() => {
        if (!selectedData?.costingData) return;
        const groupedCostingData = selectedData.costingData.reduce((acc: any[], item: any) => {
            let buyerGroup = acc.find((group) => group?.buyer_id === item?.buyer_id);
            if (!buyerGroup) {
                buyerGroup = {
                    buyer: item?.buyer,
                    buyer_id: item?.buyer_id,
                    materials: []
                };
                acc.push(buyerGroup);
            }
            let materialGroup = buyerGroup.materials.find((matetial: any) => matetial?.id === item?.id);
            if (!materialGroup) {
                materialGroup = {
                    id: item?.id,
                    material_name: item?.material_name,
                    tot_quantity: 0,
                    estimate_quantity: 0,
                    costings: []
                };
                buyerGroup.materials.push(materialGroup);
            }
            materialGroup.tot_quantity += item?.tot_quantity;
            materialGroup.estimate_quantity = materialGroup.tot_quantity;
            const cost = materialGroup.costings.find((costing: any) => costing?.costing_id === item?.costing_id);
            if (cost) {
                cost.quantity += item.tot_quantity;
            } else {
                materialGroup.costings.push({ costing_id: item?.costing_id, quantity: item?.tot_quantity });
            }
            return acc;
        }, []);

        setCombinedData(groupedCostingData);

    }, [selectedData?.costingData]);

    useEffect(() => {
        if (selectedMaterials.length > 0) {
            fetchData()
        }
    }, [selectedMaterials]);


    return (
        <>
            {isLoading ? (
                <DefaultLoader />
            ) : (
                <>
                    <Box>
                        <InputLabel sx={{ mb: 1 }}>Supplier :</InputLabel>
                        <RitzMultiSelectCheckBox
                            id={'users'}
                            selectOptions={suppliers}
                            optionValue={'id'}
                            optionDisplayValue={'name'}
                            handleOnChange={handleOnChangeSelectPack}
                            selectedValues={selectedData?.suppliers || ''}
                            handleOnClose={() => console.log('todo remove this')}
                        />
                        <FormErrorMessage message={errors?.supplier_errors} />
                    </Box>
                    <Box sx={{ mt: 1 }}>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ background: theme.palette.grey[100] }}>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Material</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Buyer</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Costing</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Quantity</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>Action</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {costingMaterialData?.results?.length === 0 ? (
                                    <TableRow sx={{ background: '#fff' }}>
                                        <TableCell colSpan={12} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>
                                            No available data.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    costingMaterialData?.results?.map((material: any, materialIndex: number) => {
                                        const totalMaterialRows = material.buyers.reduce((sum: number, buyer: any) => sum + buyer.costings.length, 0);
                                        return material.buyers.map((buyer: any, buyerIndex: number) => {
                                            return buyer.costings.map((costing: any, costingIndex: number) => (
                                                <TableRow key={`${keyHelper.getNextKeyValue()}`} sx={{ background: '#fff' }}>
                                                    {buyerIndex === 0 && costingIndex === 0 && (
                                                        <TableCell
                                                            rowSpan={totalMaterialRows}
                                                            sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}
                                                        >
                                                            {material?.material_details?.ritz_customer_brand_reference_code}
                                                        </TableCell>
                                                    )}
                                                    {costingIndex === 0 && (
                                                        <TableCell
                                                            rowSpan={buyer?.costings.length}
                                                            sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}
                                                        >
                                                            {buyer.name}
                                                        </TableCell>
                                                    )}
                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                        <Link>{costing?.long_code}</Link>
                                                    </TableCell>
                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                        {costing?.quantity?.quantity}   {costing?.quantity?.quantity_units_display}
                                                    </TableCell>
                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>
                                                        <Checkbox
                                                            onChange={(e: any) => handleCheckboxChange(e.target.checked, material, buyer, costing)}
                                                            checked={selectedData.costingData.some(
                                                                (item: any) => item.buyer_id === buyer.id && item.id === material?.material_details?.customer_brand_material_id && item?.costing_id === costing?.id
                                                            )}
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            ));
                                        });
                                    })
                                )}
                            </TableBody>
                        </Table>
                        <TablePagination
                            rowsPerPageOptions={[50, 100, 150]}
                            component="div"
                            count={costingMaterialData?.results?.length || 0}
                            rowsPerPage={rowsPerPage}
                            page={page}
                            onPageChange={handleChangePage}
                            onRowsPerPageChange={handleChangeRowsPerPage}
                        />
                    </Box>
                    {selectedData?.suppliers?.length > 0 && (
                        <Box>
                            <Card variant="outlined">
                                <CardHeader
                                    title={
                                        <>
                                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                                <Box sx={{ color: 'primary.main' }}>
                                                    {selectedData?.suppliers?.length > 0
                                                        ? suppliers.filter((supplier: any) => selectedData.suppliers.includes(supplier.id))
                                                            .map((supplier: any) => supplier?.name)
                                                            .join(' / ')
                                                        : "Select a Supplier"} - Price Inquiry
                                                </Box>
                                            </Box>
                                        </>
                                    }
                                    sx={{ backgroundColor: (theme) => theme.palette.grey[50] }} />
                                <CardContent id="packaging">
                                    {combinedData?.length === 0 ? (
                                        <Alert severity='info' sx={{ mb: 2 }}>
                                            Please select materials to send inquiry.
                                        </Alert>
                                    ) : (
                                        <Table>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Inquiry</TableCell>
                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Buyer</TableCell>
                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Material</TableCell>
                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Calculated Estimated Quantity</TableCell>
                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Estimated Quantity</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {combinedData.map((buyer: any, buyerIndex: number) => (
                                                    buyer?.materials?.map((material: any, materialIndex: any) => (
                                                        <TableRow key={`${keyHelper.getNextKeyValue()}`}>
                                                            {materialIndex === 0 && (
                                                                <>
                                                                    <TableCell rowSpan={buyer?.materials?.length} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Inquiry {buyerIndex + 1}</TableCell>
                                                                    <TableCell rowSpan={buyer?.materials?.length} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{buyer.buyer}</TableCell>
                                                                </>
                                                            )}
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{material.material_name}</TableCell>
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{material.tot_quantity}</TableCell>
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                                <TextField
                                                                    value={material.estimate_quantity}
                                                                    onChange={(e: any) => handleEstimateQuantityChange(parseFloat(e.target.value), buyerIndex, materialIndex)}
                                                                    type="number"
                                                                    onFocus={(e) => e.target.addEventListener("wheel", function (e) { e.preventDefault() }, { passive: false })}
                                                                />
                                                                <FormErrorMessage message={errors?.material_errors?.[materialIndex]?.quantity} />
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                ))}
                                            </TableBody>
                                        </Table>
                                    )}

                                </CardContent>
                            </Card>
                        </Box>
                    )}

                    <Box display="flex" justifyContent="flex-end" sx={{ mt: 2 }}>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={() => { handleSave() }}
                            disabled={isSaving}
                        >
                            Send
                        </Button>
                    </Box>
                </>
            )}
        </>
    );
};

export default SendingSupplierInquiryDetails;
