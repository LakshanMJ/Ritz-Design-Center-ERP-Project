import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, Typography, Box, Grid, List, ListItem, ListItemButton, ListItemText, Divider, Table, TableBody, TableCell, TableRow, Alert, IconButton, Tooltip, TableHead, Button, Link } from '@mui/material';
import PCLBomDetails from './PCLBomDetails';
import PCLGanttChart from '../costing/PCLGanttChart';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { formatAmount, getDefaultError } from '@/helpers/Utilities';
import { pclPOClubDetailUrl, pclPOClubOrderProfitabilityDetails, pclPOClubRecalculateValuesURL, pclSummaryDetailsForScrollUrl, pclSummaryDetailUrl } from '@/helpers/constants/rest_urls/FinanceUrls';
import DefaultLoader from '@/components/DefaultLoader';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff';
import RitzSelection from '@/components/Ritz/RitzSelection';
import PCLIncomingPayments from './PCLIncomingPayments';
import PCLOutgoingPayments from './PCLOutgoingPayments';
import FinanceDashboard from './FinanceDashboard';
import { purchaseOrderDetailPageURL } from '@/helpers/constants/FrontEndUrls';
import { ReactKeyHelper } from '@/helpers/KeyHelper';
import { actualPoClubsURL } from '@/helpers/constants/rest_urls/POUrls';
import { customersURL, suppliersURL } from '@/helpers/constants/RestUrls';
import SearchIcon from '@mui/icons-material/Search';
import CircularLoader from '@/components/CircularLoader';
import RitzModal from '@/components/Ritz/RitzModal';
import PCLMatching from './PCLMatching';
import PCLSupplierGRNSummary from './PCLSupplierGRNSummary';
import { useReactToPrint } from 'react-to-print';
import { pclFacilityDetailsPageURL } from '@/helpers/constants/front_end/FinanceUrls';
import DoneIcon from '@mui/icons-material/Done';
import SaveSpinner from '@/components/SaveSpinner';
import { DEFAULT_SUCCESS } from '@/helpers/constants/Constants';
import PCLOpenGanttChart from './PCLOpenGanttChart';
import MenuOpenIcon from "@mui/icons-material/MenuOpen";
import MenuIcon from "@mui/icons-material/Menu";
import { RitzTabPanel, RitzTabs } from '@/components/Ritz/RitzTabs';
import { useRouter } from 'next/router';
import { TabContext } from '@mui/lab';
import PCLOrderProfitabilityDetails from './PCLOrderProfitabilityDetails';
import { purchaseOrderClubDetailsPageURL } from '@/helpers/constants/front_end/POUrls';
import NextLink from 'next/link';

const PCLDetails = () => {
    const router = useRouter();
    const prevPoClub = useRef<string | null>(null); 
    const tabDisplayOrderKey = 'tabDisplayOrder';
    const tabLabel = 'tabLabel';
    const poDetailsTabKey = 'po_details';
    const bomTabKey = 'bom_details';
    const orderProfitabilityTabKey = 'order_profitability';
    const incomingPaymentsTabKey = 'incoming_payments';
    const outgoingPaymentsTabKey = 'outgoing_payments';
    const settlementDetailsTabKey = 'settlement_data';
    const deliveryGanttChartTabKey = 'delivery_chart';
    const pclOpenGanttChartTabKey = 'pcl_open_chart';
    const orderSummaryTabKey = 'order_summary';

    const pclTabs = {
        [poDetailsTabKey]: { [tabDisplayOrderKey]: '1', [tabLabel]: 'PO Details' },
        [bomTabKey]: { [tabDisplayOrderKey]: '2', [tabLabel]: 'BOM Details' },
        [incomingPaymentsTabKey]: { [tabDisplayOrderKey]: '3', [tabLabel]: 'Incoming Payments' },
        [outgoingPaymentsTabKey]: { [tabDisplayOrderKey]: '4', [tabLabel]: 'Outgoing Payments' },
        [settlementDetailsTabKey]: { [tabDisplayOrderKey]: '5', [tabLabel]: 'SettlementDetails' },
        [deliveryGanttChartTabKey]: { [tabDisplayOrderKey]: '6', [tabLabel]: 'Delivery Chart' },
        [pclOpenGanttChartTabKey]: { [tabDisplayOrderKey]: '7', [tabLabel]: 'PCL Open Chart' },
        [orderProfitabilityTabKey]: { [tabDisplayOrderKey]: '8', [tabLabel]: 'Order Profitability' },
        [orderSummaryTabKey]: { [tabDisplayOrderKey]: '9', [tabLabel]: 'Order Summary' },

    };
    const initialTabs = [
        pclTabs[poDetailsTabKey][tabLabel],
        pclTabs[bomTabKey][tabLabel],
        pclTabs[incomingPaymentsTabKey][tabLabel],
        pclTabs[outgoingPaymentsTabKey][tabLabel],
        pclTabs[settlementDetailsTabKey][tabLabel],
        pclTabs[deliveryGanttChartTabKey][tabLabel],
        pclTabs[pclOpenGanttChartTabKey][tabLabel],
        pclTabs[orderProfitabilityTabKey][tabLabel],
        pclTabs[orderSummaryTabKey][tabLabel],
    ]


    const keyHelper = new ReactKeyHelper();
    const [isLoading, setIsLoading] = useState(true)
    const [isLoadingDetailView, setIsLoadingDetailView] = useState(false)
    const [isLoadingCircularLoader, setIsLoadingCircularLoader] = useState(false);
    const [refreshingValues, setRefreshingValues] = useState(false)
    const [isFiltering, setIsFiltering] = useState(false)
    const [isOpenPCLMatchingModal, setIsOpenPCLMatchingModal] = useState(false)
    const [selectedClubId, setSelectedClubId] = useState<any>(null);
    const [poClubDetails, setPoClubDetails] = useState<any>({});
    const [filtterData, setFiltterData] = useState<any>({});
    const [pclSummaryDetails, setPclSummaryDetails] = useState<any>([])
    const [poClubList, setPoClubList] = useState<any>([])
    const [suppliers, setSuppliers] = useState<any>([])
    const [isMinimized, setIsMinimized] = useState(false);
    const [pclDetailsTabs, setPclDetailsTabs] = useState([...initialTabs]);
    const [activeTab, setActiveTab] = useState('1');
    const contentRef = useRef<HTMLDivElement>(null);
    const reactToPrintFn = useReactToPrint({ contentRef });

    const fetchData = () => {
        const requests = [
            api.get(pclSummaryDetailUrl()),
            api.get(actualPoClubsURL()),
            api.get(customersURL()),
        ]
        Promise.all(requests).then(response => {
            const [pclDetails, poClubList, suppliers] = response.map((r: any) => r.data);
            setPclSummaryDetails([...pclDetails])
            setPoClubList([...poClubList?.results])
            setSuppliers([...suppliers])
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false);
        });
    }
    const loadPODetails = (poClubId: any) => {
        setPoClubDetails({})
        const requests = [
            api.get(pclPOClubDetailUrl(poClubId)),
        ]
        Promise.all(requests).then(response => {
            const [poClubDetails] = response.map((r: any) => r.data);
            setPoClubDetails({ ...poClubDetails })
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoadingDetailView(false);
            setIsLoadingCircularLoader(false)
        });
    }

    const handlePoClubClick = (club: any) => {
        setIsLoadingDetailView(true)
        setSelectedClubId(club.po_club_id);
        loadPODetails(club.po_club_id)
        const url = {
            pathname: router.pathname, 
            query: { ...router.query, po_club: club.po_club_id }
        }
        router.replace(url, undefined, { shallow: true });
    };

    const handleFilterToggle = () => {
        setIsFiltering((prev) => !prev);
    }
    const handleChangeFilterData = (field: string, value: any) => {
        setFiltterData((prevData: any) => ({
            ...prevData,
            [field]: value,
        }));
    };
    //Todo part
    const [backgroundColor, setBackgroundColor] = useState("white");
    const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
    const [isScrollLoading, setIsScrollLoading] = useState(false)

    const handleScroll = (event: any) => {
        const { scrollTop, scrollHeight, clientHeight } = event.target;
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
        if (isAtBottom) {
            if (!isScrollLoading && !hasScrolledToBottom) {
                setIsScrollLoading(true)
                setHasScrolledToBottom(true);
                const lastCustomer = pclSummaryDetails[pclSummaryDetails.length - 1];
                const lastCategory = lastCustomer?.pcl_categories?.[lastCustomer.pcl_categories.length - 1];
                const lastPoClub = lastCategory?.po_clubs?.[lastCategory.po_clubs.length - 1];
                const clubId = lastPoClub ? lastPoClub.po_club_id : 0;
                const requests = [api.get(pclSummaryDetailsForScrollUrl(lastCustomer.id, clubId))];
                Promise.all(requests)
                    .then(resp => {
                        const respData = resp.map((r: any) => r.data);
                        const [scrollPCLData] = respData;
                        setPclSummaryDetails([...scrollPCLData])
                    })
                    .catch(error => {
                        toast.error(getDefaultError(error?.response?.status));
                    })
                    .finally(() => {
                        //setIsScrollLoading(false);
                    });
            }
        } else {
            setHasScrolledToBottom(false);
        }
    };
    //to-do end
    const handleRefreshData = () => {
        setIsLoadingCircularLoader(true)
        loadPODetails(poClubDetails?.id)
    }
    const handleOpenPCLMatchingModal = () => {
        setIsOpenPCLMatchingModal(true)
    }
    const handleOpenCreatedPCL = () => {
        const createdPCLPageURL = pclFacilityDetailsPageURL(poClubDetails?.pcl_bank_information_id);
        window.open(createdPCLPageURL, '_blank');
    }

    const handleRecalculateValues = () => {
        setRefreshingValues(true)
        api.get(pclPOClubRecalculateValuesURL(poClubDetails?.id))
            .then(response => {
                toast.success(DEFAULT_SUCCESS);
                handleRefreshData()
            })
            .catch(error => {
                toast.error(getDefaultError(error?.response?.status));
            })
            .finally(() => {
                setRefreshingValues(false);
            });
    }
    const handleChangeTabs = (event: string) => {
        const url = {
            pathname: router.pathname,
            query: { ...router.query, tab: event }
        }
        router.replace(url, undefined, { shallow: true });
    }
  
    useEffect(() => {
        const { tab, po_club } = router.query;
        if (tab) {
            setActiveTab(tab.toString());
        }
        if (po_club && po_club !== prevPoClub.current) {
            setSelectedClubId(parseInt(po_club.toString()));
            loadPODetails(parseInt(po_club.toString()));
            prevPoClub.current = po_club.toString();
        }
    }, [router]);

    useEffect(() => {
        fetchData()
    }, [])

    return (
        <>
            {isLoadingCircularLoader && (<CircularLoader />)}
            {isOpenPCLMatchingModal && (
                <RitzModal
                    open={isOpenPCLMatchingModal}
                    onClose={() => { setIsOpenPCLMatchingModal(false) }}
                    title={"PCL Matching"}
                    maxWidth='md'
                >
                    <PCLMatching clubId={poClubDetails?.id} refreshData={() => { setIsOpenPCLMatchingModal(false); handleRefreshData() }} />
                </RitzModal>
            )
            }
            {isLoading ? <DefaultLoader /> : (
                <>
                    <Box>
                        <Typography variant='h1' color='text.primary' sx={{ mt: 2 }}>PCL Summary</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                        <Tooltip title={isFiltering ? "Remove Filter" : "Filter"} arrow>
                            <IconButton size="small" color="primary" onClick={handleFilterToggle}>
                                {isFiltering ? <FilterAltOffIcon /> : <FilterAltIcon />}
                            </IconButton>
                        </Tooltip>
                    </Box>
                    {isFiltering && (
                        <Box
                            sx={{
                                mt: 1,
                                mb: 1,
                                p: 2,
                                border: '1px solid',
                                borderColor: 'grey.300',
                                borderRadius: 1,
                            }}
                        >
                            <Grid container alignItems="center" spacing={2}>
                                <Grid item xs={12} sm={6} md={3}>
                                    <Typography>Customer :</Typography>
                                    <RitzSelection
                                        id="supplier"
                                        name="supplier"
                                        optionValue="id"
                                        optionText="name"
                                        selectedValue={filtterData?.supplier}
                                        isRequired={true}
                                        size="small"
                                        options={suppliers}
                                        handleOnChange={(event: any) =>
                                            handleChangeFilterData('supplier', event?.target?.value)
                                        }
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6} md={3}>
                                    <Typography>PO Club No :</Typography>
                                    <RitzSelection
                                        id="po_club"
                                        name="po_club"
                                        optionValue="id"
                                        optionText="display_number"
                                        selectedValue={filtterData?.po_club}
                                        isRequired={true}
                                        size="small"
                                        options={poClubList}
                                        handleOnChange={(event: any) =>
                                            handleChangeFilterData('po_club', event?.target?.value)
                                        }
                                    />
                                </Grid>
                                <Grid item xs={12} sm={12} md={6} display="flex" justifyContent="flex-end">
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        size="small"
                                        sx={{ mr: 2 }}
                                    > <SearchIcon /> Search</Button>
                                </Grid>
                            </Grid>
                        </Box>
                    )}
                    <Tooltip title={isMinimized ? 'Expand' : 'Collapse'} placement='right'>
                        <IconButton
                            onClick={() => setIsMinimized(!isMinimized)}
                            sx={{
                                fontSize: '1rem',
                                mb: 1,
                                borderRadius: 1
                            }}
                        >
                            {!isMinimized ? <MenuOpenIcon fontSize='inherit' /> : <MenuIcon fontSize='inherit' />}
                            <span style={{ marginLeft: 4, fontSize: 'smaller' }}>PO Clubs</span>
                        </IconButton>
                    </Tooltip>
                    <Grid
                        container direction="row"
                        sx={{ height: '100vh', display: 'flex' }}>
                        {!isMinimized && (
                            <Grid
                                item
                                xs={12}
                                md={2}
                                sx={{
                                    backgroundColor: '#f5f5f5',
                                    borderRight: '1px solid #ddd',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    height: '100%',
                                }}
                            >
                                <Card sx={{ flex: 1, boxShadow: 'none', borderRadius: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
                                    <CardContent
                                        sx={{
                                            flex: 1,
                                            overflowY: 'auto',
                                            padding: 2,
                                            backgroundColor: backgroundColor,
                                            transition: "background-color 0.5s ease",
                                        }}
                                        onScroll={handleScroll}
                                    >
                                        <Box>
                                            {pclSummaryDetails.map((customer: any, customerIndex: any) => (
                                                <Box key={`${keyHelper.getNextKeyValue()}`} marginBottom={2}>
                                                    <Typography
                                                        fontSize="20px"
                                                        fontWeight="bold"
                                                        variant="subtitle1"
                                                        color="primary"
                                                    >
                                                        {customer.name}
                                                    </Typography>
                                                    {customer.pcl_categories.map((category: any, categoryIndex: any) => (
                                                        <Box key={`${keyHelper.getNextKeyValue()}`} marginTop={1}>
                                                            <Typography fontSize="15px" fontWeight="bold" color="textSecondary">
                                                                {category.name == 'euqal_to_70_precent'
                                                                    ? 'Material/FOB = 70%'
                                                                    : category.name == 'greater_than_70_precent'
                                                                        ? 'Material/FOB > 70%'
                                                                        : category.name == 'less_than_70_present'
                                                                            ? 'Material/FOB < 70%'
                                                                            : category.name}
                                                            </Typography>
                                                            <List dense>
                                                                {category.po_clubs.length === 0 ? (
                                                                    <ListItem>
                                                                        <ListItemText primary="No available POs" />
                                                                    </ListItem>
                                                                ) : (
                                                                    category.po_clubs.map((club: any, clubIndex: any) => (
                                                                        <ListItem
                                                                            key={`${keyHelper.getNextKeyValue()}`}
                                                                            disablePadding
                                                                            selected={selectedClubId === club.po_club_id}
                                                                        >
                                                                            <ListItemButton onClick={() => handlePoClubClick(club)}>
                                                                                <ListItemText
                                                                                    primary={
                                                                                        <Box display="flex" alignItems="center" justifyContent="space-between">
                                                                                            <Box display="flex" alignItems="center">
                                                                                                <Typography
                                                                                                    color={selectedClubId === club.po_club_id ? 'primary' : 'inherit'}
                                                                                                    fontWeight={selectedClubId === club.po_club_id ? 'bold' : 'normal'}
                                                                                                >
                                                                                                    {club?.short_code}
                                                                                                </Typography>
                                                                                                {club?.is_create_supplier_pos && (
                                                                                                    <DoneIcon sx={{ color: '#059212', ml: 3 }} />
                                                                                                )}
                                                                                            </Box>
                                                                                            {/* {club.merged_clubs?.length !== 0 && (
                                                                                            <Tooltip
                                                                                                title={
                                                                                                    <Box>
                                                                                                        <List dense sx={{ padding: 0 }}>
                                                                                                            {pomappedClubList.map((item) => (
                                                                                                                <ListItem key={item.id} sx={{ padding: 0 }}>
                                                                                                                    <ListItemText primary={item.name} />
                                                                                                                </ListItem>
                                                                                                            ))}
                                                                                                        </List>
                                                                                                    </Box>
                                                                                                }
                                                                                                disableInteractive
                                                                                            >
                                                                                                <InfoIcon fontSize="small" sx={{ opacity: 0.6, ml: 1 }} />
                                                                                            </Tooltip>
                                                                                        )} */}
                                                                                        </Box>}
                                                                                    primaryTypographyProps={{
                                                                                        color: selectedClubId === club.po_club_id ? 'primary' : 'inherit',
                                                                                        fontWeight: selectedClubId === club.po_club_id ? 'bold' : 'normal',
                                                                                    }}
                                                                                />
                                                                            </ListItemButton>
                                                                        </ListItem>
                                                                    ))
                                                                )}
                                                            </List>
                                                            <Divider />
                                                        </Box>
                                                    ))}
                                                </Box>
                                            ))}
                                        </Box>
                                        {isScrollLoading && (
                                            <Box display="flex" justifyContent="center" padding={2}>
                                                <DefaultLoader />
                                            </Box>
                                        )}
                                    </CardContent>
                                </Card>
                            </Grid>
                        )}
                        <Grid item
                            xs={12}
                            md={isMinimized ? 12 : 10}
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                height: '100%',
                            }}>
                            <Card sx={{
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                overflowY: 'auto'
                            }}>
                                <CardContent>
                                    {selectedClubId ? (
                                        isLoadingDetailView ? (
                                            <DefaultLoader />
                                        ) : (
                                            <>
                                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', }}>
                                                    <Typography variant="h1">
                                                        <Link component={NextLink} href={purchaseOrderClubDetailsPageURL(poClubDetails.id)}>{poClubDetails?.display_number}</Link> (90 day's PCL)</Typography>
                                                </Box>
                                                <Box>
                                                    <Button variant="outlined" sx={{ mb: 2, mr: 1.5 }} disabled={refreshingValues} onClick={() => { handleRecalculateValues() }}>{refreshingValues ? < SaveSpinner /> : <> </>}Refresh & Recalculate Values </Button>
                                                </Box>
                                                <Box>
                                                    <TabContext value={activeTab}>
                                                        <RitzTabs
                                                            tabs={pclDetailsTabs}
                                                            activeTab={activeTab}
                                                            emitChange={handleChangeTabs}
                                                        />
                                                        <RitzTabPanel value={`${pclTabs[poDetailsTabKey][tabDisplayOrderKey]}`}>
                                                            <Box sx={{ width: '50%' }}>
                                                                <Table aria-label="simple table">
                                                                    <TableBody>
                                                                        <TableRow>
                                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%' }}>
                                                                                Total FOB Value
                                                                            </TableCell>
                                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%', wordBreak: 'break-all' }}>
                                                                                {formatAmount(poClubDetails?.fob_total_value?.amount)} {poClubDetails?.fob_total_value?.amount_currency_display}
                                                                            </TableCell>
                                                                        </TableRow>
                                                                        <TableRow>
                                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%' }}>
                                                                                Total Raw Material Price
                                                                            </TableCell>
                                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%', wordBreak: 'break-all' }}>
                                                                                {formatAmount(poClubDetails?.supplier_po_raw_material_total_cost?.amount)} {poClubDetails?.supplier_po_raw_material_total_cost?.amount_currency_display}
                                                                            </TableCell>
                                                                        </TableRow>
                                                                        <TableRow>
                                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%' }}>
                                                                                Material/FOB (%)
                                                                            </TableCell>
                                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%', wordBreak: 'break-all' }}>
                                                                                {poClubDetails?.fob_presentage}
                                                                            </TableCell>
                                                                        </TableRow>
                                                                        <TableRow>
                                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%' }}>
                                                                                Max PCL Value
                                                                            </TableCell>
                                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%', wordBreak: 'break-all' }}>
                                                                                {formatAmount(poClubDetails?.max_pcl_value?.amount)} {poClubDetails?.max_pcl_value?.amount_currency_display}
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    </TableBody>
                                                                </Table>
                                                            </Box>
                                                            <Box>
                                                                <Box sx={{ mt: 2 }}>
                                                                    <Typography color="primary" fontSize="1.2rem" variant="h1">
                                                                        PO Breakdown
                                                                    </Typography>
                                                                </Box>
                                                                <Box >
                                                                    <Table aria-label="simple table">
                                                                        <TableHead>
                                                                            <TableRow>
                                                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}></TableCell>
                                                                                {poClubDetails?.purchase_orders?.map((po: any, poIndex: any) => (
                                                                                    <TableCell key={`${keyHelper.getNextKeyValue()}`} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                                                        <Link sx={{ cursor: 'pointer' }} target={'_blank'} href={purchaseOrderDetailPageURL(po?.id)}>{po?.display_number}</Link>
                                                                                    </TableCell>
                                                                                ))}
                                                                            </TableRow>
                                                                        </TableHead>
                                                                        <TableBody>
                                                                            <TableRow>
                                                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '25%' }}>
                                                                                    Total FOB Value
                                                                                </TableCell>
                                                                                {poClubDetails?.purchase_orders?.map((po: any, poIndex: any) => (
                                                                                    <TableCell key={`${keyHelper.getNextKeyValue()}`} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '25%', wordBreak: 'break-all' }}>
                                                                                        {formatAmount(po?.fob_total_value?.amount)} {poClubDetails?.fob_total_value?.amount_currency_display}
                                                                                    </TableCell>
                                                                                ))}
                                                                            </TableRow>
                                                                            <TableRow>
                                                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '25%' }}>
                                                                                    Max PCL Value
                                                                                </TableCell>
                                                                                {poClubDetails?.purchase_orders?.map((po: any, poIndex: any) => (
                                                                                    <TableCell key={`${keyHelper.getNextKeyValue()}`} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '25%', wordBreak: 'break-all' }}>
                                                                                        {formatAmount(po?.max_pcl_value?.amount)} {poClubDetails?.max_pcl_value?.amount_currency_display}
                                                                                    </TableCell>
                                                                                ))}
                                                                            </TableRow>
                                                                        </TableBody>
                                                                    </Table>

                                                                </Box>
                                                            </Box>
                                                        </RitzTabPanel>
                                                        <RitzTabPanel value={`${pclTabs[bomTabKey][tabDisplayOrderKey]}`}>
                                                            <Box>
                                                                <PCLBomDetails dataSet={poClubDetails?.supplier_pos} />
                                                            </Box>
                                                        </RitzTabPanel>
                                                        <RitzTabPanel value={`${pclTabs[orderProfitabilityTabKey][tabDisplayOrderKey]}`}>
                                                            <Box>
                                                                {/* <OrderProfitabilityDetails dataSet={poClubDetails?.profitability_details} totalAmountDataSet={poClubDetails?.supplier_pos_summary} /> */}
                                                                    <PCLOrderProfitabilityDetails
                                                                        dataURL={pclPOClubOrderProfitabilityDetails(poClubDetails?.id)}
                                                                    />
                                                            </Box>
                                                        </RitzTabPanel>
                                                        <RitzTabPanel value={`${pclTabs[incomingPaymentsTabKey][tabDisplayOrderKey]}`}>
                                                            <Box>
                                                                <PCLIncomingPayments dataSet={poClubDetails?.incoming_payments} refreshData={handleRefreshData} />
                                                            </Box>
                                                        </RitzTabPanel>
                                                        <RitzTabPanel value={`${pclTabs[outgoingPaymentsTabKey][tabDisplayOrderKey]}`}>
                                                            <Box>
                                                                <PCLOutgoingPayments dataSet={poClubDetails?.outgoing_payments} refreshData={handleRefreshData} />
                                                            </Box>
                                                        </RitzTabPanel>
                                                        <RitzTabPanel value={`${pclTabs[settlementDetailsTabKey][tabDisplayOrderKey]}`}>
                                                            <Box>
                                                                <FinanceDashboard type={'pcl_summary'} poClubId={poClubDetails?.id} />
                                                            </Box>
                                                        </RitzTabPanel>
                                                        <RitzTabPanel value={`${pclTabs[deliveryGanttChartTabKey][tabDisplayOrderKey]}`}>
                                                            <Box>
                                                                <Box>
                                                                    {poClubDetails?.delivery_payments?.length === 0 ? (
                                                                        <>
                                                                            <Alert color='info'>No deliveries have been specified yet.</Alert>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <PCLGanttChart dataList={poClubDetails?.delivery_payments} />
                                                                        </>
                                                                    )}
                                                                </Box>
                                                            </Box>
                                                        </RitzTabPanel>
                                                        <RitzTabPanel value={`${pclTabs[pclOpenGanttChartTabKey][tabDisplayOrderKey]}`}>
                                                            <Box>
                                                                <PCLOpenGanttChart dataList={poClubDetails?.gantt_chart} />
                                                            </Box>
                                                        </RitzTabPanel>
                                                        <RitzTabPanel value={`${pclTabs[orderSummaryTabKey][tabDisplayOrderKey]}`}>
                                                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb:2 }}>
                                                                    {poClubDetails?.is_pcl_create ? (
                                                                        <Tooltip title={"View PCL"} arrow>
                                                                            <Button variant="outlined" onClick={handleOpenCreatedPCL} color="primary">View PCL Facility</Button>
                                                                        </Tooltip>
                                                                    ) : (
                                                                        <Button variant="outlined" onClick={handleOpenPCLMatchingModal} color="primary">Generate PCL Facility</Button>
                                                                    )}
                                                                </Box>
                                                                <Box ref={contentRef}>
                                                                    <PCLSupplierGRNSummary clubId={poClubDetails?.id} />
                                                                </Box>
                                                        </RitzTabPanel>
                                                    </TabContext>
                                                </Box>
                                            </>
                                        )
                                    ) : (
                                        <Alert severity="info">Click on a PO Club to view details.</Alert>
                                    )}
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                </>
            )}
        </>
    );
};

export default PCLDetails;