import React, { useEffect, useState } from 'react';
import { getDefaultError } from '@/helpers/Utilities';
import toast from 'react-hot-toast';
import { Autocomplete, Box, Button, Card, Checkbox, darken, Divider, Grid, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import DefaultLoader from '@/components/DefaultLoader';
import { ReactKeyHelper } from '@/helpers/KeyHelper';
import api from '@/services/api';
import { createIncomingPaymentURL, incomingPaymentDetailsURL, outgoingCommercialInvoiceListURL, paymentCurrencyListURL, saveIncomingPaymentDetails } from '@/helpers/constants/rest_urls/FinanceUrls';
import { RitzTabs, RitzTabPanel } from '@/components/Ritz/RitzTabs';
import { TabContext } from '@mui/lab';
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

const CreateIncomingPayment = ({ handleSavedData }: any) => {
    const router = useRouter();
    const keyHelper = new ReactKeyHelper();
    const [isLoading, setIsLoading] = useState(false); 
    const [isSaving, setIsSaving] = useState(false); 
    const [incomingPaymentDetails, setIncomingPaymentDetails] = useState<any>({})
    const [invoiceData, setInvoiceData] = useState<any>([])
    const [inputValue, setInputValue] = useState('');
    const [currencyList, setCurrencyList] = useState<any>([])
    const [errors, setErrors] = useState<any>({})

    const fetchData = () => {
        const requests = [
            api.get(outgoingCommercialInvoiceListURL(inputValue)),
            api.get(paymentCurrencyListURL()),
        ];
        Promise.all(requests).then(resp => {
            const respData = resp.map((r: any) => r.data);
            const [outgoingInvoices, currencyData] = respData;
            const convertInvoiceData = outgoingInvoices?.results?.map((data: any, dataIndex: any) => ({
                label: data.display_number,
                id: data.id
            }));
            setInvoiceData([...convertInvoiceData])
            setCurrencyList([...currencyData])
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoading(false));
    }
    const handleInputChange = (event: any, newInputValue: any, id: any) => {
        setInputValue(newInputValue);
        if (event) {
            api.get(outgoingCommercialInvoiceListURL(newInputValue)).then(resp => {
                const resdata = resp?.data || [];
                const convertInvoiceData = resdata?.results?.map((data: any, dataIndex: any) => ({
                    label: data.display_number,
                    id: data.id
                }));
                setInvoiceData([...convertInvoiceData])
            }).catch((error) => {
                toast.error(getDefaultError(error?.response?.status));
            }).finally(() => setIsLoading(false));
        }
    };

    const handleChnageInvoice = (event: any, selectedData: any) => {
        setIncomingPaymentDetails({
            ...incomingPaymentDetails,
            outgoing_commercial_invoice_id: selectedData?.id,
            outgoing_commercial_invoice_display_number: selectedData?.label
        });
    };

    const handleChangeInputs = (field: any, value: any) => {
        setIncomingPaymentDetails((prevDetails: { amount: any; }) => {
            if (field == 'amount') {
                return {
                    ...prevDetails,
                    amount: {
                        ...prevDetails.amount,
                        [field]: value,
                    },
                };
            } else {
                return {
                    ...prevDetails,
                    [field]: value,
                };
            }
        });
    };

    const handleCreate = () => {
        setErrors({})
        setIsSaving(true)
        const saveData = {
            amount: incomingPaymentDetails?.amount || null,
            currency: incomingPaymentDetails?.currency || null,
            complete: incomingPaymentDetails?.complete || false,
            payment_date: incomingPaymentDetails?.payment_date || null,
            outgoing_commercial_invoice_id: incomingPaymentDetails?.outgoing_commercial_invoice_id || null,
        }
        api.post(createIncomingPaymentURL(), saveData).then(resp => {
            toast.success(DEFAULT_SUCCESS);
            handleSavedData()
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
            setErrors({...error?.response?.data})
        }).finally(() => setIsSaving(false));

    }

    useEffect(() => {
        fetchData()
    }, []); 


    return (
        <>
            {isLoading ? (
                <DefaultLoader />
            ) : (
                <>
                    <Box>
                            <Box>
                                <Typography sx={{ fontWeight: 'bold', mb: 1 }}>Amount :</Typography>
                            </Box>
                            <Box>
                                <TextField
                                    id={'amount'}
                                    type={'number'}
                                    value={incomingPaymentDetails?.amount?.amount || ''}
                                    name={'amount'}
                                    sx={{ width: '100%' }}
                                    required
                                    onFocus={(e) => e.target.addEventListener("wheel", function (e) { e.preventDefault() }, { passive: false })}
                                    onChange={(event: any) => { handleChangeInputs('amount', parseFloat(event?.target?.value)) }}
                                />
                                <FormErrorMessage message={errors?.amount?.[0]} />
                            </Box>
                            <Box>
                                <Typography sx={{ fontWeight: 'bold', mb: 1, mt: 1 }}>Currency :</Typography>
                            </Box>
                            <Box>
                                <RitzSelection
                                    id={'currency'}
                                    name={'currency'}
                                    optionValue={'id'}
                                    optionText={'name'}
                                    selectedValue={incomingPaymentDetails.currency}
                                    isRequired={true}
                                    options={currencyList}
                                    handleOnChange={(e: any) => handleChangeInputs('currency', e.target.value)}
                                />
                                 <FormErrorMessage message={errors?.currency?.[0]} />
                            </Box>
                            <Box>
                                 <Typography sx={{ fontWeight: 'bold', mb: 1, mt: 1 }}>Payment Date :</Typography>
                            </Box>
                            <Box>
                                <LocalizationProvider dateAdapter={AdapterDayjs}>
                                    <DatePicker
                                        minDate={dayjs(Date.now())}
                                        format='DD/MM/YYYY'
                                        value={incomingPaymentDetails?.payment_date ? dayjs(incomingPaymentDetails?.payment_date) : null}
                                        onChange={(e: any) => handleChangeInputs('payment_date', dayjs(e.$d).format('YYYY-MM-DD'))}
                                        sx={{ width: '100%' }}
                                    />
                                </LocalizationProvider>
                                <FormErrorMessage message={errors?.payment_date?.[0]} />
                            </Box>
                            <Box>
                                <Typography sx={{ fontWeight: 'bold', mb: 1, mt: 1 }}>Commercial Invoice :</Typography>
                            </Box>
                            <Box>
                                <Autocomplete
                                    disablePortal
                                    options={invoiceData}
                                    value={incomingPaymentDetails?.outgoing_commercial_invoice_display_number}
                                    inputValue={inputValue}
                                    onInputChange={handleInputChange}
                                    sx={{ width: '100%' }}
                                    onChange={(event, selectedData) => { handleChnageInvoice(event, selectedData) }}
                                    renderInput={(params) => <TextField {...params} />}
                                />
                                 <FormErrorMessage message={errors?.payment_date?.[0]} />
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                            <Typography sx={{ fontWeight: 'bold' }}>Completed</Typography>
                                <Checkbox
                                    checked={incomingPaymentDetails?.complete || false}
                                    name="complete"
                                    onChange={(event: any) => {
                                        setIncomingPaymentDetails({
                                            ...incomingPaymentDetails,
                                            [event.target.name]: event.target.checked
                                        });
                                    }}
                                />
                            </Box>
                            <Box style={{ display: 'flex', justifyContent: 'end' }}>
                                <Button variant="contained" color="primary" onClick={handleCreate} disabled={isSaving}>{isSaving && <SaveSpinner />}Create</Button>
                            </Box>
                    </Box>

                </>
            )}
        </>
    );
};

export default CreateIncomingPayment;
