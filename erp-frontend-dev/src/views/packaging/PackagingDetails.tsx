import React, { useEffect, useState } from 'react';
import * as RestUrls from '@/helpers/constants/RestUrls';
import EditIcon from '@mui/icons-material/Edit';
import api from '@/services/api';
import { Alert, Box, Button, Card, CardContent, CardHeader, darken, Divider, Grid, IconButton, InputLabel, Table, TableBody, TableCell, TableHead, TableRow, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import { getDefaultError } from '@/helpers/Utilities';
import toast from 'react-hot-toast';
import RitzSelection from '@/components/Ritz/RitzSelection';
import RitzModal from '@/components/Ritz/RitzModal';
import PackagingVersion from '@/views/packaging/PackagingVersion';
import SaveIcon from '@mui/icons-material/Save';
import { DEFAULT_SUCCESS } from '@/helpers/constants/Constants';
import DefaultLoader from '@/components/DefaultLoader';
import CircularLoader from '@/components/CircularLoader';
import FormErrorMessage from '@/components/FormErrorMessage';
import { ReactKeyHelper } from '@/helpers/KeyHelper';

const PackagingDetails = ({ packagingVersion, orderId, versionId }: any) => {
    const [isLoading, setIsLoading] = useState(true);
    const keyHelper = new ReactKeyHelper();
    const [isCircularLoader, setIsCircularLoader] = useState(false);
    const [packingMaterials, setPackingMaterials] = useState<any>([]);
    const [packagingDetails, setPackagingDetails] = useState<any>({});
    const [packagingVersionId, setPackagingVersionId] = useState<any>(packagingVersion || null);
    const [openVersionModal, setOpenVersionModal] = useState(false);
    const [selectedPackagingInstructionDeleteData, setSelectedpackagingInstructionDeleteData] = useState<any>({});
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [errorDetails, setErrorDetails] = useState<any>({});

    const fetchData = () => {
        const packagingData = {
            packaging_version_id: packagingVersionId
        }
        Promise.all([
            api.post(RestUrls.packagingDetailsURL(versionId), packagingData),
            api.get(RestUrls.packagingInstructionMaterialListURL(versionId))
        ]).then(resp => {
            const respData = resp.map((r: any) => r.data);
            const [packagingData, packingMaterials] = respData;
            setPackagingDetails({ ...packagingData })
            setPackingMaterials([...packingMaterials])
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false);
            setIsCircularLoader(false)
        });
    }

    const handleSave = () => {
        const request = {
            method: 'post',
            url: RestUrls.savePackagingDetailsURL(packagingVersionId),
            data: packagingDetails
        };
        api(request).then(() => {
            toast.success(DEFAULT_SUCCESS);
            setErrorDetails({})
            setIsCircularLoader(true)
            fetchData()
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
            setErrorDetails({...error?.response.data})
        });
    };

    const handleApprovedVersion = () => {
        const request = {
            method: 'post',
            url: RestUrls.approvedPackagingVersionURL(packagingVersionId),
            data: packagingDetails
        };
        api(request).then(() => {
            toast.success(DEFAULT_SUCCESS);
            setIsCircularLoader(true)
            fetchData()
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        });
    };

    const handleSizeClick = (countryIndex: number, instructionIndex: number, size_id: any) => {
        setPackagingDetails((prevDetails: any) => {
            const updatedDetails = { ...prevDetails };
            const sizes = updatedDetails.data[countryIndex].instructions[instructionIndex].instruction_meta_data;
            updatedDetails.data[countryIndex].instructions[instructionIndex].instruction_meta_data = sizes.map((size: { size_id: any; selected: any }) =>
                size.size_id === size_id ? { ...size, selected: !size.selected } : size
            );
            return updatedDetails;
        });
    };

    const handleColorwayChange = (countryIndex: number, instructionIndex: number, sizeIndex: number, newSelectedColorways: any) => {
        setPackagingDetails((prevDetails: any) => {
            const updatedDetails = { ...prevDetails };
            const colorways = updatedDetails.data[countryIndex].instructions[instructionIndex].instruction_meta_data[sizeIndex].colorways;
            updatedDetails.data[countryIndex].instructions[instructionIndex].instruction_meta_data[sizeIndex].colorways = colorways.map((colorway: { colorway_id: any }) => ({
                ...colorway,
                selected: newSelectedColorways.includes(colorway.colorway_id)
            }));
            return updatedDetails;
        });
    };

    const handleAddNewPack = (countryIndex: any, metaData: any) => {
        const newInstruction = {
            id: null as any,
            material: { id: packagingDetails?.data[countryIndex]?.instructions[0]?.material?.id || null }, // want to set first material
            instruction_meta_data: metaData,
        }
        setPackagingDetails((prevState: { data: any; }) => {
            const updatedData = [...prevState.data];
            updatedData[countryIndex] = {
                ...updatedData[countryIndex],
                instructions: [...updatedData[countryIndex].instructions, newInstruction]
            };
            return { ...prevState, data: updatedData };
        });

    }

    const handleChange = (countryIndex: number, instructionIndex: number, sizeIndex: number, colorwayIndex: number, field: any, value: any) => {
        setPackagingDetails((prevDetails: any) => {
            const updatedDetails = { ...prevDetails };
            const colorways = updatedDetails.data[countryIndex].instructions[instructionIndex].instruction_meta_data[sizeIndex].colorways;
            colorways[colorwayIndex] = {
                ...colorways[colorwayIndex],
                [field]: parseFloat(value) || null
            };
            return updatedDetails;
        });
    };

    const handleChangeMaterial = (event: any, countryIndex: number, instructionIndex: number) => {
        const { value } = event.target;
        setPackagingDetails((prevDetails: any) => {
            const updatedDetails = { ...prevDetails };
            updatedDetails.data[countryIndex].instructions[instructionIndex].material = { id: value };
            return updatedDetails;
        });
    };

    const isCheckData = (countryIndex: any, instructionIndex: any) => {
        const instruction = packagingDetails.data[countryIndex]?.instructions[instructionIndex];
        if (!instruction) return true;

        return instruction.instruction_meta_data.every((size: { selected: any; colorways: any[]; }) =>
            !size.selected || size.colorways.every((colorway: { selected: any; }) => !colorway.selected)
        );
    };

    const handleOpenDeleteInstructionModal = (instructionId: any, countryIndex: number, instructionIndex: number) => {
        setSelectedpackagingInstructionDeleteData({ instructionId: instructionId, countryIndex: countryIndex, instructionIndex: instructionIndex })
        setIsDeleteModalOpen(true)
      };
    
    const handleDeletePackingInstruction = () => {
        if (selectedPackagingInstructionDeleteData.instructionId) {
          api.post(RestUrls.deleteCostingPackagingInstructionDetailsURL(selectedPackagingInstructionDeleteData.instructionId)).then(() => {
            setIsCircularLoader(true);
            setIsDeleteModalOpen(false)
            fetchData()
            toast.success(DEFAULT_SUCCESS);
          }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
          }).finally();
        }
        else {
          setIsDeleteModalOpen(false)
          setPackagingDetails((prevDetails: any) => {
            const updatedDetails = { ...prevDetails };
            const country = updatedDetails.data[selectedPackagingInstructionDeleteData?.countryIndex]
            country.instructions = country.instructions.slice(0, selectedPackagingInstructionDeleteData?.instructionIndex).concat(country.instructions.slice(selectedPackagingInstructionDeleteData?.instructionIndex + 1));
            updatedDetails.data[selectedPackagingInstructionDeleteData?.countryIndex] = country;
            return updatedDetails;
        });
        }
    }

    const handleOpenVersionModal = () => {
        setOpenVersionModal(true)
    }

    const handleLoadPackaging = (packagingId: any) => {
        setPackagingVersionId(packagingId)
        setIsCircularLoader(true)
        setOpenVersionModal(false)
    }

    const checkColorwayStatus = (countryIndex: number, sizeId: number, colorwayId: number) => {
        const instructions = packagingDetails.data[countryIndex]?.instructions;
        if (instructions && instructions.length > 0) {
          for (const instruction of instructions) {
            const instructionMetaData = instruction?.instruction_meta_data;
            if (instructionMetaData) {
              const size = instructionMetaData.find((item: any) => item.size_id === sizeId);
              if (size) {
                const colorway = size.colorways.find((cw: any) => cw.colorway_id === colorwayId);
                if (colorway) {
                  if (colorway.selected === true) {
                    return true;
                  }
                }
              }
            }
          }
        }
      };
    
      const handleHideTable = (countryIndex: number, sizeId: number): boolean => {
        const instructions = packagingDetails.data[countryIndex]?.instructions;
        if (instructions && instructions.length > 0) {
          for (const instruction of instructions) {
            const instructionMetaData = instruction?.instruction_meta_data;
            if (instructionMetaData) {
              const size = instructionMetaData.find((item: any) => item.size_id === sizeId);
              if (size) {
                const allColorwaysHidden = size.colorways.every((colorway: any) =>
                  !colorway.selected && checkColorwayStatus(countryIndex, sizeId, colorway.colorway_id)
                );
                if (allColorwaysHidden) {
                  return true; 
                }
              }
            }
          }
        }
        return false;
      };
    const hasUnselectedColorways = (colorways: any) => {
        return colorways.some((cw: { selected: any; }) => cw.selected);
    };

    useEffect(() => {
        packagingDetails?.data?.map((country: any, countryIndex: any) => {
            if (country?.instructions?.length === 0) {
                handleAddNewPack(countryIndex, country.meta_data);
            }
        });
    }, [packagingDetails]);

    useEffect(() => {
        if (versionId) {
            fetchData();
        }
    }, [versionId, packagingVersionId]);

    return (
        <>
            {openVersionModal && (
                <RitzModal open={openVersionModal} title={"Select Packaging Version"} onClose={() => setOpenVersionModal(false)}>
                    <PackagingVersion orderId={orderId} versionId={versionId} selectedPackagingVersion={packagingDetails?.packaging_version_id} setOpen={setOpenVersionModal} setVersionUpdated={false} loadPackagingVersion={handleLoadPackaging} />
                </RitzModal>
            )}

            {isDeleteModalOpen && (
                <RitzModal
                    open={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    maxWidth='xs'
                    title='Confirm Delete'
                >
                    <>
                        <Box>
                            <Typography>Are you sure you want to delete this file?</Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'end', mt: 3 }}>
                                <Button variant='contained' onClick={handleDeletePackingInstruction} color='error'>Delete</Button>
                            </Box>
                        </Box>
                    </>
                </RitzModal>
            )}

            {isCircularLoader && <CircularLoader />}

            {isLoading ? <DefaultLoader /> :
                <React.Fragment>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Button variant="contained" color="primary" onClick={() => handleOpenVersionModal()}>P/V : {packagingDetails?.display_name}</Button>
                            {!packagingDetails?.current_version && (
                                <Button variant="contained" sx={{ ml: 1 }} color="primary" onClick={() => handleApprovedVersion()}>Approved</Button>
                            )}
                        </Box>
                    </Box>

                    {packagingDetails?.data?.map((country: any, countryIndex: any) => (
                        <React.Fragment  key={`${keyHelper.getNextKeyValue()}`}>
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Box sx={{ color: 'primary.main' }}>
                                    <Typography sx={{ fontSize: '1.5rem', fontWeight: 'bold' }} color='primary'>
                                        {country.name}
                                    </Typography>
                                </Box>
                                <Box sx={{ color: 'error.main' }}>
                                    <Button variant="outlined" onClick={() => handleAddNewPack(countryIndex, country.meta_data)}> Add New Pack</Button>
                                </Box>
                            </Box>
                            <Box sx={{ mb: 1, p: 1 }}>
                                {country?.instructions?.length == 0 ? (
                                    <Alert color="info" sx={{ mt: 1 }}>
                                        There are no packs details related to this country. Please add a new pack.
                                    </Alert>
                                ) : (
                                    <>
                                        {country?.instructions?.map((instruction: any, instructionIndex: any) => {
                                            return (
                                                <React.Fragment key={`${keyHelper.getNextKeyValue()}`}>
                                                    <Grid container spacing={2} key={`${keyHelper.getNextKeyValue()}`}>
                                                        {instruction.instruction_meta_data?.map((size: any, sizeIndex: any) => (
                                                            <React.Fragment key={`${keyHelper.getNextKeyValue()}`}>
                                                            {size.selected || !handleHideTable(countryIndex, size.size_id) ? (
                                                                <Grid item xs={12} sm={6} md={4} lg={3}  key={`${keyHelper.getNextKeyValue()}`}>
                                                                    <Table>
                                                                        <TableHead>
                                                                            <TableRow>
                                                                                <TableCell
                                                                                    onClick={() => { if (!hasUnselectedColorways(size.colorways)) {handleSizeClick(countryIndex, instructionIndex, size.size_id); } }}
                                                                                    sx={{
                                                                                        border: (theme) => `1px solid ${theme.palette.grey[200]}`,
                                                                                        textAlign: 'center',
                                                                                        cursor: !hasUnselectedColorways(size.colorways) ? 'pointer' : 'default',
                                                                                        backgroundColor: size.selected ? '#edf4fb' : 'transparent',
                                                                                    }}
                                                                                >
                                                                                    <Typography variant="h6" color='#1976d2'>{size.size}</Typography>
                                                                                </TableCell>
                                                                            </TableRow>
                                                                        </TableHead>
                                                                        <TableBody>
                                                                            <TableRow>
                                                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                                                    <ToggleButtonGroup
                                                                                        color="primary"
                                                                                        value={size.colorways.filter((cw: any) => cw.selected).map((cw: any) => cw.colorway_id) || []}
                                                                                        onChange={(event, newColorways) => handleColorwayChange(countryIndex, instructionIndex, sizeIndex, newColorways)}
                                                                                        aria-label={`${size.size} colorways`}
                                                                                        sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}
                                                                                        disabled={!size.selected}
                                                                                    >
                                                                                        {size.colorways.map((colorway: any, colorwayIndex: any) => {
                                                                                            if (!colorway.selected && checkColorwayStatus(countryIndex, size.size_id, colorway.colorway_id)) {
                                                                                                return null;
                                                                                            }
                                                                                            return (
                                                                                                <ToggleButton
                                                                                                    style={{
                                                                                                        height: '4em',
                                                                                                        border: '1px solid #E0E0E0',
                                                                                                        borderRadius: '5px',
                                                                                                        display: 'flex',
                                                                                                        justifyContent: 'center',
                                                                                                        alignItems: 'center',
                                                                                                        textAlign: 'center',
                                                                                                        marginBottom: '10px',
                                                                                                    }}
                                                                                                    key={`${keyHelper.getNextKeyValue()}`}
                                                                                                    value={colorway.colorway_id}
                                                                                                    disabled={!colorway.selected && checkColorwayStatus(countryIndex, size.size_id, colorway.colorway_id)}
                                                                                                >
                                                                                                    {colorway.name}
                                                                                                </ToggleButton>
                                                                                            );
                                                                                        })}
                                                                                    </ToggleButtonGroup>
                                                                                </TableCell>
                                                                            </TableRow>
                                                                        </TableBody>
                                                                    </Table>
                                                                </Grid>
                                                                ): null}
                                                            </React.Fragment>
                                                        ))}
                                                    </Grid>
                                                    {isCheckData(countryIndex, instructionIndex) ? (
                                                        <Alert color="info" sx={{ mt: 1 }}>
                                                            Please select at least one size and the corresponding colorways to display the packing matrix.
                                                        </Alert>
                                                    ) : (
                                                        <>
                                                            <Box sx={{ mt: 1 }}><Typography variant='h6' sx={{ fontWeight: 'bold' }} color={'primary'}>Packing Matrix :</Typography></Box>
                                                            <Box sx={{ mt: 1, mb: 2, width: '25%' }}>
                                                                <Typography sx={{ fontWeight: 'bold', mb: 1 }}>Material</Typography>
                                                                <RitzSelection
                                                                    id={'material'}
                                                                    name={'material'}
                                                                    optionValue={'id'}
                                                                    optionText={'name'}
                                                                    selectedValue={instruction?.material?.id || ''}
                                                                    isRequired={true}
                                                                    options={packingMaterials}
                                                                    handleOnChange={(event: any) => handleChangeMaterial(event, countryIndex, instructionIndex)}
                                                                />
                                                                 <FormErrorMessage message={errorDetails?.material_errors?.[country.id]?.[instructionIndex]} />
                                                            </Box>
                                                            <Box sx={{ mt: 1 }}>
                                                                <Table sx={{ width: '50%' }}>
                                                                    <TableHead>
                                                                        <TableRow>
                                                                            <TableCell sx={{ borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Size</TableCell>
                                                                            <TableCell sx={{ borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Colorway</TableCell>
                                                                            <TableCell sx={{ borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Quantity</TableCell>
                                                                            <TableCell sx={{ borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Ratio</TableCell>
                                                                        </TableRow>
                                                                    </TableHead>
                                                                    <TableBody>
                                                                        {instruction.instruction_meta_data.map((size: any, sizeIndex: any) => {
                                                                            if (!size.selected) return null;
                                                                            return size.colorways.map((colorway: any, colorwayIndex: any) => (
                                                                                colorway.selected && (
                                                                                    <TableRow key={`${keyHelper.getNextKeyValue()}`}>
                                                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{size.size}</TableCell>
                                                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{colorway.name}</TableCell>
                                                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                                                            <TextField
                                                                                                id={`quantity-${size.size_id}-${colorway.colorway_id}`}
                                                                                                fullWidth
                                                                                                autoComplete="off"
                                                                                                name="quantity"
                                                                                                value={colorway.quantity || ''}
                                                                                                onChange={(e) => handleChange(countryIndex, instructionIndex, sizeIndex, colorwayIndex, 'quantity', e.target.value)}
                                                                                                type="number"
                                                                                            />
                                                                                            <FormErrorMessage message={errorDetails?.size_quantity_errors?.[country.id]?.[instructionIndex]?.[size.size_id]?.[colorway.colorway_id]?.quantity} />
                                                                                        </TableCell>
                                                                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                                                            <TextField
                                                                                                id={`ratio-${size.size_id}-${colorway.colorway_id}`}
                                                                                                fullWidth
                                                                                                autoComplete="off"
                                                                                                name="ratio"
                                                                                                value={colorway.ratio || ''}
                                                                                                onChange={(e) => handleChange(countryIndex, instructionIndex, sizeIndex, colorwayIndex, 'ratio', e.target.value)}
                                                                                                type="number"
                                                                                            />
                                                                                            <FormErrorMessage message={errorDetails?.size_quantity_errors?.[country.id]?.[instructionIndex]?.[size.size_id]?.[colorway.colorway_id]?.ratio} />
                                                                                        </TableCell>
                                                                                    </TableRow>
                                                                                )
                                                                            ));
                                                                        })}
                                                                    </TableBody>
                                                                </Table>
                                                            </Box>
                                                        </>
                                                    )}
                                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                        <Tooltip title="Save Pack" arrow>
                                                            <IconButton
                                                                color="primary"
                                                                onClick={handleSave}
                                                            >
                                                                <SaveIcon fontSize="inherit" color='success' />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Delete Pack" arrow>
                                                            <IconButton
                                                                color="error"
                                                                onClick={() => handleOpenDeleteInstructionModal(instruction.id,countryIndex, instructionIndex)}
                                                            >
                                                                <DeleteForeverIcon fontSize='inherit' />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Box>
                                                    <Divider sx={{ mt: 1, mb: 2 }} />
                                                </React.Fragment>
                                            )
                                        })}
                                    </>
                                )}
                            </Box>
                        </React.Fragment>
                    ))}

                </React.Fragment>
            }
        </>
    );
};

export default PackagingDetails;