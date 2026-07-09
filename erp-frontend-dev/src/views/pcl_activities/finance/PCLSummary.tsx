import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Card, CardContent, Typography, Box, Grid, List, ListItem, ListItemButton, ListItemText, Divider, Table, TableBody, TableCell, TableRow, Alert, IconButton, Tooltip, TableHead, Button, Link, InputLabel, Checkbox, TableContainer, Paper, useTheme } from '@mui/material';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { formatAmount, getDefaultError } from '@/helpers/Utilities';
import { pclOrderProfitabilityDetails, pclPOClubBOMSummaryURL, pclPOClubDetailUrl, pclPOClubOrderProfitabilityDetails, pclPOOrderProfitabilityDetails, pclStateChangeURL, pclSummaryDetailUrl } from '@/helpers/constants/rest_urls/FinanceUrls';
import DefaultLoader from '@/components/DefaultLoader';
import { ReactKeyHelper } from '@/helpers/KeyHelper';
import { TabContext } from '@mui/lab';
import { RitzTabPanel, RitzTabs } from '@/components/Ritz/RitzTabs';
import { useRouter } from 'next/router';
import { ColumnDef } from '@tanstack/react-table';
import NextLink from 'next/link';
import RitzModal from '@/components/Ritz/RitzModal';
import PrintIcon from '@mui/icons-material/Print';
import { commercialInvoiceSummaryPageURL, outgoingPaymentDetailPageURL } from '@/helpers/constants/front_end/FinanceUrls';
import RitzTable from '@/components/Ritz/RitzTable';
import EditPCLInformation from './EditPCLInformation';
import { PCL_CLOSED_STATE, PCL_DRAFT_STATE, PCL_SENT_TO_BANK_STATE } from '@/helpers/constants/PCLStates';
import { DEFAULT_SUCCESS } from '@/helpers/constants/Constants';
import SaveSpinner from '@/components/SaveSpinner';
import CircularLoader from '@/components/CircularLoader';
import PCLOpenGanttChart from './PCLOpenGanttChart';
import { purchaseOrderClubDetailsPageURL } from '@/helpers/constants/front_end/POUrls';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { purchaseOrderDetailPageURL } from '@/helpers/constants/FrontEndUrls';
import RitzToolTip from '@/components/Ritz/RitzTooltip';
import PCLOrderProfitabilityDetails from './PCLOrderProfitabilityDetails';
import { useReactToPrint } from 'react-to-print';
import PCLClubBomDetails from '../pcl_facility/PCLClubBomDetails';

const PCLSummary = ({ pclDetailId }: any) => {
    const theme = useTheme()
    const contentRef = useRef<HTMLDivElement>(null);
    const reactToPrintFn = useReactToPrint({ contentRef });
    const tabDisplayOrderKey = 'tabDisplayOrder';
    const tabLabel = 'tabLabel';
    const poDetailsTabKey = 'po_details';
    const bomTabKey = 'bom_details';
    const advancePaymentTabKey = 'advance_payment';
    const incomingPaymentsTabKey = 'incoming_payments';
    const outgoingPaymentsTabKey = 'outgoing_payments';
    const ganttChartTabKey = 'gantt_chart';
    const orderProfitabilityTabKey = 'order_profitability';

    const pclFacilityTabs = {
        [poDetailsTabKey]: { [tabDisplayOrderKey]: '1', [tabLabel]: 'PO Details' },
        [bomTabKey]: { [tabDisplayOrderKey]: '2', [tabLabel]: 'BOM Details' },
        [advancePaymentTabKey]: { [tabDisplayOrderKey]: '3', [tabLabel]: 'Advance Payments' },
        [incomingPaymentsTabKey]: { [tabDisplayOrderKey]: '4', [tabLabel]: 'Payment Invoices' },
        [outgoingPaymentsTabKey]: { [tabDisplayOrderKey]: '5', [tabLabel]: 'Created PCLs' },
        [ganttChartTabKey]: { [tabDisplayOrderKey]: '6', [tabLabel]: 'Gantt Chart' },
        [orderProfitabilityTabKey]: { [tabDisplayOrderKey]: '7', [tabLabel]: 'Profitability Bank Report' },
    };

    const initialTabs = [
        pclFacilityTabs[poDetailsTabKey][tabLabel],
        pclFacilityTabs[bomTabKey][tabLabel],
        pclFacilityTabs[advancePaymentTabKey][tabLabel],
        pclFacilityTabs[incomingPaymentsTabKey][tabLabel],
        pclFacilityTabs[outgoingPaymentsTabKey][tabLabel],
        pclFacilityTabs[ganttChartTabKey][tabLabel],
        pclFacilityTabs[orderProfitabilityTabKey][tabLabel],
    ]

    const router = useRouter();
    const keyHelper = new ReactKeyHelper();
    const [summaryTabs, setSummaryTabs] = useState([...initialTabs]);
    const [activeTab, setActiveTab] = useState('1');
    const [isLoading, setIsLoading] = useState(true)
    const [isLoadingCircularLoader, setIsLoadingCircularLoader] = useState(false)
    const [isChangeState, setIsChangeState] = useState(false)
    const [isOpenEditModal, setIsOpenEditModal] = useState<any>({ modalStatus: false })
    const [pclDetails, setPclDetails] = useState<any>({});
    const [openProfitabilityModal, setOpenProfitabilityModal] = useState({ modalStatus: false, selectedId: null, selectedType: null })
    const [selectedPCLChartModal, setSelectedPCLChartModal] = useState<any>({})

    const fetchData = () => {
        const requests = [
            api.get(pclPOClubBOMSummaryURL(pclDetailId)),
        ]
        Promise.all(requests).then(response => {
            const [pclDetails] = response.map((r: any) => r.data);
            setPclDetails({ ...pclDetails })
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false);
            setIsLoadingCircularLoader(false)
        });
    }
    const outgoingPaymentColumns: ColumnDef<any>[] = [
        {
            accessorKey: 'display_number',
            header: 'PCL No',
            cell: props => (
                <Link component={NextLink} target={'_blank'} href={outgoingPaymentDetailPageURL(props.row.original.id)}>{props.row.original.display_number}</Link>
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
            accessorKey: 'payment_method',
            header: 'Payment Type',
        },
        {
            accessorKey: 'complete',
            header: 'Status',
            cell: ({ row }) => (row.original.complete ? 'Complete' : 'InComplete'),
        },
    ]

    const handleChangeTabs = (event: string) => {
        const url = {
            pathname: router.pathname,
            query: { ...router.query, tab: event }
        }
        router.replace(url, undefined, { shallow: true });
    };

    const handleOpenEditModal = (status: any) => {
        setIsOpenEditModal({ modalStatus: status })
    }

    const handleChangeState = (state: any) => {
        setIsChangeState(true)
        const request = {
            method: 'post',
            url: pclStateChangeURL(pclDetailId),
            data: {
                new_state: state || null,
            }
        }
        api(request).then(() => {
            toast.success(DEFAULT_SUCCESS);
            handleRefreshData()
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsChangeState(false)
        });
    }

    const handleRefreshData = () => {
        setIsLoadingCircularLoader(true)
        handleOpenEditModal(false);
        fetchData()
    }

    const handleOpenProfitability = (status: any, selectedId: any, type: any) => {
        setOpenProfitabilityModal({ modalStatus: status, selectedId: selectedId, selectedType: type })
    }

    const handleOpenPCLGanttChart = (status: any, selectedDetail: any) => {
        setSelectedPCLChartModal({ modalStatus: status, selectedData: selectedDetail })
    }

    useEffect(() => {
        if (pclDetailId) {
            fetchData()
        }
    }, [pclDetailId])

    useEffect(() => {
        const { tab } = router.query;
        if (tab) {
            setActiveTab(tab.toString());
        }
    }, [router]);

    return (
        <>
            {isLoadingCircularLoader && (<CircularLoader />)}

            {isOpenEditModal?.modalStatus && (
                <RitzModal open={isOpenEditModal?.modalStatus} maxWidth={'md'} onClose={() => setIsOpenEditModal({ modalStatus: false })} title={"Edit PCL Information"}>
                    <EditPCLInformation
                        pclDetailId={pclDetailId}
                        currentState={pclDetails?.state}
                        startDate={pclDetails?.pcl_facility_start_date}
                        endDate={pclDetails?.pcl_facility_end_date}
                        mergedPOClubs={pclDetails?.merged_po_club_list?.map((club: any) => club.id) || []}
                        refreshData={handleRefreshData}
                    />
                </RitzModal>
            )}
            {openProfitabilityModal?.modalStatus && (
                <RitzModal
                    open={openProfitabilityModal?.modalStatus}
                    onClose={() => { handleOpenProfitability(false, null, null) }}
                    title={"Profitability Details"}
                    maxWidth='md'
                >
                    <PCLOrderProfitabilityDetails
                        dataURL={
                            openProfitabilityModal?.selectedType === 'po' ?
                                pclPOOrderProfitabilityDetails(openProfitabilityModal?.selectedId) : pclPOClubOrderProfitabilityDetails(openProfitabilityModal?.selectedId)
                        }
                    />
                </RitzModal>
            )}
            {selectedPCLChartModal?.modalStatus && (
                <RitzModal
                    open={selectedPCLChartModal?.modalStatus}
                    onClose={() => { handleOpenPCLGanttChart(false, null) }}
                    title={"Material PCL Gantt Chart"}
                    maxWidth='xl'
                    fullWidth={true}
                >
                    <PCLOpenGanttChart dataList={selectedPCLChartModal?.selectedData} />
                </RitzModal>
            )}
            {isLoading ? <DefaultLoader /> : (
                <>
                    <Button variant='outlined' onClick={() => { handleOpenEditModal(true) }} sx={{ mr: 1.5, mb: 2 }}>Edit Information</Button>
                    {pclDetails?.state === PCL_DRAFT_STATE && (
                        <Button variant='outlined' disabled={isChangeState} onClick={() => { handleChangeState(PCL_SENT_TO_BANK_STATE) }} sx={{ mr: 1.5, mb: 2 }}>
                            {isChangeState && <SaveSpinner />}Finalize PCL & Send to Bank
                        </Button>
                    )}
                    {pclDetails?.state === PCL_SENT_TO_BANK_STATE && (
                        <Button variant='outlined' disabled={isChangeState} onClick={() => { handleChangeState(PCL_CLOSED_STATE) }} sx={{ mr: 1.5, mb: 2 }}>
                            {isChangeState && <SaveSpinner />}Close PCL
                        </Button>
                    )}
                    <TabContext value={activeTab}>
                        <RitzTabs
                            tabs={summaryTabs}
                            activeTab={activeTab}
                            emitChange={handleChangeTabs}
                        />
                        <RitzTabPanel value={`${pclFacilityTabs[poDetailsTabKey][tabDisplayOrderKey]}`}>
                            <Box>
                                <Box sx={{ width: '50%' }}>
                                    <Table aria-label="simple table">
                                        <TableBody>
                                            <TableRow>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%' }}>
                                                    Total FOB Value
                                                </TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%', wordBreak: 'break-all' }}>
                                                    {formatAmount(pclDetails?.fob_total_value?.amount)} {pclDetails?.fob_total_value?.amount_currency_display}
                                                </TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%' }}>
                                                    Total Raw Material Price
                                                </TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%', wordBreak: 'break-all' }}>
                                                    {formatAmount(pclDetails?.raw_material_total_cost?.amount)} {pclDetails?.raw_material_total_cost?.amount_currency_display}
                                                </TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%' }}>
                                                    Material/FOB (%)
                                                </TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%', wordBreak: 'break-all' }}>
                                                    {pclDetails?.fob_presentage}
                                                </TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%' }}>
                                                    Max PCL Value
                                                </TableCell>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%', wordBreak: 'break-all' }}>
                                                    {formatAmount(pclDetails?.max_pcl_value?.amount)} {pclDetails?.max_pcl_value?.amount_currency_display}
                                                </TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </Box>
                                <Box>
                                    <Box sx={{ mt: 2 }}>
                                        <Typography color="primary" fontSize="1.2rem" variant="h1">
                                            Merged PO Club Details
                                        </Typography>
                                    </Box>
                                    <Box >
                                        <TableContainer>
                                            <Table aria-label="simple table">
                                                <TableHead>
                                                    <TableRow>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>PO Club</TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>FOB Value</TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Raw Material Price</TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Material/FOB (%)</TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Max PCL Value</TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>PO Club Profitability</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {pclDetails?.merged_po_club_list?.map((poClub: any, poIndex: any) => (
                                                        <TableRow key={`${keyHelper.getNextKeyValue()}`}>
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%', wordBreak: 'break-all' }}>
                                                                <Link sx={{ cursor: 'pointer' }} target={'_blank'} href={purchaseOrderClubDetailsPageURL(poClub.id)}>{poClub?.short_code}</Link>
                                                            </TableCell>
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '10%', wordBreak: 'break-all' }}>{formatAmount(poClub?.fob_total_value?.amount)} {poClub?.fob_total_value?.amount_currency}</TableCell>
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '10%', wordBreak: 'break-all' }}>{formatAmount(poClub?.total_raw_material_cost?.amount)} {poClub?.total_raw_material_cost?.amount_currency}</TableCell>
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '10%', wordBreak: 'break-all' }}>{poClub?.fob_presentage}</TableCell>
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '10%', wordBreak: 'break-all' }}>{formatAmount(poClub?.max_pcl_value?.amount)} {poClub?.max_pcl_value?.amount_currency}</TableCell>
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '10%', wordBreak: 'break-all', textAlign: 'center' }}>
                                                                <Tooltip title="View Profitability Report" arrow>
                                                                    <IconButton
                                                                        size="small"
                                                                        onClick={() => { handleOpenProfitability(true, poClub?.id, 'po_club') }}
                                                                        style={{ cursor: "pointer" }}
                                                                    >
                                                                        <VisibilityIcon color="primary" />
                                                                    </IconButton>
                                                                </Tooltip>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </Box>
                                </Box>
                                <Box>
                                    <Box sx={{ mt: 2 }}>
                                        <Typography color="primary" fontSize="1.2rem" variant="h1">
                                            PO Breakdown Details
                                        </Typography>
                                    </Box>
                                    <Box >
                                        <TableContainer>
                                            <Table aria-label="simple table">
                                                <TableHead>
                                                    <TableRow>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Purchase Order</TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>FOB Value</TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Raw Material Price</TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Material/FOB (%)</TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Max PCL Value</TableCell>
                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>PO Profitability</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {pclDetails?.pruchase_order_data?.map((po: any, poIndex: any) => (
                                                        <TableRow key={`${keyHelper.getNextKeyValue()}`}>
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%', wordBreak: 'break-all' }}>
                                                                <Link sx={{ cursor: 'pointer' }} target={'_blank'} href={purchaseOrderDetailPageURL(po.id)}>{po?.short_code}</Link>
                                                            </TableCell>
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '10%', wordBreak: 'break-all' }}>
                                                                {formatAmount(po?.fob_total_value?.amount)} {pclDetails?.fob_total_value?.amount_currency}
                                                            </TableCell>
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '10%', wordBreak: 'break-all' }}>
                                                                {formatAmount(po?.total_raw_material_cost?.amount)} {po?.total_raw_material_cost?.amount_currency}
                                                            </TableCell>
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '10%', wordBreak: 'break-all' }}>
                                                                {po?.fob_presentage}
                                                            </TableCell>
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '10%', wordBreak: 'break-all' }}>
                                                                {formatAmount(po?.max_pcl_value?.amount)} {pclDetails?.max_pcl_value?.amount_currency}
                                                            </TableCell>
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '10%', textAlign: 'center' }}>
                                                                <Tooltip title="View Profitability Report" arrow>
                                                                    <IconButton
                                                                        size="small"
                                                                        onClick={() => { handleOpenProfitability(true, po?.id, 'po') }}
                                                                        style={{ cursor: "pointer" }}
                                                                    >
                                                                        <VisibilityIcon color="primary" />
                                                                    </IconButton>
                                                                </Tooltip>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </Box>
                                </Box>
                            </Box>
                        </RitzTabPanel>
                        <RitzTabPanel value={`${pclFacilityTabs[bomTabKey][tabDisplayOrderKey]}`}>
                            <Box>
                                <PCLClubBomDetails dataSet={pclDetails?.bom_details}/>
                            </Box>
                        </RitzTabPanel>
                        <RitzTabPanel value={`${pclFacilityTabs[advancePaymentTabKey][tabDisplayOrderKey]}`}>
                            <Box>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left', width: '25%' }}>Payment No</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left', width: '25%' }}>Advance Amount (USD)</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left', width: '25%' }}>TotalAmount (USD)</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left', width: '25%' }}>Advance Payment Due Date</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {pclDetails?.payments?.advances?.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>No available data</TableCell>
                                            </TableRow>
                                        ) : (
                                            pclDetails?.payments?.advances?.map((advance: any, index: any) => (
                                                <TableRow key={`${keyHelper.getNextKeyValue()}`}>
                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}><Link component={NextLink} target='_blank' href={advance?.file?.file_path || '#'}>{advance?.proforma_invoice_supplier_display_number}</Link></TableCell>
                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>{formatAmount(advance?.advance_payment)}</TableCell>
                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>{formatAmount(advance?.total_price)}</TableCell>
                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>{advance?.advance_payment_due_date}</TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </Box>
                        </RitzTabPanel>
                        <RitzTabPanel value={`${pclFacilityTabs[incomingPaymentsTabKey][tabDisplayOrderKey]}`}>
                            <Box>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left', width: '25%' }}>Ritz Invoice No</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left', width: '25%' }}>Supplier Invoice No</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left', width: '25%' }}>Amount (USD)</TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left', width: '25%' }}>Payment Due Date</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {pclDetails?.payments?.payments?.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>No available data</TableCell>
                                            </TableRow>
                                        ) : (
                                            pclDetails?.payments?.payments?.map((payment: any, index: any) => (
                                                <TableRow key={`${keyHelper.getNextKeyValue()}`}>
                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}><Link component={NextLink} target='_blank' href={commercialInvoiceSummaryPageURL(payment?.id)}>{payment?.display_number}</Link></TableCell>
                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>{payment?.supplier_invoice_number}</TableCell>
                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>{formatAmount(payment?.total_price)}</TableCell>
                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>{payment?.payment_due_date}</TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </Box>
                        </RitzTabPanel>
                        <RitzTabPanel value={`${pclFacilityTabs[outgoingPaymentsTabKey][tabDisplayOrderKey]}`}>
                            <Box>
                                <RitzTable
                                    data={pclDetails?.outgoing_payments}
                                    columns={outgoingPaymentColumns}
                                />
                            </Box>
                        </RitzTabPanel>
                        <RitzTabPanel value={`${pclFacilityTabs[ganttChartTabKey][tabDisplayOrderKey]}`}>
                            <Box>
                                <PCLOpenGanttChart dataList={pclDetails?.gantt_chart} />
                            </Box>
                        </RitzTabPanel>
                        <RitzTabPanel value={`${pclFacilityTabs[orderProfitabilityTabKey][tabDisplayOrderKey]}`}>
                            <Box>
                                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                                    <Tooltip title="Print" arrow>
                                        <IconButton onClick={() => reactToPrintFn()}>
                                            <PrintIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </Box>
                                <Box ref={contentRef}>
                                    <PCLOrderProfitabilityDetails dataURL={pclOrderProfitabilityDetails(pclDetailId)} />
                                </Box>

                            </Box>
                        </RitzTabPanel>
                    </TabContext>
                </>
            )}
        </>
    );
};

export default PCLSummary;