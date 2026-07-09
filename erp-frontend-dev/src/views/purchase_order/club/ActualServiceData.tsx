import React, { useEffect, useState } from "react";
import api from "@/services/api";
import { toast } from "react-hot-toast";
import { getDefaultError } from "@/helpers/Utilities";
import DefaultLoader from "@/components/DefaultLoader";
import { Alert, Box, Button, Card, darken, Divider, Grid, IconButton, Link, Table, TableBody, TableCell, TableHead, TableRow, TextField, Tooltip, Typography, useTheme } from "@mui/material";
import RitzInput from "@/components/Ritz/RitzInput";
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from "dayjs";
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import RitzSearchableSelection from "@/components/Ritz/RitzSearchableSelection";
import { serviceSuppliersURL } from "@/helpers/constants/RestUrls";
import SaveSpinner from "@/components/SaveSpinner";
import { poClubServicePODeliveryCreateURL, poClubServicePODeliveryDetailsURL } from "@/helpers/constants/rest_urls/POUrls";
import { DEFAULT_SUCCESS } from "@/helpers/constants/Constants";
import FormErrorMessage from "@/components/FormErrorMessage";
import RitzSelection from "@/components/Ritz/RitzSelection";
import { paymentCurrencyListURL } from "@/helpers/constants/rest_urls/FinanceUrls";
import { purchaseOrderDetailPageURL } from "@/helpers/constants/FrontEndUrls";
import { ReactKeyHelper } from "@/helpers/KeyHelper";
import RitzSwitch from "@/components/Ritz/RitzSwitch";

const ActualServiceData = ({ serviceId, refreshData, serviceDataList }: any) => {
    const theme = useTheme();
    const keyHelper = new ReactKeyHelper();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [selectedDeletedData, setSelectedDeleteData] = useState<any>({ serviceIndex: null, });
    const [suppliers, setSuppliers] = useState<any>([]);
    const [errors, setErrors] = useState<any>({});
    const [deletedDeliveryIds, setDeletedDeliveryIds] = useState<any>([]);
    const [measuringUnits, setMeasuringUnits] = useState<any>({});
    const [actualServiceDetails, setActualServiceDetails] = useState<any>({
        generalserviceposervicedelivery_set: [],
        no_of_deliveries: 0,
        total_value_with_po_breakdown: {}
    });

    const fetchMetaData = (selectedServiceId: any) => {
        setDeletedDeliveryIds([]);
        setIsLoading(true)
        const requests = [
            api.get(serviceSuppliersURL(selectedServiceId)),
            api.get(paymentCurrencyListURL()),
        ]
        if (selectedServiceId) {
            requests.push(api.get(poClubServicePODeliveryDetailsURL(selectedServiceId)));
        }
        Promise.all(requests).then(resp => {
            const respData = resp.map((r: any) => r.data);
            const [suppliers, currency, serviceDetails] = respData;
            setSuppliers([...suppliers]);
            setMeasuringUnits([...currency])
            if(selectedServiceId){
                setActualServiceDetails({ ...serviceDetails })
            }
            // if (serviceDetails?.no_of_deliveries === 0) {
            //     handleChangeNoOfDates(1, serviceDetails?.purchase_order_breakdown) // need to show atleast one delivery date -temp remove this- need to review
            // }
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false);
        });
    }

    const handleChangeNoOfDates = (value: any, initialData: any) => {
        if (isNaN(value) || value < 0) return;
        if (value > 10) {
            toast.error("The number of deliveries must be less than 10. Please adjust the quantity.");
            return;
        }
        let updatedServiceData = [...actualServiceDetails.generalserviceposervicedelivery_set];
        if (updatedServiceData.length > value) {
            toast.error("Mismatch detected: The number of deliveries does not match the expected value. Please try again.");
            return;
        }
        if (value > updatedServiceData.length) {
            const newEntries = Array(value - updatedServiceData.length).fill({
                id: null as any,
                actual_send_date: null as any,
                planned_send_date: null,
                general_service_po_supplier_price_id: null as any,
                general_service_po_delivery_po_allocation: {
                    purchase_order: initialData?.purchase_order_id,
                    purchase_order_display_number: initialData?.purchase_order_display_number,
                    quantity: initialData?.order_quantity?.quantity,
                }
            });
            updatedServiceData = [...updatedServiceData, ...newEntries];
        } else {
            updatedServiceData = updatedServiceData.slice(0, value);
        }
        setActualServiceDetails((prevState: any) => ({
            ...prevState,
            no_of_deliveries: value,
            generalserviceposervicedelivery_set: updatedServiceData
        }));
    };

    const handleDelete = (mainIndex: any, deletedId: any) => {
        const updatedServiceData = [...actualServiceDetails.generalserviceposervicedelivery_set];
        updatedServiceData.splice(mainIndex, 1);
        const updatedNoOfDates = updatedServiceData.length;
        setActualServiceDetails((prevState: any) => ({
            ...prevState,
            generalserviceposervicedelivery_set: updatedServiceData,
            no_of_deliveries: updatedNoOfDates,
        }));
        if (deletedId) {
            setDeletedDeliveryIds((prevDeletedIds: any) => [...prevDeletedIds, deletedId]);
        }
        setConfirmDelete(false);
    };

    const handleOpenDelete = (supplierIndex: any, id: any) => {
        setSelectedDeleteData({ serviceIndex: supplierIndex, delectedId: id });
        setConfirmDelete(true);
    };

    const handleChangeServiceDeliveryData = (value: any, key: any, index: any) => {
        const updatedServiceData = [...actualServiceDetails.generalserviceposervicedelivery_set];
        updatedServiceData[index] = {
            ...updatedServiceData[index],
            [key]: value
        };
        setActualServiceDetails((prevState: any) => ({
            ...prevState,
            generalserviceposervicedelivery_set: updatedServiceData
        }));
    };

    const handleDeliveryQuantityChange = (value: any, serviceIndex: number) => {
        const updatedServiceData = [...actualServiceDetails.generalserviceposervicedelivery_set];
        updatedServiceData[serviceIndex] = {
            ...updatedServiceData[serviceIndex],
            general_service_po_delivery_po_allocation: {
                ...updatedServiceData[serviceIndex].general_service_po_delivery_po_allocation,
                quantity: value,
            },
        };
        setActualServiceDetails((prevDetails: any) => ({
            ...prevDetails,
            generalserviceposervicedelivery_set: updatedServiceData,
        }));
    };

    const handleChangeSupplierPrice = (value: any, supplierIndex: number, field: string) => {
        const updatedPrices = [...actualServiceDetails.price_breakdown];
        if (updatedPrices[supplierIndex]) {
            updatedPrices[supplierIndex][field] = value;
        }
        setActualServiceDetails({
            ...actualServiceDetails,
            price_breakdown: updatedPrices
        });
    };

    const handleSave = (savedType: any) => {
        setErrors({})
        const dataList = {
            deleted_delivery_ids: deletedDeliveryIds,
            no_of_deliveries: actualServiceDetails?.no_of_deliveries,
            price_breakdown: actualServiceDetails?.price_breakdown,
            purchase_order_breakdown: actualServiceDetails?.purchase_order_breakdown,
            completed: actualServiceDetails?.completed,
            generalserviceposervicedelivery_set: actualServiceDetails?.generalserviceposervicedelivery_set?.map((service: any) => ({
                id: service?.id,
                general_service_po_supplier_price_id: service?.general_service_po_supplier_price_id || null,
                quantity: service?.general_service_po_delivery_po_allocation?.quantity || null,
                planned_send_date: service?.planned_send_date,
                actual_send_date: service?.actual_send_date,
            })),
        }
        api.post(poClubServicePODeliveryCreateURL(actualServiceDetails?.id), dataList).then(resp => {
            const respData = resp?.data || {};
            toast.success(DEFAULT_SUCCESS);
            refreshData();
            if (savedType == 'save_next') {
                handlePendingMaterials(respData.id)
            }
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
            setErrors({ ...error?.response?.data });
        });
    }
    const handlePendingMaterials = (materialIdToRemove: any) => {
        const findCurrentIndex = serviceDataList.findIndex((material: { id: any}) => material.id === materialIdToRemove);
        if (findCurrentIndex === serviceDataList.length - 1) {
            refreshData(true)
            return;
        }
        setActualServiceDetails({})
        fetchMetaData(serviceDataList[(findCurrentIndex + 1)].id);
    };
    useEffect(() => {
        if (serviceId) {
            fetchMetaData(serviceId);
        }
    }, [serviceId]);

    useEffect(() => {
        if (actualServiceDetails?.no_of_deliveries===0) {
            handleChangeNoOfDates(1, actualServiceDetails?.purchase_order_breakdown)
        }
    }, [actualServiceDetails]);

    return (
        <>
            {isLoading ? <DefaultLoader /> :
                <>
                    <Box marginBottom={3}>
                        <Box sx={{ mb: 2 }}><Typography variant='h6' color={'primary'}>Service Detail</Typography></Box>
                        <Card variant='outlined' sx={{ mb: 2 }}>
                            <Grid container columnSpacing={2} px={2}>
                                {actualServiceDetails?.service_detail?.technique ? (
                                    <Grid item sm={3} xs={12}>
                                        <dl>
                                            <dt>Technique</dt>
                                            <dd>{actualServiceDetails.service_detail?.technique || '--'}</dd>
                                        </dl>
                                    </Grid>
                                ) : (
                                    <>
                                        <Grid item sm={3} xs={12}>
                                            <dl>
                                                <dt>Service</dt>
                                                <dd>{actualServiceDetails.service_detail?.type || '--'}</dd>
                                            </dl>
                                        </Grid>
                                        <Grid item sm={3} xs={12}>
                                            <dl>
                                                <dt style={{ marginTop: 5 }}>Service Type</dt>
                                                <dd>{actualServiceDetails.service_detail?.sub_type || '--'}</dd>
                                            </dl>
                                        </Grid>
                                    </>
                                )}

                                <Grid item sm={3} xs={12}>
                                    <dl>
                                        <dt style={{ marginTop: 5 }}>Item</dt>
                                        <dd>
                                            <Box display="flex" alignItems="center">
                                                {actualServiceDetails.item_name}
                                            </Box>
                                        </dd>
                                    </dl>
                                </Grid>
                                <Grid item sm={3} xs={12}>
                                    <dl>
                                        <dt style={{ marginTop: 5 }}>Size</dt>
                                        <dd>
                                            <Box display="flex" alignItems="center">
                                                {actualServiceDetails.size}
                                            </Box>
                                        </dd>
                                    </dl>
                                </Grid>
                                <Grid item sm={3} xs={12}>
                                    <dl>
                                        <dt style={{ marginTop: 5 }}>Country</dt>
                                        <dd>
                                            <Box display="flex" alignItems="center">
                                                {actualServiceDetails.country}
                                            </Box>
                                        </dd>
                                    </dl>
                                </Grid>
                            </Grid>
                        </Card>
                    </Box>
                    <Box marginBottom={3}>
                        <Box sx={{ mb: 1 }} ><Typography variant='h6' color={'primary'}>Supplier Prices </Typography></Box>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Supplier</TableCell>
                                    <TableCell sx={{ borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Lead Time</TableCell>
                                    <TableCell sx={{ borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Costing Price</TableCell>
                                    <TableCell sx={{ borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Order Price</TableCell>
                                    <TableCell sx={{ borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Order Price Unit</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {actualServiceDetails?.price_breakdown?.map((supplier: any, supplierIndex: number) => (
                                    <TableRow key={`${keyHelper.getNextKeyValue()}`} >
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{supplier?.supplier_name}</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                            <TextField
                                                id='lead_time'
                                                fullWidth
                                                autoComplete="off"
                                                name="lead_time"
                                                value={supplier?.lead_time}
                                                onChange={(event: any) => { handleChangeSupplierPrice(parseFloat(event?.target.value), supplierIndex, 'lead_time') }}
                                                type="number"
                                                onFocus={(e) => e.target.addEventListener("wheel", function (e) { e.preventDefault() }, { passive: false })}
                                            />
                                            <FormErrorMessage message={errors?.price_breakdown_errors?.[supplierIndex]?.lead_time} />
                                        </TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{supplier?.costing_price || 0} {supplier?.costing_price_units}</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                            <TextField
                                                id='price'
                                                fullWidth
                                                autoComplete="off"
                                                name="price"
                                                value={supplier?.price}
                                                onChange={(event: any) => { handleChangeSupplierPrice(parseFloat(event?.target.value), supplierIndex, 'price') }}
                                                type="number"
                                                onFocus={(e) => e.target.addEventListener("wheel", function (e) { e.preventDefault() }, { passive: false })}
                                            />
                                            <FormErrorMessage message={errors?.price_breakdown_errors?.[supplierIndex]?.price} />
                                        </TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                            <RitzSelection
                                                id={'price_currency'}
                                                name={'price_currency'}
                                                optionValue={'id'}
                                                optionText={'name'}
                                                selectedValue={supplier?.price_currency}
                                                isRequired={true}
                                                options={measuringUnits}
                                                handleOnChange={(event: any) => { handleChangeSupplierPrice(event?.target.value, supplierIndex, 'price_currency') }}
                                            ></RitzSelection>
                                            <FormErrorMessage message={errors?.price_breakdown_errors?.[supplierIndex]?.price_currency} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Box>
                    <Box sx={{ mb: 1 }} ><Typography variant='h6' color={'primary'}>Total Quantity Breakdown</Typography></Box>
                    <>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>PO Number</TableCell>
                                    <TableCell sx={{ borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Required Quantity ({actualServiceDetails?.purchase_order_breakdown?.required_quantity?.quantity_units_display})</TableCell>
                                    <TableCell sx={{ borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Order Quantity ({actualServiceDetails?.purchase_order_breakdown?.order_quantity?.quantity_units_display})</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <TableRow >
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}><Link sx={{ cursor: 'pointer' }} href={purchaseOrderDetailPageURL(actualServiceDetails?.purchase_order_breakdown?.purchase_order_id)}>{actualServiceDetails?.purchase_order_breakdown?.purchase_order_display_number}</Link></TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{actualServiceDetails?.purchase_order_breakdown?.required_quantity?.quantity}</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{actualServiceDetails?.purchase_order_breakdown?.order_quantity?.quantity}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>

                    </>
                    <Box sx={{ mb: 1, mt: 2 }} ><Typography variant='h6' color={'primary'}>No of Deliveries :</Typography></Box>
                    <Box sx={{ mt: 1, width: '25%' }}>
                        <RitzInput
                            fullWidth
                            name={`no_of_deliveries`}
                            id={`no_of_deliveries`}
                            type={'number'}
                            isMulti={false}
                            isRequired={true}
                            selectedValue={actualServiceDetails?.no_of_deliveries || ''}
                            handleOnChange={(event: any) => { handleChangeNoOfDates(Number(event.target.value), actualServiceDetails?.purchase_order_breakdown) }}
                        />
                    </Box>
                    {actualServiceDetails?.generalserviceposervicedelivery_set?.length === 0 && (
                        <Alert sx={{ mt: 2 }} severity="info">No delivery dates found. Please provide the number of deliveries to proceed</Alert>
                    )}
                    {actualServiceDetails?.generalserviceposervicedelivery_set?.map((service: any, serviceMainindex: number) => (
                        <Card variant="outlined" sx={{ mb: 2, mt: 1 }} key={`${keyHelper.getNextKeyValue()}`}>
                            <Box sx={{ mb: 1, p: 1 }}>
                                <Grid container spacing={2} alignItems="center">
                                    <Grid item xs={4}>
                                        <Typography variant="h6">Actual Send Date</Typography>
                                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                                            <DatePicker
                                                format="DD/MM/YYYY"
                                                value={service?.actual_send_date ? dayjs(service?.actual_send_date) : null}
                                                onChange={(e: any) =>
                                                    handleChangeServiceDeliveryData(dayjs(e.$d).format("YYYY-MM-DD"), "actual_send_date", serviceMainindex)
                                                }
                                            />
                                        </LocalizationProvider>
                                        <FormErrorMessage message={errors?.delivery_errors?.[serviceMainindex]?.actual_send_date} />
                                    </Grid>
                                    <Grid item xs={4}>
                                        <Typography variant="h6">Plan Send Date</Typography>
                                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                                            <DatePicker
                                                format="DD/MM/YYYY"
                                                value={service?.planned_send_date ? dayjs(service?.planned_send_date) : null}
                                                onChange={(e: any) =>
                                                    handleChangeServiceDeliveryData(dayjs(e.$d).format("YYYY-MM-DD"), "planned_send_date", serviceMainindex)
                                                }
                                            />
                                        </LocalizationProvider>
                                        <FormErrorMessage message={errors?.delivery_errors?.[serviceMainindex]?.planned_send_date} />
                                    </Grid>
                                    <Grid item xs={4}>
                                        <Typography variant="h6">Supplier</Typography>
                                        <RitzSearchableSelection
                                            options={suppliers}
                                            placeholder="Select..."
                                            selectedValue={service?.general_service_po_supplier_price_id}
                                            handleOnChange={(selectedOrderID: any) => handleChangeServiceDeliveryData(selectedOrderID, 'general_service_po_supplier_price_id', serviceMainindex)}
                                            id={'general_service_po_supplier_price_id'}
                                            name={'general_service_po_supplier_price_id'}
                                            optionValue={'general_service_po_supplier_price_id'}
                                            optionText={'supplier_name'}
                                        />
                                        <FormErrorMessage message={errors?.delivery_errors?.[serviceMainindex]?.general_service_po_supplier_price_id} />
                                    </Grid>
                                </Grid>
                            </Box>
                            <Divider sx={{ mt: 1 }} />
                            <Box>
                                <Box sx={{ mt: 2 }}>
                                    <Table>
                                        <TableHead>
                                            <TableRow sx={{ background: theme.palette.grey[100] }}>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%', textAlign: 'left' }}>Purchase Order</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '35%', textAlign: 'left' }}>Quantity</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            <TableRow key={serviceMainindex}>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}><Link sx={{ cursor: 'pointer' }} href={purchaseOrderDetailPageURL(actualServiceDetails?.purchase_order_breakdown?.purchase_order_id)}>{actualServiceDetails?.purchase_order_breakdown?.purchase_order_display_number}</Link></TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>
                                                    <TextField
                                                        id='quantity'
                                                        fullWidth
                                                        autoComplete="off"
                                                        name="quantity"
                                                        value={service?.general_service_po_delivery_po_allocation?.quantity}
                                                        onChange={(event: any) => { handleDeliveryQuantityChange(parseFloat(event?.target?.value), serviceMainindex) }}
                                                        type="number"
                                                        onFocus={(e) => e.target.addEventListener("wheel", function (e) { e.preventDefault() }, { passive: false })}
                                                    />
                                                    <FormErrorMessage message={errors?.delivery_errors?.[serviceMainindex]?.quantity} />
                                                </TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </Box>
                            </Box>
                            <Box key={serviceMainindex} sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                                {confirmDelete && selectedDeletedData.serviceIndex === serviceMainindex ? (
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                        <Typography variant="body2" color="error" sx={{ mr: 1 }}>
                                            Are you sure you want to delete this?
                                        </Typography>
                                        <Tooltip title="Confirm" arrow>
                                            <IconButton color='error' onClick={() => { handleDelete(serviceMainindex, selectedDeletedData?.delectedId) }} size="small">
                                                <CheckIcon />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Cancel" arrow>
                                            <IconButton color='primary' onClick={() => setConfirmDelete(false)} size="small" sx={{ ml: 1, mr: 1 }}>
                                                <CloseIcon />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                ) : (
                                    <Link color='error' sx={{ cursor: 'pointer', mr: 2, mb: 1 }} onClick={() => handleOpenDelete(serviceMainindex, service.id)}>Delete</Link>
                                )}
                            </Box>
                        </Card>
                    ))}
                    {Object.keys(errors?.total_quantity_error || {}).length > 0 && (
                        <Alert severity="error">{errors?.total_quantity_error}</Alert>
                    )}
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                        <RitzSwitch name="Complete Status" handleChangeSwitch={(event: any) => {
                            setActualServiceDetails((prev: any) => ({
                                ...prev,
                                completed: event.target.checked,
                            }));
                        }} status={actualServiceDetails?.completed} />
                    </Box>
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button variant="contained" disabled={isSaving} onClick={()=>{handleSave('save')}}>
                            {isSaving && <SaveSpinner />}Save
                        </Button>
                        <Button sx={{ml:2}} variant="contained" disabled={isSaving} onClick={()=>{handleSave('save_next')}}>
                            {isSaving && <SaveSpinner />}Save & Next
                        </Button>
                    </Box>
                </>
            }
        </>
    )
}

export default ActualServiceData;
