import DefaultLoader from '@/components/DefaultLoader'
import RitzSelection from '@/components/Ritz/RitzSelection';
import { getDefaultError, hasRole } from '@/helpers/Utilities';
import api from '@/services/api';
import { Box, Button, InputLabel } from '@mui/material';
import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast';
import SaveSpinner from '@/components/SaveSpinner';
import { DEFAULT_SUCCESS } from '@/helpers/constants/Constants';
import { generalPoStatesURL, generalPOStateUpdateURL, poClubEditStateURL, stateDropDownOptionListURL } from '@/helpers/constants/rest_urls/POUrls';
import { plantsURL } from '@/helpers/constants/rest_urls/TransportUrls';
import { MERCHANT_ADMIN } from '@/helpers/constants/RoleManager';
import { leftoverVerificationStateDetailsURL, leftoverVerificationStateChangeURL, plantWarehouseListURL } from '@/helpers/constants/rest_urls/GrnUrls';

const EditLeftoverVerificationState = ({ verificationId, currentState, currentPlant, setChanged }: any) => {

    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [leftoverVerificationStates, setLeftoverVerificationStates] = useState([]);
    const [plantDetails, setPlantDetails] = useState([]);
    const [leftoverVerificationValues, setLeftoverVerificationValues] = useState({
        new_state: currentState,
        plant_warehouse_id: currentPlant,
    });
    const canEdit = hasRole(MERCHANT_ADMIN);
    
    const getAllVerificationStates = () => {
      const requests = [
        api.get(leftoverVerificationStateDetailsURL()),
        api.get(plantWarehouseListURL()),
      ]
      Promise.all(requests).then(response => {
        const [metaData, plantDetails] = response.map((r: any) => r.data);
        setLeftoverVerificationStates([...metaData]);
        setPlantDetails([...plantDetails])
      }).catch(error => {
        toast.error(getDefaultError(error?.response?.status));
      }).finally(() => {
        setIsLoading(false);
      });
    };

    const handleSelectChangeState = (event: any) => {
        setLeftoverVerificationValues({ ...leftoverVerificationValues, [event.target.name]: event.target.value });
    };

    const handleSave = () => {
        setIsUpdating(true)
        const request = {
            method: 'post',
            url: leftoverVerificationStateChangeURL(verificationId),
            data: leftoverVerificationValues
        };

        api(request).then((resp) => {
            const resdata = resp?.data || [];
             setChanged()
        }).catch(error => {
            toast.error(error?.response?.data?.errors);
        }).finally(() => setIsUpdating(false));
    }

    useEffect(() => {
        getAllVerificationStates();
    }, []);
    
    return (
     <>
      {isLoading ? (
                  <DefaultLoader />
              ) : (
        <>
            <Box sx={{ mb: 3 }}>
            <InputLabel sx={{ mb: 1 }} >State</InputLabel>
            <RitzSelection
                id={'new_state'}
                name={'new_state'}
                optionValue={'id'}
                optionText={'name'}
                selectedValue={leftoverVerificationValues?.new_state || currentState}
                isRequired={true}
                options={leftoverVerificationStates}
                handleOnChange={handleSelectChangeState}
                isReadOnly={!canEdit}
            />
            </Box> 
            <Box sx={{ mb: 3 }}>
            <InputLabel sx={{ mb: 1 }} >Plant / Warehouse</InputLabel>
            <RitzSelection
                id={'plant_warehouse_id'}
                name={'plant_warehouse_id'}
                optionValue={'id'}
                optionText={'name'}
                selectedValue={leftoverVerificationValues?.plant_warehouse_id || currentPlant}
                isRequired={true}
                options={plantDetails}
                handleOnChange={handleSelectChangeState}
            />
            </Box> 
            <Box style={{ display: 'flex', justifyContent: 'end' }}>
                <Button variant="contained" color="primary" onClick={handleSave} disabled={isUpdating}>
                    {isUpdating && <SaveSpinner />}Update
                </Button>
            </Box> 
        </>  
      )}
     </>
    )
}

export default EditLeftoverVerificationState