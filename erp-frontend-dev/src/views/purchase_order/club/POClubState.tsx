import DefaultLoader from '@/components/DefaultLoader'
import RitzSelection from '@/components/Ritz/RitzSelection';
import { getDefaultError } from '@/helpers/Utilities';
import api from '@/services/api';
import { Box, Button, InputLabel } from '@mui/material';
import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast';
import * as POUrls from '../../../helpers/constants/rest_urls/POUrls';
import SaveSpinner from '@/components/SaveSpinner';
import { DEFAULT_SUCCESS } from '@/helpers/constants/Constants';

const POState = ({poclubId, currentState, setChanged}: any) => {

    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [poClubStates, setPoClubStates] = useState([]);
    const [poClubStateValues, setPoClubStateValues] = useState({
        new_state: currentState,
    });

    const getAllPoClubStates = () => {
        setIsLoading(true);
        api.get(POUrls.stateDropDownOptionListURL('ActualPOClub')).then(resp => {
            const resdata = resp?.data || [];
            setPoClubStates([...resdata]);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoading(false));
    };

    const handleSelectChangeState = (event: any) => {
        setPoClubStateValues({ ...poClubStateValues, new_state: event.target.value });
    };

    const handleSave = () => {
        setIsUpdating(true)
        const request = {
            method: 'post',
            url: POUrls.poClubEditStateURL(poclubId),
            data: poClubStateValues
        };

        api(request).then((resp) => {
            const resdata = resp?.data || [];
            if(resdata.status === "Updated"){
                setPoClubStateValues({new_state: currentState,})
                toast.success(DEFAULT_SUCCESS);
                setChanged(true)
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
            <InputLabel sx={{ mb: 1 }} >Purchase Order Club State</InputLabel>
            <RitzSelection
                id={'id'}
                name={'name'}
                optionValue={'value'}
                optionText={'display_value'}
                selectedValue={poClubStateValues.new_state || currentState}
                isRequired={true}
                options={poClubStates}
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

export default POState