import React, { useEffect, useState } from 'react';
import { getDefaultError } from '@/helpers/Utilities';
import toast from 'react-hot-toast';
import { Autocomplete, Box, Button, Card, Checkbox, TextField, Typography } from '@mui/material';
import DefaultLoader from '@/components/DefaultLoader';
import { ReactKeyHelper } from '@/helpers/KeyHelper';
import api from '@/services/api';
import { incomingPaymentDetailsURL, paymentCurrencyListURL, pclIncomingPaymentCreateURL, pclIncomingPaymentUpdateURL } from '@/helpers/constants/rest_urls/FinanceUrls';
import { useRouter } from 'next/router';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from "dayjs";
import SaveSpinner from "@/components/SaveSpinner";
import { DEFAULT_SUCCESS } from '@/helpers/constants/Constants';
import RitzSelection from '@/components/Ritz/RitzSelection';
import FormErrorMessage from '@/components/FormErrorMessage';

const PCLCreateIncomingPayment = ({ shipmentId, incomingPaymentId, shipmentBalanceAmount,outgoingCommercialInvoiceId, handleSavedData }: any) => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true); 
    const [isSaving, setIsSaving] = useState(false); 
    const [incomingPaymentDetails, setIncomingPaymentDetails] = useState<any>({})
    const [currencyList, setCurrencyList] = useState<any>([])
    const [errors, setErrors] = useState<any>({})

    const fetchData = () => {
        const requests = [
            api.get(paymentCurrencyListURL()),
        ];
        if (incomingPaymentId) {
            requests.push(api.get(incomingPaymentDetailsURL(incomingPaymentId)));
        }
        Promise.all(requests).then(resp => {
            const respData = resp.map((r: any) => r.data);
            const [currencyData, incomingPaymentDetails] = respData;
            setCurrencyList([...currencyData])
            if(incomingPaymentId){
                setIncomingPaymentDetails({...incomingPaymentDetails}) 
            }
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoading(false));
    }
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
            amount: incomingPaymentDetails?.amount?.amount || shipmentBalanceAmount?.amount,
            currency: incomingPaymentDetails?.currency || shipmentBalanceAmount?.currency,
            complete: incomingPaymentDetails?.complete || false,
            payment_date: incomingPaymentDetails?.payment_date || null,
            purchase_order_delivery_id: shipmentId,
            outgoing_commercial_invoice_id: outgoingCommercialInvoiceId || null,
            incoming_payment_id: incomingPaymentId,
        }

        const request = {
            method: incomingPaymentId ? 'put' : 'post',
            url: incomingPaymentId? pclIncomingPaymentUpdateURL(incomingPaymentId) : pclIncomingPaymentCreateURL(),
            data: saveData
        }
        api(request).then(() => {
            toast.success(DEFAULT_SUCCESS);
            handleSavedData()
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
            if (error?.response?.data) {
                setErrors({ ...error?.response?.data })
            }
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
                                <Typography sx={{ fontWeight: 'bold', mb: 1, mt: 1 }}>Amount :</Typography>
                            </Box>
                            <Box>
                                <TextField
                                    id={'amount'}
                                    type={'number'}
                                    value={incomingPaymentDetails?.amount?.amount || shipmentBalanceAmount?.amount}
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
                                    selectedValue={incomingPaymentDetails?.currency}
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
                            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                            <Typography sx={{ fontWeight: 'bold' }}>Completed</Typography>
                                <Checkbox
                                    checked={incomingPaymentDetails?.complete || false}
                                    name="complete"
                                    onChange={(event: any) => {
                                        setIncomingPaymentDetails({
                                            ...incomingPaymentDetails,
                                            [event.target.name]: event.target.checked || false
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

export default PCLCreateIncomingPayment;
