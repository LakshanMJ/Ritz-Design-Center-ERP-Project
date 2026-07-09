import RitzSelection from '@/components/Ritz/RitzSelection';
import { Accordion, AccordionDetails, AccordionSummary, Alert, Autocomplete, Box, Button, Card, Checkbox, InputLabel, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import React, { useEffect, useRef, useState } from 'react';
import * as restUrls from '../../helpers/constants/RestUrls';
import * as costingRestUrls from '../../helpers/constants/rest_urls/CostingUrls';
import * as yup from "yup";
import api from '@/services/api';
import DefaultLoader from '@/components/DefaultLoader';
import SaveSpinner from '@/components/SaveSpinner';
import RitzTable from '@/components/Ritz/RitzTable';
import { ColumnDef } from '@tanstack/react-table';
import { toast } from 'react-hot-toast';
import { DEFAULT_SUCCESS, VALIDATION_ERROR_CODE } from '@/helpers/constants/Constants';
import FormErrorMessage from '@/components/FormErrorMessage';
import { getDefaultError } from '@/helpers/Utilities';
import CreatableSelect from 'react-select/creatable';
import RitzInput from '@/components/Ritz/RitzInput';
import RitzMultiSelectCheckBox from '@/components/Ritz/RitzMultiSelectCheckBox';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import PackDetails from './PackDetails';
import RitzCheckBoxHorizontal from '@/components/Ritz/RitzCheckBoxHorizontal';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FilterAltIcon from '@mui/icons-material/FilterAlt'
import PackDataFilter from './PackDataFilter';

const AddPackagingPlacement = ({ orderId, type, placementOther, setUpdated, versionId, materialType='packaging', packId, orderSizeGroupId, orderCountryId, orderColorwayId, materialTypeId, openAssignMaterial, filteringIdsSet }: any) => {
    const [orderInquiry, setOrderInquiry] = useState<any>({});
    const [otherPlacement, setOtherPlacement] = useState<any>({});
    const [packDetails, setPackDetails] = useState<any>([]);
    const [selectedPacks, setSelectedPacks] = useState<number[]>([]);
    const [currentPackList, setCurrentPackList] = useState<number[]>([]);
    const [displayPackDetails, setDisplayPackDetails] = useState<any>([]);
    const [placement, setPlacement] = useState<any>({
        pattern_type: type,
        other_placement_name: null,
        other_placement_id: null,
        material_type: materialTypeId,
        estimated_consumption_ratio:null,
        estimated_consumption_ratio_units:''

    });
    const [compositions, setCompositions] = useState([]);
    const NewPlacement = {
        other_placement_id: placement.other_placement_id,
        other_placement_name: placement.other_placement_name,
        material_type: placement.material_type,
        estimated_consumption_ratio:placement.estimated_consumption_ratio,
        estimated_consumption_ratio_units:placement.estimated_consumption_ratio_units,
        pack_ids: selectedPacks?.map((order_colorway: any) => (order_colorway)),

    }

    const [isSaving, setIsSaving] = useState(false);
    const [formValidationErrors, setFormValidationErrors] = useState<any>({ hasErrors: false });

    const placementFieldName = 'other_placement_name';
    const placementTypeFieldName = 'material_type';
    const estimatedConsumptionRatioFieldName = 'estimated_consumption_ratio';
    const estimatedConsumptionUnitFieldName = 'estimated_consumption_ratio_units';

    const [isLoading, setIsLoading] = useState(true);
    const [showErrors, setShowErrors] = useState(false);
    const [uniquePlacements, setUniqueplacements] = useState<any>([]);
    const autocompleteRef = useRef(null);
    const getUniqueOtherlacementList = () => {
        const uniquePlacementList = costingRestUrls.uniqueOrderPackagingPlacementsURL(orderId, materialType, placement.material_type, versionId);
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

    const getPackDetailsRelatedToPlacement = () => {
        const uniquePackItemList = costingRestUrls.getUpdatePackagingOtherPlacementURL(placement.other_placement_id, versionId);
        api.get(restUrls.apiBaseURL() + uniquePackItemList)
            .then(resp => {
                const resdata = resp?.data || {};
                setSelectedPacks([...resdata.pack_placements])
                setPlacement((prevPlacement: any) => ({
                    ...prevPlacement,
                    estimated_consumption_ratio: resdata?.estimated_consumption_ratio,
                }));
            })
            .catch(error => {
                toast.error(getDefaultError(error?.response?.status));
            });
    };

    const fetchData = () => {
        const requests = [
            api.get(restUrls.getOrderInquiryDetailsUpdateURL(orderId)),
            api.get(restUrls.fetchMaterialTypeURL('packaging_trim')),
            api.get(restUrls.getNavigationOrderMaterialURL(orderId, versionId))
        ]
        if (placementOther != 0 && placementOther) {
            requests.push(api.get(costingRestUrls.getUpdatePackagingOtherPlacementURL(placementOther, versionId)))
        }

        Promise.all(requests).then(resp => {
            const respData = resp.map((r: any) => r.data);
            const [orderInquiry, compositions, orderPacks, placement] = respData;
            setOrderInquiry(orderInquiry);
            setCompositions(compositions?.material_types);
            setOtherPlacement(placement);
            setDisplayPackDetails([...orderPacks?.order_packs]);
            setPackDetails([...orderPacks?.order_packs]);
            if (placementOther != 0 && placementOther) {
                setMainState({
                    country: placement.countries,
                    colorway: placement.colorways,
                    size: placement.sizes,
                });        
            }
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoading(false));
    }
     //handleonChange for type
     const handleChangeCompositionType = (event: any) => {
        setPlacement({ ...placement, [event?.target?.name]: event?.target?.value, });
    };

    const handleSaveNewPlacement = () => {

        const saveApi = restUrls.createPlacementPackagingURL(orderId,versionId, packId);
       
        api.post(saveApi, NewPlacement).then(resp => {
            // setUpdated(true);
            openAssignMaterial(resp?.data, NewPlacement);
            toast.success(DEFAULT_SUCCESS);
        }).catch(error => {
            setFormValidationErrors(error.response?.data);
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsSaving(false);
        });
    }

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

    const handleCheckboxChange = (packId: number, rowDetails: any) => {
        if (selectedPacks.includes(packId)) {
            setSelectedPacks((prevSelectedRows) => prevSelectedRows.filter((rowId) => rowId !== packId));
        } else {
            setSelectedPacks((prevSelectedRows) => [...prevSelectedRows, packId]);
        }
    };

    const handleSelectAll = (event: any) => {
        if (event.target.checked) {
            const allPackIds = packDetails.map((pack: any) => pack.id);
            setSelectedPacks([...allPackIds]);
        } else {
            setSelectedPacks([]);
        }
    };
    const columns: ColumnDef<any>[] = [
        {
            accessorKey: "id",
            header: <Checkbox onChange={handleSelectAll} /> as any,
            enableSorting: false,
            enableColumnFilter: false,
            enableGlobalFilter: false,
            cell: props => (
                <Checkbox checked={selectedPacks.includes(props.getValue() as number)} onClick={() => handleCheckboxChange(props.getValue() as number, props.row.original)} />
            ),
            meta: {
                align: 'center',
                width: 100
            }
        },
        {
            accessorKey: 'displayName',
            header: 'Pack/Description',


        },
    ];

    const handleChangeEstimatedConsumption = (event: any) => {
        const { name, value } = event.target;
        setPlacement({ ...placement, [name]: value, });
    };

    const handleOnChangeSelectPack = (event: any, data: any, reason: any) => {
        data.forEach((d: any) => d.size = d.id);
        const sizeIds = data.map((size: any) => size.id);
        setSelectedPacks(sizeIds);
    }

    const getGroupPackItems = () => {
        api.get(costingRestUrls.getSummaryPackDetailsURL(orderId, versionId, orderCountryId, orderColorwayId, orderSizeGroupId))
            .then(resp => {
                const resdata = resp?.data || {};
                setSelectedPacks([...resdata.packs]);
                setCurrentPackList([...resdata.packs]);
            })
            .catch(error => {
                toast.error(getDefaultError(error?.response?.status));
            });
    };

    const handleFileRemove = (deletePackId: number) => {
        const updatedSelectedPacks = selectedPacks.filter((packId: number) => packId !== deletePackId);
        setSelectedPacks(updatedSelectedPacks);
    };

    const handleAddCurrentPacks = () => {
        setSelectedPacks([...selectedPacks, ...currentPackList]);
    };

    const getEstimatedConsumptionRelatedToMaterialType = () => {
        const index = compositions.findIndex(composition => composition.id === placement.material_type);
        if (index !== -1) {
            const updatedPlacement = { ...placement, estimated_consumption_ratio_units: compositions[index].estimated_consumption_ratio_units };
            setPlacement(updatedPlacement);
        }
    };
    
    const updateFilteringMainState = () => {
        setMainState({
            country: filteringIdsSet?.country || [],
            size: filteringIdsSet?.size || [],
            colorway: filteringIdsSet?.colorway || [],
        });
      };

    useEffect(() => {
        if (otherPlacement) {
            if (otherPlacement?.pack_placements && placementOther > 0) {
                setSelectedPacks([...otherPlacement.pack_placements]);
                setPlacement((prevPlacement: any) => ({
                    ...prevPlacement,
                    material_type: otherPlacement?.type,
                    other_placement_id: otherPlacement?.placement_id,
                    other_placement_name: otherPlacement?.placement_name,
                    estimated_consumption_ratio: otherPlacement?.estimated_consumption_ratio,
                    estimated_consumption_ratio_units:otherPlacement?.estimated_consumption_ratio_units
                }));
            }
        }
    }, [otherPlacement])

    useEffect(() => {
        if (placement.other_placement_id) {
            getPackDetailsRelatedToPlacement();
        }
    }, [placement.other_placement_id]);

    useEffect(() => {
        if (orderId || placementOther) {
            fetchData();
            setSelectedPacks([parseInt(packId)]);
            if(filteringIdsSet){
                updateFilteringMainState()
            }
        }
    }, [orderId]);

   
    useEffect(() => {
        if (placement.material_type) {
            getUniqueOtherlacementList();
        }
    }, [placement.material_type]);

    useEffect(() => {
        if (orderSizeGroupId) {
            getGroupPackItems()
        }

    }, [orderSizeGroupId]);

    useEffect(() => {
        if (placement.material_type) {
            getEstimatedConsumptionRelatedToMaterialType()
        }
    }, [placement.material_type, compositions]);

    const [isLoadingPackItems, setIsLoadingPackItems] = useState(false);
   
    const handleSelectedIdsChange = (newSelectedIds:any) => {
        setSelectedPacks(newSelectedIds);
    };
     //pack Items-filter part

    const [filteringMainState, setMainState] = useState({ country: [], colorway: [], size: [] })

    const handleUpdateMainState = (newState: any) => {
        setMainState(newState);
    };

    useEffect(() => {
        const filterPacks = () => {
            return packDetails.filter((pack: { country: any; colorway: any; size: any; }) =>
                (!filteringMainState.country?.length || filteringMainState.country.some(({ country }: { country: any }) => pack.country === country)) &&
                (!filteringMainState.colorway?.length || filteringMainState.colorway.some(({ colorway }: { colorway: any }) => pack.colorway === colorway)) &&
                (!filteringMainState.size?.length || filteringMainState.size.some(({ size }: { size: any }) => pack.size === size))
            );
        };

        if (filteringMainState?.country.length !== 0 || filteringMainState?.colorway.length !== 0 || filteringMainState?.size?.length !== 0) {
            const filteredPacks = filterPacks();
            const selectedPackItemIds = filteredPacks.map((pack: { id: any; }) => pack.id);
            setSelectedPacks(selectedPackItemIds);
        } else {
            if (orderSizeGroupId ) {
                 getGroupPackItems();
            } else {
                setSelectedPacks([parseInt(packId)]);
            }
        }
    }, [filteringMainState, packDetails]);

     //end filter part
    return (
        <>
            {isLoading ? <DefaultLoader/> : <>
                <Box marginBottom={3}>
                    <InputLabel sx={{ mb: 1 }}>Types:</InputLabel>
                    <RitzSelection
                        id={'material_type'}
                        name={'material_type'}
                        optionValue={'id'}
                        optionText={'name'}
                        selectedValue={placement?.material_type}
                        isRequired={true}
                        options={compositions}
                        handleOnChange={handleChangeCompositionType}>
                    </RitzSelection>
                    <FormErrorMessage message={formValidationErrors?.[placementTypeFieldName]} />
                </Box>

                <Box marginBottom={3}>
                    <InputLabel sx={{ mb: 1 }}>Packaging Item Name:</InputLabel>
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
                        selectedValue={placement?.estimated_consumption_ratio}
                        isMulti={true}
                        multiline
                        row={true}
                        isRequired={true}
                        handleOnChange={handleChangeEstimatedConsumption}
                        inputType='number'
                    />
                     <FormErrorMessage message={formValidationErrors?.[estimatedConsumptionRatioFieldName]} />
                </Box>
                <Box  marginBottom={3} marginRight={5}  width= '50%'>
                    <InputLabel sx={{ mb: 1 }}>Estimated Consumption Ratio Units:</InputLabel>
                    <RitzInput
                        name={"estimated_consumption_ratio_units"}
                        id={"estimated_consumption_ratio_units"}
                        selectedValue={placement?.estimated_consumption_ratio_units}
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
                    <InputLabel sx={{ mb: 1 }}>Select Order Packs from the select box below:</InputLabel>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Typography sx={{ color: 'red', cursor: 'pointer' }} onClick={() => handleAddCurrentPacks()}>
                            <Button variant='outlined' sx={{ mb: 1 }}>Add Current Packs</Button>
                        </Typography>
                    </Box>
                    <PackDataFilter
                        orderInquiryDetails={orderInquiry}
                        onUpdateMainState={handleUpdateMainState}
                        selectedFilterData={filteringMainState}
                    />
                </Box>
                <Box marginBottom={3} >
                    <PackDetails
                        packItemData={packDetails}
                        selectedIds={selectedPacks}
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

export default AddPackagingPlacement
