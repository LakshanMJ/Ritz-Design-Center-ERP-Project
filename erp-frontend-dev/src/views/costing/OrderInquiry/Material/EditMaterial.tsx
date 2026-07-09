import { Box, Button, TextField, Radio, InputLabel, Alert, Accordion, AccordionSummary, AccordionDetails, Card } from '@mui/material';
import React, { useEffect, useRef, useState } from 'react';
import { TabContext } from '@mui/lab';
import * as restUrls from "@/helpers/constants/RestUrls";
import CurrentMaterialPlacements from './CurrentMaterialPlacements';
import api from '@/services/api';
import DefaultLoader from '@/components/DefaultLoader';
import SaveSpinner from '@/components/SaveSpinner';
import { ColumnDef } from '@tanstack/react-table';
import RitzTable from '@/components/Ritz/RitzTable';
import RitzSearchableSelection from '@/components/Ritz/RitzSearchableSelection';
import {FABRIC_MATERIAL} from "@/helpers/costings/materials/MaterialFieldHelper";
import {getMaterialMetaDataURL} from "@/helpers/constants/RestUrls";
import FormErrorMessage from '@/components/FormErrorMessage';
import { RitzTabPanel, RitzTabs } from '@/components/Ritz/RitzTabs';
import { ORDER_MATERIAL_PACK_TYPE, VALIDATION_ERROR_CODE } from '@/helpers/constants/Constants';
import { toast } from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';
import CustomerBrandMaterialDetail from "@/views/settings/userdefine_material/MaterialDetail";
import Typography from "@mui/material/Typography";
import RitzMultiSelectCheckBox from "@/components/Ritz/RitzMultiSelectCheckBox";
import {Simulate} from "react-dom/test-utils";
import change = Simulate.change;
import RitzCheckBoxHorizontal from '@/components/Ritz/RitzCheckBoxHorizontal';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import PackDetails from '../../PackDetails';
import PackDataFilter from '../../PackDataFilter';


const EditMaterial = ({ drawerData, materialHelper, setUpdated, groupedData=false, orderPackType, filteringIdsSet }: any) => {
    const SELECT_MATERIAL_TAB = 'select-material';
    const CREATE_MATERIAL_TAB = 'create-material';
    const packagingKey = 'pack';
    const [materialData, setMaterialData] = useState<any>({});
    const [otherPlacements, setOtherPlacements] = useState([]);
    const [materialDetails, setMaterialDetails] = useState<any>([]);
    const [selectedPlacements, setSelectedPlacements] = useState<any>([]);
    const [dropDownOptions, setDropDownOptions] = useState<any>({});
    const [selectedTab, setSelectedTab] = useState(SELECT_MATERIAL_TAB);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingPackItems, setIsLoadingPackItems] = useState(false);
    const [errors, setErrors] = useState<any>({});
    const [formErrors, setFormErrors] = useState<any>([]);
    const [orderInquiry, setOrderInquiry] = useState<any>({});
    const headers = materialHelper?.getFields().filter((headerRow: { name: string; attribute_type: string }) => headerRow.name !== 'edit' && headerRow?.name !== '' && headerRow?.name !== 'placement' && headerRow?.attribute_type != 'donotdisplay');
    const [tableCols, setTableCols] = useState<ColumnDef<any>[]>([]);
    const tableRef = useRef(null);
     const handleChange = (event:any, valueField: string, fieldType:any) => {
        if(fieldType=='dropdown'){
            const value = event;
            setMaterialData((prevMaterialData:any) => ({
              ...prevMaterialData,
              [valueField]: value
            }));
        }
        else {
            const { value } = event.target;
            setMaterialData({ ...materialData, [valueField]: value });
        }
      };
    useEffect(() => {
        setMaterialData({ ...drawerData });
        if(filteringIdsSet){
            updateFilteringMainState();
        }
    }, [drawerData]);

    useEffect(() => {
        fetchData();
    }, []);


    const findCheckedPlacementIds = (placementData: any) => {
        const colorwayId = materialHelper.getColorwayId();
        const orderItemId = materialHelper?.getOrderItemId();
        let selectedPlacementData;
        if (orderItemId != undefined && colorwayId != undefined) {
            selectedPlacementData = placementData.filter((selectedPlacement: any) => {
                if (selectedPlacement?.['colorway_id'] == colorwayId && selectedPlacement?.['order_item_id'] == orderItemId) {
                    return true;
                } else {
                    return false;
                }
            });
        } else {
            selectedPlacementData = placementData.filter((selectedPlacement: any) => {
                if (selectedPlacement?.['colorway_id'] == colorwayId) {
                    return true;
                } else {
                    return false;
                }
            });

        }
        const selectedPlacementIds = selectedPlacementData.map((selectedPlacementRow: any) => selectedPlacementRow.id);
        setSelectedPlacements([...selectedPlacementIds]);
    }

    const fetchData = () => {
        setIsLoadingPackItems(true)
        const requests = [
            api.get(materialHelper?.getSelectMaterialURL()),
        ]
        requests.push(api.get(materialHelper.getObjectListUrl()));
        requests.push(api.get(restUrls.getOrderInquiryDetailsUpdateURL(parseInt(materialHelper.orderId))),);

        Promise.all(requests).then(resp => {
            const respData = resp.map(r => r.data);
            const [material, placement, inquiryDetails] = respData;
            setOrderInquiry(inquiryDetails)
            setMaterialDetails(material?.data || []);
            makeTable();
            setOtherPlacements(placement);
            findCheckedPlacementIds(placement);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false);
            setIsLoadingPackItems(false)
        });
    }

    const getSelectedMaterial = (): any => {
        // if on create-material tab and there are material details
        if (selectedTab === SELECT_MATERIAL_TAB && materialDetails?.length > 0) {
            const selected = tableRef?.current?.getSelectedRows();
            if (selected) { // if there is a selection
                const selectedIndex = Object.keys(selected)[0];
                const selectedMaterial = materialDetails[selectedIndex];
                return {
                    customer_brand_material_id: selectedMaterial?.customer_brand_material_id,
                    reference_code: selectedMaterial?.reference_code
                }
            }                                                      
        }
        return;
    }

    const saveForm = () => {
        setIsSaving(true);
        setErrors({});

        let postData = {
            ...materialData,
            material_type: materialHelper.getMaterialType(),
            selected_placements: [...selectedPlacements]
        };// Has to be for api
        postData['select_type'] = CREATE_MATERIAL_TAB;

        if (selectedTab == SELECT_MATERIAL_TAB) {
            const selectedMaterial = getSelectedMaterial();

            postData = {
                select_type: SELECT_MATERIAL_TAB,
                material_type: materialHelper.getMaterialType(),
                ...materialData,
                ...selectedMaterial,
                selected_placements: [...selectedPlacements]
            };
        }
        const saveURL = materialHelper.getAssignMaterialSaveUrl();
        api.post(saveURL, [postData]).then(resp => {
            const responseData = resp?.data || {};
            setUpdated(true);

        }).catch(error => {

            if (VALIDATION_ERROR_CODE === error?.response?.status && error?.response?.data?.errors) {
                setErrors(error.response.data.errors?.['field_errors'] || {});
                setFormErrors(error.response.data.errors?.['form_errors'] || []);
            }
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsSaving(false);
        });
    }

    const handleChangeTabs = (event: string) => {
        setSelectedTab(event === '1' ? SELECT_MATERIAL_TAB : '2');
    };
    //pack Items-filter part
    const [uniqueOrderItems, setUniqueOrderItems] = useState<any>([]);
    const [filteringMainState, setMainState] = useState({
        country: [],
        colorway: [],
        colorway_category: [],
        size: [],
        item: [],
    })
    useEffect(() => {
        const filterPacks = () => {
            return otherPlacements.filter((pack: { country_id: any; colorway_id: any; colorway_category_id: any; size_id: any; order_item_id: any; }) =>
                (!filteringMainState?.country?.length || filteringMainState?.country.some(({ country }: { country: any }) => pack.country_id === country)) &&
                (!filteringMainState?.colorway?.length || filteringMainState?.colorway.some(({ colorway }: { colorway: any }) => pack.colorway_id === colorway)) &&
                (!filteringMainState?.colorway_category?.length || filteringMainState?.colorway_category.some(({ colorway_category }) => pack.colorway_category_id === colorway_category)) &&
                (!filteringMainState?.size?.length || filteringMainState?.size.some(({ size }: { size: any }) => pack.size_id === size)) &&
                (orderPackType === 'packitem'? (!filteringMainState.item?.length || filteringMainState.item.some(({ item }: { item: any }) => pack.order_item_id === item)): true )
            );
        };

        if (filteringMainState?.country.length !== 0 || filteringMainState?.colorway.length !== 0 || filteringMainState?.colorway_category?.length !== 0 || filteringMainState?.size?.length !== 0 || filteringMainState?.item.length !== 0) {
            const filteredPacks = filterPacks();
            const selectedPackItemIds = filteredPacks.map((pack: { id: any; }) => pack.id);
            setSelectedPlacements(selectedPackItemIds);
        }
    }, [filteringMainState, otherPlacements]);

    //end filter part

    // Loads all the dropdown data
    useEffect(() => {
        const materialDropDownOptions = materialHelper?.getDropDownOptions();
        const dropDownOptionsCopy = { ...dropDownOptions };

        for (let materialDropDownOption of materialDropDownOptions) {
            if (materialDropDownOption?.url) {
                api.get(materialDropDownOption.url).then(resp => {
                    const respData = resp?.data || [];
                    dropDownOptionsCopy[materialDropDownOption?.fieldName] = [...respData];
                    setDropDownOptions({ ...dropDownOptionsCopy });
                }).catch(error => {
                    toast.error(getDefaultError(error?.response?.status));
                });
            } else {
                dropDownOptionsCopy[materialDropDownOption?.fieldName] = [...materialDropDownOption?.dropDownOptions];
                setDropDownOptions({ ...dropDownOptionsCopy });
            }
        }
    }, []);

    const makeTable = () => {
        const colDef: ColumnDef<any>[] = [
            {
                accessorKey: 'customer_brand_material_id',
                header: '',
                enableSorting: false,
                enableColumnFilter: false,
                enableGlobalFilter: false,
                cell: (props: any) => (
                    <Radio
                        checked={props.row.getIsSelected()}
                        onChange={props.row.getToggleSelectedHandler()}
                        sx={{ p: 0 }}
                    />
                ),
                meta: {
                    align: 'center',
                    width: 35
                }
            }
        ];

        headers.map((header: any) => {
            if (!header.isAction) {
                colDef.push({
                    accessorKey: header.name,
                    header: header.label
                });
            }
        });

        setTableCols(colDef);
    }

    const handleSelectedIdsChange = (newSelectedIds:any) => {
        setSelectedPlacements(newSelectedIds);
    };

    const handleUpdateMainState = (newState: any) => {
        setMainState(newState);
    };
    const handleUniqueOrderItemsUpdate = (newUniqueOrderItems:any) => {
        setUniqueOrderItems(newUniqueOrderItems);
    };
    const updateFilteringMainState = () => {
        if (filteringIdsSet) {
            setMainState({
                country: filteringIdsSet?.country || [],
                colorway_category: [],
                size: filteringIdsSet?.size || [],
                item: filteringIdsSet?.selectedItem ? [{ item: filteringIdsSet?.selectedItem }] : [],
                colorway: filteringIdsSet?.colorway || [],
            });
        }
      };

    return (
            <>
                {isLoading ? <DefaultLoader /> :
                <Box sx={{ width: '100%', typography: 'body1' }}>
                    <TabContext value={selectedTab === SELECT_MATERIAL_TAB ? '1' : '2'}>
                        <RitzTabs tabs={['Select Material', 'Create Material']} activeTab={selectedTab === SELECT_MATERIAL_TAB ? '1' : '2'} emitChange={handleChangeTabs} />

                        <RitzTabPanel value={'1'}>
                        <Box marginBottom={6} padding={0}>
                                <InputLabel sx={{ mb: 1 }}>{orderPackType == packagingKey || orderPackType == ORDER_MATERIAL_PACK_TYPE ? 'Packaging Item Name' : 'Placement'}</InputLabel>
                                <TextField
                                    id={'placement'}
                                    type={'text'}
                                    value={materialData.placement || ''}
                                    name={'placement'}
                                    required
                                    style={{ width: '60%' }}
                                    InputProps={{ readOnly: true }}
                                />
                            </Box>
                            

                            { materialDetails.length == 0 &&
                                <Alert severity='info' icon={false} sx={{ mb: 2, mt: 5 }}>
                                    {"No materials are linked to this order. Please create a new material."}</Alert>
                            }
                            { materialDetails.length > 0 && (
                                <Box sx={{ mt: 2 }}>
                                    {/* <InputLabel sx={{ mb: 1, mt: 5 }}>Select Material from the Table Below</InputLabel> */}
                                    <Typography sx={{marginTop: '15px'}}>Select Material</Typography>
                                    <RitzTable
                                        data={materialDetails}
                                        columns={tableCols}
                                        tableRef={tableRef}
                                        rowSelect
                                        columnSearch
                                        columnFilterMode='search'
                                    />
                                </Box>
                            )}
                            {materialDetails.length !== 0 &&
                                <>
                                    <Typography sx={{ marginTop: '15px' }}>Select Order Pack Item</Typography>
                                    <PackDataFilter
                                        orderInquiryDetails={orderInquiry}
                                        itemId={materialHelper.itemId}
                                        onUpdateMainState={handleUpdateMainState}
                                        selectedFilterData={filteringMainState}
                                        onUpdateUniqueOrderItems={handleUniqueOrderItemsUpdate}
                                    />
                                    <Box sx={{ mt: 2 }}>
                                        <PackDetails
                                            packItemData={otherPlacements}
                                            selectedIds={selectedPlacements}
                                            onSelectedIdsChange={handleSelectedIdsChange}
                                            isLoading={isLoadingPackItems}
                                        />
                                    </Box>
                                </>
                            }
                            

                        </RitzTabPanel>

                        <RitzTabPanel value={'2'}>
                            { formErrors.length > 0 && <FormErrorMessage type={'alert'} message={formErrors} />}
                            {materialHelper?.getFields()?.map((field: any, index: any) => (

                                <React.Fragment key={index}>
                                    {field.attribute_type === 'dropdown' && (
                                        <Box marginBottom={5}>
                                            <>
                                                <RitzSearchableSelection
                                                labelText={field?.[materialHelper.headerLabelField]}
                                                options={dropDownOptions?.[field?.[materialHelper?.valueField]]}
                                                id={field?.[materialHelper?.valueField]}
                                                name={field?.[materialHelper?.valueField]}
                                                optionValue={field?.optionValueField || 'id'}
                                                optionText={field?.optionDisplayField || 'name'}
                                                selectedValue={materialData?.[field?.[materialHelper.valueField]] || ''}
                                                handleOnChange={(e: any) => handleChange(e, field?.[materialHelper.valueField], field?.attribute_type )}
                                                isRequired={true}
                                                />

                                             <FormErrorMessage message={errors?.[field?.[materialHelper.valueField]]} />
                                            </>

                                        </Box>
                                    )}

                                    { (field.attribute_type === 'text' || field.attribute_type === 'character') &&

                                        <Box marginBottom={5}>
                                            <>
                                            <InputLabel sx={{ mb: 1 }}>{field?.[materialHelper.headerLabelField]}</InputLabel>
                                                <TextField
                                                    id={field?.[materialHelper.headerLabelField]}
                                                    type={'text'}
                                                    value={materialData?.[field?.[materialHelper.valueField]] || ''}//need to get api TODO
                                                    name={field?.[materialHelper.valueField]}
                                                    required
                                                    onChange={e => handleChange(e, field?.[materialHelper.valueField], field?.attribute_type)}
                                                    style={{ width: '60%' }}
                                                    InputProps={{ readOnly: field?.[materialHelper.readOnlyKey] || false }}
                                                />
                                                <FormErrorMessage message={errors?.[field?.[materialHelper.valueField]]} />
                                            </>
                                        </Box>
                                    }
                                    {
                                        (field.attribute_type == 'number' || field.attribute_type === 'integer' || field.attribute_type === 'decimal') && (

                                            <Box marginBottom={5}>
                                                <InputLabel sx={{ mb: 1 }}>{field?.[materialHelper?.headerLabelField]}</InputLabel>
                                                <TextField
                                                    id={field?.[materialHelper.valueField]}
                                                    type={'text'}
                                                    value={materialData?.[field?.[materialHelper.valueField]] || ''}//need to get api TODO
                                                    name={field?.[materialHelper.valueField]}
                                                    required
                                                    onChange={e => handleChange(e, field?.[materialHelper.valueField], field.attribute_type)}
                                                    style={{ width: '60%' }}
                                                    InputProps={{ readOnly: field?.readOnly || false }}
                                                />
                                                  <FormErrorMessage message={errors?.[field?.[materialHelper.valueField]]} />
                                            </Box>
                                        )
                                    }
                                    {
                                        (field.attribute_type == 'attachement') && (
                                            <Box marginBottom={5}>
                                                <InputLabel sx={{ mb: 1 }}>{field?.[materialHelper?.headerLabelField]}</InputLabel>
                                                {/* <RitzMultipleFileUploader
                                                    displayType={LISTVIEW}
                                                    selectedFilesParent={ratiosDetails?.attachments || []}
                                                    handleFileChangeParent={(selectedFiles: any) => handleFileChange(selectedFiles)}
                                                    filelocation={fileAttacehemtLocation}
                                                    isReadOnly={currentState.value == 'complete' ? true : false}
                                                /> */}    
                                                <FormErrorMessage message={errors?.[field?.[materialHelper.valueField]]} />
                                            </Box>
                                        )
                                    }                                
                                </React.Fragment>
                            ))}
                            <Box marginBottom={5}>
                                <InputLabel sx={{ mb: 1 }}>{orderPackType === packagingKey || orderPackType === ORDER_MATERIAL_PACK_TYPE ? 'Select Other Material Assign Packs' : 'Select Other placements Assign Packs'}</InputLabel>

                                <Box sx={{ mt: 1 }}>
                                    <PackDataFilter
                                        orderInquiryDetails={orderInquiry}
                                        itemId={materialHelper.itemId}
                                        onUpdateMainState={handleUpdateMainState}
                                        selectedFilterData={filteringMainState}
                                        onUpdateUniqueOrderItems={handleUniqueOrderItemsUpdate}
                                    />
                                    <Box sx={{ mt: 2 }}>
                                        <PackDetails
                                            packItemData={otherPlacements}
                                            selectedIds={selectedPlacements}
                                            onSelectedIdsChange={handleSelectedIdsChange}
                                            isLoading={isLoadingPackItems} />
                                    </Box>
                                </Box>
                            </Box> 

                        </RitzTabPanel>
                    </TabContext>

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                        <Button onClick={saveForm} variant="contained" disabled={isSaving}>
                            {isSaving && <SaveSpinner />}Save
                        </Button>
                    </Box>
                </Box>
                }
            </>
    )
}

export default EditMaterial;
