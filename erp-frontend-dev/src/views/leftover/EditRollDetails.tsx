import { Box, Breadcrumbs, Button, Card, darken, Divider, Grid, IconButton, InputLabel, Link, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import React, { useEffect, useState } from 'react'
import { useRouter } from "next/router";
import { ReactKeyHelper } from '@/helpers/KeyHelper';
import RitzSelection from '@/components/Ritz/RitzSelection';
import RitzInput from '@/components/Ritz/RitzInput';
import { LISTVIEW } from '@/helpers/constants/FileUpload';
import RitzSingleFileUploader from '@/components/Ritz/RitzSingleFileUploader';
import { consumptionUnitsListUrl, leftoverVerificationMaterialShadeListURL, leftoverVerificationDetailsSaveURL } from '@/helpers/constants/rest_urls/GrnUrls';
import CreatableSelect from 'react-select/creatable';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { DEFAULT_SUCCESS } from '@/helpers/constants/Constants';
import { getDefaultError } from '@/helpers/Utilities';
import DefaultLoader from '@/components/DefaultLoader';
import FormErrorMessage from '@/components/FormErrorMessage';
import { getColorTonesListURL } from '@/helpers/constants/rest_urls/POUrls';

const EditRollDetails = ({ selectedRowData, verificationId, selectedMaterialType, handleSavedData }: any) => {
    const fileLocation = `roll/${selectedRowData}/`;
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const keyHelper = new ReactKeyHelper();
    const [rollData, setRollData] = useState<any>(selectedRowData);
    const [shadeList, setShadeList] = useState<any>([]);
    const [colorToneList, setColorToneList] = useState<any>([]);
    const [errors, setErrors] = useState<any>({})
    const fetchData = () => {
        const requests = [
            api.get(leftoverVerificationMaterialShadeListURL(selectedRowData.id)),
            api.get(getColorTonesListURL()),
        ]
        Promise.all(requests).then(resp => {
            const respData = resp.map((r: any) => r.data);
            const [shadeData, colorTones] = respData;
            const formattedData = shadeData?.map((shade: any) => ({
                label: shade.shade_name,
                value: shade.id,
                attachment: shade.shade_swatch
            }));
            setShadeList(formattedData);
            setColorToneList([...colorTones])
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false);
        });
    }
    const handleSave = () => {
        const dataSet = {
            usable_quantity: rollData.usable_quantity,
            shade: rollData?.shade?.id,
            shade_name: rollData?.shade?.shade_name,
            swatch: rollData?.shade?.attachment || null,
            color_tone: rollData?.color_tone || null
        }
        api.post(leftoverVerificationDetailsSaveURL(selectedRowData.id), dataSet).then(resp => {
            toast.success(DEFAULT_SUCCESS);
            handleSavedData()
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
            if(error?.response?.data){
                setErrors(error?.response?.data)
            }
        }).finally();
    }
    const handleFileChange = (attachment: any) => {
        const attachmentData = attachment.length > 0 ? attachment[0] : null;
        setRollData((prevData: any) => ({
            ...prevData,
            shade: {
                ...prevData.shade,
                attachment: attachmentData
            }
        }));
    };

    const handleInputChange = (value: any, field: any) => {
        setRollData({ ...rollData, [field]: value || null })
    }

    const handleCreatableChange = (newValue: any) => {
        const updatedPlacement = { ...rollData.shade, shade_name: newValue.label };
        if (newValue?.__isNew__) {
            updatedPlacement.id = null;
        } else {
            updatedPlacement.id = newValue.value;
           
        }
        setRollData((prevData: any) => ({
            ...prevData,
            shade: updatedPlacement,
        }));
        hadleLoadAttachment(newValue.value)
    };

    const hadleLoadAttachment =(shadeId: any)=>{
        const attachment = shadeList?.find((shade: any) => shade.value === shadeId)?.attachment || null
        handleFileChange([attachment])
    }

    useEffect(() => {
        if (verificationId) {
            fetchData();
        }
    }, [verificationId]);

    return (
        <>
            {isLoading ? <DefaultLoader /> :
                <>
                    <Card sx={{ mb: 2, padding: 2 }}>
                        <Typography style={{ fontWeight: 'bold' }}>Roll Details:</Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={5} md={4} lg={4} >
                                <Box sx={{ m: 1 }}>
                                    <Box>
                                        <Box sx={{ mb: 2 }}>
                                            <InputLabel >BarCode</InputLabel>
                                        </Box>
                                        <RitzInput
                                            name={'barcode'}
                                            id={'barcode'}
                                            selectedValue={rollData?.barcode}
                                            size={'small'}
                                            isReadOnly={true}
                                            inputType={'text'}
                                            fullWidth
                                        />
                                    </Box>

                                </Box>
                            </Grid>
                            <Grid item xs={12} sm={5} md={4} lg={4} >
                                <Box sx={{ m: 1 }}>
                                    <Box>
                                        <Box sx={{ mb: 2 }}>
                                            <InputLabel >Available Quantity ({rollData?.available_quantity_units_display})</InputLabel>
                                        </Box>
                                        <RitzInput
                                            name={'available_qty'}
                                            id={'available_qty'}
                                            selectedValue={rollData?.available_quantity}
                                            size={'small'}
                                            isReadOnly={true}
                                            inputType={'text'}
                                            fullWidth
                                        />
                                    </Box>

                                </Box>
                            </Grid>
                            <Grid item xs={12} sm={5} md={4} lg={4} >
                                <Box sx={{ m: 1 }}>
                                    <Box>
                                        <Box sx={{ mb: 2 }}>
                                            <InputLabel >Actual Quantity  ({rollData?.available_quantity_units_display})</InputLabel>
                                        </Box>
                                        <RitzInput
                                            name={'usable_quantity'}
                                            selectedValue={rollData?.usable_quantity}
                                            size={'small'}
                                            inputType={'text'}
                                            handleOnChange={(event: any) => handleInputChange(parseFloat(event.target.value), "usable_quantity")}
                                            fullWidth
                                        />
                                        <FormErrorMessage message={errors?.usable_quantity} />
                                    </Box>

                                </Box>
                            </Grid>
                            {selectedMaterialType == 'fabric' && (
                                <>
                                    <Grid item xs={12} sm={5} md={4} lg={4} >
                                        <Box sx={{ m: 1 }}>
                                            <Box>
                                                <Box sx={{ mb: 2 }}>
                                                    <InputLabel >Shade</InputLabel>
                                                </Box>
                                                <CreatableSelect
                                                    options={shadeList}
                                                    value={shadeList.find((opt: any) => opt.value === rollData?.shade?.id)}
                                                    onChange={handleCreatableChange}
                                                    menuPosition={'fixed'}
                                                    menuPlacement={'auto'}
                                                    styles={{
                                                        menu: (provided, state) => ({
                                                            ...provided,
                                                            zIndex: 9999,
                                                            maxHeight: '50px',
                                                        }),
                                                        option: (provided, state) => ({
                                                            ...provided,
                                                            backgroundColor: state.isSelected ? '#E4F1FF' : 'white',
                                                            color: 'black',
                                                            ':hover': {
                                                                backgroundColor: '#F0F0F0',
                                                            },
                                                        }),
                                                        control: (provided) => ({
                                                            ...provided,
                                                        }),
                                                    }}
                                                />
                                            </Box>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12} sm={5} md={4} lg={4} >
                                        <Box sx={{ m: 1 }}>
                                            <Box>
                                                <Box sx={{ mb: 2 }}>
                                                    <InputLabel >Color Tone</InputLabel>
                                                </Box>
                                                <RitzSelection
                                                    id={'color_tone'}
                                                    name={'color_tone'}
                                                    optionValue={'id'}
                                                    optionText={'color_tone_display'}
                                                    selectedValue={rollData?.color_tone}
                                                    options={colorToneList}
                                                    size={"small"}
                                                    handleOnChange={(event: any) => handleInputChange(event.target.value, 'color_tone')}
                                                />
                                            </Box>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12} sm={5} md={4} lg={4} >
                                        <Box sx={{ m: 1 }}>
                                            <Box>
                                                <Box sx={{ mb: 2 }}>
                                                    <InputLabel >Swatch</InputLabel>
                                                </Box>
                                                <RitzSingleFileUploader
                                                    displayType={LISTVIEW}
                                                    selectedFilesParent={rollData?.shade?.attachment ? [rollData?.shade?.attachment] : []}
                                                    handleFileChangeParent={(selectedFiles: any) => handleFileChange(selectedFiles)}
                                                    filelocation={fileLocation}
                                                />
                                                <FormErrorMessage message={errors?.swatch} />
                                            </Box>
                                        </Box>
                                    </Grid>
                                </>
                            )}
                        </Grid>
                    </Card>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}>
                        <Button sx={{ float: 'right', ml: 2 }} variant='contained' onClick={() => handleSave()}>Save</Button>
                    </Box>
                </>
            }

        </>
    );
}

export default EditRollDetails