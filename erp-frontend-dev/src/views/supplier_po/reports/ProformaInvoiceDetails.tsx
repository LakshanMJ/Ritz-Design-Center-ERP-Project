import React, { useEffect, useState } from "react"
import Button from "@mui/material/Button";
import { Box, Collapse, Divider, IconButton, InputLabel, Link, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography, useTheme } from '@mui/material';
import DefaultLoader from "@/components/DefaultLoader";
import { LISTVIEW } from "@/helpers/constants/FileUpload";
import SaveSpinner from "@/components/SaveSpinner";
import RitzSingleFileUploader from "@/components/Ritz/RitzSingleFileUploader";
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from "dayjs";
import InfoIcon from '@mui/icons-material/Info';
import api from "@/services/api";
import toast from "react-hot-toast";
import { getDefaultError } from "@/helpers/Utilities";
import { saveSupplierPOprofomaInvoiceURL, supplierPOprofomaInvoiceDetailsURL } from "@/helpers/constants/rest_urls/SupplierPoUrls";
import { consumptionUnitsUrl } from "@/helpers/constants/rest_urls/POUrls";
import RitzSelection from "@/components/Ritz/RitzSelection";
import { DEFAULT_SUCCESS } from "@/helpers/constants/Constants";
import { KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
import { paymentCurrencyListURL } from "@/helpers/constants/rest_urls/FinanceUrls";
import AddIcon from '@mui/icons-material/Add';
import { transportDeliveryDateTrackingMetaData } from "@/helpers/constants/rest_urls/TransportUrls";
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import RitzModal from "@/components/Ritz/RitzModal";
import FormErrorMessage from "@/components/FormErrorMessage";

const ProformaInvoiceDetails = ({ spoId, savedStatus, type }: any) => {
    const theme = useTheme()
    const commercialInvoiceFileLocation = `clubBom/supplierPo/${spoId}/commercialInvoice`;

    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [profomaInvoiceData, setProfomaInvoiceData] = useState<any>({});
    const [measuringUnits, setMeasuringUnits] = useState<any>({});
    const [openRows, setOpenRows] = useState<any>({});
    const [transportMetaData, setTransportMetaData] = useState<any>({});
    const [currencyList, setCurrencyList] = useState<any>([])
    const [deletedIds, setDeletedIds] = useState<any>({delivery_ids: [], allocation_ids: []});
    const [isOpenDeleteConfirmationModal, setIsOpenDeleteConfirmationModal] = useState<any>({});
    const [errors, setErrors] = useState<any>({});
console.log(errors,"errors")
    const fetchData = () => {
        setIsLoading(true);

        Promise.all([
            api.get(supplierPOprofomaInvoiceDetailsURL(spoId)),
            api.get(consumptionUnitsUrl()),
            api.get(paymentCurrencyListURL()),
            api.get(transportDeliveryDateTrackingMetaData()),
        ]).then(resp => {
            const respData = resp.map((r: any) => r.data);
            const [profomadata, units, currencyList, transportMetaData] = respData;
            setProfomaInvoiceData(profomadata);
            setMeasuringUnits([...units.all]);
            setCurrencyList([...currencyList])
            setTransportMetaData({ ...transportMetaData })
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false);
        });
    }

    const handleSave = () => {
        setIsSaving(true);
        const request = {
            method: 'post',
            url: saveSupplierPOprofomaInvoiceURL(spoId),
            data: {
                ...profomaInvoiceData,
                deleted_delivery_ids: deletedIds?.delivery_ids || [],
                deleted_allocation_ids: deletedIds?.allocation_ids || [],
            },
        }
        api(request).then(() => {
            toast.success(DEFAULT_SUCCESS);
            fetchData()
            savedStatus(true)

        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
            setErrors(error?.response?.data);
        }).finally(() => {
            setIsSaving(false);
        });
    };

    const handleInvoiceFileChange = (attachment: any) => {
        const attachmentData = attachment.length > 0 ? attachment[0] : null;
        setProfomaInvoiceData((prevData: any) => ({
            ...prevData,
            performa_invoice: attachmentData
        }));

    };

    const handleChangeProfomaInvoiceNumber = (value: any, field: any) => {
        setProfomaInvoiceData((prevData: any) => ({
            ...prevData,
            [field]: value
        }));
    }

    const handleChange = (event: any, materialIndex: any, poIndex: any) => {
        const { name, value } = event.target;
        const updatedData = [...profomaInvoiceData.material_data];
        updatedData[materialIndex].material_details.bom_data[poIndex][name] = value;
        setProfomaInvoiceData((prevData: any) => ({
            ...prevData,
            material_data: updatedData
        }));
    };

    const handleChangeAllocationPIQuantity = (event: any, materialIndex: any, poIndex: any, allocationIndex: any) => {
        const { name, value } = event.target;
        const updatedData = [...profomaInvoiceData.material_data];
        if (updatedData[materialIndex]?.material_details?.bom_data[poIndex]?.po_allocations?.[allocationIndex]) {
            updatedData[materialIndex].material_details.bom_data[poIndex].po_allocations[allocationIndex][name] = parseFloat(value);
        }
        setProfomaInvoiceData((prevData: any) => ({
            ...prevData,
            material_data: updatedData
        }));
    };

    const handleDateChange = (date: any, field: any, materialIndex: any, poIndex: any) => {
        const updatedData = [...profomaInvoiceData.material_data];
        updatedData[materialIndex].material_details.bom_data[poIndex][field] = date;
        setProfomaInvoiceData((prevData: any) => ({
            ...prevData,
            material_data: updatedData
        }));
    };

    const handleToggle = (materialIndex: any, poIndex: any) => {
        setOpenRows((prevOpenRows: any) => ({
            ...prevOpenRows,
            [`${materialIndex}-${poIndex}`]: !prevOpenRows[`${materialIndex}-${poIndex}`],
        }));
    };

    const handleAddNewDelivery = (materialIndex: number, splitFromData: any) => {
        const updatedData = [...profomaInvoiceData.material_data];
        const bomData = updatedData[materialIndex]?.material_details?.bom_data || [];
        const newDelivery = {
            delivery_date: null as any,
            delivery_date_id: null as any,
            ex_mill_date: null as any,
            id: null as any,
            po_allocations: splitFromData?.po_allocations?.map((allocation: any) => ({
                ...allocation,
                proforma_invoice_quantity: ''
            })) || [],
            proforma_invoice_quantity: '',
            proforma_invoice_quantity_units: splitFromData?.proforma_invoice_quantity_units || '',
            proforma_invoice_quantity_units_display: splitFromData?.proforma_invoice_quantity_units_display || '',
            requested_date: splitFromData?.requested_date || null,
            requested_date_id: splitFromData?.requested_date_id || null,
            requested_quantity: `0 ${splitFromData?.proforma_invoice_quantity_units_display || ''}`,
            split_from: splitFromData?.id,
            transport_quantity: null as any,
            transport_quantity_units: null as any
        };
        updatedData[materialIndex].material_details.bom_data = [...bomData, newDelivery];

        setProfomaInvoiceData({
            ...profomaInvoiceData,
            material_data: updatedData
        });
    };

    const handleOpenDeleteConfirmationModal = (type: any, status: any, materialIndex: any, currentBomData: any, poIndex: any) => {
        setIsOpenDeleteConfirmationModal({ modalType: type, modalStatus: status, materialIndex: materialIndex, currentBomData: currentBomData, poIndex: poIndex });
    }

    const handleOpenPODeleteConfirmationModal = (type: any, status: any, currentPOData: any, materialIndex: any, poIndex: any, allocationIndex: any) => {
        setIsOpenDeleteConfirmationModal({ modalType: type, modalStatus: status, currentPOData: currentPOData, materialIndex: materialIndex, poIndex: poIndex, allocationIndex: allocationIndex });
    }

    const handleConfirmPOAllocationDelete = () => {
        const updatedData = [...profomaInvoiceData.material_data];
        const material = updatedData[isOpenDeleteConfirmationModal?.materialIndex];
        const bomData = material?.material_details?.bom_data || [];
        const poData = bomData[isOpenDeleteConfirmationModal?.poIndex] || {};
        const allocationData = poData.po_allocations || [];

        if (allocationData.length === 1) {
            toast.error("At least one allocation is required.");
            return;
        }
        if (isOpenDeleteConfirmationModal?.currentPOData?.id) {
            setDeletedIds((prev: any) => ({
                ...prev,
                allocation_ids: [...prev.allocation_ids, isOpenDeleteConfirmationModal.currentPOData.id],
            }));
        }
        allocationData.splice(isOpenDeleteConfirmationModal?.allocationIndex, 1);
        updatedData[isOpenDeleteConfirmationModal?.materialIndex].material_details.bom_data[isOpenDeleteConfirmationModal?.poIndex].po_allocations = allocationData;
        setProfomaInvoiceData({
            ...profomaInvoiceData,
            material_data: updatedData
        });
        handleOpenPODeleteConfirmationModal(null, false, null, null, null, null);
    }
    
    const handleConfirmDelete = () => {
        const updatedData = [...profomaInvoiceData.material_data];
        const material = updatedData[isOpenDeleteConfirmationModal?.materialIndex];
        if (!material?.material_details?.bom_data) return;

        const updatedBomData = [...material.material_details.bom_data];

        if (updatedBomData.length === 1) {
            toast.error("At least one delivery is required.");
            return;
        }
        if (isOpenDeleteConfirmationModal?.currentBomData?.id) {
            setDeletedIds((prev: any) => ({
                ...prev,
                delivery_ids: [...prev.delivery_ids, isOpenDeleteConfirmationModal.currentBomData.id],
            }));
        }
        updatedBomData.splice(isOpenDeleteConfirmationModal?.poIndex, 1);
        updatedData[isOpenDeleteConfirmationModal?.materialIndex] = {
            ...material,
            material_details: {
                ...material.material_details,
                bom_data: updatedBomData,
            },
        };
        setProfomaInvoiceData({
            ...profomaInvoiceData,
            material_data: updatedData,
        });
        handleOpenDeleteConfirmationModal(null, false, null, null, null);
    }

    const handleAddNewAllocation = (materialIndex: number, poIndex: number) => {
        const updatedData = [...profomaInvoiceData.material_data];
        const bomData = updatedData[materialIndex]?.material_details?.bom_data || [];
        const allocationData = bomData[poIndex]?.po_allocations || [];
        const newAllocation = {
            id: null as any,
            proforma_invoice_quantity: '',
            purchase_order_display_number: null as any,
            purchase_order_id: null as any,
        };
        allocationData.push(newAllocation);
        updatedData[materialIndex].material_details.bom_data[poIndex].po_allocations = allocationData;
        setProfomaInvoiceData({
            ...profomaInvoiceData,
            material_data: updatedData
        });
    }

    useEffect(() => {
        if (spoId) {
            fetchData()
        }
    }, [spoId]);

    return (
        <>
            {isOpenDeleteConfirmationModal?.modalStatus && (
                <RitzModal open={isOpenDeleteConfirmationModal?.modalStatus} title='Confirmation' onClose={() => { handleOpenDeleteConfirmationModal(null, false, null, null, null) }} maxWidth={'sm'}>
                    Are you sure you want to delete this ?
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'end' }}>
                        <Button variant="contained" onClick={isOpenDeleteConfirmationModal?.modalType === 'delivery' ? handleConfirmDelete : handleConfirmPOAllocationDelete} >Ok</Button>
                        <Button variant="contained" color='secondary' onClick={() => { handleOpenDeleteConfirmationModal(null, false, null, null, null) }} style={{ marginLeft: '10px' }} >Close</Button>
                    </Box>
                </RitzModal>
            )}
        
            {isLoading ? <DefaultLoader /> : <>
                <Box sx={{ mb: 3 }}>
                    <Typography fontWeight='bold' sx={{ mb: 1 }}   >Advance Payment Amount :</Typography>
                    <TextField
                        id={'advance_payment'}
                        name={'advance_payment'}
                        value={profomaInvoiceData?.advance_payment || ''}
                        onChange={(event: any) => { handleChangeProfomaInvoiceNumber(parseFloat(event.target.value), 'advance_payment') }}
                        fullWidth
                        type="number"
                        onFocus={(e) => e.target.addEventListener("wheel", function (e) { e.preventDefault() }, { passive: false })}
                    />
                </Box>
                <Box sx={{ mb: 3 }}>
                    <Typography fontWeight='bold' sx={{ mb: 1 }}   >Advance Payment Due Date :</Typography>
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <DatePicker
                            format='DD/MM/YYYY'
                            value={profomaInvoiceData.advance_payment_due_date ? dayjs(profomaInvoiceData.advance_payment_due_date) : null}
                            onChange={(e: any) => handleChangeProfomaInvoiceNumber(dayjs(e.$d).format('YYYY-MM-DD'), 'advance_payment_due_date')}
                        />
                    </LocalizationProvider>
                </Box>
                <Box sx={{ mb: 3 }}>
                    <Typography fontWeight='bold' sx={{ mb: 1 }}   >Amount Currency:</Typography>
                    <RitzSelection
                        id={'advance_payment_currency'}
                        name={'advance_payment_currency'}
                        optionValue={'id'}
                        optionText={'name'}
                        selectedValue={profomaInvoiceData.advance_payment_currency}
                        isRequired={true}
                        options={currencyList}
                        handleOnChange={(e: any) => handleChangeProfomaInvoiceNumber(e.target.value, 'advance_payment_currency')}
                    />
                </Box>
                <Box sx={{ mb: 3 }}>
                    <Typography fontWeight='bold' sx={{ mb: 1 }}   >Proforma Invoice Date :</Typography>
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <DatePicker
                            format='DD/MM/YYYY'
                            value={profomaInvoiceData.proforma_invoice_date ? dayjs(profomaInvoiceData.proforma_invoice_date) : null}
                            onChange={(e: any) => handleChangeProfomaInvoiceNumber(dayjs(e.$d).format('YYYY-MM-DD'), 'proforma_invoice_date')}
                        />
                    </LocalizationProvider>
                </Box>
                <Box sx={{ mb: 3 }}>
                    <Typography fontWeight='bold' sx={{ mb: 1 }}   >Proforma Invoice Number :</Typography>
                    <TextField
                        id={'pi_supplier_display_number'}
                        name={'pi_supplier_display_number'}
                        value={profomaInvoiceData?.proforma_invoice_supplier_display_number || ''}
                        autoComplete="new-username"
                        onChange={(event: any) => { handleChangeProfomaInvoiceNumber(event.target.value, 'proforma_invoice_supplier_display_number') }}
                        fullWidth
                        type="text"
                    />
                </Box>
                <Box sx={{ mb: 3 }}>
                    <Typography fontWeight='bold' sx={{ mb: 1 }}   >Proforma Invoice :</Typography>
                    <RitzSingleFileUploader
                        displayType={LISTVIEW}
                        selectedFilesParent={profomaInvoiceData?.performa_invoice ? [profomaInvoiceData?.performa_invoice] : []}
                        handleFileChangeParent={(selectedFiles: any) => handleInvoiceFileChange(selectedFiles)}
                        filelocation={commercialInvoiceFileLocation}
                    />
                </Box>
                <Box sx={{ mb: 3 }}>
                    <Typography fontWeight='bold' sx={{ mb: 1 }} >Proforma Invoice Details :</Typography>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ background: theme.palette.grey[200], border: (theme) => `1px solid ${theme.palette.grey[100]}` }}>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left', width: '10%' }}>Requested Quantity</TableCell>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left', width: '10%' }}>Requested Delivery Date</TableCell>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left', width: '8%' }}>PI Quantity</TableCell>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left', width: '5%' }}>PI Quantity Unit</TableCell>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left', width: '12%' }}>Exmill date</TableCell>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left', width: '10%' }}>Transport Method</TableCell>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left', width: '8%' }}>Transport Quantity</TableCell>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left', width: '10%' }}>Transport Quantity Unit</TableCell>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left', width: '10%' }}>Port</TableCell>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left', width: '20%' }}>Delivery Date</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {profomaInvoiceData.material_data?.map((material: any, materialIndex: any) => (
                                <React.Fragment key={`material-${materialIndex}`}>
                                    <TableRow key={`material-row-${materialIndex}`}>
                                        <TableCell colSpan={10} sx={{ background: theme.palette.grey[100], border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                            <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                    <Typography sx={{ mr: 1 }}>
                                                        {material?.material_details?.ritz_customer_brand_reference_code}
                                                    </Typography>
                                                    <Tooltip
                                                        arrow
                                                        title={
                                                            <Box>
                                                                {material?.headers?.map((header: any, headerIndex: number) => (
                                                                    <Typography key={`header-${materialIndex}-${headerIndex}`}>
                                                                        {header.label} : {material?.material_details[header.value]}
                                                                    </Typography>
                                                                ))}
                                                            </Box>
                                                        }
                                                    >
                                                        <InfoIcon fontSize="small" sx={{ opacity: '60%' }} />
                                                    </Tooltip>
                                                </Box>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                    {material.material_details?.bom_data?.map((po: any, poIndex: any) => (
                                        <React.Fragment key={`po-${materialIndex}-${poIndex}`}>
                                            <TableRow key={`po-row-${materialIndex}-${poIndex}`}>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>
                                                    {type && (
                                                        <IconButton
                                                            aria-label="expand row"
                                                            size="small"
                                                            onClick={() => handleToggle(materialIndex, poIndex)}
                                                        >
                                                            {openRows[`${materialIndex}-${poIndex}`] ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                                                        </IconButton>
                                                    )}
                                                    {po?.requested_quantity}
                                                </TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>{po?.requested_date || '--'}</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>
                                                    <TextField
                                                        id='proforma_invoice_quantity'
                                                        fullWidth
                                                        autoComplete="off"
                                                        name="proforma_invoice_quantity"
                                                        value={po?.proforma_invoice_quantity}
                                                        onChange={(event) => { handleChange(event, materialIndex, poIndex) }}
                                                        type="number"
                                                    />
                                                    <FormErrorMessage message={errors?.form_errors?.[materialIndex]?.[poIndex]?.['proforma_invoice_quantity']} />
                                                </TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>
                                                    <RitzSelection
                                                        id={'id'}
                                                        name={'proforma_invoice_quantity_units'}
                                                        optionValue={'value'}
                                                        optionText={'display_value'}
                                                        selectedValue={po?.['proforma_invoice_quantity_units'] || ''}
                                                        isRequired={true}
                                                        options={measuringUnits}
                                                        handleOnChange={(event: any) => { handleChange(event, materialIndex, poIndex) }}
                                                    />
                                                    <FormErrorMessage message={errors?.form_errors?.[materialIndex]?.[poIndex]?.['proforma_invoice_quantity_units']} />
                                                </TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>
                                                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                                                        <DatePicker
                                                            format='DD/MM/YYYY'
                                                            value={po.ex_mill_date ? dayjs(po.ex_mill_date) : null}
                                                            onChange={(e: any) => handleDateChange(dayjs(e.$d).format('YYYY-MM-DD'), 'ex_mill_date', materialIndex, poIndex)}
                                                        />
                                                    </LocalizationProvider>
                                                    <FormErrorMessage message={errors?.form_errors?.[materialIndex]?.[poIndex]?.['ex_mill_date']} />
                                                </TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>
                                                    <RitzSelection
                                                        id={'id'}
                                                        name={'transport_method'}
                                                        optionValue={'type'}
                                                        optionText={'name'}
                                                        selectedValue={po?.['transport_method'] || ''}
                                                        isRequired={true}
                                                        options={transportMetaData?.freight_types}
                                                        handleOnChange={(event: any) => { handleChange(event, materialIndex, poIndex) }}
                                                    />
                                                    <FormErrorMessage message={errors?.form_errors?.[materialIndex]?.[poIndex]?.['transport_method']} />
                                                </TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>
                                                    <TextField
                                                        id='transport_quantity'
                                                        fullWidth
                                                        autoComplete="off"
                                                        name="transport_quantity"
                                                        value={po?.['transport_quantity'] || ''}
                                                        onChange={(event) => { handleChange(event, materialIndex, poIndex) }}
                                                        type="number"
                                                    />
                                                    <FormErrorMessage message={errors?.form_errors?.[materialIndex]?.[poIndex]?.['transport_quantity']} />
                                                    <FormErrorMessage message={errors?.form_errors?.[materialIndex]?.[poIndex]?.['general_errors']?.[0]} />
                                                </TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>
                                                    <RitzSelection
                                                        id={'id'}
                                                        name={'transport_quantity_units'}
                                                        optionValue={'value'}
                                                        optionText={'display_value'}
                                                        selectedValue={po?.['transport_quantity_units'] || ''}
                                                        isRequired={true}
                                                        options={measuringUnits}
                                                        handleOnChange={(event: any) => { handleChange(event, materialIndex, poIndex) }}
                                                    />
                                                    <FormErrorMessage message={errors?.form_errors?.[materialIndex]?.[poIndex]?.['transport_quantity_units']} />
                                                </TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>
                                                    <RitzSelection
                                                        id={'id'}
                                                        name={'port'}
                                                        optionValue={'id'}
                                                        optionText={'port_display_value'}
                                                        selectedValue={po?.['port'] || ''}
                                                        isRequired={true}
                                                        options={transportMetaData?.foreign_ports}
                                                        handleOnChange={(event: any) => { handleChange(event, materialIndex, poIndex) }}
                                                    />
                                                    <FormErrorMessage message={errors?.form_errors?.[materialIndex]?.[poIndex]?.['port']} />
                                                </TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>
                                                    <Box display="flex" alignItems="center" gap={1}>
                                                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                                                            <DatePicker
                                                                format="DD/MM/YYYY"
                                                                value={po.delivery_date ? dayjs(po.delivery_date) : null}
                                                                onChange={(e: any) =>
                                                                    handleDateChange(
                                                                        dayjs(e.$d).format('YYYY-MM-DD'),
                                                                        'delivery_date',
                                                                        materialIndex,
                                                                        poIndex
                                                                    )
                                                                }
                                                            />
                                                        </LocalizationProvider>
                                                        <IconButton onClick={() => handleAddNewDelivery(materialIndex, po)}>
                                                            <Tooltip arrow title="Add Delivery">
                                                                <AddIcon />
                                                            </Tooltip>
                                                        </IconButton>
                                                        {po?.split_from && (
                                                            <IconButton
                                                                sx={{ borderRadius: '50%' }}
                                                                edge="end"
                                                                color="error"
                                                                onClick={() => handleOpenDeleteConfirmationModal("delivery", true, materialIndex, po, poIndex)}
                                                            >
                                                                <Tooltip arrow title="Delete Delivery">
                                                                    <DeleteOutlineIcon />
                                                                </Tooltip>
                                                            </IconButton>
                                                        )}
                                                        <FormErrorMessage message={errors?.form_errors?.[materialIndex]?.[poIndex]?.['delivery_date']} />
                                                    </Box>
                                                </TableCell>
                                            </TableRow>
                                            {type && (
                                                <TableRow>
                                                    <TableCell style={{ paddingBottom: 0, paddingTop: 0, paddingLeft: '5%', paddingRight: 0 }} colSpan={10} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                        <Collapse in={openRows[`${materialIndex}-${poIndex}`]} timeout="auto" unmountOnExit>
                                                            <Box key={`allocation-${materialIndex}-${poIndex}`} sx={{ width: '100%' }}>
                                                                <TableRow key={`allocation-header-row-${materialIndex}-${poIndex}`} sx={{ background: theme.palette.grey[100], border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                                    <TableCell colSpan={5} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left', color: theme.palette.primary.main }}>
                                                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                                            <Typography fontWeight="bold">Allocation Details :</Typography>
                                                                            <IconButton onClick={() => handleAddNewAllocation(materialIndex, poIndex)}>
                                                                                <Tooltip arrow title="Add Allocation">
                                                                                    <AddIcon />
                                                                                </Tooltip>
                                                                            </IconButton>
                                                                        </Box>
                                                                    </TableCell>
                                                                </TableRow>
                                                                <TableRow key={`allocation-header-cols-${materialIndex}-${poIndex}`} >
                                                                    <TableCell colSpan={2} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left', fontWeight: 'bold', width: '50%' }}>Purchase Order</TableCell>
                                                                    <TableCell colSpan={2} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left', fontWeight: 'bold', width: '30%' }}>PI Quantity ({po?.proforma_invoice_quantity_units_display})</TableCell>
                                                                </TableRow>
                                                                {po?.po_allocations?.map((allocation: any, allocationIndex: any) => (
                                                                    <TableRow key={`allocation-row-${materialIndex}-${poIndex}-${allocationIndex}`}>
                                                                        <TableCell colSpan={2} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>
                                                                            <RitzSelection
                                                                                id={'id'}
                                                                                name={'purchase_order'}
                                                                                optionValue={'id'}
                                                                                optionText={'po_number'}
                                                                                selectedValue={allocation?.['purchase_order'] || ''}
                                                                                isRequired={true}
                                                                                options={material?.material_details?.linked_purchase_orders}
                                                                                handleOnChange={(event: any) => { handleChangeAllocationPIQuantity(event, materialIndex, poIndex, allocationIndex) }}
                                                                            />
                                                                        </TableCell>
                                                                        <TableCell colSpan={2} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>

                                                                            <Box display="flex" alignItems="center" gap={1}>
                                                                                <TextField
                                                                                    id='proforma_invoice_quantity'
                                                                                    fullWidth
                                                                                    autoComplete="proforma_invoice_quantity"
                                                                                    name="proforma_invoice_quantity"
                                                                                    value={allocation?.proforma_invoice_quantity}
                                                                                    onChange={(event) => { handleChangeAllocationPIQuantity(event, materialIndex, poIndex, allocationIndex) }}
                                                                                    type="number"
                                                                                />
                                                                                <IconButton
                                                                                    sx={{ borderRadius: '50%' }}
                                                                                    edge="end"
                                                                                    color="error"
                                                                                    onClick={() => handleOpenPODeleteConfirmationModal("allocation", true, allocation, materialIndex, poIndex, allocationIndex)}
                                                                                >
                                                                                    <Tooltip arrow title="Delete Allocation">
                                                                                        <DeleteOutlineIcon />
                                                                                    </Tooltip>
                                                                                </IconButton>
                                                                            </Box>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </Box>
                                                        </Collapse>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </React.Fragment>
                            ))}
                        </TableBody>
                    </Table>
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

export default ProformaInvoiceDetails;
