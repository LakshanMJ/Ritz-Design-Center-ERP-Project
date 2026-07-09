import React, { useEffect, useState } from 'react';
import { formatAmount, getDefaultError } from '@/helpers/Utilities';
import toast from 'react-hot-toast';
import { Box, Breadcrumbs, Button, Card, Grid, Link, Table, TableBody, TableCell, TableHead, TableRow, Typography, useTheme } from '@mui/material';
import DefaultLoader from '@/components/DefaultLoader';
import { ReactKeyHelper } from '@/helpers/KeyHelper';
import api from '@/services/api';
import { commercialInvoiceDetailsURL, commercialInvoiceStateChangeURL, recalculateCommercialInvoiceValuesURL } from '@/helpers/constants/rest_urls/FinanceUrls';
import { RitzTabs, RitzTabPanel } from '@/components/Ritz/RitzTabs';
import { TabContext } from '@mui/lab';
import { useRouter } from 'next/router';
import SaveSpinner from "@/components/SaveSpinner";
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import NextLink from 'next/link';
import RitzModal from '@/components/Ritz/RitzModal';
import EditCommercialInvoice from './EditCommercialInvoice';
import LoopIcon from '@mui/icons-material/Loop';
import { DEFAULT_SUCCESS } from '@/helpers/constants/Constants';
import RitzToolTip from '@/components/Ritz/RitzTooltip';
import RitzTable from '@/components/Ritz/RitzTable';
import { ColumnDef } from '@tanstack/react-table';
import { outgoingPaymentDetailPageURL } from '@/helpers/constants/front_end/FinanceUrls';
import { createdGrnDetailsPageURL } from '@/helpers/constants/front_end/GrnUrls';
import { CI_CANCELED_STATE, CI_CLOSED_STATE, CI_GRN_FINALIZED_STATE, CI_OPEN_STATE, CI_REMEDIATION_FINALIZED_STATE } from '@/helpers/constants/CommercialInvoiceStates';

const CommercialInvoiceSummary = ({ commercialInvoiceId }: any) => {
    const tabDisplayOrderKey = 'tabDisplayOrder';
    const tabLabel = 'tabLabel';
    const summaryTabKey = 'summary';
    const outgoingPaymentsKey = 'outgoing_payments';

    const commercialInvoiceTabs = {
        [summaryTabKey]: { [tabDisplayOrderKey]: '1', [tabLabel]: 'Summary' },
        [outgoingPaymentsKey]: { [tabDisplayOrderKey]: '2', [tabLabel]: 'OutgoingPayments' },
    };

    const initialTabs = [
        commercialInvoiceTabs[summaryTabKey][tabLabel],
        commercialInvoiceTabs[outgoingPaymentsKey][tabLabel],
    ]
    const router = useRouter();
    const keyHelper = new ReactKeyHelper();
    const theme = useTheme()
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isChangeState, setIsChangeState] = useState(false);
    const [editModalData, setEditModalData] = useState<any>({});
    const [commercialInoiceDetails, setCommercialInoiceDetails] = useState<any>({})
    const [activeTab, setActiveTab] = useState('1');
    const [summaryTabs, setSummaryTabs] = useState([...initialTabs]);
    const [stateChangeButtonData, setStateButtonData] = useState<any>({ buttonLabel: null, nextState: null });
    console.log(stateChangeButtonData,"stateChangeButtonDatastateChangeButtonDatastateChangeButtonData")
    const fetchData = () => {
        const requests = [
            api.get(commercialInvoiceDetailsURL(commercialInvoiceId)),
        ];
        Promise.all(requests).then(resp => {
            const respData = resp.map((r: any) => r.data);
            const [invoiceDetails] = respData;
            setCommercialInoiceDetails({ ...invoiceDetails })
            handleStateButtonData(invoiceDetails?.ci_state)
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoading(false));
    }

    const handleRecalculateValues = () => {
        setIsSaving(true)
        const request = {
            method: 'post',
            url: recalculateCommercialInvoiceValuesURL(commercialInvoiceId),
        }
        api(request).then(() => {
            toast.success(DEFAULT_SUCCESS);
            fetchData();
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsSaving(false));
    }

    const handleChangeTabs = (event: string) => {
        const url = {
            pathname: router.pathname,
            query: { ...router.query, tab: event }
        }
        router.replace(url, undefined, { shallow: true });
    }

    const handleOpenEditModal = (modalStatus: any) => {
        setEditModalData({ modalStatus: modalStatus })
    }

    const changeInvoiceState =()=>{
        setIsChangeState(true)
        api.post(commercialInvoiceStateChangeURL(commercialInvoiceId), { new_state: stateChangeButtonData?.nextState })
        .then(() => {
          fetchData()
        })
        .catch((error) => {
          toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsChangeState(false));;
    }
    const handleStateButtonData = (currentState: any) => {
        let buttonLabel = '';
        let nextState = '';
        if (currentState === CI_OPEN_STATE) {
          buttonLabel = 'GRN Finalized';
          nextState = CI_GRN_FINALIZED_STATE;
        } else if (currentState === CI_GRN_FINALIZED_STATE) {
          buttonLabel = 'Remediation Finalized';
          nextState = CI_REMEDIATION_FINALIZED_STATE;
        } else if (currentState === CI_REMEDIATION_FINALIZED_STATE) {
          buttonLabel = 'Closed';
          nextState = CI_CLOSED_STATE;
        } else if (currentState === CI_CLOSED_STATE) {
            buttonLabel = 'Cancel';
            nextState = CI_CANCELED_STATE;
        }
        setStateButtonData({ buttonLabel, nextState });
      };


    useEffect(() => {
        if (commercialInvoiceId) {
            fetchData()
        }
    }, [commercialInvoiceId]);

    useEffect(() => {
        const { tab } = router.query;
        if (tab) {
            setActiveTab(tab.toString());
        }
    }, [router]);

    return (
        <>
            {editModalData?.modalStatus && (
                <RitzModal
                    open={editModalData?.modalStatus}
                    onClose={() => { handleOpenEditModal(false) }}
                    title={"Edit Commercial Invoice Details"}
                    maxWidth='md'
                >
                    <EditCommercialInvoice
                        commercialInvoiceId={commercialInvoiceId}
                        currentState={commercialInoiceDetails?.ci_state}
                        totalPrice={commercialInoiceDetails?.total_price?.amount}
                        debitNoteAmount={commercialInoiceDetails?.debit_note_total_amount?.amount}
                        paymentDueDate={commercialInoiceDetails?.payment_due_date}
                        attachment={commercialInoiceDetails?.invoice}
                        refreshData={() => {
                            handleOpenEditModal(false), fetchData()
                        }}
                    />
                </RitzModal>
            )}
            {isLoading ? (
                <DefaultLoader />
            ) : (
                <>
                    <Breadcrumbs
                        separator={<NavigateNextIcon fontSize="small" />}
                        aria-label="breadcrumb"
                        sx={{ mb: 1.5 }}
                    >
                        <Link underline='hover' color='inherit' component={NextLink} href={'/pcl/finance/commercial_invoice'}>Commercial Invoice List</Link>
                        <Typography color='text.primary'>Commercial Invoice Details</Typography>
                    </Breadcrumbs>

                    <Typography variant='h1'>Commercial Invoice Details</Typography>
                    {commercialInoiceDetails?.ci_state !== CI_CANCELED_STATE && (
                        <Box>
                            <Button variant='outlined' disabled={isChangeState} onClick={changeInvoiceState} sx={{ mr: 1.5, mb: 1 }}>{isChangeState && <SaveSpinner />}{stateChangeButtonData?.buttonLabel}</Button>
                        </Box>
                    )}
                    
                    <Card variant='outlined' sx={{ mb: 2, p: 2 }}>
                        <Box>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={3}>
                                    <Box>
                                        <Typography sx={{ fontWeight: 'bold', mb: 1 }}>CI No :</Typography>
                                        <Typography sx={{ mb: 1 }}>{commercialInoiceDetails?.display_number}</Typography>
                                    </Box>
                                </Grid>
                                <Grid item xs={12} sm={3}>
                                    <Box>
                                        <Typography sx={{ fontWeight: 'bold', mb: 1 }}>Supplier CI No :</Typography>
                                        <Typography sx={{ mb: 1 }}>{commercialInoiceDetails?.supplier_invoice_number}</Typography>

                                    </Box>
                                </Grid>
                                <Grid item xs={12} sm={3}>
                                    <Box>
                                        <Typography sx={{ fontWeight: 'bold', mb: 1 }}>Supplier:</Typography>
                                        <Typography sx={{ mb: 1 }}>{commercialInoiceDetails?.supplier_name}</Typography>

                                    </Box>
                                </Grid>
                                <Grid item xs={12} sm={3}>
                                    <Box>
                                        <Typography sx={{ fontWeight: 'bold', mb: 1 }}>Supplier PO's :</Typography>
                                        <Typography sx={{ mb: 1 }}>
                                            {commercialInoiceDetails?.supplier_pos?.length > 0 ? (
                                                <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>
                                                    {commercialInoiceDetails?.supplier_pos?.map((spo: any, index: number) => (
                                                        <Box key={spo.id}>
                                                            <Link
                                                                href={spo.supplier_po?.file_path || '#'}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                sx={{ mr: 1 }}
                                                            >
                                                                {spo.display_number}
                                                            </Link>
                                                            {index < commercialInoiceDetails?.supplier_pos.length - 1 && ','}
                                                        </Box>
                                                    ))}
                                                </Box>
                                            ) : (
                                                'N/A'
                                            )}
                                        </Typography>
                                    </Box>
                                </Grid>
                                <Grid item xs={12} sm={3}>
                                    <Box>
                                        <Typography sx={{ fontWeight: 'bold', mb: 1 }}>Total Price :</Typography>
                                        <Typography sx={{ mb: 1 }}>{commercialInoiceDetails?.total_price?.amount} {commercialInoiceDetails?.total_price?.amount_currency_display}</Typography>

                                    </Box>
                                </Grid>
                                <Grid item xs={12} sm={3}>
                                    <Box>
                                        <Typography sx={{ fontWeight: 'bold', mb: 1 }}>Balance Due :</Typography>
                                        <Typography sx={{ mb: 1 }}>{commercialInoiceDetails?.balance_amount?.amount} {commercialInoiceDetails?.balance_amount?.amount_currency_display}</Typography>

                                    </Box>
                                </Grid>
                                <Grid item xs={12} sm={3}>
                                    <Box>
                                        <Typography sx={{ fontWeight: 'bold', mb: 1 }}>Calculated Total Price :</Typography>
                                        <Typography sx={{ mb: 1 }}>{commercialInoiceDetails?.calculated_total_price?.amount} {commercialInoiceDetails?.calculated_total_price?.amount_currency_display}</Typography>

                                    </Box>
                                </Grid>
                                <Grid item xs={12} sm={3}>
                                    <Box>
                                        <Typography sx={{ fontWeight: 'bold', mb: 1 }}>Debit Note Amount :</Typography>
                                        <Typography sx={{ mb: 1 }}>{commercialInoiceDetails?.debit_note_total_amount?.amount} {commercialInoiceDetails?.debit_note_total_amount?.amount_currency_display}</Typography>

                                    </Box>
                                </Grid>
                                <Grid item xs={12} sm={3}>
                                    <Box>
                                        <Typography sx={{ fontWeight: 'bold', mb: 1 }}>Calculated Debit Note Total Amount :</Typography>
                                        <Typography sx={{ mb: 1 }}>{commercialInoiceDetails?.calculated_debit_note_total_amount?.amount} {commercialInoiceDetails?.calculated_debit_note_total_amount?.amount_currency_display}</Typography>

                                    </Box>
                                </Grid>
                                <Grid item xs={12} sm={3}>
                                    <Box>
                                        <Typography sx={{ fontWeight: 'bold', mb: 1 }}>Due Date :</Typography>
                                        <Typography sx={{ mb: 1 }}>{commercialInoiceDetails?.payment_due_date || '--'}</Typography>

                                    </Box>
                                </Grid>
                                <Grid item xs={12} sm={3}>
                                    <Box>
                                        <Typography sx={{ fontWeight: 'bold', mb: 1 }}>State :</Typography>
                                        <Typography sx={{ mb: 1 }}>{commercialInoiceDetails?.get_ci_state_display}</Typography>

                                    </Box>
                                </Grid>
                                <Grid item xs={12} sm={3}>
                                    <Box>
                                        <Typography sx={{ fontWeight: 'bold', mb: 1 }}>Attachment :</Typography>
                                        <Typography sx={{ mb: 1 }}>
                                            <Link
                                                href={commercialInoiceDetails?.invoice?.file_path || '#'}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                sx={{ mr: 1 }}
                                            >
                                                {commercialInoiceDetails?.invoice?.display_name}
                                            </Link>
                                        </Typography>
                                    </Box>
                                </Grid>
                            </Grid>
                        </Box>
                        <Box display="flex" justifyContent="flex-end">
                            {commercialInoiceDetails?.ci_state == 'grn_finalized' && (
                                <Box display="flex" justifyContent="flex-end" alignItems="center">
                                    <Button
                                        onClick={handleRecalculateValues}
                                        variant="contained"
                                        color="primary"
                                        disabled={isSaving}
                                        sx={{ mr: 2 }}
                                    >{isSaving && <SaveSpinner />}<LoopIcon />Recalculate values</Button>
                                </Box>
                            )}
                            <Button
                                onClick={() => handleOpenEditModal(true)}
                                variant="contained"
                                color="primary"
                                disabled={isSaving}
                            >Edit</Button>
                        </Box>
                    </Card>
                    <TabContext value={activeTab}>
                        <RitzTabs
                            tabs={summaryTabs}
                            activeTab={activeTab}
                            emitChange={handleChangeTabs}
                        />
                        <RitzTabPanel value={`${commercialInvoiceTabs[summaryTabKey][tabDisplayOrderKey]}`}>
                            <Box sx={{ mt: 1, mb: 1 }}>
                                <Table>
                                    <TableHead>
                                        <TableRow sx={{ background: theme.palette.grey[200], border: (theme) => `1px solid ${theme.palette.grey[100]}` }}>
                                            <TableCell>Costing/PO Club No</TableCell>
                                            <TableCell>SPO</TableCell>
                                            <TableCell>GRN</TableCell>
                                            <TableCell>Material</TableCell>
                                            <TableCell>Excess</TableCell>
                                            <TableCell>Deficit</TableCell>
                                            <TableCell>Reject</TableCell>
                                            <TableCell>Width Remediation</TableCell>
                                            <TableCell>Mismatch Qty</TableCell>
                                            <TableCell>Debit Note Amount</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {commercialInoiceDetails?.grn_details?.length == 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={10} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}> No data found.</TableCell>
                                            </TableRow>
                                        ) : (
                                            commercialInoiceDetails?.grn_details?.map((genData: any, genDataIndex: any) => (
                                                <>
                                                    <TableRow>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                            {genData?.costing_or_po_club_display_number}
                                                        </TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                            <Link target="_blank" component={NextLink} href={genData?.supplier_po_file?.file_path||'#'}>{genData?.supplier_po_number}</Link>
                                                        </TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                            <Link target="_blank" component={NextLink} href={createdGrnDetailsPageURL(genData?.grn_id)|| '#'}>{genData?.grn_display_number}</Link>
                                                        </TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                                {genData?.material?.attributes?.ritz_customer_brand_reference_code}
                                                                <RitzToolTip materialHeaders={genData?.material?.headers} materialDetails={genData?.material?.attributes} />
                                                            </Box>
                                                        </TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{genData?.total_excess_quantity} {genData?.total_excess_quantity_units}</TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{genData?.total_deficit_quantity} {genData?.total_deficit_quantity_units}</TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{genData?.total_qa_rejected_quantity} {genData?.total_qa_rejected_quantity_units}</TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{genData?.width_replacement_quantity} {genData?.width_replacement_quantity_units}</TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{Math.abs(genData?.mismatch_quantity)} {genData?.mismatch_quantity_units}</TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{genData?.debit_note_amount?.amount} {genData?.debit_note_amount?.amount_currency_display}</TableCell>
                                                    </TableRow>
                                                </>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </Box>
                        </RitzTabPanel>
                        <RitzTabPanel value={`${commercialInvoiceTabs[outgoingPaymentsKey][tabDisplayOrderKey]}`}>
                            <Box>
                                <Table>
                                    <TableHead>
                                        <TableRow sx={{ background: theme.palette.grey[200], border: (theme) => `1px solid ${theme.palette.grey[100]}` }}>
                                            <TableCell>Outgoing Payment No</TableCell>
                                            <TableCell>Amount (USD)</TableCell>
                                            <TableCell>Payment Date</TableCell>
                                            <TableCell>Payment Type</TableCell>
                                            <TableCell>Status</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {commercialInoiceDetails?.outgoing_payments?.length == 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={9} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}> No data found.</TableCell>
                                            </TableRow>
                                        ) : (
                                            commercialInoiceDetails?.outgoing_payments?.map((outGoing: any, genDataIndex: any) => (
                                                <>
                                                    <TableRow>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}><Link component={NextLink} target={'_blank'} href={outgoingPaymentDetailPageURL(outGoing.id)}>{outGoing.display_number}</Link></TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{outGoing?.amount?.amount}</TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{outGoing?.payment_date}</TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{outGoing?.payment_method_display}</TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{outGoing?.complete ? 'Complete' : 'InComplete'}</TableCell>
                                                    </TableRow>
                                                </>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </Box>
                        </RitzTabPanel>
                    </TabContext>
                </>
            )}
        </>
    );
};

export default CommercialInvoiceSummary;