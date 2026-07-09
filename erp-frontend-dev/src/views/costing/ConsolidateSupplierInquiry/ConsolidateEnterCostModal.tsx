import React, { useEffect, useState } from "react";
import api from "@/services/api";
import { toast } from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';
import { Box, Button, Card, CardActions, CardContent, CardHeader, Checkbox, Grid, InputLabel, TextField, alpha, Collapse, Link, Typography, Tooltip, IconButton } from "@mui/material";
import SaveSpinner from "@/components/SaveSpinner";
import RitzSelection from "@/components/Ritz/RitzSelection";
import DefaultLoader from "@/components/DefaultLoader";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import { TransitionGroup } from 'react-transition-group';
import { FABRIC_MATERIAL } from "@/helpers/costings/materials/MaterialFieldHelper";
import RitzSearchableSelection from "@/components/Ritz/RitzSearchableSelection";
import { consolidateSupplierInquiryCostDetailsURL, consolidateSupplierInquiryCostsSaveURL, consolidateSupplierInquiryCreateURL, supplierInquiryDefaultsValuesURL } from "@/helpers/constants/rest_urls/CostingUrls";
import { DEFAULT_SUCCESS } from "@/helpers/constants/Constants";
import FormErrorMessage from "@/components/FormErrorMessage";

const ConsolidateEnterCostModal = ({ materialDetails, metaDataSet, isDisabledSupplier, refreshData }: any) => {
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<any>({});
    const [deleteError, setDeleteError] = useState<any>({ id: '', error: '' });
    const [inquryDetails, setInquryDetails] = useState<any>({ supplier_inquiry_details: [] });
    const [inquryDefaultValues, setInquryDefaultValues] = useState<any>({});

    const fetchDefaultsValues = ({
        supplierId: paramSupplierId,
        material: paramMaterial,
        index: paramIndex
    }: {
        supplierId?: number;
        material?: number;
        index?: number;
    } = {}) => {
        const supplierId = paramSupplierId ?? "";
        const materialId = paramMaterial ?? materialDetails?.materialData?.customer_brand_material_id;
        const effectIndex = paramIndex ?? 0;

        api.get(supplierInquiryDefaultsValuesURL(materialId, supplierId))
            .then((resp: any) => {
                const defaultDataSet = resp?.data;
                if (!defaultDataSet || Object.keys(defaultDataSet).length === 0) return;
                setInquryDetails((prevState: any) => {
                    const updatedDetails = [...prevState.supplier_inquiry_details];
                    if (effectIndex >= updatedDetails.length) {
                        updatedDetails.length = effectIndex + 1;
                    }
                    updatedDetails[effectIndex] = { ...updatedDetails[effectIndex], ...defaultDataSet };
                    return { ...prevState, supplier_inquiry_details: updatedDetails };
                });
            })
            .catch((error) => {
                toast.error(getDefaultError(error?.response?.status));
            });
    };
    const handleOnChange = (index: number, field: string, value: any) => {
        const updated = { ...inquryDetails };
        updated['supplier_inquiry_details'][index][field] = value;
        const exWorkPrice = parseFloat(updated['supplier_inquiry_details'][index]['ex_work_price']) || 0;
        const fobPrice = parseFloat(updated['supplier_inquiry_details'][index]['fob_price']) || 0;
        const cifPrice = parseFloat(updated['supplier_inquiry_details'][index]['cif_price']) || 0;
        const transportCharges = parseFloat(updated['supplier_inquiry_details'][index]['transport_charges']) || 0;
        let totalCostPerUnit = 0;
        if (cifPrice > 0) {
            totalCostPerUnit = cifPrice + transportCharges;
        } else if (fobPrice > 0) {
            totalCostPerUnit = fobPrice + transportCharges;
        } else if (exWorkPrice > 0) {
            totalCostPerUnit = exWorkPrice + transportCharges;
        }
        if (field == 'cif_price' || field == 'fob_price' || field == 'ex_work_price' || field == 'transport_charges') {
            updated['supplier_inquiry_details'][index]['cost_per_unit'] = totalCostPerUnit;
        }
        if (field === 'supplier_id') {
            fetchDefaultsValues({ index: index, supplierId: value });
        }
        setInquryDetails(updated);
    }

    const addRow = () => {
        const newRow: any = {
            id: null,
            supplier_id: '',
            cif_price: '0.00',
            cost_per_unit: '',
            costing_unit: '',
            expiration_date: '',
            fob_price: '0.00',
            freight_charge: '',
            completed: false,
            lead_time: '',
            ship_mode: null,
            excess_threshold: '',
            cost_per_unit_type: '',
            supplier_material_reference_code: '',
            total_requested_quantity: '',
        };
        const updatedData = [...(inquryDetails?.supplier_inquiry_details || []), newRow];
        setInquryDetails((prevDetails: any) => ({
            ...prevDetails,
            supplier_inquiry_details: updatedData
        }));
        fetchDefaultsValues({ index: updatedData.length - 1 });
    };

    const deleteRow = (inquiryIndex: number) => {
        setInquryDetails((prevDetails: any) => {
            if (!prevDetails?.supplier_inquiry_details) return prevDetails;
            const updated = { ...prevDetails };
            updated.supplier_inquiry_details = [...updated.supplier_inquiry_details];
            updated.supplier_inquiry_details.splice(inquiryIndex, 1);
            return updated;
        });
    };

    const toggleDelete = (index: number) => {
        const updated = { ...inquryDetails };
        setDeleteError({});
        updated['supplier_inquiry_details'][index]['delete'] = !updated['supplier_inquiry_details'][index]['delete'];
        setInquryDetails(updated);
    }

    const onSubmit = () => {
        setIsSaving(true);
        setErrors({});
        setDeleteError({});
        const payload = {
            id: null as any,
            customer_brand_material_id: materialDetails?.materialData?.customer_brand_material_id,
            supplier_inquiry_details: inquryDetails?.supplier_inquiry_details
        }
        api.post(consolidateSupplierInquiryCreateURL(), payload).then(() => {
            toast.success(DEFAULT_SUCCESS);
            refreshData(false);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status))
            if (error?.response?.data) {
                setErrors(error.response.data);
            }
        }).finally(() => {
            setIsSaving(false);
        })
    }

    useEffect(() => {
        addRow()
    }, [materialDetails]);

    return (
        <>
            {isLoading ? (
                <Box sx={{ border: theme => `1px solid ${theme.palette.divider}` }}><DefaultLoader /></Box>
            ) : (
                <>

                    <React.Fragment >
                        <Typography variant='h4' sx={{ mb: 1 }}>{materialDetails?.materialData?.material_label}</Typography>
                        <Box>
                            <Card variant='outlined' sx={{ mb: 4 }}>
                                <CardHeader
                                    sx={{ background: theme => theme.palette.grey[100] }}
                                    title={
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <Box >Material Reference Code:  {inquryDetails?.material_details?.reference_code || 'N/A'}</Box>
                                        </Box>
                                    }
                                    subheader={
                                        <Grid container spacing={3} sx={{ alignItems: 'center' }}>
                                            {materialDetails?.materialHeaders?.map((header: any, i4: number) => (
                                                <Grid item key={i4}>
                                                    {header.label}: {materialDetails?.materialData[header.name] || 'N/A'}
                                                </Grid>
                                            ))}
                                        </Grid>
                                    }
                                />
                                <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                                    <TransitionGroup>
                                        {inquryDetails?.supplier_inquiry_details?.map((d: any, inquiryIndex: number) => (
                                            <Collapse key={`c-${inquiryIndex}`}>
                                                <Grid
                                                    container
                                                    sx={{
                                                        position: 'relative',
                                                        py: 3,
                                                        px: 2,
                                                        borderTop: theme => `1px solid ${theme.palette.grey[200]}`,
                                                        ...(d.delete && {
                                                            background: theme => alpha(theme.palette.error.main, 0.05),
                                                            border: theme => `1px solid ${theme.palette.error.main}`
                                                        })
                                                    }}
                                                >
                                                    <Grid item xs={12}>
                                                        <Grid container columnSpacing={4} rowSpacing={2}>
                                                            <Grid item lg={2} md={4}>
                                                                <InputLabel>Supplier:</InputLabel>
                                                                <RitzSearchableSelection
                                                                    options={metaDataSet?.suppliers}
                                                                    placeholder="Select..."
                                                                    selectedValue={d.supplier_id}
                                                                    handleOnChange={(selectedOrderID: any) => handleOnChange(inquiryIndex, 'supplier_id', selectedOrderID)}
                                                                    id={'id'}
                                                                    name={'id'}
                                                                    optionValue={'id'}
                                                                    optionText={'name'}
                                                                    isReadOnly={isDisabledSupplier}
                                                                />
                                                                <FormErrorMessage message={errors?.[inquiryIndex]?.['supplier_id']} />

                                                            </Grid>
                                                            <Grid item lg={2} md={4}>
                                                                <InputLabel>Ex-Work Price</InputLabel>
                                                                <TextField
                                                                    value={d.ex_work_price ?? '0.00'}
                                                                    inputProps={{ maxLength: 8 }}
                                                                    size='small'
                                                                    onChange={e => handleOnChange(inquiryIndex, 'ex_work_price', e.target.value)}
                                                                    disabled={d.delete}
                                                                />
                                                            </Grid>
                                                            <Grid item lg={2} md={4}>
                                                                <InputLabel>FOB Price</InputLabel>
                                                                <TextField
                                                                    value={d.fob_price ?? 0}
                                                                    inputProps={{ maxLength: 8 }}
                                                                    size='small'
                                                                    onChange={e => handleOnChange(inquiryIndex, 'fob_price', e.target.value)}
                                                                    disabled={d.delete}
                                                                />
                                                            </Grid>
                                                            <Grid item lg={2} md={4}>
                                                                <InputLabel>CIF Price</InputLabel>
                                                                <TextField
                                                                    value={d.cif_price ?? 0}
                                                                    inputProps={{ maxLength: 8 }}
                                                                    size='small'
                                                                    onChange={e => handleOnChange(inquiryIndex, 'cif_price', e.target.value)}
                                                                    disabled={d.delete}
                                                                />
                                                            </Grid>
                                                            <Grid item lg={2} md={4}>
                                                                <InputLabel>Transport Charges</InputLabel>
                                                                <TextField
                                                                    value={d.transport_charges ?? 0}
                                                                    inputProps={{ maxLength: 8 }}
                                                                    size='small'
                                                                    onChange={e => handleOnChange(inquiryIndex, 'transport_charges', e.target.value)}
                                                                    disabled={d.delete}
                                                                />
                                                            </Grid>
                                                            <Grid item lg={2} md={4}>
                                                                <InputLabel>Ship Mode</InputLabel>
                                                                <RitzSelection
                                                                    selectedValue={d.ship_mode ?? ''}
                                                                    options={metaDataSet?.shipModes}
                                                                    optionValue='id'
                                                                    optionText='name'
                                                                    size='small'
                                                                    handleOnChange={(e: any) => handleOnChange(inquiryIndex, 'ship_mode', e.target.value)}
                                                                    isReadOnly={d.delete}
                                                                />
                                                                <FormErrorMessage message={errors?.[inquiryIndex]?.['ship_mode']} />
                                                            </Grid>
                                                            <Grid item lg={2} md={4}>
                                                                <InputLabel>Payment Method</InputLabel>
                                                                <RitzSelection
                                                                    selectedValue={d.pay_mode ?? ''}
                                                                    options={metaDataSet?.payModes}
                                                                    optionValue='id'
                                                                    optionText='name'
                                                                    size='small'
                                                                    handleOnChange={(e: any) => handleOnChange(inquiryIndex, 'pay_mode', e.target.value)}
                                                                    isReadOnly={d.delete}
                                                                />
                                                                <FormErrorMessage message={errors?.[inquiryIndex]?.['pay_mode']} />
                                                            </Grid>

                                                            {materialDetails?.materialData?.material_type == FABRIC_MATERIAL && (
                                                                <Grid item lg={2} md={4}>
                                                                    <InputLabel>Cutting Width</InputLabel>
                                                                    <TextField
                                                                        value={d.cutting_width ?? ''}
                                                                        inputProps={{ maxLength: 8 }}
                                                                        size='small'
                                                                        onChange={e => handleOnChange(inquiryIndex, 'cutting_width', e.target.value)}
                                                                        disabled={d.delete}
                                                                    />
                                                                    <FormErrorMessage message={errors?.[inquiryIndex]?.['cutting_width']} />
                                                                </Grid>
                                                            )}
                                                            {materialDetails?.materialData?.material_type == FABRIC_MATERIAL && (
                                                                <Grid item lg={2} md={4}>
                                                                    <InputLabel>Cutting Width Unit </InputLabel>
                                                                    <RitzSelection
                                                                        selectedValue={d.cutting_width_unit ?? ''}
                                                                        options={metaDataSet?.consumptionUnits.all}
                                                                        optionValue='value'
                                                                        optionText='display_value'
                                                                        size='small'
                                                                        handleOnChange={(e: any) => handleOnChange(inquiryIndex, 'cutting_width_unit', e.target.value)}
                                                                        isReadOnly={d.delete}
                                                                    />
                                                                    <FormErrorMessage message={errors?.[inquiryIndex]?.['cutting_width_unit']} />
                                                                </Grid>
                                                            )}
                                                            <Grid item lg={2} md={4}>
                                                                <InputLabel>Cost Per Unit</InputLabel>
                                                                <TextField
                                                                    value={d.cost_per_unit ?? ''}
                                                                    inputProps={{ maxLength: 8 }}
                                                                    size='small'
                                                                    onChange={e => handleOnChange(inquiryIndex, 'cost_per_unit', e.target.value)}
                                                                    disabled={d.delete}
                                                                />
                                                                <FormErrorMessage message={errors?.[inquiryIndex]?.['cost_per_unit']} />
                                                            </Grid>
                                                            <Grid item lg={2} md={4}>
                                                                <InputLabel>Costing Unit</InputLabel>
                                                                <RitzSelection
                                                                    selectedValue={d.costing_unit ?? ''}
                                                                    options={metaDataSet?.consumptionUnits?.per_unit_options}
                                                                    optionValue='value'
                                                                    optionText='display_value'
                                                                    size='small'
                                                                    handleOnChange={(e: any) => handleOnChange(inquiryIndex, 'costing_unit', e.target.value)}
                                                                    isReadOnly={d.delete}
                                                                />
                                                                <FormErrorMessage message={errors?.[inquiryIndex]?.['costing_unit']} />
                                                            </Grid>
                                                            <Grid item lg={2} md={4}>
                                                                <InputLabel>Cost Per Unit Type</InputLabel>
                                                                <RitzSelection
                                                                    selectedValue={d.cost_per_unit_type ?? ''}
                                                                    options={metaDataSet?.costPerUnitTypes}
                                                                    optionValue='id'
                                                                    optionText='name'
                                                                    size='small'
                                                                    handleOnChange={(e: any) => handleOnChange(inquiryIndex, 'cost_per_unit_type', e.target.value)}
                                                                    isReadOnly={d.delete}
                                                                />
                                                                <FormErrorMessage message={errors?.[inquiryIndex]?.['cost_per_unit_type']} />
                                                            </Grid>
                                                            <Grid item lg={2} md={4}>
                                                                <InputLabel>Expiration Date</InputLabel>
                                                                <LocalizationProvider dateAdapter={AdapterDayjs}>
                                                                    <DatePicker
                                                                        disablePast
                                                                        format='DD/MM/YYYY'
                                                                        value={d.expiration_date ? dayjs(d.expiration_date) : null}
                                                                        onChange={(e: any) => handleOnChange(inquiryIndex, 'expiration_date', e.$d)}
                                                                        slotProps={{
                                                                            textField: {
                                                                                size: 'small'
                                                                            }
                                                                        }}
                                                                        disabled={d.delete}
                                                                    />
                                                                </LocalizationProvider>
                                                                <FormErrorMessage message={errors?.[inquiryIndex]?.['expiration_date']} />
                                                            </Grid>
                                                            <Grid item lg={2} md={4}>
                                                                <InputLabel>Lead Time in Number of Days</InputLabel>
                                                                <TextField
                                                                    value={d.lead_time ?? ''}
                                                                    inputProps={{ maxLength: 8 }}
                                                                    size='small'
                                                                    onChange={e => handleOnChange(inquiryIndex, 'lead_time', e.target.value)}
                                                                    disabled={d.delete}
                                                                />
                                                                <FormErrorMessage message={errors?.[inquiryIndex]?.['lead_time']} />
                                                            </Grid>
                                                            <Grid item lg={2} md={4}>
                                                                <InputLabel>MOQ</InputLabel>
                                                                <TextField
                                                                    value={d.minimum_order_quantity ?? ''}
                                                                    inputProps={{ maxLength: 8 }}
                                                                    size='small'
                                                                    onChange={e => handleOnChange(inquiryIndex, 'minimum_order_quantity', e.target.value)}
                                                                    disabled={d.delete}
                                                                />
                                                            </Grid>
                                                            <Grid item lg={2} md={4}>
                                                                <InputLabel>MOQ Unit</InputLabel>
                                                                <RitzSelection
                                                                    selectedValue={d.minimum_order_quantity_units ?? ''}
                                                                    options={metaDataSet?.consumptionUnits?.all}
                                                                    optionValue='value'
                                                                    optionText='display_value'
                                                                    size='small'
                                                                    handleOnChange={(e: any) => handleOnChange(inquiryIndex, 'minimum_order_quantity_units', e.target.value)}
                                                                    isReadOnly={d.delete}
                                                                />
                                                            </Grid>
                                                            {!d.is_service && (
                                                                <>
                                                                    <Grid item lg={2} md={4}>
                                                                        <InputLabel>Excess Threshold</InputLabel>
                                                                        <TextField
                                                                            value={d.excess_threshold ?? ''}
                                                                            size='small'
                                                                            onChange={e => handleOnChange(inquiryIndex, 'excess_threshold', e.target.value)}
                                                                            disabled={d.delete}
                                                                        />
                                                                        <FormErrorMessage message={errors?.[inquiryIndex]?.['excess_threshold']} />
                                                                    </Grid>
                                                                    <Grid item lg={2} md={4}>
                                                                        <InputLabel>Supplier Reference Code</InputLabel>
                                                                        <TextField
                                                                            value={d.supplier_material_reference_code ?? ''}
                                                                            size='small'
                                                                            onChange={e => handleOnChange(inquiryIndex, 'supplier_material_reference_code', e.target.value)}
                                                                            disabled={d.delete}
                                                                        />
                                                                        <FormErrorMessage message={errors?.[inquiryIndex]?.['supplier_material_reference_code']} />
                                                                    </Grid>
                                                                </>
                                                            )}
                                                            <Grid item lg={2} md={4}>
                                                                <InputLabel>Estimated Quantity</InputLabel>
                                                                <TextField
                                                                    value={d.total_requested_quantity ?? ''}
                                                                    size='small'
                                                                    onChange={e => handleOnChange(inquiryIndex, 'total_requested_quantity', e.target.value)}
                                                                    disabled={d.delete}
                                                                />
                                                                <FormErrorMessage message={errors?.[inquiryIndex]?.['total_requested_quantity']} />
                                                            </Grid>
                                                            <Grid item lg={2} md={4}>
                                                                <InputLabel>Reviewed</InputLabel>
                                                                <Checkbox
                                                                    size='small'
                                                                    checked={d.completed}
                                                                    onChange={e => handleOnChange(inquiryIndex, 'completed', e.target.checked)}
                                                                    disabled={d.delete}
                                                                />
                                                            </Grid>
                                                            <Grid item xs sx={{ display: 'flex', alignItems: 'end', justifyContent: 'right', fontSize: 'small' }}>
                                                                {!d.delete && (
                                                                    <Link color='error' sx={{ cursor: 'pointer' }} onClick={() => toggleDelete(inquiryIndex)}>Delete</Link>
                                                                )}
                                                                {d.delete && (
                                                                    <>
                                                                        <Link color='error' sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => deleteRow(inquiryIndex)}>
                                                                            {d.isSaving && <SaveSpinner />}Confirm Delete
                                                                        </Link>
                                                                        <Box sx={{ mx: 0.5 }}>/</Box>
                                                                        <Link color='secondary' sx={{ cursor: 'pointer' }} onClick={() => toggleDelete(inquiryIndex)}>Cancel</Link>
                                                                    </>
                                                                )}
                                                            </Grid>
                                                        </Grid>
                                                    </Grid>
                                                    {(deleteError?.id?.toString() && deleteError?.id?.toString() === d?.id?.toString()) && (
                                                        <Grid item xs={12} sx={{ mt: 2, color: 'error.main', display: 'flex', alignItems: 'center' }}>
                                                            {deleteError?.error}
                                                        </Grid>
                                                    )}
                                                </Grid>
                                            </Collapse>
                                        ))}
                                    </TransitionGroup>
                                </CardContent>
                                <CardActions sx={{ justifyContent: 'right', background: theme => theme.palette.grey[50] }}>
                                    <Button variant='outlined' size='small' onClick={() => { addRow() }}>Add Row</Button>
                                </CardActions>
                            </Card>
                        </Box>
                    </React.Fragment>

                </>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                <Button variant='contained' onClick={onSubmit} disabled={isSaving || isLoading}>
                    {isSaving && <SaveSpinner />}Submit
                </Button>
            </Box>
        </>
    );
};

export default ConsolidateEnterCostModal;