import React, { useEffect, useState } from 'react';
import { getDefaultError } from '@/helpers/Utilities';
import toast from 'react-hot-toast';
import { Autocomplete, Box, Button, Card, Checkbox, darken, Divider, Grid, IconButton, Link, Table, TableBody, TableCell, TableHead, TableRow, TextField, Tooltip, Typography } from '@mui/material';
import DefaultLoader from '@/components/DefaultLoader';
import { ReactKeyHelper } from '@/helpers/KeyHelper';
import api from '@/services/api';
import { incomingPaymentDetailsURL, outgoingCommercialInvoiceListURL, saveIncomingPaymentDetails } from '@/helpers/constants/rest_urls/FinanceUrls';
import { RitzTabs, RitzTabPanel } from '@/components/Ritz/RitzTabs';
import { TabContext } from '@mui/lab';
import { useRouter } from 'next/router';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from "dayjs";
import SaveSpinner from "@/components/SaveSpinner";
import { DEFAULT_SUCCESS } from '@/helpers/constants/Constants';
import RitzTable from '@/components/Ritz/RitzTable';
import { ColumnDef } from '@tanstack/react-table';
import IncomingDeductions from './IncomingDeductions';
import IncomingOutgoingPayments from './IncomingOutgoingPayments';
import IncomingReceivings from './IncomingReceivings';
import InfoIcon from '@mui/icons-material/Info';

const IncomingPaymentDetails = ({ incomingPaymentId }: any) => {
    const router = useRouter();
    const keyHelper = new ReactKeyHelper();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [incomingPaymentDetails, setIncomingPaymentDetails] = useState<any>({})
    const [invoiceData, setInvoiceData] = useState<any>([])
    const [activeTab, setActiveTab] = useState('1');
    const [summaryTabs, setSummaryTabs] = useState(["Deductions", "Outgoing Payments", "Receivings"]);
    const [inputValue, setInputValue] = useState('');

    const fetchData = () => {
        const requests = [
            api.get(incomingPaymentDetailsURL(incomingPaymentId)),
            api.get(outgoingCommercialInvoiceListURL(inputValue)),
        ];
        Promise.all(requests).then(resp => {
            const respData = resp.map((r: any) => r.data);
            const [incomingPaymentDetails, outgoingInvoices] = respData;
            setIncomingPaymentDetails({ ...incomingPaymentDetails })
            const convertInvoiceData = outgoingInvoices?.results?.map((data: any, dataIndex: any) => ({
                label: data.display_number,
                id: data.id
            }));
            setInvoiceData([...convertInvoiceData])
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoading(false));
    }

    const handleChangeTabs = (event: string) => {
        const url = {
            pathname: router.pathname,
            query: { ...router.query, tab: event }
        }
        router.replace(url, undefined, { shallow: true });
    }

    const handleSave = () => {
        setIsSaving(true)
        const saveData = {
            amount: incomingPaymentDetails?.amount,
            complete: incomingPaymentDetails?.complete,
            payment_date: incomingPaymentDetails?.payment_date,
            outgoing_commercial_invoice_id: incomingPaymentDetails?.outgoing_commercial_invoice_id
        }
        api.post(saveIncomingPaymentDetails(incomingPaymentId), saveData).then(resp => {
            toast.success(DEFAULT_SUCCESS);
            fetchData()
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsSaving(false));

    }
    const handleChnageInvoice = (event: any, selectedData: any) => {
        setIncomingPaymentDetails({
            ...incomingPaymentDetails,
            outgoing_commercial_invoice_id: selectedData?.id,
            outgoing_commercial_invoice_display_number: selectedData?.label
        });
    };
    const handleChangeInputs = (field: any, value: any) => {
        setIncomingPaymentDetails((prevDetails: { amount: any; }) => {
            if (field in prevDetails.amount) {
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

    const handlesavedData = () => {
        fetchData()
    }

    useEffect(() => {
        if (incomingPaymentId) {
            fetchData()
        }
    }, [incomingPaymentId]);

    useEffect(() => {
        const { tab } = router.query;
        if (tab) {
            setActiveTab(tab.toString());
        }
    }, [router]);

    return (
        <>
            {isLoading ? (
                <DefaultLoader />
            ) : (
                <>
                    <Card variant='outlined' sx={{ mb: 2, p: 2 }}>
                        <Box>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={3}>
                                    <Box>
                                        <Typography sx={{ fontWeight: 'bold', mb: 1 }}>Payment No :</Typography>
                                        <TextField
                                            id={'placement'}
                                            type={'text'}
                                            value={incomingPaymentDetails?.display_number || ''}
                                            name={'placement'}
                                            sx={{ width: '100%' }}
                                            size='small'
                                            disabled
                                            required
                                        />
                                    </Box>
                                </Grid>
                                <Grid item xs={12} sm={3}>
                                    <Box>
                                        <Typography sx={{ fontWeight: 'bold', mb: 1 }}>Amount (USD) :</Typography>
                                        <TextField
                                            id={'amount'}
                                            type={'number'}
                                            value={incomingPaymentDetails?.amount?.amount || ''}
                                            name={'amount'}
                                            sx={{ width: '100%' }}
                                            required
                                            size='small'
                                            onFocus={(e) => e.target.addEventListener("wheel", function (e) { e.preventDefault() }, { passive: false })}
                                            onChange={(event: any) => { handleChangeInputs('amount', parseFloat(event?.target?.value)) }}
                                        />
                                    </Box>
                                </Grid>
                                <Grid item xs={12} sm={3}>
                                    <Box>
                                        <Typography sx={{ fontWeight: 'bold', mb: 1 }}>Payment Date :</Typography>
                                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                                            <DatePicker
                                                minDate={dayjs(Date.now())}
                                                format='DD/MM/YYYY'
                                                value={incomingPaymentDetails?.payment_date ? dayjs(incomingPaymentDetails?.payment_date) : null}
                                                onChange={(e: any) => handleChangeInputs('payment_date', dayjs(e.$d).format('YYYY-MM-DD'))}
                                                sx={{ width: '100%' }}
                                                slotProps={{
                                                    textField: {
                                                        size: 'small'
                                                    }
                                                }}
                                            />
                                        </LocalizationProvider>
                                    </Box>
                                </Grid>
                                <Grid item xs={12} sm={3}>
                                    <Box>
                                        <Typography sx={{ fontWeight: 'bold', mb: 1 }}>Commercial Invoice :</Typography>
                                        <Autocomplete
                                            disablePortal
                                            options={invoiceData}
                                            value={incomingPaymentDetails?.outgoing_commercial_invoice_display_number}
                                            inputValue={inputValue}
                                            onInputChange={handleInputChange}
                                            size='small'
                                            sx={{ width: '100%' }}
                                            onChange={(event, selectedData) => { handleChnageInvoice(event, selectedData) }}
                                            renderInput={(params) => <TextField {...params} />}
                                        />
                                    </Box>
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
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
                                </Grid>
                            </Grid>
                        </Box>
                        <Box display="flex" justifyContent="flex-end">
                            <Button
                                onClick={() => handleSave()}
                                variant="contained"
                                color="primary"
                                disabled={isSaving}
                            >{isSaving && <SaveSpinner />}Save</Button>
                        </Box>
                    </Card>
                    <TabContext value={activeTab}>
                        <RitzTabs
                            tabs={summaryTabs}
                            activeTab={activeTab}
                            emitChange={handleChangeTabs}
                        />
                        <RitzTabPanel value='1'>
                            <Box sx={{ mt: 1, mb: 1}}>
                                <IncomingDeductions incomingPaymentId={incomingPaymentId} deductionData={incomingPaymentDetails?.incomingpaymentdeduction_set} savedData={handlesavedData} />
                            </Box>
                        </RitzTabPanel>
                        <RitzTabPanel value='2'>
                            <Box sx={{ mt: 1, mb: 1}}>
                                <IncomingOutgoingPayments incomingPaymentId={incomingPaymentId}   outgoingPaymentsData={incomingPaymentDetails?.outgoingpayment_set} savedData={handlesavedData} />
                            </Box>
                        </RitzTabPanel>
                        <RitzTabPanel value='3'>
                            <Box sx={{ mt: 1, mb: 1}}>
                                <IncomingReceivings receivingsData ={incomingPaymentDetails?.purchase_order_payments}/>
                            </Box>
                        </RitzTabPanel>
                    </TabContext>
                </>
            )}
        </>
    );
};

export default IncomingPaymentDetails;
