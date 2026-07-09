import {
    Card,
    CardHeader, Grid,
    IconButton,
} from '@mui/material';
import React, {useEffect, useState} from 'react';
import api from "@/services/api";
import {toast} from "react-hot-toast";
import {getDefaultError} from "@/helpers/Utilities";
import {ReactKeyHelper} from "@/helpers/KeyHelper";
import DefaultLoader from "@/components/DefaultLoader";
import {POPlacementHelper} from "@/helpers/costings/materials/MaterialFieldHelper";
import {PENDING_MATERIALS_VERSION_STATE} from "@/helpers/constants/CostingStates";
import ModeEditIcon from "@mui/icons-material/ModeEdit";
import MaterialTable from "@/views/costing/OrderInquiry/Material/MaterialTable";
import EditMaterial from "@/views/costing/OrderInquiry/Material/EditMaterial";
import RitzModal from "@/components/Ritz/RitzModal";
import PurchaseOrderMaterialNavigation from "@/views/purchase_order/materials/PurchaseOrderMaterialNavigation";
import POCountryColorwayNavigation from "@/views/purchase_order/country_colorway_materials/POCountryColorwayNavigation";
import * as restUrls from "@/helpers/constants/rest_urls/POUrls";
import {processQuantityMatrixAPIResponse} from "@/helpers/costings/QuantityMatrix";
import {setCostingReducerData} from "@/states/costing/CostingActions";
import {purchaseOrderColorwayCountryItemURL} from "@/helpers/constants/rest_urls/POUrls";


const POCountryColorwayItemMaterials = ({ purchaseOrderId, dataGetUrl, saveUrl }:any) => {

    const headerKey = 'material_headers';
    const dataKey = 'data';
    const placementDisplayKey = 'placement_display';
    const editModalOpenKey = 'editModalOpen';
    const materialHelperKey = 'materialHelper';

    const materialTypeDisplayKey = 'material_type_display';
    const [placementMaterialData, setPlacementMaterialData] = useState({});
    const [editModalProps, setEditModalProps] = useState<any>({});
    const [pageLoading, setPageLoading] = useState(true);
    const [navigationData, setNavigationData] = useState(true);

    const keyHelper = new ReactKeyHelper();


    const getDisplayValue = (fieldHeaderMetaData: any, fieldData: any) => {
        const attributeType = fieldHeaderMetaData['attribute_type'];
        const materialVariation = fieldHeaderMetaData['is_material_variation'];

        if (materialVariation) {

            // if (attributeType == )

        } else {
            return fieldData?.[fieldHeaderMetaData?.['name']];
        }
    }

    useEffect(() => {
        if (dataGetUrl && purchaseOrderId) {
            fetchData();
        }
    }, [dataGetUrl])

    const fetchData = () => {

        setPageLoading(true);
        const requests = [
            api.get(dataGetUrl),
            api.get(restUrls.purchaseOrderColorwayCountryItemURL(purchaseOrderId))
        ]

        Promise.all(requests).then(resp => {
            const respData = resp.map(r => r.data);
            const [placementMaterialData, navigationData] = respData;

            setPlacementMaterialData({...placementMaterialData });
            setNavigationData({...navigationData});

        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setPageLoading(false);
        });

        api.get(dataGetUrl).then(resp => {
            const reseditdata = resp?.data || [];
            setPlacementMaterialData({...reseditdata });
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {setPageLoading(false)});
    }

    const getHelperClass = (currentMaterialType: string) => {
        return new POPlacementHelper({
            materialType: currentMaterialType,
            headers: placementMaterialData?.[currentMaterialType]?.[headerKey],
            displayName: placementMaterialData?.[currentMaterialType]?.[materialTypeDisplayKey],
            inputType: PENDING_MATERIALS_VERSION_STATE,
            purchaseOrderId: purchaseOrderId
        });
    }

    const toggleDrawer = (title: string, data: any, helperClass: POPlacementHelper) => {
        helperClass.setReferenceCodeId(data?.['costing_material_attributes']?.['customer_brand_material_code_id']);
        console.log({...data, ...materialDisplayObject(data)});
        setEditModalProps({
            [editModalOpenKey]: true,
            [materialHelperKey]: helperClass,
            data: {...data, ...materialDisplayObject(data)},
            title: 'Assign Material'
        });
    }
    const materialDisplayObject = (dataRow: any) => {
        let returnData = {}
        if (dataRow?.po_material_attributes != null) {
            returnData = dataRow?.po_material_attributes;
        } else {
            returnData = dataRow?.costing_material_attributes;
        }
        return returnData;
    }
  return (
      <>
          { pageLoading ? <DefaultLoader/> :
              <Grid container columnSpacing={3} >
                <Grid item md={9} xs={12} sx={{ width: '100%' }}>
                    {
                        Object.keys(placementMaterialData)?.map((materialValue, materialIndex) => {
                          const headers = placementMaterialData?.[materialValue]?.[headerKey];
                          const materialData = placementMaterialData?.[materialValue]?.[dataKey];
                          const materialHelper = getHelperClass(materialValue);

                          return (
                              <Card key={`${materialIndex}-${materialValue}`} sx={{ mb: 3 }} variant='outlined'>
                                <CardHeader
                                    title={materialHelper.getMaterialDisplayValue()}
                                    sx={{
                                        background: (theme) => theme.palette.grey[100],
                                        borderBottom: (theme) => `1px solid ${theme.palette.grey[300]}`
                                    }}>
                                </CardHeader>
                              <MaterialTable
                                    helper={materialHelper}
                                    headers={materialHelper?.getFields()}
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
                                            return materialHelper?.getMaterialAttributeDisplayValue(headerRow, {...dataRow, ...materialDisplayObject(dataRow)});

                                        }

                                    }}
                                    displayData={placementMaterialData?.[materialValue]?.['data']}
                                    keyPrefix={materialValue}
                                    valueField={materialHelper.valueDisplayField}
                                />
                                {/*<TableContainer component={Paper} key={keyHelper.getNextKeyValue()}>*/}
                                {/*    */}
                                {/*      <Table sx={{ minWidth: 650 }} aria-label="simple table">*/}
                                {/*        <TableHead>*/}
                                {/*          <TableRow>*/}
                                {/*            <TableCell>Placement</TableCell>*/}
                                {/*              { headers.map((header:any, headerIndex: any) => (*/}
                                {/*                  <TableCell key={keyHelper.getNextKeyValue()}>{header?.['label']}</TableCell>*/}
                                {/*              ))}*/}
                                {/*              <TableCell>Action</TableCell>*/}
                                {/*          </TableRow>*/}
                                {/*        </TableHead>*/}
                                {/*        <TableBody>*/}
                                {/*            {*/}
                                {/*                materialData.map((dataRow: any, dataRowIndex: number) => {*/}
                                {/*                    const displayMaterialData = materialDisplayObject(dataRow);*/}
                                {/*                    return (*/}
                                {/*                        <TableRow key={keyHelper.getNextKeyValue()}>*/}
                                {/*                            <TableCell*/}
                                {/*                                key={keyHelper.getNextKeyValue()}>{dataRow?.[placementDisplayKey]}</TableCell>*/}
                                {/*                            {*/}
                                {/*                                headers.map((header: any, headerIndex: any) => (*/}

                                {/*                                    <TableCell key={keyHelper.getNextKeyValue()}>*/}
                                {/*                                        {getDisplayValue(header, displayMaterialData)}*/}
                                {/*                                    </TableCell>*/}

                                {/*                                ))*/}
                                {/*                            }*/}
                                {/*                            <TableCell></TableCell>*/}
                                {/*                        </TableRow>*/}
                                {/*                    )*/}

                                {/*                })*/}
                                {/*            }*/}
                                {/*        </TableBody>*/}
                                {/*      </Table>*/}
                                {/*</TableContainer>*/}
                          </Card>
                          )


                      })
                  }
                </Grid>

                <Grid item md={3} xs={12} >
                    <Card variant='outlined'>
                          <POCountryColorwayNavigation purchaseOrderId={purchaseOrderId} navigationData={navigationData} />
                    </Card>
                </Grid>
              </Grid>
            }
          {editModalProps?.[editModalOpenKey] &&
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
                            orderPackType={''}
                            setUpdated={() => {}}
                            saveURL={''}
                        />
                  }
                </RitzModal>

          }
    </>
  )
}

export default POCountryColorwayItemMaterials;
