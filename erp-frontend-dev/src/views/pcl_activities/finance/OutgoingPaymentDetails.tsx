import React, { useEffect, useState } from 'react';
import { formatAmount, getDefaultError } from '@/helpers/Utilities';
import toast from 'react-hot-toast';
import { Box, Button, Card, Grid, Link, Typography } from '@mui/material';
import DefaultLoader from '@/components/DefaultLoader';
import api from '@/services/api';
import { financePaymentMethodsURL, outgoingPaymentDetailsURL, updateOutgoingPaymentDetails } from '@/helpers/constants/rest_urls/FinanceUrls';
import { RitzTabs, RitzTabPanel } from '@/components/Ritz/RitzTabs';
import { TabContext } from '@mui/lab';
import { useRouter } from 'next/router';
import SaveSpinner from '@/components/SaveSpinner';
import { DEFAULT_SUCCESS } from '@/helpers/constants/Constants';
import NextLink from 'next/link';
import { commercialInvoiceSummaryPageURL } from '@/helpers/constants/front_end/FinanceUrls';
import { ColumnDef } from '@tanstack/react-table';
import RitzTable from '@/components/Ritz/RitzTable';
import CreateOutgoingPayment from './CreateOutgoingPayment';
import RitzModal from '@/components/Ritz/RitzModal';

const OutgoingPaymentDetails = ({ outgoingPaymentId }: any) => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [outgoingPaymentDetails, setOutgoingPaymentDetails] = useState<any>({});
    const [openEditModal, seOpenEditModal] = useState(false);
    const [activeTab, setActiveTab] = useState('1');
    const [summaryTabs] = useState(["SPO Delivery Invoices"]);

    const fetchData = () => {
        Promise.all([
            api.get(outgoingPaymentDetailsURL(outgoingPaymentId)),
        ])
            .then(([paymentDetailsResp]) => {
                setOutgoingPaymentDetails(paymentDetailsResp.data);
            })
            .catch(error => toast.error(getDefaultError(error?.response?.status)))
            .finally(() => setIsLoading(false));
    };

    const handleChangeTabs = (_event: React.SyntheticEvent, newTab: string) => {
        setActiveTab(newTab);
        router.replace(
            { pathname: router.pathname, query: { ...router.query, tab: newTab } },
            undefined,
            { shallow: true }
        );
    };

    const spoInvoiceColumns: ColumnDef<any>[] = [
        {
            accessorKey: 'display_number',
            header: 'SPO / CI',
            cell: ({ row }) => (
                <Link component={NextLink} href={commercialInvoiceSummaryPageURL(row.original.id)}>
                    {row.original.display_number}
                </Link>
            ),
        },
        {
            accessorKey: 'amount',
            header: 'Due Amount (USD)',
            cell: ({ row }) => formatAmount(row.original.amount?.amount),
        },
        {
            accessorKey: 'balance_amount',
            header: 'Balance Amount (USD)',
            cell: ({ row }) => formatAmount(row.original.balance_amount?.amount),
        },
        {
            accessorKey: 'amount',
            header: 'Paid Amount (USD)',
            cell: ({ row }) => formatAmount(row.original.paid_amount?.amount),
        },
    ];

    const handleOpeEditModal = (status: any) => {
        seOpenEditModal(status)
    }

    useEffect(() => {
        if (outgoingPaymentId) {
            fetchData();
        }
    }, [outgoingPaymentId]);

    useEffect(() => {
        const { tab } = router.query;
        if (tab) setActiveTab(tab.toString());
    }, [router.query]);

    return isLoading ? (
        <DefaultLoader />
    ) : (
        <>
            {openEditModal &&(
                <RitzModal open={openEditModal} maxWidth='xl' onClose={() => { handleOpeEditModal(false), fetchData() }} title={"Update Outgoing Payment"}>
                    <CreateOutgoingPayment
                            outgoingPaymentId={outgoingPaymentId}
                            handleSavedData={() => { fetchData(), handleOpeEditModal(false) }} />
                </RitzModal>
            )}
            <Card variant="outlined" sx={{ mb: 2, p: 2 }}>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={3}>
                        <Typography sx={{ fontWeight: 'bold', mb: 1 }}>Outgoing Payment No:</Typography>
                        <Typography sx={{ mb: 1 }}>{outgoingPaymentDetails?.display_number}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                        <Typography sx={{ fontWeight: 'bold', mb: 1 }}>Amount:</Typography>
                        <Typography sx={{ mb: 1 }}>{outgoingPaymentDetails?.amount?.amount || '--'} {outgoingPaymentDetails?.amount?.amount_currency}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                        <Typography sx={{ fontWeight: 'bold', mb: 1 }}>Payment Date:</Typography>
                        <Typography sx={{ mb: 1 }}>{outgoingPaymentDetails?.payment_date}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={3}>
                        <Typography sx={{ fontWeight: 'bold', mb: 1 }}>Payment Type:</Typography>
                        <Typography sx={{ mb: 1 }}>{outgoingPaymentDetails.payment_type_display}</Typography>
                    </Grid>
                    {outgoingPaymentDetails?.payment_type === 'pcl' && (
                        <>
                            <Grid item xs={12} sm={3}>
                                <Typography sx={{ fontWeight: 'bold', mb: 1 }}>PCL Create Date:</Typography>
                                <Typography sx={{ mb: 1 }}>{outgoingPaymentDetails.pcl_create_date}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={3}>
                                <Typography sx={{ fontWeight: 'bold', mb: 1 }}>PCL Settle Date:</Typography>
                                <Typography sx={{ mb: 1 }}>{outgoingPaymentDetails.pcl_settle_date}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={3}>
                                <Typography sx={{ fontWeight: 'bold', mb: 1 }}>PCL End Date:</Typography>
                                <Typography sx={{ mb: 1 }}>{outgoingPaymentDetails.pcl_end_date}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={3}>
                                <Typography sx={{ fontWeight: 'bold', mb: 1 }}>Interest Rate:</Typography>
                                <Typography sx={{ mb: 1 }}>{outgoingPaymentDetails?.interest_rate || '--'}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={3}>
                                <Typography sx={{ fontWeight: 'bold', mb: 1 }}>Interest Charge:</Typography>
                                <Typography sx={{ mb: 1 }}>{outgoingPaymentDetails?.interest_charge} {outgoingPaymentDetails?.interest_charge_currency}</Typography>
                            </Grid>
                        </>
                    )}
                    <Grid item xs={12} sm={3}>
                            <Typography sx={{ fontWeight: 'bold', mb: 1 }}>State:</Typography>
                            <Typography sx={{ mb: 1 }}>{outgoingPaymentDetails?.state_display}</Typography>
                    </Grid>
                </Grid>
                <Box display="flex" justifyContent="flex-end">
                    <Button variant="contained" color="primary" disabled={isSaving} onClick={()=>{handleOpeEditModal(true)}}>
                        {isSaving ? <SaveSpinner /> : "Edit"}
                    </Button>
                </Box>
            </Card>

            <TabContext value={activeTab}>
                <RitzTabs tabs={summaryTabs} activeTab={activeTab} emitChange={handleChangeTabs} />
                <RitzTabPanel value="1">
                    <Box sx={{ mt: 1, mb: 1 }}>
                        <RitzTable data={outgoingPaymentDetails?.selected_invoices_or_spos || []} columns={spoInvoiceColumns} />
                    </Box>
                </RitzTabPanel>
            </TabContext>
        </>
    );
};

export default OutgoingPaymentDetails;