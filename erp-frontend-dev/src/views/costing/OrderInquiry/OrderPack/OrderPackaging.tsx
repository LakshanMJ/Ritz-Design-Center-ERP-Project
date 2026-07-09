import React, { useEffect, useState } from "react";
import MaterialNavigation from "@/views/costing/OrderInquiry/Material/MaterialNavigation";
import { Alert, Box, Button, Card, CardHeader, DialogContentText, Grid, IconButton, Link, Tooltip, useMediaQuery, useTheme } from "@mui/material";
import MaterialTable from "@/views/costing/OrderInquiry/Material/MaterialTable";
import ModeEditIcon from '@mui/icons-material/ModeEdit';
import EditMaterial from '@/views/costing/OrderInquiry/Material/EditMaterial';
import * as restUrls from "@/helpers/constants/RestUrls";
import * as costingRestUrls from "@/helpers/constants/rest_urls/CostingUrls";
import * as appUrls from "@/helpers/constants/FrontEndUrls";
import {
    MaterialPlacementHelper,
    GenericPlacementHelper,
    OrderPlacementHelper, OrderPackPlacementHelper
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
import CompletedStatus from "@/views/costing/OrderInquiry/Material/CompletedStatus";
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
    ORDER_MATERIAL_TYPE
} from "@/helpers/constants/Constants";
import RitzBreadcrumbs from "@/components/Ritz/RitzBreadcrumbs";
import OtherCostsList from "@/views/costing/OrderInquiry/OrderPack/OtherCostsList";
import AddOtherCosts from "@/views/costing/OrderInquiry/OrderPack/AddOtherCosts";
import ShowMaterialReferenceCode from "@/views/costing/OrderInquiry/Material/ShowReferenceCode";
import NextLink from "next/link";
import ControlPointIcon from '@mui/icons-material/ControlPoint';
import CircularLoader from "@/components/CircularLoader";


const EditDialog = (props: any) => {
    const onClose = () => {
        props?.setOpen(false);
    }

    const openAssignMaterial = (materialData: any, postData: any) => {
        props.createPlacementToggleAssignMaterial(materialData, postData);
    }

    return (
        <RitzModal
            title={props?.title}
            open={props?.open}
            onClose={onClose}
            maxWidth='lg'
            fullWidth={true}
        >
            {(props?.title !== 'Create Packaging Item' && props?.title !== 'Edit Placement') ? (
                <EditMaterial
                    drawerData={props?.drawerData}
                    materialHelper={props?.materialHelper}
                    orderPackType={props?.orderPackType}
                    setUpdated={props?.setUpdated}
                />
            ) : (

                    <AddPackagingPlacement
                        orderId={props?.orderID}
                        type={'individual'}
                        sizeId={props?.materialTitle?.size}
                        countryId={props?.materialTitle?.country}
                        colorwayId={props?.materialTitle?.colorway}
                        placementOther={props?.otherplacement}
                        setUpdated={props?.setUpdated}
                        versionId={props?.versionId}
                        packId={props?.packItemId}
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

    const deleteApi = restUrls.deletePackagingPlacementURL(packPlacementId);
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

const AddingOtherDetailsDialog =(props: any)=> {
    const onClose = () => {
        props?.setOpen(false);
    }
    return (
        <RitzModal
            open={props?.open}
            title={'Edit/Add Other Cost'}
            onClose={onClose}
            maxWidth='lg'>
            <AddOtherCosts packId={props?.packId}  orderId={props?.orderID} versionId={props?.versionId}  setUpdated={props?.setUpdated} costTypeId={0} closeModal={onClose}/>
         </RitzModal>
     )
}


// editObjectDetails - packItemObject details or packObject details costingPhase - [costing or select_supplier]
const OrderMaterials = ({ orderId, objectId, versionId, materialsURLFunction, materialSupplierURLFunction, costingPhase=PENDING_MATERIALS_VERSION_STATE }: any) => {
    const materialType = 'packaging';
    const customerBrandMaterialIdKey = 'customer_brand_material_id';
    const supplierInquiryIdKey = 'supplier_inquiry_id';
    const supplierInquiryDetailIdKey = 'supplier_inquiry_detail_id';
    const colorwayIdKey = 'colorway';
    const packPlacementIdKey = 'pack_placement_id';
    const idKey = 'id';
    const packOrPackItemReviewedKey = 'reviewed';
    const packagingMaterialType = 'packaging';
    const orderPackType = ORDER_MATERIAL_PACK_TYPE;

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
    const [updated, setUpdated] = useState(false);
    const [isLoadingMaterial, setIsLoadingMaterial] = useState(false);
    const [selectedMaterialSupplier, setSelectedMaterialSupplier] = useState({});
    const [costRefresherState, setCostRefresherState] = useState(0);
    const [serviceData, setServiceData] = useState({});
    const [isCalaculatingData, setIsCalaculatingData] = useState(false);
    const [costingRecalculateErrors, setCostingRecalculateErrors] = useState<any>({});

    const [openServiceModal, setOpenServiceModal] = useState(false);
    const [serviceModalProps, setServiceModalProps] = useState<any>({});


    const showConsumptionHeaders = costingPhase == PENDING_SUPPLIER_SELECTION_VERSION_STATE;

    const theme = useTheme();
    const isSmall = useMediaQuery(theme.breakpoints.down('md'));

    const handleSavedStatus = () => {
        fetchPackagingData()
        setOpenServiceModal(false)

    }

    // Fetch data related to nav and placement materials
    useEffect(() => {
        if (orderId && objectId && versionId) {
            fetchPackagingData();
        }
    }, [orderId, objectId, versionId]);



    useEffect(() => {
        let title = {};
        title = navigation?.order_packs?.find((orderPackTitle: any) => {
            return orderPackTitle.id == objectId;
        });
        setMaterialTitle({ ...title });
    }, [navigation]);


    const fetchPackagingData = () => {
        //setMaterialTitle({});
        setIsLoadingMaterial(true);

        const requests = [
            api.get(materialsURLFunction(objectId, versionId)),
            api.get(restUrls.getNavigationOrderMaterialURL(orderId, versionId)),
            api.get(restUrls.updateDetailVersionURL(orderId, versionId)),
        ];

        if (showConsumptionHeaders) {
            requests.push(api.get(materialSupplierURLFunction(orderId, versionId, objectId)));
        }

        Promise.all(requests).then(resp => {
            const respData = resp.map((r: any) => r.data);
            const [orderObjMaterialData, navData, respVersionData, materialSupplierData] = respData;
            setVersionData(respVersionData)
            setOrderObjectMaterials(orderObjMaterialData);
            if (navData) {
                setNavigation(navData);
            }
            if (materialSupplierData) {
                formatAndSetMaterialSupplierInquiries(materialSupplierData?.['material_suppliers']);
            }


        }).catch(error => {
            console.log(error)
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false)
            setIsLoadingMaterial(false);

        });

    }

    const toggleDrawer = (isOpen: any, title: string, data: any, helperClass: OrderPackPlacementHelper) => {
        helperClass.setOrderPlacementId(data?.[packPlacementIdKey]);
        helperClass.setColorwayId(materialTitle?.[colorwayIdKey]);
        setOpen(true);
        setTitle(title);
        setDrawerData(data);
        setDrawerHelperClass(helperClass);
    }

    const confirmationDeletePlacement = (modalStatus: any, data: any) => {
        setDeleteConfirmationModal(modalStatus);
        setSelectedPlacementId(data.pack_item_placement_id)
        setSelectedPackPlacementId(data.pack_placement_id)

     }

    const toggleModal = (isOpen: any, title: string, placementOther: any, materialType:any) => {
        setOpen(true);
        setTitle(title);
        setOtherPlacement(placementOther)
        setMaterialTypeId(materialType)
    }

    const createPlacementToggleAssignMaterial = (createdPlacementData: any, postData: any) => {
        const newPlacementHelperClass = getHelperClass(postData.material_type, createdPlacementData.material_headers);
        const placementData = createdPlacementData['placements'][0];
        const modifiedPlacementData = {...placementData, [packPlacementIdKey]: placementData[idKey], placement: placementData['placement_name']};

        toggleDrawer(true, 'Assign Material', modifiedPlacementData, newPlacementHelperClass);
    }

    const getHelperClass = (materialType: string, materialHeaders:any) => {
        return new OrderPackPlacementHelper({
                materialType: materialType,
                headers: orderObjectMaterials?.[materialType]?.['headers'] || materialHeaders ,
                displayName: orderObjectMaterials?.[materialType]?.['display_name'],
                supplierInquiryHeaders: orderObjectMaterials?.[materialType]?.['supplier_headers'],
                inputType: costingPhase,
                readOnly: materialTitle?.[packOrPackItemReviewedKey],
                orderId: orderId,
                versionId: versionId,
                objectId: objectId
            }
        );
    }

    const handleGetSavedData = () => {
        fetchPackagingData();
    };

    useEffect(() => {
        if (updated) {
            setOpen(false);
            setUpdated(false);
            fetchPackagingData();
        }
    }, [updated]);

    // Code related to selecting supplier inquiry
    const formatAndSetMaterialSupplierInquiries = (materialSupplierInquiries: [any]) => {
        const data = {} as any

        materialSupplierInquiries.map((materialSupplierInquiry) => {
            const customerBrandMaterialId = materialSupplierInquiry?.[customerBrandMaterialIdKey];
            data[customerBrandMaterialId] = materialSupplierInquiry?.[supplierInquiryDetailIdKey];
        });
        setSelectedMaterialSupplier(data);
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

    const handleSupplierSelect = (dataRow: any, supplierRow: any) => {
        const customerBrandMaterialId = dataRow?.[customerBrandMaterialIdKey];
        const supplierInquiryId = supplierRow?.[supplierInquiryDetailIdKey];
        const modifiedData = { [customerBrandMaterialId]: supplierInquiryId };
        const saveData = { [customerBrandMaterialIdKey]: customerBrandMaterialId, [supplierInquiryDetailIdKey]: supplierInquiryId };
        setSelectedMaterialSupplier({ ...selectedMaterialSupplier, ...modifiedData });
        saveMaterialSupplierInquiry(saveData);
    }


    const getMaterialCellDisplayValue = (headerRow: any, dataRow: any, materialHelper: any) => {
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
                     <IconButton size='small' color='primary' onClick={() => { toggleDrawer(true, materialHelper?.getMaterialDisplayValue(), dataRow, materialHelper) }}>
                        <ModeEditIcon fontSize='inherit' />
                    </IconButton>

                </>
            );
        } else if (headerRow?.['is_reference_code']) {
            return (
                <ShowMaterialReferenceCode
                    materialAttributes={dataRow}
                    customerBrandMaterialId={dataRow?.[customerBrandMaterialIdKey]}
                    headerInformation={headerRow}
                />
            )

        } else {
            return materialHelper?.getMaterialAttributeDisplayValue(headerRow, dataRow);
        }
    }
    const handleRecalculateCosting = () => {
        setCostingRecalculateErrors({})
        setIsCalaculatingData(true);
        const data = {
            calculate_type: 'costing_colorway',
            colorway_id: materialTitle?.[colorwayIdKey] ,
            pack_ids : [parseInt(objectId)]
        }
        api.post(costingRestUrls.costingValuesRecalculateURL(versionId), data).then(resp => {
            toast.success(DEFAULT_SUCCESS);
            fetchPackagingData();
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status)); 
            setCostingRecalculateErrors(error?.response?.data);
        }).finally(() => {
            setIsLoading(false);
            setIsCalaculatingData(false);
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
                    title={`${materialTitle?.country_name} - ${materialTitle?.colorway_name} - ${materialTitle?.size_name} - Packaging`}
                />


                <AddingOtherDetailsDialog
                    open={openServiceModal}
                    orderID={orderId}
                    versionId={versionId}
                    setOpen={setOpenServiceModal}
                    setUpdated={handleSavedStatus}
                    materialType={materialType}
                    packId={objectId}
                    />

                <DeleteDialog
                    open={openDeleteConfirmationModal}
                    setOpen={setDeleteConfirmationModal}
                    setUpdated={setUpdated}
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
                    isModal={true}
                    orderPackType={orderPackType}
                    materialTitle={materialTitle}
                    otherplacement={otherplacement}
                    setUpdated={setUpdated}
                    packItemId={objectId}
                    versionId={versionId}
                    materialTypeId={materialTypeId}
                    createPlacementToggleAssignMaterial={createPlacementToggleAssignMaterial}

                />
                <Box sx={{ mb: 1 }}>
                    {costingRecalculateErrors?.success === false && (
                        <Alert severity="error" >{costingRecalculateErrors?.message}</Alert>
                    )}
                </Box>
                <Box sx={{ mb: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'end' }}>
                    {!materialTitle?.[packOrPackItemReviewedKey] && (
                        <Box style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <Box>
                                <Button variant='outlined' onClick={() => { toggleModal(true, "Create Packaging Item", 0, undefined); }} sx={{ mb: 3, mr: 3 }} >Add packaging Item</Button>
                                <Button variant='outlined' onClick={() => setOpenServiceModal(true)} sx={{ mb: 3, mr: 3 }} > Add Other Cost</Button>
                            </Box>
                        </Box>

                    )}
                   
                    {showConsumptionHeaders && (
                        <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                            {versionData.version_state?.value === PENDING_SUPPLIER_SELECTION_VERSION_STATE && (
                                <Box >
                                    <Link component={'button'} onClick={() => { handleRecalculateCosting() }}>
                                        <Button variant='outlined' sx={{ mb: 3, mr: 1 }} disabled={isCalaculatingData}> {isCalaculatingData && <SaveSpinner/>}Recalculate Costing</Button>
                                    </Link>
                                </Box>
                            )}
                            <Link component={NextLink} href={appUrls.supplierInquiriesURL(+orderId, +versionId)}>
                                <Button variant='outlined' sx={{ mb: 2 }}>Supplier Inquiries</Button>
                            </Link>
                        </Box>
                    )}
                   
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
                         {showConsumptionHeaders && (
                            <PackOrPackItemCost
                                title={'Pack Cost Summary'}
                                versionId={versionId}
                                objectId={objectId}
                                objectType={orderPackType}
                                costComponentRefresher={costRefresherState}
                            />
                        )}
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
                                                            <Box><Button onClick={() => { toggleModal(true, "Create Packaging Item", 0, materialHelper.materialType); }}  ><ControlPointIcon /></Button></Box>
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
                                            displayValueFunction={(headerRow: any, dataRow: any) => getMaterialCellDisplayValue(headerRow, dataRow, materialHelper)}
                                            displayData={orderObjectMaterials?.[materialValue]?.['data']}
                                            keyPrefix={materialValue}
                                            valueField={materialHelper.valueDisplayField}
                                            handleSupplierSelect={handleSupplierSelect}
                                            selectedMaterialSupplier={selectedMaterialSupplier}
                                        />
                                    </Card>
                                )
                            })}
                        </> : <Card variant='outlined' sx={{ p: 2, marginBottom: '20px'}}>No assigned packaging found.</Card>}

                        <Card sx={{ mb: 3 }} variant='outlined'>
                            <CardHeader
                                title={"Other Cost"}
                                sx={{
                                    background: (theme) => theme.palette.grey[100],
                                    borderBottom: (theme) => `1px solid ${theme.palette.grey[300]}`
                                }}
                            />
                            <OtherCostsList packId={objectId} orderId={orderId} versionId={versionId} />
                        </Card>

                        {versionData?.version_state?.value == PENDING_MATERIALS_VERSION_STATE &&
                            <CompletedStatus orderId={orderId}
                                             reviewedStatus={materialTitle?.[packOrPackItemReviewedKey] || false}
                                             materialType={materialType} packedId={materialTitle.pack_id}
                                             packedItemId={objectId} id={materialTitle.id}
                                             fetchSavedData={handleGetSavedData} /> }
                    </Grid>

                    { !collapsed && <Grid item md={3} xs={12} sx={{ width: '100%', mb: isSmall ? 3 : 0 }}>
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
