import React, { useEffect, useState } from "react";
import { Box, Button, InputLabel, TextField, useTheme } from "@mui/material";
import DefaultLoader from "@/components/DefaultLoader";
import { ReactKeyHelper } from "@/helpers/KeyHelper";
import RitzMaterialSelection from "@/components/Ritz/RitzMaterialSelection";
import SaveSpinner from "@/components/SaveSpinner";
import api from "@/services/api";
import toast from "react-hot-toast";
import { DEFAULT_SUCCESS } from "@/helpers/constants/Constants";
import { getDefaultError } from "@/helpers/Utilities";
import { poClubAssignMaterialSaveURL } from "@/helpers/constants/rest_urls/POUrls";

const PoClubMaterialSelection = ({ dataSet, clubId, refreshData }: any) => {
    const packagingKey = 'packaging_trim_placements'
    const theme = useTheme()
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState<any>(null);

    const handleSave = () => {
        setIsSaving(true)
        const saveData = {
            po_placement_ids: dataSet?.checkedMaterials || [],
            customer_brand_material_id: selectedMaterial || null,
            type: dataSet?.category === packagingKey ? 'po_pack' : 'po_pack_item'
        }
        api.post(poClubAssignMaterialSaveURL(clubId), saveData).then(resp => {
            toast.success(DEFAULT_SUCCESS);
            refreshData()
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsSaving(false)
        });
    }
    const onRowSelect = (selection: any) => {
        setSelectedMaterial(selection)
    }

    return (
        <>
            {isLoading ? (
                <DefaultLoader />
            ) : (
                <Box>
                    <Box marginBottom={2} padding={0}>
                        <InputLabel sx={{ mb: 1 }}>{dataSet?.category === packagingKey ? 'Packaging Item Name' : 'Placement'}</InputLabel>
                            <TextField
                                id={'placement'}
                                type={'text'}
                                value={dataSet.placement || ''}
                                name={'placement'}
                                required
                                style={{ width: '60%' }}
                                InputProps={{ readOnly: true }}
                            />
                    </Box>
                    <Box marginBottom={2} padding={0}>
                        <InputLabel sx={{ mb: 1 }}>Select Material</InputLabel>
                            <RitzMaterialSelection
                                customerBrandId={dataSet?.customerBrand}
                                materialType={dataSet?.materialType}
                                handleOnChange={onRowSelect}
                            />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                        <Button onClick={handleSave} variant="contained" disabled={isSaving}>{isSaving && <SaveSpinner />}Save</Button>
                    </Box>
                </Box>
            )}
        </>
    );
};

export default PoClubMaterialSelection;