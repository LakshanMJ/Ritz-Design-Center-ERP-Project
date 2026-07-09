import React, { useEffect, useState } from 'react';
import { getDefaultError } from '@/helpers/Utilities';
import toast from 'react-hot-toast';
import { Box, Button,TextField, Typography } from '@mui/material';
import DefaultLoader from '@/components/DefaultLoader';
import { ReactKeyHelper } from '@/helpers/KeyHelper';
import api from '@/services/api';
import { createOutgoingCommercialInvoiceURl,outgoingCommercialInvoiceDetailsURL,paymentCurrencyListURL, updateOutgoingCommercialInvoiceURL, } from '@/helpers/constants/rest_urls/FinanceUrls';
import { useRouter } from 'next/router';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from "dayjs";
import SaveSpinner from "@/components/SaveSpinner";
import { DEFAULT_SUCCESS } from '@/helpers/constants/Constants';
import RitzSelection from '@/components/Ritz/RitzSelection';
import { customersURL } from '@/helpers/constants/RestUrls';
import FormErrorMessage from '@/components/FormErrorMessage';

const CreateOutgoingCommercialInvoice = ({ outgoingCommercialInvoiceId, purchaseOrderDeliveryId, customerId, handleSavedData }: any) => {
    const router = useRouter();
    const keyHelper = new ReactKeyHelper();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [invoiceDetails, setInvoiceDetails] = useState<any>({})
    const [currencyList, setCurrencyList] = useState<any>([])
    const [customerList, setCustomerList] = useState<any>([])
    const [errors, setErrors] = useState<any>({})

    const fetchData = () => {
        const requests = [
            api.get(paymentCurrencyListURL()),
            api.get(customersURL()),
        ];
        if (outgoingCommercialInvoiceId) {
            requests.push(api.get(outgoingCommercialInvoiceDetailsURL(outgoingCommercialInvoiceId)));
        }
        Promise.all(requests).then(resp => {
            const respData = resp.map((r: any) => r.data);
            const [currencyDetails, customers, invoiceData] = respData;
            setCurrencyList([...currencyDetails])
            setCustomerList([...customers])
            setInvoiceDetails({...invoiceData})
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoading(false));
    }

    const handleCreate = () => {
        setErrors({})
        setIsSaving(true)
        const saveData = {
            amount: invoiceDetails?.amount?.amount || null,
            currency: invoiceDetails?.currency || null,
            customer: customerId ? customerId : invoiceDetails?.customer,
            due_date: invoiceDetails?.due_date || null,
            purchase_order_delivery_id: purchaseOrderDeliveryId || null
        }
        const request = {
            method: outgoingCommercialInvoiceId ? 'put' : 'post',
            url: outgoingCommercialInvoiceId ? updateOutgoingCommercialInvoiceURL(outgoingCommercialInvoiceId) : createOutgoingCommercialInvoiceURl(),
            data: saveData,
        };
        api.request(request).then(resp => {
            toast.success(DEFAULT_SUCCESS);
            handleSavedData();
        })
        .catch(error => {
            toast.error(getDefaultError(error?.response?.status));
            setErrors({ ...error?.response?.data });
        })
        .finally(() => setIsSaving(false));

    }

    const handleChange = (field: any, value: any) => {
        setInvoiceDetails((prevDetails: any) => {
            if (field === 'amount') {
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
                            <Typography sx={{ fontWeight: 'bold', mb: 1 }}>Amount (USD) :</Typography>
                        </Box>
                        <Box>
                            <TextField
                                id='amount'
                                fullWidth
                                type='number'
                                autoComplete="off"
                                name="amount"
                                value={invoiceDetails?.amount?.amount}
                                onChange={(e: any) => handleChange('amount', parseFloat(e.target.value))}
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
                                selectedValue={invoiceDetails.currency || null}
                                isRequired={true}
                                options={currencyList}
                                handleOnChange={(e: any) => handleChange('currency', e.target.value)}
                            />
                            <FormErrorMessage message={errors?.currency?.[0]} />
                        </Box>
                        <Box>
                            <Typography sx={{ fontWeight: 'bold', mb: 1, mt: 1 }}>Customer :</Typography>
                        </Box>
                        <Box>
                            <RitzSelection
                                id={'customer'}
                                name={'customer'}
                                optionValue={'id'}
                                optionText={'name'}
                                selectedValue={customerId ? customerId : invoiceDetails?.customer || null}
                                isRequired={true}
                                isReadOnly={customerId}
                                options={customerList}
                                handleOnChange={(e: any) => handleChange('customer', e.target.value)}
                            />
                            <FormErrorMessage message={errors?.customer?.[0]} />
                        </Box>
                        <Box>
                            <Typography sx={{ fontWeight: 'bold', mb: 1, mt: 1 }}>Due Date :</Typography>
                        </Box>
                            <Box>
                                <LocalizationProvider dateAdapter={AdapterDayjs}>
                                    <DatePicker
                                        minDate={dayjs(Date.now())}
                                        format='DD/MM/YYYY'
                                        value={invoiceDetails.due_date ? dayjs(invoiceDetails.due_date) : null}
                                        onChange={(e: any) => handleChange('due_date', dayjs(e.$d).format('YYYY-MM-DD'))}
                                    />
                                </LocalizationProvider>
                                <FormErrorMessage message={errors?.due_date?.[0]} />
                            </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'end', mt: 2 }}>
                            <Button variant="contained" color="primary" onClick={handleCreate} disabled={isSaving}>{isSaving && <SaveSpinner />}Create</Button>
                        </Box>
                    </Box>

                </>
            )}
        </>
    );
};

export default CreateOutgoingCommercialInvoice;
