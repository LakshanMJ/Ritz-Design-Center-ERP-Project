import React, { useEffect, useState } from "react";
import router, { useRouter } from "next/router";
import api from "@/services/api";
import * as poRestUrls from "@/helpers/constants/rest_urls/POUrls";
import { toast } from "react-hot-toast";
import { getDefaultError } from "@/helpers/Utilities";
import { ColumnDef } from "@tanstack/react-table";
import DefaultLoader from "@/components/DefaultLoader";
import { Box, Button, Checkbox, FormControlLabel, IconButton, List, ListItem, ListItemText, Typography } from "@mui/material";
import { DEFAULT_SUCCESS } from "@/helpers/constants/Constants";
import FormErrorMessage from "@/components/FormErrorMessage";
type ColorMapping = {
    Red: string;
    Green: string;
    Blue: string;
    Yellow: string;
  };
  
const GeneralColorTones = ({ materialId, supplierPoId, savedStatus }: any) => {

    const router = useRouter();
    const [colorTones, setColorTones] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedColors, setSelectedColors] = useState<number[]>([]);
    const [colorTonesErrors, setColorTonesErrors] = useState<any>({});
    const colorMapping: ColorMapping | any = {
        Red: '#EB5353',
        Green: '#36AE7C',
        Blue: '#187498',
        Yellow: '#F9D923',
      };

    const fetchPurchaseOrderPacks = () => {
        setIsLoading(true);
        const requests = [
            api.get(poRestUrls.getColorTonesListURL()),
            api.get(poRestUrls.generalMaterialColorToneDetailsURL(supplierPoId, materialId)),
        ];

        Promise.all(requests).then(response => {
            const respData = response.map(r => r.data);
            const [colors, selectedColorTones] = respData;
            setColorTones([...colors]);
            setSelectedColors([...selectedColorTones])

        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false);
        });
    }

    const handleColorChange = (id: number) => {
        setSelectedColors((prev) =>
            prev.includes(id) ? prev.filter((colorId) => colorId !== id) : [...prev, id]
        );
    };

    const handleSave = () => {
        const request = {
            method: 'post',
            url: poRestUrls.saveGenralMaterialColorTonesURL(supplierPoId),
            data: {
                material_id: materialId || null,
                color_tones: selectedColors || [],
            }
        }
        api(request).then(() => {
            toast.success(DEFAULT_SUCCESS);
            savedStatus(true)
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
            console.log(error?.response.data, "error?.response?")
            if (error?.response?.data?.error) {
                setColorTonesErrors(error?.response?.data)
            }
        }).finally(() => {
            setIsSaving(false);
        });
    }

    useEffect(() => {
        if (materialId) {
            fetchPurchaseOrderPacks();
        }
    }, [materialId]);

    return (
        <>

            {isLoading ? <DefaultLoader /> :
                <>
                    <Box sx={{ mb: 1 }}>
                        <Typography fontWeight="bold">Please select the Color Tones below:</Typography>
                        <List>
                            {colorTones.map((color) => {
                                const colorParts = color.color_tone_display.split("-");
                                return (
                                    <ListItem key={color.id} sx={{ display: 'flex', alignItems: 'center' }}>
                                        <Checkbox
                                            checked={selectedColors.includes(color.id)}
                                            onChange={() => handleColorChange(color.id)}
                                        />
                                        <Box sx={{ display: 'flex', gap: 1 }}>
                                            {colorParts.map((colorPart: any, index: any) => {
                                                const backgroundColor = colorMapping[colorPart.replace(/\s+/g, '')];
                                                return (
                                                    <Box
                                                        key={index}
                                                        sx={{
                                                            width: 70,
                                                            height: 30,
                                                            backgroundColor: backgroundColor,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            borderRadius: 1,
                                                            fontWeight: 'bold',
                                                            color: '#FFFFFF'
                                                        }}
                                                    >
                                                        {colorPart}
                                                    </Box>
                                                )
                                            })}
                                        </Box>
                                    </ListItem>
                                );
                            })}
                        </List>
                    </Box>
                    <FormErrorMessage message={colorTonesErrors?.error} />
                    <Box style={{ display: 'flex', justifyContent: 'end' }}>
                        <Button variant="contained" color="primary" onClick={handleSave}>Save</Button>
                    </Box>
                </>

            }

        </>
    )
}

export default GeneralColorTones;
