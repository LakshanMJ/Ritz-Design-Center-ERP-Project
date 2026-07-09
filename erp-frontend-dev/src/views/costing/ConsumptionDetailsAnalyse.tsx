import React, { useEffect, useState } from "react";
import { Box, Typography, Grid, Accordion, AccordionSummary, AccordionDetails, Card, Table, TableHead, TableRow, TableCell, TableBody, useTheme, Checkbox, Divider, IconButton, RadioGroup, FormControlLabel, Radio, Alert, Button } from "@mui/material";
import CircularLoader from "@/components/CircularLoader";
import DefaultLoader from "@/components/DefaultLoader";
import RitzCheckBoxHorizontal from "@/components/Ritz/RitzCheckBoxHorizontal";
import EditIcon from '@mui/icons-material/Edit';
import { ReactKeyHelper } from "@/helpers/KeyHelper";
import RitzInput from "@/components/Ritz/RitzInput";
import { useSelector } from "react-redux";
import api from "@/services/api";
import { costingConsumptionWastageSaveURL, orderPackPlacementDetailsURL } from "@/helpers/constants/RestUrls";
import toast from "react-hot-toast";
import { getDefaultError } from "@/helpers/Utilities";
import CustomerBrandMaterialDetail from "../settings/userdefine_material/MaterialDetail";
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { DEFAULT_SUCCESS } from "@/helpers/constants/Constants";

const ConsumptionDetailsAnalyse = ({ orderId, versionId }: any) => {
    const theme = useTheme()
    const fabricsKey = 'fabrics'
    const sewingTrimsKey = 'sewing_trims'
    const packagingKey = 'packaging'
    const packsKey = 'packs'
    const orderItemsKey = 'order_items'
    const packPlacementDataKey = 'pack_placement_data'
    const packItemPlacementDataKey = 'pack_item_placement_data'
    const packPlacementIdkey = 'pack_placement_id'
    const orderItemPlacementIdKey = 'order_item_placement_id'
    const consumptionKey = 'consumption_ratio';
    const wastageKey = 'wastage';

    const keyHelper = new ReactKeyHelper();
    const costingMetaData = useSelector((state: any) => state.CostingReducer?.order_inquiry);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingCircularLoader, setIsLoadingCircularLoader] = useState(false);
    const [selectedCheckBoxValues, setSelectedCheckBoxValues] = useState({ country: [], colorway: [], size: [], selectedItem: null });
    const [placementDetails, setPlacementDetails] = useState<any>({})
    const [showMaterialDetailsModal, setShowMaterialDetailsModal] = useState({ modalStatus: null, materialId: null });
    const [updatedRatios, setUpdatedRatios] = useState<any>({});

    const fetchData = () => {
        const dataSet = {
            order_item_id: selectedCheckBoxValues?.selectedItem || null,
            order_colorway_id: selectedCheckBoxValues?.colorway?.map(colorway => colorway.colorway) || [],
            order_size_id: selectedCheckBoxValues?.size?.map(size => size.size) || [],
            order_country_id: selectedCheckBoxValues?.country?.map(country => country.country) || []
        };
        setIsLoadingCircularLoader(true);
        api.post(orderPackPlacementDetailsURL(orderId, versionId), dataSet)
            .then(response => {
                const placementData = response?.data || [];
                setPlacementDetails({ ...placementData });
            })
            .catch(error => {
                toast.error(getDefaultError(error?.response?.status));
            })
            .finally(() => {
                setIsLoading(false);
                setIsLoadingCircularLoader(false);
            });
    };
    const handleCheckboxChanges = (event: any, category: any) => {
        const { value, checked } = event.target;
        const newStateItem = { [category]: parseInt(value) };
        setSelectedCheckBoxValues(prevState => {
            const newState = { ...prevState } as any;
            if (checked) {
                newState[category] = [...newState[category], newStateItem];
            } else {
                newState[category] = newState[category].filter((item: { [item: number]: number; }) => item[category] !== parseInt(value));
            }
            return newState;
        });
    };

    const handleItemChange = (event: any) => {
        const selectedValue = Number(event.target.value);
        setSelectedCheckBoxValues((prevState) => ({
            ...prevState,
            selectedItem: selectedValue,
        }));
    };

    const handleRatioInputChanges = (value: number, placementIndex: number, materialIndex: number, packIndex: number, key: any, categoryKey: any) => {
        const itemsKey = categoryKey === packagingKey ? packsKey : orderItemsKey;
        const packVariableKey = categoryKey === packagingKey ? packPlacementIdkey : orderItemPlacementIdKey;
        const mainKey = categoryKey === packagingKey ? packPlacementDataKey : packItemPlacementDataKey;

        setUpdatedRatios((prevRatios: any) => {
            const material = placementDetails[categoryKey]?.[placementIndex]?.materials?.[materialIndex]?.[itemsKey]?.[packIndex];
            console.log(material,"material")
            if (!material) return prevRatios;
            const updatedPack = {
                [packVariableKey]: material?.[packVariableKey],
                consumption_ratio: key === consumptionKey ? value : material?.[consumptionKey] || 0,
                wastage: key === wastageKey ? value : material?.[wastageKey] || 0,
            };

            const existingIndex = prevRatios[mainKey]?.findIndex((item: any) => item?.[packVariableKey] === updatedPack?.[packVariableKey]);

            if (existingIndex > -1) {
                const updatedPackItems = [...prevRatios[mainKey]];
                updatedPackItems[existingIndex] = {
                    ...updatedPackItems[existingIndex],
                    [key]: value,
                };
                return {
                    ...prevRatios,
                    [mainKey]: updatedPackItems,
                };
            } else {
                return {
                    ...prevRatios,
                    [mainKey]: [...(prevRatios[mainKey] || []), updatedPack],
                };
            }
        });
    };

    const getUpdatedValue = (key: any, categoryKey: any, pack: any) => {
        const mainKey = categoryKey === packagingKey ? packPlacementDataKey : packItemPlacementDataKey;
        const packVariableKey = categoryKey === packagingKey ? packPlacementIdkey : orderItemPlacementIdKey;

        const foundItem = updatedRatios[mainKey]?.find((item: any) => item?.[packVariableKey] === pack?.[packVariableKey]);
        return foundItem && foundItem[key] !== null ? foundItem[key] : pack?.[key];
    };
    
    const handleSave = () => {
        const saveData ={
            pack_item_placement_data: updatedRatios?.pack_item_placement_data || [],
            pack_placement_data: updatedRatios?.pack_placement_data || []
        }
        api.post(costingConsumptionWastageSaveURL(orderId, versionId), saveData).then(resp => {
            toast.success(DEFAULT_SUCCESS);
            fetchData()
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally();

    }

    useEffect(() => {
        if (selectedCheckBoxValues?.selectedItem) {
            fetchData();
        }
    }, [selectedCheckBoxValues]);

    return (
        <>
            {isLoadingCircularLoader && <CircularLoader />}
            {showMaterialDetailsModal.modalStatus &&
                <CustomerBrandMaterialDetail
                    customerBrandMaterialReferenceCodeId={showMaterialDetailsModal?.materialId}
                    modalOpen={showMaterialDetailsModal?.modalStatus}
                    setModalOpen={() => { setShowMaterialDetailsModal({ modalStatus: false, materialId: null }) }}
                />
            }
            {isLoading ? (
                <DefaultLoader />
            ) : (
                <Box sx={{ mt: 2, p: 2 }}>
                    <Box>
                        <Typography variant="h6">Select Item</Typography>
                        <RadioGroup value={selectedCheckBoxValues?.selectedItem} onChange={handleItemChange} row>
                            {costingMetaData.items.map((item: any, itemIndex: any) => (
                                <FormControlLabel
                                    key={itemIndex}
                                    value={item.id}
                                    control={<Radio />}
                                    label={item.name}
                                />
                            ))}
                        </RadioGroup>
                    </Box>
                    <Box>
                        <RitzCheckBoxHorizontal
                            id={'order_colorway'}
                            name={'order_colorway'}
                            isRequired={true}
                            options={costingMetaData.colorways}
                            selectedValues={selectedCheckBoxValues.colorway}
                            optionValue={'id'}
                            optionText={'colorway'}
                            labelText={"Select Order Colorways:"}
                            row={true}
                            selectedOptionValue={'colorway'}
                            handleOnChange={(event: any) => handleCheckboxChanges(event, "colorway")}
                        />
                    </Box>
                    <Box>
                        <RitzCheckBoxHorizontal
                            id={'countries'}
                            name={'countries'}
                            isRequired={true}
                            options={costingMetaData.countries}
                            selectedValues={selectedCheckBoxValues.country}
                            optionValue={'id'}
                            optionText={'name'}
                            labelText={"Select Countries:"}
                            row={true}
                            selectedOptionValue={'country'}
                            handleOnChange={(event: any) => handleCheckboxChanges(event, "country")}
                        />
                    </Box>
                    <Box>
                        <RitzCheckBoxHorizontal
                            id={'order_sizes'}
                            name={'order_sizes'}
                            isRequired={true}
                            options={costingMetaData.sizes}
                            selectedValues={selectedCheckBoxValues.size}
                            optionValue={'id'}
                            optionText={'name'}
                            labelText={"Select Order Sizes:"}
                            row={true}
                            selectedOptionValue={'size'}
                            handleOnChange={(event: any) => handleCheckboxChanges(event, "size")}
                        />
                    </Box>
                    <Divider
                        sx={{ borderWidth: 2, my: 2 }}
                    />
                    <Box>
                        {Object.keys(placementDetails).length === 0 || selectedCheckBoxValues?.colorway?.length === 0 ? (
                            <>
                                <Alert severity="info">
                                    Please select an item, colorway, country, and size to see the placement details.
                                </Alert>
                            </>
                        ) : (
                            <>
                                {Object.keys(placementDetails)?.map((categoryKey: string) => {
                                    if (categoryKey === 'fabrics') {
                                        return null;
                                    }
                                    const materialCategory = placementDetails[categoryKey];
                                    return (
                                        <React.Fragment key={`${keyHelper.getNextKeyValue()}`}>
                                            <Box sx={{ mt: 3 }}>
                                                <Typography variant="h1" color="primary" sx={{ fontWeight: "bold" }}>
                                                    {categoryKey === fabricsKey ? "Fabric" : categoryKey === packagingKey ? "Packaging" : categoryKey === sewingTrimsKey ? "Sewing Trim" : "New Category"}
                                                </Typography>
                                            </Box>
                                            <Box>
                                                <Table>
                                                    <TableHead>
                                                        <TableRow
                                                            sx={{
                                                                background: theme.palette.grey[200],
                                                                border: (theme) => `1px solid ${theme.palette.grey[100]}`,
                                                            }}
                                                        >
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '20%' }}>Placement</TableCell>
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '30%' }}>Ritz Reference Code</TableCell>
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Applied Packs</TableCell>
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Consumption/Wastage</TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {materialCategory?.map((placement: any, placementIndex: any) =>
                                                            placement?.materials?.map((material: any, materialIndex: number) => {
                                                                const materials = categoryKey === packagingKey ? material?.packs : material?.order_items;
                                                                return materials?.map((pack: any, packIndex: number) => (
                                                                    <TableRow key={`${keyHelper.getNextKeyValue()}`}>
                                                                        {materialIndex === 0 && packIndex === 0 && (
                                                                            <TableCell
                                                                                sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}
                                                                                rowSpan={placement?.materials?.length * (categoryKey === packagingKey ? material.packs?.length || 0 : material.order_items?.length || 0)}
                                                                            >
                                                                                {placement.placement_name}
                                                                            </TableCell>
                                                                        )}
                                                                        {packIndex === 0 && (
                                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }} rowSpan={(categoryKey === packagingKey ? material.packs?.length || 0 : material.order_items?.length || 0)}>
                                                                                <Box sx={{ display: "flex", alignItems: "center" }}>
                                                                                    {material.material?.ritz_customer_brand_reference_code}
                                                                                    <OpenInNewIcon
                                                                                        sx={{ ml: 1, color: "rgb(25, 118, 210)", cursor: "pointer" }}
                                                                                        onClick={() => setShowMaterialDetailsModal({ modalStatus: true, materialId: material?.material?.customer_brand_material_id, })}
                                                                                    />
                                                                                </Box>
                                                                            </TableCell>
                                                                        )}
                                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                                            {pack.pack_display}
                                                                        </TableCell>
                                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                                            <Box
                                                                                sx={{
                                                                                    display: 'flex',
                                                                                    alignItems: 'flex-start',
                                                                                    gap: 2,
                                                                                }}
                                                                            >
                                                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                                                    <Typography sx={{ fontSize: '0.7rem' }}>Consumption:</Typography>
                                                                                    <RitzInput
                                                                                        inputType="number"
                                                                                        name="consumption_ratio"
                                                                                        selectedValue={getUpdatedValue("consumption_ratio", categoryKey, pack) || 0}
                                                                                        handleOnChange={(event: any) => handleRatioInputChanges(parseFloat(event?.target?.value), placementIndex, materialIndex, packIndex, 'consumption_ratio', categoryKey)}
                                                                                        fullWidth
                                                                                        size="small"
                                                                                    />
                                                                                </Box>
                                                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                                                    <Typography sx={{ fontSize: '0.7rem' }}>Wastage:</Typography>
                                                                                    <RitzInput
                                                                                        inputType="number"
                                                                                        name="wastage"
                                                                                        selectedValue={getUpdatedValue("wastage", categoryKey, pack) || 0 }
                                                                                        handleOnChange={(event: any) => handleRatioInputChanges(parseFloat(event?.target?.value), placementIndex, materialIndex, packIndex, 'wastage', categoryKey)}
                                                                                        fullWidth
                                                                                        size="small"
                                                                                    />
                                                                                </Box>
                                                                            </Box>
                                                                        </TableCell>

                                                                    </TableRow>
                                                                ));
                                                            })
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </Box>
                                        </React.Fragment>
                                    );
                                })
                                }
                            </>
                        )}
                        <Box display="flex" justifyContent="flex-end">
                            <Button onClick={() => { handleSave() }} sx={{ mt: 1 }} variant="contained" color="primary">Save</Button>
                        </Box>
                    </Box>
                </Box>
            )}
        </>
    );
};

export default ConsumptionDetailsAnalyse;