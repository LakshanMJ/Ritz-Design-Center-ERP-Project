import React, { useEffect, useState } from "react";
import { Box, Typography, Table, TableHead, TableRow, TableCell, TableBody, useTheme, Divider, RadioGroup, FormControlLabel, Radio, Alert, Button } from "@mui/material";
import CircularLoader from "@/components/CircularLoader";
import DefaultLoader from "@/components/DefaultLoader";
import RitzCheckBoxHorizontal from "@/components/Ritz/RitzCheckBoxHorizontal";
import { ReactKeyHelper } from "@/helpers/KeyHelper";
import RitzInput from "@/components/Ritz/RitzInput";
import api from "@/services/api";
import toast from "react-hot-toast";
import { getDefaultError } from "@/helpers/Utilities";
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { DEFAULT_SUCCESS } from "@/helpers/constants/Constants";
import CustomerBrandMaterialDetail from "@/views/settings/userdefine_material/MaterialDetail";
import { poClubAnalyzeMetaDataURL, poClubAnalyzeSearchURL, poClubConsumptionWastageSaveURL } from "@/helpers/constants/rest_urls/POUrls";
import { PENDING_MATERIALS_REVIEW_PO_CLUB_STATE } from "@/helpers/constants/PurchaseOrderStates";

const PoClubConsumptionDetailsAnalyse = ({ clubId, currentState }: any) => {
    const theme = useTheme()
    const fabricsKey = 'fabric_placements'
    const sewingTrimsKey = 'sewing_trim_placements'
    const packagingKey = 'packaging_trim_placements'
    const packsKey = 'po_pack_placements'
    const orderItemsKey = 'po_pack_item_placements'
    const consumptionKey = 'consumption_ratio';
    const wastageKey = 'wastage';

    const keyHelper = new ReactKeyHelper();
    const [clubMetaData, setClubMetaData] = useState<any>({})
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingCircularLoader, setIsLoadingCircularLoader] = useState(false);
    const [selectedCheckBoxValues, setSelectedCheckBoxValues] = useState({ country: [], colorway: [], size: [], selectedItem: null });
    const [placementDetails, setPlacementDetails] = useState<any>({})
    const [showMaterialDetailsModal, setShowMaterialDetailsModal] = useState({ modalStatus: null, materialId: null });
    const [updatedRatios, setUpdatedRatios] = useState<any>({});
    const [ratioDetails, setRatioDetails] = useState<any>([]);
    const fetchData = () => {
        const requests = [
            api.get(poClubAnalyzeMetaDataURL(clubId))
        ];
        Promise.all(requests).then(resp => {
            const respData = resp.map((r: any) => r.data);
            const [metaData] = respData;
            setClubMetaData({ ...metaData })
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false)
        });
    };

    const loadData = () => {
        const dataSet = {
            po_item_id: selectedCheckBoxValues?.selectedItem || null,
            po_club_colorway_ids: selectedCheckBoxValues?.colorway?.map(colorway => colorway.colorway) || [],
            po_club_sizes: selectedCheckBoxValues?.size?.map(size => size.size) || [],
            po_club_countries: selectedCheckBoxValues?.country?.map(country => country.country) || []
        };
        setIsLoadingCircularLoader(true);
        api.post(poClubAnalyzeSearchURL(clubId), dataSet)
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
    const handleRatioInputChanges = (value: number, key: string, categoryKey: any, packPlacementId: number, currenctPackData: any) => {
        const placementTypeKey = categoryKey === packagingKey ? "pack_placement_id" : "pack_item_placement_id";
        setRatioDetails((prevState: any) => {
            const existingIndex = prevState.findIndex((item: any) => item[placementTypeKey] === packPlacementId);
            if (existingIndex > -1) {
                const updatedState = [...prevState];
                updatedState[existingIndex] = {
                    ...updatedState[existingIndex],
                    [consumptionKey]: key === consumptionKey ? value : updatedState[existingIndex][consumptionKey],
                    [wastageKey]: key === wastageKey ? value : updatedState[existingIndex][wastageKey],
                };
                return updatedState;
            } else {
                return [
                    ...prevState,
                    {
                        [placementTypeKey]: packPlacementId,
                        [consumptionKey]: key === consumptionKey ? value : currenctPackData?.[consumptionKey],
                        [wastageKey]: key === wastageKey ? value : currenctPackData?.[wastageKey],
                    },
                ];
            }
        });
    };

    const getUpdatedValue = (key: any, categoryKey: any, pack: any, packPlacementId: any) => {
        const placementTypeKey = categoryKey === packagingKey ? "pack_placement_id" : "pack_item_placement_id";
        const foundItem = ratioDetails.find((item: any) => item[placementTypeKey] === packPlacementId);
        return foundItem && foundItem[key] !== null ? foundItem[key] : pack?.[key];
    };

    const handleSave = () => {
        api.post(poClubConsumptionWastageSaveURL(clubId), { consumption_data: ratioDetails }).then(resp => {
            toast.success(DEFAULT_SUCCESS);
            setRatioDetails([])
            loadData()
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally();

    }

    useEffect(() => {
        if (selectedCheckBoxValues?.selectedItem) {
            loadData();
        }
    }, [selectedCheckBoxValues]);
    useEffect(() => {
        if (clubId) {
            fetchData();
        }
    }, [clubId]);


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
                            {clubMetaData?.po_items?.map((item: any, itemIndex: any) => (
                                <FormControlLabel
                                    key={itemIndex}
                                    value={item.po_item_id}
                                    control={<Radio />}
                                    label={item.display_value}
                                />
                            ))}
                        </RadioGroup>
                    </Box>
                    <Box>
                        <RitzCheckBoxHorizontal
                            id={'po_club_colorways'}
                            name={'po_club_colorways'}
                            isRequired={true}
                            options={clubMetaData.po_club_colorways}
                            selectedValues={selectedCheckBoxValues.colorway}
                            optionValue={'id'}
                            optionText={'colorway_name'}
                            labelText={"Select Order Colorways:"}
                            row={true}
                            selectedOptionValue={'colorway'}
                            handleOnChange={(event: any) => handleCheckboxChanges(event, "colorway")}
                            disabled={!selectedCheckBoxValues?.selectedItem}
                        />
                    </Box>
                    <Box>
                        <RitzCheckBoxHorizontal
                            id={'po_club_countries'}
                            name={'po_club_countries'}
                            isRequired={true}
                            options={clubMetaData.po_club_countries}
                            selectedValues={selectedCheckBoxValues.country}
                            optionValue={'id'}
                            optionText={'country_name'}
                            labelText={"Select Countries:"}
                            row={true}
                            selectedOptionValue={'country'}
                            handleOnChange={(event: any) => handleCheckboxChanges(event, "country")}
                            disabled={!selectedCheckBoxValues?.selectedItem}
                        />
                    </Box>
                    <Box>
                        <RitzCheckBoxHorizontal
                            id={'po_club_sizes'}
                            name={'po_club_sizes'}
                            isRequired={true}
                            options={clubMetaData.po_club_sizes}
                            selectedValues={selectedCheckBoxValues.size}
                            optionValue={'id'}
                            optionText={'size_name'}
                            labelText={"Select Order Sizes:"}
                            row={true}
                            selectedOptionValue={'size'}
                            handleOnChange={(event: any) => handleCheckboxChanges(event, "size")}
                            disabled={!selectedCheckBoxValues?.selectedItem}
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
                                    if (categoryKey === 'fabric_placements') {
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
                                                            placement?.po_placement_materials_data?.map((material: any, materialIndex: number) => {
                                                                const materials = categoryKey === packagingKey ? material?.po_pack_placements : material?.po_pack_item_placements;
                                                                return materials?.map((pack: any, packIndex: number) => (
                                                                    <TableRow key={`${keyHelper.getNextKeyValue()}`}>
                                                                        {materialIndex === 0 && packIndex === 0 && (
                                                                            <TableCell
                                                                                sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}
                                                                                rowSpan={placement?.po_placement_materials_data?.length * (categoryKey === packagingKey ? material.po_pack_placements?.length || 0 : material.po_pack_item_placements?.length || 0)}
                                                                            >
                                                                                {placement.name}
                                                                            </TableCell>
                                                                        )}
                                                                        {packIndex === 0 && (
                                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }} rowSpan={(categoryKey === packagingKey ? material.po_pack_placements?.length || 0 : material.po_pack_item_placements?.length || 0)}>
                                                                                <Box sx={{ display: "flex", alignItems: "center" }}>
                                                                                    {material.material_details?.ritz_customer_brand_reference_code}
                                                                                    <OpenInNewIcon
                                                                                        sx={{ ml: 1, color: "rgb(25, 118, 210)", cursor: "pointer" }}
                                                                                        onClick={() => setShowMaterialDetailsModal({ modalStatus: true, materialId: material?.material_details?.customer_brand_material_id, })}
                                                                                    />
                                                                                </Box>
                                                                            </TableCell>
                                                                        )}
                                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                                            {pack.display_value}
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
                                                                                        selectedValue={getUpdatedValue("consumption_ratio", categoryKey, pack, pack?.po_pack_placement_id) || 0}
                                                                                        handleOnChange={(event: any) => handleRatioInputChanges(parseFloat(event?.target?.value), 'consumption_ratio', categoryKey, pack?.po_pack_placement_id, pack)}
                                                                                        fullWidth
                                                                                        isReadOnly={currentState !== PENDING_MATERIALS_REVIEW_PO_CLUB_STATE}
                                                                                        size="small"
                                                                                    />
                                                                                </Box>
                                                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                                                    <Typography sx={{ fontSize: '0.7rem' }}>Wastage:</Typography>
                                                                                    <RitzInput
                                                                                        inputType="number"
                                                                                        name="wastage"
                                                                                        selectedValue={getUpdatedValue("wastage", categoryKey, pack, pack?.po_pack_placement_id) || 0}
                                                                                        handleOnChange={(event: any) => handleRatioInputChanges(parseFloat(event?.target?.value), 'wastage', categoryKey, pack?.po_pack_placement_id, pack)}
                                                                                        fullWidth
                                                                                        isReadOnly={currentState !== PENDING_MATERIALS_REVIEW_PO_CLUB_STATE}
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

export default PoClubConsumptionDetailsAnalyse;