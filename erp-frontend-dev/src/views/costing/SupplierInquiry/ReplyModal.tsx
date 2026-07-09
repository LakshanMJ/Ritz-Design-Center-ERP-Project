import React, { useEffect, useState } from "react";
import api from "@/services/api";
import { toast } from 'react-hot-toast';
import { CapitalizeFirstLetterEachWord, getDefaultError } from '@/helpers/Utilities';
import RitzModal from "@/components/Ritz/RitzModal";
import { Alert, Box, Button, Card, CardActions, CardContent, CardHeader, Checkbox, Grid, InputLabel, Popover, TextField, alpha, Collapse, Link, IconButton, Tooltip } from "@mui/material";
import SaveSpinner from "@/components/SaveSpinner";
import { DEFAULT_SUCCESS, VALIDATION_ERROR_CODE } from "@/helpers/constants/Constants";
import RitzSelection from "@/components/Ritz/RitzSelection";
import DefaultLoader from "@/components/DefaultLoader";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import InfoIcon from '@mui/icons-material/Info';
import { TransitionGroup } from 'react-transition-group';
import * as supplierApis from "@/helpers/constants/rest_urls/SupplierUrls";
import {FABRIC_MATERIAL, FABRIC_MATERIAL_LABEL} from "@/helpers/costings/materials/MaterialFieldHelper";
import RitzSearchableSelection from "@/components/Ritz/RitzSearchableSelection";
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

const ReplyModal = ({ orderId, versionId, modalOpen, setModalOpen, suppliers, consumptionData, costPerUnitTypes, transportTypes, payModes, savedData, selectedSupplierId, selectedSupplierInquiryDetailId, selectedSupplierInquiryId }: any) => {
    const [isSaving, setIsSaving] = useState(false);
    const [supplierData, setSupplierData] = useState([]);
    const [selectedSupplier, setSelectedSupplier] = useState(selectedSupplierId);
    const [isTableLoading, setIsTableLoading] = useState(false);
    const [errors, setErrors] = useState<any>({});
    const [deleteError, setDeleteError] = useState<any>({ id: '', error: '' });
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [popoverContent, setPopoverContent] = useState<any>({});
    const [selectedIndex, setSelectedIndex] = useState<any>({});
    const [isCopyIconsShow, setIsCopyIconsShow] = useState(false);

    const popoverOpen = Boolean(anchorEl);
    const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>, data: any) => {
        const details = Object.keys(data?.material_details)?.length > 0 ? data?.material_details : data?.service_details;
        Object.keys(details).forEach(key => {
            if (['material_type', 'material_label', 'material_definition_attributes'].includes(key) || typeof details[key] === 'object') {
                delete details[key];
            }
        });
        setPopoverContent(details);
        setAnchorEl(event.currentTarget);
    };
    const handlePopoverClose = () => {
        setAnchorEl(null);
    };

    const handleOnChange = (index: number, index2: number, field: string, value: any) => {
        const updated = [...supplierData];
        updated[index]['supplier_inquiry_details'][index2][field] = value;
            const exWorkPrice = parseFloat(updated[index]['supplier_inquiry_details'][index2]['ex_work_price']) || 0;
            const fobPrice = parseFloat(updated[index]['supplier_inquiry_details'][index2]['fob_price']) || 0;
            const cifPrice = parseFloat(updated[index]['supplier_inquiry_details'][index2]['cif_price']) || 0;
            const transportCharges = parseFloat(updated[index]['supplier_inquiry_details'][index2]['transport_charges']) || 0;
            let totalCostPerUnit = 0;

            if (cifPrice > 0) {
                totalCostPerUnit = cifPrice + transportCharges
            } else if (fobPrice > 0) {
                totalCostPerUnit = fobPrice + transportCharges
            } else if (exWorkPrice > 0) {
                totalCostPerUnit = exWorkPrice + transportCharges
            }
           
            if(field == 'cif_price' || field == 'fob_price' || field == 'ex_work_price' || field == 'transport_charges'){
                updated[index]['supplier_inquiry_details'][index2]['cost_per_unit'] = totalCostPerUnit === 0 ? "" : totalCostPerUnit.toString();
            }
        setSupplierData(updated);
    }

    const onSupplierChange = (supplierId: any) => {
        setSelectedSupplier(supplierId);
        setErrors({});
        setDeleteError({});
        if (supplierId) {
            setIsTableLoading(true);
            api.get(supplierApis.getInquiriesBySupplierIdURL(+versionId, +supplierId)).then(resp => {
                const respData = resp?.data || [];
                setSupplierData(respData);
            }).catch(error => {
                toast.error(getDefaultError(error?.response?.status));
            }).finally(() => {
                setIsTableLoading(false);
            })
        } 
    }
    
    const loadSupplierInquiryData = (supplierId: any) => {
        setIsTableLoading(true);
        api.get(supplierApis.getInquiriesBySupplierIdURL(+versionId, +supplierId)).then(resp => {
            const respData = resp?.data || [];
            if (selectedSupplierInquiryDetailId && selectedSupplierInquiryId) {
                const selectedInquiry = respData.find((supplierData: any) => supplierData.id === selectedSupplierInquiryId);
                const filteredData = selectedInquiry?.supplier_inquiry_details?.filter((supplierInquiryDetail: any) => supplierInquiryDetail.id === selectedSupplierInquiryDetailId);
                if (filteredData) {
                    setSupplierData([{ ...selectedInquiry, supplier_inquiry_details: filteredData }]);
                } else {
                    setSupplierData([]);
                }
            } else {
                setSupplierData([...respData]);
            }
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsTableLoading(false);
        })
    }

    useEffect(() => {
        if (selectedSupplierId) {
            loadSupplierInquiryData(selectedSupplierId);
        }
    }, [selectedSupplierId]);

    const addRow = (data: any) => {
        const newRow: any = {
            cif_price: '',
            cost_per_unit: '',
            costing_unit: '',
            expiration_date: '',
            fob_price: '',
            freight_charge: '',
            completed: false,
            lead_time: ''
        }
        if (data?.material_details?.material_type === 'fabric') {
            newRow.cutting_width = '';
            newRow.cutting_width_unit = '';
        }
        const updated = [...supplierData];
        updated.find((i: any) => i.id === data.id)?.supplier_inquiry_details.push(newRow);
        setSupplierData(updated);
    }

    const deleteRow = (index: number, index2: number) => {
        setDeleteError({});
        const updated = [...supplierData];
        const rowId = updated[index]['supplier_inquiry_details'][index2]?.['id']?.toString();

        if (rowId) {
            updated[index]['supplier_inquiry_details'][index2]['isSaving'] = true;
            api.delete(supplierApis.deleteSupplierInquiryDetailUrl(+versionId, +rowId)).then(() => {
                // toast.success(DEFAULT_SUCCESS);
                updated[index]['supplier_inquiry_details'].splice(index2, 1);
                setSupplierData(updated);
            }).catch(error => {
                updated[index]['supplier_inquiry_details'][index2]['isSaving'] = false;
                // toast.error(getDefaultError(error?.response?.status));
                if (error?.response?.status === VALIDATION_ERROR_CODE && error?.response?.data?.error) {
                    setDeleteError({ id: rowId, error: error.response.data.error });
                }
            });
        } else {
            // Not saved, can just remove
            updated[index]['supplier_inquiry_details'].splice(index2, 1);
            setSupplierData(updated);
        }
    }

    const toggleDelete = (index: number, index2: number) => {
        const updated = [...supplierData];
        const rowId = updated[index]['supplier_inquiry_details'][index2]?.['id']?.toString();
        if (deleteError?.id && deleteError.id?.toString() === rowId) {
            setDeleteError({});
        }
        updated[index]['supplier_inquiry_details'][index2]['delete'] = !updated[index]['supplier_inquiry_details'][index2]['delete'];
        setSupplierData(updated);
    }

    const getPayload: any = () => {
        const payload: any[] = [];
        supplierData.forEach((sd: any) => {
            const inqDetails = sd.supplier_inquiry_details;
            inqDetails.forEach((d: any) => d.id = d.id || null);

            payload.push({
                id: sd.id,
                supplier_inquiry_details: inqDetails,
                item_service_id: sd?.item_service || null
            });
        });

        return payload;
    }

    const onSubmit = () => {
        setIsSaving(true);
        setErrors({});
        setDeleteError({});
        const payload = getPayload();
        api.put(supplierApis.updateSupplierInquiryDataURL(+orderId), payload).then(() => {
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
    const handleClickCheckBox = (supplierInquiryId: number, supplierInquiryDetailSubIndex: number) => {
        setSelectedIndex((prevSelectedIndex: any) => {
            const currentIndices = prevSelectedIndex[supplierInquiryId] || [];
            if (currentIndices.includes(supplierInquiryDetailSubIndex)) {
                return {
                    ...prevSelectedIndex,
                    [supplierInquiryId]: currentIndices.filter((index: any) => index !== supplierInquiryDetailSubIndex)
                };
            } else {
                return {
                    ...prevSelectedIndex,
                    [supplierInquiryId]: [...currentIndices, supplierInquiryDetailSubIndex]
                };
            }
        });
    };
    const handleCopyToAll = (supplierInquiryId: number, supplierInquiryDetailSubIndex: number, mainIndex: number) => {
        const updated = [...supplierData];
        const selectedDetail = updated[mainIndex]?.supplier_inquiry_details[supplierInquiryDetailSubIndex];
        if (selectedDetail) {
            updated.forEach(sd => {
                sd?.supplier_inquiry_details?.forEach((detail: any, index: number) => {
                    if (selectedIndex[sd?.id]?.includes(index)) {
                        detail.ex_work_price = selectedDetail?.ex_work_price;
                        detail.fob_price = selectedDetail?.fob_price;
                        detail.cif_price = selectedDetail?.cif_price;
                        detail.transport_charges = selectedDetail?.transport_charges;
                        detail.ship_mode = selectedDetail?.ship_mode;
                        detail.cutting_width = selectedDetail?.cutting_width;
                        detail.cutting_width_unit = selectedDetail?.cutting_width_unit;
                        detail.cost_per_unit = selectedDetail?.cost_per_unit;
                        detail.costing_unit = selectedDetail?.costing_unit;
                        detail.cost_per_unit_type = selectedDetail?.cost_per_unit_type;
                        detail.expiration_date = selectedDetail?.expiration_date;
                        detail.lead_time = selectedDetail?.lead_time;
                        detail.minimum_order_quantity = selectedDetail?.minimum_order_quantity;
                        detail.minimum_order_quantity_units = selectedDetail?.minimum_order_quantity_units;
                        detail.excess_threshold = selectedDetail?.excess_threshold;
                        detail.supplier_material_reference_code = selectedDetail?.supplier_material_reference_code;
                    }
                });
            });
        }
        setSupplierData(updated);
    };
    return (
        <RitzModal open={modalOpen} title='Supplier Replies' onClose={() => setModalOpen(false)} maxWidth={false}>
            <Grid container sx={{ mb: 3 }}>
                <Grid item xs={6}>
                    <InputLabel sx={{ mb: 1 }}>Select Supplier:</InputLabel>
                    <RitzSearchableSelection
                        options={suppliers}
                        placeholder="Select..."
                        selectedValue={selectedSupplier}
                        handleOnChange={(selectedOrderID: any) => onSupplierChange(selectedOrderID)}
                        id={'id'}
                        name={'id'}
                        optionValue={'id'}
                        optionText={'name'}

                    />
                </Grid>
            </Grid>

            {isTableLoading ? (
                <Box sx={{ border: theme => `1px solid ${theme.palette.divider}` }}><DefaultLoader/></Box>
            ) : (
                <>
                    {supplierData?.length > 0 && (
                        <>
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }} >
                                <Button variant="outlined" size="small" onClick={() => setIsCopyIconsShow((prev) => !prev)}>Copy </Button>
                            </Box>
                            {(isCopyIconsShow) && (
                                <Alert severity='info' icon={false} sx={{ mb: 2 }}>
                                    Select the Supplier Inquiries you want to copy and then click on the copy icon to copy the values to all selected Supplier Inquiries.
                                </Alert>
                            )}
                        </>
                    )}
                    {!supplierData?.length && <Alert severity='info' icon={false}>No results found.</Alert>}

                    {supplierData?.length > 0 && supplierData.map((sd: any, i: number) => (
                        <Card variant='outlined' sx={{ mb: 4 }} key={i}>
                            <CardHeader
                                sx={{ background: theme => theme.palette.grey[100] }}
                                title={
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                        {sd?.material_name || sd?.service_name}
                                        <InfoIcon
                                            fontSize='small'
                                            sx={{ ml: 0.5 }} 
                                            onMouseEnter={(e: any) => handlePopoverOpen(e, sd)}
                                            onMouseLeave={handlePopoverClose}
                                        />
                                    </Box>
                                }
                            />
                            <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                                <TransitionGroup>
                                    {sd?.supplier_inquiry_details?.map((d: any, i2: number) => (
                                        <Collapse key={i2}>
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
                                                                checked={selectedIndex[sd?.id]?.includes(i2) ?? false}
                                                                onChange={() => { handleClickCheckBox(sd?.id, i2) }}
                                                            />
                                                            <Tooltip title="Copy to all">
                                                                {!selectedIndex[sd?.id]?.includes(i2) && (
                                                                    <IconButton
                                                                        sx={{ color: "primary.main" }}
                                                                        onClick={() => { handleCopyToAll(sd?.id, i2, i) }}
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
                                                            <InputLabel>Ex-Work Price</InputLabel>
                                                            <TextField
                                                                value={d.ex_work_price ?? ''}
                                                                inputProps={{ maxLength: 8 }}
                                                                size='small'
                                                                onChange={e => handleOnChange(i, i2, 'ex_work_price', e.target.value)}
                                                                disabled={d.delete}
                                                            />
                                                        </Grid>
                                                        <Grid item lg={2} md={4}>
                                                            <InputLabel>FOB Price</InputLabel>
                                                            <TextField
                                                                value={d.fob_price ?? ''}
                                                                inputProps={{ maxLength: 8 }}
                                                                size='small'
                                                                onChange={e => handleOnChange(i, i2, 'fob_price', e.target.value)}
                                                                disabled={d.delete}
                                                            />
                                                        </Grid>
                                                        {/* <Grid item lg={2} md={4}>
                                                            <InputLabel>Freight Charges</InputLabel>
                                                            <TextField
                                                                value={d.freight_charge ?? ''}
                                                                inputProps={{ maxLength: 8 }}
                                                                size='small'
                                                                onChange={e => handleOnChange(i, i2, 'freight_charge', e.target.value)}
                                                                disabled={d.delete}
                                                            />
                                                        </Grid> */}
                                                        <Grid item lg={2} md={4}>
                                                            <InputLabel>CIF Price</InputLabel>
                                                            <TextField
                                                                value={d.cif_price ?? ''}
                                                                inputProps={{ maxLength: 8 }}
                                                                size='small'
                                                                onChange={e => handleOnChange(i, i2, 'cif_price', e.target.value)}
                                                                disabled={d.delete}
                                                            />
                                                        </Grid>
                                                        <Grid item lg={2} md={4}>
                                                            <InputLabel>Transport Charges</InputLabel>
                                                            <TextField
                                                                value={d.transport_charges ?? ''}
                                                                inputProps={{ maxLength: 8 }}
                                                                size='small'
                                                                onChange={e => handleOnChange(i, i2, 'transport_charges', e.target.value)}
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
                                                                    handleOnChange={(e: any) => handleOnChange(i, i2, 'ship_mode', e.target.value)}
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
                                                                handleOnChange={(e: any) => handleOnChange(i, i2, 'pay_mode', e.target.value)}
                                                                isReadOnly={d.delete}
                                                            />
                                                        </Grid>
                                                        {d.cutting_width !== 'not_applicable' && sd.material_name == FABRIC_MATERIAL_LABEL && (
                                                            <Grid item lg={2} md={4}>
                                                                <InputLabel>Cutting Width</InputLabel>
                                                                <TextField
                                                                    value={d.cutting_width ?? ''}
                                                                    inputProps={{ maxLength: 8 }}
                                                                    size='small'
                                                                    onChange={e => handleOnChange(i, i2, 'cutting_width', e.target.value)}
                                                                    disabled={d.delete}
                                                                />
                                                            </Grid>
                                                        )}
                                                        {d.cutting_width_unit !== 'not_applicable' && sd.material_name == FABRIC_MATERIAL_LABEL && (
                                                            <Grid item lg={2} md={4}>
                                                                <InputLabel>Cutting Width Unit </InputLabel>
                                                                <RitzSelection
                                                                    selectedValue={d.cutting_width_unit ?? ''}
                                                                    options={consumptionData.all}
                                                                    optionValue='value'
                                                                    optionText='display_value'
                                                                    size='small'
                                                                    handleOnChange={(e: any) => handleOnChange(i, i2, 'cutting_width_unit', e.target.value)}
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
                                                                onChange={e => handleOnChange(i, i2, 'cost_per_unit', e.target.value)}
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
                                                                handleOnChange={(e: any) => handleOnChange(i, i2, 'costing_unit', e.target.value)}
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
                                                                    handleOnChange={(e: any) => handleOnChange(i, i2, 'cost_per_unit_type', e.target.value)}
                                                                    isReadOnly={d.delete}
                                                                />
                                                        </Grid>
                                                        <Grid item lg={2} md={4}>
                                                            <InputLabel>Price Validity Date</InputLabel>
                                                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                                                <DatePicker
                                                                    // disablePast
                                                                    format='DD/MM/YYYY'
                                                                    value={d.expiration_date ? dayjs(d.expiration_date) : null}
                                                                    onChange={(e: any) => handleOnChange(i, i2, 'expiration_date', e.$d)}
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
                                                                onChange={e => handleOnChange(i, i2, 'lead_time', e.target.value)}
                                                                disabled={d.delete}
                                                            />
                                                        </Grid>
                                                        <Grid item lg={2} md={4}>
                                                            <InputLabel>MOQ</InputLabel>
                                                            <TextField
                                                                value={d.minimum_order_quantity ?? ''}
                                                                inputProps={{ maxLength: 8 }}
                                                                size='small'
                                                                onChange={e => handleOnChange(i, i2, 'minimum_order_quantity', e.target.value)}
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
                                                                handleOnChange={(e: any) => handleOnChange(i, i2, 'minimum_order_quantity_units', e.target.value)}
                                                                isReadOnly={d.delete}
                                                            />
                                                        </Grid>
                                                        {(!sd.service_details || Object.keys(sd.service_details).length === 0) && (
                                                            <>
                                                                <Grid item lg={2} md={4}>
                                                                    <InputLabel>Excess Threshold</InputLabel>
                                                                    <TextField
                                                                        value={d.excess_threshold ?? ''}
                                                                        inputProps={{ maxLength: 8 }}
                                                                        size='small'
                                                                        onChange={e => handleOnChange(i, i2, 'excess_threshold', e.target.value)}
                                                                        disabled={d.delete}
                                                                    />
                                                                </Grid>
                                                                <Grid item lg={2} md={4}>
                                                                    <InputLabel>Supplier Reference Code</InputLabel>
                                                                    <TextField
                                                                        value={d.supplier_material_reference_code ?? ''}
                                                                        size='small'
                                                                        onChange={e => handleOnChange(i, i2, 'supplier_material_reference_code', e.target.value)}
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
                                                                onChange={e => handleOnChange(i, i2, 'completed', e.target.checked)}
                                                                disabled={d.delete}
                                                            />
                                                        </Grid>
                                                        <Grid item xs sx={{ display: 'flex', alignItems: 'end', justifyContent: 'right', fontSize: 'small' }}>
                                                            {!d.delete && (
                                                                <Link color='error' sx={{ cursor: 'pointer' }} onClick={() => toggleDelete(i, i2)}>Delete</Link>
                                                            )}
                                                            {d.delete && (
                                                                <>
                                                                    <Link color='error' sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => deleteRow(i, i2)}>
                                                                        {d.isSaving && <SaveSpinner/>}Confirm Delete
                                                                    </Link> 
                                                                    <Box sx={{ mx: 0.5 }}>/</Box>
                                                                    <Link color='secondary' sx={{ cursor: 'pointer' }} onClick={() => toggleDelete(i, i2)}>Cancel</Link>
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
                            {!(selectedSupplierInquiryDetailId && selectedSupplierInquiryId) && (
                                <CardActions sx={{ justifyContent: 'right', background: theme => theme.palette.grey[50] }}>
                                    <Button variant='outlined' size='small' onClick={() => addRow(sd)} sx={{ mr: 1 }}>Add Row</Button>
                                </CardActions>
                            )}
                        </Card>
                    ))}

                    {Object.keys(errors)?.length > 0 && (
                        <Alert severity='error' icon={false} sx={{ mt: 2 }}>
                            <ul style={{ paddingLeft: '1rem', margin: 0 }}>
                                {Object.keys(errors).map((field: string, i: number) => (
                                    <li key={i}>{field} - {errors[field]}</li>
                                ))}
                            </ul>
                        </Alert>
                    )}

                    <Popover
                        id="mouse-over-popover"
                        sx={{
                            pointerEvents: 'none',
                        }}
                        open={popoverOpen}
                        anchorEl={anchorEl}
                        anchorOrigin={{
                            vertical: 'center',
                            horizontal: 'center',
                        }}
                        transformOrigin={{
                            vertical: 'top',
                            horizontal: 'left',
                        }}
                        onClose={handlePopoverClose}
                        disableRestoreFocus
                    >
                        <Grid container sx={{ p: 1.5, width: '400px' }} columnSpacing={1}>
                            {Object.keys(popoverContent).map((key: any, i: number) => (
                                <React.Fragment key={i}>
                                    <Grid item xs={6}>{CapitalizeFirstLetterEachWord(key)}</Grid>
                                    <Grid item xs={6}>{popoverContent[key] ?? '--'}</Grid>
                                </React.Fragment>
                            ))}
                        </Grid>
                    </Popover>
                </>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                <Button variant='contained' onClick={onSubmit} disabled={isSaving || isTableLoading || !selectedSupplier || !supplierData.length}>
                    {isSaving && <SaveSpinner />}Submit
                </Button>
            </Box>
        </RitzModal>
    );
};

export default ReplyModal;