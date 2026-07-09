import React, { useEffect, useState } from "react";
import MaterialNavigation from "@/views/costing/OrderInquiry/Material/MaterialNavigation";
import { Box, Button, Card, CardHeader, DialogContentText, Grid, IconButton, Link, Tooltip, useMediaQuery, useTheme } from "@mui/material";
import MaterialTable from "@/views/costing/OrderInquiry/Material/MaterialTable";
import ModeEditIcon from '@mui/icons-material/ModeEdit';
import EditMaterial from './EditMaterial';
import * as restUrls from "@/helpers/constants/RestUrls";
import * as costingRestUrls from "@/helpers/constants/rest_urls/CostingUrls";
import * as appUrls from "@/helpers/constants/FrontEndUrls";
import {
    MaterialPlacementHelper,
    GenericPlacementHelper,
    OrderPlacementHelper, FABRIC_MATERIAL, OrderPackItemPlacementHelper
} from "@/helpers/costings/materials/MaterialFieldHelper";
import AddPlacement from "../../AddPlacement";
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import BorderColorIcon from '@mui/icons-material/BorderColor';
import MenuIcon from '@mui/icons-material/Menu';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import AddPackagingPlacement from "../../AddPackagingPlacement";
import api from "@/services/api";
import DefaultLoader from "@/components/DefaultLoader";
import SaveSpinner from "@/components/SaveSpinner";
import CompletedStatus from "./CompletedStatus";
import RitzModal from "@/components/Ritz/RitzModal";
import PackOrPackItemCost from "@/views/costing/OrderInquiry/Material/CostTable";
import { toast } from "react-hot-toast";
import { getDefaultError } from "@/helpers/Utilities";
import {
    PENDING_MATERIALS_VERSION_STATE,
    PENDING_SUPPLIER_SELECTION_VERSION_STATE
} from "@/helpers/constants/CostingStates";
import {
    DEFAULT_SUCCESS,
    ORDER_MATERIAL_PACK_ITEM_TYPE,
    ORDER_MATERIAL_PACK_TYPE,
    ORDER_MATERIAL_TYPE,
    ORDER_PACK_ITEM_EMB_SERVICE_TYPE,
    ORDER_PACK_ITEM_WASH_SERVICE_TYPE
} from "@/helpers/constants/Constants";
import RitzBreadcrumbs from "@/components/Ritz/RitzBreadcrumbs";
import ItemColorwayOperations from "@/views/costing/OrderInquiry/Material/ItemColorwayOperations";
import DisplayCostingServiceData from "@/views/costing/OrderInquiry/Service/ServiceDisplay";
import ShowMaterialReferenceCode from "@/views/costing/OrderInquiry/Material/ShowReferenceCode";
import NextLink from "next/link";
import {packItemEmbellishmentServiceList} from "@/helpers/constants/rest_urls/CostingUrls";
import ControlPointIcon from '@mui/icons-material/ControlPoint';
import CircularLoader from "@/components/CircularLoader";


const EditDialog = (props: any) => {
    const [modalTitle, setModalTitle] = useState('');

    useEffect(() => {
        setModalTitle(props.title);
    }, [props.title])

    const openAssignMaterial = (materialData: any, postData: any) => {
        props.createPlacementToggleAssignMaterial(materialData, postData);
    }

    return (
        <RitzModal
            title={modalTitle}
            open={props?.open}
            onClose={() => (props?.title !== 'Create Placement' && props?.title !== 'Edit Placement') ? props?.closeModalHandler(true) : props?.closeModalHandler(false)}
            maxWidth='lg'
            fullWidth={true}
        >
            {(props?.title !== 'Create Placement' && props?.title !== 'Edit Placement') ? (
               
                <EditMaterial
                    drawerData={props?.drawerData}
                    materialHelper={props?.materialHelper}
                    saveURL={props?.saveURL}
                    orderPackType={props?.orderPackType}
                    setUpdated={props?.closeModalHandler}
                />
            ) : (
                <AddPlacement
                    orderId={props?.orderID}
                    type={'individual'}
                    itemId={props?.materialTitle?.item_id || null}//orderItemID
                    itemItemId={props?.materialTitle?.item_item_id}//ItemID
                    sizeId={props?.materialTitle?.size_id}
                    countryId={props?.materialTitle?.country_id}
                    colorwayId={props?.materialTitle?.colorway_id}
                    colorwayTypeId={props?.materialTitle?.colorway_category_type}
                    placementOther={props?.otherplacement}
                    setUpdated={props?.closeModalHandler}
                    packItemId={parseInt(props?.packItemId)}
                    versionId={props?.versionId}
                    materialType={props?.materialType}
                    materialTypeId={props?.materialTypeId}
                    openAssignMaterial={openAssignMaterial}

                />
            )}

        </RitzModal>
    )
}

const DeleteDialog = ({
    packItemPlacementId,
    packPlacementId,
    materialType,
    open=false,
    setOpen,
    setUpdated,
    setShowErrors
}: any) => {

    const deleteApi = restUrls.deleteOtherPlacement(packItemPlacementId);
    const [isSaving, setIsSaving] = useState(false);

    const onClose = () => {
        setOpen(false);
    }

    const onDelete = () => {
        setIsSaving(true);

        api.delete(deleteApi).then(() => {
            setOpen(false);
            setUpdated(true);
            toast.success(DEFAULT_SUCCESS);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsSaving(false);
        });
    };

    return (
        <RitzModal open={open} title='Delete Placement' onClose={onClose} maxWidth='xs'>
            Are you sure you want to delete this Placement ?
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                <Button  variant='contained'  onClick={onDelete} disabled={isSaving}>
                    {isSaving && <SaveSpinner />}Delete
                </Button>
            </Box>
        </RitzModal>
    )
}



// editObjectDetails - packItemObject details or packObject details costingPhase - [costing or select_supplier]
const OrderMaterials = ({ orderId, objectId, versionId, materialType='', materialsURLFunction, materialSupplierURLFunction, costingPhase=PENDING_MATERIALS_VERSION_STATE }: any) => {
    const customerBrandMaterialIdKey = 'customer_brand_material_id';
    const itemServiceIdKey = 'item_service_id';
    const colorwayIdKey = 'colorway_id';
    const orderItemIdKey = 'item_id'; // item_id is order_item_id, this is what the API returns
    const itemIdKey = 'item_item_id';
    const packItemPlacementIdKey = 'pack_item_placement_id';
    const idKey = 'id';
    const supplierInquiryDetailIdKey = 'supplier_inquiry_detail_id';
    const packOrPackItemReviewedKey = 'reviewed';
    const serviceSuppliersKey = 'service_suppliers';
    const materialSuppliersKey = 'material_suppliers';
    const dataKey = 'data';
    const washServiceType = ORDER_PACK_ITEM_WASH_SERVICE_TYPE;
    const embServiceType = ORDER_PACK_ITEM_EMB_SERVICE_TYPE;
    const orderPackType = ORDER_MATERIAL_PACK_ITEM_TYPE;

    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState<string>();
    const [otherplacement, setOtherPlacement] = useState<any>();
    const [materialTypeId, setMaterialTypeId] = useState<string>();
    const [drawerData, setDrawerData] = useState(null);
    const [drawerHelperClass, setDrawerHelperClass] = useState(null);
    const [collapsed, setCollapsed] = useState(false);
    const [openDeleteConfirmationModal, setDeleteConfirmationModal] = useState(false);
    const [selectedPlacementId, setSelectedPlacementId] = useState(0);
    const [selectedPackPlacementId, setSelectedPackPlacementId] = useState(0);

    const [navigation, setNavigation] = useState<any>({});
    const [orderObjectMaterials, setOrderObjectMaterials] = useState<any>({});
    const [versionData, setVersionData] = useState<any>({});
    const [materialTitle, setMaterialTitle] = useState<any>({});// Contains the pack of pack item data
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMaterial, setIsLoadingMaterial] = useState(false);
    const [updated, setUpdated] = useState(false);
    const [costRefresherState, setCostRefresherState] = useState(0);
    const [serviceData, setServiceData] = useState<any>({});

    const [selectedMaterialSupplier, setSelectedMaterialSupplier] = useState({});
    const [selectedServiceSupplier, setSelectedServiceSupplier] = useState({});
    const [openServiceNewForm, setOpenServiceNewForm] = useState<any>({});
    const showConsumptionHeaders = costingPhase == PENDING_SUPPLIER_SELECTION_VERSION_STATE;

    const theme = useTheme();
    const isSmall = useMediaQuery(theme.breakpoints.down('md'));

    const resetStates = () => {
        setOpenServiceNewForm({open: false});
        setOpen(false);
    }

    const handleServiceKeyChange = (serviceType: any) => {
        setOpenServiceNewForm({open: true, serviceType: serviceType})
    }

    // Fetch data related to nav and placement materials
    useEffect(() => {
        if (orderId && objectId && versionId) {
            resetStates();
            fetchPackItemData();
        }
    }, [orderId, objectId, versionId]);


    useEffect(() => {
        let title = {};
        title = navigation?.order_pack_items?.find((orderPackTitle: any) => {
            return orderPackTitle.id == objectId;
        });
        setMaterialTitle({ ...title });
    }, [navigation]);


    const fetchPackItemData = (setLoadingSpinner=true) => {
        setIsLoadingMaterial(true);
        //setMaterialTitle({});
        const requests = [
            api.get(materialsURLFunction(objectId, versionId)),
            api.get(restUrls.getNavigationOrderMaterialURL(orderId, versionId)),
            api.get(restUrls.updateDetailVersionURL(orderId, versionId)),
            api.get(costingRestUrls.packItemWashListURL(objectId)),
            api.get(costingRestUrls.packItemEmbellishmentServiceList(objectId)),
        ];


        if (showConsumptionHeaders) {
            requests.push(api.get(materialSupplierURLFunction(orderId, versionId, objectId)));
        }

        Promise.all(requests).then(resp => {
            const respData = resp.map((r: any) => r.data);
            const [orderObjMaterialData, navData, respVersionData, washData, embellishmentData, materialSupplierData] = respData;
            setVersionData(respVersionData)
            setOrderObjectMaterials(orderObjMaterialData);
            if (navData) {
                setNavigation(navData);
            }
            if (materialSupplierData) {
                formatAndSetMaterialSupplierInquiries(materialSupplierData?.[materialSuppliersKey]);
                formatAndSetServiceSupplierInquiries(materialSupplierData?.[serviceSuppliersKey]);
            }

            const serviceDataDict:any = {
                [washServiceType]: washData,
                [embServiceType]: embellishmentData,
            }
            setServiceData(serviceDataDict);

        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false)
            setIsLoadingMaterial(false)
        });
    }

    const toggleDrawer = (isOpen: any, title: string, data: any, helperClass: OrderPlacementHelper) => {
        helperClass.setOrderPlacementId(data?.[packItemPlacementIdKey]);
        helperClass.setColorwayId(materialTitle?.[colorwayIdKey]);
        helperClass.setOrderItemId(materialTitle?.[orderItemIdKey]);
        helperClass.setItemId(materialTitle?.[itemIdKey]);
        setOpen(true);
        setTitle(title);
        setDrawerData(data);
        setDrawerHelperClass(helperClass);
    }

    const createPlacementToggleAssignMaterial = (createdPlacementData: any, postData: any) => {
        const newPlacementHelperClass = getHelperClass(postData.material_type, createdPlacementData.material_headers[0]);//temporary fixed this
        const placementData = createdPlacementData['placements'][0];
        const modifiedPlacementData = {...placementData, [packItemPlacementIdKey]: placementData[idKey], placement: placementData['placement_name']};
        toggleDrawer(true, 'Assign Material', modifiedPlacementData, newPlacementHelperClass);
    }

    const confirmationDeletePlacement = (modalStatus: any, data: any) => {
        setDeleteConfirmationModal(modalStatus);
        setSelectedPlacementId(data.pack_item_placement_id)
        setSelectedPackPlacementId(data.pack_placement_id)
     }

    const toggleModal = (isOpen: any, title: string, placementOther: any, materialType: any) => {
        setOpen(true);
        setTitle(title);
        setOtherPlacement(placementOther)
        setMaterialTypeId(materialType)
    }


    const getHelperClass = (materialType: string, materialHeaders:any) => {
        return new OrderPackItemPlacementHelper({
                materialType: materialType,
                headers: orderObjectMaterials?.[materialType]?.['headers'] || materialHeaders,
                displayName: orderObjectMaterials?.[materialType]?.['display_name'],
                supplierInquiryHeaders: orderObjectMaterials?.[materialType]?.['supplier_headers'],
                inputType: costingPhase,
                readOnly: materialTitle?.[packOrPackItemReviewedKey],
                orderId: orderId,
                versionId: versionId,
                objectId: objectId,
                itemId: materialTitle?.[itemIdKey],
            }
        );
    }


    const handleGetSavedData = () => {
        fetchPackItemData();
    };

    const closeModalHandler = (refreshData: boolean) => {

        if (refreshData) {
            fetchPackItemData();
        }
        resetStates();
    }
    // useEffect(() => {
    //     if (updated) {
    //         resetStates();
    //
    //         fetchPackItemData();
    //     }
    // }, [updated]);

    // Code related to selecting supplier inquiry
    const formatAndSetMaterialSupplierInquiries = (materialSupplierInquiries: [any]) => {
        const data = {} as any

        materialSupplierInquiries.map((materialSupplierInquiry) => {
            const customerBrandMaterialId = materialSupplierInquiry?.[customerBrandMaterialIdKey];
            data[customerBrandMaterialId] = materialSupplierInquiry?.[supplierInquiryDetailIdKey];
        });
        setSelectedMaterialSupplier(data);
    }

    const formatAndSetServiceSupplierInquiries = (materialSupplierInquiries: [any]) => {
        const data = {} as any

        materialSupplierInquiries.map((materialSupplierInquiry) => {
            const itemServiceId = materialSupplierInquiry?.[itemServiceIdKey];
            data[itemServiceId] = materialSupplierInquiry?.[supplierInquiryDetailIdKey];
        });
        setSelectedServiceSupplier(data);
    }
    const saveMaterialSupplierInquiry = (materialSupplierInquiryData: any) => {
        const payload = {
            'data': [materialSupplierInquiryData]
        };

        api.post(materialSupplierURLFunction(orderId, versionId, objectId), payload).then(resp => {
            setCostRefresherState(costRefresherState + 1);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {});
    }

    const handleServiceSupplierSelect = (dataRow: any, supplierRow: any, serviceType: any) => {
        const itemServiceId = dataRow?.[idKey];
        const supplierInquiryId = supplierRow?.[supplierInquiryDetailIdKey];
        const modifiedData = { [itemServiceId]: supplierInquiryId };
        const saveData = { [itemServiceIdKey]: itemServiceId, [supplierInquiryDetailIdKey]: supplierInquiryId, 'is_service': true };
        setSelectedServiceSupplier({ ...selectedServiceSupplier, ...modifiedData });
        saveMaterialSupplierInquiry(saveData);
    }
    const handleSupplierSelect = (dataRow: any, supplierRow: any) => {
        const customerBrandMaterialId = dataRow?.[customerBrandMaterialIdKey];
        const supplierInquiryId = supplierRow?.[supplierInquiryDetailIdKey];
        const modifiedData = { [customerBrandMaterialId]: supplierInquiryId };
        const saveData = { [customerBrandMaterialIdKey]: customerBrandMaterialId, [supplierInquiryDetailIdKey]: supplierInquiryId }
        setSelectedMaterialSupplier({ ...selectedMaterialSupplier, ...modifiedData });
        saveMaterialSupplierInquiry(saveData);
    }

    const getMaterialDisplayValue = (headerRow: any, dataRow: any, materialHelper: any) => {
       // console.log(headerRow,"headerRow")
      //  console.log(materialHelper,"materialHelper")

        if (headerRow.name === 'edit_placement' && materialTitle?.[packOrPackItemReviewedKey] === false) {


                return (
                    <>
                        <IconButton size='small' color='primary' onClick={() => { confirmationDeletePlacement(true, dataRow,) }}>
                            <DeleteForeverIcon style={{ color: '#d32f2f' }} fontSize='inherit' />
                        </IconButton>
                        {dataRow.placement_other_id !== undefined && (
                            
                            <IconButton
                                size='small'
                                color='primary'
                                onClick={() => {
                                    toggleModal(true, "Edit Placement", dataRow.placement_other_id, undefined);
                                }}
                            >
                                <BorderColorIcon fontSize='inherit' />
                            </IconButton>
                            
                        )}
                        <Tooltip title="Assign Material">
                         <IconButton size='small' color='primary' onClick={() => { toggleDrawer(true, materialHelper?.getMaterialDisplayValue(), dataRow, materialHelper) }}>
                            <ModeEditIcon fontSize='inherit' />
                        </IconButton>
                        </Tooltip>

                    </>
                );
            }  else if (headerRow?.['is_reference_code']) {
                return (
                    <ShowMaterialReferenceCode
                        materialAttributes={dataRow}
                        customerBrandMaterialId={dataRow?.[customerBrandMaterialIdKey]}
                        headerInformation={headerRow}
                    />
                )

            } else {
                return (materialHelper?.getMaterialAttributeDisplayValue(headerRow, dataRow));
            }
    }

    const handleRecalculateCosting = () => {
        const data = {
            calculate_type: 'costing_colorway',
            colorway_id: parseInt(objectId)
        }
        api.post(costingRestUrls.costingValuesRecalculateURL(versionId), data).then(resp => {
            toast.success(DEFAULT_SUCCESS);
            fetchPackItemData();
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false);
        });
    }

    return (
        <>
            <>{isLoading ? <DefaultLoader /> : <>
                <RitzBreadcrumbs
                    items={[
                        { label: 'Order Inquiries', url: '/costing' },
                        { label: 'Order Summary', url: `${appUrls.orderSummaryVersionURL(+orderId, +versionId)}?tab=3` },
                        { label: 'Assign Materials' }
                    ]}
                    title={`${materialTitle?.country_name} - ${materialTitle?.colorway_name} - ${materialTitle?.size_name} - ${materialTitle?.item_display}(${materialTitle?.colorway_category})`}
                />



                <DeleteDialog
                    open={openDeleteConfirmationModal}
                    setOpen={setDeleteConfirmationModal}
                    setUpdated ={closeModalHandler}
                    packItemPlacementId={selectedPlacementId}
                    packPlacementId={selectedPackPlacementId}
                    materialType={materialType}
                    />

                <EditDialog
                    open={open}
                    orderID={orderId}
                    setOpen={setOpen}
                    materialType={materialType}
                    title={title}
                    drawerData={drawerData}
                    materialHelper={drawerHelperClass}
                    // saveURL={materialSaveURLFunction(objectId)}
                    isModal={true}
                    orderPackType={orderPackType}
                    materialTitle={materialTitle}
                    otherplacement={otherplacement}
                    closeModalHandler={closeModalHandler}
                    packItemId={objectId}
                    versionId={versionId}
                    materialTypeId={materialTypeId}
                    createPlacementToggleAssignMaterial={createPlacementToggleAssignMaterial}

                />

                <Box sx={{ mb: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'end' }}>
                        <Box style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            {!materialTitle?.[packOrPackItemReviewedKey] &&
                                <Box>

                                <Button variant='outlined' onClick={() => { toggleModal(true, "Create Placement", 0, undefined); }} sx={{ mb: 3, mr: 3 }} >Add Placement</Button>

                                    {
                                        serviceData?.[washServiceType]?.[dataKey]?.length == 0 &&
                                        <Button variant='outlined'
                                            onClick={() => { handleServiceKeyChange(washServiceType);}}
                                            sx={{ mb: 3, mr: 3 }} >
                                                Add Wash
                                        </Button>
                                    }

                                    <Button variant='outlined' onClick={() => { handleServiceKeyChange(embServiceType);}}
                                        sx={{ mb: 3, mr: 3 }} >
                                            Add Embellishment
                                    </Button>
                                </Box>
                            }
                            <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                            {versionData.version_state?.value !== PENDING_MATERIALS_VERSION_STATE && (
                                <Link component={NextLink} href={appUrls.supplierInquiriesURL(+orderId, +versionId)}>
                                    <Button variant='outlined' sx={{ mb: 3 }}>Supplier Inquiries</Button>
                                </Link>
                            )}
                            </Box>
                        </Box>



                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}></Box>
                    <Tooltip title={collapsed ? 'Expand' : 'Collapse'} placement='left'>
                        <IconButton
                            onClick={() => setCollapsed(!collapsed)}
                            sx={{
                                fontSize: '1rem',
                                mb: 1,
                                borderRadius: 1
                            }}
                        >
                            {!collapsed ? <MenuOpenIcon fontSize='inherit' /> : <MenuIcon fontSize='inherit' />}
                            <span style={{ marginLeft: 4, fontSize: 'smaller' }}>Order Packs</span>
                        </IconButton>
                    </Tooltip>
                </Box>
                
                <Grid container columnSpacing={3} direction={isSmall ? 'column-reverse' : 'row'}>
                    <Grid item md={!collapsed ? 9 : 12} xs={12} sx={{ width: '100%' }}>
                        {showConsumptionHeaders &&
                            <PackOrPackItemCost title={'Pack Item Costing Summary'} versionId={versionId} objectId={objectId} objectType={orderPackType} costComponentRefresher={costRefresherState} />
                        }
                        {Object.keys(orderObjectMaterials)?.length > 0 ? <>
                            {Object.keys(orderObjectMaterials)?.map((materialValue, materialIndex) => {
                                const materialHelper = getHelperClass(materialValue, undefined);
                                return (
                                    <Card key={`${materialIndex}-${materialValue}`} sx={{ mb: 3 }} variant='outlined'>
                                        <CardHeader
                                            title={
                                                <>
                                                     <Box display="flex" justifyContent="space-between" alignItems="center">
                                                        <Box>{materialHelper?.getMaterialDisplayValue()}</Box>
                                                        {!materialTitle?.[packOrPackItemReviewedKey] && (
                                                            <Box><Button onClick={() => { toggleModal(true, "Create Placement", 0, materialHelper.materialType); }}  ><ControlPointIcon /></Button></Box>
                                                        )}

                                                    </Box>

                                                </>
                                              }
                                            sx={{
                                                background: (theme) => theme.palette.grey[100],
                                                borderBottom: (theme) => `1px solid ${theme.palette.grey[300]}`
                                            }}
                                        />
                                        <MaterialTable
                                            helper={materialHelper}
                                            headers={materialHelper?.getFields()}
                                            consumptionHeaders={materialHelper?.getSupplierInquiryHeaders()}
                                            showConsumptionHeaders={showConsumptionHeaders}
                                            headerLabelField={materialHelper?.getHeaderLabelField()}
                                            displayValueFunction={(headerRow: any, dataRow: any) => getMaterialDisplayValue(headerRow, dataRow, materialHelper)}
                                            displayData={orderObjectMaterials?.[materialValue]?.['data']}
                                            keyPrefix={materialValue}
                                            valueField={materialHelper.valueDisplayField}
                                            handleSupplierSelect={handleSupplierSelect}
                                            selectedMaterialSupplier={selectedMaterialSupplier}
                                        />
                                    </Card>
                                )
                            })}
                        </> : <Card variant='outlined' sx={{ p: 2, marginBottom: '20px' }}>No placements found.</Card>}
                        <DisplayCostingServiceData
                            colorwayId={materialTitle?.colorway_id}
                            itemId={materialTitle?.item_id}
                            countryId={materialTitle?.country_id}
                            serviceData={serviceData}
                            orderId={orderId}
                            versionId={versionId}
                            packItemId={objectId}
                            closeModalHandler={closeModalHandler}
                            openServiceNewForm={openServiceNewForm}
                            showSupplierInquiries={showConsumptionHeaders}
                            selectedServiceSupplier={selectedServiceSupplier}
                            handleSupplierSelect={handleServiceSupplierSelect}
                            readOnly={materialTitle?.[packOrPackItemReviewedKey]}
                            />
                        <ItemColorwayOperations versionId={versionId} colorwayId={materialTitle?.colorway_id} orderItemId={materialTitle.item_id} packItemId={objectId}/>

                        {versionData?.version_state?.value == PENDING_MATERIALS_VERSION_STATE &&
                            <CompletedStatus orderId={orderId}
                                             reviewedStatus={materialTitle?.[packOrPackItemReviewedKey] || false}
                                             materialType={materialType} packedId={materialTitle.pack_id}
                                             packedItemId={objectId} id={materialTitle.id}
                                             fetchSavedData={handleGetSavedData} /> }

                    </Grid>

                    {!collapsed && <Grid item md={3} xs={12} sx={{ width: '100%', mb: isSmall ? 3 : 0 }}>
                        <Card variant='outlined'>
                            <MaterialNavigation navigationData={navigation} orderID={orderId} pageType={materialType} versionId={versionId} costingPhase={costingPhase} />
                        </Card>
                    </Grid>}
                </Grid>
                {isLoadingMaterial && (<CircularLoader />)}    
            </>}</>
        </>
    );
};

export default OrderMaterials;
