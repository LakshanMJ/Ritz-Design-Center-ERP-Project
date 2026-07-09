import OrderSummary from "@/views/costing/OrderSummary";
import { useRouter } from "next/router";
import { Link, Button, Grid, Menu, MenuItem, useTheme, Box, Typography, Radio, RadioGroup, FormControlLabel } from "@mui/material";
import StateChangeButton from "@/views/costing/StateChangeButton";
import {
    COMPLETED_VERSION_STATE,
    OPEN_PRE_COSTING,
    PENDING_CONSUMPTION_DATA_VERSION_STATE,
    PENDING_MATERIALS_VERSION_STATE,
    PENDING_SUPPLIER_SELECTION_VERSION_STATE
} from "@/helpers/constants/CostingStates";
import DocumentHead from "@/components/DocumentHead";
import { useEffect, useState } from "react";
import api from "@/services/api";
import * as restUrls from "@/helpers/constants/RestUrls";
import * as appUrls from "@/helpers/constants/FrontEndUrls";
import VersionNavigation from "@/views/costing/VersionNavigation";
import VersionState from "@/views/costing/VersionState";
import DefaultLoader from "@/components/DefaultLoader";
import RitzModal from "@/components/Ritz/RitzModal";
import toast from "react-hot-toast";
import * as RestUrls from '@/helpers/constants/RestUrls';
import { getDefaultError } from "@/helpers/Utilities";
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import NextLink from "next/link";
import RitzBreadcrumbs from "@/components/Ritz/RitzBreadcrumbs";
import OrderStyleNumbers from "@/views/costing/OrderStyleNumbers";
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import { DEFAULT_SUCCESS, VALIDATION_ERROR_CODE } from "@/helpers/constants/Constants";
import CreateGeneralPurchaseOrder from "@/views/general_purchase_order/CreateGeneralPurchaseOrder";
import { orderSummaryVersionURL } from "@/helpers/constants/FrontEndUrls";
import PrecostingColorwayMapping from "@/views/costing/PrecostingColorwayMapping";
import PrecostingColorwayMappingEdit from "@/views/costing/PrecostingColorwayMappingEdit";
import SaveSpinner from "@/components/SaveSpinner";

const OrderVersionSummaryPage = () => {
    const router = useRouter();
    const { id, version_id } = router.query;
    const title = 'Order Summary';
    const versionModalTitle = 'Select any order version';
    const colorwayModalTitle = 'Colorway Option';
    const styleNumberModalTitle = 'Order Style Numbers'
    const stateModalTitle = 'Select any order version state';
    const generalPOTitle = 'General Purchase Order';
    // const versionDataReducerState = 'current_version_data';
    const theme = useTheme();

    const [versionDetail, setVersionDetail] = useState<any>({version_state:{value:''}});
    const [versionName, setVersionName] = useState('');
    const [versionModalOpen, setVersionModalOpen] = useState(false);
    const [errors, setErrors] = useState<any>({});
    const [preCostingConfirmationModal, setPreCostingConfirmationModal] = useState(false); 
    const [isPreCostingCreationConfirmed, setIsPreCostingCreationConfirmed] = useState(false);
    const [selectedColorwayCreationOption, setSelectedColorwayCreationOption] = useState('create_new');
    const [precostingColorwayMappingModalOpen, setPrecostingColorwayMappingModalOpen] = useState(false);
    const [preCostingColorwayMappingEditModalOpen, setPreCostingColorwayMappingEditModalOpen] = useState(false);
    const [type, setType] = useState('');

    const [versionsUpdated, isVersionsUpdated] = useState(false);
    const [styleNumberModalOpen, setStyleNumberModalOpen] = useState(false);
    const [generalPoModal, setGeneralPoModal] = useState(false);
    const [openState, setOpenState] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isTechPackUploaded, setIsTechPackUploaded] = useState(false);
    const [versionMenuAnchorEl, setVersionMenuAnchorEl] = useState<null | HTMLElement>(null);
    const versionMenuOpen = Boolean(versionMenuAnchorEl);

    const handleVersionClick = (event: React.MouseEvent<HTMLElement>) => {
        setVersionMenuAnchorEl(event.currentTarget);
    };

    const fetchData = () => {
        setIsLoading(true);

        api.get(restUrls.updateDetailVersionURL(Number(id), Number(version_id))).then(resp => {
            const respData = resp?.data || {};
            setVersionDetail(respData);
            setVersionName(respData?.name || '');
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false);
        });
    }

    //for tech pack attachment 
    const handleFileUpload = (event: any) => {
        const uploadedFile = event.target.files;
        const fileLocation = `costing/consumption/fabricmaterial`;
        const file = Array.from(uploadedFile || []);
        const uploadData = new FormData();
        uploadData.append('location', fileLocation);
        file.forEach((file: any) => {
            uploadData.append('files', file);
        });

        api.post(RestUrls.uploadFileURL(), uploadData)
        .then(resp => {
            const responseData = resp?.data || [];
            if(responseData){
               const uploadedFileId = responseData?.map((file: any) => file.id) || [];
               const uploadedFileIds = {
                attachment_ids : uploadedFileId
               }
               api.post(RestUrls.techPackFileUploadURL(version_id), uploadedFileIds).then(resp => {
                const responseData = resp?.data || [];
                if(responseData){
                    toast.success(DEFAULT_SUCCESS);
                }
               }).catch(error => {
                toast.error(getDefaultError(error?.response?.status));
               }).finally(() => {
                setIsTechPackUploaded(true);
            });
            }
        })
        .catch(error => {
            toast.error(getDefaultError(error?.response?.status));
            if (error.response && error.response.data) {
                const errorMsg = error.response.data;
            } else {
            }
        }).finally(()=> {
            setIsTechPackUploaded(false);
        })
    }

    const handleStartExistingColorwayPreCosting = () => {
        const request = {
            method: 'post',
            url: restUrls.colorwayMappingURL(id,version_id,'pre_costing'),
            data: {
                colorways: [] as any,
                data: [] as any
            }
        }
        api(request).then(resp => {
            const responseData = resp?.data || [];
            if(responseData){
                router.push(orderSummaryVersionURL(responseData?.costing_id, responseData?.costing_version_id));
            }
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
        });
    }

    const handleColorwayMappingConfirm = () => {
        if (selectedColorwayCreationOption === 'create_new') {
            setPrecostingColorwayMappingModalOpen(true);
        } else {
            handleStartExistingColorwayPreCosting()
        }
        setPreCostingConfirmationModal(false)
    };

    const handlePreCostingCreationConfirmation = () => {
        setIsPreCostingCreationConfirmed(true);
    };

    const handlePreCostingCreationConfirmationCancel = () => {
        setPreCostingConfirmationModal(false)
        setIsPreCostingCreationConfirmed(false);
    };

    const preCostingConfirmationModalOnClose = () => {
        setPreCostingConfirmationModal(false)
        setIsPreCostingCreationConfirmed(false);
    };

    const handleEditPreCosting = (type:any) => {
        setPreCostingColorwayMappingEditModalOpen(true)
        setType(type)
    };

    const [isSaving, setIsSaving] = useState(false);
    const [confirmModalOpen, setConfirmModalOpen] = useState(false);

    const preCostingverifying = () => {
        setIsSaving(true);
        const { order, id } = versionDetail;
        api.post(restUrls.colorwayMappingURL(order, id, 'verify_basic_pre_costing')).then(resp => {
          toast.success(DEFAULT_SUCCESS);
          fetchData();
          setConfirmModalOpen(false);
        }).catch(error => {
          if (VALIDATION_ERROR_CODE === error?.response?.status && error?.response?.data?.errors) {
            const errorMessages = error.response.data.errors;
            setErrors(errorMessages);
            setConfirmModalOpen(false);
            setVersionModalOpen(true);
          } else {
            toast.error(getDefaultError(error?.response?.status));
          }
        }).finally(() => {
          setIsSaving(false);
          setPreCostingColorwayMappingEditModalOpen(false)
        });
    };

    useEffect(() => {
        if (Number(id) > 0 && Number(version_id) > 0) {
            fetchData();
        }
    }, [id, version_id]);

    useEffect(() => {
        if (versionsUpdated) {
            fetchData();
            isVersionsUpdated(false)
        }
    }, [versionsUpdated]); 

    return (
        <>
            {preCostingConfirmationModal && (
                <RitzModal
                    open={preCostingConfirmationModal}
                    onClose={() => { preCostingConfirmationModalOnClose(); }}
                    title='Confirmation'
                >
                    {!isPreCostingCreationConfirmed ? (
                        <>
                            Do you want to create a Pre-costing with current costing as the marketing costing?
                            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'end' }}>
                                <Button
                                    variant="contained"
                                    onClick={() => { handlePreCostingCreationConfirmation(); }}
                                >
                                    Yes
                                </Button>
                                <Button
                                    variant="contained"
                                    color='secondary'
                                    onClick={() => { handlePreCostingCreationConfirmationCancel(); }}
                                    sx={{ ml: '10px' }}
                                >
                                    No
                                </Button>
                            </Box>
                        </>
                    ) : (
                        <>
                            <Typography sx={{ mt: 2, mb: 2 }}>
                                Do you want to create new colorways or use the marketing costing's colorways?
                            </Typography>
                            <RadioGroup
                                aria-labelledby="demo-radio-buttons-group-label"
                                defaultValue="create_new"
                                name="radio-buttons-group"
                                value={selectedColorwayCreationOption}
                                onChange={(e) => setSelectedColorwayCreationOption(e.target.value)}
                            >
                                <FormControlLabel value="create_new" control={<Radio />} label="Create New" />
                                <FormControlLabel value="use_existing" control={<Radio />} label="Use Existing" />
                            </RadioGroup>
                            <Button
                                sx={{ float: 'right', ml: 2 }}
                                variant='contained'
                                onClick={handleColorwayMappingConfirm}
                            >
                                Confirm
                            </Button>
                        </>
                    )}
                </RitzModal>
            )}

            {isLoading ? <DefaultLoader/> : <>

            <Grid container>
                <Grid item xs={12} md={6}>
                    <RitzBreadcrumbs
                        items={[
                            { label: 'Order Inquiries', url: '/costing' },
                            { label: 'Order Summary' },
                        ]}
                        title={title}
                    />
                </Grid>
            </Grid>

            <Grid container sx={{ mb: 4 }} spacing={2}>
                <Grid item xs={12}>
                    <Button
                        variant='outlined'
                        onClick={handleVersionClick}
                        endIcon={<KeyboardArrowDownIcon />}
                        sx={{ mr: 1.5 }}
                    >
                        {versionName}
                    </Button>
                    <Menu
                        anchorEl={versionMenuAnchorEl}
                        open={versionMenuOpen}
                        onClose={() => setVersionMenuAnchorEl(null)}
                        anchorOrigin={{
                          vertical: 'bottom',
                          horizontal: 'left',
                        }}
                        transformOrigin={{
                          vertical: 'top',
                          horizontal: 'left',
                        }}
                    >
                        <MenuItem onClick={() => {setVersionModalOpen(true), setVersionMenuAnchorEl(null)}}>
                            Change Version
                        </MenuItem>
                        <MenuItem onClick={() => {setOpenState(true), setVersionMenuAnchorEl(null)}}>
                            Edit Information
                        </MenuItem>
                    </Menu>
                    <Button variant='outlined' sx={{ mr: 1.5 }} >
                        <input type="file" multiple onChange={(event) => { handleFileUpload(event); event.target.value = null;}} style={fileInputStyle}/>
                        <FileUploadOutlinedIcon sx={{ fontSize: '1.5em', mr: 0.5 }} />
                            Add Attachments
                    </Button>
                        {versionDetail.version_state.value !== PENDING_MATERIALS_VERSION_STATE && (
                            <Link component={NextLink} href={appUrls.supplierInquiriesURL(+id, +version_id)}>
                                <Button variant='outlined' sx={{ mr: 1.5 }}>Supplier Inquiries</Button>
                            </Link>
                        )
                        }
                         {versionDetail.version_state.value === COMPLETED_VERSION_STATE && (
                            <>
                              <Button variant='outlined' sx={{ mr: 1.5 }} onClick={()=>setStyleNumberModalOpen(true)}>Add Style Number</Button>
                                {versionDetail?.costing_type == 'marketing_costing' && (
                                    <Button variant='outlined' sx={{ mr: 1.5 }} onClick={() => setPreCostingConfirmationModal(true)}>Start Pre Costing</Button>
                                )}
                              <Button variant='outlined' sx={{ mr: 1.5 }} onClick={()=>setGeneralPoModal(true)}>Raise General PO</Button>
                            </>
                        )
                        }

                        {versionDetail.order_state === OPEN_PRE_COSTING && versionDetail?.costing_type == 'pre_costing' &&(
                            <>
                                <Button variant='outlined' sx={{ mr: 1.5 }} onClick={() => handleEditPreCosting('edit_pre_costing')}>Edit Pre Costing</Button>
                                <Button variant='outlined' sx={{ mr: 1.5 }} onClick={() => setConfirmModalOpen(true)} disabled={versionDetail.order_state === 'general_information_complete'}>Pre Costing Details Verified</Button>
                            </>
                        )}
                        
                    {versionDetail.order_state !== OPEN_PRE_COSTING && (
                        <>
                            <StateChangeButton versionData={versionDetail} buttonText={'Send to CAD Team'} status={PENDING_MATERIALS_VERSION_STATE} refreshData={fetchData} />
                        </>
                    )}
                    <StateChangeButton versionData={versionDetail} buttonText={'Consumption Ratios Complete'} status={PENDING_CONSUMPTION_DATA_VERSION_STATE} refreshData={fetchData} />
                    <StateChangeButton versionData={versionDetail} buttonText={'Mark Version as Complete'} status={PENDING_SUPPLIER_SELECTION_VERSION_STATE} refreshData={fetchData} />
                </Grid>
            </Grid> 
            <OrderSummary orderId={id} versionId={version_id} techPackUploaded={isTechPackUploaded} versionDetail={versionDetail}/>

            <RitzModal
                open={precostingColorwayMappingModalOpen}
                title="Pre Costing - Precosting Colorway Mapping"
                onClose={() => setPrecostingColorwayMappingModalOpen(false)}
                maxWidth = 'xl'
            >
                <Box sx={{ width: '100%', maxWidth: '100%' }}>
                    <PrecostingColorwayMapping orderId={id} type={type}  setType={setType} versionId={version_id} onSubmitSuccess={() => setPrecostingColorwayMappingModalOpen(false)}/>
                </Box>
            </RitzModal>

            <RitzModal
                open={preCostingColorwayMappingEditModalOpen}
                title="Pre Costing - Precosting Colorway Mapping Edit"
                onClose={() => setPreCostingColorwayMappingEditModalOpen(false)}
                maxWidth = 'xl'
            >
                <Box sx={{ width: '100%', maxWidth: '100%' }}>
                    <PrecostingColorwayMappingEdit orderId={id} type={type} versionId={version_id} onSubmitSuccess={() => setPreCostingColorwayMappingEditModalOpen(false)} preCostingverifying={preCostingverifying} isSaving={isSaving} fetchData={fetchData}/>
                </Box>
            </RitzModal>

            {/* Dialog box for version navigation panel*/}
            {versionModalOpen && (
                <RitzModal open={versionModalOpen} title={versionModalTitle} onClose={() => setVersionModalOpen(false)}>
                    <VersionNavigation orderId={id} versionId={version_id} setOpen={setVersionModalOpen} setVersionUpdated={isVersionsUpdated} />
                </RitzModal>
            )}

            {/* Dialog box for style number panel*/}
                  {styleNumberModalOpen && (
                <RitzModal open={styleNumberModalOpen} title={styleNumberModalTitle} onClose={() => setStyleNumberModalOpen(false)}>
                    <OrderStyleNumbers orderId={id} setOpen={setStyleNumberModalOpen} />
                </RitzModal>
            )}

            {/* Dialog box for version state change*/}
            {openState && (
                <RitzModal open={openState} onClose={() => setOpenState(false)} title={stateModalTitle}  maxWidth='md' >
                    <VersionState orderId={id} versionId={version_id} setOpen={setOpenState}  />
                </RitzModal>
            )}

            {generalPoModal && (
                <RitzModal open={generalPoModal} onClose={() => setGeneralPoModal(false)} title={generalPOTitle} maxWidth='lg' >
                  <CreateGeneralPurchaseOrder orderId={id} versionId={version_id} closeModal ={() => {setGeneralPoModal(false)}}/>
                </RitzModal>
            )}
        
            {confirmModalOpen && (
                <RitzModal open={confirmModalOpen} onClose={() => setConfirmModalOpen(false)} title={'Pre Costing Details Verified'}>
                  Are you sure you want to finalize?
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'right' }}>
                    <Button variant='contained' onClick={preCostingverifying} disabled={isSaving} >
                      {isSaving && <SaveSpinner/>}Confirm
                    </Button>
                  </Box>
                </RitzModal>
            )}

            </>}
        </>
     );
}

export default OrderVersionSummaryPage;

const fileInputStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    opacity: 0,
    cursor: 'pointer',
};