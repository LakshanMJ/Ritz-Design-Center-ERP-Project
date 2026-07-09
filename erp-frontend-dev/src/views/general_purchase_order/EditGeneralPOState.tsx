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

const EditGeneralPOState = ({ generalPoId, currentState, currentPlant, setChanged, modalType }: any) => {

    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [poClubStates, setPoClubStates] = useState([]);
    const [plantDetails, setPlantDetails] = useState([]);
    const [poClubStateValues, setPoClubStateValues] = useState({
        new_state: currentState,
        plant_id: '',
        modal: modalType
    });
    const canEdit = hasRole(MERCHANT_ADMIN);
    
    const getAllPoClubStates = () => {
      const requests = [
        api.get(generalPoStatesURL()),
        api.get(plantsURL()),
      ]
      Promise.all(requests).then(response => {
        const [metaData, plantDetails] = response.map((r: any) => r.data);
        setPoClubStates([...metaData.states]);
        setPlantDetails([...plantDetails])
      }).catch(error => {
        toast.error(getDefaultError(error?.response?.status));
      }).finally(() => {
        setIsLoading(false);
      });
    };

    const handleSelectChangeState = (event: any) => {
        setPoClubStateValues({ ...poClubStateValues, [event.target.name]: event.target.value });
    };

    const handleSave = () => {
        setIsUpdating(true)
        const request = {
            method: 'post',
            url: generalPOStateUpdateURL(generalPoId),
            data: poClubStateValues
        };

        api(request).then((resp) => {
            const resdata = resp?.data || [];
            if(resdata.status){
                setChanged()
            }
        }).catch(error => {
            toast.error(error?.response?.data?.errors);
        }).finally(() => setIsUpdating(false));
    }

    useEffect(() => {
        getAllPoClubStates();
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
                selectedValue={poClubStateValues.new_state || currentState}
                isRequired={true}
                options={poClubStates}
                handleOnChange={handleSelectChangeState}
                isReadOnly={!canEdit}
            />
            </Box> 
            <Box sx={{ mb: 3 }}>
            <InputLabel sx={{ mb: 1 }} >Plant</InputLabel>
            <RitzSelection
                id={'plant'}
                name={'plant_id'}
                optionValue={'id'}
                optionText={'name'}
                selectedValue={poClubStateValues.plant_id || currentPlant}
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

export default EditGeneralPOState