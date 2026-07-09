import React, { useEffect, useState } from "react";
import api from "@/services/api";
import { toast } from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';
import RitzModal from "@/components/Ritz/RitzModal";
import { Alert, Box, Button, Card, CardActions, CardContent, CardHeader, Checkbox, Grid, InputLabel, TextField, alpha, Collapse, Link, Typography, Tooltip, IconButton } from "@mui/material";
import SaveSpinner from "@/components/SaveSpinner";
import { DEFAULT_SUCCESS, VALIDATION_ERROR_CODE } from "@/helpers/constants/Constants";
import RitzSelection from "@/components/Ritz/RitzSelection";
import DefaultLoader from "@/components/DefaultLoader";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import { TransitionGroup } from 'react-transition-group';
import * as supplierApis from "@/helpers/constants/rest_urls/SupplierUrls";
import {FABRIC_MATERIAL, FABRIC_MATERIAL_LABEL} from "@/helpers/costings/materials/MaterialFieldHelper";
import {manualCostEntryURL} from "@/helpers/constants/rest_urls/SupplierUrls";
import RitzSearchableSelection from "@/components/Ritz/RitzSearchableSelection";
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

const CostsModal = ({ orderId, versionId, modalOpen, setModalOpen, selected, suppliers, consumptionData, costPerUnitTypes, transportTypes, payModes, refreshData, savedData , data}: any) => {
    const [isSaving, setIsSaving] = useState(false);
    const [selectedItems, setSelectedItems] = useState([]);
    const [supplierData, setSupplierData] = useState<any>({});
    const [isLoading, setIsLoading] = useState(true);
    const [errors, setErrors] = useState<any>({});
    const [deleteError, setDeleteError] = useState<any>({ id: '', error: '' });
    const [selectedIndex, setSelectedIndex] = useState<any>({});
    const [isCopyIconsShow, setIsCopyIconsShow] = useState(false);

    const handleOnChange = (table: string, index: number, index2: number, field: string, value: any) => {
        const updated = { ...supplierData };
        updated[table][index]['data'][index2][field] = value;
        const exWorkPrice = parseFloat(updated[table][index]['data'][index2]['ex_work_price']) || 0;
        const fobPrice = parseFloat(updated[table][index]['data'][index2]['fob_price']) || 0;
        const cifPrice = parseFloat(updated[table][index]['data'][index2]['cif_price']) || 0;
        const transportCharges = parseFloat(updated[table][index]['data'][index2]['transport_charges']) || 0;
        let totalCostPerUnit = 0;
        if (cifPrice > 0) {
            totalCostPerUnit = cifPrice + transportCharges;
        } else if (fobPrice > 0) {
            totalCostPerUnit = fobPrice + transportCharges;
        } else if (exWorkPrice > 0) {
            totalCostPerUnit = exWorkPrice + transportCharges;
        }
        if (field == 'cif_price' || field == 'fob_price' || field == 'ex_work_price' || field == 'transport_charges') {
            updated[table][index]['data'][index2]['cost_per_unit'] = totalCostPerUnit;
        }
        setSupplierData(updated);
    }

    const addRow = (table: string, index: number) => {
        const newRow: any = {
            supplier_id: '',
            cif_price: '0.00',
            cost_per_unit: '',
            costing_unit: '',
            expiration_date: '',
            fob_price: '0.00',
            freight_charge: '',
            completed: false,
            lead_time: ''
        }
        if (table === 'Fabric') {
            newRow.cutting_width = '';
            newRow.cutting_width_unit = '';
        }
        const updated = {...supplierData};
        updated[table][index]['data'].push(newRow);
        setSupplierData(updated);
    }

    const deleteRow = (table: string, index: number, index2: number) => {
        setDeleteError({});
        const updated = {...supplierData};
        updated[table][index]['data'].splice(index2, 1);
        setSupplierData(updated);
    }

    const toggleDelete = (table: string, index: number, index2: number) => {
        const updated = {...supplierData};
        setDeleteError({});
        updated[table][index]['data'][index2]['delete'] = !updated[table][index]['data'][index2]['delete'];
        setSupplierData(updated);
    }

    const getPayload: any = () => {
        const payload: any[] = [];

        Object.keys(supplierData).forEach((key: string) => {
            const sd = supplierData[key];
            sd.forEach((d: any) => {
                const data = d?.data || [];
                data?.forEach((i: any) => {
                    const row = {...i};
                    if ('item_service_id' in d) {
                        row['item_service_id'] = d.item_service_id;
                    } else {
                        row['customer_brand_material_id'] = d.customer_brand_material_id;
                    }
                    payload.push(row);
                });
            });
        });

        return payload;
    }

    const onSubmit = () => {
        // setIsSaving(true);
        setErrors({});
        setDeleteError({});

        const payload = getPayload();
        // alert("Submitting")
        api.put(supplierApis.manualCostEntryURL(+versionId), payload).then(() => {
            toast.success(DEFAULT_SUCCESS);
            setModalOpen(false);
            savedData();
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status))
            if (error?.response?.status === VALIDATION_ERROR_CODE && error?.response?.data) {
                setErrors(error.response.data);
            }
        }).finally(() => {
            setIsSaving(false);
        })
    }
    
    const handleClickCheckBox = (table: string, supplierInquiryId: number, supplierInquiryDetailSubIndex: number) => {
        setSelectedIndex((prevSelectedIndex: any) => {
            const currentTable = prevSelectedIndex[table] || {};
            const currentIndices = currentTable[supplierInquiryId] || [];
            if (currentIndices.includes(supplierInquiryDetailSubIndex)) {
                return {
                    ...prevSelectedIndex,
                    [table]: {
                        ...currentTable,
                        [supplierInquiryId]: currentIndices.filter((index: any) => index !== supplierInquiryDetailSubIndex)
                    }
                };
            } else {
                return {
                    ...prevSelectedIndex,
                    [table]: {
                        ...currentTable,
                        [supplierInquiryId]: [...currentIndices, supplierInquiryDetailSubIndex]
                    }
                };
            }
        });
    };
    
    const handleCopyToAll = (table: string, supplierInquiryId: number, supplierInquiryDetailSubIndex: number, mainIndex: number) => {
        const updated = { ...supplierData };
        const selectedDetail = updated[table][mainIndex]?.data[supplierInquiryDetailSubIndex];
        if (selectedDetail) {
            updated[table].forEach((sd: any) => {
                sd.data.forEach((detail: any, index: number) => {
                    if (selectedIndex[table]?.[detail?.is_service ? sd.item_service_id : sd.customer_brand_material_id]) {
                        detail.supplier_id = selectedDetail.supplier_id;
                        detail.ex_work_price = selectedDetail.ex_work_price;
                        detail.fob_price = selectedDetail.fob_price;
                        detail.cif_price = selectedDetail.cif_price;
                        detail.transport_charges = selectedDetail.transport_charges;
                        detail.ship_mode = selectedDetail.ship_mode;
                        detail.cutting_width = selectedDetail.cutting_width;
                        detail.cutting_width_unit = selectedDetail.cutting_width_unit;
                        detail.cost_per_unit = selectedDetail.cost_per_unit;
                        detail.costing_unit = selectedDetail.costing_unit;
                        detail.cost_per_unit_type = selectedDetail.cost_per_unit_type;
                        detail.expiration_date = selectedDetail.expiration_date;
                        detail.lead_time = selectedDetail.lead_time;
                        detail.minimum_order_quantity = selectedDetail.minimum_order_quantity;
                        detail.minimum_order_quantity_units = selectedDetail.minimum_order_quantity_units;
                        detail.excess_threshold = selectedDetail.excess_threshold;
                        detail.supplier_material_reference_code = selectedDetail.supplier_material_reference_code;
                        detail.pay_mode = selectedDetail.pay_mode;
                        detail.completed = selectedDetail.completed;
                    }
                });
            });
        }
    
        setSupplierData(updated);
    };

    useEffect(() => {
        let selectedItems: any[] = [];
        let supplierData = {} as any;
        Object.keys(selected).forEach((key: any) => {
            const sel = selected[key];
            selectedItems = selectedItems.concat(sel);
            supplierData[key] = [];
            sel.forEach((v: any) => {
                const row: any = {
                    supplier_id: '',
                    cif_price: '0.00',
                    cost_per_unit: '',
                    costing_unit: v._isService ? 'per_piece' : '',
                    expiration_date: '',
                    fob_price: '0.00',
                    freight_charge: '',
                    completed: false,
                    lead_time: '',
                    is_service: v._isService
                };
                if (key === 'Fabric') {
                    row.cutting_width = '';
                    row.cutting_width_unit = '';
                }
                const rowData = { description: v._description, data: [row] } as any;
                if (v._isService) {
                    rowData['item_service_id'] = v.service_id;
                } else {
                    rowData['customer_brand_material_id'] = v.customer_brand_material_id;
                }
                supplierData[key].push(rowData); 
            });
        });
        setSelectedItems(selectedItems);
        setSupplierData(supplierData);
        setIsLoading(false);
    }, [data]); 

    return (
        <RitzModal open={modalOpen} title='Enter Costs' onClose={() => setModalOpen(false)} maxWidth={false}>
            {isLoading ? (
                <Box sx={{ border: theme => `1px solid ${theme.palette.divider}` }}><DefaultLoader/></Box>
            ) : (
                <>
                    {!selectedItems?.length && <Alert severity='info' icon={false}>No results found.</Alert>}
                    {selectedItems?.length > 0 && (
                        <>
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }} >
                                <Button variant="outlined" size="small" onClick={() => setIsCopyIconsShow((prev) => !prev)}>Copy </Button>
                             </Box>
                            {(isCopyIconsShow) && (
                                <Alert severity='info' icon={false} sx={{ mb: 2 }}>
                                    Select the Supplier Inquiries you want to copy and then click on the copy icon to copy the values to all selected Supplier Inquiries.
                                </Alert>
                            )}
                        </>
                    )}
                    {selectedItems?.length > 0 && Object.keys(supplierData)?.map((key: string, i: number) => (
                        supplierData[key]?.length > 0 && (
                            <React.Fragment key={i}>
                                <Typography variant='h4' sx={{ mb: 1 }}>{key}</Typography>
                                <Box>
                                    {supplierData[key].map((sd: any, i2: number) => (
                                        <Card variant='outlined' sx={{ mb: 4 }} key={i2}>
                                            <CardHeader
                                                sx={{ background: theme => theme.palette.grey[100] }}
                                                title={
                                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                        {Object.keys(sd?.description).map((key: any, i3: number) => (
                                                            i3 === 0 && <div key={i3}>{key}:  {sd?.description[key] || 'N/A'}</div>
                                                        ))}
                                                    </Box>
                                                }
                                                subheader={
                                                    <Grid container spacing={3} sx={{ alignItems: 'center' }}>
                                                        {Object.keys(sd?.description).map((key: any, i4: number) => (
                                                            i4 > 0 && <Grid item key={i4}>{key}:  {sd?.description[key]}</Grid>
                                                        ))}
                                                    </Grid>
                                                }
                                            />
                                            <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                                                <TransitionGroup>
                                                    {sd.data?.map((d: any, i3: number) => (
                                                        <Collapse key={`c-${i3}`}>
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
                                                                {isCopyIconsShow && (
                                                                    <Grid item xs={12}>
                                                                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                                            <Checkbox
                                                                                checked={selectedIndex[key]?.[
                                                                                    d?.is_service ? sd?.item_service_id : sd?.customer_brand_material_id
                                                                                ]?.includes(i3) ?? false}
                                                                                onChange={() => {
                                                                                    handleClickCheckBox(
                                                                                        key,
                                                                                        d?.is_service ? sd?.item_service_id : sd?.customer_brand_material_id,
                                                                                        i3
                                                                                    );
                                                                                }}
                                                                            />
                                                                            <Tooltip title="Copy to all">
                                                                                {!selectedIndex[key]?.[d?.is_service ? sd?.item_service_id : sd?.customer_brand_material_id]?.includes(i3) && (
                                                                                    <IconButton
                                                                                        sx={{ color: "primary.main" }}
                                                                                        onClick={() => handleCopyToAll(key, sd?.id, i3, i2)}
                                                                                    >
                                                                                        <ContentCopyIcon fontSize="inherit" />
                                                                                    </IconButton>
                                                                                )}
                                                                            </Tooltip>
                                                                        </Box>
                                                                    </Grid>
                                                                )}
                                                                <Grid item xs={12}>
                                                                    <Grid container columnSpacing={4} rowSpacing={2}>
                                                                        <Grid item lg={2} md={4}>
                                                                            <InputLabel>Select Supplier:</InputLabel>
                                                                            {/* <RitzSelection
                                                                                selectedValue={d.supplier_id}
                                                                                options={suppliers}
                                                                                optionValue='id'
                                                                                optionText='name' 
                                                                                handleOnChange={(e: any) => handleOnChange(key, i2, i3, 'supplier_id', e.target.value)}
                                                                            />   */}
                                                                            <RitzSearchableSelection
                                                                                options={suppliers}
                                                                                placeholder="Select..."
                                                                                selectedValue={d.supplier_id}
                                                                                handleOnChange={(selectedOrderID: any) => handleOnChange(key, i2, i3, 'supplier_id', selectedOrderID)}
                                                                                id={'id'}
                                                                                name={'id'}
                                                                                optionValue={'id'}
                                                                                optionText={'name'}
                                                                              
                                                                            />
                                                                            
                                                                        </Grid>
                                                                        <Grid item lg={2} md={4}>
                                                                            <InputLabel>Ex-Work Price</InputLabel>
                                                                            <TextField
                                                                                value={d.ex_work_price ?? '0.00'}
                                                                                inputProps={{ maxLength: 8 }}
                                                                                size='small'
                                                                                onChange={e => handleOnChange(key, i2, i3, 'ex_work_price', e.target.value)}
                                                                                disabled={d.delete}
                                                                            />
                                                                        </Grid>
                                                                        <Grid item lg={2} md={4}>
                                                                            <InputLabel>FOB Price</InputLabel>
                                                                            <TextField
                                                                                value={d.fob_price ?? 0}
                                                                                inputProps={{ maxLength: 8 }}
                                                                                size='small'
                                                                                onChange={e => handleOnChange(key, i2, i3, 'fob_price', e.target.value)}
                                                                                disabled={d.delete}
                                                                            />
                                                                        </Grid>
                                                                        <Grid item lg={2} md={4}>
                                                                            <InputLabel>CIF Price</InputLabel>
                                                                            <TextField
                                                                                value={d.cif_price ?? 0}
                                                                                inputProps={{ maxLength: 8 }}
                                                                                size='small'
                                                                                onChange={e => handleOnChange(key, i2, i3, 'cif_price', e.target.value)}
                                                                                disabled={d.delete}
                                                                            />
                                                                        </Grid>
                                                                        <Grid item lg={2} md={4}>
                                                                            <InputLabel>Transport Charges</InputLabel>
                                                                            <TextField
                                                                                value={d.transport_charges ?? 0}
                                                                                inputProps={{ maxLength: 8 }}
                                                                                size='small'
                                                                                onChange={e => handleOnChange(key, i2, i3, 'transport_charges', e.target.value)}
                                                                                disabled={d.delete}
                                                                            />
                                                                        </Grid>
                                                                        <Grid item lg={2} md={4}>
                                                                            <InputLabel>Ship Mode</InputLabel>
                                                                            <RitzSelection
                                                                                selectedValue={d.ship_mode ?? ''}
                                                                                options={transportTypes}
                                                                                optionValue='id'
                                                                                optionText='name'
                                                                                size='small'
                                                                                handleOnChange={(e: any) => handleOnChange(key, i2, i3, 'ship_mode', e.target.value)}
                                                                                isReadOnly={d.delete}
                                                                            />
                                                                        </Grid>
                                                                        <Grid item lg={2} md={4}>
                                                                            <InputLabel>Payment Mode</InputLabel>
                                                                            <RitzSelection
                                                                                selectedValue={d.pay_mode ?? ''}
                                                                                options={payModes}
                                                                                optionValue='id'
                                                                                optionText='name'
                                                                                size='small'
                                                                                handleOnChange={(e: any) => handleOnChange(key, i2, i3, 'pay_mode', e.target.value)}
                                                                                isReadOnly={d.delete}
                                                                            />
                                                                        </Grid>
                                                                       
                                                                        {d.cutting_width !== 'not_applicable' && key == FABRIC_MATERIAL_LABEL && (
                                                                            <Grid item lg={2} md={4}>
                                                                                <InputLabel>Cutting Width</InputLabel>
                                                                                <TextField
                                                                                    value={d.cutting_width ?? ''}
                                                                                    inputProps={{ maxLength: 8 }}
                                                                                    size='small'
                                                                                    onChange={e => handleOnChange(key, i2, i3, 'cutting_width', e.target.value)}
                                                                                    disabled={d.delete}
                                                                                />
                                                                            </Grid>
                                                                        )}
                                                                        {d.cutting_width_unit !== 'not_applicable' && key == FABRIC_MATERIAL_LABEL && (
                                                                            <Grid item lg={2} md={4}>
                                                                                <InputLabel>Cutting Width Unit </InputLabel>
                                                                                <RitzSelection
                                                                                    selectedValue={d.cutting_width_unit ?? ''}
                                                                                    options={consumptionData.all}
                                                                                    optionValue='value'
                                                                                    optionText='display_value'
                                                                                    size='small'
                                                                                    handleOnChange={(e: any) => handleOnChange(key, i2, i3, 'cutting_width_unit', e.target.value)}
                                                                                    isReadOnly={d.delete}
                                                                                />
                                                                            </Grid>
                                                                        )}
                                                                        <Grid item lg={2} md={4}>
                                                                            <InputLabel>Cost Per Unit</InputLabel>
                                                                            <TextField
                                                                                value={d.cost_per_unit ?? ''}
                                                                                inputProps={{ maxLength: 8 }}
                                                                                size='small'
                                                                                onChange={e => handleOnChange(key, i2, i3, 'cost_per_unit', e.target.value)}
                                                                                disabled={d.delete}
                                                                            />
                                                                        </Grid>
                                                                        <Grid item lg={2} md={4}>
                                                                            <InputLabel>Costing Unit</InputLabel>
                                                                            <RitzSelection
                                                                                selectedValue={d.costing_unit ?? ''}
                                                                                options={consumptionData.per_unit_options}
                                                                                optionValue='value'
                                                                                optionText='display_value'
                                                                                size='small'
                                                                                handleOnChange={(e: any) => handleOnChange(key, i2, i3, 'costing_unit', e.target.value)}
                                                                                isReadOnly={d.delete}
                                                                            />
                                                                        </Grid>
                                                                        <Grid item lg={2} md={4}>
                                                                            <InputLabel>Cost Per Unit Type</InputLabel>
                                                                            <RitzSelection
                                                                                selectedValue={d.cost_per_unit_type ?? ''}
                                                                                options={costPerUnitTypes}
                                                                                optionValue='id'
                                                                                optionText='name'
                                                                                size='small'
                                                                                handleOnChange={(e: any) => handleOnChange(key, i2, i3, 'cost_per_unit_type', e.target.value)}
                                                                                isReadOnly={d.delete}
                                                                            />
                                                                        </Grid>
                                                                        <Grid item lg={2} md={4}>
                                                                            <InputLabel>Expiration Date</InputLabel>
                                                                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                                                                <DatePicker
                                                                                    // disablePast
                                                                                    format='DD/MM/YYYY'
                                                                                    value={d.expiration_date ? dayjs(d.expiration_date) : null}
                                                                                    onChange={(e: any) => handleOnChange(key, i2, i3, 'expiration_date', e.$d)}
                                                                                    slotProps={{
                                                                                        textField: {
                                                                                            size: 'small'
                                                                                        }
                                                                                    }}
                                                                                    disabled={d.delete}
                                                                                />
                                                                            </LocalizationProvider>
                                                                        </Grid>
                                                                        <Grid item lg={2} md={4}>
                                                                            <InputLabel>Lead Time in Number of Days</InputLabel>
                                                                            <TextField
                                                                                value={d.lead_time ?? ''}
                                                                                inputProps={{ maxLength: 8 }}
                                                                                size='small'
                                                                                onChange={e => handleOnChange(key, i2, i3, 'lead_time', e.target.value)}
                                                                                disabled={d.delete}
                                                                            />
                                                                        </Grid>
                                                                        <Grid item lg={2} md={4}>
                                                                            <InputLabel>MOQ</InputLabel>
                                                                            <TextField
                                                                                value={d.minimum_order_quantity ?? ''}
                                                                                inputProps={{ maxLength: 8 }}
                                                                                size='small'
                                                                                onChange={e => handleOnChange(key,i2, i3, 'minimum_order_quantity', e.target.value)}
                                                                                disabled={d.delete}
                                                                            />
                                                                        </Grid>
                                                                        <Grid item lg={2} md={4}>
                                                                            <InputLabel>MOQ Unit</InputLabel>
                                                                            <RitzSelection
                                                                                selectedValue={d.minimum_order_quantity_units ?? ''}
                                                                                options={consumptionData.all}
                                                                                optionValue='value'
                                                                                optionText='display_value'
                                                                                size='small'
                                                                                handleOnChange={(e: any) => handleOnChange(key,i2, i3, 'minimum_order_quantity_units', e.target.value)}
                                                                                isReadOnly={d.delete}
                                                                            />
                                                                        </Grid>
                                                                        {!d.is_service && (
                                                                                <>
                                                                                    <Grid item lg={2} md={4}>
                                                                                        <InputLabel>Excess Threshold</InputLabel>
                                                                                        <TextField
                                                                                            value={d.excess_threshold ?? ''}
                                                                                            inputProps={{ maxLength: 8 }}
                                                                                            size='small'
                                                                                            onChange={e => handleOnChange(key, i2, i3, 'excess_threshold', e.target.value)}
                                                                                            disabled={d.delete}
                                                                                        />
                                                                                    </Grid>
                                                                                    <Grid item lg={2} md={4}>
                                                                                        <InputLabel>Supplier Reference Code</InputLabel>
                                                                                        <TextField
                                                                                            value={d.supplier_material_reference_code ?? ''}
                                                                                            size='small'
                                                                                            onChange={e => handleOnChange(key, i2, i3, 'supplier_material_reference_code', e.target.value)}
                                                                                            disabled={d.delete}
                                                                                        />
                                                                                    </Grid>
                                                                                </>
                                                                            )}                     
                                                                            <Grid item lg={2} md={4}>
                                                                                <InputLabel>Reviewed</InputLabel>
                                                                                <Checkbox
                                                                                    size='small'
                                                                                    checked={d.completed}
                                                                                    onChange={e => handleOnChange(key, i2, i3, 'completed', e.target.checked)}
                                                                                    disabled={d.delete}
                                                                                />
                                                                        </Grid>
                                                                        <Grid item xs sx={{ display: 'flex', alignItems: 'end', justifyContent: 'right', fontSize: 'small' }}>
                                                                            {!d.delete && (
                                                                                <Link color='error' sx={{ cursor: 'pointer' }} onClick={() => toggleDelete(key, i2, i3)}>Delete</Link>
                                                                            )}
                                                                            {d.delete && (
                                                                                <>
                                                                                    <Link color='error' sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => deleteRow(key, i2, i3)}>
                                                                                        {d.isSaving && <SaveSpinner/>}Confirm Delete
                                                                                    </Link> 
                                                                                    <Box sx={{ mx: 0.5 }}>/</Box>
                                                                                    <Link color='secondary' sx={{ cursor: 'pointer' }} onClick={() => toggleDelete(key, i2, i3)}>Cancel</Link>
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
                                                <Button variant='outlined' size='small' onClick={() => addRow(key, i2)} sx={{ mr: 1 }}>Add Row</Button>
                                            </CardActions>
                                        </Card>
                                    ))}
                                </Box>
                            </React.Fragment>
                    )))}

                    {Object.keys(errors)?.length > 0 && (
                        <Alert severity='error' icon={false} sx={{ mt: 2 }}>
                            <ul style={{ paddingLeft: '1rem', margin: 0 }}>
                                {Object.keys(errors).map((field: string, i: number) => (
                                    <li key={i}>{field} - {errors[field]}</li>
                                ))}
                            </ul>
                        </Alert>
                    )}
                </>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                <Button variant='contained' onClick={onSubmit} disabled={isSaving || isLoading || !selectedItems.length}>
                    {isSaving && <SaveSpinner />}Submit
                </Button>
            </Box>
        </RitzModal>
    );
};

export default CostsModal;