import React, { useEffect, useState } from "react";
import { Alert, Box, Button, Card, CardHeader, Collapse, darken, Divider, FormControl, FormControlLabel, Grid, IconButton, InputLabel, Link, Radio, RadioGroup, Select, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography, useTheme } from "@mui/material";
import { useRouter } from "next/router";
import api from "@/services/api";
import DefaultLoader from "@/components/DefaultLoader";
import { toast } from 'react-hot-toast';
import { getDefaultError, hasRole } from '@/helpers/Utilities';
import SaveSpinner from "@/components/SaveSpinner";
import * as poUrls from "@/helpers/constants/rest_urls/POUrls";
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from "dayjs";
import RitzInput from "@/components/Ritz/RitzInput";
import RitzModal from "@/components/Ritz/RitzModal";
import { DEFAULT_SUCCESS } from "@/helpers/constants/Constants";
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import RitzSelection from "@/components/Ritz/RitzSelection";
import { getConsumptionMeasuringUnitsURL } from "@/helpers/constants/RestUrls";
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import Checkbox from '@mui/material/Checkbox';
import FormErrorMessage from "@/components/FormErrorMessage";
import { KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';   
import { purchaseOrderDetailPageURL } from "@/helpers/constants/FrontEndUrls";
import NextLink from 'next/link';
import RitzSwitch from "@/components/Ritz/RitzSwitch";
import { transportDeliveryDateTrackingMetaData } from "@/helpers/constants/rest_urls/TransportUrls";
import { actualSupplierGeneralMaterialDeliveryMetaDataURL } from "@/helpers/constants/rest_urls/POUrls";

const GeneralPOActualSupplierBomDetail = ({ materialId, generalPoId, savedDetails, supplierBOMMaterialIds, generalPOType }: any) => {
    const router = useRouter();
    const theme = useTheme()
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadNextData, setLoadNextData] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isCopySingleDelivery, setIsCopySingleDelivery] = useState(false);
    const [selectedIndexes, setSelectedIndexes] = useState<any>({ supplierIndex: null, deliveryIndex: null, supplierDeliveryLength: null });
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [openSupplierModal, setOpenSupplierModal] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState<any>({});
    const [selectedMaterialType, setSelectedMaterialType] = useState<any>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [materialDetails, setMaterialDetails] = useState<any>({});
    const [selectedDeleteId, setSelectedDeleteId] = useState(null);
    const [focusedInputIndex, setFocusedInputIndex] = useState<number | null>(null);
    const [actualQuantityErrors, setActualQuantityErrors] = useState<any>({});
    const [measuringUnits, setMeasuringUnits] = useState<any>({});
    const [selectedGeneralPoId, setSelectedGeneralPoId] = useState<any>(generalPoId);
    const [supplierDetails, setSupplierDetails] = useState<any>([]);
    const [selectedInquiry, setSelectedInquiry] = useState<any>({});
    const [selectedDeletePriceDetails, setSelectedDeletePriceDetails] = useState<any>({modalOpen: false, supplierPriceId: null, supplierIndex: null});
    const [deliveryTypes, setDeliveryTypes] = useState([{ id: 'single', type: 'Single Delivery' }, { id: 'staggered', type: 'Staggered Delivery' }]);
    const [openRows, setOpenRows] = useState<any>({});
    const [transportMetaData, setTransportMetaData] = useState<any>({});

    const fetchData = (materialId: any, generalPoId: any) => {
        const requests = [
            api.get(poUrls.poClubBomMaterialDetailsUrl(generalPoId, materialId)),
            api.get(getConsumptionMeasuringUnitsURL()),
            api.get(transportDeliveryDateTrackingMetaData())
        ]
        Promise.all(requests).then(resp => {
            const respData = resp.map((r: any) => r.data);
            const [bomMaterialDetails, measuringUnits, transportMetaData] = respData;
            setMaterialDetails(bomMaterialDetails);
            setMeasuringUnits(measuringUnits)
            setTransportMetaData({...transportMetaData})
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() =>  {
            setIsLoading(false);
            setLoadNextData(false);
        });
    }

    const handlePendingMaterials = (materialIdToRemove: any, generalPOIdToRemove: any) => {
        console.log(supplierBOMMaterialIds,"supplierBOMMaterialIdssupplierBOMMaterialIds")
        const findCurrentIndex = supplierBOMMaterialIds.findIndex((material: { id: any; material: any; }) => material.id === generalPOIdToRemove && material.material === materialIdToRemove);
        if (findCurrentIndex === supplierBOMMaterialIds.length - 1) {
            savedDetails(true, generalPOIdToRemove)
            return;
        }
        
        setSelectedGeneralPoId(supplierBOMMaterialIds[(findCurrentIndex + 1)].id)
        fetchData(supplierBOMMaterialIds[(findCurrentIndex + 1)].material, supplierBOMMaterialIds[(findCurrentIndex + 1)].id);
    };

    const handleChange = (event: any, rowIndex: any) => {
        const { name, value } = event.target;
        setMaterialDetails((prevMaterialDetails: any) => {
            const updatedMaterialDetails = { ...prevMaterialDetails };
            const updatedPurchaseOrderBoms = [...updatedMaterialDetails.total_value_with_po_breakdown.purchase_order_boms];

            const parsedValue = name === 'order_quantity' ? parseFloat(value) || null : value || null;
            updatedPurchaseOrderBoms[rowIndex] = { ...updatedPurchaseOrderBoms[rowIndex], [name]: parsedValue };
            updatedMaterialDetails.total_value_with_po_breakdown.purchase_order_boms = updatedPurchaseOrderBoms;

            if (name === 'order_quantity') {
                const totalOrderQuantity = updatedPurchaseOrderBoms.reduce((total, bom) => total + parseFloat(bom.order_quantity || 0), 0);
                updatedMaterialDetails.total_value_with_po_breakdown.order_quantity = totalOrderQuantity;
            }
            return updatedMaterialDetails;
        });
    };
    const handleChangeGeneralOrderQunatity = (event: any) => {
        const { name, value } = event.target;
        setMaterialDetails((prevDetails: any) => ({
            ...prevDetails,
            [name]: parseFloat(value)
        }));
    };

    const handleIndexValue = (index: any) => {
        const currentIndexValue = index
        setFocusedInputIndex(currentIndexValue);
    }

    const handleChangeSupplier = (event: any, supplierIndex: any, deliveryIndex: any, field: any) => {
        const value = event;
        const updatedDeliveries = [...materialDetails.suppliers];
        if (updatedDeliveries[supplierIndex]?.deliveries[deliveryIndex]) {
            updatedDeliveries[supplierIndex].deliveries[deliveryIndex] = {
                ...updatedDeliveries[supplierIndex].deliveries[deliveryIndex],
                [field]: value
            };
        }
        setMaterialDetails({
            ...materialDetails,
            suppliers: updatedDeliveries
        });
    };

    const handleChangeQty = (event: any, supplierIndex: number, deliveryIndex: number, field: string) => {
        const value = event.target.value;
        const parsedValue = parseFloat(value)
        const updatedDeliveries = [...materialDetails.suppliers];
        if (updatedDeliveries[supplierIndex]?.deliveries[deliveryIndex]) {
            updatedDeliveries[supplierIndex].deliveries[deliveryIndex] = {
                ...updatedDeliveries[supplierIndex].deliveries[deliveryIndex],
                quantity: {
                    ...updatedDeliveries[supplierIndex].deliveries[deliveryIndex].quantity,
                    [field]: parsedValue
                }
            };
        }
        setMaterialDetails({
            ...materialDetails,
            suppliers: updatedDeliveries
        });
    };
    const handleAddNewCustomerPo = (supplierIndex: number, deliveryIndex: number) => {
        const updatedSuppliers = [...materialDetails.suppliers];
        if (updatedSuppliers[supplierIndex]?.deliveries[deliveryIndex]) {
            updatedSuppliers[supplierIndex].deliveries[deliveryIndex].supplierdeliverydatequantitypoallocation_set.push({
                id: null,
                purchase_order: null,
                quantity: null,
            });
        }
        setMaterialDetails({
            ...materialDetails,
            suppliers: updatedSuppliers
        });
    };

    const handleSaveData = (savedType: any) => {
        
        const dataList = {
            material_normalized_measuring_unit: materialDetails?.material?.material_normalized_measuring_unit,
            total_value_with_po_breakdown: materialDetails.total_value_with_po_breakdown || null,
            suppliers: materialDetails.suppliers,
            material_total_order_quantity: materialDetails.material_total_order_quantity || null,
            completed: materialDetails.completed

        }
        api.post(poUrls.savePoClubBomMaterialDetailsUrl(selectedGeneralPoId), dataList).then(resp => {
            const respData = resp?.data || {};
            toast.success(DEFAULT_SUCCESS);
            const exitingRowData = {
                general_po_material_quantity_id: respData.general_po_material_quantity_id,
                quantity: respData.quantity,
                quantity_units_display: respData.quantity_units_display,
                completed: respData.completed
            }
            savedDetails(false, exitingRowData)
            setActualQuantityErrors({})
            if (savedType == 'save_next') {
                handlePendingMaterials(respData.material_id, respData.general_po_material_quantity_id)
                setLoadNextData(true)
            }
           
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
            if(error?.response){
                setActualQuantityErrors(error?.response?.data)
            }
           
        }).finally(() => {
            setIsLoading(false);
        });
    };

    const handleOpenDelete = (supplierIndex:any, deliveryIndex:any, id:any, supplierDeliveryLength:any) => {
        setSelectedIndexes({ supplierIndex, deliveryIndex, supplierDeliveryLength });
        setSelectedDeleteId(id);
        setConfirmDelete(true);
    };
    
    const handleDelete = () => {
        setIsDeleting(true);
        const { supplierIndex, deliveryIndex, supplierDeliveryLength } = selectedIndexes;
        if (supplierDeliveryLength === 1) {
            toast.error("Cannot delete this delivery. At least one delivery must be present.");
            setIsDeleting(false);
            return;
        }
        if (selectedDeleteId == null) {
            const updatedSuppliers = [...materialDetails.suppliers];
            const updatedDeliveries = updatedSuppliers[supplierIndex]?.deliveries || [];
            updatedDeliveries.splice(deliveryIndex, 1);
            updatedSuppliers[supplierIndex].no_of_deliveries = updatedDeliveries.length;
            setMaterialDetails((prevDetails: any) => ({
                ...prevDetails,
                suppliers: updatedSuppliers
            }));
            setConfirmDelete(false);
            setIsDeleting(false);
        } else {
            api.delete(poUrls.deletePoMaterialSupplierURL(selectedDeleteId))
                .then(resp => {
                    const respData = resp?.data || {};
                    toast.success(DEFAULT_SUCCESS);
                    const updatedSuppliers = [...materialDetails.suppliers];
                    const updatedDeliveries = updatedSuppliers[supplierIndex]?.deliveries || [];
                    updatedDeliveries.splice(deliveryIndex, 1);
                    updatedSuppliers[supplierIndex].no_of_deliveries = updatedDeliveries.length;
                    setMaterialDetails((prevDetails: any) => ({
                        ...prevDetails,
                        suppliers: updatedSuppliers
                    }));
                    setConfirmDelete(false);
                })
                .catch(error => {
                    toast.error(getDefaultError(error?.response?.status));
                })
                .finally(() => {
                    setIsDeleting(false);
                });
        }
    };

    const handleCloseSupplierModal = () => {
        setSelectedSupplier({})
        setSelectedInquiry({})
        setOpenSupplierModal(false)
    };

    const handleChangeAllocation = (event: any, supplierIndex: number, deliveryIndex: number, allocationIndex: number, field: string) => {
        const value = event.target.value;
        const updatedSuppliers = [...materialDetails.suppliers];
    
        if (updatedSuppliers[supplierIndex]?.deliveries[deliveryIndex]) {
            updatedSuppliers[supplierIndex].deliveries[deliveryIndex].supplierdeliverydatequantitypoallocation_set[allocationIndex] = {
                ...updatedSuppliers[supplierIndex].deliveries[deliveryIndex].supplierdeliverydatequantitypoallocation_set[allocationIndex],
                [field]: parseFloat(value)
            };
        }
        setMaterialDetails({
            ...materialDetails,
            suppliers: updatedSuppliers
        });
    };

    const deleteAllocationPo = (allocationId: any, supplierIndex: number, deliveryIndex: number, allocationIndex: number) => {
        if(allocationId){
            api.delete(poUrls.deleteGeneralPoSupplierMaterialAllocation(allocationId))
            .then(resp => {
                const respData = resp?.data || [];
                toast.success(DEFAULT_SUCCESS);
                fetchData(materialId, generalPoId);
            })
            .catch(error => {
                toast.error(getDefaultError(error?.response?.status));
            })
            .finally(() => {
                setIsDeleting(false);
            });
        }
        const updatedSuppliers = [...materialDetails.suppliers];
        if (updatedSuppliers[supplierIndex]?.deliveries[deliveryIndex]) {
            updatedSuppliers[supplierIndex].deliveries[deliveryIndex].supplierdeliverydatequantitypoallocation_set.splice(allocationIndex, 1);
        }
        setMaterialDetails({
            ...materialDetails,
            suppliers: updatedSuppliers
        });
    };

    const handleChangeSupplierPrice = (event: any, supplierIndex: number, field: string) => {
        const value = event.target.value;
        const updatedDeliveries = [...materialDetails.suppliers];
        const parsedValue = (field === 'order_price' || field === 'discount' || field === 'excess_threshold') ? parseFloat(value) || null : value || null;
        if (updatedDeliveries[supplierIndex]) {
            updatedDeliveries[supplierIndex].supplier_prices[field] = parsedValue;
        }
        setMaterialDetails({
            ...materialDetails,
            suppliers: updatedDeliveries
        });
    };

    const handleRadioChange = (event: any, supplierIndex: any, feild: any) => {
        setConfirmDelete(false)
        const updatedSuppliers = [...materialDetails.suppliers];
        if (updatedSuppliers[supplierIndex]?.deliveries.length > 1) {
            toast.error("Cannot change this type as there is more than one delivery");
            return;
        }
        updatedSuppliers[supplierIndex][feild] = event.target.value;
        setMaterialDetails({
            ...materialDetails,
            suppliers: updatedSuppliers
        });
    };

    const handleChangeNoOfDeliveries = (event: any, supplierIndex: any, field: any) => {
        const value = Number(event.target.value);
        if (isNaN(value) || value < 0) return;
        if (value > 10) {
            toast.error("The number of deliveries must be less than 10. Please adjust the quantity.");
            return;
        }
        const updatedSuppliers = [...materialDetails.suppliers];
        updatedSuppliers[supplierIndex][field] = value;
        const currentDeliveriesLength = updatedSuppliers[supplierIndex]?.deliveries?.length || 0;
        const toAddedDeliveryLength = value - currentDeliveriesLength;

        if (toAddedDeliveryLength > 0) {
            const newDeliveries = Array.from({ length: toAddedDeliveryLength }, () => ({
                id: null as any,
                confirmed_delivery_date: '',
                quantity: { quantity: '', quantity_units_display:materialDetails?.suppliers[supplierIndex]?.deliveries[0]?.quantity?.quantity_units_display },//need to show quantity display unit-need to review this
                supplier: '',
                supplierdeliverydatequantitypoallocation_set: [] as any
            }));
            updatedSuppliers[supplierIndex].deliveries = [
                ...(updatedSuppliers[supplierIndex]?.deliveries || []),
                ...newDeliveries
            ];
        } else if (toAddedDeliveryLength < 0) {
            toast.error("Please delete existing deliveries before reducing the number of deliveries");
            return;
        }
        setMaterialDetails({
            ...materialDetails,
            suppliers: updatedSuppliers
        });
    };

    const handleOpenSupplierModal = () => {
        setOpenSupplierModal(true)
        setSelectedMaterialType(materialDetails.material?.attributes?.material_type)
        api.get(poUrls.poClubOrderInquirySuppliersURL(generalPoId, materialId))
            .then(resp => {
                const respData = resp?.data || [];
                setSupplierDetails([...respData])
            })
            .catch(error => {
                toast.error(getDefaultError(error?.response?.status));
            })
            .finally(() => {
                setIsDeleting(false);
            });
    }

    const handleSelectedSupplierToAdd = (event:any) => {
        const selectedSupplierId = event.target.value;
        const selectedSupplier = supplierDetails.find((supplier: any) => supplier.supplier_id === selectedSupplierId);
        setSelectedSupplier(selectedSupplier)
    }

    const handleSaveSupplier = () => {
        handleCloseSupplierModal()
        const emptyObject = {
            id: selectedInquiry.supplier_id,
            supplier_name: selectedInquiry.supplier_name,
            cutting_width: selectedInquiry.cutting_width,
            cutting_width_unit_display: selectedInquiry.cutting_width_unit_display,
            no_of_deliveries: 1,
            delivery_type: 'single',
            supplier_prices:
            {
                id: null as any,
                supplier_material_reference_code: selectedInquiry.supplier_material_reference_code,
                lead_time: selectedInquiry.lead_time,
                cost_per_unit: selectedInquiry.cost_per_unit,
                general_po_supplier: selectedInquiry.general_po_supplier,
                supplier_material: selectedInquiry.supplier_material,
                supplier_inquiry_detail: selectedInquiry.supplier_inquiry_detail,
                supplier_name: selectedInquiry.supplier_name,
                order_price: null as any,
                order_price_units: null as any,
                discount: null as any,
                excess_threshold: null as any,

            },
            deliveries:
                [
                    {
                        id: null as null,
                        quantity: { quantity: null as any, quantity_units_display:materialDetails?.suppliers[0]?.deliveries[0]?.quantity?.quantity_units_display  }, //need to review-need quantity unit
                        confirmed_delivery_date: null as any,
                        supplierdeliverydatequantitypoallocation_set: [] as any,
                    }
                ]
        }
        setMaterialDetails((prevDetails: { suppliers: any; }) => {
            const updatedSuppliers = [...prevDetails.suppliers];
            updatedSuppliers.push(emptyObject);

            return {
                ...prevDetails,
                suppliers: updatedSuppliers
            };
        });
    }
    const handleCheckboxChange = (inquiry: any) => {
        setSelectedInquiry(inquiry);
    };

    const handleOpenDeleteSupplierModal = (supplierPriceId: any, supplierIndex: any) => {
        setSelectedDeletePriceDetails({modalOpen: true, supplierPriceId: supplierPriceId, supplierIndex: supplierIndex })
    }
    
    const handleOnClickDeleteSupplier = () => {
        if(selectedDeletePriceDetails.supplierPriceId){
            api.delete(poUrls.deleteGeneralPoSupplierMaterial(selectedDeletePriceDetails.supplierPriceId))
            .then(resp => {
                const respData = resp?.data || [];
                toast.success(DEFAULT_SUCCESS);
                fetchData(materialId, generalPoId);
            })
            .catch(error => {
                toast.error(getDefaultError(error?.response?.status));
            })
            .finally(() => {
                setIsDeleting(false);
            });
        }
        const updatedSuppliers = [...materialDetails.suppliers];
        if (updatedSuppliers[selectedDeletePriceDetails.supplierIndex]) {
            updatedSuppliers.splice(selectedDeletePriceDetails.supplierIndex, 1);
        }
        setMaterialDetails({
            ...materialDetails,
            suppliers: updatedSuppliers,
        });
        setSelectedDeletePriceDetails({modalOpen: false, supplierPriceId: null, supplierIndex: null})

    }

    const handleToggle = (supplierIndex: any) => {
        setOpenRows((prevOpenRows: any) => ({
            ...prevOpenRows,
            [`${supplierIndex}`]: !prevOpenRows[`${supplierIndex}`],
        }));
    };

    const handleCompletedSwitch = (event: any) => {
        setMaterialDetails((prevDetails: any) => ({
            ...prevDetails,
            completed: event.target.checked
        }));
    };

    const handleAddSingleDelivery = async () => {
        const copyPOs = materialDetails?.total_value_with_po_breakdown?.purchase_order_boms || [];
        const mappedPOs = copyPOs.map((po: any) => ({
            id: null as any,
            quantity: parseFloat(po?.quantity),
            purchase_order: po?.purchase_order,
        }));

        const supplierData = materialDetails?.suppliers || [];
        const updatedSuppliers = await Promise.all(
            supplierData.map(async (supplier: any) => {
                const generalData = await handleCopySingleDeliveryGeneralData(supplier.id);
                const updatedDeliveries = supplier.deliveries?.map((delivery: any) => ({
                    ...delivery,
                    exmill_date: generalData?.ex_mill_date || null,
                    confirmed_delivery_date: generalData?.delivery_date || null,
                    transport_method: generalData?.transport_method || null,
                    port: generalData?.port || null,
                    supplierdeliverydatequantitypoallocation_set: mappedPOs,
                })) || [];

                return {
                    ...supplier,
                    deliveries: updatedDeliveries,
                };
            })
        );
        setMaterialDetails((prev: any) => ({
            ...prev,
            suppliers: updatedSuppliers,
        }));
    };

    const handleCopySingleDeliveryGeneralData = (supplierId: any) => {
        setIsCopySingleDelivery(true);
        return api
            .get(actualSupplierGeneralMaterialDeliveryMetaDataURL(materialDetails?.po_club_id, supplierId, materialId))
            .then((resp) => {
                return resp?.data || {};
            })
            .catch((error) => {
                toast.error(getDefaultError(error?.response?.status));
                return {};
            })
            .finally(() => {
                setIsCopySingleDelivery(false);
            });
    };

    useEffect(() => {
        if (generalPoId) {
            fetchData(materialId, generalPoId);
        }
    }, [materialId, generalPoId]);

    

    return (
        <>
            {selectedDeletePriceDetails.modalOpen && (
                <RitzModal open={selectedDeletePriceDetails.modalOpen} onClose={() => setSelectedDeletePriceDetails({modalOpen: false, supplierPriceId: null, supplierIndex: null  })} title='Confirmation'>
                    <Box>
                        <Grid container spacing={1} >
                            <Grid item sx={{ display: 'flex', alignItems: 'center' }}>
                                <Typography>  Do you want to delete this supplier detail?</Typography>
                            </Grid>
                        </Grid>
                    </Box>
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'end', gap: 2 }}>
                        <Button variant="contained" color='primary' onClick={() => handleOnClickDeleteSupplier()}>Confirm</Button>
                        <Button variant="contained" color='primary' onClick={() => setSelectedDeletePriceDetails({modalOpen: false, supplierPriceId: null, supplierIndex: null  })}>Cancel</Button>
                    </Box>
                </RitzModal>
            )}
            {openSupplierModal && (
                <RitzModal
                    title={"Select Supplier"}
                    open={openSupplierModal}
                    onClose={handleCloseSupplierModal}
                    maxWidth='md'
                >
                    <Box marginBottom={3}>
                        <Box sx={{ mb: 1 }}><Typography variant='h6' >Supplier</Typography></Box>
                        <Box sx={{ mb: 1 }}>
                            <RitzSelection
                                id={'supplier'}
                                name={'supplier'}
                                optionValue={'supplier_id'}
                                optionText={'supplier_name'}
                                selectedValue={selectedSupplier?.supplier_id}
                                isRequired={true}
                                handleOnChange={(event: any) => { handleSelectedSupplierToAdd(event) }}
                                options={supplierDetails}
                            >
                            </RitzSelection>
                        </Box>
                        <Box sx={{ mb: 1 }}><Typography variant='h6' >Selected Supplier Inquiry Details</Typography></Box>
                        <Box sx={{ mb: 1 }}>
                            {selectedSupplier?.supplier_id ? (
                                <>
                                    <Table>
                                        <TableHead>
                                            <TableRow sx={{ background: theme.palette.grey[100] }}>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold', }}></TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold', }}>S/Reference Code</TableCell>
                                                {selectedMaterialType == 'fabric' && (
                                                    <>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold', }}>Cutting Width</TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold', }}>Cutting Width Unit</TableCell>
                                                    </>
                                                )}
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold', }}>Lead Time</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold', }}>Cost Per Unit</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold', }}>Costing Unit</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold', }}>Price Validity Date</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {selectedSupplier?.inquries?.map((supplierInquiry: any, supplierInquiryIndex: any) => (
                                                <TableRow
                                                    key={supplierInquiryIndex}
                                                    sx={{
                                                        backgroundColor: selectedInquiry?.id === supplierInquiry?.id ? '#c7e7f4' : 'inherit',
                                                    }}>
                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}><Checkbox checked={selectedInquiry?.id === supplierInquiry?.id}   onChange={() => handleCheckboxChange(supplierInquiry)} sx={{ p: 0 }} /></TableCell>
                                                    <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{supplierInquiry?.supplier_material_reference_code}</TableCell>
                                                    {selectedMaterialType == 'fabric' && (
                                                        <>
                                                            <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{supplierInquiry?.cutting_width}</TableCell>
                                                            <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{supplierInquiry?.cutting_width_unit_display}</TableCell>
                                                        </>
                                                    )}
                                                    <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{supplierInquiry?.lead_time}</TableCell>
                                                    <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{supplierInquiry?.cost_per_unit}</TableCell>
                                                    <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{supplierInquiry?.costing_unit_display}</TableCell>
                                                    <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{supplierInquiry?.expiration_date}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </>
                            ):(
                                <Alert severity='info'> No supplier selected. Please select a supplier from the list to view the details.</Alert>
                            )}
                        </Box>
                        {(!selectedInquiry.id && selectedSupplier?.supplier_id) && (
                            <Alert severity='info' variant='outlined' sx={{ border: 0, }}>Please select the correct price from the available inquiries for the selected supplier</Alert>
                        )}

                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}>
                            <Button sx={{ float: 'right', ml: 2 }} variant='contained' disabled={isSaving} onClick={handleSaveSupplier} >{isSaving && <SaveSpinner />}Ok</Button>
                        </Box>
                    </Box>
                     
                </RitzModal>
            )}
            {isLoadNextData ? <DefaultLoader /> :
                <Stack>
                    <Box marginBottom={3}>
                        <Box sx={{ mb: 2 }}><Typography variant='h6' color={'primary'}>Material Detail</Typography></Box>
                        <Card variant='outlined' sx={{ mb: 2 }}>
                            <Grid container columnSpacing={2} px={2}>
                                <Grid item sm={3} xs={12}>
                                    <dl>
                                        <dt>Material</dt>
                                        <dd>{materialDetails.material?.attributes?.material_label || '--'}</dd>
                                    </dl>
                                </Grid>
                                <Grid item sm={3} xs={12}>
                                    <dl>
                                        <dt style={{ marginTop: 5 }}>Customer Reference Code</dt>
                                        <dd>{materialDetails.material?.attributes?.reference_code || '--'}</dd>
                                    </dl>
                                </Grid>
                                <Grid item sm={3} xs={12}>
                                    <dl>
                                        <dt style={{ marginTop: 5 }}>Ritz Reference Code</dt>
                                        <dd>
                                            <Box display="flex" alignItems="center">
                                                {materialDetails.material?.attributes?.ritz_customer_brand_reference_code}
                                            </Box>
                                        </dd>
                                    </dl>
                                </Grid>
                                {materialDetails?.material?.headers?.map((header: any, headerIndex: any) => (
                                    <Grid item sm={3} xs={12} key={headerIndex}>
                                        <dl>
                                            <dt style={{ marginTop: 5 }}>{header.label}</dt>
                                            <dd>
                                                <Box display="flex" alignItems="center">
                                                    {materialDetails?.material?.attributes?.[header.name]}
                                                </Box>
                                            </dd>
                                        </dl>
                                    </Grid>
                                ))}
                            </Grid>
                        </Card>
                    </Box>
                  
                    <>
                        <Box marginBottom={2}>
                            <Box sx={{ mb: 1 }} ><Typography variant='h6' color={'primary'}>Total Quantity Breakdown</Typography></Box>
                                <>
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>PO Number</TableCell>
                                                <TableCell sx={{ borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Required Quantity</TableCell>
                                                <TableCell sx={{ borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Order Quantity ({materialDetails?.total_value_with_po_breakdown?.measuring_unit_display})</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {materialDetails?.total_value_with_po_breakdown?.purchase_order_boms?.map((purchaseOrder: any, purchaseOrderIndex: any) => (
                                                <TableRow key={purchaseOrderIndex}>
                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{purchaseOrder?.po_display_number}</TableCell>
                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{parseFloat(purchaseOrder?.quantity).toFixed(2)} {purchaseOrder?.measuring_unit_display}</TableCell>
                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                        <TextField
                                                            id='order_quantity'
                                                            fullWidth
                                                            autoComplete="off"
                                                            name="order_quantity"
                                                            value={purchaseOrder?.order_quantity}
                                                            onChange={(event) => { handleChange(event, purchaseOrderIndex), handleIndexValue(purchaseOrderIndex) }}
                                                            type="number"
                                                            onFocus={(e) => e.target.addEventListener("wheel", function (e) { e.preventDefault() }, { passive: false })}
                                                        />
                                                        <FormErrorMessage message={actualQuantityErrors?.purchase_order_errors?.[purchaseOrder?.id]} />
                                                    </TableCell>

                                                </TableRow>
                                            ))}

                                            <TableRow>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center', fontWeight: 'bold' }}>Total</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold' }}>{parseFloat(materialDetails?.total_value_with_po_breakdown?.quantity).toFixed(2)} {materialDetails?.total_value_with_po_breakdown?.measuring_unit_display}</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center', fontWeight: 'bold', }}>
                                                    <TextField
                                                        id='order_quantity'
                                                        fullWidth
                                                        autoComplete="off"
                                                        name="order_quantity"
                                                        value={parseFloat(materialDetails?.total_value_with_po_breakdown?.order_quantity).toFixed(2)}
                                                        type="number"
                                                        disabled
                                                        onFocus={(e) => e.target.addEventListener("wheel", function (e) { e.preventDefault() }, { passive: false })}
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                    <FormErrorMessage message={actualQuantityErrors?.purchase_order_errors?.po_total_quantity_error} />
                                    <FormErrorMessage message={actualQuantityErrors?.material_total_order_quantity_error} />
                                </>
                        </Box>
                    </>
                   
                    <Box marginBottom={3}>
                        <Box display="flex" justifyContent="flex-end" alignItems="center">
                            <Box sx={{ mb: 1 }}>
                                 <Button variant="outlined" sx={{mr:2}} disabled={isCopySingleDelivery} onClick={() => handleAddSingleDelivery()} > {isCopySingleDelivery && <SaveSpinner/>}Add Single Delivery </Button>
                                <Button variant="outlined" disabled={isSaving} onClick={() => handleOpenSupplierModal()} >Add New Supplier</Button>
                            </Box>
                        </Box>
                        <React.Fragment >
                            {materialDetails?.suppliers?.map((supplier: any, supplierIndex: any) => (
                                <Card variant="outlined" sx={{ mb: 2, mt: 1 }} key={supplierIndex}>
                                    <CardHeader
                                        title={
                                            <>
                                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                                    <Box sx={{ color: 'primary.main' }}>
                                                        {materialDetails?.material?.attributes?.ritz_customer_brand_reference_code}
                                                        {materialDetails?.material?.attributes?.material_type === 'fabric'&& ` (${supplier?.cutting_width} ${supplier?.cutting_width_unit_display})`}
                                                        - {supplier?.supplier_prices?.supplier_name}
                                                    </Box>
                                                    {!supplier?.is_default_supplier && (
                                                        <Box sx={{ color: 'error.main' }}>
                                                            <Tooltip title="Delete Supplier" arrow>
                                                                <IconButton color='primary' onClick={() => handleOpenDeleteSupplierModal(supplier.general_po_material_price_id, supplierIndex)} >
                                                                    <DeleteForeverIcon style={{ color: '#d32f2f' }} fontSize='inherit'  />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </Box>
                                                    )}
                                                </Box>

                                            </>
                                        }
                                        sx={{
                                            fontWeight: 'bold',
                                            background: (theme) => theme.palette.grey[100],
                                            borderBottom: (theme) => `1px solid ${theme.palette.grey[300]}`,
                                        }}
                                    ></CardHeader>
                                    <Box sx={{ mb: 1, p: 1 }}>
                                        <Box marginBottom={3}>
                                            <Box sx={{ mb: 1 }} ><Typography variant='h6'>Supplier Prices :</Typography></Box>
                                            <Table>
                                                <TableHead>
                                                    <TableRow>
                                                        <TableCell sx={{ borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Supplier Reference Code</TableCell>
                                                        <TableCell sx={{ borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Lead Time</TableCell>
                                                        <TableCell sx={{ borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Excess Threshold</TableCell>
                                                        <TableCell sx={{ borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Costing Price</TableCell>
                                                        <TableCell sx={{ borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Order Price</TableCell>
                                                        <TableCell sx={{ borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Order Price Unit</TableCell>
                                                        <TableCell sx={{ borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Discount ( % )</TableCell>
                                                        <TableCell sx={{ borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Transport Method</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    <TableRow key={supplierIndex}>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{supplier?.supplier_prices?.supplier_material_reference_code}</TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{supplier?.supplier_prices?.lead_time}</TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{}
                                                            <TextField
                                                                id='excess_threshold'
                                                                fullWidth
                                                                autoComplete="off"
                                                                name="excess_threshold"
                                                                value={supplier?.supplier_prices?.excess_threshold}
                                                                onChange={(event: any) => { handleChangeSupplierPrice(event, supplierIndex, 'excess_threshold') }}
                                                                type="number"
                                                                onFocus={(e) => e.target.addEventListener("wheel", function (e) { e.preventDefault() }, { passive: false })}
                                                            />
                                                            <FormErrorMessage message={actualQuantityErrors?.supplier_price_errors?.[supplierIndex]?.excess_threshold} />
                                                        </TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{supplier?.supplier_prices?.cost_per_unit} {supplier?.costing_unit_display}</TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                            <TextField
                                                                id='order_price'
                                                                fullWidth
                                                                autoComplete="off"
                                                                name="order_price"
                                                                value={supplier?.supplier_prices?.order_price}
                                                                onChange={(event: any) => { handleChangeSupplierPrice(event, supplierIndex, 'order_price') }}
                                                                type="number"
                                                                onFocus={(e) => e.target.addEventListener("wheel", function (e) { e.preventDefault() }, { passive: false })}
                                                            />
                                                            <FormErrorMessage message={actualQuantityErrors?.supplier_price_errors?.[supplierIndex]?.order_price} />
                                                        </TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                            <RitzSelection
                                                                id={'order_price_units'}
                                                                name={'order_price_units'}
                                                                optionValue={'value'}
                                                                optionText={'display_value'}
                                                                selectedValue={supplier?.supplier_prices?.order_price_units}
                                                                isRequired={true}
                                                                options={measuringUnits.per_unit_options}
                                                                handleOnChange={(event: any) => { handleChangeSupplierPrice(event, supplierIndex, 'order_price_units') }}
                                                            ></RitzSelection>
                                                        </TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                            <TextField
                                                                id='discount'
                                                                fullWidth
                                                                autoComplete="off"
                                                                name="discount"
                                                                value={supplier?.supplier_prices?.discount}
                                                                onChange={(event: any) => { handleChangeSupplierPrice(event, supplierIndex, 'discount') }}
                                                                type="number"
                                                                onFocus={(e) => e.target.addEventListener("wheel", function (e) { e.preventDefault() }, { passive: false })}
                                                            />
                                                        </TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                        <RitzSelection
                                                                id={'transport_method'}
                                                                name={'transport_method'}
                                                                optionValue={'type'}
                                                                optionText={'name'}
                                                                selectedValue={supplier?.supplier_prices?.transport_method}
                                                                isRequired={true}
                                                                options={transportMetaData.freight_types}
                                                                handleOnChange={(event: any) => { handleChangeSupplierPrice(event, supplierIndex, 'transport_method') }}
                                                            ></RitzSelection>
                                                        <FormErrorMessage message={actualQuantityErrors?.supplier_price_errors?.[supplierIndex]?.transport_method} />
                                                        </TableCell>
                                                    </TableRow>
                                                </TableBody>
                                            </Table>
                                        </Box>
                                        <Box>
                                            <Typography variant='h6'>Delivery Type :</Typography>
                                        </Box>
                                        <Box>
                                            <FormControl>
                                                <RadioGroup
                                                    row
                                                    name="row-radio-buttons-group"
                                                    value={supplier?.delivery_type}
                                                    onChange={(e) => handleRadioChange(e, supplierIndex, 'delivery_type')}
                                                >
                                                    {deliveryTypes?.map((deliveryType, deliveryTypeIndex) => (
                                                        <FormControlLabel
                                                            key={deliveryTypeIndex}
                                                            value={deliveryType.id}
                                                            control={<Radio />}
                                                            label={deliveryType?.type}
                                                        />
                                                    ))}
                                                </RadioGroup>
                                            </FormControl>
                                        </Box>
                                        {supplier?.delivery_type == 'staggered' && (
                                            <>
                                                <Box sx={{ mt: 1 }}>
                                                    <Typography variant='h6'>No. of Deliveries :</Typography>
                                                </Box>
                                                <Box sx={{ mt: 1, width: '25%' }}>
                                                    <RitzInput
                                                        fullWidth
                                                        name={`no_of_deliveries`}
                                                        id={`no_of_deliveries`}
                                                        type={'number'}
                                                        isMulti={false}
                                                        isRequired={true}
                                                        selectedValue={supplier?.no_of_deliveries || ''}
                                                        handleOnChange={(e: any) => handleChangeNoOfDeliveries(e, supplierIndex, 'no_of_deliveries')}
                                                    />
                                                </Box>
                                            </>
                                        )}


                                    </Box>
                                    <Divider />
                                    {supplier.deliveries?.length == 0 ? (
                                        <>
                                            <Alert severity='info' sx={{ mt: 1, mb: 1, mr: 1, ml: 1 }}>Please select the delivery type.</Alert>
                                        </>

                                    ) : (
                                        <>
                                            {supplier?.deliveries?.map((delivery: any, deliveryIndex: any) => {
                                                return (
                                                    <Box sx={{ mb: 1, p: 2 }} key={deliveryIndex}>

                                                        <Box marginBottom={2} >
                                                            <InputLabel sx={{ mb: 1 }}>Quantity ({delivery?.quantity?.quantity_units_display}) :</InputLabel>
                                                            <TextField
                                                                id='quantity'
                                                                name={`quantity`}
                                                                fullWidth
                                                                autoComplete="off"
                                                                value={delivery?.quantity?.quantity || ''}
                                                                onChange={(event: any) => { handleChangeQty(event, supplierIndex, deliveryIndex, 'quantity') }}
                                                                type="number"
                                                                onFocus={(e) => e.target.addEventListener("wheel", function (e) { e.preventDefault() }, { passive: false })}
                                                            />
                                                            <FormErrorMessage message={actualQuantityErrors?.delivery_errors?.[supplierIndex]?.[deliveryIndex]?.quantity} />
                                                        </Box>
                                                        <Box marginBottom={3} >
                                                            <InputLabel sx={{ mb: 1 }}>Delivery Date :</InputLabel>
                                                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                                                <DatePicker
                                                                    minDate={dayjs(Date.now())}
                                                                    format='DD/MM/YYYY'
                                                                    value={delivery?.confirmed_delivery_date ? dayjs(delivery.confirmed_delivery_date) : null}
                                                                    onChange={(e: any) => handleChangeSupplier(dayjs(e.$d).format('YYYY-MM-DD'), supplierIndex, deliveryIndex, 'confirmed_delivery_date')}
                                                                    slotProps={{
                                                                        textField: {
                                                                            size: 'small'
                                                                        }
                                                                    }}
                                                                />
                                                            </LocalizationProvider>
                                                            <FormErrorMessage message={actualQuantityErrors?.delivery_errors?.[supplierIndex]?.[deliveryIndex]?.confirmed_delivery_date} />
                                                        </Box>
                                                        <Box marginBottom={3} >
                                                            <InputLabel sx={{ mb: 1 }}>Exmill Date :</InputLabel>
                                                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                                                <DatePicker
                                                                    minDate={dayjs(Date.now())}
                                                                    format='DD/MM/YYYY'
                                                                    value={delivery?.exmill_date ? dayjs(delivery.exmill_date) : null}
                                                                    onChange={(e: any) => handleChangeSupplier(dayjs(e.$d).format('YYYY-MM-DD'), supplierIndex, deliveryIndex, 'exmill_date')}
                                                                    slotProps={{
                                                                        textField: {
                                                                            size: 'small'
                                                                        }
                                                                    }}
                                                                />
                                                            </LocalizationProvider>
                                                            <FormErrorMessage message={actualQuantityErrors?.delivery_errors?.[supplierIndex]?.[deliveryIndex]?.exmill_date} />
                                                        </Box>
                                                        <Box marginBottom={3} >
                                                            <InputLabel sx={{ mb: 1 }}>Transport Method :</InputLabel>
                                                            <RitzSelection
                                                                id={'transport_method'}
                                                                name={'transport_method'}
                                                                optionValue={'type'}
                                                                optionText={'name'}
                                                                selectedValue={delivery?.transport_method}
                                                                isRequired={true}
                                                                options={transportMetaData.freight_types}
                                                                handleOnChange={(event: any) => { handleChangeSupplier(event.target.value, supplierIndex, deliveryIndex, 'transport_method')}}
                                                            ></RitzSelection>
                                                            <FormErrorMessage message={actualQuantityErrors?.delivery_errors?.[supplierIndex]?.[deliveryIndex]?.transport_method} />
                                                        </Box>
                                                        <Box marginBottom={3} >
                                                            <InputLabel sx={{ mb: 1 }}>Port :</InputLabel>
                                                            <RitzSelection
                                                                id={'port'}
                                                                name={'port'}
                                                                optionValue={'id'}
                                                                optionText={'port_display_value'}
                                                                selectedValue={delivery?.port}
                                                                isRequired={true}
                                                                handleOnChange={(event: any) => { handleChangeSupplier(event.target.value, supplierIndex, deliveryIndex, 'port')}}
                                                                options={transportMetaData?.foreign_ports}
                                                            ></RitzSelection>
                                                            <FormErrorMessage message={actualQuantityErrors?.delivery_errors?.[supplierIndex]?.[deliveryIndex]?.port} />
                                                        </Box>
                                                            <>
                                                                <Box >  <InputLabel sx={{ mb: 1 }}>Allocation Details :</InputLabel></Box>
                                                                <Box display="flex" justifyContent="flex-end" alignItems="center">
                                                                    <Box sx={{ mb: 1 }}>
                                                                        <Button variant="outlined" disabled={isSaving} onClick={() => handleAddNewCustomerPo(supplierIndex, deliveryIndex)}>Add New Customer PO</Button>
                                                                    </Box>
                                                                </Box>
                                                                <Table>
                                                                    <TableHead>
                                                                        <TableRow>
                                                                            <TableCell sx={{ borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01), width: '5%', textAlign: 'center' }}></TableCell>
                                                                            <TableCell sx={{ borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01), width: '30%' }}>Purchase Order</TableCell>
                                                                            <TableCell sx={{ borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01), width: '30%' }}>Quantity ({delivery?.quantity?.quantity_units_display})</TableCell>
                                                                        </TableRow>
                                                                    </TableHead>
                                                                    <TableBody>
                                                                        {delivery?.supplierdeliverydatequantitypoallocation_set?.length == 0 ? (
                                                                            <TableRow><TableCell colSpan={4} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>No available data</TableCell></TableRow>
                                                                        ) : (
                                                                            delivery?.supplierdeliverydatequantitypoallocation_set?.map((allocation: any, allocationIndex: any) => (
                                                                                <TableRow key={allocationIndex}>
                                                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>
                                                                                        <IconButton onClick={() => deleteAllocationPo(allocation.id, supplierIndex, deliveryIndex, allocationIndex)}>
                                                                                            <DeleteForeverIcon style={{ color: '#d32f2f' }} fontSize='inherit' />
                                                                                        </IconButton>
                                                                                    </TableCell>
                                                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                                                        <RitzSelection
                                                                                            id={'purchase_order'}
                                                                                            name={'purchase_order'}
                                                                                            optionValue={'purchase_order'}
                                                                                            optionText={'po_display_number'}
                                                                                            selectedValue={allocation?.purchase_order}
                                                                                            isRequired={true}
                                                                                            options={materialDetails?.total_value_with_po_breakdown?.purchase_order_boms}
                                                                                            handleOnChange={(event: any) => { handleChangeAllocation(event, supplierIndex, deliveryIndex, allocationIndex, 'purchase_order') }}>
                                                                                        </RitzSelection>
                                                                                        <FormErrorMessage message={actualQuantityErrors?.delivery_errors?.[supplierIndex]?.[deliveryIndex]?.allocation_error?.[allocationIndex]?.purchase_order} />
                                                                                    </TableCell>
                                                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                                                        <TextField
                                                                                            id='order_quantity'
                                                                                            fullWidth
                                                                                            autoComplete="off"
                                                                                            name="order_quantity"
                                                                                            value={allocation?.quantity}
                                                                                            onChange={(event) => { handleChangeAllocation(event, supplierIndex, deliveryIndex, allocationIndex, 'quantity') }}
                                                                                            type="number"
                                                                                            onFocus={(e) => e.target.addEventListener("wheel", function (e) { e.preventDefault() }, { passive: false })}

                                                                                        />
                                                                                        <FormErrorMessage message={actualQuantityErrors?.delivery_errors?.[supplierIndex]?.[deliveryIndex]?.allocation_error?.[allocationIndex]?.quantity} />
                                                                                    </TableCell>

                                                                                </TableRow>
                                                                            ))
                                                                        )}
                                                                    </TableBody>
                                                                </Table>
                                                                <FormErrorMessage message={actualQuantityErrors?.delivery_errors?.[supplierIndex]?.[deliveryIndex]?.purchase_order_set} />
                                                            </>
                                                        <Box key={deliveryIndex} sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                                                            {confirmDelete && selectedIndexes.supplierIndex === supplierIndex && selectedIndexes.deliveryIndex === deliveryIndex ? (
                                                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                                    <Typography variant="body2" color="error" sx={{ mr: 1 }}>
                                                                        Are you sure you want to delete this?
                                                                    </Typography>
                                                                    <Tooltip title="Confirm" arrow>
                                                                        <IconButton color='error' onClick={handleDelete} size="small">
                                                                            <CheckIcon />
                                                                        </IconButton>
                                                                    </Tooltip>
                                                                    <Tooltip title="Cancel" arrow>
                                                                        <IconButton color='primary' onClick={() => setConfirmDelete(false)} size="small" sx={{ ml: 1 }}>
                                                                            <CloseIcon />
                                                                        </IconButton>
                                                                    </Tooltip>
                                                                </Box>
                                                            ) : (
                                                                <Link color='error' sx={{ cursor: 'pointer' }} onClick={() => handleOpenDelete(supplierIndex, deliveryIndex, delivery.id, supplier?.deliveries.length)}>Delete</Link>
                                                            )}
                                                        </Box>
                                                        <FormErrorMessage message={actualQuantityErrors?.delivery_errors?.[supplierIndex]?.[deliveryIndex]?.total_allocation_quantity_error} />
                                                        <Divider sx={{ mt: 2 }} />
                                                    </Box>
                                                )
                                            })}
                                        </>
                                    )}

                                </Card>
                            ))}
                        </React.Fragment>
                    </Box>
                    <Box marginBottom={3}>
                        <Box sx={{ mb: 2 }}><Typography variant='h6' color={'primary'}>Delivery Summary</Typography></Box>
                        <Table sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, borderCollapse: 'collapse' }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Supplier</TableCell>
                                    {materialDetails?.material?.attributes?.material_type === 'fabric' && (
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Width</TableCell>
                                    )}
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Order Price</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Total Quantity</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {materialDetails?.delivery_breakdown?.length == 0 ? (
                                    <TableRow>
                                         <TableCell colSpan={4} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign:'center' }}>No Available Data</TableCell>
                                    </TableRow>
                                ):(
                                    materialDetails?.delivery_breakdown?.map((supplier: any, supplierIndex: any) => (
                                        <React.Fragment key={`${supplier.id}`}>
                                            <TableRow>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                    <IconButton
                                                        aria-label="expand row"
                                                        size="small"
                                                        onClick={() => handleToggle(supplierIndex)}
                                                    >
                                                        {openRows[`${supplierIndex}`] ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                                                    </IconButton>
                                                    {supplier?.supplier_name}
                                                </TableCell>
                                                {materialDetails?.material?.attributes?.material_type === 'fabric' && (
                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{supplier?.width} {supplier?.width_display_units}</TableCell>
                                                )}
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{supplier?.order_price} {supplier?.order_price_units}</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{supplier?.total_quantity?.quantity} {supplier?.total_quantity?.quantity_units_display}</TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell style={{ paddingBottom: 0, paddingTop: 0, paddingLeft: '5%', paddingRight: 0 }} colSpan={6} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                    <Collapse in={openRows[`${supplierIndex}`]} timeout="auto" unmountOnExit>
                                                        <Box>
                                                                <Table size="small" aria-label="po allocations" sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, borderCollapse: 'collapse' }}>
                                                                    <TableBody>
                                                                        {supplier?.deliveries?.map((delivery: any, deliveryIndex: any) => (
                                                                            <React.Fragment key={deliveryIndex}>
                                                                                <TableRow sx={{ background: (theme) => darken(theme.palette.grey[50], 0.01) }} >
                                                                                    <TableCell colSpan={2} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                                                        <Grid container spacing={2}>
                                                                                            <Grid item xs={12} sm={16} md={2}>
                                                                                                <Box component="div">
                                                                                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Delivery Date</Typography>
                                                                                                    <Typography >{delivery?.delivery_date}</Typography>
                                                                                                </Box>
                                                                                            </Grid>
                                                                                            <Divider orientation="vertical" flexItem sx={{ mt: 2 }} />
                                                                                            <Grid item xs={12} sm={16} md={3}>
                                                                                                <Box component="div">
                                                                                                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Quantity</Typography>
                                                                                                    <Typography>{delivery.quantity?.quantity} {delivery.quantity?.quantity_units_display}</Typography>
                                                                                                </Box>
                                                                                            </Grid>
                                                                                        </Grid>
                                                                                    </TableCell>
                                                                                </TableRow>
                                                                                <TableRow >
                                                                                    <TableCell colSpan={2} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                                                        <Typography  variant="subtitle2"sx={{ fontWeight: 'bold' }} color='primary'>Allocation Details </Typography>
                                                                                    </TableCell>
                                                                                </TableRow>
                                                                                <TableRow sx={{ background: (theme) => darken(theme.palette.grey[50], 0.01) }}>
                                                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>PO Number</TableCell>
                                                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Quantity</TableCell>
                                                                                </TableRow>
                                                                                {delivery.po_allocations?.map((allocation: any) => (
                                                                                    <TableRow key={allocation.id}>
                                                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                                                            <Link target="_blank" component={NextLink} href={purchaseOrderDetailPageURL(allocation.purchase_order_id)}> {allocation.purchase_order_display_number} </Link>
                                                                                        </TableCell>
                                                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{allocation.quantity?.quantity} {allocation.quantity?.quantity_units_display}</TableCell>
                                                                                    </TableRow>
                                                                                ))}
                                                                            </React.Fragment>
                                                                        ))}
                                                                    </TableBody>
                                                                </Table>
                                                        </Box>
                                                    </Collapse>
                                                </TableCell>
                                            </TableRow>
                                        </React.Fragment>
                                    ))
                                )}
                                
                            </TableBody>
                        </Table>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                        <RitzSwitch name="Complete Status" status={materialDetails?.completed} handleChangeSwitch={handleCompletedSwitch} isReadOnly={generalPOType ? true : false} />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}>
                    <Button sx={{ float: 'right', ml: 2 }} variant='contained' disabled={isSaving} onClick={()=>{handleSaveData('save')}} >{isSaving && <SaveSpinner />}Save</Button>
                        <Button sx={{ float: 'right', ml: 2 }} variant='contained' disabled={isSaving} onClick={()=>{handleSaveData('save_next')}} >{isSaving && <SaveSpinner />}Save & Next</Button>
                    </Box>
                </Stack>

            }</>
    );
};

export default GeneralPOActualSupplierBomDetail;