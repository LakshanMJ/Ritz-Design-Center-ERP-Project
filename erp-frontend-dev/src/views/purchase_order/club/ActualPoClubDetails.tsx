import React, { useEffect, useState } from 'react'
import * as poUrls from "@/helpers/constants/rest_urls/POUrls";
import api from '@/services/api';
import { toast } from 'react-hot-toast';
import { getDefaultError, hasRole } from '@/helpers/Utilities';
import { BUSINESS_ADMIN } from '@/helpers/constants/RoleManager';
import DefaultLoader from '@/components/DefaultLoader';
import { Alert, Box, Button, Card, Divider, Grid, Link, Typography } from '@mui/material';
import RitzModal from '@/components/Ritz/RitzModal';
import POClubState from './POClubState';
import { TabContext } from '@mui/lab';
import { RitzTabPanel, RitzTabs } from '@/components/Ritz/RitzTabs';
import { useRouter } from "next/router";
import RitzTable from '@/components/Ritz/RitzTable';
import { ColumnDef } from '@tanstack/react-table';
import SaveSpinner from '@/components/SaveSpinner';
import { DEFAULT_SUCCESS } from '@/helpers/constants/Constants';
import ActualPoClubMaterialDetails from './ActualPoClubMaterialDetails';
import POMarkers from '@/views/purchase_order/po_cad/POMarkers';
import { completedConsumptionRatioDetailsURL, poClubShadeAttachmentUploadUrl, poClubStateUpdateURL, startPreCostingInPoClubURL } from '@/helpers/constants/rest_urls/POUrls';
import POClubBom from '@/views/purchase_order/club/POClubBom';
import POClubingBomPackDetails from '@/views/purchase_order/club/POClubingBomPackDetails';
import ErrorIcon from '@mui/icons-material/Error';
import NextLink from 'next/link';
import { BOM_EMAILS_SENT, COMPLETE_PO_CLUB_STATE, OPEN_PO_CLUB_STATE, PENDING_BOM_VERIFICATION, PENDING_BOOKING_MARKER_SELECTION_STATE, PENDING_CAD_DATA_PO_CLUB_STATE, PENDING_LEFTOVER_MARKER_CREATION_STATE, PENDING_LEFTOVER_VERIFICATION_STATE, PENDING_MATERIALS_REVIEW_PO_CLUB_STATE, PENDING_PRE_COSTING_COMPLETION, PO_BOM_FINALIZED__STATE, READY_TO_SEND_PO_BOM_EMAIL } from '@/helpers/constants/PurchaseOrderStates';
import { orderSummaryPageURL, purchaseOrderDetailPageURL } from '@/helpers/constants/FrontEndUrls';
import PoClub from '@/views/purchase_order/PoClub';
import SupplierPOBomDetails from '@/views/purchase_order/club/SupplierPOBomDetails';
import BomFiles from '@/views/purchase_order/club/BomFiles';
import PoMaterialDetails from './PoMaterialDetails';
import SupplierInquiryDetails from './SupplierPoDetails';
import SupplierPoDetails from './SupplierPoDetails';
import ShadeGroupsSummary from '@/views/grn/ShadeGroupsSummary';
import { clubShadeGroupSummaryUrl } from '@/helpers/constants/rest_urls/GrnUrls';
import POClubGrnDetailView from './POClubGrnDetailView';
import POClubGrnFabricSummary from './POClubGrnFabricSummary';
import CADData from '@/views/purchase_order/po_cad/CADData';
import SPOSummary from '@/views/supplier_po/reports/SPOSummary';
import ActualDeliverySummary from '@/views/supplier_po/reports/ActualDeliverySummary';
import POClubGrnData from './POClubGrnData';
import CutInstruction from './CutInstruction';
import POClubTimeLine from '@/views/pcl_activities/po_club/POClubTimeLine';
import MappingColorways from './MappingColorways';
import CircularLoader from '@/components/CircularLoader';
import EditActualSupplierPODetails from './EditActualSupplierPODetails';
import ClubPoAnalyzer from './ClubPOAnalyzer';
import POClubTransport from '@/views/transport/POClubTransport';

const ActualPoClubDetails = ({ clubId }: any) => {
  const poColumns: ColumnDef<any>[] = [
    {
      accessorKey: 'name',
      header: 'Purchase Order',
      cell: props => (
        <Link component={NextLink} href={purchaseOrderDetailPageURL(props.row.original.id)}>{props.row.original.display_number}</Link>
    )
    },
    {
      accessorKey: 'po.display_number',
      header: 'Costing',
      cell: (props) => {
              const poSet = props.row.original.order_inquiry.display_number
              return <Link href={orderSummaryPageURL(props.row.original.order_inquiry_id, props.row.original.version_id)} >{poSet}</Link>;
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

  const [clubPurchaseOrders, setClubPurchaseOrders] = useState<any>([]);
  const [clubGeneralDetails, setClubeneralDetails] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true)
  const [openStateModal, setOpenStateModal] = useState(false);
  const [summaryTabs, setSummaryTabs] = useState(['PO Details','PO Fabric Detail']);
  const [activeTab, setActiveTab] = useState('1');
  const [selectedMergingMaterials, setSelectedMergingMaterials] = useState<any>([])
  const [isSaving, setIsSaving] = useState(false);
  const [bomCreationLoading, setBomCreationLoading] = useState(false);
  const [filterBomData, setFilterBomData] = useState<any>([]);
  const [openfilterBomModal, setOpenFilterBomModal] = useState(false);
  const [modalTitle, setModalTitle] = useState<any>({});
  const [openStateChangeConfirmModal, setOpenStateChangeConfirmModal] = useState(false);
  const [selecteState, setSelecteState] = useState<any>({});
  const [errorsModalOpen, setErrorsModalOpen] = useState(false);
  const [errors, setErrors] = useState<any>([]);
  const [isPoClubingModalLoading, setIsPoClubingModalLoading] = useState(false);
  const [isLoadingCircularLoader, setIsLoadingCircularLoader] = useState(false);
  const [isStartPreCostingConfirmattion, setIsStartPreCostingConfirmattion] = useState(false);
  const [filteredPackIds, setfilteredPackIds] = useState({ pack_item_ids: [], pack_ids: [] });
  const [openMapColorwayModal, setOpenMapColorwayModal] = useState<any>({});
  const canEditInformation = hasRole(BUSINESS_ADMIN);

  const stateModalTitle = 'Select any purchase order club state'
  const mergeModalTitle = 'Confirmation'
  const initailTabs = ['PO Details', 'PO Fabric Detail', 'Analyzer']

  const router = useRouter();
  const fetchPorchaseOrderClubDetails = (tabs:any) => {
    const requests = [
      api.get(poUrls.clubPoListURL(clubId)),
    ]
   setIsLoading(true)
    Promise.all(requests).then(response => {
      const [poData] = response.map((r: any) => r.data);
      setClubeneralDetails(poData)
      setClubPurchaseOrders(poData.purchaseorder_set)
      console.log(poData?.state?.value,"poData?.state?.value")
      if (poData?.state?.value == OPEN_PO_CLUB_STATE) {
        const newSummaryTabs = [...tabs];
        setSummaryTabs([...new Set(newSummaryTabs)]);
      }
      if (poData?.state?.value == PENDING_MATERIALS_REVIEW_PO_CLUB_STATE) {
        const newSummaryTabs = [...tabs, 'Review Materials'];
        setSummaryTabs([...new Set(newSummaryTabs)]);
      }
      if (poData?.state?.value == PENDING_CAD_DATA_PO_CLUB_STATE || poData?.state?.value == PENDING_BOM_VERIFICATION || poData?.state?.value == PENDING_LEFTOVER_VERIFICATION_STATE || poData?.state?.value == PENDING_LEFTOVER_MARKER_CREATION_STATE ||  poData?.state?.value == PENDING_BOOKING_MARKER_SELECTION_STATE) {
        const newSummaryTabs = [...tabs, 'Review Materials', 'PO Markers'];
        setSummaryTabs([...new Set(newSummaryTabs)]);
      }
      if (poData?.state?.value == PO_BOM_FINALIZED__STATE) {
        const newSummaryTabs = [...tabs, 'Review Materials', 'PO Markers', 'PO BOM Details', 'Supplier PO Details'];
        setSummaryTabs([...new Set(newSummaryTabs)]);
      }
      if (poData?.state?.value == COMPLETE_PO_CLUB_STATE || poData?.state?.value == READY_TO_SEND_PO_BOM_EMAIL || poData?.state?.value == BOM_EMAILS_SENT) {
        const newSummaryTabs = [...tabs, 'Review Materials', 'PO Markers', 'PO BOM Details', 'Supplier PO Details', 'Supplier POs', 'GRN Data', 'CAD Data', 'SPO Summary','Cut Instruction','Timeline','Transport'];
         setSummaryTabs([...new Set(newSummaryTabs)]);
      }

    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => setIsLoading(false));
  }

  const handleFilterBomModal = () => {
    setOpenFilterBomModal(true)
  };

  const handleChangeTabs = (event: string) => {
    const url = {
      pathname: router.pathname,
      query: { ...router.query, tab: event }
    }
    if (event === '1') {
      fetchPorchaseOrderClubDetails(initailTabs)
    }
    router.replace(url, undefined, { shallow: true });
  };

  const handleConsumptionComplete = (event: any) => {
    setIsSaving(true);
    api.post(completedConsumptionRatioDetailsURL(clubId)).then(resp => {
      toast.success(DEFAULT_SUCCESS);
      fetchPorchaseOrderClubDetails(initailTabs)
    }).catch(error => {
      toast.error(error?.response.data.errors);
    }).finally(() => {
      setIsSaving(false);
    });
  };

  const handleCreateBom = () => {
    const purchaseOrderUrl = poUrls.buildPurchaseOrderClubingBomURL(clubId);
    setBomCreationLoading(true);
    api.post(purchaseOrderUrl).then(response => {
    fetchPorchaseOrderClubDetails(initailTabs)
    }).catch(error => {

    }).finally(() => { setBomCreationLoading(false); })
  }
  const handleCloseFilterBomModal = () => {
    setOpenFilterBomModal(false);
  };
  const handleCloseActionModal = () => {
    setOpenStateChangeConfirmModal(false);
  };

  const handleFilterData = (filterData: any) => {
    setFilterBomData(filterData.data)
    setfilteredPackIds({ ...filteredPackIds, pack_item_ids: filterData.pack_item_ids, pack_ids: filterData.pack_ids });
    handleCloseFilterBomModal()
  };

  const handleCurrentStateChange = () => {
    fetchPorchaseOrderClubDetails(initailTabs);
    setOpenStateModal(false)
    handleChangeTabs('1')
}

  const handleChangeState = (state: any) => {
    setIsSaving(true);
    api.post(poClubStateUpdateURL(clubId), {new_state:state}).then(resp => {
      toast.success(DEFAULT_SUCCESS);
      setOpenStateChangeConfirmModal(false);
      fetchPorchaseOrderClubDetails(initailTabs)

    }).catch(error => {
      const errorMessages = error.response.data.errors;
      if (error.response.data.club_completed) {
        setErrors(errorMessages);
        setOpenStateChangeConfirmModal(false)
        setErrorsModalOpen(true);
      }
      else{
        toast.error(error?.response?.data?.errors);
      }
    }).finally(() => {
      setIsSaving(false);
    });
  };
  const handleActionModalOpen = (changeState:any, modalTitle:any) => {
    setSelecteState(changeState)
    setModalTitle(modalTitle)
    setOpenStateChangeConfirmModal(true)

  }
  const handleErrorsDialogClose = () => {
    setErrors([]);
    setErrorsModalOpen(false);
  };
  const handleClosePoClubModal = () => {
    setIsPoClubingModalLoading(false);
  };
  const handleOpenMapColorwaysModal = (status: any) => {
    setOpenMapColorwayModal({ modalStatus: status })
  }
  const handleStartPreCostingModal = (status: any) => {
    setIsStartPreCostingConfirmattion(status)
  }
  const handleStartPreCosting = () => {
    setIsLoadingCircularLoader(true)
    api.post(startPreCostingInPoClubURL(clubId)).then(resp => {
      toast.success(DEFAULT_SUCCESS);
      fetchPorchaseOrderClubDetails(initailTabs)
      handleStartPreCostingModal(false)
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => {
      setIsSaving(false);
      setIsLoadingCircularLoader(false)
    });
  }


  useEffect(() => {
    if (clubId > 0) {
      fetchPorchaseOrderClubDetails(initailTabs)
    }
  }, [clubId])
  
  
  useEffect(() => {
    const { tab } = router.query;
    if (tab) {
      setActiveTab(tab.toString());
    }
  }, [router]);

  return (
    <>
     {isLoadingCircularLoader && (<CircularLoader />)}
      {isStartPreCostingConfirmattion && (
        <RitzModal open={isStartPreCostingConfirmattion} onClose={() => { setIsStartPreCostingConfirmattion(false) }} title='Confirmation'>
          <Box>
            <Grid container spacing={1} >
              <Grid item sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography>Do you want to start the Pre-Costing process now? Please confirm to proceed.</Typography>
              </Grid>
            </Grid>
          </Box>
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'end', gap: 2 }}>
            <Button variant="contained" color='primary' onClick={() => { handleStartPreCosting() }}>Confirm</Button>
            <Button variant="contained" color='primary' onClick={() => { setIsStartPreCostingConfirmattion(false) }}>Cancel</Button>
          </Box>
        </RitzModal>
      )}
      {openMapColorwayModal?.modalStatus && (
        <RitzModal open={openMapColorwayModal?.modalStatus} onClose={()=>{handleOpenMapColorwaysModal(false)}} title='Mapping Colorways' maxWidth={'xl'} >
          <MappingColorways clubId={clubId} costingType={clubGeneralDetails?.costing_type} preCosting={clubGeneralDetails?.pre_costing}  />
        </RitzModal>
      )}
      {openfilterBomModal && (
        <RitzModal open={openfilterBomModal} onClose={handleCloseFilterBomModal} title='Filter Bom Details' maxWidth={'xl'} >
          <POClubingBomPackDetails clubId={clubId} filterData={handleFilterData}  filteredPackIds={filteredPackIds} />
        </RitzModal>
      )}
      {isPoClubingModalLoading && (
        <RitzModal open={isPoClubingModalLoading} onClose={handleClosePoClubModal} title='Po Clubing Details' maxWidth={'lg'} >
          <PoClub purchaseOrderUploadId={clubGeneralDetails.uploaded_purchase_order} />
        </RitzModal>
      )}
      {clubGeneralDetails?.state?.value && (
        <Box>
          
          {(clubGeneralDetails?.state?.value == OPEN_PO_CLUB_STATE || (clubGeneralDetails?.state?.value == PENDING_PRE_COSTING_COMPLETION)) && (
            <>
              <Button variant='outlined' disabled={isSaving} onClick={() => { handleChangeState(PENDING_MATERIALS_REVIEW_PO_CLUB_STATE) }} sx={{ mr: 1.5, mb: 2 }}>{isSaving ? < SaveSpinner /> : <> </>}Start Process</Button>
            </>
          )}
          {(clubGeneralDetails?.state?.value == PENDING_PRE_COSTING_COMPLETION) && (
            <>
             <Button variant='outlined' onClick={() => {handleOpenMapColorwaysModal(true)}} sx={{ mr: 1.5, mb: 2 }}>Mapping Colorways</Button>
            </>
          )}
          {canEditInformation && (clubGeneralDetails?.state?.value !== OPEN_PO_CLUB_STATE && clubGeneralDetails?.state?.value !== PENDING_PRE_COSTING_COMPLETION ) && (
            <>
              <Button variant='outlined' onClick={() => { setOpenStateModal(true) }} sx={{ mr: 1.5, mb: 2 }}>Edit Information</Button>
            </>
          )}
          {clubGeneralDetails?.state?.value == PENDING_MATERIALS_REVIEW_PO_CLUB_STATE && (
            <>
              <Button variant='outlined' onClick={() => { handleActionModalOpen(PENDING_LEFTOVER_VERIFICATION_STATE, "Material Reviewed Confirmation") }} sx={{ mr: 1.5, mb: 2 }}>Material Reviewed</Button>
            </>
          )}
          {clubGeneralDetails?.state?.value == PENDING_LEFTOVER_VERIFICATION_STATE && (
            <>
              <Button variant='outlined' onClick={() => { handleActionModalOpen(PENDING_LEFTOVER_MARKER_CREATION_STATE, "Confirmation") }} sx={{ mr: 1.5, mb: 2 }}>Leftover Verified</Button>
            </>
          )}
          {clubGeneralDetails?.state?.value == PENDING_LEFTOVER_MARKER_CREATION_STATE && (
            <>
              <Button variant='outlined' onClick={() => { handleActionModalOpen(PENDING_BOOKING_MARKER_SELECTION_STATE, "Confirmation") }} sx={{ mr: 1.5, mb: 2 }}>Leftover Marker(s) Complete</Button>
            </>
          )}
          {clubGeneralDetails?.state?.value == PENDING_BOOKING_MARKER_SELECTION_STATE && (
            <>
              <Button variant='outlined' sx={{ mr: 1.5, mb: 2 }} onClick={() => { handleActionModalOpen(PENDING_BOM_VERIFICATION, "Confirmation") }}> {isSaving && <SaveSpinner />}Booking Marker(s) Complete </Button>
            </>
          )}
          {clubGeneralDetails?.state?.value == PENDING_BOM_VERIFICATION && (
            <>
              <Button variant="outlined" sx={{ mb: 2, mr: 1.5 }} onClick={() => { handleCreateBom() }}>{bomCreationLoading ? < SaveSpinner /> : <> </>}Refresh/ Create Bom </Button>
            </>
          )}
          {clubGeneralDetails?.state?.value == PO_BOM_FINALIZED__STATE && (
            <>
              <Button variant='outlined' disabled={isSaving} onClick={() => { handleChangeState(READY_TO_SEND_PO_BOM_EMAIL) }} sx={{ mr: 1.5, mb: 2 }}>{isSaving ? < SaveSpinner /> : <> </>}BOM Verified</Button>
            </>
          )}
          {clubGeneralDetails?.state?.value == READY_TO_SEND_PO_BOM_EMAIL && (
            <>
              <Button variant='outlined' disabled={isSaving} onClick={() => { handleChangeState(BOM_EMAILS_SENT) }} sx={{ mr: 1.5, mb: 2 }}>{isSaving ? < SaveSpinner /> : <> </>}Send Email</Button>
            </>
          )}
          {clubGeneralDetails?.state?.value == BOM_EMAILS_SENT && (
            <>
              <Button variant='outlined' disabled={isSaving} onClick={() => { handleChangeState(COMPLETE_PO_CLUB_STATE) }} sx={{ mr: 1.5, mb: 2 }}>{isSaving ? < SaveSpinner /> : <> </>}Complete</Button>
            </>
          )}

        </Box>
      )}
       {isLoading  ? <DefaultLoader/> : (
        <>
         <TabContext value={activeTab}>
            <RitzTabs
              tabs={summaryTabs}
              activeTab={activeTab}
              emitChange={handleChangeTabs}
            />
            <RitzTabPanel value='1'>
              {clubGeneralDetails?.pre_costing_state !== 'complete' && (
                <Box sx={{ width: '50%', mb: 2 }}>
                  <Alert severity='error'>Please Complete the pre costing to proceed</Alert>
                </Box>
              )}
              <Box sx={{ mb: 3, mt: 3}}>
                  <Grid container columnSpacing={2} >
                    <Grid item sm={2.5} xs={3}>
                      <dl>
                        <dt>Purchase Order Club</dt>
                        <dd>
                          <Typography>{clubGeneralDetails?.long_code || '--'}</Typography>
                        </dd>
                      </dl>
                    </Grid>
                    <Divider orientation='vertical' variant='middle' flexItem />
                    <Grid item sm={2.5} xs={3}>
                      <dl>
                        <dt>Club State</dt>
                        <dd>
                          <Typography>{clubGeneralDetails?.state?.display_value}</Typography>
                        </dd>
                      </dl>
                    </Grid>
                    <Divider orientation='vertical' variant='middle' flexItem />
                    <Grid item sm={2.5} xs={3}>
                      <dl>
                        <dt>Marker</dt>
                        <dd>
                          <Typography>{clubGeneralDetails.markers_created === true ? 'Marker Created' : 'Marker Not Created'}</Typography>
                        </dd>
                      </dl>
                    </Grid>
                    <Divider orientation='vertical' variant='middle' flexItem />
                    <Grid item sm={2.5} xs={3}>
                      <dl>
                        <dt>Marketing-Costing</dt>
                        <dd>
                          <Link href={orderSummaryPageURL(clubGeneralDetails?.marketing_costing_order, clubGeneralDetails?.marketing_costing)}><Typography>{clubGeneralDetails?.marketing_costing_display_number || '--'}</Typography></Link>
                        </dd>
                      </dl>
                    </Grid>
                    <Divider orientation='vertical' variant='middle' flexItem />
                    <Grid item sm={2.5} xs={3}>
                      <dl>
                        <dt>Pre-Costing</dt>
                        <dd>
                        <Link href={orderSummaryPageURL(clubGeneralDetails?.pre_costing_order, clubGeneralDetails?.pre_costing)}>
                          <Typography>{clubGeneralDetails?.pre_costing_display_number || '--'}</Typography>
                        </Link>
                        </dd>
                      </dl>
                    </Grid>
                  </Grid>
              </Box>
              <Typography variant="h6" sx={{ marginBottom: '5px' }}>Purchase Order List</Typography>
              <RitzTable
                columns={poColumns}
                data={clubPurchaseOrders}
              />
            </RitzTabPanel>
            <RitzTabPanel value='2'>
              <PoMaterialDetails clubId={clubId}  currentState={clubGeneralDetails?.state?.value} />
            </RitzTabPanel>
            <RitzTabPanel value='3'>
              <ClubPoAnalyzer orderId={clubGeneralDetails?.order_inquiry_id} versionId={clubGeneralDetails?.version_id} clubId={clubId} currentState={clubGeneralDetails?.state?.value}/>
            </RitzTabPanel> 
            <RitzTabPanel value='4'>
              <ActualPoClubMaterialDetails clubId={clubId}  currentState={clubGeneralDetails?.state?.value} />
            </RitzTabPanel>
            <RitzTabPanel value='5'>
              <POMarkers clubId={clubId} currentState={clubGeneralDetails?.state} orderId={clubGeneralDetails?.order_inquiry_id} versionId={clubGeneralDetails?.version_id} />
            </RitzTabPanel>
            <RitzTabPanel value='6'>
              <Grid container>
                <Grid item xs={12}>
                  <Box>  
                   <Button variant='outlined' onClick={handleFilterBomModal} sx={{ mr: 1.5, mb: 2 }}>Filter Bom</Button> 
                   <POClubBom clubId={clubId} filterData={filterBomData} />
                  </Box>
                </Grid>
              </Grid>
            </RitzTabPanel>
            <RitzTabPanel value='7'>
              <Grid container>
                <Grid item xs={12}>
                  <Box>              
                    {/* <SupplierPOBomDetails clubId={clubId}/> */}
                    <EditActualSupplierPODetails clubId={clubId}/>
                  </Box>
                </Grid>
              </Grid>
            </RitzTabPanel>
            <RitzTabPanel value='8'>
              <Grid container>
                <Grid item xs={12}>
                  <Box>              
                    <SupplierPoDetails clubId={clubId} type={true} />
                  </Box>
                </Grid>
              </Grid>
            </RitzTabPanel>
            <RitzTabPanel value='9'>
              <POClubGrnData clubId={clubId} clubShadeGroupSummaryUrl={clubShadeGroupSummaryUrl} poClubShadeAttachmentUploadUrl ={poClubShadeAttachmentUploadUrl} />
            </RitzTabPanel>
            <RitzTabPanel value='10'>
              <Grid container>
                <Grid item xs={12}>
                  <Box>
                  <CADData clubId={clubId}/>
                  </Box>
                </Grid>
              </Grid>
            </RitzTabPanel>
            <RitzTabPanel value='11'>
              <Grid container>
                <Grid item xs={12}>
                  <Box>
                  <SPOSummary  sourceId={clubId} type={true}  />
                  </Box>
                </Grid>
              </Grid>
            </RitzTabPanel>
            <RitzTabPanel value='12'>
              <Grid container>
                <Grid item xs={12}>
                  <Box>
                  <CutInstruction  clubId={clubId} type={true}  />
                  </Box>
                </Grid>
              </Grid>
            </RitzTabPanel>
            <RitzTabPanel value='13'>
              <Grid container>
                <Grid item xs={12}>
                  <Box>
                    <POClubTimeLine poClubId={clubId}/>
                  </Box>
                </Grid>
              </Grid>
            </RitzTabPanel>
            <RitzTabPanel value='14'>
              <Grid container>
                <Grid item xs={12}>
                  <Box>
                    <POClubTransport poClubId={clubId}/>
                  </Box>
                </Grid>
              </Grid>
          </RitzTabPanel>

          </TabContext>
          {openStateModal && (
            <RitzModal open={openStateModal} onClose={() => setOpenStateModal(false)} title={stateModalTitle}>
              <POClubState poclubId={clubId} setChanged={handleCurrentStateChange} currentState={clubGeneralDetails.state.value} />
            </RitzModal>
          )}
          {openStateChangeConfirmModal && (
            <RitzModal
              title={modalTitle}
              open={openStateChangeConfirmModal}
              onClose={handleCloseActionModal}
              maxWidth='xs'
            >
              Are you sure to change you want to go to the next stage?
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                <Button variant='contained' onClick={() => { handleChangeState(selecteState) }} disabled={isSaving}>
                  {isSaving && <SaveSpinner />}Ok
                </Button>
              </Box>
            </RitzModal>
          )}
          {errorsModalOpen && (
            <RitzModal open={errorsModalOpen} onClose={handleErrorsDialogClose} title='Operation Failed'>
              Please fix the issues below to continue this stage.
              <Divider sx={{ mt: 2, mb: 3 }} />
              <Box>
                {errors?.map((errorItem: string, index: number) => (
                  <Grid container spacing={1} key={index}>
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
      )}
    </>
  );
}

export default ActualPoClubDetails