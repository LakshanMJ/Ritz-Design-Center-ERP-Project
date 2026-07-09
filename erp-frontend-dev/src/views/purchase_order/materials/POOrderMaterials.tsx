import {Card, CardHeader, Grid, IconButton, useMediaQuery, useTheme} from '@mui/material';
import React, {useEffect, useState} from 'react';
import PurchaseOrderMaterialNavigation from '@/views/purchase_order/materials/PurchaseOrderMaterialNavigation';
import MaterialTable from "@/views/costing/OrderInquiry/Material/MaterialTable";
import {
    GenericPlacementHelper,
    MaterialPlacementHelper,
    POPlacementHelper
} from "@/helpers/costings/materials/MaterialFieldHelper";
import api from "@/services/api";
import {toast} from "react-hot-toast";
import {getDefaultError} from "@/helpers/Utilities";
import {PENDING_MATERIALS_VERSION_STATE} from "@/helpers/constants/CostingStates";
import * as RestUrls from '@/helpers/constants/RestUrls';
import DefaultLoader from "@/components/DefaultLoader";
import ModeEditIcon from "@mui/icons-material/ModeEdit";
import EditMaterial from "@/views/costing/OrderInquiry/Material/EditMaterial";
import RitzModal from "@/components/Ritz/RitzModal";
import AddPlacement from "@/views/costing/AddPlacement";
import AddPackagingPlacement from "@/views/costing/AddPackagingPlacement";
import {
    DEFAULT_SUCCESS,
    ORDER_MATERIAL_PACK_ITEM_TYPE,
    ORDER_MATERIAL_PACK_TYPE,
    ORDER_MATERIAL_TYPE
} from "@/helpers/constants/Constants";
import RitzSwitch from '@/components/Ritz/RitzSwitch';


const POOrderMaterials = ({ purchaseOrderId, objectId, materialsURLFunction, materialType, materialSaveURL }:any) => {
    const editModalOpenKey = 'modalOpen';
    const materialHelperKey = 'materialHelper';
    const customerBrandMaterialIdKey = 'customer_brand_material_code_id';

    const theme = useTheme();
    const isSmall = useMediaQuery(theme.breakpoints.down('md'));

    const [orderObjectMaterials, setOrderObjectMaterials] = useState({});
    const [navigationData, setNavigationData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editModalProps, setEditModalProps] = useState<any>({[editModalOpenKey]: false});
    const [packType, setPackType] = useState('');
    const [updated, setUpdated] = useState(false);
    const [completedStatus, setCompletedStatus] = useState(false);
    const [reviewedError, setReviewedError] = useState({});

    const getHelperClass = (currentMaterialType: string) => {
        return new POPlacementHelper({
            materialType: currentMaterialType,
            headers: orderObjectMaterials?.[currentMaterialType]?.['headers'],
            displayName: orderObjectMaterials?.[currentMaterialType]?.['display_name'],
            inputType: PENDING_MATERIALS_VERSION_STATE,
            purchaseOrderId: purchaseOrderId
        });
    }

    useEffect(() => {
        if (updated) {
            fetchPurchaseOrderMaterialDetails();
            setEditModalProps({[editModalOpenKey]: false})
        }
        setUpdated(false);
    }, [updated]);


    useEffect(() => {
        if (purchaseOrderId && objectId) {
            fetchPurchaseOrderMaterialDetails();
        }

    }, [purchaseOrderId, objectId]);

    useEffect(() => {
        if (materialType == ORDER_MATERIAL_TYPE) {
            setPackType(ORDER_MATERIAL_PACK_ITEM_TYPE);
        } else {
            setPackType(ORDER_MATERIAL_PACK_TYPE);
        }
    }, [materialType]);
    
    const fetchPurchaseOrderMaterialDetails = (loadAllData=true) => {
        setIsLoading(true);

        const requests = [
            api.get(materialsURLFunction(purchaseOrderId, objectId)),
            api.get(RestUrls.getPoPackReviewedStatusURL(objectId,materialType)),
            
        ];

        if (loadAllData) {
            requests.push(api.get(RestUrls.purchaseOrderMaterialNavigationURL(purchaseOrderId)));
        }

        Promise.all(requests).then(resp => {
           
            const respData = resp.map((r: any) => r.data);
            const [poPlacementMaterials, reviewedStatus, navigationData] = respData;
           
            setOrderObjectMaterials({...poPlacementMaterials});
            setCompletedStatus(reviewedStatus.reviewed);

            if (navigationData) {
                setNavigationData([...navigationData])
            }

        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoading(false));

    }

    const toggleDrawer = (title: string, data: any, helperClass: POPlacementHelper) => {
        helperClass.setReferenceCodeId(data?.[customerBrandMaterialIdKey]);
        setEditModalProps({
            [editModalOpenKey]: true,
            [materialHelperKey]: helperClass,
            data: data,
            title: title
        });
    }
    const handleCompletedSwitch = (event: any) => {
        setCompletedStatus(event.target.checked);
        const dataList = {
            type: materialType,
            object_id: objectId,
            reviewed: event.target.checked
        }
        const saveApi = RestUrls.poPackReviewedStatusURL();
        api.put(saveApi,dataList).then(resp => {
            toast.success(DEFAULT_SUCCESS);
        }).catch(error => {
            if (error.response && error.response.data) {
                const errorMsg = error.response.data;
                setReviewedError({ ...errorMsg });
                setCompletedStatus(false)
            }
            // TODO ERROR
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
        });
    };

  return (
      <>

      {
          isLoading ? <DefaultLoader/> :
              <Grid container columnSpacing={3} direction={isSmall ? 'column-reverse' : 'row'}>

                    <Grid item md={9} xs={12} sx={{ width: '100%' }}>
                        {Object.keys(orderObjectMaterials)?.length > 0 ? <>
                        {Object.keys(orderObjectMaterials)?.map((materialValue, materialIndex) => {
                            const materialHelper=getHelperClass(materialValue);
                            return (
                                <Card key={`${materialIndex}-${materialValue}`} sx={{ mb: 3 }} variant='outlined'>
                                    <CardHeader
                                        title={materialHelper?.getMaterialDisplayValue()}
                                        sx={{
                                            background: (theme) => theme.palette.grey[100],
                                            borderBottom: (theme) => `1px solid ${theme.palette.grey[300]}`
                                        }}
                                    />
                                    <MaterialTable
                                        helper={materialHelper}
                                        headers={materialHelper?.getFields()}
                                        consumptionHeaders={materialHelper?.getSupplierInquiryHeaders()}
                                        showConsumptionHeaders={false}
                                        headerLabelField={materialHelper?.getHeaderLabelField() }
                                        displayValueFunction={(headerRow: any, dataRow: any) => {
                                            if (headerRow.label === 'Edit') {
                                                return (
                                                    <IconButton size='small' color='primary' onClick={() => { toggleDrawer(materialHelper?.getMaterialDisplayValue(), dataRow, materialHelper) }}>
                                                        <ModeEditIcon fontSize='inherit' />
                                                    </IconButton>
                                                );
                                            } else {
                                                return materialHelper?.getMaterialAttributeDisplayValue(headerRow, dataRow);

                                            }

                                        }}
                                        displayData={orderObjectMaterials?.[materialValue]?.['data']}
                                        keyPrefix={materialValue}
                                        valueField={materialHelper.valueDisplayField}
                                    />
                                </Card>
                            )
                        })}
                        </> : <Card variant='outlined' sx={{ p: 2 }}>No results found.</Card>}
                        <RitzSwitch name="Complete Status" status={completedStatus} handleChangeSwitch={handleCompletedSwitch}  />
                    </Grid>

                    <Grid item md={3} xs={12} sx={{ width: '100%', mb: isSmall ? 3 : 0 }}>
                        <Card variant='outlined'>
                              <PurchaseOrderMaterialNavigation purchaseOrderId={purchaseOrderId} navigationData={navigationData} objectId={objectId}/>
                        </Card>
                    </Grid>
                </Grid>
      }
      <RitzModal
            title={"Assign Material"}
            open={editModalProps?.[editModalOpenKey]}
            onClose={ () => setEditModalProps({[editModalOpenKey]: false})}
            maxWidth='lg'
            fullWidth={true}
        >
          {editModalProps?.[editModalOpenKey] &&
              <EditMaterial
                    drawerData={editModalProps?.['data']}
                    materialHelper={editModalProps?.[materialHelperKey]}
                    orderPackType={packType}
                    setUpdated={setUpdated}
                    saveURL={materialSaveURL(objectId)}
                />
          }
        </RitzModal>

      </>
  )
}

export default POOrderMaterials;
