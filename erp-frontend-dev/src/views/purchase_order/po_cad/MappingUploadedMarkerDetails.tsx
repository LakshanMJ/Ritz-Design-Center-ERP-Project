import { getDefaultError } from '@/helpers/Utilities';
import api from '@/services/api';
import { Box, Button, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material'
import * as POUrls from '@/helpers/constants/rest_urls/POUrls';
import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast';
import DefaultLoader from '@/components/DefaultLoader';
import SaveSpinner from '@/components/SaveSpinner';
import { DEFAULT_SUCCESS } from '@/helpers/constants/Constants';
import RitzSelection from '@/components/Ritz/RitzSelection';
import RitzMultiSelectCheckBox from '@/components/Ritz/RitzMultiSelectCheckBox';
import FormErrorMessage from '@/components/FormErrorMessage';

const MappingUploadedMarkerDetails = ({ markerData, refreshData }: any) => {

    const [isLoading, setIsLoading] = useState(false);
    const [selectedMarkerData, setSelectedMarkerData] = useState<any>({...markerData});
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState<any>({});

    const handleSaveAction = () => {
        setIsSaving(true);
        const selectedFileData = {
            area_file: selectedMarkerData?.marker_data?.area_file,
            mini_marker_file: selectedMarkerData?.marker_data?.mini_marker_file,
            placements: selectedMarkerData?.placements,
            sizes: selectedMarkerData?.sizes
        }
        api.post(POUrls.poMarkerCreateUploadDataURL(selectedMarkerData?.po_club_id, selectedMarkerData?.customer_brand_material_id), selectedFileData).then(resp => {
            const responseData = resp?.data || [];
            toast.success(DEFAULT_SUCCESS);
            refreshData()
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
            setErrors({...error?.response?.data})
        }).finally(() => {
            setIsSaving(false);
        });
    }

    const handleChangeState = (event: any, index: any, field: any) => {
        const { value } = event.target;
        setSelectedMarkerData((prevState: any) => {
            const updatedSizes = [...prevState.sizes];
            updatedSizes[index] = {
                ...updatedSizes[index],
                [field]: value,
            };
            return {
                ...prevState,
                sizes: updatedSizes,
            };
        });
    }

    const handleOnChangeSelectPlacement = (event: any, data: any, reason: any, placementIndex: any) => {
        data.forEach((d: any) => d.placement = d.id);
        const placementIds = data.map((placement: any) => placement.id);
        setSelectedMarkerData((prevData: any) => {
            const updatedPlacements = [...prevData?.placements];
            updatedPlacements[placementIndex] = {
                ...updatedPlacements[placementIndex],
                marker_placements: placementIds,
            };
            return {
                ...prevData,
                placements: updatedPlacements,
            };
        });
    }

    return (
        <>
            {isLoading ? <DefaultLoader /> : <>
                <Box sx={{ mt: 3, }}>
                    <Box>
                        <Typography variant='h6' sx={{ mb: 1, color: 'primary.main'}}>Size Mapping</Typography>
                        <Box>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Size</TableCell>
                                        <TableCell>Marker Size</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {selectedMarkerData?.sizes?.map((size: any, sizeIndex: any) => (
                                        <TableRow>
                                            <TableCell>{size?.name} ( {size?.abbrevation} )</TableCell>
                                            <TableCell>
                                                <RitzSelection
                                                    id={'marker_size'}
                                                    name={'marker_size'}
                                                    optionValue={'id'}
                                                    optionText={'name'}
                                                    selectedValue={size?.marker_size}
                                                    isRequired={true}
                                                    options={selectedMarkerData?.marker_data?.sizes}
                                                    handleOnChange={(event: any) => handleChangeState(event, sizeIndex, 'marker_size')}
                                                />
                                                <FormErrorMessage message={errors?.sizes?.[sizeIndex]?.marker_size[0]} />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Box>
                        <Box sx={{ mt: 2 }}>
                            <Typography variant='h6' sx={{ mb: 1, color: 'primary.main'}}>Placement Mapping</Typography>
                            <Box>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Item</TableCell>
                                            <TableCell>Placement</TableCell>
                                            <TableCell>Marker Placement</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {selectedMarkerData?.placements?.map((placement: any, placementIndex: any) => (
                                            <TableRow>
                                                <TableCell>{placement?.item_name}</TableCell>
                                                <TableCell sx={{width:'25%'}}>{placement?.name}</TableCell>
                                                <TableCell sx={{width:'75%'}}>
                                                    <RitzMultiSelectCheckBox
                                                        id={'marker_placements'}
                                                        selectOptions={selectedMarkerData?.marker_data?.placements}
                                                        optionValue={'id'}
                                                        optionDisplayValue={'name'}
                                                        handleOnChange={(event: any, data: any, reason: any) => handleOnChangeSelectPlacement(event, data, reason, placementIndex)}
                                                        selectedValues={placement?.marker_placements || ''}
                                                    />
                                                   <FormErrorMessage message={errors?.placements?.[placementIndex]?.marker_placements?.[0]} />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </Box>
                        </Box>
                    </Box>
                    <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button variant="contained" disabled={isSaving} onClick={handleSaveAction}>
                            {isSaving && <SaveSpinner />}Save
                        </Button>
                    </Box>
                </Box>
            </>}
        </>
    )
}

export default MappingUploadedMarkerDetails