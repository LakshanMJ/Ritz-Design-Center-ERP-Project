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
import EditMaterial from "./OrderInquiry/Material/EditMaterial";
import { PENDING_MATERIALS_VERSION_STATE } from "@/helpers/constants/CostingStates";
import CustomerBrandMaterialDetail from "../settings/userdefine_material/MaterialDetail";
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

const MaterialDetailsAnalyse = ({ orderId, versionId }: any) => {
    const theme = useTheme()
    const fabricsKey = 'fabrics'
    const sewingTrimsKey = 'sewing_trims'
    const packagingKey = 'packaging'
    const modalOpenKey = 'open';
    const materialNameKey = 'material_type_name';
    const materialDisplayNameKey = 'material_type_display_name';
    const orderPackItemType = 'packitem';
    const orderPackType = 'pack';

    const keyHelper = new ReactKeyHelper();
    const costingMetaData = useSelector((state: any) => state.CostingReducer?.order_inquiry);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingCircularLoader, setIsLoadingCircularLoader] = useState(false);
    const [showMaterialDetailsModal, setShowMaterialDetailsModal] = useState({modalStatus: null, materialId: null});
    const [selectedCheckBoxValues, setSelectedCheckBoxValues] = useState({ country: [], colorway: [], size: [], selectedItem: null });
    const [placementDetails, setPlacementDetails] = useState<any>([])
    const [selectedCategory, setSelectedCategory] = useState<any>({fabric: 0, packaging: 0,sewing_trims: 0}); 
    const [modalData, setModalData]:any = useState({[modalOpenKey]: false});
    
    const handleEditMaterial = (category: any) => {
        const selectedItem = costingMetaData?.items?.find((item: any)=>( item?.id == selectedCheckBoxValues?.selectedItem))
        const filterSelectedMaterial = placementDetails?.[category]?.find((placement: any)=> placement?.item_attribute_id == selectedCategory?.[category] )
        const placementMaterialID = category == packagingKey ? filterSelectedMaterial?.pack_placement_id : filterSelectedMaterial?.order_item_placement_id;
        const assignType = category == packagingKey? orderPackType : orderPackItemType
        const materialDataSet = {
            placement: filterSelectedMaterial?.placement_name,
            placement_other_id: filterSelectedMaterial?.item_attribute_id,
            [materialNameKey]: filterSelectedMaterial?.[materialNameKey],
            [materialDisplayNameKey]: filterSelectedMaterial?.[materialDisplayNameKey],
        }
        const itemDataSet = {
            item: selectedItem?.name,
            item_id: selectedItem?.item,
            order_item_id: selectedItem?.id
        }
        assignMaterialHandler(materialDataSet, filterSelectedMaterial?.headers, assignType , placementMaterialID, itemDataSet);
    }
    const assignMaterialHandler = (materialRow: any, headers: any, assignType: any, otherPlacementId:any, itemData: any) => {
         let materialHelper;
         if (assignType == orderPackItemType) {
             materialHelper = new OrderPackItemPlacementHelper({
                 materialType: materialRow?.[materialNameKey],
                 headers: headers,
                 displayName: materialRow?.[materialDisplayNameKey],
                 inputType: PENDING_MATERIALS_VERSION_STATE,
                 readOnly: false,
                 orderId: orderId,
                 versionId: versionId,
             });
            materialHelper.setOrderItemId(itemData?.order_item_id);
            materialHelper.setItemId(itemData?.item_id);
         } else {
             materialHelper = new OrderPackPlacementHelper({
                 materialType: materialRow?.[materialNameKey],
                 headers: headers,
                 displayName: materialRow?.[materialDisplayNameKey],
                 inputType: PENDING_MATERIALS_VERSION_STATE,
                 readOnly: false,
                 orderId: orderId,
                 versionId: versionId,
             });
         }
         if(otherPlacementId){
              materialHelper.setOrderPlacementId(otherPlacementId);
         }
         setModalData({
             title: 'Assign Material',
             [modalOpenKey]: true,
             drawerData: materialRow,
             orderPackType: assignType,
             materialHelper: materialHelper,
             setOpen: handleAssignMaterialModalClose,
         });
 
     }

    const handleAssignMaterialModalClose = () => {
        setModalData({ ...modalData, [modalOpenKey]: false });
        setIsLoadingCircularLoader(true);
        fetchData()
    }

    const EditDialog = (props: any) => {
        const onClose = () => {
            props?.setOpen(false);
        }
        return (
            <RitzModal
                title={props?.title}
                open={props?.open}
                onClose={onClose}
                maxWidth='lg'
                fullWidth={true}
            >
                <EditMaterial
                    drawerData={props?.drawerData}
                    materialHelper={props?.materialHelper}
                    saveURL={props?.saveURL}
                    orderPackType={props?.orderPackType}
                    setUpdated={props?.setOpen}
                    filteringIdsSet={selectedCheckBoxValues}
                />
            </RitzModal>
        )
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
                    materials: placement.materials.map((material: any) => ({
                        ...material,
                        check_status: index === placementIndex,
                    })),
                };
            }),
        }));
    };

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
    const handleMaterialCheckboxChange = (placementIndex: number, materialIndex: number, checked: boolean, categoryKey: string) => {
        setPlacementDetails((prevPlacementDetails: any) => {
            const updatedPlacementDetails = { ...prevPlacementDetails };
            const categoryData = updatedPlacementDetails[categoryKey];
            const updatedData = [...categoryData];
            updatedData[placementIndex] = {
                ...updatedData[placementIndex],
                materials: updatedData[placementIndex].materials.map((material: any, index: number) =>
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
            fetchData();
        }
    }, [selectedCheckBoxValues]);

    return (
        <>
            <EditDialog {...modalData} />
            { showMaterialDetailsModal.modalStatus &&
                <CustomerBrandMaterialDetail
                    customerBrandMaterialReferenceCodeId={showMaterialDetailsModal?.materialId}
                    modalOpen={showMaterialDetailsModal?.modalStatus}
                    setModalOpen={()=>{setShowMaterialDetailsModal({modalStatus: false, materialId: null})}}
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
                                                <Button disabled={!selectedCategory?.[categoryKey] || selectedCategory?.[categoryKey] === 0}  onClick={() => {handleEditMaterial(categoryKey) }} variant="contained" color="primary">Edit Material</Button>
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
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width:'25%' }}>Placement</TableCell>
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width:'30%' }}>Ritz Reference Code</TableCell>
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Applied Packs</TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {materialCategory?.map((placement: any, placementIndex: any) =>
                                                            placement?.materials?.map((material: any, materialIndex: number) => {
                                                                const materials = categoryKey === packagingKey ? material?.packs : material?.order_items;
                                                                const totalRowsForPlacement = placement.materials?.reduce((sum: number, material: any) => {
                                                                    const count = categoryKey === packagingKey
                                                                        ? material.packs?.length || 0
                                                                        : material.order_items?.length || 0;
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
                                                                                    checked={selectedCategory[categoryKey] === placement.item_attribute_id}
                                                                                    onChange={() => handleRadioChange(categoryKey, placement.item_attribute_id, placementIndex)}
                                                                                    value={placement.item_attribute_id}
                                                                                    name={`${categoryKey}-radio`}
                                                                                    inputProps={{"aria-label": `Select ${categoryKey}`,}}
                                                                                />{placement.placement_name}
                                                                            </TableCell>
                                                                        )}
                                                                        {packIndex === 0 && (
                                                                            <TableCell
                                                                            sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}
                                                                            rowSpan={
                                                                                categoryKey === packagingKey
                                                                                    ? material.packs?.length || 0
                                                                                    : material.order_items?.length || 0
                                                                            }
                                                                        >
                                                                            <Box sx={{ display: "flex", alignItems: "center" }}>
                                                                                <Checkbox
                                                                                    sx={{ p: 0, mr: 1 }}
                                                                                    checked={material.check_status || false}
                                                                                    onChange={(event) =>
                                                                                        handleMaterialCheckboxChange(
                                                                                            placementIndex,
                                                                                            materialIndex,
                                                                                            event.target.checked,
                                                                                            categoryKey
                                                                                        )
                                                                                    }
                                                                                />
                                                                                {material.material?.ritz_customer_brand_reference_code}
                                                                                <OpenInNewIcon
                                                                                    sx={{
                                                                                        ml: 1,
                                                                                        color: "rgb(25, 118, 210)",
                                                                                        cursor: "pointer",
                                                                                    }}
                                                                                    onClick={() =>
                                                                                        setShowMaterialDetailsModal({
                                                                                            modalStatus: true,
                                                                                            materialId: material?.material?.customer_brand_material_id,
                                                                                        })
                                                                                    }
                                                                                />
                                                                            </Box>
                                                                        </TableCell>
                                                                        )}
                                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                                            {pack.pack_display}
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

export default MaterialDetailsAnalyse;