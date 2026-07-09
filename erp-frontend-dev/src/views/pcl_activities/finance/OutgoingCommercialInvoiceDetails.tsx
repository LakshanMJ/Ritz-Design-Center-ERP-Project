import React, { useEffect, useState } from 'react';
import { formatAmount, getDefaultError } from '@/helpers/Utilities';
import toast from 'react-hot-toast';
import { Autocomplete, Box, Button, Card, Checkbox, darken, Divider, Grid, Link, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import DefaultLoader from '@/components/DefaultLoader';
import { ReactKeyHelper } from '@/helpers/KeyHelper';
import api from '@/services/api';
import { createOutgoingCommercialInvoiceURl, incomingPaymentDetailsURL, outgoingCommercialInvoiceDetailsURL, outgoingCommercialInvoiceListURL, paymentCurrencyListURL, saveIncomingPaymentDetails, updateOutgoingCommercialInvoiceURL } from '@/helpers/constants/rest_urls/FinanceUrls';
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
import RitzSelection from '@/components/Ritz/RitzSelection';
import { customersURL } from '@/helpers/constants/RestUrls';
import NextLink from 'next/link';
import { incomingPaymentDetailPageURL } from '@/helpers/constants/front_end/FinanceUrls';
import { purchaseOrderDetailPageURL } from '@/helpers/constants/FrontEndUrls';

const OutgoingCommercialInvoiceDetails = ({ outgoingCommercialInvoiceId }: any) => {
    const router = useRouter();
    const keyHelper = new ReactKeyHelper();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [invoiceDetails, setInvoiceDetails] = useState<any>({})
    const [activeTab, setActiveTab] = useState('1');
    const [summaryTabs, setSummaryTabs] = useState(["Incoming Payments", "Purchase Order Deliveries"]);
    const [currencyList, setCurrencyList] = useState<any>([])
    const [customerList, setCustomerList] = useState<any>([])

    const fetchData = () => {
        const requests = [
            api.get(outgoingCommercialInvoiceDetailsURL(outgoingCommercialInvoiceId)),
            api.get(paymentCurrencyListURL()),
            api.get(customersURL()),
        ];
        Promise.all(requests).then(resp => {
            const respData = resp.map((r: any) => r.data);
            const [incomingPaymentDetails, currencyDetails, customers] = respData;
            setInvoiceDetails({ ...incomingPaymentDetails })
            setCurrencyList([...currencyDetails])
            setCustomerList([...customers])
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
            amount: invoiceDetails?.amount || null,
            currency: invoiceDetails?.currency || null,
            customer: invoiceDetails?.customer || null,
            customer_id: invoiceDetails?.customer || null,
            due_date: invoiceDetails?.due_date || null
        }
        api.put(updateOutgoingCommercialInvoiceURL(outgoingCommercialInvoiceId), saveData).then(resp => {
            toast.success(DEFAULT_SUCCESS);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsSaving(false));

    }

    const handleChangeInputs = (field: any, value: any) => {
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

    const incomingPaymentColumns: ColumnDef<any>[] = [
        {
            accessorKey: 'display_number',
            header: 'Incoming Payment No',
            cell: props => (
                <Link component={NextLink} target={'_blank'} href={incomingPaymentDetailPageURL(props.row.original.id)}>{props.row.original.display_number}</Link>
            )
        },
        {
            accessorKey: 'amount',
            header: 'Amount (USD)',
            cell: props => (
                <>
                    {formatAmount(props.row.original.amount?.amount)}
                </>
            )
        },
        {
            accessorKey: 'payment_date',
            header: 'Payment Date',
        },
        {
            accessorKey: 'complete',
            header: 'Status',
            cell: ({ row }) => (row.original.complete ? 'Complete' : 'InComplete'),
        },
    ]
    const purchaseOrderDeliveryColumns: ColumnDef<any>[] = [
        {
            accessorKey: 'purchase_order',
            header: 'Purchase Order',
            cell: props => (
                <Link component={NextLink} target={'_blank'} href={purchaseOrderDetailPageURL(props.row.original.purchase_order)}>{props.row.original.purchase_order}</Link>
            )
        },
        {
            accessorKey: 'amount',
            header: 'Amount (USD)',
            cell: props => (
                <>
                    {formatAmount(props.row.original.amount?.amount)}
                </>
            )
        },
        {
            accessorKey: 'delivery_date',
            header: 'Delivery Date',
        },
    ]

    useEffect(() => {
        if (outgoingCommercialInvoiceId) {
            fetchData()
        }
    }, [outgoingCommercialInvoiceId]);

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
                                        <Typography sx={{ fontWeight: 'bold', mb: 1 }}>Outgoing Commercial Invoice No :</Typography>
                                        <TextField
                                            id={'placement'}
                                            type={'text'}
                                            value={invoiceDetails?.display_number || ''}
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
                                                id='amount'
                                                fullWidth
                                                type='number'
                                                autoComplete="off"
                                                size={'small'}
                                                name="amount"
                                                value={invoiceDetails?.amount?.amount}
                                                onChange={(e: any) => handleChangeInputs('amount', parseFloat(e.target.value))}
                                            />
                                    </Box>
                                </Grid>
                                <Grid item xs={12} sm={3}>
                                    <Box>
                                        <Typography sx={{ fontWeight: 'bold', mb: 1 }}>Currency :</Typography>
                                        <RitzSelection
                                            id={'currency'}
                                            name={'currency'}
                                            optionValue={'id'}
                                            optionText={'name'}
                                            size={'small'}
                                            selectedValue={invoiceDetails.currency}
                                            isRequired={true}
                                            options={currencyList}
                                            handleOnChange={(e: any) => handleChangeInputs('currency', e.target.value)}
                                        />
                                    </Box>
                                </Grid>
                                <Grid item xs={12} sm={3}>
                                    <Box>
                                        <Typography sx={{ fontWeight: 'bold', mb: 1 }}>Customer :</Typography>
                                            <RitzSelection
                                                id={'customer'}
                                                name={'customer'}
                                                optionValue={'id'}
                                                optionText={'name'}
                                                size={'small'}
                                                selectedValue={invoiceDetails.customer}
                                                isRequired={true}
                                                options={customerList}
                                                handleOnChange={(e: any) => handleChangeInputs('customer', e.target.value)}
                                            />
                                    </Box>
                                </Grid>
                                <Grid item xs={12} sm={3}>
                                    <Box>
                                        <Typography sx={{ fontWeight: 'bold', mb: 1 }}>Due Date:</Typography>
                                            <LocalizationProvider dateAdapter={AdapterDayjs}>
                                                <DatePicker
                                                    minDate={dayjs(Date.now())}
                                                    format='DD/MM/YYYY'
                                                    value={invoiceDetails.due_date ? dayjs(invoiceDetails.due_date) : null}
                                                    onChange={(e: any) => handleChangeInputs('due_date', dayjs(e.$d).format('YYYY-MM-DD'))}
                                                    slotProps={{
                                                        textField: {
                                                            size: 'small'
                                                        }
                                                    }}
                                                />
                                            </LocalizationProvider>
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
                            <Box sx={{ mt: 1, mb: 1 }}>
                                <RitzTable
                                    data={invoiceDetails?.incoming_payments}
                                    columns={incomingPaymentColumns}
                                />
                             </Box>
                        </RitzTabPanel>
                        <RitzTabPanel value='2'>
                            <Box sx={{ mt: 1, mb: 1 }}>
                                <RitzTable
                                    data={invoiceDetails?.purchaseorderdelivery_set}
                                    columns={purchaseOrderDeliveryColumns}
                                />
                             </Box>
                        </RitzTabPanel>
                    </TabContext>
                </>
            )}
        </>
    );
};

export default OutgoingCommercialInvoiceDetails;
