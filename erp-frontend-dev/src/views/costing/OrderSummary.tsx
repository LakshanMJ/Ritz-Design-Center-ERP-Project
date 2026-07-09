import CostingActionButtons from "@/components/OrderInquiry/Costing/CostingActionButtons";
import CostingFormLayout from "../../components/OrderInquiry/Costing/CostingForm";
import { Box, Button, Card, Divider, Grid, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import {
    orderColorwayMatrixURL,
    orderPackListURL,
    orderSummaryVersionURL
} from "@/helpers/constants/FrontEndUrls";
import { useRouter } from "next/router";
import CostingSummary from "../../components/OrderInquiry/Costing/CostingSummary";
import {
    COSTING_STEPS,
    ORDER_SUMMARY_LABEL
} from "@/components/OrderInquiry/Costing/CostingSteps";
import api from "@/services/api";
import * as restUrls from "@/helpers/constants/RestUrls";
import DefaultLoader from "@/components/DefaultLoader";
import { processQuantityMatrixAPIResponse } from "@/helpers/costings/QuantityMatrix";
import React from "react";
import OrderPack from "./OrderInquiry/OrderPack/OrderPack";
import ErrorIcon from '@mui/icons-material/Error';
import OrderQuantitiesDisplay from "@/views/costing/OrderInquiry/OrderPack/OrderQuantitiesDisplay";
import EditIcon from "@mui/icons-material/Edit";
import { RitzTabPanel, RitzTabs } from "@/components/Ritz/RitzTabs";
import { TabContext } from "@mui/lab";
import { toast } from "react-hot-toast";
import { DEFAULT_SUCCESS, VALIDATION_ERROR_CODE } from "@/helpers/constants/Constants";
import { getDefaultError } from "@/helpers/Utilities";
import OtherMaterialData from "../cad/OtherMaterialData";
import EditFabricConsumptionRatioView from "../cad/EditFabricConsumptionRatioView";
import PackCostingSummary from "@/views/costing/OrderInquiry/OrderPack/PackCostingSummary";
import {
    OPEN_PRE_COSTING,
    PENDING_CONSUMPTION_DATA_VERSION_STATE,
    PENDING_MATERIALS_VERSION_STATE,
    PENDING_SUPPLIER_SELECTION_VERSION_STATE
} from "@/helpers/constants/CostingStates";
import RitzModal from "@/components/Ritz/RitzModal";
import CostingQuantities from "./CostingQuantities";
import PlacementUpload from "./PlacementUpload";
import OperationMatrix from "./OrderInquiry/OrderPack/OperationMatrix";
import SaveSpinner from "@/components/SaveSpinner";
import { useDispatch } from "react-redux";
import { setCostingReducerData } from "@/states/costing/CostingActions";
import ProgramOrderInquiries from "./ProgramOrderInquiries";
import PackagingDetails from "@/views/packaging/PackagingDetails";
import CreatedOrderMaterial from "./CreatedOrderMaterials";
import CostingTimeLine from "../pcl_activities/costing/CostingTimeLine";
import PoAnalyse from "./PoAnalyse";
import CostingGeneralData from "@/views/costing/CostingGeneralData";

const OrderSummary = ({ orderId, versionId, techPackUploaded, versionDetail }: any) => {

    // Tab data
    const tabDisplayOrderKey = 'tabDisplayOrder';
    const tabLabel = 'tabLabel';
    const summaryTabKey = 'summary';
    const quantityTabKey = 'quantity';
    const packsTabKey = 'packs';
    const operationMatrixKey = 'operation_matrix';
    const itemPatternTabKey = 'item_pattern';
    const fabricConsumptionDataTabKey = 'fabric_consumption_data';
    const materialConsumptionDataTabKey = 'material_consumption_data';
    const costingTabKey = 'costing';
    const packingInstructionKey = 'packing_instruction';
    const materialSummaryKey = 'material_summary';
    const timelineKey = 'timeline';
    const poAnalyseKey = 'po_analyse';

    const orderSummaryTabs = {
        [summaryTabKey]: {[tabDisplayOrderKey]: '1', [tabLabel]: 'Summary'},
        [quantityTabKey]: {[tabDisplayOrderKey]: '2', [tabLabel]: 'Quantities'},
        [packsTabKey]: {[tabDisplayOrderKey]: '3', [tabLabel]: 'Packs'},
        [poAnalyseKey]: {[tabDisplayOrderKey]: '4', [tabLabel]: 'Costing Analyzer'},
        [operationMatrixKey]: {[tabDisplayOrderKey]: '5', [tabLabel]: 'Operations'},
        [itemPatternTabKey]: {[tabDisplayOrderKey]: '6', [tabLabel]: 'Item Pattern'},
        [fabricConsumptionDataTabKey]: {[tabDisplayOrderKey]: '7', [tabLabel]: 'Fabric Consumption'},
        [materialConsumptionDataTabKey]: {[tabDisplayOrderKey]: '8', [tabLabel]: 'Trims Consumption'},
        [costingTabKey]: {[tabDisplayOrderKey]: '9', [tabLabel]: 'Costing'},
        // [packingInstructionKey]: {[tabDisplayOrderKey]: '9', [tabLabel]: 'Packing Instruction'},
        [materialSummaryKey]: {[tabDisplayOrderKey]: '10', [tabLabel]: 'Material summary'},
        [timelineKey]: {[tabDisplayOrderKey]: '11', [tabLabel]: 'Timeline'},
    };
    //'Operations'
    const initialTabs = [
        orderSummaryTabs[summaryTabKey][tabLabel],
        orderSummaryTabs[quantityTabKey][tabLabel],
        orderSummaryTabs[packsTabKey][tabLabel],
        orderSummaryTabs[poAnalyseKey][tabLabel],
        orderSummaryTabs[operationMatrixKey][tabLabel],
        ];

    const preCostingTabs = [
        orderSummaryTabs[summaryTabKey][tabLabel],
        ];

    const cadTabs = [
        orderSummaryTabs[itemPatternTabKey][tabLabel],
        orderSummaryTabs[fabricConsumptionDataTabKey][tabLabel],
        orderSummaryTabs[materialConsumptionDataTabKey][tabLabel],
    ]
    const openOrderInquiryState = 'open';
    const defaultVersionField = 'default_version';
    const versionIdField = 'version_id';
    const orderInquiryStateField = 'state';
    const versionDataReducerState = 'current_version_data';
    const [isLoading, setIsLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [openErrorsDialog, setOpenErrorsDialog] = useState(false);
    const [openProgramInquiries, setOpenProgramInquiries] = useState(false);
    const [errors, setErrors] = useState<any>([]);//TO Do
    const [activeTab, setActiveTab] = useState('1');
    const [editableState, setEditableState] = useState(false);
    const [summaryTabs, setSummaryTabs] = useState([]);
    const [openQuantityModal, setOpenQuantityModal] = useState(false);
    const [refreshSummaryData, SetRefreshSummaryData] = useState(false)
    const [isSaving, setIsSaving] = useState(false);
    const [costingData, setCostingData] = useState<any>({});
    const [costingVersionData, setCostingVersionData] = useState<any>({});
    const [completedVersionId, setCompletedVersionId] = useState();
    const [openGeneralInfoEditModal, setOpenGeneralInfoEditModal] = useState<any>(false);
    const dispatch = useDispatch();

    const router = useRouter();
    let steps = [...COSTING_STEPS].filter((step: any) => step.label != ORDER_SUMMARY_LABEL);


    // if (!versionId) {
    //     steps = steps.filter((step: any) => step.label != ORDER_PACK_QUANTITIES_LABEL);
    // }

    const handleCompleteClick = () => {
        setOpenDialog(true);
    };
    
    const handleProgramModalClose = () => {
        redirectToVersionPage(completedVersionId)
    };

    const handleDialogClose = () => {
        setOpenDialog(false);
    };


    const handleErrorsDialogClose = () => {
        setOpenErrorsDialog(false);
    };

    // Trigger fetch data
    useEffect(() => {
        if (orderId) {
            fetchData();
        }
    }, [orderId]);

    const redirectToVersionPage = (versionId: number) => {
        router.replace(orderSummaryVersionURL(orderId, versionId));
    }

    // Set the visibility of edit buttons and redirect to versions page if it is complete
    const checkStatus = (orderInquiry: any) => {
        const defaultVersion = orderInquiry?.versions?.find((version: any) => version?.[defaultVersionField] == true);

        setEditableState(orderInquiry.state == openOrderInquiryState);

        if (orderInquiry?.state != openOrderInquiryState && defaultVersion && router.pathname.endsWith('summary')) {
            redirectToVersionPage(defaultVersion.id);
        }
    }

    // Fetch data from the API
    const fetchData = () => {
        const requests = [
            api.get(restUrls.getOrderInquiryDetailsUpdateURL(orderId)),
            api.get(restUrls.orderSizeGroupsURL(orderId)),
            api.get(restUrls.getGeneralInfoMetaDataURL()),
            // api.get(restUrls.costingOrderColorwayCategoryTypesURL(orderId)),
        ]
        if (versionId) {
            requests.push(api.get(restUrls.orderPackQuantitiesURL(orderId, versionId)));
            requests.push(api.get(restUrls.updateDetailVersionURL(orderId, versionId)));
        }

        Promise.all(requests).then(resp => {
            const respData = resp.map(r => r.data);
            const [orderInquiry, orderSizeGroups, metadata, quantitiesData, versionData ] = respData;

            setCostingVersionData(versionData)

            const reducerData = {
                metadata: metadata,
                order_inquiry: {
                    ...orderInquiry,
                    size_groups: orderSizeGroups,
                    colorway_types: [], // TODO -set this correctly
                }
            };

            if (quantitiesData) {
                reducerData.order_inquiry['quantities'] = processQuantityMatrixAPIResponse(quantitiesData);
            }

            if (versionData) {
                reducerData.order_inquiry[versionDataReducerState] = versionData;
            }

            checkStatus(reducerData.order_inquiry);
            const tabsData = (versionData?.order_state === OPEN_PRE_COSTING && versionDetail?.costing_type == 'pre_costing') ? preCostingTabs: initialTabs;
            let newTabs = [...tabsData];

            if (versionData?.version_state?.value && versionData?.version_state?.value !== PENDING_MATERIALS_VERSION_STATE) {
                newTabs = [...tabsData, ...cadTabs]
            }

            if (versionData?.version_state?.value && ![PENDING_MATERIALS_VERSION_STATE, PENDING_CONSUMPTION_DATA_VERSION_STATE].includes(versionData.version_state.value)) {
                newTabs.push(orderSummaryTabs[costingTabKey][tabLabel]);
                // newTabs.push(orderSummaryTabs[packingInstructionKey][tabLabel]);
                newTabs.push(orderSummaryTabs[materialSummaryKey][tabLabel]);
                newTabs.push(orderSummaryTabs[timelineKey][tabLabel]);
            }
            setSummaryTabs( [...new Set(newTabs)]);

            setCostingData(reducerData);    // mimic reducer data to pass into CostingSummary
            dispatch(setCostingReducerData(reducerData));

        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false);
        });
    }

    const formatErrors = (errorMessages: { [x: string]: any; }) => {
        const formattedErrors = [];
        for (const category in errorMessages) {
            const categoryErrors = errorMessages[category];
            for (const field in categoryErrors) {
                const errorMessage = categoryErrors[field];
                formattedErrors.push(<span><strong>{category}:</strong><br/> {field} - {errorMessage}</span>);
            }
        }
        return formattedErrors;
    };
    
    // Handle complete
    const handleComplete = () => {
        setIsSaving(true);
        api.post(restUrls.markOrderAsCompleteURL(orderId as any))
            .then(resp => {
                toast.success(DEFAULT_SUCCESS);
                const ressavedata = resp?.data || {};
                setEditableState(false);
                setOpenDialog(false);
                if(costingData?.order_inquiry?.order_program_id==null){
                    fetchData();
                    redirectToVersionPage(ressavedata?.[versionIdField]);

                }
                else{
                    setOpenProgramInquiries(true);
                    setCompletedVersionId(ressavedata?.[versionIdField]);
                }
                
            })
            .catch(error => {
                if (VALIDATION_ERROR_CODE === error?.response?.status && error?.response?.data?.errors) {
                    const errorMessages = error.response.data.errors;
                    const formattedErrors = formatErrors(errorMessages);
                    setErrors(formattedErrors); // Update the errors state
                    setOpenDialog(false);
                    setOpenErrorsDialog(true);
                } else {
                    toast.error(getDefaultError(error?.response?.status));
                }
            }).finally(() => {
                setIsSaving(false);
            });
    }

    const handleChangeTabs = (event: string) => {
        // setActiveTab(event);
        const url = {
            pathname: router.pathname,
            query: {...router.query, tab: event}
        }
        router.replace(url, undefined, { shallow: true });
    };

    const modalOpenQuantity = () => {
        setOpenQuantityModal(true);
    };

    const modalClose = () => {
        setOpenQuantityModal(false); 
    };

    const handleChangeSavedQuantity = () => {
        fetchData()
        modalClose()
    };

    const handleOpemGeneralInfoEditModal = (status: any) => {
        setOpenGeneralInfoEditModal(status)
    }

    useEffect(() => {
        const { tab } = router.query;
        if (tab) {
            setActiveTab(tab.toString());
        }
    }, [router]);

    useEffect(() => {
      if(techPackUploaded){
        fetchData()
      }
    }, [techPackUploaded])

    useEffect(() => {
        try{
            if(refreshSummaryData){
              fetchData()
            }
        }finally{
            SetRefreshSummaryData(false)
        }
    }, [refreshSummaryData])

    return (
        
        isLoading ? <DefaultLoader/> : (
        <>
            {openGeneralInfoEditModal && (
                <RitzModal
                    open={openGeneralInfoEditModal}
                    title="Edit General Details"
                    onClose={() => handleOpemGeneralInfoEditModal(false)}
                    maxWidth='md'
                >
                    <CostingGeneralData costingData={costingData} refreshData={() => { fetchData() }} />
                </RitzModal>
            )}
            <CostingFormLayout step={7} showNavigation={editableState}>
                {versionId ? 
                    <TabContext value={activeTab}>
                        <RitzTabs 
                            tabs={summaryTabs}
                            activeTab={activeTab}
                            emitChange={handleChangeTabs} 
                        />

                        <RitzTabPanel value={`${orderSummaryTabs[summaryTabKey][tabDisplayOrderKey]}`}>
                            <Grid container>
                                {steps.map((step: any, i: number) =>
                                    <Grid key={i} item xs={12}>
                                        <Box sx={{  }}>
                                           
                                            <CostingSummary step={i} isSummaryPage={true} hasVersion={true} costing={costingData} versionData={costingVersionData} refreshSummaryData={SetRefreshSummaryData}/>
                                            {(i === 0 && costingData?.order_inquiry?.current_version_data?.version_state?.value === PENDING_MATERIALS_VERSION_STATE) && (
                                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                                                    <Button size={'small'} variant="outlined" color={'primary'} onClick={()=>{handleOpemGeneralInfoEditModal(true)}}>
                                                       Edit General Info
                                                    </Button>
                                                </Box>
                                            )}
                                            {i < (steps.length-1) && <Divider sx={{ my: 3 }} light />}
                                        </Box>
                                    </Grid>
                                )}
                            </Grid>
                        </RitzTabPanel>

                        <RitzTabPanel value={`${orderSummaryTabs[quantityTabKey][tabDisplayOrderKey]}`}>
                            <>
                                {costingData?.order_inquiry[versionDataReducerState]?.version_state.value == PENDING_MATERIALS_VERSION_STATE && (
                                    <Box sx={{ mb: 2 }}>
                                        <Button
                                            variant='outlined' 
                                            color='primary' 
                                            onClick={() => { modalOpenQuantity() }}
                                        >
                                            <EditIcon fontSize='inherit' /><Typography variant='button' sx={{ ml: 1 }}>Edit</Typography>
                                        </Button>
                                    </Box>
                                )}
                                <Box
                                    sx={{
                                        borderTop: (theme) => costingData?.order_inquiry[versionDataReducerState]?.version_state.value == PENDING_MATERIALS_VERSION_STATE ? `1px solid ${theme.palette.divider}` : 0,
                                        // borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
                                    }}
                                >
                                    <OrderQuantitiesDisplay order={costingData?.order_inquiry} version={versionId} />
                                </Box>
                            </>
                        </RitzTabPanel>

                        <RitzTabPanel value={`${orderSummaryTabs[packsTabKey][tabDisplayOrderKey]}`}>
                            <OrderPack orderId={orderId} versionId={versionId} versionData={costingData?.order_inquiry[versionDataReducerState]} />
                        </RitzTabPanel>

                        <RitzTabPanel value={`${orderSummaryTabs[operationMatrixKey][tabDisplayOrderKey]}`}>
                            <OperationMatrix orderId={orderId} versionId={versionId} versionData={costingData?.order_inquiry[versionDataReducerState]}/>
                        </RitzTabPanel>

                        <RitzTabPanel value={`${orderSummaryTabs[fabricConsumptionDataTabKey][tabDisplayOrderKey]}`}>
                            <EditFabricConsumptionRatioView orderId={orderId} versionId={versionId}/>
                        </RitzTabPanel>

                        <RitzTabPanel value={`${orderSummaryTabs[materialConsumptionDataTabKey][tabDisplayOrderKey]}`}>
                            <OtherMaterialData orderId={orderId} versionId={versionId} />
                        </RitzTabPanel>

                        <RitzTabPanel value={`${orderSummaryTabs[itemPatternTabKey][tabDisplayOrderKey]}`}>
                            <PlacementUpload order_id={orderId} version_id={versionId} versionData={costingData?.order_inquiry[versionDataReducerState]}/>
                        </RitzTabPanel>

                        <RitzTabPanel value={`${orderSummaryTabs[costingTabKey][tabDisplayOrderKey]}`}>
                            <PackCostingSummary orderId={orderId} versionId={versionId}/>
                        </RitzTabPanel>
                        {/* <RitzTabPanel value={`${orderSummaryTabs[packingInstructionKey][tabDisplayOrderKey]}`}>
                            <PackagingDetails costingData={costingData} packagingVersion={costingVersionData?.approved_packing_instruction_id} orderId={orderId} versionId={versionId}/>
                        </RitzTabPanel> */}
                        <RitzTabPanel value={`${orderSummaryTabs[timelineKey][tabDisplayOrderKey]}`}>
                            <CostingTimeLine orderId={orderId} versionId={versionId} />
                        </RitzTabPanel>
                        <RitzTabPanel value={`${orderSummaryTabs[materialSummaryKey][tabDisplayOrderKey]}`}>
                            <CreatedOrderMaterial versionId={versionId} />
                        </RitzTabPanel>
                        <RitzTabPanel value={`${orderSummaryTabs[poAnalyseKey][tabDisplayOrderKey]}`}>
                            <PoAnalyse orderId={orderId} versionId={versionId} versionData={costingData?.order_inquiry[versionDataReducerState]} />
                        </RitzTabPanel>
                    </TabContext>
                :
                    <Card variant='outlined' sx={{ p: 4 }}>
                        <Grid container>
                            {steps.map((step: any, i: number) =>
                                <Grid key={i} item xs={12}>
                                    <Box sx={{  }}>
                                        <CostingSummary step={i} isSummaryPage={true} />
                                        {i < (steps.length-1) && <Divider sx={{ my: 3 }} light />}
                                    </Box>
                                </Grid>
                            )}
                        </Grid>
                    </Card>
                }

                {editableState && 
                    <Box 
                        sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            mt: 4
                        }}
                    > {/* Container for buttons */}
                        <CostingActionButtons
                            showPrevious={editableState}
                            previousButtonOnClickAction={() =>
                                router.push(orderColorwayMatrixURL(orderId))
                            }
                            nextButtonOnClickAction={() => router.push(orderPackListURL(orderId))}
                        />
                        <Button
                            variant="contained"
                            color="primary"
                            sx={{ width: "180px" }}
                            onClick={handleCompleteClick}
                        >
                            Mark as Complete
                        </Button>
                    </Box>
                }
            </CostingFormLayout>

            {/* adding modal for quantity */}
            {openQuantityModal && (
                <RitzModal open={openQuantityModal} onClose={modalClose} title='Order Pack Quantities' maxWidth={false} >
                    <CostingQuantities orderId={orderId} versionId={versionId} closeModal={handleChangeSavedQuantity} orderInquiry={costingData?.order_inquiry} />
                </RitzModal>
            )}

            {/* confirm mark as complete */}
            {openDialog && (
                <RitzModal open={openDialog} onClose={handleDialogClose} title='Confirmation'>
                    You will not be able to edit details after the order is marked as complete. 
                    Are you sure you want to mark this order information as complete?
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'end' }}>
                        <Button variant="contained" onClick={handleComplete} disabled={isSaving}>{isSaving && <SaveSpinner/>}Confirm</Button>
                    </Box>
                </RitzModal>
            )}

            {/* show erros dialog box */}
            {openErrorsDialog && (
                <RitzModal open={openErrorsDialog} onClose={handleErrorsDialogClose} title='Operation Failed'>
                    Please fix the issues below to mark this order as complete.
                    <Divider sx={{ mt: 2, mb: 3 }}/>
                    <Box>
                        {errors.map((errorItem: string, index: number) => (
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
             {/* show program inquiries dialog box */}
                {openProgramInquiries && (

                    <RitzModal open={openProgramInquiries} onClose={handleProgramModalClose} title='Program Order Inquiries'>
                        <ProgramOrderInquiries  orderInquiry={costingData?.order_inquiry} closeModal={handleChangeSavedQuantity}/>
                    </RitzModal>

                )}
            </>
        )
    )
}

export default OrderSummary;
