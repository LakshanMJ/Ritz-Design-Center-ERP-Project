import React, { useEffect, useState } from 'react';
import { formatAmount, getDefaultError } from '@/helpers/Utilities';
import toast from 'react-hot-toast';
import { Box, Button, Card, darken, Grid, IconButton, Link, List, ListItem, Table, TableBody, TableCell, TableHead, TableRow, TextField, Tooltip, Typography } from '@mui/material';
import DefaultLoader from '@/components/DefaultLoader';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { ReactKeyHelper } from '@/helpers/KeyHelper';
import RitzSelection from '@/components/Ritz/RitzSelection';
import api from '@/services/api';
import { deleteIncommingPaymentDeductionURL, incomingPaymentDetailsURL, paymentCurrencyListURL, saveIncommingPaymentDeductionsURL } from '@/helpers/constants/rest_urls/FinanceUrls';
import { DEFAULT_SUCCESS } from '@/helpers/constants/Constants';
import SaveSpinner from '@/components/SaveSpinner';
import FormErrorMessage from '@/components/FormErrorMessage';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

const PaymentDetails = ({ incommingPaymentId }: any) => {
    const keyHelper = new ReactKeyHelper();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [paymentDetails, setPaymentDetails] = useState<any>({})
    const [currencyList, setCurrencyList] = useState<any>([])
    const [errorDetails, setErrorDetails] = useState<any>({})
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [selectedDeductionIndex, setSelectedDeductionIndex] = useState(null);

    const fetchData = () => {
        setErrorDetails({})
        const requests = [
            api.get(paymentCurrencyListURL()),
            api.get(incomingPaymentDetailsURL(incommingPaymentId)),
        ];
        Promise.all(requests).then(resp => {
            const respData = resp.map((r: any) => r.data);
            const [currencyDetails, paymentDetails] = respData;
            setCurrencyList([...currencyDetails])
            setPaymentDetails({...paymentDetails})
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoading(false));
    }

    const handleSaveDeduction = () => {
        setIsSaving(true)
        const saveData = paymentDetails?.incomingpaymentdeduction_set
        api.post(saveIncommingPaymentDeductionsURL(paymentDetails?.id), saveData).then(resp => {
            toast.success(DEFAULT_SUCCESS);
            fetchData()
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
            setErrorDetails(error?.response?.data)
        }).finally(() => setIsSaving(false));

    }

    const handleChange = (index: number, field: string, value: any) => {
        const updatedState = [...paymentDetails?.incomingpaymentdeduction_set];
        if (updatedState[index]) {
            if (updatedState[index]) {
                const target = field === 'amount' ? updatedState[index].amount : updatedState[index];
                target[field] = value || null;
            }
        }
        setPaymentDetails({
            ...paymentDetails,
            incomingpaymentdeduction_set: updatedState,
        });
    };

    const handleAddNewDeduction = () => {
        setPaymentDetails((prevDetails: any) => ({
            ...prevDetails,
            incomingpaymentdeduction_set: [
                ...prevDetails.incomingpaymentdeduction_set,
                { id: null, amount:{amount:null}, reason: null, currency: null }
            ]
        }));
    };

    const handleDelete = (deductionId: number, deductionIndex: any) => {
        const updatedDeductionSet = [...paymentDetails.incomingpaymentdeduction_set];
        updatedDeductionSet.splice(deductionIndex, 1);
        setPaymentDetails((prevDetails: any) => ({
            ...prevDetails,
            incomingpaymentdeduction_set: updatedDeductionSet,
        }));
    
        if (deductionId) {
            api.delete(deleteIncommingPaymentDeductionURL(deductionId)).then(resp => {
                toast.success(DEFAULT_SUCCESS);
                fetchData()
            }).catch(error => {
                toast.error(getDefaultError(error?.response?.status));
                setErrorDetails(error?.response?.data)
            }).finally(() => setIsSaving(false));
        }
        setConfirmDelete(false);
    };
    const handleOpenDelete = (deductionId: number , deductionIndex: any) => {
        setSelectedDeductionIndex(deductionIndex);
        setConfirmDelete(true);
    };

    useEffect(() => {
        if (incommingPaymentId) {
            fetchData()
        }

    }, [incommingPaymentId]);

    return (
        <>
            {isLoading ? (
                <DefaultLoader />
            ) : (
                <>
                    <Box>
                        <Card variant='outlined' sx={{ mb: 2 }}>
                            <Grid container columnSpacing={2} px={2}>
                                <Grid item sm={4} xs={12}>
                                    <Box p={1}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Payment No:</Typography>
                                        <Typography variant="body1">{paymentDetails?.display_number}</Typography>
                                    </Box>
                                </Grid>
                                <Grid item sm={4} xs={12}>
                                    <Box p={1}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Amount</Typography>
                                        <Typography variant="body1">{formatAmount(paymentDetails?.amount?.amount)} {paymentDetails?.amount?.amount_currency}</Typography>
                                    </Box>
                                </Grid>
                                <Grid item sm={4} xs={12}>
                                    <Box p={1}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Plan Date</Typography>
                                        <Typography variant="body1">
                                            <Box display="flex" alignItems="center">
                                                {paymentDetails?.payment_date}
                                            </Box>
                                        </Typography>
                                    </Box>
                                </Grid>
                            </Grid>
                        </Card>
                    </Box>

                    <Box sx={{ mt: 1, mb: 1 }}>
                        <Typography variant='h6' color={'primary'}>Deductions</Typography>
                    </Box>
                    <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'flex' }}>
                            <Box sx={{ color: 'error.main' }}>
                                <Button size={'small'} variant="outlined" onClick={handleAddNewDeduction} sx={{ mb: 1 }} > Add New Deduction</Button>
                            </Box>
                        </Box>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Reason</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Amount</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Currency</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paymentDetails?.incomingpaymentdeduction_set?.length === 0 ? (
                                    <>
                                        <TableRow >
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }} colSpan={3}>No available deductions</TableCell>
                                        </TableRow>
                                    </>
                                ) : (
                                    <>
                                        {paymentDetails?.incomingpaymentdeduction_set?.map((deduction: any, deductionIndex: any) => (
                                            <TableRow key={`${keyHelper.getNextKeyValue()}`} >
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                    <TextField
                                                        id='reason'
                                                        fullWidth
                                                        autoComplete="off"
                                                        name="reason"
                                                        value={deduction?.reason}
                                                        onChange={(e: any) => handleChange(deductionIndex, 'reason', e.target.value)}
                                                    />
                                                    <FormErrorMessage message={errorDetails[deductionIndex]?.reason_error} />
                                                </TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                    <TextField
                                                        id='amount'
                                                        fullWidth
                                                        autoComplete="off"
                                                        name="amount"
                                                        value={deduction?.amount?.amount}
                                                        onChange={(e: any) => handleChange(deductionIndex, 'amount', parseFloat(e.target.value))}
                                                        type="number"
                                                        onFocus={(e) => e.target.addEventListener("wheel", function (e) { e.preventDefault() }, { passive: false })}
                                                    />
                                                     <FormErrorMessage message={errorDetails[deductionIndex]?.amount_error} />
                                                </TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                        <RitzSelection
                                                            id={'currency'}
                                                            name={'currency'}
                                                            optionValue={'id'}
                                                            optionText={'name'}
                                                            selectedValue={deduction.currency}
                                                            isRequired={true}
                                                            options={currencyList}
                                                            handleOnChange={(e: any) => handleChange(deductionIndex, 'currency', e.target.value)}
                                                        />
                                                        <DeleteOutlineIcon
                                                            color="error"
                                                            sx={{ verticalAlign: 'middle', fontSize: '20px', cursor: 'pointer', ml: 1 }}
                                                            onClick={() => handleOpenDelete(deduction.id, deductionIndex)}
                                                        />
                                                    </Box>
                                                    {confirmDelete && selectedDeductionIndex === deductionIndex && (
                                                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                                                            <Typography variant="body2" color="error" sx={{ mr: 1 }}>
                                                                Are you sure you want to delete this?
                                                            </Typography>
                                                            <Tooltip title="Confirm" arrow>
                                                                <IconButton color='error' onClick={() => handleDelete(deduction?.id, deductionIndex )} size="small">
                                                                    <CheckIcon />
                                                                </IconButton>
                                                            </Tooltip>
                                                            <Tooltip title="Cancel" arrow>
                                                                <IconButton color='primary' onClick={() => setConfirmDelete(false)} size="small" sx={{ ml: 1 }}>
                                                                    <CloseIcon />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </Box>
                                                    )}
                                                <FormErrorMessage message={errorDetails[deductionIndex]?.currency_error} />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </>
                                )}

                            </TableBody>
                        </Table>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <Box sx={{ color: 'error.main' }}>
                                <Button size={'small'} variant="outlined" sx={{ mt: 1 }} onClick={handleSaveDeduction} disabled={isSaving}>{isSaving && <SaveSpinner />}Save</Button>
                            </Box>
                        </Box>
                    </Box>
                    <Box sx={{ mt: 1, mb: 1 }}>
                        <Typography variant='h6' color={'primary'}>Receivings</Typography>
                    </Box>
                    <Box>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Shipment</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Plan Date</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Due Date</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Amount</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {paymentDetails?.purchase_order_payments?.length === 0 ? (
                                    <>
                                        <TableRow>
                                            <TableCell colSpan={4} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>No available receivings</TableCell>
                                        </TableRow>
                                    </>
                                ) : (
                                    <>
                                        {paymentDetails?.purchase_order_payments?.map((receiving: any, receivingIndex: any) => (
                                            <TableRow key={`${keyHelper.getNextKeyValue()}`}>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{receiving?.display_number}</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{receiving?.delivery_date}</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{receiving?.due_date}</TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{formatAmount(receiving?.amount?.amount)} {receiving?.amount?.amount_currency}</TableCell>
                                            </TableRow>
                                        ))}
                                    </>
                                )}
                            </TableBody>
                        </Table>
                    </Box>

                </>
            )}
        </>
    );
};

export default PaymentDetails;
