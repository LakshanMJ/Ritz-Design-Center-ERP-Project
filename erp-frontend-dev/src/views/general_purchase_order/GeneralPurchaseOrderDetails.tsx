import { Box, Breadcrumbs, Button, darken, Divider, Grid, IconButton, Link, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import React, { useEffect, useState } from 'react'
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import NextLink from 'next/link';
import DefaultLoader from '@/components/DefaultLoader';
import { TabContext } from '@mui/lab';
import { RitzTabPanel, RitzTabs } from '@/components/Ritz/RitzTabs';
import { useRouter } from "next/router";
import GeneralPOBomDetails from './GeneralPOBomDetails';
import api from '@/services/api';
import { generalPoDetailsURL, generalPOStateUpdateURL } from '@/helpers/constants/rest_urls/POUrls';
import toast from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';
import GeneralSupplierPOs from './GeneralSupplierPos';
import RitzModal from '@/components/Ritz/RitzModal';
import CreateGeneralPurchaseOrder from './CreateGeneralPurchaseOrder';
import CircularLoader from '@/components/CircularLoader';
import EditGeneralPOState from './EditGeneralPOState';
import { DEFAULT_SUCCESS } from '@/helpers/constants/Constants';
import RitzTable from '@/components/Ritz/RitzTable';
import { ColumnDef } from '@tanstack/react-table';
import { orderSummaryPageURL, purchaseOrderDetailPageURL } from '@/helpers/constants/FrontEndUrls';
import { purchaseOrderClubDetailsPageURL } from '@/helpers/constants/front_end/POUrls';
import SPOSummary from '../supplier_po/reports/SPOSummary';
import { generalPOShadeGroupSummaryUrl } from '@/helpers/constants/rest_urls/GrnUrls';
import GeneralShadeGroupSummary from './GeneralShadeGroupSummary';
import GeneralGrnFabricSummary from './GeneralGrnFabricSummary';
import EditIcon from '@mui/icons-material/Edit';
import { DRAFT_STATE, PO_SEND_STATE, QUANTITY_VERIFICATION_STATE, READY_TO_SEND_STATE } from '@/helpers/constants/GeneralPOStates';
import SaveSpinner from '@/components/SaveSpinner';
import { ReactKeyHelper } from '@/helpers/KeyHelper';
import ErrorIcon from '@mui/icons-material/Error';
import LightColorsHelper from '@/helpers/purchaseOrder/LightColorsHelper';

const GeneralPurchaseOrderDetails = ({ generalPurchaseOrderId }: any) => {
    const router = useRouter();
    const keyHelper = new ReactKeyHelper();
    const stateModalTitle = 'Select any general purchase order state'
    const initailTabs = ['General PO Details']
    const [isLoading, setIsLoading] = useState(true)
    const [openEditModal, setOpenEditModal] = useState(false)
    const [isLoadingCircularLoader, setIsLoadingCircularLoader] = useState(false)
    const [activeTab, setActiveTab] = useState('1');
    const [summaryTabs, setSummaryTabs] = useState(["General PO Details"]);
    const [generalDetails, setGeneralDetails] = useState<any>({});
    const [openStateModal, setOpenStateModal] = useState(false);
    const [isQuantitySaving, setIsQuantitySaving] = useState(false);
    const [errorsModalOpen, setErrorsModalOpen] = useState(false);
    const [errors, setErrors] = useState<any>([]);

    const sourceId = generalDetails?.is_club_po ? generalDetails.po_club_id : generalDetails.id;

    const handleChangeTabs = (event: string) => {
        const url = {
            pathname: router.pathname,
            query: { ...router.query, tab: event }
        }
        router.replace(url, undefined, { shallow: true });
    }

    const fetchGeneralPODetails = (tabs: any) => {
        const requests = [
            api.get(generalPoDetailsURL(generalPurchaseOrderId)),
        ]
        Promise.all(requests).then(response => {
            const [poData] = response.map((r: any) => r.data);
            setGeneralDetails(poData)
            if (poData?.state == DRAFT_STATE) {
                const newSummaryTabs = [...tabs];
                setSummaryTabs([...new Set(newSummaryTabs)]);
            }
            if (poData?.state == QUANTITY_VERIFICATION_STATE) {
                const newSummaryTabs = [...tabs, 'Supplier PO Details'];
                setSummaryTabs([...new Set(newSummaryTabs)]);
            }
            if (poData?.state == READY_TO_SEND_STATE) {
                const newSummaryTabs = [...tabs, "Supplier PO Details", "Supplier POs"];
                setSummaryTabs([...new Set(newSummaryTabs)]);
            }
            if (poData?.state == PO_SEND_STATE) {
                const newSummaryTabs = [...tabs, "Supplier PO Details", "Supplier POs", "Fabric Summary", "Shade Group Details", "SPO Summary"];
                setSummaryTabs([...new Set(newSummaryTabs)]);
            }
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false);
            setIsLoadingCircularLoader(false);
        });
    }

    const handleOpenEditModal = () => {
        setOpenEditModal(true)
    }

    const handleCloseModal = () => {
        setOpenEditModal(false)
        fetchGeneralPODetails(initailTabs)
    }
    const handleCurrentStateChange = () => {
        setOpenStateModal(false)
        fetchGeneralPODetails(initailTabs)
    }
    const handleChangeState = (state: any) => {
        setIsQuantitySaving(true)
        const request = {
            method: 'post',
            url: generalPOStateUpdateURL(generalPurchaseOrderId),
            data: {
                new_state: state,
                plant_id: generalDetails?.plant_id,
                modal: false
            }
        };
        api(request).then((resp) => {
            const resdata = resp?.data || [];
            toast.success(DEFAULT_SUCCESS);
            fetchGeneralPODetails(initailTabs)
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
            if (error?.response?.data?.error) {
                setErrors([...error?.response?.data?.error]);
                setErrorsModalOpen(true);
            }
        }).finally(() => setIsQuantitySaving(false));
    };

    const poColumns: ColumnDef<any>[] = [
        {
            accessorKey: 'name',
            header: 'Purchase Order',
            cell: props => (
                <Link target="_blank" component={NextLink} href={purchaseOrderDetailPageURL(props.row.original.id)}>{props.row.original.display_number}</Link>
            )
        },
        {
            accessorKey: 'po.display_number',
            header: 'Costing',
            cell: (props) => {
                const poSet = props.row.original.order_inquiry.display_number
                return <Link href={orderSummaryPageURL(props.row.original.order_inquiry_id, props.row.original.version_id)} target="_blank" >{poSet}</Link>;
            }
        },
        {
            accessorKey: 'customer_name',
            header: 'Customer Name',
            cell: (props) => props.row.original.customer_name || '--',
        },
        {
            accessorKey: 'brand_name',
            header: 'Brand Name',
            cell: (props) => props.row.original.brand_name || '--',
        },
        {
            accessorKey: 'state.display_value',
            header: 'Status',
            cell: (props) => {
                const displayValue = props.row.original.state.display_value || '--';
                return <Typography>{displayValue}</Typography>;
            },
        }
    ]
    const [data, setData] = useState<any>([]);

    const [sortConfig, setSortConfig] = useState({ key: '', direction: '' });

    const handleSort = (key: any) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });

        const sortedData = [...data].sort((a, b) => {
            if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
            if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
            return 0;
        });
        console.log(sortedData, "sortedDatasortedDatasortedData")
        setData(sortedData);
    };

    const getColorByIndex = (index: number, theme: any) => {
        return LightColorsHelper[index % LightColorsHelper.length];
    };
    
    const handleErrorsDialogClose = () => {
        setErrors([]);
        setErrorsModalOpen(false);
    }

    useEffect(() => {
        if (generalPurchaseOrderId > 0) {
            fetchGeneralPODetails(initailTabs)
        }
    }, [generalPurchaseOrderId])

    useEffect(() => {
        const { tab } = router.query;
        if (tab) {
            setActiveTab(tab.toString());
        }
    }, [router]);


    return (
        <>
            {openEditModal && (
                <RitzModal open={openEditModal} onClose={() => setOpenEditModal(false)} title={"Edit General Purchase Order"} maxWidth='lg' >
                    <CreateGeneralPurchaseOrder orderId={generalDetails?.order_id} versionId={generalDetails?.costing_id} generalPOId={generalDetails?.id} closeModal={() => { setIsLoadingCircularLoader(true), handleCloseModal() }} />
                </RitzModal>
            )}
            {openStateModal && (
                <RitzModal open={openStateModal} onClose={() => setOpenStateModal(false)} title={stateModalTitle}>
                    <EditGeneralPOState generalPoId={generalDetails?.id} setChanged={handleCurrentStateChange} currentState={generalDetails.state} currentPlant={generalDetails.plant_id} modalType={true} />
                </RitzModal>
            )}
            {errorsModalOpen && (
                <RitzModal open={errorsModalOpen} onClose={handleErrorsDialogClose} title='Operation Failed'>
                    Please fix the issues below to continue this stage.
                    <Divider sx={{ mt: 2, mb: 3 }} />
                    <Box>
                        {errors?.map((errorItem: string, index: number) => (
                            <Grid container spacing={1} key={`${keyHelper.getNextKeyValue()}`}>
                                <Grid item>
                                    <ErrorIcon style={{ verticalAlign: 'middle', color: 'red', fontSize: 'medium' }} />
                                </Grid>
                                <Grid item xs={11}>
                                    <Box>{errorItem}</Box>
                                </Grid>
                            </Grid>
                        ))}
                    </Box>
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'end' }}>
                        <Button variant="outlined" color='secondary' onClick={handleErrorsDialogClose}>Close</Button>
                    </Box>
                </RitzModal>
            )}
            {isLoadingCircularLoader && (<CircularLoader />)}

            <Breadcrumbs
                separator={<NavigateNextIcon fontSize="small" />}
                aria-label="breadcrumb"
                sx={{ mb: 1.5 }}
            >
                <Link underline='hover' color='inherit' component={NextLink} href={'/general_purchase_order'}>General Purchase Order List</Link>
                <Typography color='text.primary'>General Purchase Order Details</Typography>
            </Breadcrumbs>

            <Typography variant='h1'>General Purchase Order Details</Typography>
            <Button variant='outlined' onClick={() => { setOpenStateModal(true) }} sx={{ mr: 1.5, mb: 2 }}>Edit Information</Button>
            {generalDetails.state == DRAFT_STATE && (
                <Button variant='outlined' onClick={() => { handleChangeState(QUANTITY_VERIFICATION_STATE) }} sx={{ mr: 1.5, mb: 2 }}> {isQuantitySaving && <SaveSpinner/>}Quantity Verified</Button>
            )}
            {generalDetails.state == QUANTITY_VERIFICATION_STATE && (
                <Button variant='outlined' onClick={() => { handleChangeState(READY_TO_SEND_STATE) }} sx={{ mr: 1.5, mb: 2 }}>{isQuantitySaving && <SaveSpinner/>}Ready to Send PO</Button>
            )}
            {generalDetails.state == READY_TO_SEND_STATE && (
                <Button variant='outlined' onClick={() => { handleChangeState(PO_SEND_STATE) }} sx={{ mr: 1.5, mb: 2 }}>{isQuantitySaving && <SaveSpinner/>}PO Send</Button>
            )}

            {isLoading ? <DefaultLoader /> : (
                <>
                    <TabContext value={activeTab}>
                        <RitzTabs
                            tabs={summaryTabs}
                            activeTab={activeTab}
                            emitChange={handleChangeTabs}
                        />
                        <RitzTabPanel value='1'>
                            <Box sx={{ mb: 3, mt: 3 }}>
                                <Grid container spacing={2}>
                                    <Grid item xs={12} sm={16} md={2}>
                                        <dl>
                                            <dt>General Purchase Order</dt>
                                            <dd>
                                                <Typography>{generalDetails?.display_number}</Typography>
                                            </dd>
                                        </dl>
                                    </Grid>
                                    <Divider orientation="vertical" flexItem />
                                    <Grid item xs={12} sm={16} md={3}>
                                        <dl>
                                            <dt>Costing</dt>
                                            <dd>
                                                <Link target="_blank" component={NextLink} href={`/costing/add/${generalDetails.order_id}/version/${generalDetails.costing_id}`}>
                                                    <Typography>{generalDetails?.costing_display_number}</Typography>
                                                </Link>
                                            </dd>
                                        </dl>
                                    </Grid>
                                    <Divider orientation="vertical" flexItem />
                                    <Grid item xs={12} sm={16} md={3}>
                                        <dl>
                                            <dt>General PO State</dt>
                                            <dd>
                                                <Typography>{generalDetails?.state_display || '--'}</Typography>
                                            </dd>
                                        </dl>
                                    </Grid>
                                    <Divider orientation="vertical" flexItem />
                                    <Grid item xs={12} sm={16} md={3}>
                                        <dl>
                                            <dt>Plant</dt>
                                            <dd>
                                                <Box display="flex" alignItems="center">
                                                    <Typography>{generalDetails?.palnt_name || '--'}</Typography>
                                                    {generalDetails?.state == DRAFT_STATE && (
                                                        <IconButton
                                                            onClick={() => { setOpenStateModal(true) }}
                                                            size='small'
                                                            color="primary"
                                                            style={{ marginLeft: 8 }}
                                                        >
                                                            <EditIcon fontSize='inherit' />
                                                        </IconButton>
                                                    )}
                                                </Box>
                                            </dd>
                                        </dl>
                                    </Grid>
                                    <Divider orientation="vertical" flexItem />
                                    {generalDetails?.is_club_po && (
                                        <>
                                            <Grid item xs={12} sm={16} md={2}>
                                                <dl>
                                                    <dt>Purchase Order Club</dt>
                                                    <dd>
                                                        <Typography>
                                                            <Link target="_blank" component={NextLink} href={purchaseOrderClubDetailsPageURL(generalDetails?.po_club_id)}>
                                                                {generalDetails?.po_club_display_number}
                                                            </Link>
                                                        </Typography>
                                                    </dd>
                                                </dl>
                                            </Grid>
                                            <Divider orientation="vertical" flexItem />
                                        </>
                                    )}
                                </Grid>
                            </Box>
                            {generalDetails?.is_club_po ? (
                                <>
                                    <Typography variant="h6" sx={{ marginBottom: '5px' }}>Purchase Order List</Typography>
                                    <RitzTable
                                        columns={poColumns}
                                        data={generalDetails.purchaseorder_set}
                                        onSort={handleSort}
                                    />

                                </>
                            ) : (
                                <>
                                    <Typography variant="h6" sx={{ marginBottom: '5px' }}> General PO Quantity Breakdown</Typography>
                                    {generalDetails.state == DRAFT_STATE && (
                                        <Button variant="outlined" color="primary" onClick={handleOpenEditModal}>Edit</Button>
                                    )}
                                    <Box sx={{ mt: 2 }}>
                                        <Table>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell rowSpan={2} sx={{ borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01), }}>Country</TableCell>
                                                    <TableCell rowSpan={2} sx={{ borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01), }}>Colorway Type</TableCell>
                                                    <TableCell colSpan={generalDetails?.size_groups?.reduce((acc: number, sizeGroup: any) => acc + sizeGroup.sizes.length, 0)} sx={{ borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center', background: (theme) => darken(theme.palette.grey[50], 0.01), }}>Size Breakdown</TableCell>
                                                </TableRow>
                                                <TableRow>
                                                    {generalDetails?.size_groups?.map((sizeGroup: any, sizeGroupIndex: number) => (
                                                        sizeGroup.sizes?.map((size: any, sizeIndex: any) => (
                                                            <TableCell key={sizeIndex}
                                                                sx={{
                                                                    borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`,
                                                                    background: (theme) => getColorByIndex(sizeGroupIndex, theme),
                                                                    textAlign: 'center'
                                                            }}>{size.name}</TableCell>
                                                        ))

                                                    ))}
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {generalDetails?.quantities?.map((country: any, countryIndex: any) => (
                                                    country?.colorways?.map((colorway: any, colorwayIndex: any) => (

                                                        <>
                                                            <TableRow>
                                                                {colorwayIndex == 0 && (
                                                                    <TableCell rowSpan={country?.colorways.length * 2}  sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                                        {country.country_name}
                                                                    </TableCell>
                                                                )}
                                                               
                                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                                    {colorway.colorway}
                                                                </TableCell>

                                                                {colorway?.size_groups?.map((sizeGroup: any, sizeGroupIndex: number) => (
                                                                    sizeGroup.sizes?.map((size: any, sizeIndex: any) => (
                                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>
                                                                            {size.quantity}
                                                                        </TableCell>
                                                                    ))
                                                                ))}
                                                            </TableRow>
                                                            <TableRow>
                                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}><Typography sx={{ fontSize: '0.7rem', fontWeight: 'bold' }} color='primary'>Size Group Quantity :</Typography></TableCell>
                                                                {colorway?.size_groups.map((sizeGroup: any, sizeGroupInex: number) => (
                                                                    <TableCell colSpan={sizeGroup?.sizes.length} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`,background: (theme) => darken(theme.palette.grey[50], 0.01), textAlign: 'center',fontWeight:'bold'}}>{sizeGroup.total_quantity}</TableCell>
                                                                ))}

                                                            </TableRow>
                                                        </>
                                                    ))

                                                ))}
                                            </TableBody>
                                        </Table>
                                    </Box>
                                </>
                            )}
                        </RitzTabPanel>
                        <RitzTabPanel value='2'>
                            <Box sx={{ mb: 3, mt: 3 }}>
                                <GeneralPOBomDetails generalPoId={generalPurchaseOrderId} currentState={generalDetails?.state} generalPOType={generalDetails?.is_club_po} orderId={generalDetails?.order_id} versionId={generalDetails?.costing_id} />
                            </Box>
                        </RitzTabPanel>
                        <RitzTabPanel value='3'>
                            <Box sx={{ mb: 3, mt: 3 }}>
                                <GeneralSupplierPOs sourceId={sourceId} type={generalDetails?.is_club_po} />
                            </Box>

                        </RitzTabPanel>
                        <RitzTabPanel value='4'>
                            <Box sx={{ mb: 3, mt: 3 }}>
                                <GeneralGrnFabricSummary generalPoId={generalPurchaseOrderId} />
                            </Box>
                        </RitzTabPanel>
                        <RitzTabPanel value='5'>
                            <Box sx={{ mb: 3, mt: 3 }}>
                                <GeneralShadeGroupSummary sourceId={generalPurchaseOrderId} sourceDataUrl={generalPOShadeGroupSummaryUrl} />
                            </Box>

                        </RitzTabPanel>
                        <RitzTabPanel value='6'>

                            <Box sx={{ mb: 3, mt: 3 }}>
                                <SPOSummary sourceId={sourceId} type={generalDetails?.is_club_po} />
                            </Box>
                        </RitzTabPanel>
                    </TabContext>


                </>
            )}

        </>
    );
}

export default GeneralPurchaseOrderDetails