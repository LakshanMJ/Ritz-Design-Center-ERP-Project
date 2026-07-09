import React, { useEffect, useState } from "react"
import Button from "@mui/material/Button";
import { Alert, Autocomplete, Box, Divider, IconButton, InputLabel, Link, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography, useTheme } from '@mui/material';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import VisibilityIcon from '@mui/icons-material/Visibility';
import api from "@/services/api";
import DefaultLoader from "@/components/DefaultLoader";
import { toast } from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';
import { deliveryDateFOCDetails, deliveryNoteDeleteURL, getClubSupplierPODetailsURL, getSupplierPoAttachmentDetailsURL, packListDeleteURL, saveSupplierPoAttachmentDetailsURL, supplierPOGRNInvoiceListURL } from "@/helpers/constants/rest_urls/SupplierPoUrls";
import RitzMultipleFileUploader from "@/components/Ritz/RitzMultipleFileUploader";
import { LISTVIEW } from "@/helpers/constants/FileUpload";
import router from "next/router";
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import SaveSpinner from "@/components/SaveSpinner";
import RitzSingleFileUploader from "@/components/Ritz/RitzSingleFileUploader";
import CreatableSelect from 'react-select/creatable';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { DEFAULT_SUCCESS } from "@/helpers/constants/Constants";
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import ClearIcon from '@mui/icons-material/Clear';
import RitzModal from "@/components/Ritz/RitzModal";
import { createNewGrnPageURL, createdGrnDetailsPageURL } from "@/helpers/constants/front_end/GrnUrls";
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import FormErrorMessage from "@/components/FormErrorMessage";
import { ReactKeyHelper } from "@/helpers/KeyHelper";
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from "dayjs";


const AttachmentDetails = ({ spoId, deliveryData, type, selectedSPOId, savedStatus }: any) => {
    const theme = useTheme()
    const keyHelper = new ReactKeyHelper();
    const commercialInvoiceFileLocation = `clubBom/supplierPo/${spoId}/commercialInvoice`;
    const proformaInvoiceFileLocation = `clubBom/supplierPo/${spoId}/proformaInvoice`;
    const deliveryNoteFileLocation = `clubBom/supplierPo/${spoId}/deliveryNote`;
    const packListFileLocation = `clubBom/supplierPo/${spoId}/packList`;
    const deliveryNoteKey ='delivery_note';
    const packListKey ='pack_list';
    const supplierpoinvoicedeliverynoteSetKey = 'supplierpoinvoicedeliverynote_set';
    const supplierPoDeliveryInvoiceKey = 'supplier_po_delivery_invoice';
    const supplierInvoiceNumberKey = 'supplier_invoice_number';
    const supplierDisplayNumberKey = 'supplier_display_number';

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [supplierPoGrnInvoiceDetails, setSupplierPoGrnInvoiceDetails] = useState<any>([]);
    const [supplierPoGrnInvoice, setSupplierPoGrnInvoice] = useState<any>([]);
    const [selectedDeliveryData, setSelectedDeliveryData] = useState<any>({});

    const [selectedDeliveryDeleteData, setSelectedDeliveryDeleteData] = useState<any>({});
    const [selectedPackListDeleteData, setSelectedPackListDeleteData] = useState<any>({});
    const [selectedType, setSelectedType] = useState<any>();
    const [deliveryNotesdeletedIds, setDeliveryNotesdeletedIds] = useState<any>([]);
    const [packListdeletedIds, setPackListdeletedIds] = useState<any>([]);
    const [deliveryFOCDetails, setDeliveryFOCDetails] = useState<any>([]);
    const [errors, setErros] = useState<any>({});
    const [savedDeliveryNoteSet, setSavedDeliveryNoteSet] = useState<any>([]);

    const fetchData = () => {
        setErros({})
        setIsLoading(true);
        const requests = [
            api.get(supplierPOGRNInvoiceListURL(spoId)),
            api.get(getSupplierPoAttachmentDetailsURL(deliveryData)),
            api.get(deliveryDateFOCDetails(deliveryData)),
        ];

        Promise.all(requests).then(resp => {
            const respData = resp.map((r: any) => r.data);
            const [invoiceDetails, attachmentDetails, focDetails] = respData;
            const mappedPlacements = invoiceDetails?.results?.map((invoice: { [supplierInvoiceNumberKey]: any; id: any; }) => ({
                label: invoice?.[supplierInvoiceNumberKey],
                value: invoice.id,
            }));
            setSupplierPoGrnInvoiceDetails([...invoiceDetails?.results]);
            setSupplierPoGrnInvoice([...mappedPlacements]);
            setDeliveryFOCDetails([...focDetails])
            setSelectedDeliveryData({...attachmentDetails})
            const convertDeliveryNoteData = attachmentDetails?.[supplierPoDeliveryInvoiceKey]?.[supplierpoinvoicedeliverynoteSetKey]?.map((data: any, dataIndex: any) => ({
                label: data?.[supplierDisplayNumberKey],
                value: data.id,
                file: data.delivery_note,
                pack_list: data.pack_list?.map((packList: any) => ({
                    label: packList?.[supplierDisplayNumberKey],
                    value: packList.id,
                    grns: packList.grns,
                    file: packList.pack_list,
                }))
              })) || []; 
            setSavedDeliveryNoteSet([...convertDeliveryNoteData])
            
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false)
        });
    };

    const handleChange = (value: any, field: any) => {
        setSelectedDeliveryData((prevState: any) => ({
            ...prevState,
            [field]: value
        }));
    };

    const handleChangePaymentDueDate = (value: any, field: any) => {
        setSelectedDeliveryData((prevState: any) => ({
            ...prevState,
            [supplierPoDeliveryInvoiceKey]: {
                ...prevState[supplierPoDeliveryInvoiceKey],
                [field]: value
            }
        }));
    };

    const handleSave = () => {
        setIsSaving(true);
        const request = {
            method: 'post',
            url: saveSupplierPoAttachmentDetailsURL(deliveryData),
            data: {
                actual_delivery_date: selectedDeliveryData.actual_delivery_date || null,
                [supplierPoDeliveryInvoiceKey]: selectedDeliveryData?.[supplierPoDeliveryInvoiceKey] || null,
                [supplierDisplayNumberKey]: selectedDeliveryData?.[supplierDisplayNumberKey] || null,
                payment_due_date: selectedDeliveryData?.[supplierPoDeliveryInvoiceKey]?.payment_due_date || null,
                deleted_delivery_note_ids: deliveryNotesdeletedIds || [],
                deleted_pack_list_ids: packListdeletedIds || []
            }
        }
        api(request).then(() => {
            toast.success(DEFAULT_SUCCESS);
            fetchData()
            setDeliveryNotesdeletedIds([])
            setPackListdeletedIds([])
            savedStatus(true)

            
        }).catch(error => {
            console.log("error","error?.response?.status")
            toast.error(getDefaultError(error?.response?.status));
            setErros(error?.response?.data?.errors)
        }).finally(() => {
            setIsSaving(false);
        });
    };

   const handleSaveAndNext = () => {
    setIsSaving(true);
        const request = {
            method: 'post',
            url: saveSupplierPoAttachmentDetailsURL(deliveryData),
            data: {
                actual_delivery_date: selectedDeliveryData.actual_delivery_date || null,
                [supplierPoDeliveryInvoiceKey]: selectedDeliveryData?.[supplierPoDeliveryInvoiceKey] || null,
                [supplierDisplayNumberKey]: selectedDeliveryData?.[supplierDisplayNumberKey] || null,
                payment_due_date: selectedDeliveryData?.[supplierPoDeliveryInvoiceKey]?.payment_due_date || null,
                deleted_delivery_note_ids: deliveryNotesdeletedIds || [],
                deleted_pack_list_ids: packListdeletedIds || []
            }
        }
        api(request).then(() => {
            toast.success(DEFAULT_SUCCESS);
            fetchData()
            window.open(createNewGrnPageURL(spoId), '_blank');
            savedStatus()
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.data?.status));
            setErros(error?.response?.data?.errors)    
        }).finally(() => {
            setIsSaving(false);
        });
   }


    const handleFileChange = (attachment: any, type: any) => {
        const attachmentData = attachment.length > 0 ? attachment[0] : null;
        setSelectedDeliveryData({ ...selectedDeliveryData, proforma_invoice: attachmentData });
    };
    const handleChangePIText = (event: any) => {
        setSelectedDeliveryData({ ...selectedDeliveryData, [supplierDisplayNumberKey]:  event.target.value });
    }
    const handleInvoiceFileChange = (attachment: any, type: any) => {
        const attachmentData = attachment.length > 0 ? attachment[0] : null;
        const updatedSelectedDeliveryData = {...selectedDeliveryData,
            [supplierPoDeliveryInvoiceKey]: {
                ...selectedDeliveryData?.[supplierPoDeliveryInvoiceKey],
                invoice: attachmentData,
            },
        };
        
        setSelectedDeliveryData(updatedSelectedDeliveryData);
    };
    const handleFileChangePackList = (attachment: any, index: any, packListIndex: any) => {
        const attachmentData = attachment.length > 0 ? attachment[0] : null;
        const updatedSelectedDeliveryData = { 
            ...selectedDeliveryData,
            [supplierPoDeliveryInvoiceKey]: {
                ...selectedDeliveryData?.[supplierPoDeliveryInvoiceKey]
            }
        };
        if (updatedSelectedDeliveryData?.[supplierPoDeliveryInvoiceKey]?.[supplierpoinvoicedeliverynoteSetKey]) {
            updatedSelectedDeliveryData[supplierPoDeliveryInvoiceKey][supplierpoinvoicedeliverynoteSetKey][index].pack_list[packListIndex].pack_list = attachmentData;
        }
        setSelectedDeliveryData(updatedSelectedDeliveryData);
    };
    const handleOnChangePackListText = (event: any, deliveryIndex: any, packListIndex: any) => {
        const updatedSelectedDeliveryData = {
            ...selectedDeliveryData,
            [supplierPoDeliveryInvoiceKey]: {
                ...selectedDeliveryData?.[supplierPoDeliveryInvoiceKey]
            }
        };
        if (updatedSelectedDeliveryData?.[supplierPoDeliveryInvoiceKey]?.[supplierpoinvoicedeliverynoteSetKey]) {
            const packList = updatedSelectedDeliveryData[supplierPoDeliveryInvoiceKey]?.[supplierpoinvoicedeliverynoteSetKey][deliveryIndex].pack_list[packListIndex];
            updatedSelectedDeliveryData[supplierPoDeliveryInvoiceKey][supplierpoinvoicedeliverynoteSetKey][deliveryIndex].pack_list[packListIndex] = {
                ...packList,
                id: event['__isNew__'] ? null : event.value,
                [supplierDisplayNumberKey]: event.label,
                pack_list: event['__isNew__'] ? null : event.value,
            };
        }
        setSelectedDeliveryData(updatedSelectedDeliveryData);
    };
    const handleFileChangeDeliveryNote = (attachment: any, index: any, type: any) => {
        const attachmentData = attachment.length > 0 ? attachment[0] : null;
        const updatedSelectedDeliveryData = {
            ...selectedDeliveryData,
            [supplierPoDeliveryInvoiceKey]: {
                ...selectedDeliveryData?.[supplierPoDeliveryInvoiceKey]
            }
        };
        if (updatedSelectedDeliveryData?.[supplierPoDeliveryInvoiceKey]?.[supplierpoinvoicedeliverynoteSetKey]) {
            updatedSelectedDeliveryData[supplierPoDeliveryInvoiceKey][supplierpoinvoicedeliverynoteSetKey][index].delivery_note = attachmentData;
        }
        setSelectedDeliveryData(updatedSelectedDeliveryData);
    };
    const handleOnChangeDeliveryNoteText = (event: any, deliveryIndex: any) => {
        const updatedSelectedDeliveryData = {
            ...selectedDeliveryData,
            [supplierPoDeliveryInvoiceKey]: {
                ...selectedDeliveryData?.[supplierPoDeliveryInvoiceKey]
            }
        };
        if (updatedSelectedDeliveryData?.[supplierPoDeliveryInvoiceKey]?.[supplierpoinvoicedeliverynoteSetKey]) {
            const deliveryNote = updatedSelectedDeliveryData?.[supplierPoDeliveryInvoiceKey][supplierpoinvoicedeliverynoteSetKey][deliveryIndex];
            updatedSelectedDeliveryData[supplierPoDeliveryInvoiceKey][supplierpoinvoicedeliverynoteSetKey][deliveryIndex] = {
                ...deliveryNote,
                id: event['__isNew__'] ? null : event.value, 
                [supplierDisplayNumberKey]: event.label,
                delivery_note: event['__isNew__'] ? null : event?.file,
            };
        }
        setSelectedDeliveryData(updatedSelectedDeliveryData);
    };
    const handleInvoiceChange = (newValue: any) => {
    
        const isNewInvoiceNo = newValue['__isNew__'];
        const updatedSelectedDeliveryData = {
            ...selectedDeliveryData,
            [supplierPoDeliveryInvoiceKey]: {
                ...selectedDeliveryData?.[supplierPoDeliveryInvoiceKey]
            }
        };
        updatedSelectedDeliveryData[supplierPoDeliveryInvoiceKey] = {
            ...updatedSelectedDeliveryData?.[supplierPoDeliveryInvoiceKey],
            [supplierInvoiceNumberKey]: newValue.label,
            id: isNewInvoiceNo ? null : newValue.value,
            [supplierpoinvoicedeliverynoteSetKey]: isNewInvoiceNo ? [] : selectedDeliveryData?.[supplierPoDeliveryInvoiceKey]?.[supplierpoinvoicedeliverynoteSetKey],
            invoice: isNewInvoiceNo ? null : selectedDeliveryData?.[supplierPoDeliveryInvoiceKey]?.invoice,
        };
        if (!isNewInvoiceNo) {
            const selectedInvoice = supplierPoGrnInvoiceDetails.find((opt: any) => opt.id === newValue.value) || {};
            const deliveryNotes = selectedInvoice[supplierpoinvoicedeliverynoteSetKey]?.map((note: any) => ({
                label: note?.[supplierDisplayNumberKey],
                value: note.id,
                file: note.delivery_note,
                pack_list: note.pack_list?.map((pack: any) => ({
                    label: pack?.[supplierDisplayNumberKey],
                    value: pack.id,
                    grns: pack.grns,
                    file: pack.pack_list,
                })),
            })) || [];
            updatedSelectedDeliveryData[supplierPoDeliveryInvoiceKey] = {
                ...updatedSelectedDeliveryData?.[supplierPoDeliveryInvoiceKey],
                ...selectedInvoice,
            };
            setSavedDeliveryNoteSet(deliveryNotes);
        }
        setSelectedDeliveryData(updatedSelectedDeliveryData);
    };

    const handleNewRow = () => {
        const newDeliveryNote = {
            id: null as any,
            pack_list: [{
                id: null as any,
                pack_list: null as any,
                display_number: "AddedNewPackList",
            }] as any,
            delivery_note: null as any,
            display_number: "AddedNewDeliveryNote"
        };
        const updatedSelectedDeliveryData = {
            ...selectedDeliveryData,
            [supplierPoDeliveryInvoiceKey]: {
                ...selectedDeliveryData?.[supplierPoDeliveryInvoiceKey]
            }
        };
        updatedSelectedDeliveryData?.[supplierPoDeliveryInvoiceKey]?.[supplierpoinvoicedeliverynoteSetKey]?.push(newDeliveryNote);
        setSelectedDeliveryData(updatedSelectedDeliveryData);
    };
    const handleNewRowToPackList = (deliveryIndex: any) => {
        const newPackList = {
            id: null as any,
            pack_list: null as any,
            display_number: "AddedNewPackList",
        };
        const updatedSelectedDeliveryData = {
            ...selectedDeliveryData,
            [supplierPoDeliveryInvoiceKey]: {
                ...selectedDeliveryData?.[supplierPoDeliveryInvoiceKey]
            }
        };
        updatedSelectedDeliveryData?.[supplierPoDeliveryInvoiceKey]?.[supplierpoinvoicedeliverynoteSetKey][deliveryIndex].pack_list.push(newPackList);
        setSelectedDeliveryData(updatedSelectedDeliveryData);
    };
    const handleOpenDeleteDeliveryNote = (deliveryId:any, deliveryIndex:any) => {
        setOpenDeleteModal(true)
        setSelectedType(deliveryNoteKey)
        setSelectedDeliveryDeleteData({delivery_id:deliveryId, delivery_index:deliveryIndex})

    };
    const handleOpenDeletePackList = (packListId:any, packListIndex:any, deliveryIndex:any) => {
        setOpenDeleteModal(true)
        setSelectedType(packListKey )
        setSelectedPackListDeleteData({ pack_list_id: packListId, pack_list_index: packListIndex, delivery_index: deliveryIndex})

    };
    const handleDeleteDeliveryNote = () => {
        if (selectedType == deliveryNoteKey) {
            if (selectedDeliveryDeleteData?.delivery_id) {
                api.post(deliveryNoteDeleteURL(selectedDeliveryDeleteData?.delivery_id)).then(resp => {
                    toast.success(DEFAULT_SUCCESS);
                    setErros({});
                    fetchData();
                }).catch(error => {
                    toast.error(getDefaultError(error?.response?.status));
                    setErros(error?.response.data);
                }).finally();
            } else {
                const updatedSelectedDeliveryData = { ...selectedDeliveryData };
                updatedSelectedDeliveryData?.[supplierPoDeliveryInvoiceKey]?.[supplierpoinvoicedeliverynoteSetKey].splice(selectedDeliveryDeleteData.delivery_index, 1);
                setSelectedDeliveryData(updatedSelectedDeliveryData);
            }
        } else {
            if (selectedPackListDeleteData?.pack_list_id) {
                api.post(packListDeleteURL(selectedPackListDeleteData?.pack_list_id)).then(resp => {
                    toast.success(DEFAULT_SUCCESS);
                    setErros({});
                    fetchData();
                }).catch(error => {
                    toast.error(getDefaultError(error?.response?.status));
                    setErros(error?.response.data);
                }).finally();
            } else {
                const updatedSelectedDeliveryData = { ...selectedDeliveryData };
                updatedSelectedDeliveryData?.[supplierPoDeliveryInvoiceKey]?.[supplierpoinvoicedeliverynoteSetKey][selectedPackListDeleteData.delivery_index].pack_list.splice(selectedPackListDeleteData.pack_list_index, 1);
                setSelectedDeliveryData(updatedSelectedDeliveryData);
            }
        }
        setOpenDeleteModal(false);
    };
    const handleClickPrevious = () => {
        selectedSPOId(spoId)
    }

    useEffect(() => {
        if (spoId) {
            fetchData();
        }
    }, [spoId]);

    return (
        <>
            {openDeleteModal && (
                <RitzModal open={openDeleteModal} onClose={() => setOpenDeleteModal(false)} title='Confirmation' maxWidth='xs'>
                    Are you sure you want to delete this ?
                    <Box sx={{ display: 'flex', justifyContent: 'end', mt: 2 }}>
                        <Button variant='contained' onClick={handleDeleteDeliveryNote} disabled={isSaving}>{isSaving && <SaveSpinner/>}Confirm</Button>
                    </Box>
                </RitzModal>
            )}
            {isLoading ? <DefaultLoader /> : <>
                <Box sx={{ mb: 3 }}>
                    <Typography fontWeight='bold'>Supplier PO :</Typography>
                    <TextField
                        id={'supplier_po_number'}
                        name={'supplier_po_number'}
                        value={selectedDeliveryData?.supplier_po_number || ''}
                        autoComplete="new-username"
                        onChange={(event: any)=>{handleChange(event.target.value, 'supplier_po_number')}}
                        fullWidth
                        type="text"
                        disabled
                    />
                </Box>
                <Box sx={{ mb: 3 }}>
                    <Typography fontWeight='bold'>Supplier Commercial Invoice Number :</Typography>
                    <CreatableSelect
                        options={supplierPoGrnInvoice}
                        value={supplierPoGrnInvoice.find((opt: any) => opt.label === selectedDeliveryData?.[supplierPoDeliveryInvoiceKey]?.[supplierInvoiceNumberKey])}
                        onChange={handleInvoiceChange}
                        styles={{
                            option: (provided, state) => ({
                                ...provided,
                                backgroundColor: state.isSelected ? '#E4F1FF' : 'white',
                                color: 'black',
                                ':hover': {
                                    backgroundColor: '#F0F0F0',
                                },
                            }),
                            control: (provided) => ({
                                ...provided,
                                height: '50px',
                            }),
                        }}
                    />

                    <Typography
                        sx={{
                            color: '#146C94',
                            fontSize: 'small',
                            mt: 0.5
                        }}
                    >
                        If invoice does not exist in the dropdown, type the invoice number and click create
                    </Typography>
                    <FormErrorMessage message={errors?.invoice_error}/>
                </Box>
                <Box sx={{ mb: 3 }}>
                    <Typography fontWeight='bold'  >Supplier Commercial Invoice :</Typography>
                    <RitzSingleFileUploader
                        displayType={LISTVIEW}
                        selectedFilesParent={selectedDeliveryData?.[supplierPoDeliveryInvoiceKey]?.invoice ? [selectedDeliveryData?.[supplierPoDeliveryInvoiceKey]?.invoice] : []}
                        handleFileChangeParent={(selectedFiles: any) => handleInvoiceFileChange(selectedFiles, 'invoice')}
                        filelocation={commercialInvoiceFileLocation}
                    />
                </Box>
                <Box sx={{ mb: 3 }}>
                    <Typography fontWeight='bold'>Proforma Invoice :</Typography>
                    <RitzSingleFileUploader
                        displayType={LISTVIEW}
                        selectedFilesParent={selectedDeliveryData?.proforma_invoice? [selectedDeliveryData?.proforma_invoice] : []}
                        handleFileChangeParent={(selectedFiles: any) => handleFileChange(selectedFiles, 'proforma_invoice')}
                        filelocation={proformaInvoiceFileLocation}
                        isReadOnly={true}
                    />
                </Box>
                <Box sx={{ mb: 3 }}>
                    <Typography fontWeight='bold'  >Payment Due Date :</Typography>
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <DatePicker
                            minDate={dayjs(Date.now())}
                            format='DD/MM/YYYY'
                            value={selectedDeliveryData?.[supplierPoDeliveryInvoiceKey]?.payment_due_date ? dayjs(selectedDeliveryData?.[supplierPoDeliveryInvoiceKey]?.payment_due_date) : null}
                            onChange={(e: any) => handleChangePaymentDueDate(dayjs(e.$d).format('YYYY-MM-DD'), 'payment_due_date')}
                        />
                    </LocalizationProvider>
                </Box>
                {selectedDeliveryData?.is_foc && (
                    <Box sx={{ mb: 3 }}>
                        <Typography sx={{ mb: 1 }} fontWeight='bold'>FOC Material Details :</Typography>
                        <TableContainer component={Paper}>
                            <Table >
                                <TableHead>
                                    <TableRow sx={{ background: theme.palette.grey[100] }}>
                                        <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Material</TableCell>
                                        <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Ritz Code</TableCell>
                                        <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Material Reference Code Code</TableCell>
                                        <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>Qunatity</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody >
                                    {deliveryFOCDetails?.map((materialDetails: any, materialIndex: any) => (
                                        <TableRow >
                                            <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{materialDetails?.attributes?.material_label}</TableCell>
                                            <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{materialDetails?.attributes?.ritz_customer_brand_reference_code}</TableCell>
                                            <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{materialDetails?.attributes?.reference_code}</TableCell>
                                            <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{materialDetails?.quantity?.quantity} {materialDetails?.quantity?.quantity_units_display}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                )}
                <Box sx={{ mb: 3 }}>
                    <Typography sx={{ mb: 1 }} fontWeight='bold'>Pack Lists Details :</Typography>
                    <TableContainer component={Paper}>
                        <Table >
                            <TableHead>
                                <TableRow sx={{ background: theme.palette.grey[100] }}>
                                    <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left', display: 'flex', justifyContent: 'space-between' }}>
                                        <Box>Delivery Note</Box>
                                        <Tooltip title="Add Delivery Note">
                                            <IconButton
                                                size="small"
                                                onClick={() => handleNewRow()}
                                                style={{ cursor: "pointer" }}
                                            >
                                                <AddCircleOutlineIcon color='primary' />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                    <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Pack List</TableCell>
                                    <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>GRNs</TableCell>
                                    <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>Action</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody >
                                {selectedDeliveryData?.[supplierPoDeliveryInvoiceKey]?.[supplierpoinvoicedeliverynoteSetKey] === undefined || selectedDeliveryData?.[supplierPoDeliveryInvoiceKey]?.[supplierpoinvoicedeliverynoteSetKey].length == 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} align="center">No DeliveryNotes Available</TableCell>
                                    </TableRow>
                                ) : (
                                    selectedDeliveryData?.[supplierPoDeliveryInvoiceKey]?.[supplierpoinvoicedeliverynoteSetKey]?.map((deliveryNote: any, deliveryIndex: number) => (
                                        <React.Fragment key={`${keyHelper.getNextKeyValue()}`}>
                                            {deliveryNote.pack_list && deliveryNote.pack_list.map((packItem: any, packIndex: any) => (
                                                <TableRow key={`${keyHelper.getNextKeyValue()}`}>
                                                    {packIndex==0 &&(
                                                        <TableCell rowSpan={deliveryNote.pack_list.length} sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                        <Box sx={{ mb: 2 }}>
                                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                                <FiberManualRecordIcon fontSize='small' color={'primary'} sx={{ mr: 1 }} />{deliveryNote.display_number}
                                                            </Box>
                                                            <Box sx={{ mt: 2 }}>
                                                                    <CreatableSelect
                                                                        options={savedDeliveryNoteSet}
                                                                        value={savedDeliveryNoteSet.find((opt: any) => opt.label === deliveryNote?.[supplierDisplayNumberKey])}
                                                                        onChange={(option) => handleOnChangeDeliveryNoteText(option, deliveryIndex)}
                                                                        styles={{
                                                                            option: (provided, state) => ({
                                                                                ...provided,
                                                                                backgroundColor: state.isSelected ? '#E4F1FF' : 'white',
                                                                                color: 'black',
                                                                                ':hover': {
                                                                                    backgroundColor: '#F0F0F0',
                                                                                },
                                                                            }),
                                                                            control: (provided) => ({
                                                                                ...provided,
                                                                                height: '50px',
                                                                            }),
                                                                        }}
                                                                    />
                                                                <FormErrorMessage message={errors?.[deliveryIndex]?.delivery_note_number_error}/>
                                                            </Box>
                                                            <RitzSingleFileUploader
                                                                displayType={LISTVIEW}
                                                                selectedFilesParent={deliveryNote?.delivery_note ? [deliveryNote?.delivery_note] : []}
                                                                handleFileChangeParent={(selectedFiles: any) => handleFileChangeDeliveryNote(selectedFiles, deliveryIndex, 'delivery_note')}
                                                                filelocation={deliveryNoteFileLocation}
                                                                isVisibleDelete={false} />
                                                                <FormErrorMessage message={errors?.[deliveryIndex]?.delivery_note_attachment_error}/>
                                                        </Box>
                                                    </TableCell>
                                                    )}
                                                    
                                                    <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                        {packIndex == 0 &&(
                                                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                                                            <Tooltip title="Add PackList Note">
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => handleNewRowToPackList(deliveryIndex)}
                                                                    style={{ cursor: "pointer" }}
                                                                >
                                                                    <AddCircleOutlineIcon color='primary' />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </Box>
                                                        )}
                                                        <Box sx={{ mb: 2 }}>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', mb:1 }}>
                                                                {deliveryNote.pack_list.length > 1 && (
                                                                    <Tooltip title="Delete PackList Note">
                                                                        <IconButton
                                                                            size="small"
                                                                            onClick={() => handleOpenDeletePackList(packItem.id, packIndex, deliveryIndex)}
                                                                            style={{ cursor: "pointer" }}
                                                                        >
                                                                            <DeleteForeverIcon color={'error'} />
                                                                        </IconButton>
                                                                    </Tooltip>
                                                                )}
                                                                <FiberManualRecordIcon  fontSize='small' color={'primary'} sx={{ mr: 1 }} />{packItem.display_number}
                                                            </Box>
                                                            <Box sx={{mt:2}}>  
                                                                <CreatableSelect
                                                                    options={savedDeliveryNoteSet?.find((note: any) => note?.value === deliveryNote?.id)?.pack_list || []}
                                                                    value={{
                                                                        label: packItem?.[supplierDisplayNumberKey],
                                                                        value: packItem.id
                                                                    }}
                                                                    onChange={(option) => handleOnChangePackListText(option, deliveryIndex, packIndex)}
                                                                    styles={{
                                                                        option: (provided, state) => ({
                                                                            ...provided,
                                                                            backgroundColor: state.isSelected ? '#E4F1FF' : 'white',
                                                                            color: 'black',
                                                                            ':hover': {
                                                                                backgroundColor: '#F0F0F0',
                                                                            },
                                                                        }),
                                                                        control: (provided) => ({
                                                                            ...provided,
                                                                            height: '50px',
                                                                        }),
                                                                    }}
                                                                />
                                                            </Box>
                                                            <FormErrorMessage message={errors?.[deliveryIndex]?.pack_list_errors?.[packIndex]?.pack_list_number_error}/>

                                                            <RitzSingleFileUploader
                                                                displayType={LISTVIEW}
                                                                selectedFilesParent={packItem?.pack_list ? [packItem?.pack_list] : []}
                                                                handleFileChangeParent={(selectedFiles: any) => handleFileChangePackList(selectedFiles, deliveryIndex, packIndex)}
                                                                filelocation={packListFileLocation}
                                                                isVisibleDelete={false} />
                                                            <FormErrorMessage message={errors?.[deliveryIndex]?.pack_list_errors?.[packIndex]?.pack_list_attachment_error}/>
                                                            {/* <Divider orientation='horizontal' /> */}
                                                        </Box>
                                                    </TableCell>
                                                    <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '100px' }}>
                                                    {packItem.grns && packItem.grns.map((grn: any, grnIndex: any) => (
                                                                        <React.Fragment key={`${keyHelper.getNextKeyValue()}`}>
                                                                            <Link sx={{ cursor: 'pointer' }} href={createdGrnDetailsPageURL(grn.id)} target="_blank">
                                                                                {grn.display_number}
                                                                            </Link>
                                                                            {grnIndex !== packItem.grns.length - 1 && ', '}
                                                                        </React.Fragment>
                                                    ))}
                                                    </TableCell>
                                                    {packIndex === 0 &&(
                                                    <TableCell rowSpan={deliveryNote.pack_list.length} sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => handleOpenDeleteDeliveryNote(deliveryNote.id, deliveryIndex)}
                                                                style={{ cursor: "pointer" }}
                                                            >
                                                                <DeleteForeverIcon color={'error'} />
                                                            </IconButton>
                                                        </Box>
                                                    </TableCell>
                                                    )}
                                                </TableRow>
                                            ))}
                                        </React.Fragment>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>
                {errors?.pack_list_error && (
                    <Alert severity="error" sx={{ mt: 1, mb: 1 }}>
                        {errors.pack_list_error}
                    </Alert>
                )}
                 {errors?.delivery_note_error && (
                    <Alert severity="error" sx={{ mt: 1, mb: 1 }}>
                        {errors.delivery_note_error}
                    </Alert>
                )}
                <Box style={{ display: 'flex', justifyContent: 'end' }}>
                    {type == 'grn_dashboard' ? (
                        <>
                            <Button variant="contained" color="primary" sx={{ mr: 2 }} onClick={handleClickPrevious}><ChevronLeftIcon />Previous</Button>
                            <Button variant="contained" color="primary" onClick={handleSaveAndNext} disabled={isSaving}>{isSaving && <SaveSpinner />}Save & Start</Button>
                        </>
                    ) : (
                        <>
                            <Button variant="contained" color="primary" onClick={handleSave} disabled={isSaving}>{isSaving && <SaveSpinner />}Save</Button>
                        </>
                        
                    )}
                </Box>

            </>}
        </>
    );
};

export default AttachmentDetails;
