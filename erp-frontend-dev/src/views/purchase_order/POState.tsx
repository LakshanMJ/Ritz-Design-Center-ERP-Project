import DefaultLoader from '@/components/DefaultLoader'
import RitzSelection from '@/components/Ritz/RitzSelection';
import { getDefaultError } from '@/helpers/Utilities';
import api from '@/services/api';
import { Box, Button, InputLabel } from '@mui/material';
import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast';
import * as POUrls from '../../helpers/constants/rest_urls/POUrls';
import * as RestUrls from '../../helpers/constants/RestUrls';
import SaveSpinner from '@/components/SaveSpinner';
import { DEFAULT_SUCCESS } from '@/helpers/constants/Constants';
import RitzMultiSelectCheckBox from '@/components/Ritz/RitzMultiSelectCheckBox';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from "dayjs";

const POState = ({purchaseOrderId, currentState, currentWatchList, productionDates, setChanged}: any) => {
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [poStates, setPoStates] = useState([]);
    const [poStateValues, setPoStateValues] = useState<any>({
        new_state: currentState,
        factory: ''
    });
    const [users, setUsers] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState<any>([...currentWatchList]);
    const [factories,setFactories] = useState([]);

    const getAllPoStates = () => {
        setIsLoading(true);
        const requests = [
            api.get(POUrls.stateDropDownOptionListURL('PurchaseOrder')),
            api.get(RestUrls.usersURL()),
            api.get(POUrls.factoryListURL()),
        ];
        Promise.all(requests).then(resp => {
            const respData = resp.map((r: any) => r.data);
            const [poStates, users, factories] = respData;
            setPoStates([...poStates]);
            setUsers(users)
            setFactories(factories)
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoading(false));

    };
    
    const handleSelectChangeState = ( value: any, field: any) => {
        setPoStateValues({ ...poStateValues, [field]: value });
    };

    const handleSave = () => {
        setIsUpdating(true)

        const versionStateData = {
            new_state: poStateValues.new_state,
            watchlist: selectedUsers,
            factories: poStateValues.factory,
            production_start_date: poStateValues.production_start_date || productionDates?.production_start_date ,
            production_end_date: poStateValues.production_end_date || productionDates?.production_end_date ,
            production_cut_date: poStateValues.production_cut_date || productionDates?.production_cut_date ,
            ex_factory_date: poStateValues.ex_factory_date || productionDates?.ex_factory_date ,
        }

        const request = {
            method: 'post',
            url: RestUrls.changePurchaseOrderStateURL(purchaseOrderId),
            data: versionStateData
        };

        api(request).then(() => {
            setPoStateValues
            toast.success(DEFAULT_SUCCESS);
            setChanged(true)
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsUpdating(false));
    }
    const handleOnChangeSelectPack = (event: any, data: any, reason: any) => {
        data.forEach((d: any) => d.size = d.id);
        const userIds = data.map((size: any) => size.id);
        setSelectedUsers(userIds);
    }

    useEffect(() => {
        getAllPoStates();
    }, []);
    
    return (
     <>
      {isLoading ? (
                  <DefaultLoader />
              ) : (
        <>
            <Box sx={{ mb: 3 }}>
            <InputLabel sx={{ mb: 1 }} >Purchase Order State</InputLabel>
            <RitzSelection
                id={'new_state'}
                name={'new_state'}
                optionValue={'value'}
                optionText={'display_value'}
                selectedValue={poStateValues.new_state || currentState}
                isRequired={true}
                options={poStates}
                handleOnChange={(event: any)=>{handleSelectChangeState(event.target.value, 'new_state')}}
            />
            </Box> 
            <Box sx={{ mb: 3 }}>
                <InputLabel sx={{ mb: 1 }} >WatchList</InputLabel>
                    <RitzMultiSelectCheckBox
                        id={'users'}
                        selectOptions={users}
                        optionValue={'id'}
                        optionDisplayValue={'username'}
                        handleOnChange={handleOnChangeSelectPack}
                        selectedValues={selectedUsers || ''}
                        handleOnClose={() => console.log('todo remove this')}
                    />
            </Box>
            
            <Box sx={{ mb: 3 }}>
                <InputLabel sx={{ mb: 1 }} >Factory</InputLabel>
                    <RitzSelection
                        id={'factory'}
                        name={'factory'}
                        optionValue={'id'}
                        optionText={'name'}
                        selectedValue={poStateValues.factory}
                        isRequired={true}
                        options={factories}
                        handleOnChange={(event: any)=>{handleSelectChangeState(event.target.value, 'factory')}}
                    />
            </Box>
            <Box sx={{ mb: 3 }}>
                <InputLabel sx={{ mb: 1 }} >Production Cut Date (PCD)</InputLabel>
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <DatePicker
                            minDate={dayjs(Date.now())}
                            format='DD/MM/YYYY'
                            value={poStateValues.production_cut_date ? dayjs(poStateValues.production_cut_date) : dayjs(productionDates?.production_cut_date)}
                            onChange={(event: any) => handleSelectChangeState(dayjs(event.$d).format('YYYY-MM-DD') , 'production_cut_date')}
                        />
                    </LocalizationProvider>
            </Box>
            <Box sx={{ mb: 3 }}>
                <InputLabel sx={{ mb: 1 }} >Production Start Date (PSD)</InputLabel>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <DatePicker
                            minDate={dayjs(Date.now())}
                            format='DD/MM/YYYY'
                            value={poStateValues.production_start_date ? dayjs(poStateValues.production_start_date) : dayjs(productionDates?.production_start_date)}
                            onChange={(event: any) => handleSelectChangeState(dayjs(event.$d).format('YYYY-MM-DD') , 'production_start_date')}
                        />
                    </LocalizationProvider>
            </Box>
            <Box sx={{ mb: 3 }}>
                <InputLabel sx={{ mb: 1 }} >Production End Date (PED)</InputLabel>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <DatePicker
                            minDate={dayjs(Date.now())}
                            format='DD/MM/YYYY'
                            value={poStateValues.production_end_date ? dayjs(poStateValues.production_end_date) : dayjs(productionDates?.production_end_date)}
                            onChange={(event: any) => handleSelectChangeState(dayjs(event.$d).format('YYYY-MM-DD') , 'production_end_date')}
                        />
                    </LocalizationProvider>
            </Box>
            <Box sx={{ mb: 3 }}>
                <InputLabel sx={{ mb: 1 }} >Ex Factory Date</InputLabel>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                        <DatePicker
                            minDate={dayjs(Date.now())}
                            format='DD/MM/YYYY'
                            value={poStateValues.ex_factory_date ? dayjs(poStateValues.ex_factory_date) : dayjs(productionDates?.ex_factory_date)}
                            onChange={(event: any) => handleSelectChangeState(dayjs(event.$d).format('YYYY-MM-DD'), 'ex_factory_date')}
                        />
                </LocalizationProvider>
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