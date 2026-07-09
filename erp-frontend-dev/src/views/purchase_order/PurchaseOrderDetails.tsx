import React, { useEffect, useState } from "react";
import { Alert, Box, Button, Card, Dialog, DialogActions, DialogTitle, Divider, Grid, IconButton, Link, List, ListItem, Menu, MenuItem, Tab, Tabs, Tooltip, Typography } from "@mui/material";
import * as RestUrls from '../../helpers/constants/RestUrls';
import { RitzTabPanel, RitzTabs } from "@/components/Ritz/RitzTabs";
import { TabContext } from "@mui/lab";
import  { useRouter } from "next/router";
import toast from "react-hot-toast";
import { getDefaultError, hasRole } from "@/helpers/Utilities";
import api from "@/services/api";
import { ColumnDef } from "@tanstack/react-table";
import RitzTable from "@/components/Ritz/RitzTable";
import SaveSpinner from "@/components/SaveSpinner";
import NextLink from 'next/link';
import { orderSummaryPageURL, orderSummaryVersionURL, purchaseOrderClubingPageURL, purchaseOrderColorwaySizeCountryMappingPageURL, purchaseOrderInquiryPageURL, purchaseOrderSizeToOrderSizeMatchingURL,} from "@/helpers/constants/FrontEndUrls";
import POPacks from "./POPacks";
import { BOM_FINALIZED_STATE, CAD_COMPLETE_PURCHASE_ORDER_STATE, COMPLETE_PURCHASE_ORDER_STATE, COMPLETED_VERSION_STATE, MAPPINGS_COMPLETE_PURCHASE_ORDER_STATE, MATERIALS_ASSIGNED_PURCHASE_ORDER_STATE, OPEN_PURCHASE_ORDER_STATE, PENDING_MATERIALS_VERSION_STATE} from "@/helpers/constants/CostingStates";
import * as poUrls from "@/helpers/constants/rest_urls/POUrls";
import DefaultLoader from "@/components/DefaultLoader";
import PORatioComparison from "./PORatioComparison";
import POBom from '@/views/purchase_order/POBom';
import { ADMIN, BUSINESS_ADMIN } from "@/helpers/constants/RoleManager";
import RitzModal from "@/components/Ritz/RitzModal";
import { grey, green } from "@mui/material/colors";
import POColorwayColorMapping from "./POColorwayColorMapping";
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import POState from "@/views/purchase_order/POState";
import EditPurchaseOrderMaterials from "./materials/EditPurchaseOrderMaterials";
import PoClub from "./PoClub";
import EditPOFabricConsumptionRatioView from "./materials/EditPOFabricConsumptionRatioView";
import EditFabricConsumptionRatioView from "../cad/EditFabricConsumptionRatioView";
import POBomPackDetails from "./POBomPackDetails";
import { DEFAULT_SUCCESS } from "@/helpers/constants/Constants";
import { purchaseOrderClubDetailsPageURL } from "@/helpers/constants/front_end/POUrls";
import ErrorIcon from '@mui/icons-material/Error';
import ShadeGroupsSummary from "../grn/ShadeGroupsSummary";
import { poShadeGroupSummaryUrl } from "@/helpers/constants/rest_urls/GrnUrls";
import PurchaseOrderPackagingInstruction from "@/views/purchase_order/PurchaseOrderPackagingInstruction";
import { ReactKeyHelper } from "@/helpers/KeyHelper";
import PurchaseOrderPackagingSummary from "./PurchaseOrderPackagingSummary";
import { poClubShadeAttachmentUploadUrl } from "@/helpers/constants/rest_urls/POUrls";
import PurchaseOrderDeliveryDetails from "./PurchaseOrderDeliveryDetails";
import PurchaseOrderGrnData from "./PurchaseOrderGrnData";
import MappingColorways from "./club/MappingColorways";
import { PENDING_PRE_COSTING_COMPLETION } from "@/helpers/constants/PurchaseOrderStates";
import EditIcon from '@mui/icons-material/Edit';

const PurchaseOrderDetails = ({ purchaseOrderId }: any) => {
    const productionCutDateKey = 'production_cut_date';
    const productionStartDateKey = 'production_start_date';
    const productionEndDateKey = 'production_end_date';
    const exFactoryDateKey = 'ex_factory_date';
    
    const keyHelper = new ReactKeyHelper();
    const colorwayColumns: ColumnDef<any>[] = [
        {
            accessorKey: 'id',
            header: 'Purchase Order Colorway',
            cell: (props) => {
                return (
                    <>
                        <Typography>{props.row.original.po_colorway_name}</Typography>
                    </>
                )
            },
            meta: {
                width: '60%'
            },
        },
        {
            accessorKey: 'id',
            header: 'Order Colorway',
            cell: (props) => {
                return (
                    <>
                        <Typography>{props.row.original.order_colorway_name}</Typography>
                    </>
                )
            },
        }
    ];

    const countryColumns: ColumnDef<any>[] = [
        {
            accessorKey: 'id',
            header: 'Purchase Order Country',
            cell: (props) => {
                return (
                    <>
                        <Typography>{props.row.original.po_country_name}</Typography>
                    </>
                )
            },
            meta: {
                width: '60%',
            },
        },
        {
            accessorKey: 'id',
            header: 'Order Country',
            cell: (props) => {
                return (
                    <>
                        <Typography>{props.row.original.order_country_name}</Typography>
                    </>
                )
            }
        }
    ];

    const sizeColumns: ColumnDef<any>[] = [
        {
            accessorKey: 'id',
            header: 'Purchase Order Size',
            cell: (props) => {
                return (
                    <>
                        <Typography>{props.row.original.po_size_name}</Typography>
                    </>
                )
            },
            meta: {
                width: '60%',
            },
        },
        {
            accessorKey: 'id',
            header: 'Order Size',
            cell: (props) => {
                const orderSizeName = props.row.original.order_size_name;
                const nullValue = 'Not Matched'
                return (
                    <>
                        <Typography>
                            {orderSizeName !== null || '' ? orderSizeName : nullValue}
                        </Typography>
                    </>
                )
            }
        }
    ];

    const purchaseOrderStateKey = 'state';
    const materialBOMTabLabel = 'Material BOM';
    const canEdit = hasRole(ADMIN);

    const [summaryTabs, setSummaryTabs] = useState(['PO Details',]);
    const [activeTab, setActiveTab] = useState('1');
    const [purchaseOrderDetails, setPurchaseOrderDetails] = useState<any>({});
    const [isLoading, setIsLoading] = useState(true);
    const [pageLoading, setPageLoading] = useState(false);
    const [bomCreationLoading, setBomCreationLoading] = useState(false);
    const [openPoVerifyModal, setOpenPoVerifyModal] = useState(false);
    const [isConfirmSendToCadTeam, setIsconfirmSendToCadTeam] = useState(false);
    const [isConfirmPoDetailsAsComplte, setIsConfirmPoDetailsAsComplte] = useState(false);
    const [stateChangeData, setStateChangeData] = useState<any>({});
    const [purchaseOrderList, setPurchaseOrderList] = useState<any>([]);
    const [isModalLoading, setIsModalLoading] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [openConfirmModal, setOpenConfirmModal] = useState(false);
    const [versionMenuAnchorEl, setVersionMenuAnchorEl] = useState<null | HTMLElement>(null);
    const versionMenuOpen = Boolean(versionMenuAnchorEl);
    const [openStateModal, setOpenStateModal] = useState(false);
    const [versionModalOpen, setVersionModalOpen] = useState(false);
    const [isPoClubingModalLoading, setIsPoClubingModalLoading] = useState(false);
    const [openfilterBomModal, setOpenFilterBomModal] = useState(false);
    const [poPackQuantityModal, setPoPackQuantityModal] = useState(false);
    const [filterBomData, setFilterBomData] = useState<any>([]);
    const [cadRatioCompleteStatus, setCadRatioCompleteStatus] = useState(true);//Todo Pending Api
    const [ratioComparison, setRatioComparison] = useState({});
    const [poPacks, setPoPacks] = useState([]);
    const [errorsModalOpen, setErrorsModalOpen] = useState(false);
    const [errors, setErrors] = useState<any>([]);
    const [filteredPackIds, setfilteredPackIds] = useState({ pack_item_ids: [], pack_ids: [] });
    const [openColorwayMappingModal, setOpenColorwayMappingModal] = useState(false);
    const [openColorwayCategoryMappingModal, setOpenColorwayCategoryMappingModal] = useState(false);
    const router = useRouter();
    const canEditInformation = hasRole(BUSINESS_ADMIN);
    const [openPOcolorwayCategoryMappingModal, setOpenPOcolorwayCategoryMappingModal] = useState(false);

    const stateModalTitle = 'Select any purchase order state';

    useEffect(() => {
        const { tab } = router.query;
        if (tab) {
            setActiveTab(tab.toString());
        }
    }, [router]);

    useEffect(() => {
        if(purchaseOrderId){
            setIsLoading(true)
            getPurchaseOrderDetails();
        }

    }, [purchaseOrderId]);

    useEffect(() => {
        setStateChangeButtonState();

        if ((purchaseOrderDetails?.[purchaseOrderStateKey]?.value && purchaseOrderDetails?.[purchaseOrderStateKey]?.value !== 'open' && purchaseOrderDetails?.[purchaseOrderStateKey]?.value !== PENDING_PRE_COSTING_COMPLETION)) {
            const newSummaryTabs = [...summaryTabs, "Materials", "Packaging Details", "Delivery Summary"];
            if (purchaseOrderDetails?.[purchaseOrderStateKey].value == CAD_COMPLETE_PURCHASE_ORDER_STATE || (purchaseOrderDetails?.[purchaseOrderStateKey].value == COMPLETE_PURCHASE_ORDER_STATE || purchaseOrderDetails?.[purchaseOrderStateKey].value == BOM_FINALIZED_STATE )) {
                newSummaryTabs.push("Material BOM", "GRN Data");
            }
            setSummaryTabs([...new Set(newSummaryTabs)]);
        }
    }, [purchaseOrderDetails])

    const handleChangeTabs = (event: string) => {
        const url = {
            pathname: router.pathname,
            query: { ...router.query, tab: event }
        }
        router.replace(url, undefined, { shallow: true });
    };

    const getPurchaseOrderDetails = () => {
        if (purchaseOrderId > 0) {
            setIsLoading(true)

        const requests = [
            api.get(RestUrls.purchaseOrderDetailURL(purchaseOrderId)),
            api.get(RestUrls.purchaseOrderStatusListURL(purchaseOrderId)),
            api.get(RestUrls.poRatioComparisonURL(purchaseOrderId)),
            api.get(RestUrls.purchaseOrderPacksURL(purchaseOrderId))
        ]

        Promise.all(requests).then(response => {
            const [purchaseOrderMappingData, purchaseOrderListData, ratioComparisonData, poPackData] = response.map((r: any) => r.data);
            setPurchaseOrderDetails(purchaseOrderMappingData);
            setPurchaseOrderList(purchaseOrderListData)
            setRatioComparison(ratioComparisonData);
            setPoPacks(poPackData)
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
            }).finally(() => setIsLoading(false));
        }
    };


    const movePOToNextState = () => {
        setIsConfirmPoDetailsAsComplte(true)
        const data = stateChangeData?.savePayload;
        api.post(RestUrls.changePurchaseOrderStateURL(purchaseOrderId), data).then(resp => {
            const responseData = resp?.data;
            if(responseData && responseData.valid === true){
                toast.success(DEFAULT_SUCCESS);
            }
            const responseError = responseData.errors
            if (responseError && responseError.length > 0) {
                toast.error(responseError);
                return;
            }
            getPurchaseOrderDetails();
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
            const errorMessages = error.response.data.errors;
            setErrors(errorMessages);
            setOpenPoVerifyModal(false)
            setErrorsModalOpen(true);

        }).finally(() => {
            setPageLoading(false);
                setIsConfirmPoDetailsAsComplte(false)
                setOpenPoVerifyModal(false)
        });
    }
    
    const handleEditPurchaseOrderdetails = () => {
        const editPurchaeOrder = true
        // if (purchaseOrderDetails.version_id > 0) {
        //     if(canEdit){
        //         if(purchaseOrderDetails?.costing_type === 'marketing_costing'){         
        //              router.push(purchaseOrderClubingPageURL(purchaseOrderId, purchaseOrderDetails?.uploaded_purchase_order_id))
        //         }else{
        //             router.push(purchaseOrderInquiryPageURL(purchaseOrderId))
        //         }
        //     }else{
        //         router.push(purchaseOrderSizeToOrderSizeMatchingURL(purchaseOrderId))
        //     }
        // } else {
        //     router.push(purchaseOrderInquiryPageURL(purchaseOrderId))
        // }
        if (purchaseOrderDetails?.clubbing_complete) {
            router.push(purchaseOrderColorwaySizeCountryMappingPageURL(purchaseOrderId, purchaseOrderDetails?.uploaded_purchase_order_id))
        } else {
            router.push(purchaseOrderClubingPageURL(purchaseOrderId, purchaseOrderDetails?.uploaded_purchase_order_id))
        }
    }

    const handleErrorsDialogClose = () => {
        setErrors([]);
        setErrorsModalOpen(false);
    }

    const handlePoClubingModal = () => {
        setIsPoClubingModalLoading(true)
    }

    const handlePoPackQuantityModal = () => {
        setPoPackQuantityModal(true)
    }


    const handleClose = () => {
        setOpenPoVerifyModal(false);
    };

    const handleFilterBomModal = () => {
        setOpenFilterBomModal(true)
    };

    const handleClosePoClubModal = () => {
        setIsPoClubingModalLoading(false);
    };
    
    const handleCloseFilterBomModal = () => {
        setOpenFilterBomModal(false);
    };

    const handleClosePoPackQuantityModal = () => {
        setPoPackQuantityModal(false);
    }

    const handleCurrentStateChange = () => {
        getPurchaseOrderDetails();
        setOpenStateModal(false)
        setSummaryTabs(['PO Details']);
        handleChangeTabs('1')
    }

    const handleDownload = async () => {
        if (purchaseOrderDetails.file_path && purchaseOrderDetails.file_display_name) {
            try {
                const response = await fetch(purchaseOrderDetails.file_path);
                if (!response.ok) {
                    throw new Error('This file can not be found');
                }
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);

                const link = document.createElement('a');
                link.href = url;
                link.download = purchaseOrderDetails.file_display_name;
                link.click();

                URL.revokeObjectURL(url);
            } catch (error) {
                toast.error('This file can not be found');
            }
        } else {
            //
        }
    };

    const setStateChangeButtonState = () => {
        let buttonText = undefined;
        let modalText = undefined
        let savePayload = undefined
        if (purchaseOrderDetails?.['state']?.value == OPEN_PURCHASE_ORDER_STATE) {
            buttonText = 'PO Details Verified';
            modalText = 'Are you sure you want to mark the purchase order details as complete?';
            savePayload = { 'new_state': MAPPINGS_COMPLETE_PURCHASE_ORDER_STATE };
        } else if (purchaseOrderDetails?.['state']?.value == MAPPINGS_COMPLETE_PURCHASE_ORDER_STATE) {
            buttonText = 'Material Info Complete';
            modalText = 'Are you sure you want to move it to the next state?';
            savePayload = { 'new_state': MATERIALS_ASSIGNED_PURCHASE_ORDER_STATE };
        }else if (purchaseOrderDetails?.['state']?.value == PENDING_PRE_COSTING_COMPLETION) {
            buttonText = 'Pre Costing Verified';
            modalText = 'Are you sure you want to move it to the next state?';
            savePayload = { 'new_state': OPEN_PURCHASE_ORDER_STATE };
        }

        setStateChangeData({ buttonText: buttonText, modalText: modalText, savePayload: savePayload });
    }

    const createBOM = () => {
        const purchaseOrderUrl = poUrls.buildPurchaseOrderBomURL(purchaseOrderId);
        setBomCreationLoading(true);
        api.get(purchaseOrderUrl).then(response => {
        getPurchaseOrderDetails()
        }).catch(error => {

        }).finally(() => { setBomCreationLoading(false); })
    }

    const fetchPurchaseOrderList = () => {
        try {
          setIsModalLoading(true)
          if (purchaseOrderId) {
            api.get(RestUrls.purchaseOrderStatusListURL(purchaseOrderId)).then(resp => {
                const resdata = resp?.data || [];
                setDialogOpen(true);
                setPurchaseOrderList([...resdata]);
              }).catch((error) => {
                toast.error(getDefaultError(error?.response?.status));
              })
          } else {
            //
          }
        }
        finally {
          setIsModalLoading(false)
        }
      };

    const handleDialogClose = () => {
        setDialogOpen(false);
      };

    const handleFilterData = (filterData:any) => {
        setFilterBomData(filterData.data)
        setfilteredPackIds({ ...filteredPackIds, pack_item_ids: filterData.po_pack_items , pack_ids: filterData.po_packs});
        handleCloseFilterBomModal()
    };

    const handleModalClose = () => {
        setOpenStateModal(false)
    }

      const handleOrderListItem = (purchaseOrderId: number, uploadedPOId: any) => {
        router.push(purchaseOrderClubingPageURL(purchaseOrderId, uploadedPOId))
      }

      const handleSendToPoClubAction = () => {
        router.push(purchaseOrderClubDetailsPageURL(purchaseOrderDetails?.['po_club_id']))
      }

      const handleSendToCadTeamAction = () => {
        const nextState = {
            new_state : 'materials_assigned'
        }
        api.post(RestUrls.changePurchaseOrderStateURL(purchaseOrderId), nextState).then(resp => {
            const resdata = resp?.data || [];
            if(resdata.valid === true){
                toast.success(DEFAULT_SUCCESS);
                setOpenConfirmModal(false)
                getPurchaseOrderDetails();
            }else{
                toast.error(resdata.errors);
                getPurchaseOrderDetails();
            }
        }).catch(error => {
            const errorMessages = error.response.data.errors;
            setErrors(errorMessages);
            setOpenConfirmModal(false)
            setErrorsModalOpen(true);
        })
      }

      const filteredNonReviewedList = purchaseOrderList.filter((item: any) => item.status === 'Inactive');
      const filteredReviewedList = purchaseOrderList.filter((item: any) => item.status === 'Active');
      const hadleOpenColorwayMappingModal = (status: any) => {
        setOpenColorwayMappingModal(status)
    }

return (
        <>
        
            {openColorwayMappingModal && (
                <RitzModal open={openColorwayMappingModal} onClose={()=>{setOpenColorwayMappingModal(false)}} title='Colorway Category Mappings' maxWidth={'lg'} >
                    <POColorwayColorMapping purchaseOrderId={purchaseOrderId} refreshData={() => { setOpenColorwayMappingModal(false); getPurchaseOrderDetails() }} />
                </RitzModal>
            )}
            {isPoClubingModalLoading && (
                <RitzModal open={isPoClubingModalLoading} onClose={handleClosePoClubModal} title='Po Clubing Details' maxWidth={'lg'} >
                     <PoClub purchaseOrderUploadId={purchaseOrderDetails.uploaded_purchase_order_id} selectedPoID={purchaseOrderId} savedData={handleClosePoClubModal} />
                </RitzModal>
            )}
            {poPackQuantityModal && (
                <RitzModal open={poPackQuantityModal} onClose={handleClosePoPackQuantityModal} title='Po Pack Quantity Details' maxWidth={'lg'} >
                      <POPacks purchaseOrderId={purchaseOrderId} purchaseOrderState={purchaseOrderDetails?.[purchaseOrderStateKey]} editableStatus={true}/>
                </RitzModal>
            )}          
            
            {openfilterBomModal && (
                <RitzModal open={openfilterBomModal} onClose={handleCloseFilterBomModal} title='Filter Bom Details' maxWidth={'xl'} >
                     <POBomPackDetails orderId={purchaseOrderDetails.order_id} versionId={purchaseOrderDetails.version_id} purchaseOrderId={purchaseOrderId} filterData={handleFilterData} filteredPackIds={filteredPackIds} />
                </RitzModal>
            )}
            {!isLoading && <Box>
                {purchaseOrderDetails?.['state']?.value == OPEN_PURCHASE_ORDER_STATE &&
                    (<Button variant="outlined" sx={{ mr: 1.5, mb: 2 }} onClick={handleEditPurchaseOrderdetails}>{pageLoading ? < SaveSpinner /> : <> </>}Edit PO Details</Button>
                    )}
                {canEditInformation && purchaseOrderDetails?.['state']?.value != OPEN_PURCHASE_ORDER_STATE && (
                    <Button
                        variant='outlined'
                        onClick={() => { setOpenStateModal(true), setVersionMenuAnchorEl(null) }}
                        sx={{ mr: 1.5, mb: 2 }}>
                        Edit Information
                    </Button>
                )}
                {purchaseOrderDetails?.['state']?.value == OPEN_PURCHASE_ORDER_STATE &&
                    <Button variant="outlined" sx={{ mr: 1.5, mb: 2 }}
                        onClick={() => { setOpenPoVerifyModal(true) }}>{pageLoading ? < SaveSpinner /> : <> </>}PO Details Verified
                    </Button>
                }
                <Button variant="outlined" sx={{ mr: 1.5, mb: 2 }} onClick={handlePoClubingModal}>PO Club Details</Button>
                {purchaseOrderDetails?.['state']?.value === MAPPINGS_COMPLETE_PURCHASE_ORDER_STATE &&
                    (<Button variant="outlined" sx={{ mb: 2 , mr: 1.5 }} onClick={() => setOpenConfirmModal(true)}>Send To CAD Team</Button>
                    )}
                {!(purchaseOrderDetails?.['state']?.value === OPEN_PURCHASE_ORDER_STATE ||
                purchaseOrderDetails?.['state']?.value === MAPPINGS_COMPLETE_PURCHASE_ORDER_STATE) &&
                (<Button variant="outlined" sx={{ mb: 2, mr: 1.5 }} onClick={handleSendToPoClubAction}>PO Club</Button>)}
                {purchaseOrderDetails?.['state']?.value === CAD_COMPLETE_PURCHASE_ORDER_STATE &&
                    (<Button variant="outlined" sx={{ mb: 2, mr: 1.5 }} onClick={() => { createBOM() }}>{bomCreationLoading ? < SaveSpinner /> : <> </>}Refresh/ Create BOM </Button>
                    )}
                {purchaseOrderDetails?.['state']?.value === COMPLETE_PURCHASE_ORDER_STATE &&(
                    <Button variant="outlined" sx={{ mb: 2, mr: 1.5 }} onClick={() => {hadleOpenColorwayMappingModal(true)}}>Mapping Colorways </Button>
                )}
                {filteredNonReviewedList.length > 0 &&
                    <Button variant="outlined" sx={{ mb: 2, float: 'right' }}
                        onClick={fetchPurchaseOrderList}   >{pageLoading ? < SaveSpinner /> : <> </>}Next PO
                    </Button>
                }
                {(purchaseOrderDetails?.pre_costing_state === COMPLETED_VERSION_STATE && purchaseOrderDetails?.['state']?.value === PENDING_PRE_COSTING_COMPLETION) &&(
                    <Button variant="outlined" sx={{ mr: 1.5, mb: 2 }}  onClick={() => { setOpenPoVerifyModal(true) }}>{pageLoading ? < SaveSpinner /> : <> </>}Pre Costing Verified</Button>
                 )}
            </Box>}
            {isLoading  ? (
                <></>
            ) : (
            <TabContext value={activeTab}>
                <RitzTabs
                    tabs={summaryTabs}
                    activeTab={activeTab}
                    emitChange={handleChangeTabs}
                />
                <RitzTabPanel value='1'>
                    {isLoading ? (
                        <DefaultLoader />
                    ) : 
                        <>
                        {purchaseOrderDetails?.pre_costing_state !== 'complete' && (
                            <Box sx={{ width: '50%', mb: 2 }}>
                                <Alert severity='error'>Please Complete the pre costing to proceed</Alert>
                            </Box>
                        )}
                        <Box>
                        <Card  sx={{ mb: 4, mt: 3, mr: 1, border: 'none', boxShadow: 'none' }}>
                                <Grid container columnSpacing={2} px={2}>
                                <Grid item sm={2.5} xs={3}>
                                    <dl>
                                        <dt>Purchase Order Number</dt>
                                        <dd >
                                            <Typography>{purchaseOrderDetails?.long_code || '--'}</Typography>
                                        </dd>
                                    </dl> 
                                </Grid>
                                <Divider orientation='vertical' variant='middle' flexItem />
                                <Grid item sm={2.5} xs={2}>
                                    <dl>
                                        <dt>Purchase Order State</dt>
                                            <dd>
                                                <Typography>{purchaseOrderDetails?.['state']?.display_value || '--'}</Typography>
                                            </dd>
                                    </dl>
                                </Grid>
                                <Divider orientation='vertical' variant='middle' flexItem />
                                <Grid item sm={2.5} xs={3}>
                                    <dl>
                                        <dt>Customer PO Number</dt>
                                            <dd>
                                                <Typography>{purchaseOrderDetails.po_name || '--'}</Typography>
                                            </dd>
                                    </dl>
                                </Grid>
                                <Divider orientation='vertical' variant='middle' flexItem />
                                <Grid item sm={3} xs={3}>
                                    <dl>
                                        <dt>Costing Version</dt>
                                        <dd>
                                            <Typography><Link target="_blank" component={NextLink} href={orderSummaryVersionURL(purchaseOrderDetails?.marketing_costing_order, purchaseOrderDetails?.marketing_costing)}>{purchaseOrderDetails?.marketing_costing_long_code || 'N/A'}</Link></Typography>
                                        </dd>
                                    </dl> 
                                </Grid>
                                <Divider orientation='vertical' variant='middle' flexItem />
                                <Grid item sm={2.5} xs={3}>
                                    <dl>
                                        <dt>Customer</dt>
                                        <dd><Typography sx={{ margin: '0' }}>{purchaseOrderDetails.customer_name || '--'}</Typography></dd>
                                    </dl>
                                </Grid>
                                <Divider orientation='vertical' variant='middle' flexItem />
                                <Grid item sm={2.5} xs={3}>
                                    <dl>
                                        <dt>Purchase Order File</dt>
                                        <dd>
                                        <Box component="span"><Button onClick={handleDownload} sx={{ paddingLeft: '0%', paddingTop: '0%', ':hover': { backgroundColor: 'transparent' } }}>
                                        <Typography>{purchaseOrderDetails.file_display_name}</Typography></Button>
                                        </Box>
                                        </dd>
                                    </dl>
                                </Grid>
                                <Divider orientation='vertical' variant='middle' flexItem />
                                <Grid item sm={2.5} xs={3}>
                                    <dl>
                                        <dt>Pre-Costing</dt>
                                        <dd>
                                        <Box component="span">
                                        <Link href={orderSummaryPageURL(purchaseOrderDetails?.pre_costing_order, purchaseOrderDetails?.pre_costing)} target="_blank" ><Typography>{purchaseOrderDetails?.pre_costing_long_code || '--'}</Typography></Link>
                                        </Box>
                                        </dd>
                                    </dl>
                                </Grid>
                            </Grid>
                        </Card>
                        </Box>
                            <Grid container columnSpacing={0.5} px={1}>
                                <Grid item xs={12}>
                                    <Box sx={{ marginLeft: '-0.5%', padding: 0, }} >
                                        {isLoading ? <DefaultLoader /> : <>
                                            <Box sx={{ marginBottom: '2em' }}>
                                                <Typography variant="h6" sx={{ marginBottom: '1%', marginTop: '10px' }}>Purchase Order Colorways</Typography>
                                                <RitzTable data={purchaseOrderDetails.po_colorways} columns={colorwayColumns} enableGlobalFilter={false} enableColumnFilter={false} pagination={false} hideSorting={true} />
                                            </Box>
                                            <Box sx={{ marginBottom: '2em' }}>
                                                <Typography variant="h6" sx={{ marginBottom: '10px' }}>Purchase Order Countries</Typography>
                                                <RitzTable data={purchaseOrderDetails.po_countries} columns={countryColumns} enableGlobalFilter={false} enableColumnFilter={false} pagination={false} hideSorting={true} />
                                            </Box>
                                            <Box sx={{ marginBottom: '2em' }}>
                                                <Typography variant="h6" sx={{ marginBottom: '10px' }}>Purchase Order Sizes</Typography>
                                                <RitzTable data={purchaseOrderDetails.po_sizes} columns={sizeColumns} enableGlobalFilter={false} enableColumnFilter={false} pagination={false} hideSorting={true} />
                                            </Box>
                                            
                                            <Box sx={{ marginBottom: '2em' }}>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                                        <Typography variant="h6">Colorway Category Mappings</Typography>
                                                        <Tooltip title="Colorway Category Mapping">
                                                            <IconButton
                                                                onClick={() => setOpenColorwayMappingModal(true)}
                                                                size="small"
                                                                color="primary"
                                                            >
                                                                <EditIcon fontSize="inherit" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Box>
                                                    <POColorwayColorMapping purchaseOrderId={purchaseOrderId} activeTab={activeTab} />
                                            </Box>
                                            <Box sx={{ marginBottom: '2em' }}>
                                                <Typography variant="h6" sx={{ marginBottom: '10px' }}>PO Packs</Typography>
                                                <POPacks 
                                                    purchaseOrderId={purchaseOrderId} 
                                                    poPackData={poPacks} 
                                                    purchaseOrderState={purchaseOrderDetails?.[purchaseOrderStateKey]} 
                                                    orderId={purchaseOrderDetails?.order_id} 
                                                    versionId={purchaseOrderDetails?.version_id}
                                                 />
                                            </Box>
                                            {!isLoading && ratioComparison && Object.keys(ratioComparison).length > 0 && (
                                              <Box sx={{ marginBottom: '2em' }}>
                                                <Typography variant="h6" sx={{ marginBottom: '10px' }}>Ratio Comparison</Typography>
                                                <PORatioComparison RatioComparisonData={ratioComparison} />
                                              </Box>
                                            )}
                                        </>}
                                    </Box>
                                </Grid>
                            </Grid>
                        </>
                    }
                </RitzTabPanel>
                <RitzTabPanel value='2'>
                        <>
                        <EditPurchaseOrderMaterials purchaseOrderId={purchaseOrderId} />
                        </>
                </RitzTabPanel>
                <RitzTabPanel value='3'>
                    <PurchaseOrderPackagingInstruction purchaseOrderId={purchaseOrderId} packagingVersion={purchaseOrderDetails?.po_packaging_id} versionId={purchaseOrderDetails?.version_id} />
                </RitzTabPanel>
                <RitzTabPanel value='4'>
                    <PurchaseOrderDeliveryDetails  purchaseOrderId={purchaseOrderId}/>
                </RitzTabPanel>
                {/* <RitzTabPanel value='3'>
                    {isLoading ? (
                        <DefaultLoader />
                    ) : (            
                            <>
                                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <Button variant="contained" onClick={handlePoPackQuantityModal}>Po Pack Details</Button>
                                </Box>
                                <Grid>
                                    <Box>
                                        <Typography component="span" sx={{ fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>Costing Order Fabric Consumption</Typography>
                                        <EditFabricConsumptionRatioView orderId={purchaseOrderDetails.order_id} versionId={purchaseOrderDetails.version_id} />
                                    </Box>
                                    <Box sx={{ mt: 1 }}>
                                        <Typography component="span" sx={{ fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>Purchase Order Fabric Consumption</Typography>
                                        <EditPOFabricConsumptionRatioView purchaseOrderId={purchaseOrderId} />
                                    </Box>
                                </Grid>
                            </>
                    )}
                </RitzTabPanel> */}
                
                    {(purchaseOrderDetails?.[purchaseOrderStateKey]?.value === BOM_FINALIZED_STATE || purchaseOrderDetails?.[purchaseOrderStateKey]?.value === CAD_COMPLETE_PURCHASE_ORDER_STATE || purchaseOrderDetails?.[purchaseOrderStateKey]?.value === COMPLETE_PURCHASE_ORDER_STATE) &&
                        <>
                            <RitzTabPanel value='5'>
                                <Grid container>
                                    <Grid item xs={12}>
                                        <Box>
                                            <Button variant='outlined' onClick={handleFilterBomModal} sx={{ mr: 1.5, mb: 2 }}>Filter BOM</Button>
                                            <POBom purchaseOrderId={purchaseOrderId} filterData={filterBomData} />
                                        </Box>
                                    </Grid>
                                </Grid>
                            </RitzTabPanel>
                            <RitzTabPanel value='6'>
                                <Grid container>
                                    <Grid item xs={12}>
                                        <Box>
                                            <PurchaseOrderGrnData purchaseOrderId={purchaseOrderId} poShadeGroupSummaryUrl={poShadeGroupSummaryUrl} poClubShadeAttachmentUploadUrl={poClubShadeAttachmentUploadUrl} />
                                        </Box>
                                    </Grid>
                                </Grid>
                            </RitzTabPanel>
                        </>
                    }
        </TabContext>)}
            <RitzModal open={dialogOpen} onClose={handleDialogClose} title={filteredNonReviewedList.length > 0 ? ('You have reviewed a purchase order') : ('You have reviewed all purchase orders')} isLoading={isModalLoading}>
        <>
        <Box>
          <Typography>{filteredNonReviewedList.length > 0 ? ('Current reviewed purchase orders') : ('Reviewed Purchase Orders')}</Typography>
          {filteredReviewedList.length === 0 ? (
            <Typography sx={{ fontWeight: '300', textAlign: 'center' }}>There are no reviewed purchase orders</Typography>
          ) : (
            <List>
              {filteredReviewedList.map((activeItem: any) => (
                <ListItem
                  key={activeItem.id}
                  value={activeItem.id}
                  sx={{
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: grey[200],
                    },
                    backgroundColor: activeItem.id == purchaseOrderId ? green[50] : "inherit",
                  }}
                  onClick={() => handleOrderListItem(activeItem.id, purchaseOrderDetails?.uploaded_purchase_order_id)} 
                >
                  {activeItem.name}
                </ListItem>
              ))}
            </List>)}
            {filteredNonReviewedList.length > 0 &&
            <>
            <Divider />
            <Typography sx={{marginTop: '5px'}}> Need to review</Typography>
            {filteredNonReviewedList.length === 0 ? (
            <Typography sx={{ fontWeight: '300', textAlign: 'center' }}>There are no purchase orders to review</Typography>
          ) : (
            <List>
              {filteredNonReviewedList.map((inactiveItem: any) => (
                <ListItem
                  key={inactiveItem.id}
                  value={inactiveItem.id}
                  sx={{
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: grey[200],
                    },
                    backgroundColor: inactiveItem.id == purchaseOrderId ? green[50] : "inherit",
                  }}
                  onClick={() => handleOrderListItem(inactiveItem.id, purchaseOrderDetails?.uploaded_purchase_order_id )}
                >
                  {inactiveItem.name}
                </ListItem>
              ))}
            </List>
          )}
            </>
            }
        </Box>
        </>
      </RitzModal>
      {openPoVerifyModal && (
        <RitzModal open={openPoVerifyModal} onClose={handleClose} title={'Confirm'}>
            {stateChangeData?.modalText}
            <Box sx={{ display: 'flex', justifyContent: 'end', mt: 2 }}>
                    <Button variant='contained' onClick={() => { movePOToNextState() }} disabled={isConfirmPoDetailsAsComplte}>
                        {isConfirmPoDetailsAsComplte && <SaveSpinner />}Confirm</Button>
                </Box>
        </RitzModal>
      )}
         {openStateModal && (
                <RitzModal open={openStateModal} onClose={handleModalClose} title={stateModalTitle}>
                    <POState 
                        orderId={purchaseOrderId} 
                        purchaseOrderId={purchaseOrderId} 
                        setChanged={handleCurrentStateChange} 
                        currentState={purchaseOrderDetails.state.value} 
                        currentWatchList={purchaseOrderDetails.watchlist}
                        productionDates={{
                            [productionCutDateKey]: purchaseOrderDetails?.[productionCutDateKey],
                            [productionEndDateKey]: purchaseOrderDetails?.[productionEndDateKey],
                            [productionStartDateKey]: purchaseOrderDetails?.[productionStartDateKey],
                            [exFactoryDateKey]: purchaseOrderDetails?.[exFactoryDateKey]
                        }}
                    />
                </RitzModal>
            )}
            {openConfirmModal && (
                <RitzModal open={openConfirmModal} onClose={() => setOpenConfirmModal(false)} title='Send to CAD Team' maxWidth='xs'>
                    Are you sure you want to send this order to the CAD team?
                    <Box sx={{ display: 'flex', justifyContent: 'end', mt: 2 }}>
                        <Button variant='contained' onClick={handleSendToCadTeamAction} >{isConfirmSendToCadTeam && <SaveSpinner />}Confirm</Button>
                    </Box>
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
                        <span>{errorItem}</span>
                      </Grid>
                    </Grid>
                  ))}
                </Box>
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'end' }}>
                  <Button variant="outlined" color='secondary' onClick={handleErrorsDialogClose}>Close</Button>
                </Box>
              </RitzModal>
            )}
        </>
    )
}

export default PurchaseOrderDetails;
