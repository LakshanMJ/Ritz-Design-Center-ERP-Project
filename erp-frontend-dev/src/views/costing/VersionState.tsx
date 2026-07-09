import React, { useEffect, useState } from 'react'
import DefaultLoader from '@/components/DefaultLoader'
import { Box, Button, Card, CardContent, CardHeader, Checkbox, FormControlLabel, IconButton, InputLabel, List, ListItem, ListItemText, Paper, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography, darken } from '@mui/material'
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import api from "@/services/api";
import * as RestUrls from '../../helpers/constants/RestUrls';
import toast from 'react-hot-toast';
import { getDefaultError, hasRole, hasRoleMultiple } from '@/helpers/Utilities';
import { grey } from '@mui/material/colors';
import { orderSummaryVersionURL } from '@/helpers/constants/FrontEndUrls';
import { useRouter } from 'next/router';
import RitzInput from '@/components/Ritz/RitzInput';
import RitzTable from '@/components/Ritz/RitzTable';
import { ColumnDef } from '@tanstack/react-table';
import RitzSelection from '@/components/Ritz/RitzSelection';
import { DemoContainer } from '@mui/x-date-pickers/internals/demo';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import SaveSpinner from '@/components/SaveSpinner';
import RitzSwitch from '@/components/Ritz/RitzSwitch';
import dayjs from "dayjs";
import { DEFAULT_SUCCESS } from '@/helpers/constants/Constants';
import { ADMIN, BUSINESS_ADMIN, MERCHANT_ADMIN } from '@/helpers/constants/RoleManager';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import RitzMultiSelectCheckBox from '@/components/Ritz/RitzMultiSelectCheckBox';
import FormErrorMessage from '@/components/FormErrorMessage';



const VersionNavigation = ({ orderId, setOpen, versionId }: any) => {

    const earningsPerMinuteKey = 'earnings_per_minute';
    const fabricFinanceCostPercentageKey = 'fabric_finance_cost_percentage';
    const buyerCommissionPercentageKey = 'buyer_commission_percentage';
    const trimFinanceCostPercentageKey = 'trim_finance_cost_percentage';
    const serviceFinanceCostPercentageKey = 'service_finance_cost_percentage';
    const expirationDate ='expiration_date';
    const approvedDateKey ='approved_date';
    const router = useRouter();
    const canEdit = hasRoleMultiple([MERCHANT_ADMIN]);
    const canEditBusinessAdmin = hasRole(BUSINESS_ADMIN);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingPackDetails, setIsLoadingPackDetails] = useState(true);
    const [editVersionId, setEditVersionId] = useState(0);
    const [versionStates, setVersionStates] = useState([]);
    const [isChecked, setIsChecked] = useState(false);
    const [isLockFinance, setIsLockFinance] = useState(false);
    const [stateValues, setStateValues] = useState<any>({
        state: '',
        [expirationDate]: '',
        [earningsPerMinuteKey]: '',
        [fabricFinanceCostPercentageKey]: '',
        [buyerCommissionPercentageKey]: '',
        [trimFinanceCostPercentageKey]: '',
        [serviceFinanceCostPercentageKey]: '',
        approved: false,
        [approvedDateKey]:''
    });
    const [packData, setPackData] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState<any>([]);
    const [errors, setErrors] = useState<any>({});
  
    const getVersionStates = () => {
        setIsLoading(true);
        setIsLoadingPackDetails(true);
        const requests = [
            api.get(RestUrls.versionStatesURL()),
            api.get(RestUrls.updateDetailVersionURL(orderId, versionId)),
            api.get(RestUrls.usersURL()),
        ];

        Promise.all(requests).then(resp => {
            const respData = resp.map((r: any) => r.data);
            const [versionStates, versionData, users] = respData;

            setVersionStates([...versionStates]);
            setStateValues({
                state: versionData.version_state?.value,
                [expirationDate]: versionData[expirationDate],
                [earningsPerMinuteKey]: versionData[earningsPerMinuteKey],
                [fabricFinanceCostPercentageKey]: versionData[fabricFinanceCostPercentageKey],
                [buyerCommissionPercentageKey]: versionData[buyerCommissionPercentageKey] ,
                [trimFinanceCostPercentageKey]: versionData[trimFinanceCostPercentageKey],
                [serviceFinanceCostPercentageKey]: versionData[serviceFinanceCostPercentageKey],
                approved: versionData.approved,
                [approvedDateKey]: versionData[approvedDateKey]

            });

            setPackData(versionData.packs)
            setIsLockFinance(versionData.lock_finance_editing)
            setIsChecked(versionData.pack_item_level_administrative_costs)
            setUsers(users)
            setSelectedUsers([...versionData.watchlist])

        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false)
            setIsLoadingPackDetails(false);
        });
    };

    const handleSave = () => {
        let packDetails
        if(isChecked){
            packDetails=packData;
        }
        else{
            packDetails=[]
        }
        
        const versionStateData = {
            version_state: stateValues.state,
            approved: stateValues.approved,
            approved_date: stateValues.approved_date || null,
            pack_item_level_administrative_costs: isChecked,
            lock_finance_editing: isLockFinance,
            data: packDetails,
            watchlist: selectedUsers,
            [expirationDate]: stateValues[expirationDate],
            [earningsPerMinuteKey]: stateValues[earningsPerMinuteKey] || null,
            [fabricFinanceCostPercentageKey]: stateValues[fabricFinanceCostPercentageKey] || null,
            [buyerCommissionPercentageKey]: stateValues[buyerCommissionPercentageKey] || null,
            [trimFinanceCostPercentageKey]: stateValues[trimFinanceCostPercentageKey] || null,
            [serviceFinanceCostPercentageKey]: stateValues[serviceFinanceCostPercentageKey] || null,
            
        }

        const request = {
            method: 'post',
            url: RestUrls.updateVersionStateURL(orderId, versionId),
            data: versionStateData
        };
        api(request).then(() => {
            setStateValues
            window.location.reload();
            setOpen(false)
            toast.success(DEFAULT_SUCCESS);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
            setErrors(error?.response?.data?.errors)
        }).finally(() => setEditVersionId(0));
    }
    const [isSaving, setIsSaving] = useState(false);
    const handleSelectChangeState = (event: any) => {
        setStateValues({ ...stateValues, state: event.target.value });
    };
    const handleSelectChangeBusinessAdminInputs = (event: any) => {
        const name = event.target.name;
        setStateValues({ ...stateValues, [name]: event.target.value });
    };

    const handleOnChange = (field: string, value: any) => {
        setStateValues({ ...stateValues, [field]: value });

    }
    const handleCompletedSwitch = (event: any) => {
        setStateValues({ ...stateValues, approved: event.target.checked });
    };

    const handleCheckboxChange = () => {
        setIsChecked(!isChecked);
    };
    const handleCheckboxLockChange = () => {
        setIsLockFinance(!isLockFinance);
    };

    const handleInputChanges = (event:any, packId:any, itemId:any, field:any, itemIndex:any,packIndex:any) => {
        const updatedData = [...packData];
        if (packIndex !== -1) {
            if (itemIndex !== -1) {
                updatedData[packIndex].pack_items[itemIndex][field] = event.target.value || null;
                setPackData(updatedData);
            }
        }
    };
    
    const handleOnChangeSelectPack = (event: any, data: any, reason: any) => {
        data.forEach((d: any) => d.size = d.id);
        const userIds = data.map((size: any) => size.id);
        setSelectedUsers(userIds);
    }

    useEffect(() => {
        if (orderId && versionId) {
            getVersionStates();
        }
    }, [orderId, versionId]);

    return (
        <>
            {isLoading ? (
                <DefaultLoader />
            ) : (
                <>
                    <Box sx={{ mb: 3 }}>
                        <InputLabel sx={{ mb: 1 }} >Version State</InputLabel>
                        <RitzSelection
                            id={'item'}
                            name={'item'}
                            optionValue={'value'}
                            optionText={'display_value'}
                            selectedValue={stateValues.state}
                            isRequired={true}
                            options={versionStates}
                            handleOnChange={handleSelectChangeState}
                            isReadOnly={!canEdit}
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
                        <InputLabel sx={{ mb: 1 }} >Expiration Date</InputLabel>
                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                            <DatePicker
                                minDate={dayjs(Date.now())}
                                format='DD/MM/YYYY'
                                value={stateValues.expiration_date ? dayjs(stateValues.expiration_date) : null}
                                onChange={(e: any) => handleOnChange('expiration_date',dayjs(e.$d).format('YYYY-MM-DD'))}
                                slotProps={{
                                    textField: {
                                        size: 'small'
                                    }
                                }}
                            />
                        </LocalizationProvider>
                    </Box>
                            <Box sx={{ mb: 3 }}>
                                <Box sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
                                    <Checkbox checked={isChecked} style={{ border: 'none', padding: '0 10px 0 0', margin: 0 }} onClick={handleCheckboxChange} />
                                    <InputLabel>Pack Item level Financing Costs</InputLabel>

                                </Box>
                                {!isChecked ? (
                                    <>
                                    <Box sx={{ mb: 3 }}>
                                        <InputLabel sx={{ mb: 1 }}>Fabric Finance Cost Percentage</InputLabel>
                                        <RitzInput
                                            isRequired={true}
                                            name={fabricFinanceCostPercentageKey}
                                            id={fabricFinanceCostPercentageKey}
                                            selectedValue={stateValues[fabricFinanceCostPercentageKey] || ''}
                                            handleOnChange={handleSelectChangeBusinessAdminInputs}
                                            inputType="number"
                                            isReadOnly={isLockFinance}
                                        />
                                        </Box>
                                        <Box sx={{ mb: 3 }}>
                                        <InputLabel sx={{ mb: 1 }}>Trims Finance Cost Percentage</InputLabel>
                                        <RitzInput
                                            isRequired={true}
                                            name={trimFinanceCostPercentageKey}
                                            id={trimFinanceCostPercentageKey}
                                            selectedValue={stateValues[trimFinanceCostPercentageKey] || ''}
                                            handleOnChange={handleSelectChangeBusinessAdminInputs}
                                            inputType="number"
                                            isReadOnly={isLockFinance}
                                        />
                                        </Box>
                                        <Box sx={{ mb: 3 }}>
                                        <InputLabel sx={{ mb: 1 }}>Service Finance Cost Percentage</InputLabel>
                                        <RitzInput
                                            isRequired={true}
                                            name={serviceFinanceCostPercentageKey}
                                            id={serviceFinanceCostPercentageKey}
                                            selectedValue={stateValues[serviceFinanceCostPercentageKey] || ''}
                                            handleOnChange={handleSelectChangeBusinessAdminInputs}
                                            inputType="number"
                                            isReadOnly={isLockFinance}
                                        />
                                        </Box>
                                        <Box sx={{ mb: 3 }}>
                                        <InputLabel sx={{ mb: 1 }}>Buyer Commision</InputLabel>
                                        <RitzInput
                                            isRequired={true}
                                            name={buyerCommissionPercentageKey}
                                            id={buyerCommissionPercentageKey}
                                            selectedValue={stateValues[buyerCommissionPercentageKey] || ''}
                                            handleOnChange={handleSelectChangeBusinessAdminInputs}
                                            inputType="number"
                                            isReadOnly={isLockFinance}
                                        />
                                        </Box>
                                        <Box sx={{ mb: 3 }}>
                                        <InputLabel sx={{ mb: 1 }}>EPM</InputLabel>
                                        <RitzInput
                                            isRequired={true}
                                            name={earningsPerMinuteKey}
                                            id={earningsPerMinuteKey}
                                            selectedValue={stateValues[earningsPerMinuteKey] || ''}
                                            handleOnChange={handleSelectChangeBusinessAdminInputs}
                                            inputType="number"
                                            isReadOnly={isLockFinance}
                                        />
                                        </Box>
                                    </>
                                ) : (
                                    
                                    <>
                                        <TableContainer component={Paper}>
                                            <Table>
                                                    <TableHead>
                                                        <TableRow sx={{
                                                            borderTop: (theme) => `2px solid ${theme.palette.grey[200]}`,
                                                            borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`,
                                                            fontWeight: 'bold',
                                                            px: 2,
                                                            background: (theme) => darken(theme.palette.grey[50], 0.01),
                                                        }}>
                                                            <TableCell>Pack Details</TableCell>
                                                            <TableCell align="left">Item</TableCell>
                                                            <TableCell align="left">FFCP</TableCell>
                                                            <TableCell align="left">TFCP</TableCell>
                                                            <TableCell align="left">BC</TableCell>
                                                            <TableCell align="left">EPM</TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                <TableBody>
                                                    {packData?.map((packDetails: any, index: number) => (
                                                        <React.Fragment key={`pack-${index}`}>
                                                            {packDetails?.pack_items?.map((item: any, item_index: number) => (
                                                                <React.Fragment key={`s7b-${packDetails.pack_id}-${item.id}-${item_index}`}>
                                                                    <TableRow key={`item-${packDetails.pack_id}-${item.id}`}>
                                                                        {item_index == 0 ? (
                                                                            <TableCell
                                                                                sx={{
                                                                                    borderTop: (theme) => `2px solid ${theme.palette.grey[200]}`,
                                                                                    borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`,
                                                                                    fontWeight: 'bold',
                                                                                    px: 2,
                                                                                    background: (theme) => darken(theme.palette.grey[50], 0.01),
                                                                                }}
                                                                            >{packDetails.country_name}-{packDetails.colorway_name}-{packDetails.size_name} Pack</TableCell>
                                                                        ) : (
                                                                            <TableCell />
                                                                        )}
                                                                        <TableCell
                                                                            sx={{
                                                                                borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`,
                                                                                borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`,
                                                                                borderTop: (theme) => `${index == 0 ? 2 : 1}px solid ${theme.palette.grey[200]}`,
                                                                                background: (theme) => theme.palette.grey[50],
                                                                            }}
                                                                        > {item.item_name}</TableCell>
                                                                        <TableCell align="left">
                                                                            <RitzInput
                                                                                isReadOnly={isLockFinance}
                                                                                name={fabricFinanceCostPercentageKey}
                                                                                id={fabricFinanceCostPercentageKey}
                                                                                 selectedValue={item[fabricFinanceCostPercentageKey]|| ''}
                                                                                isMulti={false}
                                                                                isRequired={true}
                                                                                inputType="number"
                                                                                 handleOnChange={(event:any) =>
                                                                                   handleInputChanges(event, packDetails.id, item.id, [fabricFinanceCostPercentageKey], item_index, index)
                                                                                   }
                                                                            />
                                                                        </TableCell>
                                                                        <TableCell align="left">
                                                                            <RitzInput
                                                                                isReadOnly={isLockFinance}
                                                                                name={trimFinanceCostPercentageKey}
                                                                                id={trimFinanceCostPercentageKey}
                                                                                selectedValue={item[trimFinanceCostPercentageKey] || ''}
                                                                                isMulti={false}
                                                                                isRequired={true}
                                                                                inputType="number"
                                                                                handleOnChange={(event:any) =>
                                                                                    handleInputChanges(event, packDetails.id, item.id, [trimFinanceCostPercentageKey], item_index, index)
                                                                                  }
                                                                   
                                                                            />
                                                                        </TableCell>
                                                                        <TableCell align="left">
                                                                            <RitzInput
                                                                                isReadOnly={isLockFinance}
                                                                                name={buyerCommissionPercentageKey}
                                                                                id={buyerCommissionPercentageKey}
                                                                                selectedValue={item[buyerCommissionPercentageKey] || ''}
                                                                                isMulti={false}
                                                                                isRequired={true}
                                                                                inputType="number"
                                                                                handleOnChange={(event:any) =>
                                                                                    handleInputChanges(event, packDetails.id, item.id, [buyerCommissionPercentageKey], item_index, index)
                                                                                  }
                                                                            />
                                                                        </TableCell>
                                                                        <TableCell align="left">
                                                                            <RitzInput
                                                                                isReadOnly={isLockFinance}
                                                                                name={earningsPerMinuteKey}
                                                                                id={earningsPerMinuteKey}
                                                                                selectedValue={item[earningsPerMinuteKey] || ''}
                                                                                isMulti={false}
                                                                                isRequired={true}
                                                                                inputType="number"
                                                                                handleOnChange={(event:any) =>
                                                                                    handleInputChanges(event, packDetails.id, item.id, [earningsPerMinuteKey], item_index, index)
                                                                                  }
                                                                            />
                                                                        </TableCell>
                                                                    </TableRow>
                                                                </React.Fragment>
                                                            ))}
                                                        </React.Fragment>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>

                                    </>
                                  
                                )}
                            </Box>
                        {canEditBusinessAdmin && (
                            <>
                                <Box sx={{ mb: 3 }}>
                                    <InputLabel sx={{ mb: 1 }}>Approved Date</InputLabel>
                                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                                        <DatePicker
                                            minDate={dayjs(Date.now())}
                                            format='DD/MM/YYYY'
                                            value={stateValues[approvedDateKey] ? dayjs(stateValues[approvedDateKey]) : null}
                                            onChange={(e: any) => handleOnChange(approvedDateKey, dayjs(e.$d).format('YYYY-MM-DD'))}
                                            slotProps={{
                                                textField: {
                                                    size: 'small'
                                                }
                                            }}
                                        />
                                    </LocalizationProvider>
                                </Box>
                                <Box sx={{ mb: 3 }}>
                                    <FormControlLabel
                                        control={<Switch checked={isLockFinance} onClick={handleCheckboxLockChange} />}
                                        label={
                                            <Box>
                                                <Tooltip title={isLockFinance ? 'Locked' : 'Unlocked'} arrow>
                                                    {isLockFinance ? <LockIcon /> : <LockOpenIcon />}
                                                </Tooltip>
                                            </Box>
                                        }
                                        labelPlacement="start"
                                    />
                                    <b> Fixed values </b>
                                </Box>
                                
                                <Box sx={{ mb: 3 }} >
                                    <RitzSwitch name="Approve Version" handleChangeSwitch={handleCompletedSwitch} status={stateValues.approved} />
                                </Box>
                            </>
                        )}
                        {/* tempory added error message - need to change api error payload format */}
                        {errors.length > 0 && (
                            <FormErrorMessage type='alert' sx={{ mb: 2 }} message={errors[0]} />
                        )}
                    <Box style={{ display: 'flex', justifyContent: 'end' }}>
                        <Button variant="contained" color="primary" onClick={handleSave} disabled={isSaving}>
                            {isSaving && <SaveSpinner />} {versionId > 0 ? "Update" : "Create"}
                        </Button>
                    </Box>

                </>
            )}
        </>

    )
}

export default VersionNavigation