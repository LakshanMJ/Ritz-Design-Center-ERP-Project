import RitzSelection from '@/components/Ritz/RitzSelection';
import { Box, Button, Checkbox, TextField } from '@mui/material';
import React, { useEffect, useState } from 'react';
import * as RestUrls from '@/helpers/constants/rest_urls/MaterialAdministrationUrls';
import { Typography } from '@mui/material';
import { materialDetailURL } from '@/helpers/constants/front_end/AdminUrls';
import router from 'next/router';
import SaveSpinner from '@/components/SaveSpinner';
import api from '@/services/api';
import { toast } from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';
import { DEFAULT_SUCCESS, VALIDATION_ERROR_CODE } from '@/helpers/constants/Constants';
import RitzModal from '@/components/Ritz/RitzModal';
import DefaultLoader from '@/components/DefaultLoader';
import FormErrorMessage from '@/components/FormErrorMessage';

const AddMaterial = ({
    open,
    onClose,
    action='',
    materialId,
    refreshData
}: any) => {
    const [material, setMaterial] = useState<any>({ category: '', material: '',  consumption_measurement_unit:'',  estimated_consumption_ratio_units:'', has_shade:false, size_dependent:false });
    const [measuringUnits, setMeasuringUnits] = useState<any>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isForwardTo, setIsForwardTo] = useState(false);
    const [materialError, setMaterialError] = useState<any>({
        category: '',
        material: '',
        name: '',
        consumption_measurement_unit: '',
        estimated_consumption_ratio_units: ''
    });
    //TO Do pending API
    const dummycategory = [
        { id: 'sewing_trim', name: 'Sewing Trims' },
        { id: 'packaging_trim', name: 'Packaging' },
        { id: 'fabric', name: 'Fabric' },
    ];

    const handleNextStep = () => {
        setIsForwardTo(true);
        try {
            router.push(materialDetailURL(materialId));
        } finally {
            setTimeout(() => {
                setIsForwardTo(false);
            }, 100);
        }
    };

    const handleChangeCreateCategory = (event: any) => {
        const { name, value } = event.target;
        setMaterial({ ...material, [name]: value });
        setMaterialError((prevError: any) => ({ ...prevError, [name]: '' }));
    };

    const handleSaveMaterial = () => {
        setMaterialError({});
        setIsSaving(true);

        const request = {
            method: materialId === 0 ? 'post' : 'put',
            url: materialId === 0 ? RestUrls.createMaterialURL() : RestUrls.updateMaterialURL(materialId),
            data: material
        };

        api(request).then(() => {
            toast.success(DEFAULT_SUCCESS);
            onClose();
            refreshData();
        }).catch((error) => {
            toast.error(getDefaultError(error?.response?.status));
            if (error.response.status == VALIDATION_ERROR_CODE && error?.response?.data) {
                const errorMsg = error.response.data;
                setMaterialError(errorMsg);
            }
        }).finally(() => {
            setIsSaving(false);
        });
    };

    const getData = () => {
        setIsLoading(true);

        let requests = [
            api.get(RestUrls.getDefaultMeasuringUnitsURL())
        ]
        if (materialId) {
            requests.push(api.get(RestUrls.getMaterialDetailURL(+materialId)));
        }

        Promise.all(requests).then(resp => {
            const respData = resp.map((r: any) => r.data);
            const [measure, material] = respData;

            setMeasuringUnits(measure || {});
            if (material) {
                setMaterial(material || {});
            }
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false);
        });
    }

    useEffect(() => {
        getData();
    }, []);

    return (
        <RitzModal open={open} onClose={onClose} title={action === 'add' ? 'Add Material' : 'Edit Material'}>
            {isLoading ? <DefaultLoader/> : (
            <>
                <Box marginBottom={3}>
                    <Typography style={{ fontWeight: 'bold', marginBottom: '10px' }}>
                        Category Type
                    </Typography>
                    <RitzSelection
                        id="category"
                        name="category"
                        optionValue="id"
                        optionText="name"
                        selectedValue={material?.category || ''}
                        isRequired={true}
                        options={dummycategory}
                        handleOnChange={handleChangeCreateCategory}
                        // error={materialError.category !== ''}
                        helperText={materialError.category}
                        style={{ marginTop: '10px' }}
                        fullWidth
                    />
                    {materialError.category && <FormErrorMessage message={materialError.category} />}
                </Box>
                <Box marginBottom={3}>
                    <Typography style={{ fontWeight: 'bold' }}>Material Name</Typography>
                    <TextField
                        id="material"
                        type="text"
                        value={material?.material || ''}
                        name="material"
                        required
                        onChange={handleChangeCreateCategory}
                        // error={materialError.material !== ''}
                        // helperText={materialError.material}
                        style={{ marginTop: '10px' }}
                        fullWidth
                    />
                    {materialError.material && <FormErrorMessage message={materialError.material} />}
                </Box>
                <Box marginBottom={3}>
                    <Typography style={{ fontWeight: 'bold', marginBottom: '10px' }}>Measuring Units</Typography>
                    <RitzSelection
                        id="consumption_measurement_unit"
                        name="consumption_measurement_unit"
                        optionValue="id"
                        optionText="name"
                        selectedValue={material?.consumption_measurement_unit || ''}
                        isRequired={true}
                        options={measuringUnits}
                        handleOnChange={handleChangeCreateCategory}
                        // error={materialError.consumption_measurement_unit !== ''}
                        helperText={materialError.consumption_measurement_unit}
                        style={{ marginTop: '10px' }}
                        fullWidth
                    />
                    {materialError.consumption_measurement_unit && <FormErrorMessage message={materialError.consumption_measurement_unit} />}
                </Box>
                <Box marginBottom={3}>
                <Typography style={{ fontWeight: 'bold', marginTop: '15px' }}>Estimated Consumption Ratio Units</Typography>
                            <TextField
                                id="estimated_consumption_ratio_units"
                                type='text'
                                value={material.estimated_consumption_ratio_units ||''}
                                name="estimated_consumption_ratio_units"
                                required
                                onChange={handleChangeCreateCategory}
                                style={{ marginTop: '25px' }}
                                fullWidth
                            />
                </Box>
                <Box marginBottom={3}>
                <Typography style={{ fontWeight: 'bold', marginTop: '15px' }}>Display Order</Typography>
                            <TextField
                                id="display_order"
                                type='text'
                                value={material.display_order ||''}
                                name="display_order"
                                required
                                onChange={handleChangeCreateCategory}
                                style={{ marginTop: '25px' }}
                                fullWidth
                            />
                </Box>
                <Box marginBottom={1}>
                        <Typography style={{ fontWeight: 'bold', marginTop: '15px' }}>
                            <Checkbox checked={material?.has_shade || false} name="has_shade" onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                                setMaterial({ ...material, [event.target.name]: event.target.checked });
                            }} />
                           Has Shade
                        </Typography>
                </Box>
                <Box marginBottom={1}>
                        <Typography style={{ fontWeight: 'bold', marginTop: '15px' }}>
                            <Checkbox checked={material?.size_dependent || false} name="size_dependent" onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                                setMaterial({ ...material, [event.target.name]: event.target.checked });
                            }} />
                           Size Dependent
                        </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button variant="contained" onClick={() => handleSaveMaterial()} disabled={isSaving}>
                        {isSaving && <SaveSpinner />}
                        Save
                    </Button>
                </Box>
            </>
            )}
        </RitzModal>
    );
};

export default AddMaterial;
