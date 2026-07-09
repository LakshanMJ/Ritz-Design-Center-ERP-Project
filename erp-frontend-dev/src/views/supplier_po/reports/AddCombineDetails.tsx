import React, { useEffect, useState } from "react"
import Button from "@mui/material/Button";
import { Alert, Box, IconButton, List, ListItem, ListItemIcon, ListItemText, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography, useTheme } from '@mui/material';
import api from "@/services/api";
import DefaultLoader from "@/components/DefaultLoader";
import { toast } from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';
import { futureDeliveryDatesURL, saveSupplierPoAttachmentDetailsURL, colorToneCombineDetailsURL, colorToneCombineDetailsSaveURL, defectedBatchesCombineDetailsURL, defectdBatchesCombineDetailsSaveURL, excessBatchesCombineDetailsURL, shortBatchesCombineDetailsURL, excessCombineDetailsSaveURL, mismatchCombineDetailsURL, shortCombineDetailsSaveURL, mismatchCombineDetailsSaveURL, widthCombineDetailsURL, widthCombineDetailsSaveURL } from "@/helpers/constants/rest_urls/SupplierPoUrls";
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import SaveSpinner from "@/components/SaveSpinner";
import { DEFAULT_SUCCESS } from "@/helpers/constants/Constants";
import { consumptionUnitsUrl } from "@/helpers/constants/rest_urls/POUrls";
import RitzSelection from "@/components/Ritz/RitzSelection";
import DeleteIcon from '@mui/icons-material/Delete';
import CreatableSelect from "react-select/creatable";
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import FormErrorMessage from "@/components/FormErrorMessage";
import Checkbox from '@mui/material/Checkbox';
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";

const AddCombineDetails = ({ materialId, deliveryId, grnMaterialId, invoiceId, savedStatus, type, remediationType, invoice, materialType }: any) => {
    const theme = useTheme()

    const replacementDeliveryDateDetailsKey = 'replacement_delivery_date_details'
    const grnMaterialQuantityDetailsKey = 'grn_material_quantity_details'
    const totalDebitNoteQuantityKey ='total_debit_note_quantity'
    const totalReplacementQuantityKey ='total_replacement_quantity'
    const totalCpiQuantityKey ='total_cpi_quantity'
    const excessRemediationKey = 'excess_remediation'
    const colorToneRemediationKey ='color_tone_remediation'
    const defectedBatchesRemediationKey ='defected_batches_remediation'
    const shortRemediationKey = 'short_remediation'
    const mismatchRemediationKey = 'mismatch_remediation'
    const widthRemediationKey = 'width_remediation'

    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [measuringUnits, setMeasuringUnits] = useState<any>([]);
    const [deliveryTypes, setDeliveryTypes] = useState<any>([{ name: "Exiting Delivery", value: "exiting_delivery" }, { name: "New  Delivery", value: "new_delivery" }]);
    const [futureDeliveryDates, setFutureDeliveryDates] = useState<any>([]);
    const [combineDetails, setCombineDetails] = useState<any>({});
    const [errors, setErrors] = useState<any>({});
    const [frontEndErrorValidation, setFrontEndErrorValidation] = useState<any>({ replacement: [] });
    const [deletedReplacementIds, setDeletedReplacementIds] = useState<any>([]);
    const [remediateType, setRemediateType] = useState({
        is_debit_note: false,
        is_replacement: false,
        is_cpi: false
    });
    const fetchData = () => {
        setIsLoading(true);
        const requests = [
            api.get(futureDeliveryDatesURL(invoiceId, grnMaterialId)),
            api.get(consumptionUnitsUrl()),

        ];
        if (remediationType == colorToneRemediationKey) {
            requests.push(api.get(colorToneCombineDetailsURL(deliveryId, invoice, grnMaterialId)))
        }
        if (remediationType == defectedBatchesRemediationKey) {
            requests.push(api.get(defectedBatchesCombineDetailsURL(deliveryId, invoice, grnMaterialId)))
        }
        if (remediationType == excessRemediationKey) {
            requests.push(api.get(excessBatchesCombineDetailsURL(deliveryId, invoice, grnMaterialId)))
        }
        if (remediationType == shortRemediationKey) {
            requests.push(api.get(shortBatchesCombineDetailsURL(deliveryId, invoice, grnMaterialId)))
        }
        if (remediationType == mismatchRemediationKey) {
            requests.push(api.get(mismatchCombineDetailsURL(deliveryId, invoice, grnMaterialId)))
        }
        if (remediationType == widthRemediationKey) {
            requests.push(api.get(widthCombineDetailsURL(deliveryId, invoice, grnMaterialId)))
        }
        
        Promise.all(requests).then(resp => {
            const respData = resp.map((r: any) => r.data);
            const [futureDeliveryDates, units, combineData] = respData;
            setCombineDetails(combineData)
            setFutureDeliveryDates([...futureDeliveryDates]);
            setRemediateType(combineData.raise_types);
            setMeasuringUnits([...units.all]);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false)
        });
    };
    const handleSave = () => {
        setIsSaving(true);
        let selectedUrl;
        if (remediationType === colorToneRemediationKey) {
            selectedUrl = colorToneCombineDetailsSaveURL(invoiceId, grnMaterialId);
        } else if (remediationType === defectedBatchesRemediationKey) {
            selectedUrl = defectdBatchesCombineDetailsSaveURL(invoiceId, grnMaterialId);
        }
        else if (remediationType === excessRemediationKey) {
            selectedUrl = excessCombineDetailsSaveURL(invoiceId, grnMaterialId);
        }
        else if (remediationType === shortRemediationKey) {
            selectedUrl = shortCombineDetailsSaveURL(invoiceId, grnMaterialId);
        }
        else if (remediationType === mismatchRemediationKey) {
            selectedUrl = mismatchCombineDetailsSaveURL(invoiceId, grnMaterialId);
        }
        else if (remediationType === widthRemediationKey) {
            selectedUrl = widthCombineDetailsSaveURL(invoiceId, grnMaterialId);
        }
        const request = {
            method: 'post',
            url: selectedUrl,
            data: {
                supplier_po_grn_material_id: combineDetails[grnMaterialQuantityDetailsKey]?.grn_material_id || null,
                total_quantity: combineDetails[grnMaterialQuantityDetailsKey]?.total_quantity?.quantity || 0,
                total_replacement_quantity: combineDetails[grnMaterialQuantityDetailsKey]?.total_replacement_quantity?.quantity || 0,
                total_replacement_quantity_units: combineDetails[grnMaterialQuantityDetailsKey]?.total_replacement_quantity?.quantity_units || null,
                [totalDebitNoteQuantityKey]: combineDetails[grnMaterialQuantityDetailsKey]?.[totalDebitNoteQuantityKey]?.quantity || 0,
                total_debit_note_quantity_units: combineDetails[grnMaterialQuantityDetailsKey]?.total_debit_note_quantity?.quantity_units || null,
                total_cpi_quantity: combineDetails[grnMaterialQuantityDetailsKey]?.total_cpi_quantity?.quantity || 0,
                total_cpi_quantity_units: combineDetails[grnMaterialQuantityDetailsKey]?.total_cpi_quantity?.quantity_units || null,
                replacement_date_data: combineDetails[replacementDeliveryDateDetailsKey] || [],
                replacement_delivery_deleted_ids: deletedReplacementIds || [],
                raise_types : remediateType || {}
            }
        }
        api(request).then(() => {
            toast.success(DEFAULT_SUCCESS);
            savedStatus(true)
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
            console.log(error.response?.data)
            setErrors(error.response?.data)
        }).finally(() => {
            setIsSaving(false);
        });
    };

    const handleAddNewDelivery = () => {
        setCombineDetails((prevState: { [replacementDeliveryDateDetailsKey]: any; }) => ({
            ...prevState,
            [replacementDeliveryDateDetailsKey]: [
                ...prevState[replacementDeliveryDateDetailsKey],
                {
                    replacement_quantity: '',
                    replacement_quantity_units: '',
                    delivery_date_id: null,
                    confirmed_delivery_date: ''
                }
            ]
        }));
    };

    const handleDelete = (deliveryIndex: number, replacementId: any) => {
        setCombineDetails((prevState: any) => {
            const updatedDetails = [...prevState[replacementDeliveryDateDetailsKey]];
            updatedDetails.splice(deliveryIndex, 1);
            return {
                ...prevState,
                [replacementDeliveryDateDetailsKey]: updatedDetails
            };
        });
        if (replacementId) {
            setDeletedReplacementIds((prevIds: any) => [...prevIds, replacementId]);
        }
    };
    const handleChangeQuantityValidation = (event: any) => {
        const { name, value } = event.target;
        const enteredValue = parseFloat(value);
        const totalReplacementQuantity = combineDetails[grnMaterialQuantityDetailsKey].total_quantity?.quantity || 0;
        const otherQuantities = [totalDebitNoteQuantityKey, totalReplacementQuantityKey, totalCpiQuantityKey].filter(key => key !== name).map(key => combineDetails[grnMaterialQuantityDetailsKey][key]?.quantity || 0);
        const totalEnteredQuantity = enteredValue + otherQuantities.reduce((sum, qty) => sum + qty, 0);

        if (totalEnteredQuantity > totalReplacementQuantity) {
            setFrontEndErrorValidation((prevState: any) => ({
                ...prevState,
                [name]: 'Cannot enter value greater than total quantity'
            }));
        }else {
            setFrontEndErrorValidation((prevState: any) => ({
                ...prevState,
                [name]: ''
            }));
            setCombineDetails((prevState: any) => {
                const materialQuantityDetails = prevState[grnMaterialQuantityDetailsKey];
                return {
                    ...prevState,
                    [grnMaterialQuantityDetailsKey]: {
                        ...materialQuantityDetails,
                        [name]: {
                            ...materialQuantityDetails[name],
                            quantity: enteredValue
                        }
                    }
                };
            });
        }
    };
    const handleChangeQuantityUnit = (event: any) => {
        const { name, value } = event.target;
        setCombineDetails((prevState: any) => {
            const materialQuantityDetails = prevState[grnMaterialQuantityDetailsKey];
            return {
                ...prevState,
                [grnMaterialQuantityDetailsKey]: {
                    ...materialQuantityDetails,
                    [name]: {
                        ...materialQuantityDetails[name],
                        quantity_units: value
                    }
                }
            };

        });
    };

    const handleOnChangeDeliveryDate = (date: any, index: any) => {
        setCombineDetails((prevDetails: any) => {
            const updatedDetails = { ...prevDetails };
            updatedDetails.replacement_delivery_date_details[index].confirmed_delivery_date = date ? date.format('YYYY-MM-DD') : null;
            updatedDetails.replacement_delivery_date_details[index].delivery_date_id = null;
            return updatedDetails;
        });
    };

    const handleChangeReplacementDateQtyValidation = (event: any, deliveryIndex: number) => {
        const { name, value } = event.target;
        const enteredValue = parseFloat(value);
        const totalReplacementQuantity = combineDetails[grnMaterialQuantityDetailsKey].total_replacement_quantity?.quantity || 0;
        const updatedDetails = [...combineDetails[replacementDeliveryDateDetailsKey]];
        const totalEnteredQuantity = updatedDetails.reduce((sum, item, index) => {
            return index === deliveryIndex ? sum : sum + (item.replacement_quantity || 0);
        }, enteredValue);
    
        if (totalEnteredQuantity > totalReplacementQuantity) {
            setFrontEndErrorValidation((prevState: any) => {
                const newErrors = [...prevState.replacement];
                newErrors[deliveryIndex] = 'Cannot enter value greater than total replacement quantity';
                return {
                    ...prevState,
                    replacement: newErrors
                };
            });
        } else {
            setFrontEndErrorValidation((prevState: any) => {
                const newErrors = [...prevState.replacement];
                newErrors[deliveryIndex] = '';
                return {
                    ...prevState,
                    replacement: newErrors
                };
            });
            updatedDetails[deliveryIndex][name] = enteredValue;
            setCombineDetails((prevState: any) => ({
                ...prevState,
                [replacementDeliveryDateDetailsKey]: updatedDetails
            }));
        }
    };
    const handleChangeReplacementQuantityUnit = (event: any, deliveryIndex: number) => {
        const { name, value } = event.target;
        const updatedDetails = [...combineDetails[replacementDeliveryDateDetailsKey]];
        updatedDetails[deliveryIndex][name] = value;
        setCombineDetails((prevState: any) => ({
            ...prevState,
            [replacementDeliveryDateDetailsKey]: updatedDetails
        }));
    };
    
    const handleCheckboxChange = (event: any) => {
        const { name, checked } = event.target;
        setCombineDetails((prevDetails: any) => {
            const updatedDetails = { ...prevDetails };
            updatedDetails.grn_material_quantity_details = updatedDetails.grn_material_quantity_details ?? {};
    
            if (!checked) {
                if (name === 'is_debit_note') {
                    updatedDetails.grn_material_quantity_details.total_debit_note_quantity = updatedDetails.grn_material_quantity_details.total_debit_note_quantity ?? {};
                    updatedDetails.grn_material_quantity_details.total_debit_note_quantity.quantity = 0;
                    updatedDetails.grn_material_quantity_details.total_debit_note_quantity.quantity_units = null;
                } else if (name === 'is_replacement') {
                    updatedDetails.grn_material_quantity_details.total_replacement_quantity = updatedDetails.grn_material_quantity_details.total_replacement_quantity ?? {};
                    updatedDetails.grn_material_quantity_details.total_replacement_quantity.quantity = 0;
                    updatedDetails.grn_material_quantity_details.total_replacement_quantity.quantity_units = null;
                    updatedDetails.replacement_delivery_date_details = [];
                } else if (name === 'is_cpi') {
                    updatedDetails.grn_material_quantity_details.total_cpi_quantity = updatedDetails.grn_material_quantity_details.total_cpi_quantity ?? {};
                    updatedDetails.grn_material_quantity_details.total_cpi_quantity.quantity = 0;
                    updatedDetails.grn_material_quantity_details.total_cpi_quantity.quantity_units = null;
                }
            }
    
            return updatedDetails;
        });
    
        setRemediateType((prevValues) => ({
            ...prevValues,
            [name]: checked
        }));
    };
    

    useEffect(() => {
        if (materialId) {
            fetchData();
        }
    }, [materialId]);

    return (
        <>
            {isLoading ? <DefaultLoader /> : <>
                <Box sx={{ mb: 3 }}>
                    <Typography fontWeight='bold'>Total Quantity:</Typography>
                    {combineDetails[grnMaterialQuantityDetailsKey]?.total_quantity?.quantity}  {combineDetails[grnMaterialQuantityDetailsKey]?.total_quantity?.quantity_units_display}

                </Box>
                <Box sx={{ mb: 3 }}>
                    <Typography fontWeight='bold'>Select the Remediate Type:</Typography>
                    <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
                    {remediationType !== widthRemediationKey && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                            <Checkbox
                                checked={remediateType?.is_debit_note}
                                onChange={handleCheckboxChange}
                                name="is_debit_note"
                                sx={{ p: 0 }}
                            />
                            Debit Note
                        </Box>
                    )}
                        {remediationType !== excessRemediationKey && remediationType !== mismatchRemediationKey && (
                            <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                                <Checkbox
                                    checked={remediateType?.is_replacement}
                                    onChange={handleCheckboxChange}
                                    name="is_replacement"
                                    sx={{ p: 0 }}
                                />
                                Replacement
                            </Box>
                        )}
                        {(remediationType == defectedBatchesRemediationKey && materialType == 'fabric' ) && (
                            <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                                <Checkbox
                                    checked={remediateType?.is_cpi}
                                    onChange={handleCheckboxChange}
                                    name="is_cpi"
                                    sx={{ p: 0 }}
                                />
                                CPI
                            </Box>
                        )}
                    </Box>
                </Box>
                {(!remediateType?.is_debit_note && !remediateType?.is_cpi && !remediateType?.is_replacement) && (
                    <Alert sx={{mb:1}} severity="info">Please Select the Remediate Type</Alert>
                ) }
                
                {(remediateType?.is_debit_note) && (
                    <Box sx={{ display: 'flex' }}>
                        <Box sx={{ mb: 3, width: '50%' }}>
                            <Typography fontWeight='bold'>Debit Note Quantity:</Typography>
                            <TextField
                                id={'total_debit_note_quantity'}
                                name={'total_debit_note_quantity'}
                                value={combineDetails[grnMaterialQuantityDetailsKey]?.total_debit_note_quantity?.quantity || ''}
                                onChange={(event) => handleChangeQuantityValidation(event)}
                                fullWidth
                                type="number"
                            />
                            <FormErrorMessage message={frontEndErrorValidation?.['total_debit_note_quantity']} />
                        </Box>
                        <Box sx={{ ml: 2, width: '50%' }}>
                            <Typography fontWeight='bold'>Debit Note Quantity Unit:</Typography>
                            <RitzSelection
                                id={'total_debit_note_quantity'}
                                name={'total_debit_note_quantity'}
                                optionValue={'value'}
                                optionText={'display_value'}
                                selectedValue={combineDetails[grnMaterialQuantityDetailsKey]?.total_debit_note_quantity?.quantity_units || ''}
                                isRequired={true}
                                options={measuringUnits}
                                handleOnChange={(event: any) => { handleChangeQuantityUnit(event) }}
                            />
                            <FormErrorMessage message={errors?.['total_debit_note_quantity_units']} />
                        </Box>
                    </Box>
                )}
               {((remediationType == defectedBatchesRemediationKey && (remediateType?.is_cpi))) && (
                    <Box sx={{ display: 'flex' }}>
                        <Box sx={{ mb: 3, width: '50%' }}>
                            <Typography fontWeight='bold'>CPI Quantity:</Typography>
                            <TextField
                                id={'total_cpi_quantity'}
                                name={'total_cpi_quantity'}
                                value={combineDetails[grnMaterialQuantityDetailsKey]?.total_cpi_quantity?.quantity || ''}
                                onChange={(event) => handleChangeQuantityValidation(event)}
                                fullWidth
                                type="number"
                            />
                               <FormErrorMessage message={frontEndErrorValidation?.['total_cpi_quantity']} />
                        </Box>
                        <Box sx={{ ml: 2, width: '50%' }}>
                            <Typography fontWeight='bold'>CPI Quantity Unit:</Typography>
                            <RitzSelection
                                id={'total_cpi_quantity'}
                                name={'total_cpi_quantity'}
                                optionValue={'value'}
                                optionText={'display_value'}
                                selectedValue={combineDetails[grnMaterialQuantityDetailsKey]?.total_cpi_quantity?.quantity_units || ''}
                                isRequired={true}
                                options={measuringUnits}
                                handleOnChange={(event: any) => { handleChangeQuantityUnit(event) }}
                            />
                            <FormErrorMessage message={errors?.['total_cpi_quantity_units']} />
                        </Box>
                    </Box>
                )}
                {((remediateType?.is_replacement) && remediationType != excessRemediationKey && remediationType != mismatchRemediationKey  ) && (
                    <>
                        <Box sx={{ display: 'flex' }}>
                            <Box sx={{ mb: 3, width: '50%' }}>
                                <Typography fontWeight='bold'>Replacement Quantity:</Typography>
                                <TextField
                                    id={'total_replacement_quantity'}
                                    name={'total_replacement_quantity'}
                                    value={combineDetails[grnMaterialQuantityDetailsKey]?.total_replacement_quantity?.quantity || ''}
                                    onChange={(event) => handleChangeQuantityValidation(event)}
                                    fullWidth
                                    type="number"

                                />
                                <FormErrorMessage message={frontEndErrorValidation?.['total_replacement_quantity']} />
                            </Box>
                            <Box sx={{ ml: 2, width: '50%' }}>
                                <Typography fontWeight='bold'>Replacement Quantity Unit:</Typography>
                                <RitzSelection
                                    id={'total_replacement_quantity'}
                                    name={'total_replacement_quantity'}
                                    optionValue={'value'}
                                    optionText={'display_value'}
                                    selectedValue={combineDetails[grnMaterialQuantityDetailsKey]?.total_replacement_quantity?.quantity_units || ''}
                                    isRequired={true}
                                    options={measuringUnits}
                                    handleOnChange={(event: any) => { handleChangeQuantityUnit(event) }}
                                />
                                <FormErrorMessage message={errors?.['total_replacement_quantity_units']} />
                            </Box>
                        </Box>
                        <Box sx={{ mb: 1 }}>
                            <Typography fontWeight='bold'>Replacement Date Details:</Typography>
                            <TableContainer component={Paper}>
                                <Table >
                                    <TableHead>
                                        <TableRow sx={{ background: theme.palette.grey[100] }}>
                                            <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Quantity</TableCell>
                                            <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Quantity Unit</TableCell>
                                            <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Delivery Type</TableCell>
                                            <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left', padding: '8px' }}>
                                                <Box display="flex" justifyContent="space-between" alignItems="center" width="100%">
                                                    <Box>Delivery Date (YYYY-MM-DD)</Box>
                                                    <Tooltip title="Add Delivery Note">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleAddNewDelivery()}
                                                            style={{ cursor: "pointer" }}
                                                        >
                                                            <AddCircleOutlineIcon color='primary' />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Box>
                                            </TableCell>

                                        </TableRow>
                                    </TableHead>
                                    <TableBody >
                                        {combineDetails[replacementDeliveryDateDetailsKey]?.length == 0 ? (
                                            <TableRow><TableCell colSpan={4} align='center'>No Available Replacement Dates.</TableCell></TableRow>
                                        ) : (
                                            combineDetails[replacementDeliveryDateDetailsKey]?.map((deliveryDate: any, deliveryIndex: number) => (
                                                <TableRow>
                                                    <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                        <TextField
                                                            id='replacement_quantity'
                                                            name='replacement_quantity'
                                                            fullWidth
                                                            autoComplete="off"
                                                            value={deliveryDate.replacement_quantity}
                                                            onChange={(event) => { handleChangeReplacementDateQtyValidation(event, deliveryIndex) }}
                                                            type="number"
                                                        />
                                                         <FormErrorMessage message={frontEndErrorValidation?.['replacement'][deliveryIndex]} />
                                                         <FormErrorMessage message={errors?.replacement_data_errors?.[deliveryIndex]?.replacement_quantity} />
                                                    </TableCell>
                                                    <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>
                                                        <RitzSelection
                                                            id={'replacement_quantity_units'}
                                                            name={'replacement_quantity_units'}
                                                            optionValue={'value'}
                                                            optionText={'display_value'}
                                                            selectedValue={deliveryDate.replacement_quantity_units || ''}
                                                            isRequired={true}
                                                            options={measuringUnits}
                                                            handleOnChange={(event: any) => { handleChangeReplacementQuantityUnit(event, deliveryIndex) }}
                                                        ></RitzSelection>
                                                        <FormErrorMessage message={errors?.replacement_data_errors?.[deliveryIndex]?.replacement_quantity_units} />
                                                    </TableCell>
                                                    <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>
                                                        <RitzSelection
                                                            id={'delivery_type'}
                                                            name={'delivery_type'}
                                                            optionValue={'value'}
                                                            optionText={'name'}
                                                            selectedValue={deliveryDate.delivery_type || 'exiting_delivery'}
                                                            isRequired={true}
                                                            options={deliveryTypes}
                                                            handleOnChange={(event: any) => { handleChangeReplacementQuantityUnit(event, deliveryIndex) }}
                                                        ></RitzSelection>
                                                    </TableCell>
                                                    <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>
                                                        <Box display="flex" alignItems="center">
                                                            {deliveryDate.delivery_type == 'new_delivery' ? (
                                                                   <LocalizationProvider dateAdapter={AdapterDayjs}>
                                                                   <DatePicker
                                                                       format='DD/MM/YYYY'
                                                                       value={deliveryDate.confirmed_delivery_date ? dayjs(deliveryDate.confirmed_delivery_date) : null}
                                                                       onChange={(date) => handleOnChangeDeliveryDate(date, deliveryIndex)}
                                                                   />
                                                               </LocalizationProvider>
                                                                

                                                            ) : (
                                                             <RitzSelection
                                                                    id={'delivery_date_id'}
                                                                    name={'delivery_date_id'}
                                                                    optionValue={'delivery_id'}
                                                                    optionText={'date'}
                                                                    selectedValue={deliveryDate.delivery_date_id || ''}
                                                                    isRequired={true}
                                                                    options={futureDeliveryDates}
                                                                    handleOnChange={(event: any) => { handleChangeReplacementQuantityUnit(event, deliveryIndex) }}
                                                                ></RitzSelection>
                                                                
                                                            )}
                                                              
                                                            {!deliveryDate.id && (
                                                                <IconButton size='small' color='error' onClick={() => { handleDelete(deliveryIndex, deliveryDate.replacement_delivery_date_id) }}>
                                                                    <DeleteIcon fontSize='inherit' />
                                                                </IconButton>
                                                            )}
                                                        </Box>
                                                        <FormErrorMessage message={errors?.replacement_data_errors?.[deliveryIndex]?.confirmed_delivery_date} />  
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}

                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>
                    </>

                )}
                <Box sx={{ mb: 1 }}>
                    <List>
                        {errors.general_errors?.map((error: string, index: number) => (
                            <ListItem key={index} sx={{ display: 'flex', alignItems: 'center' }}>
                                <FiberManualRecordIcon color="error" sx={{ mr: 1 }} />
                                <Typography color="error">{error}</Typography>
                            </ListItem>
                        ))}
                    </List>
                </Box>
                <Box style={{ display: 'flex', justifyContent: 'end' }}>
                    <Button variant="contained" color="primary" onClick={handleSave} disabled={isSaving}>
                        {isSaving && <SaveSpinner />}Save
                    </Button>
                </Box>

            </>}
        </>
    );
};

export default AddCombineDetails;
