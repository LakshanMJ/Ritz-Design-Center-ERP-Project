import React, { useEffect, useState } from 'react';
import { getDefaultError } from '@/helpers/Utilities';
import toast from 'react-hot-toast';
import { Autocomplete, Box, Button, Card, Checkbox, darken, Divider, Grid, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import DefaultLoader from '@/components/DefaultLoader';
import { ReactKeyHelper } from '@/helpers/KeyHelper';
import api from '@/services/api';
import { createIncomingPaymentDeductionURL,  incomingPaymentDeductionDetailsURL,  paymentCurrencyListURL, updateIncomingPaymentDeductionURL } from '@/helpers/constants/rest_urls/FinanceUrls';
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

const CreateDeduction = ({ incomingPaymentId, deductionId, handleSavedData }: any) => {
    console.log(incomingPaymentId,"incomingPaymentId")
    const router = useRouter();
    const keyHelper = new ReactKeyHelper();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [deductionDetails, setDeductionDetails] = useState<any>({})
    const [currencyList, setCurrencyList] = useState<any>([])
    const [errors, setErrors] = useState<any>({})

    const fetchData = () => {
        const requests = [
            api.get(paymentCurrencyListURL()),
        ];
        if (deductionId) {
            requests.push(api.get(incomingPaymentDeductionDetailsURL(deductionId)));
        }
        Promise.all(requests).then(resp => {
            const respData = resp.map((r: any) => r.data);
            const [currencyDetails, deductionDetails] = respData;
            setCurrencyList([...currencyDetails])
            setDeductionDetails({...deductionDetails})
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoading(false));
    }

    const handleCreate = () => {
        setIsSaving(true)
        const saveData = {
            incomming_payment: parseInt(incomingPaymentId) || null,
            reason: deductionDetails?.reason || null,
            amount: deductionDetails?.amount || null,
            currency: deductionDetails?.currency || null,
        }
        const request = {
            method: deductionId ? 'put' : 'post',
            url: deductionId ? updateIncomingPaymentDeductionURL(deductionId) : createIncomingPaymentDeductionURL(),
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
        setDeductionDetails((prevDetails: { amount: any; }) => {
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
                            <Typography sx={{ fontWeight: 'bold', mb: 1 }}>Reason :</Typography>
                        </Box>
                        <Box>
                            <TextField
                                id='reason'
                                fullWidth
                                autoComplete="off"
                                name="reason"
                                value={deductionDetails?.reason}
                                onChange={(e: any) => handleChange('reason', e.target.value)}
                            />
                        </Box>
                        <Box>
                            <Typography sx={{ fontWeight: 'bold', mb: 1, mt: 1 }}>Amount :</Typography>
                        </Box>
                        <Box>
                            <TextField
                                id='amount'
                                fullWidth
                                autoComplete="off"
                                name="amount"
                                value={deductionDetails?.amount?.amount}
                                onChange={(e: any) => handleChange('amount', parseFloat(e.target.value))}
                                type="number"
                                onFocus={(e) => e.target.addEventListener("wheel", function (e) { e.preventDefault() }, { passive: false })}
                            />
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
                                selectedValue={deductionDetails.currency}
                                isRequired={true}
                                options={currencyList}
                                handleOnChange={(e: any) => handleChange('currency', e.target.value)}
                            />
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

export default CreateDeduction;
