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
import { orderPackPlacementDetailsURL } from "@/helpers/constants/RestUrls";
import toast from "react-hot-toast";
import { getDefaultError } from "@/helpers/Utilities";
import RitzModal from "@/components/Ritz/RitzModal";
import { OrderPackItemPlacementHelper, OrderPackPlacementHelper } from "@/helpers/costings/materials/MaterialFieldHelper";
import { PENDING_MATERIALS_VERSION_STATE } from "@/helpers/constants/CostingStates";
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import EditMaterial from "@/views/costing/OrderInquiry/Material/EditMaterial";
import CustomerBrandMaterialDetail from "@/views/settings/userdefine_material/MaterialDetail";
import { poClubAnalyzeMetaDataURL, poClubAnalyzeSearchURL } from "@/helpers/constants/rest_urls/POUrls";
import PoClubMaterialSelection from "./PoClubMaterialSelection";
import { PENDING_MATERIALS_REVIEW_PO_CLUB_STATE } from "@/helpers/constants/PurchaseOrderStates";

const PoClubMaterialDetailsAnalyse = ({ clubId, currentState }: any) => {
    const theme = useTheme()
    const fabricsKey = 'fabric_placements'
    const sewingTrimsKey = 'sewing_trim_placements'
    const packagingKey = 'packaging_trim_placements'

    const keyHelper = new ReactKeyHelper();
    const [clubMetaData, setClubMetaData] = useState<any>({})
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingCircularLoader, setIsLoadingCircularLoader] = useState(false);
    const [showMaterialDetailsModal, setShowMaterialDetailsModal] = useState({ modalStatus: null, materialId: null });
    const [selectedCheckBoxValues, setSelectedCheckBoxValues] = useState({ country: [], colorway: [], size: [], selectedItem: null });
    const [placementDetails, setPlacementDetails] = useState<any>([])
    const [selectedCategory, setSelectedCategory] = useState<any>({ fabric_placements: 0, packaging_trim_placements: 0, sewing_trim_placements: 0 });
    const [modalData, setModalData]: any = useState({ modalStatus: false , selectedData: {}});

    const handleEditMaterial = (category: any) => {
        const filterSelectedMaterial = placementDetails?.[category]?.find((placement: any) => placement?.item_attribute_other_id == selectedCategory?.[category]);
        const checkedMaterials = filterSelectedMaterial?.po_placement_materials_data?.filter((pack: any) => (pack?.check_status));
        if (!checkedMaterials?.length) {
            toast.error("No materials have been selected. Please select at least one material to proceed.");
            return;
        }
        const checkedPlacements: number[] = [];
        checkedMaterials?.forEach((material: any) => {
            material?.po_pack_item_placements?.forEach((placement: any) => {
                if (placement?.po_pack_placement_id) {
                    checkedPlacements.push(placement?.po_pack_placement_id);
                }
            });
        });
        setModalData({
            modalStatus: true,
            selectedData: {
                category: category,
                placement: filterSelectedMaterial?.name,
                checkedMaterials: checkedPlacements,
                customerBrand: checkedMaterials?.[0]?.material_details?.customer_brand_id,//need to get customer brand
                materialType: checkedMaterials?.[0]?.material_details?.material_type,//need to get material type
            }
        })


    }

    const handleRadioChange = (categoryKey: string, itemAttributeId: number, placementIndex: number) => {
        setSelectedCategory((prevState: any) => ({
            ...prevState,
            [categoryKey]: itemAttributeId,
        }));
        setPlacementDetails((prevDetails: any) => ({
            ...prevDetails,
            [categoryKey]: prevDetails[categoryKey].map((placement: any, index: number) => {
                return {
                    ...placement,
                    po_placement_materials_data: placement?.po_placement_materials_data?.map((material: any) => ({
                        ...material,
                        check_status: index === placementIndex,
                    })),
                };
            }),
        }));
    };
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
    const handleMaterialCheckboxChange = (placementIndex: number, materialIndex: number, checked: boolean, categoryKey: string) => {
        setPlacementDetails((prevPlacementDetails: any) => {
            const updatedPlacementDetails = { ...prevPlacementDetails };
            const categoryData = updatedPlacementDetails[categoryKey];
            const updatedData = [...categoryData];
            updatedData[placementIndex] = {
                ...updatedData[placementIndex],
                po_placement_materials_data: updatedData[placementIndex]?.po_placement_materials_data?.map((material: any, index: number) =>
                    index === materialIndex
                        ? { ...material, check_status: checked }
                        : material
                ),
            };
            updatedPlacementDetails[categoryKey] = updatedData;
            return updatedPlacementDetails;
        });
    };

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
            {modalData?.modalStatus &&
                <RitzModal
                    title={"Change Material"}
                    open={modalData?.modalStatus}
                    onClose={() => { setModalData({ modalStatus: false, selectedData: {} }) }}
                    maxWidth='lg'
                    fullWidth={true}
                >
                    <PoClubMaterialSelection dataSet={modalData?.selectedData} clubId={clubId} refreshData={() => { loadData(), setModalData({ modalStatus: false, selectedData: {} }) }} />
                </RitzModal>
            }        
            {showMaterialDetailsModal.modalStatus &&
                <CustomerBrandMaterialDetail
                    customerBrandMaterialReferenceCodeId={showMaterialDetailsModal?.materialId}
                    modalOpen={showMaterialDetailsModal?.modalStatus}
                    setModalOpen={() => { setShowMaterialDetailsModal({ modalStatus: false, materialId: null }) }}
                />
            }
            {isLoadingCircularLoader && (<CircularLoader />)}
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
                                            <Box sx={{ mt: 3, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                <Typography variant="h1" color="primary" sx={{ fontWeight: "bold" }}>
                                                    {categoryKey === fabricsKey
                                                        ? "Fabric"
                                                        : categoryKey === packagingKey
                                                            ? "Packaging"
                                                            : categoryKey === sewingTrimsKey
                                                                ? "Sewing Trim"
                                                                : "New Category"}
                                                </Typography>
                                                <Button disabled={
                                                    currentState !== PENDING_MATERIALS_REVIEW_PO_CLUB_STATE ||
                                                    !selectedCategory?.[categoryKey] ||
                                                    selectedCategory?.[categoryKey] === 0
                                                } onClick={() => { handleEditMaterial(categoryKey) }} variant="contained" color="primary">Edit Material</Button>
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
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '25%' }}>Placement</TableCell>
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '30%' }}>Ritz Reference Code</TableCell>
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Applied Packs</TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {materialCategory?.map((placement: any, placementIndex: any) =>
                                                            placement?.po_placement_materials_data?.map((material: any, materialIndex: number) => {
                                                                const materials = categoryKey === packagingKey ? material?.po_pack_placements : material?.po_pack_item_placements;
                                                                const totalRowsForPlacement = placement.po_placement_materials_data?.reduce((sum: number, material: any) => {
                                                                    const count = categoryKey === packagingKey
                                                                        ? material.po_pack_placements?.length || 0
                                                                        : material.po_pack_item_placements?.length || 0;
                                                                    return sum + count;
                                                                }, 0);
                                                                return materials?.map((pack: any, packIndex: number) => (
                                                                    <TableRow key={`${keyHelper.getNextKeyValue()}`}>
                                                                        {materialIndex === 0 && packIndex === 0 && (
                                                                            <TableCell
                                                                                sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}
                                                                                rowSpan={totalRowsForPlacement}
                                                                            >
                                                                                <Radio
                                                                                    checked={selectedCategory[categoryKey] === placement.item_attribute_other_id}
                                                                                    onChange={() => handleRadioChange(categoryKey, placement.item_attribute_other_id, placementIndex)}
                                                                                    value={placement.item_attribute_other_id}
                                                                                    name={`${categoryKey}-radio`}
                                                                                    inputProps={{ "aria-label": `Select ${categoryKey}`, }}
                                                                                />{placement.name}
                                                                            </TableCell>
                                                                        )}
                                                                        {packIndex === 0 && (
                                                                            <TableCell
                                                                                sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}
                                                                                rowSpan={
                                                                                    categoryKey === packagingKey
                                                                                        ? material.po_pack_placements?.length || 0
                                                                                        : material.po_pack_item_placements?.length || 0
                                                                                }
                                                                            >
                                                                                <Box sx={{ display: "flex", alignItems: "center" }}>
                                                                                    <Checkbox
                                                                                        sx={{ p: 0, mr: 1 }}
                                                                                        checked={material.check_status || false}
                                                                                        disabled={selectedCategory[categoryKey] !== placement.item_attribute_other_id}
                                                                                        onChange={(event) =>
                                                                                            handleMaterialCheckboxChange(
                                                                                                placementIndex,
                                                                                                materialIndex,
                                                                                                event.target.checked,
                                                                                                categoryKey
                                                                                            )
                                                                                        }
                                                                                    />
                                                                                    {material.material_details?.ritz_customer_brand_reference_code}
                                                                                    <OpenInNewIcon
                                                                                        sx={{
                                                                                            ml: 1,
                                                                                            color: "rgb(25, 118, 210)",
                                                                                            cursor: "pointer",
                                                                                        }}
                                                                                        onClick={() =>
                                                                                            setShowMaterialDetailsModal({
                                                                                                modalStatus: true,
                                                                                                materialId: material?.material_details?.customer_brand_material_id,
                                                                                            })
                                                                                        }
                                                                                    />
                                                                                </Box>
                                                                            </TableCell>
                                                                        )}
                                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                                            {pack.display_value}
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
                    </Box>
                </Box>
            )}
        </>
    );
};

export default PoClubMaterialDetailsAnalyse;