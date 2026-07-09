import RitzSelection from '@/components/Ritz/RitzSelection';
import { Accordion, AccordionDetails, AccordionSummary, Alert, Autocomplete, Box, Button, Card, Checkbox, InputLabel, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import React, { useEffect, useRef, useState } from 'react'
import * as restUrls from '../../helpers/constants/RestUrls';
import * as costingRestUrls from '../../helpers/constants/rest_urls/CostingUrls';
import * as yup from "yup";
import api from '@/services/api';
import DefaultLoader from '@/components/DefaultLoader';
import SaveSpinner from '@/components/SaveSpinner';
import { ColumnDef } from '@tanstack/react-table';
import RitzTable from '@/components/Ritz/RitzTable';
import { toast } from 'react-hot-toast';
import { DEFAULT_SUCCESS } from '@/helpers/constants/Constants';
import FormErrorMessage from '@/components/FormErrorMessage';
import { getDefaultError } from '@/helpers/Utilities';
import CreatableSelect from 'react-select/creatable';
import RitzInput from '@/components/Ritz/RitzInput';
import RitzMultiSelectCheckBox from '@/components/Ritz/RitzMultiSelectCheckBox';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import RitzCheckBoxHorizontal from '@/components/Ritz/RitzCheckBoxHorizontal';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import PackDetails from './PackDetails';
import PackDataFilter from './PackDataFilter';


const AddPlacement = ({ orderId, type, itemId, placementOther, setUpdated, packItemId, versionId, itemItemId, materialType='material', orderSizeGroupId, orderCountryId, orderColorwayId, materialTypeId, openAssignMaterial, filteringIdsSet }: any) => {
    const [placement, setPlacement] = useState<any>({
        pattern_type: type,
        order_item_id: itemId,
        item_id: itemItemId,
        other_placement_name: "",
        other_placement_id: null,
        material_type: materialTypeId,
        estimated_consumption_ratio:null,
        estimated_consumption_ratio_units:'',
        material_type_display_name:''
    });
    const [orderInquiry, setOrderInquiry] = useState<any>({});
    const [otherPlacement, setOtherPlacement] = useState<any>({});
    const [compositions, setCompositions] = useState([]);
    const [uniquePlacements, setUniqueplacements] = useState<any>([]);
    const [formValidationErrors, setFormValidationErrors] = useState<any>({});
    const [packDetails, setPackDetails] = useState<any>([]);
    const [displayPackDetails, setDisplayPackDetails] = useState<any>([]);
    const [selectedPacks, setSelectedPacks] = useState<any>([]);
    const [currentPackList, setCurrentPackList] = useState<number[]>([]);
    const [selectedPackItemIds, setSelectedPackItemIds] = useState([1,2]);
    const [uniqueOrderItems, setUniqueOrderItems] = useState<any>([]);
    const NewPlacement = {
        other_placement_id: placement.other_placement_id,
        other_placement_name: placement.other_placement_name,
        material_type: placement.material_type,
        estimated_consumption_ratio: placement.estimated_consumption_ratio,
        estimated_consumption_ratio_units:placement.estimated_consumption_ratio_units,
        pack_item_ids: selectedPackItemIds?.map((order_colorway: any) => (order_colorway)),
        material_type_display_name: placement.material_type_display_name,
    };
    const [filteringMainState, setMainState] = useState({ country: [], colorway: [], colorway_category: [], size: [], item: [] })
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingPackItems, setIsLoadingPackItems] = useState(false);
    const placementFieldName = 'other_placement_name';
    const placementTypeFieldName = 'material_type';
    const estimatedConsumptionFieldName = 'estimated_consumption_ratio';
    const estimatedConsumptionUnitFieldName = 'estimated_consumption_ratio_units';
    const resetPlacementStates = () => {
        setUniqueplacements([])
        setPlacement({
            ...placement,
          //  material_type: '',
            estimated_consumption_ratio: null,
            estimated_consumption_ratio_units: '',
            other_placement_id: null,
            other_placement_name: ''
        });
    }
    const handleSelectedIdsChange = (newSelectedIds:any) => {
        setSelectedPackItemIds(newSelectedIds);
    };

    const getUniqueOtherlacementList = () => {
        const uniquePlacementList = costingRestUrls.uniqueOrderItemPlacementsURL(orderId, materialType, placement.material_type, placement.item_id, versionId);
        api.get(restUrls.apiBaseURL() + uniquePlacementList)
            .then(resp => {
                const resdata = resp?.data || {};
                const mappedPlacements = resdata.map((otherPlacement: { name: any; id: any; }) => ({
                    label: otherPlacement.name,
                    value: otherPlacement.id,
                  }));
                setUniqueplacements([...mappedPlacements]);
            })
            .catch(error => {
                toast.error(getDefaultError(error?.response?.status));
            });


    };
    const getPackItemsRelatedToPlacement = () => {
        const uniquePackItemList = costingRestUrls.updateDetailPlacementURL(placement.other_placement_id, versionId, placement.item_id);
        api.get(restUrls.apiBaseURL() + uniquePackItemList)
            .then(resp => {
                const resdata = resp?.data || {};
               setSelectedPacks([...resdata.pack_item_placements])
                setPlacement((prevPlacement: any) => ({
                    ...prevPlacement,
                    estimated_consumption_ratio: resdata.estimated_consumption_ratio,
                    //estimated_consumption_ratio_units: resdata.estimated_consumption_ratio_units
                }));
            })
            .catch(error => {
                toast.error(getDefaultError(error?.response?.status));
            });
    };

    const getPackItemsRelatedToOrderItem = () => {
        api.get(restUrls.getNavigationOrderMaterialURL(orderId, versionId))
            .then(resp => {
                const resdata = resp?.data || {};
                const filteredItems = (resdata?.order_pack_items || []).filter((item: { item_item_id: any; }) => item.item_item_id === placement.item_id);
                setDisplayPackDetails([...filteredItems]);
                setPackDetails([...filteredItems]);
            })
            .catch(error => {
                toast.error(getDefaultError(error?.response?.status));
            }).finally(() => setIsLoadingPackItems(false));

    };

    const getGroupPackItems = () => {
        api.get(costingRestUrls.getSummaryPackDetailsURL(orderId, versionId, orderCountryId, orderColorwayId, orderSizeGroupId))
            .then(resp => {
                const resdata = resp?.data || {};
                const selectedItems = uniqueOrderItems.flatMap((item: { id: { toString: () => string | number; }; }) => resdata.order_items[item.id.toString()] || []);
                setCurrentPackList(selectedItems);
            })
            .catch(error => {
                toast.error(getDefaultError(error?.response?.status));
            });
    };

    const getEstimatedConsumptionRelatedToMaterialType = () => {
        const index = compositions.findIndex(composition => composition.id === placement.material_type);
        const updatedPlacement = { ...placement, estimated_consumption_ratio_units: compositions[index]?.estimated_consumption_ratio_units, material_type_display_name: compositions[index]?.name };
        setPlacement(updatedPlacement);

    };

    const handleChangeEstimatedConsumption = (event: any) => {
        const { name, value } = event.target;
        setPlacement({ ...placement, [name]: value, });
    };

    //handleonChange for item
    const handleChangeItem = (event: any) => {
        setPlacement({ ...placement, [event?.target?.name]: event?.target?.value, });
    };

    //handleonChange for type
    const handleChangeCompositionType = (event: any) => {
        setPlacement({ ...placement, [event?.target?.name]: event?.target?.value, });
    };

    //handleonChange for placement
    const handlePlacementChange = (newValue:any) => {

        const updatedPlacement = { ...placement, other_placement_name: newValue.label };

        if (typeof newValue?.value === 'string') {
          if (placement.other_placement_id !== null && placementOther === 0) {
            updatedPlacement.other_placement_id = null;
          }
        } else {
            updatedPlacement.other_placement_id = newValue.value;
        }
      
        setPlacement(updatedPlacement);
      };

    //Ending

    const handleSaveNewPlacement = () => {
        const saveApi = costingRestUrls.createPlacementURL(orderId, versionId, placement.item_id);
        api.post(saveApi, NewPlacement).then(resp => {
            // setUpdated(true);
            openAssignMaterial(resp?.data, NewPlacement);
            toast.success(DEFAULT_SUCCESS);
        }).catch(error => {
            setFormValidationErrors(error?.response?.data)
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsSaving(false);
        });
    }

    const fetchData = () => {
        const requests = [
            api.get(restUrls.getOrderInquiryDetailsUpdateURL(orderId)),
            api.get(restUrls.fetchMaterialTypeURL("fabric,sewing_trim")),
        ]
        if (placementOther != 0 && placementOther) {
            requests.push(api.get(costingRestUrls.updateDetailPlacementURL(placementOther, versionId, placement.item_id)))
        }
        Promise.all(requests).then(resp => {
            const respData = resp.map((r: any) => r.data);
            const [orderInquiry, compositions, placement] = respData;
            setOrderInquiry(orderInquiry);
            setCompositions(compositions?.material_types);
            setOtherPlacement(placement);
            if (placementOther != 0 && placementOther) {
                setMainState({
                    country: placement.countries,
                    colorway: placement.colorways,
                    colorway_category: placement.colorway_categories,
                    size: placement.sizes,
                    item: placement.items,
                });        
            }
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoading(false));
    }
    const handleAddCurrentPacks = () => {
         setSelectedPackItemIds([...selectedPackItemIds,  ...currentPackList]);
    };
    //pack Items-filter part
    const handleUpdateMainState = (newState: any) => {
        setMainState(newState);
    };
    const handleUniqueOrderItemsUpdate = (newUniqueOrderItems:any) => {
        setUniqueOrderItems(newUniqueOrderItems);
    };

    const updateFilteringMainState = () => {
        setMainState({
            country: filteringIdsSet?.country || [],
            colorway_category: [],
            size: filteringIdsSet?.size || [],
            item: filteringIdsSet?.selectedItem ? [{ item: filteringIdsSet?.selectedItem }] : [],
            colorway: filteringIdsSet?.colorway || [],

        });
      };
    //need to reviewed this UseEffect 
    useEffect(() => {
        if(filteringMainState){
        const filterPacks = () => {
            return packDetails.filter((pack: { country_id: any; colorway_id: any; colorway_category_id: any; size_id: any; item_id: any; }) =>
                (!filteringMainState.country?.length || filteringMainState.country.some(({ country }: { country: any }) => pack.country_id === country)) &&
                (!filteringMainState.colorway?.length || filteringMainState.colorway.some(({ colorway }: { colorway: any }) => pack.colorway_id === colorway)) &&
                (!filteringMainState.colorway_category?.length ||filteringMainState.colorway_category.some(({ colorway_category }) => pack.colorway_category_id === colorway_category)) &&
                (!filteringMainState.size?.length || filteringMainState.size.some(({ size }: { size: any }) => pack.size_id === size)) &&
                (!filteringMainState.item?.length || filteringMainState.item.some(({ item }: { item: any }) => pack.item_id === item))
            );
        };
       
        if (filteringMainState?.country.length !== 0 || filteringMainState?.colorway.length !== 0 || filteringMainState?.colorway_category?.length !== 0 || filteringMainState?.size?.length !== 0 || filteringMainState?.item.length !== 0) {
            const filteredPacks = filterPacks();
            const selectedPackItemIds = filteredPacks.map((pack: { id: any; }) => pack.id);
            setSelectedPackItemIds(selectedPackItemIds);
        } else {
            setSelectedPackItemIds([packItemId]);
        }
    }
    }, [filteringMainState, packDetails]);

    useEffect(() => {
        if (placement.material_type) {
            getUniqueOtherlacementList();
        }
    }, [placement.material_type]);

    useEffect(() => {
        if (placement.other_placement_id && placementOther == 0) {
            getPackItemsRelatedToPlacement();
        }
    }, [placement.other_placement_id]);
   
    useEffect(() => {
        if (placement.item_id) {
            setIsLoadingPackItems(true)
            resetPlacementStates()
            getPackItemsRelatedToOrderItem();
        }
    }, [placement.item_id]);

    useEffect(() => {
       
        if (otherPlacement?.pack_item_placements && placementOther > 0) {
            setSelectedPackItemIds([...otherPlacement.pack_item_placements]);
            setPlacement((prevPlacement: any) => ({
                ...prevPlacement,
                material_type: otherPlacement.type,
                other_placement_name: otherPlacement.placement_name,
                other_placement_id: otherPlacement.placement_id,
                estimated_consumption_ratio: otherPlacement.estimated_consumption_ratio,
                estimated_consumption_ratio_units: otherPlacement.estimated_consumption_ratio_units

            }));
        }
    }, [otherPlacement]);

    useEffect(() => {
        if (orderSizeGroupId && placement.item_id) {
            getGroupPackItems();
        }
    }, [packDetails]);

    useEffect(() => {
        if (orderId || placementOther) {
            fetchData();
            setSelectedPackItemIds([parseInt(packItemId)])
            if(filteringIdsSet){
                updateFilteringMainState();
            }
        }
      

    }, [orderId, placementOther]);

    useEffect(() => {
        if (placement?.material_type) {
            getEstimatedConsumptionRelatedToMaterialType()
        }

    }, [placement?.material_type, compositions]);

    return (
        <>
            {isLoading ? <DefaultLoader/> : <>
                <Box marginBottom={3}>
                    <Alert severity='info' icon={false}>
                        If a new placement is added to a pack/ pack item that is marked as complete, it will be marked incomplete.
                    </Alert>
                </Box>
                <Box marginBottom={3}>
                    <InputLabel sx={{ mb: 1 }}>Item:</InputLabel>
                    <RitzSelection
                        id={'item_id'}
                        name={'item_id'}
                        optionValue={'id'}
                        optionText={'name'}
                        selectedValue={placement?.item_id || ''}
                        isRequired={true}
                        options={orderInquiry.unique_items}
                        handleOnChange={(event: any) => handleChangeItem(event)}
                        isReadOnly={itemId !== null ? true : false}

                    />
                </Box>
                <Box marginBottom={3}>
                    <InputLabel sx={{ mb: 1 }}>Types:</InputLabel>
                    <RitzSelection
                        id={'material_type'}
                        name={'material_type'}
                        optionValue={'id'}
                        optionText={'name'}
                        selectedValue={placement?.material_type || ''}
                        isRequired={true}
                        options={compositions}
                        handleOnChange={handleChangeCompositionType}
                        isReadOnly={materialTypeId !== undefined ? true : false}
                    />
                    <FormErrorMessage message={formValidationErrors?.[placementTypeFieldName]} />
                </Box>
                <Box marginBottom={3}>
                        <InputLabel sx={{ mb: 1 }}>Placement:</InputLabel>
                        <CreatableSelect
                            
                            options={uniquePlacements}
                            value={uniquePlacements.find((opt:any) => opt.label === placement.other_placement_name)}
                            onChange={handlePlacementChange}
                            styles={{
                                option: (provided, state) => ({
                                  ...provided,
                                  backgroundColor: state.isSelected ? '#E4F1FF' : 'white',
                                  color:'black',
                                  ':hover': {
                                    backgroundColor: '#F0F0F0',        
                                  },
                                }),
                                control: (provided) => ({
                                    ...provided,
                                    height: '50px',
                                  }),
                              }}
                        />
                        <Typography
                        sx={{
                            color:'#146C94',
                            fontSize: 'small',
                            mt: 0.5
                        }}
                    >
                        If placement does not exist in the dropdown, type the placement name and click create
                    </Typography>
                        <FormErrorMessage message={formValidationErrors?.[placementFieldName]} />
                </Box>
                <Box style={{ display: 'flex', flexDirection: 'row' }}>
                <Box  marginBottom={3} marginRight={5}  width= '50%'>
                    <InputLabel sx={{ mb: 1 }}>Estimated Consumption:</InputLabel>
                    <RitzInput
                        name={"estimated_consumption_ratio"}
                        id={"estimated_consumption_ratio"}
                        selectedValue={placement?.estimated_consumption_ratio || ''}
                        isMulti={true}
                        multiline
                        row={true}
                        isRequired={true}
                        handleOnChange={handleChangeEstimatedConsumption}
                        inputType='number'
                    />
                   <FormErrorMessage message={formValidationErrors?.[estimatedConsumptionFieldName]} /> 
                </Box>

                <Box marginBottom={3} width= '50%'>
                    <InputLabel sx={{ mb: 1 }}>Estimated Consumption Ratio Units:</InputLabel>
                    <RitzInput
                        name={"estimated_consumption_ratio_units"}
                        id={"estimated_consumption_ratio_units"}
                        selectedValue={placement?.estimated_consumption_ratio_units || ''}
                        isMulti={true}
                        multiline
                        row={true}
                        isRequired={true}
                        isReadOnly={true}
                        handleOnChange={handleChangeEstimatedConsumption}
                    />
                    <FormErrorMessage message={formValidationErrors?.[estimatedConsumptionUnitFieldName]} /> 
                </Box>
                </Box> 
                <Box marginBottom={3}>
                    <InputLabel sx={{ mb: 1 }}>Select Order Packs From The Table Below:</InputLabel>
                    <PackDataFilter
                        orderInquiryDetails={orderInquiry}
                        itemId={itemItemId || placement.item_id}
                        onUpdateMainState={handleUpdateMainState}
                        selectedFilterData={filteringMainState}
                        onUpdateUniqueOrderItems={handleUniqueOrderItemsUpdate}
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Typography sx={{ color: 'red', cursor: 'pointer' }} onClick={() => handleAddCurrentPacks()}>
                            <Button variant='outlined' sx={{ mb: 1 }}>Add Current Packs</Button>
                        </Typography>
                    </Box>
                </Box>
                <Box marginBottom={3} >
                    <PackDetails
                        packItemData={displayPackDetails}
                        selectedIds={selectedPackItemIds}
                        onSelectedIdsChange={handleSelectedIdsChange}
                        isLoading={isLoadingPackItems} />
                </Box>
                <Box sx={{ mt: 5, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button onClick={() => handleSaveNewPlacement()} variant="contained" disabled={isSaving}>
                        {isSaving && <SaveSpinner />}Save
                    </Button>
                </Box>
            </>}
        </>
    )
}

export default AddPlacement;
