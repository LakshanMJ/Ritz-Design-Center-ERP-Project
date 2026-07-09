import React, { useEffect, useState } from 'react';
import { formatAmount, getDefaultError } from '@/helpers/Utilities';
import toast from 'react-hot-toast';
import { Alert, Box, Button, Checkbox, IconButton, Link, Table, TableBody, TableCell, TableHead, TableRow, TextField, Tooltip, Typography, useTheme } from '@mui/material';
import DefaultLoader from '@/components/DefaultLoader';
import { ReactKeyHelper } from '@/helpers/KeyHelper';
import api from '@/services/api';
import { createOutgoingPaymentURL, dueCommercialInvoiceListURL, dueSupplierPOListURL, financePaymentMethodsURL, outgoingPaymentDetailsURL, outgoingPaymentStateListURL, paymentCurrencyListURL, pclListToDropdownURL, reCalculateInterestCharge, supplierPODeliveryInvoiceDeleteURL, updateOutgoingPaymentURL} from '@/helpers/constants/rest_urls/FinanceUrls';
import { useRouter } from 'next/router';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from "dayjs";
import SaveSpinner from "@/components/SaveSpinner";
import { DEFAULT_SUCCESS } from '@/helpers/constants/Constants';
import RitzInput from '@/components/Ritz/RitzInput';
import RitzSelection from '@/components/Ritz/RitzSelection';
import FormErrorMessage from '@/components/FormErrorMessage';
import DownloadIcon from '@mui/icons-material/Download';
import RitzSearchableServerRender from '@/components/Ritz/RitzSearchableServerRender';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { commercialInvoiceSummaryPageURL, pclSummaryDetailsPageURL } from '@/helpers/constants/front_end/FinanceUrls';
import NextLink from 'next/link';
import SyncIcon from '@mui/icons-material/Sync';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

const CreateOutgoingPayment = ({ outgoingPaymentId, handleSavedData }: any) => {

    const advancePaymentKey = 'advance_payment';
    const invoiceKey = 'invoice';
    const pclKey = 'pcl'

    const router = useRouter();
    const keyHelper = new ReactKeyHelper();
    const theme = useTheme()
    const [isLoading, setIsLoading] = useState(true);
    const [isCalculateInterestCharge, setIsCalculateInterestCharge] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [outgoingPaymentDetails, setOutgoingPaymentDetails] = useState<any>({ payment_type: pclKey , selected_invoices_or_spos: [], pcl_bank_information_id: null })
    const [paymentMethods, setPaymentMethods] = useState<any>([])
    const [currencyList, setCurrencyList] = useState<any>([])
    const [temporarySelectedData, setTemporarySelectedData] = useState<any>({})

    const [selectedInvoiceDeleteData, setSelectedInvoiceDeleteData] = useState<any>({ spoInvoiceIndex: null , selectedDeleteId: null});
    const [confirmDelete, setConfirmDelete] = useState(false);

    const [dueAdvancePayments, setDueAdvancePayments] = useState<any>([]);
    const [dueInvoices, setDueInvoices] = useState<any>([]);
    const [duePCLFacility, setDuePCLFacilities] = useState<any>([]);
    const [outgoingPaymentStates, setOutgoingPaymentStates] = useState<any>([]);

    const [errors, setErrors] = useState<any>({});

    const fetchData = (outgoingPaymentId: any) => {
        setErrors({})
        const requests = [
            api.get(financePaymentMethodsURL()),
            api.get(paymentCurrencyListURL()),
            api.get(outgoingPaymentStateListURL()),
        ];
        if (outgoingPaymentId) {
            requests.push(api.get(outgoingPaymentDetailsURL(outgoingPaymentId)));
        }
        Promise.all(requests).then(resp => {
            const respData = resp.map((r: any) => r.data);
            const [paymentMethods, currencyData, states, outgoingPaymentDetails] = respData;
            setPaymentMethods([...paymentMethods])
            setOutgoingPaymentStates([...states])
            setCurrencyList([...currencyData])
            if (outgoingPaymentId) {
                setOutgoingPaymentDetails({ ...outgoingPaymentDetails })
            }
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoading(false));
    }

    const handleCreate = () => {
        setIsSaving(true)
        const saveDataSet = {
            pcl_bank_information_id: outgoingPaymentDetails?.pcl_bank_information_id || null,
            selected_invoices_or_spos: outgoingPaymentDetails?.selected_invoices_or_spos || [],
            payment_type: outgoingPaymentDetails?.payment_type || null,
            payment_date: outgoingPaymentDetails?.payment_date || null,
            pcl_settle_date: outgoingPaymentDetails?.payment_type === pclKey ? outgoingPaymentDetails?.pcl_settle_date || null : null,
            pcl_create_date: outgoingPaymentDetails?.payment_type === pclKey ? outgoingPaymentDetails?.pcl_create_date || null : null,
            pcl_end_date: outgoingPaymentDetails?.payment_type === pclKey ? outgoingPaymentDetails?.pcl_end_date || null : null,
            interest_charge: outgoingPaymentDetails?.interest_charge || null, 
            interest_charge_currency:  outgoingPaymentDetails?.interest_charge_currency || null, 
            interest_rate: outgoingPaymentDetails?.interest_rate || null,
            state: outgoingPaymentDetails?.state  || null
        }
        const request = {
            method: 'post',
            url: updateOutgoingPaymentURL(outgoingPaymentId),
            data: saveDataSet,
        };
        api.request(request).then(resp => {
            toast.success(DEFAULT_SUCCESS);
            // handleSavedData()
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
            setErrors({ ...error?.response?.data })
        }).finally(() => setIsSaving(false));
    }

    const handleChangeUniqueInputs = (field: string, value: any) => {
        setOutgoingPaymentDetails((prevDetails: any) => {
            const updatedDetails = { ...prevDetails };
            if (field === 'amount' || field === 'amount_currency') {
                updatedDetails.amount = {
                    ...updatedDetails.amount,
                    [field]: value,
                };
            } else {
                updatedDetails[field] = value;
            }
            return updatedDetails;
        });
    };

    const handleTemporarySelectData = (selectedValue: any, field: string) => {
        const dataSource = field === advancePaymentKey ? dueAdvancePayments : dueInvoices;
        const selectedObject = dataSource.find((item: any) => item.id === selectedValue);

        const newData = selectedObject ? {
            id: selectedObject?.id,
            type: selectedObject?.type,
            amount: selectedObject?.amount,
            paid_amount: selectedObject?.paid_amount,
            balance_amount: selectedObject?.balance,
            due_amount: selectedObject?.due_amount,
            display_number: selectedObject?.display_number,
            supplier_po_delivery_invoice_pcl: null as any,

        }
            : { id: null, type: null, amount: null, paid_amount: null, balance_amount: null, due_amount: null, display_number: null, supplier_po_delivery_invoice_pcl: null };
        setTemporarySelectedData({
            ...temporarySelectedData,
            [field]: newData,
        });
    };

    const handleSelectedPCLFacilityData =(selectedValue: any, field: any)=>{
        const selectedObject = duePCLFacility.find((item: any) => item.id === selectedValue);
        const newData = selectedObject ? {
            pcl_bank_information_id: selectedObject?.id,
            pcl_threshold_amount: selectedObject?.pcl_threshold_amount,
            pcl_balance_amount: selectedObject?.pcl_balance_amount,
            pcl_used_amount: selectedObject?.pcl_used_amount,
            pcl_bank_information_display_number: selectedObject?.display_number
        }
            : { pcl_bank_information_id: null, pcl_threshold_amount: null, pcl_balance_amount: null, pcl_used_amount: null, pcl_bank_information_display_number: null};
        setTemporarySelectedData({
            ...temporarySelectedData,
            [field]: newData,
        });
          
    }

    const handleAddTemporaryDataToMain = (field: string) => {
        const selectedData = temporarySelectedData?.[field];
        if (!selectedData?.id) return;
        setOutgoingPaymentDetails({
            ...outgoingPaymentDetails,
            selected_invoices_or_spos: [...outgoingPaymentDetails.selected_invoices_or_spos, selectedData],
        });
        setTemporarySelectedData({ ...temporarySelectedData, [field]: {} });
    };

    const handleAddFacilityDataToMain = (field: string) => {
        const selectedData = temporarySelectedData?.[field];
        if (!selectedData?.pcl_bank_information_id) return;
        setOutgoingPaymentDetails({
            ...outgoingPaymentDetails,
            pcl_bank_information_id: selectedData.pcl_bank_information_id,
            pcl_threshold_amount: selectedData.pcl_threshold_amount,
            pcl_balance_amount: selectedData.pcl_balance_amount,
            pcl_used_amount: selectedData.pcl_used_amount,
            pcl_bank_information_display_number: selectedData.pcl_bank_information_display_number,
        });
        setTemporarySelectedData({ ...temporarySelectedData, [field]: {} });
    };

    const handleDeleteInvoice = () => {
        if (selectedInvoiceDeleteData?.selectedDeleteId) {
            api.delete(supplierPODeliveryInvoiceDeleteURL(selectedInvoiceDeleteData?.selectedDeleteId)).then(resp => {
                toast.success(DEFAULT_SUCCESS);
                fetchData(outgoingPaymentId)
                setConfirmDelete(false)
            }).catch(error => {
                toast.error(getDefaultError(error?.response?.status));
            }).finally(() => {
                setIsCalculateInterestCharge(false);
            });
        } else {
            const updatedInvoices = [...outgoingPaymentDetails?.selected_invoices_or_spos];
            updatedInvoices.splice(selectedInvoiceDeleteData?.spoInvoiceIndex, 1);
            setOutgoingPaymentDetails((prev: any) => ({
                ...prev,
                selected_invoices_or_spos: updatedInvoices,
            }));
        }
    };

    const handleOpenDelete = (supplierIndex:any, id:any) => {
        setSelectedInvoiceDeleteData({ spoInvoiceIndex: supplierIndex, selectedDeleteId: id});
        setConfirmDelete(true);
    };

    const handleDeletePCLFacilityData = () => {
        setOutgoingPaymentDetails((prev: any) => ({
            ...prev,
            pcl_bank_information_id: null,
        }));
    }

    const handleAmountChange = (invoiceIndex: number, newAmount: number) => {
        const updatedInvoices = [...outgoingPaymentDetails.selected_invoices_or_spos];
        updatedInvoices[invoiceIndex].paid_amount.amount = newAmount;
    
        setOutgoingPaymentDetails({
            ...outgoingPaymentDetails,
            selected_invoices_or_spos: updatedInvoices
        });
    };

    const handleCalculateInterestCharge = () => {
        setIsCalculateInterestCharge(true)
        api.post(reCalculateInterestCharge(outgoingPaymentId)).then(resp => {
            toast.success(DEFAULT_SUCCESS);
            fetchData(outgoingPaymentId)
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsCalculateInterestCharge(false);
        });
    }

    useEffect(() => {
        fetchData(outgoingPaymentId)
    }, [outgoingPaymentId]);

    return (
        <>
            {isLoading ? (
                <DefaultLoader />
            ) : (
                <>
                    <Box sx={{ mb: 1 }}>
                        <Typography sx={{ fontWeight: 'bold', mt: 1, color: "primary", fontSize: '20px' }}>PCL Information</Typography>
                    </Box>

                    <Box>
                        <Box>
                            <Box sx={{width:'50%'}}>
                                <Typography sx={{ fontWeight: 'bold', mb: 1, mt: 1 }}>State :</Typography>
                            </Box>
                            <Box sx={{width:'50%'}}>
                                <RitzSelection
                                    id={'state'}
                                    name={'state'}
                                    optionValue={'id'}
                                    optionText={'name'}
                                    selectedValue={outgoingPaymentDetails.state}
                                    isRequired={true}
                                    options={outgoingPaymentStates}
                                    handleOnChange={(e: any) => handleChangeUniqueInputs('state', e.target.value)}
                                />
                            </Box>
                            <Box sx={{width:'50%'}}>
                                <Typography sx={{ fontWeight: 'bold', mb: 1, mt: 1 }}>Payment Type :</Typography>
                            </Box>
                            <Box sx={{width:'50%'}}>
                                <RitzSelection
                                    id={'payment_method'}
                                    name={'payment_method'}
                                    optionValue={'id'}
                                    optionText={'name'}
                                    selectedValue={outgoingPaymentDetails.payment_type}
                                    isRequired={true}
                                    options={paymentMethods}
                                    handleOnChange={(e: any) => handleChangeUniqueInputs('payment_type', e.target.value)}
                                />
                            </Box>
                            <Box>
                                <Typography sx={{ fontWeight: 'bold', mb: 1, mt: 2 }}>Add PCL / SPO / CI:</Typography>
                            </Box>
                            <Box sx={{ mt: 2 }}>
                                <Table>
                                    <TableBody>
                                        {(outgoingPaymentDetails?.payment_type === pclKey || outgoingPaymentDetails?.payment_type === null) && (
                                            <TableRow>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%' }}>PCL Facility</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%' }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                            <Box sx={{ flex: 1, minWidth: '200px' }}>
                                                                <RitzSearchableServerRender
                                                                    id={"pcl_bank_information"}
                                                                    name={"pcl_bank_information_"}
                                                                    optionValue={"id"}
                                                                    optionText={"display_number"}
                                                                    selectedValue={temporarySelectedData?.pcl_bank_information?.pcl_bank_information_id || null}
                                                                    isRequired={true}
                                                                    handleOnChange={(value: any) => handleSelectedPCLFacilityData(value, 'pcl_bank_information')}
                                                                    optionUrl={(searchtext: string) => pclListToDropdownURL(searchtext)}
                                                                    searchOptionsList={setDuePCLFacilities}
                                                                />
                                                            </Box>
                                                            <Box sx={{ ml: 1 }}>
                                                                <Tooltip title="Add" arrow>
                                                                    <IconButton onClick={() => { handleAddFacilityDataToMain('pcl_bank_information') }}>
                                                                        <DownloadIcon />
                                                                    </IconButton>
                                                                </Tooltip>
                                                            </Box>
                                                    </Box>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                        <TableRow>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%' }}>Commercial Invoice</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%' }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <Box sx={{ flex: 1, minWidth: '200px' }}>
                                                        <RitzSearchableServerRender
                                                            id={[invoiceKey]}
                                                            name={[invoiceKey]}
                                                            optionValue={"id"}
                                                            optionText={"display_number"}
                                                            selectedValue={temporarySelectedData?.invoice?.id || null}
                                                            isRequired={true}
                                                            handleOnChange={(value: any) => handleTemporarySelectData(value, invoiceKey)}
                                                            optionUrl={(searchtext: string) => dueCommercialInvoiceListURL(searchtext)}
                                                            searchOptionsList={setDueInvoices}
                                                        />
                                                    </Box>
                                                    <Box sx={{ ml: 1 }}>
                                                        <Tooltip title="Add" arrow>
                                                        <IconButton onClick={() => {handleAddTemporaryDataToMain(invoiceKey)}}>
                                                                <DownloadIcon />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Box>
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%' }}>Advance Payment</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%' }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <Box sx={{ flex: 1, minWidth: '200px' }}>
                                                        <RitzSearchableServerRender
                                                            id={[advancePaymentKey]}
                                                            name={[advancePaymentKey]}
                                                            optionValue={"id"}
                                                            optionText={"display_number"}
                                                            selectedValue={temporarySelectedData?.advance_payment?.id || null}
                                                            isRequired={true}
                                                            handleOnChange={(value: any) => handleTemporarySelectData(value, advancePaymentKey)}
                                                            optionUrl={(searchtext: string) => dueSupplierPOListURL(searchtext)}
                                                            searchOptionsList={setDueAdvancePayments}
                                                        />
                                                    </Box>
                                                    <Box sx={{ ml: 1 }}>
                                                        <Tooltip title="Add" arrow>
                                                        <IconButton onClick={() => {handleAddTemporaryDataToMain(advancePaymentKey)}}>
                                                                <DownloadIcon />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Box>
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </Box>
                        </Box>
                    </Box>
                    <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button size='small' variant='outlined' sx={{ mr: 2, ml: 0.5 }} onClick={() => {fetchData(outgoingPaymentId)}} disabled={isLoading}>Refresh Data</Button>
                    </Box>
                    <Box sx={{ mt: 1 }}>
                        {outgoingPaymentDetails?.payment_type === pclKey && (
                            <Box sx={{ mb: 2 }}>
                                <Box>
                                    <Typography variant='h6' color='primary.main' sx={{ mt: 2 }}>Selected PCL Details</Typography>
                                </Box>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold', width: '20%' }}>PCL</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold', width: '20%' }}>PCL Threshold (USD)</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold', width: '20%' }}>Used Amount (USD)</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold', width: '20%' }}>Balance Amount (USD)</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold', textAlign: 'center' }}>Action</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {!outgoingPaymentDetails?.pcl_bank_information_id ? (
                                            <TableRow>
                                                <TableCell colSpan={5} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>No available selected PCL Facility</TableCell>
                                            </TableRow>
                                        ) : (
                                            <TableRow>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}><Link component={NextLink} target='_blank' href={pclSummaryDetailsPageURL(outgoingPaymentDetails.pcl_bank_information_id)}>{outgoingPaymentDetails?.pcl_bank_information_display_number}</Link></TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{formatAmount(outgoingPaymentDetails?.pcl_threshold_amount?.amount)}</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{formatAmount(outgoingPaymentDetails?.pcl_used_amount?.amount)}</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{formatAmount(outgoingPaymentDetails?.pcl_balance_amount?.amount)}</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>
                                                    <IconButton color='error' onClick={() => {handleDeletePCLFacilityData()}}>
                                                        <DeleteOutlineIcon fontSize='small' />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </Box>
                        )}
                        <Box>
                            <Box>
                                <Typography variant='h6' color='primary.main' sx={{ mt: 2 }}>Selected SPO/CI Details</Typography>
                            </Box>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold', width:'20%'  }}>SPO / CI</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold', width:'20%' }}>Due Amount (USD)</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold', width:'20%'   }}>Balance (USD)</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold', width:'20%' }}>Paid Amount (USD)</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight: 'bold', textAlign: 'center' }}>Action</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {outgoingPaymentDetails?.selected_invoices_or_spos?.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>No available selected SPO/CI</TableCell>
                                        </TableRow>
                                    ) : (
                                        outgoingPaymentDetails?.selected_invoices_or_spos?.map((invoiceData: any, invoiceIndex: any) => (
                                            <TableRow key={`${keyHelper.getNextKeyValue()}`}>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                    <Link component={NextLink} target='_blank' href={invoiceData?.type === 'outgoing'? commercialInvoiceSummaryPageURL(invoiceData.id): '#'}>{invoiceData?.display_number}</Link>
                                                </TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{formatAmount(invoiceData?.amount?.amount)}</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{formatAmount(invoiceData?.balance_amount?.amount)}</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                    <TextField
                                                        id='amount'
                                                        fullWidth
                                                        autoComplete="off"
                                                        name="amount"
                                                        type='number'
                                                        value={invoiceData?.paid_amount?.amount}
                                                        onChange={(e: any) => handleAmountChange(invoiceIndex, parseFloat(e.target.value))}
                                                        onFocus={(e) => e.target.addEventListener("wheel", function (e) { e.preventDefault() }, { passive: false })}
                                                    />
                                                    <FormErrorMessage message={errors?.selected_invoices_or_spos_errors?.[invoiceIndex]?.error} />
                                                </TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>
                                                    {confirmDelete && selectedInvoiceDeleteData.spoInvoiceIndex === invoiceIndex ? (
                                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                            <Typography variant="body2" color="error" sx={{ mr: 1 }}>
                                                                Are you sure you want to delete this?
                                                            </Typography>
                                                            <Tooltip title="Confirm" arrow>
                                                                <IconButton color='error' onClick={()=>{handleDeleteInvoice()}} size="small">
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
                                                        <IconButton color="error" onClick={() => handleOpenDelete(invoiceIndex, invoiceData?.supplier_po_delivery_invoice_pcl)}>
                                                            <DeleteOutlineIcon fontSize='small' />
                                                        </IconButton>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}

                                </TableBody>
                            </Table>
                        </Box>
                    </Box>
                    <Box sx={{ mb: 1, mt: 1 }}>
                        <Typography sx={{ fontWeight: 'bold', mt: 1, color: "primary", fontSize: '20px' }}>Payment Information</Typography>
                    </Box>
                    <Box sx={{ width: '50%' }}>
                        {outgoingPaymentDetails?.id && (
                            <>
                                <Box>
                                    <Typography sx={{ fontWeight: 'bold', mb: 1 }}>Outgoing Payment No :</Typography>
                                </Box>
                                <Box>
                                    <TextField
                                        id='amount'
                                        fullWidth
                                        autoComplete="off"
                                        name="amount"
                                        value={outgoingPaymentDetails?.display_number}
                                        disabled
                                    />
                                </Box>
                            </>
                        )}
                        <Box>
                            <Typography sx={{ fontWeight: 'bold', mb: 1, mt: 1 }}>Outgoing Payment Amount :</Typography>
                        </Box>
                        <Box>
                            <TextField
                                id='amount'
                                fullWidth
                                autoComplete="off"
                                name="amount"
                                type='number'
                                value={outgoingPaymentDetails?.amount?.amount}
                                disabled
                                onChange={(e: any) => handleChangeUniqueInputs('amount', parseFloat(e.target.value))}
                                onFocus={(e) => e.target.addEventListener("wheel", function (e) { e.preventDefault() }, { passive: false })}
                            />
                            <FormErrorMessage message={errors?.amount?.[0]} />
                        </Box>
                        <Box>
                            <Typography sx={{ fontWeight: 'bold', mb: 1, mt: 1 }}>Outgoing Payment Amount Currency :</Typography>
                        </Box>
                        <Box>
                            <RitzSelection
                                id={'amount_currency'}
                                name={'amount_currency'}
                                optionValue={'id'}
                                optionText={'name'}
                                selectedValue={outgoingPaymentDetails?.amount?.amount_currency}
                                isRequired={true}
                                options={currencyList}
                                isReadOnly={true}
                                handleOnChange={(e: any) => handleChangeUniqueInputs('amount_currency', e.target.value)}

                            />
                            <FormErrorMessage message={errors?.currency?.[0]} />
                        </Box>
                        <Box>
                            <Typography sx={{ fontWeight: 'bold', mb: 1, mt: 1 }}>Payment Date :</Typography>
                        </Box>
                        <Box sx={{width: '50%'}}>
                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <DatePicker
                                    minDate={dayjs(Date.now())}
                                    format='DD/MM/YYYY'
                                    value={outgoingPaymentDetails?.payment_date ? dayjs(outgoingPaymentDetails?.payment_date) : null}
                                    onChange={(e: any) => handleChangeUniqueInputs('payment_date', dayjs(e.$d).format('YYYY-MM-DD'))}
                                    sx={{ width: '50%' }}
                                />
                            </LocalizationProvider>
                            <FormErrorMessage message={errors?.payment_date?.[0]} />
                        </Box>
                        {outgoingPaymentDetails?.payment_type === pclKey && (
                            <>
                                <Box>
                                    <Typography sx={{ fontWeight: 'bold', mb: 1, mt: 1 }}>PCL Created Date :</Typography>
                                </Box>
                                <Box sx={{width: '50%'}}>
                                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                                        <DatePicker
                                            format='DD/MM/YYYY'
                                            value={outgoingPaymentDetails?.pcl_create_date ? dayjs(outgoingPaymentDetails?.pcl_create_date) : null}
                                            onChange={(e: any) => handleChangeUniqueInputs('pcl_create_date', dayjs(e.$d).format('YYYY-MM-DD'))}
                                            sx={{ width: '50%' }}
                                        />
                                    </LocalizationProvider>
                                </Box>
                                <Box>
                                    <Typography sx={{ fontWeight: 'bold', mb: 1, mt: 1 }}>PCL End Date :</Typography>
                                </Box>
                                <Box sx={{width: '50%'}}>
                                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                                        <DatePicker
                                            format='DD/MM/YYYY'
                                            value={outgoingPaymentDetails?.pcl_end_date ? dayjs(outgoingPaymentDetails?.pcl_end_date) : null}
                                            onChange={(e: any) => handleChangeUniqueInputs('pcl_end_date', dayjs(e.$d).format('YYYY-MM-DD'))}
                                            sx={{ width: '50%' }}
                                        />
                                    </LocalizationProvider>
                                </Box>
                                <Box>
                                    <Typography sx={{ fontWeight: 'bold', mb: 1, mt: 1 }}>PCL Settle Date :</Typography>
                                </Box>
                                <Box sx={{width: '50%'}}>
                                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                                        <DatePicker
                                            format='DD/MM/YYYY'
                                            value={outgoingPaymentDetails?.pcl_settle_date ? dayjs(outgoingPaymentDetails?.pcl_settle_date) : null}
                                            onChange={(e: any) => handleChangeUniqueInputs('pcl_settle_date', dayjs(e.$d).format('YYYY-MM-DD'))}
                                            sx={{ width: '50%' }}
                                        />
                                    </LocalizationProvider>
                                </Box>
                                <Box>
                                    <Typography sx={{ fontWeight: 'bold', mb: 1, mt: 1 }}>Interest Rate :</Typography>
                                </Box>
                                <Box>
                                    <TextField
                                        id='amount'
                                        fullWidth
                                        autoComplete="off"
                                        name="amount"
                                        type='number'
                                        value={outgoingPaymentDetails?.interest_rate}
                                        onChange={(e: any) => handleChangeUniqueInputs('interest_rate', parseFloat(e.target.value))}
                                        sx={{ width: '25%' }}
                                        onFocus={(e) => e.target.addEventListener("wheel", function (e) { e.preventDefault() }, { passive: false })}
                                    />
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Typography sx={{ fontWeight: 'bold', mr: 1 }}>Interest Charge :</Typography>
                                    {(outgoingPaymentDetails?.payment_type === 'pcl' && outgoingPaymentId) && (
                                        <Tooltip title="Calculate Interest Charge" arrow>
                                            <>
                                                <IconButton disabled={isCalculateInterestCharge} onClick={handleCalculateInterestCharge}>
                                                    <SyncIcon color='primary' />
                                                </IconButton>
                                                {isCalculateInterestCharge && <SaveSpinner />}
                                            </>
                                        </Tooltip>
                                    )}
                                </Box>
                                <Box>
                                    <TextField
                                        id='amount'
                                        fullWidth
                                        autoComplete="off"
                                        name="amount"
                                        type='number'
                                        value={outgoingPaymentDetails?.interest_charge}
                                        onChange={(e: any) => handleChangeUniqueInputs('interest_charge', parseFloat(e.target.value))}
                                        sx={{ width: '25%' }}
                                        onFocus={(e) => e.target.addEventListener("wheel", function (e) { e.preventDefault() }, { passive: false })}
                                    />
                                </Box>
                                <Box>
                                    <Typography sx={{ fontWeight: 'bold', mb: 1, mt: 1 }}>Interest Charge Currency :</Typography>
                                </Box>
                                <Box >
                                    <RitzSelection
                                        id={'amount_currency'}
                                        name={'amount_currency'}
                                        optionValue={'id'}
                                        optionText={'name'}
                                        selectedValue={outgoingPaymentDetails?.interest_charge_currency}
                                        isRequired={true}
                                        options={currencyList}
                                        handleOnChange={(e: any) => handleChangeUniqueInputs('interest_charge_currency', e.target.value)}
                                    />
                                </Box>
                            </>
                        )}
                    </Box>
                    <Box>
                        {errors?.pcl_bank_information_errors?.id && (
                             <Alert severity="error" sx={{ mt: 1 }}>{errors?.pcl_bank_information_errors?.error}</Alert>
                        )}
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'end', mt: 2 }}>
                        <Button variant="contained" color="primary" onClick={handleCreate} disabled={isSaving}>{isSaving && <SaveSpinner />}{outgoingPaymentDetails?.id ? 'Update' : 'Save'}</Button>
                    </Box>

                </>
            )}
        </>
    );
};

export default CreateOutgoingPayment;