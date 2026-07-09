import React, { useEffect } from "react";
import { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { Accordion, AccordionDetails, AccordionSummary, Alert, Button, Card, CardContent, CardHeader, Checkbox, Grid, IconButton, List, ListItem, ListItemText, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, Tooltip } from "@mui/material";
import api from "@/services/api";
import DefaultLoader from "@/components/DefaultLoader";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import * as POUrls from '@/helpers/constants/rest_urls/POUrls';
import toast from "react-hot-toast";
import { getDefaultError, hasRole, hasRoleMultiple } from "@/helpers/Utilities";
import RitzModal from "@/components/Ritz/RitzModal";
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import AspectRatioIcon from '@mui/icons-material/AspectRatio';
import PORatioBreakDown from "./PORatioBreakDown";
import SaveSpinner from "@/components/SaveSpinner";
import { DEFAULT_SUCCESS } from "@/helpers/constants/Constants";
import EditMarker from "./EditMarker";
import { red } from "@mui/material/colors";
import {ReactKeyHelper} from "@/helpers/KeyHelper";
import EditFabricConsumptionRatioView from "@/views/cad/EditFabricConsumptionRatioView";
import CircularLoader from "@/components/CircularLoader";
import { BOM_EMAILS_SENT, COMPLETE_PO_CLUB_STATE, PENDING_BOM_VERIFICATION, PENDING_BOOKING_MARKER_SELECTION_STATE, PO_BOM_FINALIZED__STATE, READY_TO_SEND_PO_BOM_EMAIL } from "@/helpers/constants/PurchaseOrderStates";
import FileUploadIcon from '@mui/icons-material/FileUpload';
import UploadMarker from "./UploadMarker";
import MappingUploadedMarkerDetails from "./MappingUploadedMarkerDetails";
import RitzToolTip from "@/components/Ritz/RitzTooltip";
import { CAD_USER_ROLE } from "@/helpers/constants/RoleManager";

const PoMarkers = ({ clubId, currentState, orderId, versionId }: any) => {
  const modalOpenKey = 'modalOpen';
  const materialIdKey = 'materialId';
  const markerIdKey = 'markerId';
  const markersKey = 'markers';
  const markerKey = 'marker_id'
  const placementsKey = 'placements';
  const reviewedStatusKey = 'reviewed'
  const keyHelper = new ReactKeyHelper();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCircularLoader, setIsLoadingCircularLoader] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [markerDetails, setMarkerDetails] = useState<any>([])
  const [selectedFabric, setSelectedFabric] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [poFabrics, setPoFabrics] = useState<any>([]);

  const [selectedPlacemnetData, setSelectedPlacemnetData] = useState<any>([]);
  const [activeVerticalTab, setActiveVerticleTab] =  useState<any>('costing_marker')
  const [openCreateMarkerModal, setOpenCreateMarkerModal] = useState({[modalOpenKey]: false, [materialIdKey]: undefined});
  const [openUploadMarkerModal, setOpenUploadMarkerModal] = useState({[modalOpenKey]: false, [materialIdKey]: undefined});
  const [openMappingMarkerModal, setOpenMappingMarkerModal] = useState({[modalOpenKey]: false});
  const [openMarkerCadDataModal, setOpenMarkerCadDataModal] = useState({[modalOpenKey]: false, [materialIdKey]: undefined, [markerIdKey]: undefined});
  const [openMarkerDeleteModal, setOpenMarkerDeleteModal] = useState({[modalOpenKey]: false, [materialIdKey]: undefined});
  const [leftOverStatus, setLeftOverStatus] = useState<any>({});
  const [uploadedMarkerFileData, setUploadedMarkerFileData] = useState<any>({});

  const checkCADUser = hasRoleMultiple([CAD_USER_ROLE]);

  const getMarkerData = (dontShowLoader=false) => {
    if (dontShowLoader) {
      setIsLoading(true);
    }
    const requests = [
      api.get(POUrls.purchaseOrderClubCreatedMarkerDetailsURL(clubId, selectedFabric?.id, selectedCategory)),
    ];
    Promise.all(requests).then(resp => {
      const respData = resp?.map((r: any) => r.data);
      const [markerDetails] = respData;
      setMarkerDetails(Array.isArray(markerDetails) ? markerDetails : []);
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => {setIsLoadingCircularLoader(false), setIsLoading(false)});
  }

  const getFabrics = () => {
    api.get(POUrls.purchaseOrderFabricsDataURL(clubId))
      .then((resp) => {
        const poFabricList = resp.data;
        if (poFabricList.length > 0) {
        const [selectedFabric] = poFabricList;
        setPoFabrics([...poFabricList]);
        setSelectedFabric(selectedFabric);
        }
      })
      .catch((error) => {
        toast.error(getDefaultError(error?.response?.status));
      });
  };
  
  const getLeftoverStatus = () => {
    api.get(POUrls.getPoMarkerLeftOverStatusURL(clubId))
      .then((resp) => {
        const leftOverStatus = resp.data;
        setLeftOverStatus({...leftOverStatus})
      })
      .catch((error) => {
        toast.error(getDefaultError(error?.response?.status));
      });
  };

  const handleMarkerDeleteAction = () => {
    setIsDeleting(true);
        api.delete(POUrls.poClubMarkerDeleteURL(openMarkerDeleteModal?.[materialIdKey])).then((reps) => {
            toast.success(DEFAULT_SUCCESS);
            setOpenMarkerDeleteModal({[modalOpenKey]: false, [materialIdKey]: undefined});
            getMarkerData()
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsDeleting(false);
        });
  }

  const handleChange = (event: any, newValue: any, fabric: any, category: string) => {
    console.log(fabric,'fabric')
    setActiveVerticleTab(newValue);
    setSelectedFabric(fabric);
    setSelectedCategory(category);
  };

  const createMarkerModalOpen = (materialId: any) => {
    setSelectedPlacemnetData([])
    setOpenCreateMarkerModal({[modalOpenKey]: true, [materialIdKey]: materialId});
  }
  const uploadMarkerModalOpen = (materialId: any) => {
    setSelectedPlacemnetData([])
    setOpenUploadMarkerModal({[modalOpenKey]: true, [materialIdKey]: materialId});
  }

  const createMarkerModalClose = () => {
    setOpenCreateMarkerModal({[modalOpenKey]: false, [materialIdKey]: undefined});
  }
  const uploadMarkerModalClose = () => {
    setOpenUploadMarkerModal({[modalOpenKey]: false, [materialIdKey]: undefined});
  }

  const markerCadDataModalOpen = (selectedMaterialId: any, selectedMarkerId: any) => {
    setOpenMarkerCadDataModal({[modalOpenKey]: true,  [materialIdKey]: selectedMaterialId, [markerIdKey]: selectedMarkerId});
  }

  const markerCadDataModalClose = () => {
    setOpenMarkerCadDataModal({[modalOpenKey]: false, [materialIdKey]: undefined, [markerIdKey]: undefined});
  }

  const createMarkerModalCloseAfterSuccess = () => {
    setOpenCreateMarkerModal({[modalOpenKey]: false, [materialIdKey]: undefined});
    getMarkerData()
    setSelectedPlacemnetData([])
  }

  const uploadMarkerModalCloseAfterSuccess = (uploadedMarkerData: any) => {
    setOpenUploadMarkerModal({[modalOpenKey]: false, [materialIdKey]: undefined});
    setUploadedMarkerFileData(uploadedMarkerData)
    setOpenMappingMarkerModal({[modalOpenKey]: true});

  }

  const openEditMarkerPlacementsModal = (selectedMaterialId: number, selectedMarkerId: number) => {
    setOpenCreateMarkerModal({ [modalOpenKey]: true, [materialIdKey]: selectedMaterialId });
    
    const createdMarkers = markerDetails?.[markersKey]?.[selectedMaterialId]?.[markersKey];
    const selectedMarker = createdMarkers?.find((marker: { marker_id: number; }) => marker.marker_id === selectedMarkerId);
    
    setSelectedPlacemnetData(selectedMarker)
  };

  const openEditMarkerCadInfoModal = (selectedMaterialId: number, selectedMarkerId: number) => {
    setOpenMarkerCadDataModal({[modalOpenKey]: true,  [materialIdKey]: selectedMaterialId, [markerIdKey]: selectedMarkerId});
  }

  const EditCadMarkerModalCloseAfterSuccess = () => {
    // setOpenMarkerCadDataModal({[modalOpenKey]: false, [materialIdKey]: undefined, [markerIdKey]: undefined});
    if(selectedFabric> 0){
      getMarkerData();
    }
  }

  const handleMarkerEditAction = (placemnetData: any) => {
    setSelectedPlacemnetData(placemnetData)
    setOpenCreateMarkerModal({[modalOpenKey]: true, [materialIdKey]: placemnetData.po_material_id});
  }

  const handleMarkerDeleteModalOpen = (selectedMarkerId: number) => {
    if (selectedMarkerId) {
      setOpenMarkerDeleteModal({[modalOpenKey]: true, [materialIdKey]: selectedMarkerId});
    }
  }

  const handleMarkerDeleteModalClose = () => {
    setOpenMarkerDeleteModal({[modalOpenKey]: false, [materialIdKey]: undefined});
  }

  const refreshParent = () => {
    getMarkerData()
  };

  interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
  }
  const TabPanel: React.FC<TabPanelProps> = (props) => {
    const { children, value, index, ...other } = props;
    return (
      <Box
        role="tabpanel"
        hidden={value !== index}
        id={`vertical-tabpanel-${index}`}
        aria-labelledby={`vertical-tab-${index}`}
        {...other}
      >
        {value === index && (
          <Box sx={{ p: 1 }}>
            <Typography component="div">{children}</Typography>
          </Box>
        )}
      </Box>
    );
  };

  useEffect(() => {
    if (clubId) {
      getFabrics();
      getLeftoverStatus();
    }
  }, [clubId]);

  useEffect(() => {
    if (selectedFabric && selectedCategory !== 'costing_marker') {
       setIsLoadingCircularLoader(true)
       setMarkerDetails([])
       getMarkerData();
    }
  }, [selectedFabric,selectedCategory]);

//need to check
  useEffect(() => {
    //EditCadMarkerModalCloseAfterSuccess();
  }, [openMarkerCadDataModal]);

  const isEditingPlacements = selectedPlacemnetData && Object.keys(selectedPlacemnetData).length > 0

  return (
    <>
    {isLoadingCircularLoader && (<CircularLoader />)}
    
    {openMappingMarkerModal && (
        <RitzModal open={openMappingMarkerModal?.[modalOpenKey]} onClose={()=>{setOpenMappingMarkerModal({[modalOpenKey]: false});}} title= {'Mapping Marker Details'} maxWidth='md'>
          <MappingUploadedMarkerDetails markerData={uploadedMarkerFileData} refreshData={() => { setOpenMappingMarkerModal({ [modalOpenKey]: false }), getMarkerData() }} />
        </RitzModal>
      )}

    {openUploadMarkerModal && (
        <RitzModal open={openUploadMarkerModal?.[modalOpenKey]} onClose={uploadMarkerModalClose} title= {'Upload Marker'} maxWidth='md'>
          <UploadMarker materialId={selectedFabric} clubId={clubId} customerBrandMaterialId={openUploadMarkerModal?.[materialIdKey]} onUploadChangesSuccess={uploadMarkerModalCloseAfterSuccess}/>
        </RitzModal>
      )}

    {openCreateMarkerModal && (
        <RitzModal open={openCreateMarkerModal?.[modalOpenKey]} onClose={createMarkerModalClose} title= {
          isEditingPlacements
            ? `Update Marker (${selectedCategory === 'leftover_marker' ? 'Left-Over' : 'Booking'})`
            : `Create Marker (${selectedCategory === 'leftover_marker' ? 'Left-Over' : 'Booking'})`
        } maxWidth='lg'>
          <EditMarker itemId={selectedFabric} markerClassification={selectedCategory}  clubId={clubId} customerBrandMaterialId={openCreateMarkerModal?.[materialIdKey]} onMarkerChangesSuccess={createMarkerModalCloseAfterSuccess} selectedPlacementData={selectedPlacemnetData}/>
        </RitzModal>
      )}

      {openMarkerCadDataModal && (
        <>
        {!openCreateMarkerModal?.[modalOpenKey] &&<RitzModal open={openMarkerCadDataModal?.[modalOpenKey]} onClose={markerCadDataModalClose} title={`Edit Marker CAD Information (${selectedCategory === 'booking_marker' ? 'Booking' : 'Left-Over'})`} maxWidth='lg'>
         <PORatioBreakDown onRefresh={refreshParent} itemId={selectedFabric} markerClassification={selectedCategory} clubId={clubId} customerBrandMaterialId={openMarkerCadDataModal?.[materialIdKey]} selectedMarkerId={openMarkerCadDataModal?.[markerIdKey]} onMarkerCadChangesSuccess={EditCadMarkerModalCloseAfterSuccess} openEditMarkerModal={openEditMarkerPlacementsModal} openEditCadInfoModal={openEditMarkerCadInfoModal} />
        </RitzModal>}
        </>
      )}

      {openMarkerDeleteModal && <RitzModal
            open={openMarkerDeleteModal?.[modalOpenKey]}
            onClose={handleMarkerDeleteModalClose}
            maxWidth='xs'
            title='Confirm Delete'
        >
        <>

        <Box>
            <Typography>Are you sure you want to delete this marker?</Typography>
            <Box sx={{ display: 'flex', justifyContent: 'end', mt: 3 }}>
                <Button variant='contained' onClick={handleMarkerDeleteAction} color='error' disabled={isDeleting}>
                    {isDeleting && <SaveSpinner/>}Delete
                </Button>
            </Box>
        </Box>
        </>
        </RitzModal>}

      {isLoading ? <DefaultLoader /> : <>
        <Box sx={{ width: '100%', typography: 'body1' }}>
          <Box  sx={{ flexGrow: 1, bgcolor: 'background.paper', display: 'flex',  width: '100%' }}>
            {
              <>
                {/* Costing Marker */}
                <Tabs
                  orientation="vertical"
                  variant="scrollable"
                  value={activeVerticalTab}
                  aria-label="Vertical tabs example"
                  sx={{ borderRight: 1, borderColor: 'divider' }}
                >
                  <Typography sx={{ padding: '10px', fontSize: '1rem', fontWeight: 'bold' }}>Costing Markers</Typography>
                  <Tab
                    key={keyHelper.getNextKeyValue()}
                    label={'Marker Details'}
                    value={`costing_marker`}
                    onClick={(event) => handleChange(event, `costing_marker`, 0, 'costing_marker')}
                    sx={{ textAlign: 'left' }}
                  />
                  
                  {/* Left-Over Markers */}
                  {(leftOverStatus?.left_over_material_status)  &&[
                    <Typography sx={{ padding: '10px', fontSize: '1rem', fontWeight: 'bold' }}>Left-Over Markers</Typography>,
                    ...poFabrics?.map((fabric: any, index: any) => (
                      <Tab
                        key={keyHelper.getNextKeyValue()}
                        label={fabric.attributes.ritz_customer_brand_reference_code}
                        value={`leftover_marker-${index}`}
                        onClick={(event) => handleChange(event, `leftover_marker-${index}`, fabric, 'leftover_marker')}
                        sx={{ textAlign: 'left' }}
                      />
                    ))

                  ]}
                  
                  {/* Booking Markers */}
                  {(currentState.value === PENDING_BOOKING_MARKER_SELECTION_STATE || currentState.value === PO_BOM_FINALIZED__STATE ||  currentState.value === COMPLETE_PO_CLUB_STATE ||  currentState.value === READY_TO_SEND_PO_BOM_EMAIL ||  currentState.value === BOM_EMAILS_SENT || currentState.value === PENDING_BOM_VERIFICATION) && [
                    <Typography key="booking-marker-header" sx={{ padding: '10px', fontSize: '1rem', fontWeight: 'bold' }}>
                      Booking Markers
                    </Typography>,
                    ...poFabrics?.map((fabric: any, index: any) => (
                      <Tab
                        key={keyHelper.getNextKeyValue()}
                        label={
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            {fabric?.attributes?.ritz_customer_brand_reference_code}
                            <RitzToolTip
                              materialHeaders={fabric?.headers}
                              materialDetails={fabric?.attributes}
                            />
                          </div>
                        }
                        value={`booking_marker-${index}`}
                        onClick={(event) => handleChange(event, `booking_marker-${index}`, fabric, 'booking_marker')}
                        sx={{ textAlign: 'left', mr: 1 }}
                      />
                    ))
                  ]}
                    
                </Tabs>
                <Box sx={{ flex: 1, overflow: 'auto' }}>
                  {activeVerticalTab ==='costing_marker'?(
                    <Box sx={{ p: 1 }}><EditFabricConsumptionRatioView orderId={orderId} versionId={versionId} /></Box>
                  ) : (
                    <>
                      <TabPanel value={activeVerticalTab} index={activeVerticalTab}>
                          <Box sx={{ minHeight: '150px', mb: 5 }} key={keyHelper.getNextKeyValue()}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} key={'materialIndex'}>
                              <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
                                {checkCADUser && (
                                  <>
                                    <Button
                                      variant="outlined"
                                      onClick={(event) => uploadMarkerModalOpen(selectedFabric?.attributes?.customer_brand_material_id)}
                                    >
                                      <FileUploadIcon sx={{ verticalAlign: 'middle', fontSize: 20, mr: 0.5 }} />Upload Marker
                                    </Button>
                                    <Button
                                      variant="outlined"
                                      onClick={(event) => createMarkerModalOpen(selectedFabric?.attributes?.customer_brand_material_id)}
                                    >
                                      <AddCircleOutlineIcon sx={{ verticalAlign: 'middle', fontSize: 20, mr: 0.5 }} />Create Marker
                                    </Button>
                                  </>
                                )}
                              </Box>
                            </Box>
                            {markerDetails.length > 0 ? (
                              <>
                                <Grid container spacing={0} sx={{ mt: 4 }} key={keyHelper.getNextKeyValue()}>
                                  {markerDetails?.map((marker: any, markerIndex: any) => (
                                    <Grid item key={keyHelper.getNextKeyValue()} xs lg={6} md={12} >
                                      <Card sx={{ ml: 1, mb: 2, border: marker?.[reviewedStatusKey] ? "1px solid green" : "1px solid red" }}>
                                        <CardHeader
                                          title={marker.marker_name}
                                          sx={{ background: (theme) => theme.palette.grey[100], maxHeight: 60 }}
                                          action={
                                            <>
                                              {marker?.[reviewedStatusKey] === false && <Tooltip title="Edit Marker"><IconButton aria-label="edit" onClick={() => handleMarkerEditAction(marker)} sx={{ p: 0, m: '0 5px 0 0' }}><EditIcon color="primary" /></IconButton></Tooltip>}
                                              {marker?.[reviewedStatusKey] === false && <Tooltip title="Delete Marker"><IconButton aria-label="delete" onClick={() => handleMarkerDeleteModalOpen(marker?.[markerKey])} sx={{ p: 0, m: '0 5px 0 0' }}><DeleteOutlineIcon color="error" /></IconButton></Tooltip>}
                                              <Tooltip title="Edit CAD Data"><IconButton aria-label="aspect-ratio" onClick={() => markerCadDataModalOpen(marker?.po_material_id, marker?.[markerKey])} sx={{ p: 0 }}><AspectRatioIcon color="success" /></IconButton></Tooltip>
                                            </>
                                          }
                                        >
                                        </CardHeader>
                                        <CardContent>
                                          <Typography sx={{ fontWeight: 'bold', ml: 1 }}>{marker.marker_type_display || '--'}</Typography>
                                          <Box>
                                            <TableContainer sx={{ border: '1px solid rgba(0, 0, 0, 0.06)', mt: 2 }}>
                                              <Table key={markerIndex}>
                                                <TableHead>
                                                  <TableRow sx={{ backgroundColor: (theme) => theme.palette.grey[50] }}>
                                                    <TableCell>Placement</TableCell>
                                                    <TableCell sx={{ width: '5%' }}>Required Quantity</TableCell>
                                                    <TableCell sx={{ width: '5%' }}>Filled Quantity</TableCell>
                                                  </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                  {marker?.[placementsKey]?.map((placement: any, placementIndex: any) => (
                                                    <React.Fragment key={keyHelper.getNextKeyValue()}>
                                                      <TableRow>
                                                        <TableCell>{placement?.placement || '--'}</TableCell>
                                                        <TableCell>{placement?.required_quantity || 0} </TableCell>
                                                        <TableCell>{placement?.filled_quantity || 0}</TableCell>
                                                      </TableRow>
                                                    </React.Fragment>
                                                  ))}
                                                </TableBody>
                                              </Table>
                                            </TableContainer>
                                          </Box>
                                        </CardContent>
                                      </Card>
                                    </Grid>
                                  ))}
                                </Grid>
                              </>
                            ) 
                            : (
                              <Grid item xs={12}>
                                <Alert severity="info" icon={false} sx={{ ml: 1, mr: 1, mb: 1, mt: 4 }}>
                                  There were no created markers discovered. The Create Marker button can be used to add a new marking.
                                </Alert>
                              </Grid>
                            )}
                          </Box>
                      </TabPanel>
                    </>
                  )}
                </Box>
              </>
            }
          </Box>
        </Box>
      </>}
    </>
  );
};
export default PoMarkers;
