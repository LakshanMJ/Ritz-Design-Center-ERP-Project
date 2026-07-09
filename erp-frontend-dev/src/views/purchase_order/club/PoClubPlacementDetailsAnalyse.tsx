import React, { useEffect, useState } from "react";
import { Box, Typography, Table, TableHead, TableRow, TableCell, TableBody, useTheme, Checkbox, Divider, RadioGroup, FormControlLabel, Radio, Button, Alert } from "@mui/material";
import CircularLoader from "@/components/CircularLoader";
import DefaultLoader from "@/components/DefaultLoader";
import RitzCheckBoxHorizontal from "@/components/Ritz/RitzCheckBoxHorizontal";
import { ReactKeyHelper } from "@/helpers/KeyHelper";
import { useSelector } from "react-redux";
import api from "@/services/api";
import toast from "react-hot-toast";
import { getDefaultError, hasRole } from "@/helpers/Utilities";
import { orderPackPlacementDeleteURL, orderPackPlacementDetailsURL } from "@/helpers/constants/RestUrls";
import { DEFAULT_SUCCESS } from "@/helpers/constants/Constants";
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import RitzModal from "@/components/Ritz/RitzModal";
import AddPlacement from "@/views/costing/AddPlacement";
import AddPackagingPlacement from "@/views/costing/AddPackagingPlacement";
import { OrderPackItemPlacementHelper, OrderPackPlacementHelper } from "@/helpers/costings/materials/MaterialFieldHelper";
import { PENDING_MATERIALS_VERSION_STATE } from "@/helpers/constants/CostingStates";
import ClearIcon from '@mui/icons-material/Clear';
import EditMaterial from "@/views/costing/OrderInquiry/Material/EditMaterial";
import { poClubAnalyzeMetaDataURL, poClubAnalyzeSearchURL, poPlacementDeleteURL } from "@/helpers/constants/rest_urls/POUrls";
import { ADMIN } from "@/helpers/constants/RoleManager";
import { PENDING_MATERIALS_REVIEW_PO_CLUB_STATE } from "@/helpers/constants/PurchaseOrderStates";

const PoClubPlacementDetailsAnalyse = ({ orderId, versionId, clubId, currentState }: any) => {
    const theme = useTheme()
    const fabricsKey = 'fabric_placements'
    const sewingTrimsKey = 'sewing_trim_placements'
    const packagingKey = 'packaging_trim_placements'
    const packsKey = 'po_pack_placements'
    const orderItemsKey = 'po_pack_item_placements'
    const packPlacementIdkey = 'po_pack_placement_id'
    const orderItemPlacementIdKey = 'order_item_placement_id'
    const materialNameKey = 'material_type_name';
    const materialDisplayNameKey = 'material_type_display_name';
    const packItemPlacementIdKey = 'pack_item_placement_id';
    const idKey = 'id';
    const orderPackItemType = 'packitem';
    const modalOpenKey = 'open';
    const canEdit = hasRole(ADMIN);

    const keyHelper = new ReactKeyHelper();
    const [clubMetaData, setClubMetaData] = useState<any>({})
  
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingCircularLoader, setIsLoadingCircularLoader] = useState(false);
    const [openDeleteConfirmationModal, setOpenDeleteConfirmationModal] = useState(false);
    const [selectedCheckBoxValues, setSelectedCheckBoxValues] = useState({ country: [], colorway: [], size: [], selectedItem: null });
    const [placementDetails, setPlacementDetails] = useState<any>({})
    const [packItemPlacementMaterialModal, setPackItemPlacementMaterialModal] = useState<any>({})
    const [packagingPlacementMaterialModal, setPackagingPlacementMaterialModal] = useState<any>({})
    const [modalData, setModalData]:any = useState({[modalOpenKey]: false});
    const hideAddPlacement = true

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
            setIsLoading(false),
                setIsLoadingCircularLoader(false)
        });
    };
    const loadDataPackData = () => {
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
                />
            </RitzModal>
        )
    }

    const handleDeletePlacement = () => {
        const deletedIds = {
            'po_pack_placement_ids': [],
            'po_pack_item_placement_ids': [],
        } as any;
        Object.keys(placementDetails).forEach((categoryKey) => {
            const categoryData = placementDetails[categoryKey];
            const filteredIds: number[] = [];
            categoryData.forEach((placement: any) => {
                placement?.po_placement_materials_data?.forEach((material: any) => {
                    const itemsKey = categoryKey === packagingKey ? 'po_pack_placements' : 'po_pack_item_placements';
                    const itemIds = (material[itemsKey] || []).filter((item: any) => item.check_status).map((item: any) => item['po_pack_placement_id']);
                    filteredIds.push(...itemIds);
                });
            });

            if (filteredIds.length > 0) {
                if (categoryKey === 'packaging_trim_placements') {
                    deletedIds['po_pack_placement_ids'].push(...filteredIds);
                } else {
                    deletedIds['po_pack_item_placement_ids'].push(...filteredIds);
                }
            }
        });
        api.post(poPlacementDeleteURL(clubId), deletedIds)
            .then((resp) => {
                toast.success(DEFAULT_SUCCESS);
                setOpenDeleteConfirmationModal(false)
                loadDataPackData();
            })
            .catch((error) => {
                toast.error(getDefaultError(error?.response?.status));
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

    const handlePlacementCheckboxChange = (placementIndex: number, checked: boolean, categoryKey: string) => {
        const uniqPackKey = categoryKey === packagingKey ? packsKey : orderItemsKey;
        setPlacementDetails((prevPlacementDetails: any) => {
            const updatedPlacementDetails = { ...prevPlacementDetails };
            const categoryData = updatedPlacementDetails[categoryKey];
            const updatedData = [...categoryData];
            updatedData[placementIndex] = {
                ...updatedData[placementIndex],
                check_status: checked,
                po_placement_materials_data: updatedData[placementIndex].po_placement_materials_data.map((material: any) => ({
                    ...material,
                    [uniqPackKey]: material[uniqPackKey].map((pack: any) => ({
                        ...pack,
                        check_status: checked,
                    })),
                })),
            };
            updatedPlacementDetails[categoryKey] = updatedData;
            return updatedPlacementDetails;
        });
    };

    const handlePackCheckboxChange = (placementIndex: number, packIndex: number, checked: boolean, categoryKey: string, materialIndex: number) => {
        const uniqPackKey = categoryKey === packagingKey ? packsKey : orderItemsKey;
        setPlacementDetails((prevPlacementDetails: any) => {
            const updatedPlacementDetails = { ...prevPlacementDetails };
           
            const categoryData = updatedPlacementDetails[categoryKey];
            const updatedData = [...categoryData];
            const updatedMaterials = [...updatedData[placementIndex].po_placement_materials_data];
            const material = updatedMaterials[materialIndex];
            
            const updatedPacks = [...material[uniqPackKey]];
            updatedPacks[packIndex] = { ...updatedPacks[packIndex], check_status: checked };
            updatedMaterials[materialIndex] = { ...material, [uniqPackKey]: updatedPacks };

            updatedData[placementIndex] = {
                ...updatedData[placementIndex],
                po_placement_materials_data: updatedMaterials,
            };
    
            updatedPlacementDetails[categoryKey] = updatedData;
            return updatedPlacementDetails;
        });
    };
    const openPlacementModal = (isOpen: any, title: string, placementOther: any, materialType: any) => {
        const selectedItem = clubMetaData?.items?.find((item: any)=>( item?.id == selectedCheckBoxValues?.selectedItem))
        setPackItemPlacementMaterialModal({ modalStatus: isOpen, orderItem: selectedItem?.id, itemId: selectedItem?.item, title: title });
    }
    const openPackagingPlacementModal = (isOpen: any, title: string, placementOther: any, materialType: any) => {
        const selectedItem = clubMetaData?.items?.find((item: any)=>( item?.id == selectedCheckBoxValues?.selectedItem))
        setPackagingPlacementMaterialModal({ modalStatus: isOpen, orderItem: selectedItem?.id, itemId: selectedItem?.item, title: title });
    }
    
    const createPlacementToggleAssignMaterial = (createdPlacementData: any, postData: any, assignType: any) => {
        setPackItemPlacementMaterialModal({ modalStatus: false, orderItem: null, itemId: null, title: null });
        setPackagingPlacementMaterialModal({ modalStatus: false, orderItem: null, itemId: null, title: null });
        const selectedItem = clubMetaData?.items?.find((item: any)=>( item?.id == selectedCheckBoxValues?.selectedItem))
        const itemDataSet = {
            item: selectedItem?.name,
            item_id: selectedItem?.item,
            order_item_id: selectedItem?.id
        }
        const placementData = createdPlacementData['placements'][0];
        const modifiedPlacementData = {...placementData, [packItemPlacementIdKey]: placementData[idKey], placement: placementData['placement_name'], [materialNameKey]: postData.material_type,[materialDisplayNameKey]: postData.material_type_display_name,};
        assignMaterialHandler(modifiedPlacementData,createdPlacementData.material_headers, assignType, createdPlacementData.other_placement_id, itemDataSet );
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
            materialHelper.setOrderPlacementId(materialRow[packItemPlacementIdKey]);
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
        loadDataPackData()
    }
    const handleModalClose = () => {
        setPackagingPlacementMaterialModal({ modalStatus: false, orderItem: null, itemId: null, title: null });
        setPackItemPlacementMaterialModal({ modalStatus: false, orderItem: null, itemId: null, title: null });
    }

    const showingCheckedPacks = () => {
        const deletedDetails = {} as any; 

        Object.keys(placementDetails).forEach((categoryKey) => {
            const categoryData = placementDetails[categoryKey];
            const filteredDetails: any[] = [];

            categoryData.forEach((placement: any) => {
                placement.po_placement_materials_data.forEach((material: any) => {
                    const itemsKey = categoryKey === packagingKey ? packsKey : orderItemsKey;
                    const itemIdKey = categoryKey === packagingKey ? packPlacementIdkey : packPlacementIdkey;

                    const checkedItems = (material[itemsKey] || [])
                        .filter((item: any) => item.check_status)
                        .map((item: any) => ({
                            packDisplay: `${placement.name} - ${item.display_value}`,
                            itemId: item[itemIdKey],
                        }));
                    filteredDetails.push(...checkedItems);
                });
            });

            if (filteredDetails.length > 0) {
                deletedDetails[categoryKey] = filteredDetails;
            }
        });
        return deletedDetails;
    }

    useEffect(() => {
        if (selectedCheckBoxValues?.selectedItem) {
            loadDataPackData();
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
            {openDeleteConfirmationModal && (
                <RitzModal open={openDeleteConfirmationModal} onClose={() => setOpenDeleteConfirmationModal(false)} title='Confirmation' maxWidth='md'>
                    Are you sure you want to delete the selected packs? This action will remove them permanently from the list.
                    <Box sx={{ mt: 2}}>
                        {Object.keys(showingCheckedPacks()).map((categoryKey: string) => {
                            const packs = showingCheckedPacks()[categoryKey];
                            return (
                                <Box key={categoryKey} sx={{ mb: 1 }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                                    {categoryKey === fabricsKey ? "Fabric" : categoryKey === packagingKey ? "Packaging" : categoryKey === sewingTrimsKey ? "Sewing Trim" : "New Category"}
                                    </Typography>
                                    {packs.map((pack: any, index: number) => (
                                         <Box
                                         key={index}
                                         sx={{
                                             display: 'flex',
                                             alignItems: 'center',
                                         }}
                                     >
                                         <ClearIcon sx={{ color: 'error.main', mr: 1 }} />
                                         <Typography>{pack.packDisplay}</Typography>
                                     </Box>
                                    ))}
                                </Box>
                            );
                        })}
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'end', mt: 1 }}>
                        <Button variant='contained' onClick={handleDeletePlacement} >Confirm</Button>
                    </Box>
                </RitzModal>
            )}

            <EditDialog {...modalData} />
            {packItemPlacementMaterialModal?.modalStatus && (
                <RitzModal
                    title={packItemPlacementMaterialModal?.title}
                    open={packItemPlacementMaterialModal?.modalStatus}
                    onClose={() => { openPlacementModal(false, null, null, null) }}
                    maxWidth='lg'
                    fullWidth={true}
                >
                    <AddPlacement
                        orderId={orderId}
                        type={'individual'}
                        itemId={packItemPlacementMaterialModal?.orderItem}
                        itemItemId={packItemPlacementMaterialModal?.itemId}
                        placementOther={0}
                        setUpdated={()=>{handleModalClose()}}
                        versionId={versionId}
                        openAssignMaterial={(createdPlacementData: any, postData: any)=>{createPlacementToggleAssignMaterial(createdPlacementData, postData, 'packitem')}}
                        filteringIdsSet={selectedCheckBoxValues}
                    />
                </RitzModal>
            )}
            {packagingPlacementMaterialModal?.modalStatus && (
                <RitzModal
                    title={packagingPlacementMaterialModal?.title}
                    open={packagingPlacementMaterialModal?.modalStatus}
                    onClose={() => { openPackagingPlacementModal(false, null, null, null) }}
                    maxWidth='lg'
                    fullWidth={true}
                >
                     <AddPackagingPlacement
                        orderId={orderId}
                        type={'individual'}
                        placementOther={0}
                        versionId={versionId}
                        setUpdated={()=>{handleModalClose()}}
                        openAssignMaterial={(createdPlacementData: any, postData: any)=>{createPlacementToggleAssignMaterial(createdPlacementData, postData, 'pack')}}
                        filteringIdsSet={selectedCheckBoxValues}

                    />
                </RitzModal>
            )}
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
                                    Please select an item and colorway to see the placement details.
                                </Alert>
                            </>
                        ) : (
                            <>
                                <Box display="flex" justifyContent="flex-end">
                                    {/* {canEdit && (
                                        <>
                                            <Button onClick={() => { openPlacementModal(true, "Create Placement", 0, undefined); }} sx={{ mr: 1 }} variant="contained" color="primary">Add Fabric/Sewing</Button>
                                            <Button onClick={() => { openPackagingPlacementModal(true, "Create Packaging", 0, undefined); }} sx={{ mr: 1 }} variant="contained" color="primary">Add Packaging</Button>
                                        </>
                                    )} */}
                                    <Button disabled={currentState !== PENDING_MATERIALS_REVIEW_PO_CLUB_STATE} onClick={() => { setOpenDeleteConfirmationModal(true) }} variant="contained" color="error">Delete</Button>
                                </Box>
                                {Object.keys(placementDetails)?.map((categoryKey: string) => {
                                    const materialCategory = placementDetails[categoryKey];
                                    console.log(materialCategory,"materialCategory")
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
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width:'40%' }}>Placement</TableCell>
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Applied Packs</TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {materialCategory?.map((placement: any, placementIndex: any) =>
                                                            placement?.po_placement_materials_data?.map((material: any, materialIndex: number) => {
                                                              //  console.log(material,"material")
                                                                const materials = categoryKey === packagingKey ? material?.po_pack_placements : material?.po_pack_item_placements;
                                                                return materials?.map((pack: any, packIndex: number) => (
                                                                    <TableRow key={`${keyHelper.getNextKeyValue()}`}>
                                                                        {packIndex === 0 && materialIndex === 0 && (
                                                                            <TableCell
                                                                                sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '25%' }}
                                                                                rowSpan={placement.po_placement_materials_data?.reduce(
                                                                                    (acc: number, mat: any) =>
                                                                                        acc + (categoryKey === packagingKey ? mat.po_pack_placements?.length || 0 : mat.po_pack_item_placements?.length || 0),
                                                                                    0
                                                                                )}
                                                                            >
                                                                                <Checkbox
                                                                                    sx={{ p: 0, mr: 1 }}
                                                                                    checked={placement.check_status || false}
                                                                                    onChange={(e) => handlePlacementCheckboxChange(placementIndex, e.target.checked, categoryKey)}
                                                                                />
                                                                                {placement.name}
                                                                            </TableCell>
                                                                        )}
                                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                                            <Checkbox
                                                                                sx={{ p: 0, mr: 1 }}
                                                                                checked={pack?.check_status || false}
                                                                                onChange={(e) =>
                                                                                    handlePackCheckboxChange(placementIndex, packIndex, e.target.checked, categoryKey, materialIndex)
                                                                                }
                                                                            />
                                                                            {pack?.display_value}
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
                    {Object.keys(placementDetails).length === 0 || selectedCheckBoxValues?.colorway?.length > 0 && (
                        <Box display="flex" justifyContent="flex-end">
                            <Button onClick={() => { handleDeletePlacement() }} sx={{ mt: 1 }} variant="contained" color="error">Delete</Button>
                        </Box>
                    )}
                </Box>
            )}
        </>
    );
};

export default PoClubPlacementDetailsAnalyse;