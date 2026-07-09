import RitzSelection from '@/components/Ritz/RitzSelection';
import { Alert, Autocomplete, Box, Button, Checkbox, IconButton, InputLabel, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography } from '@mui/material';
import React, { useEffect, useRef, useState } from 'react'
import * as restUrls from '@/helpers/constants/RestUrls';
import * as yup from "yup";
import api from '@/services/api';
import DefaultLoader from '@/components/DefaultLoader';
import SaveSpinner from '@/components/SaveSpinner';
import { ColumnDef } from '@tanstack/react-table';
import RitzTable from '@/components/Ritz/RitzTable';
import { toast } from 'react-hot-toast';
import { DEFAULT_SUCCESS } from '@/helpers/constants/Constants';
import FormErrorMessage from '@/components/FormErrorMessage';
import { getDefaultError } from '@/helpers/Utilities';
import CreatableSelect from 'react-select/creatable';
import RitzInput from '@/components/Ritz/RitzInput';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import RitzMultiSelectCheckBox from '@/components/Ritz/RitzMultiSelectCheckBox';
import { getSummaryPackDetailsURL } from '@/helpers/constants/rest_urls/CostingUrls';
import PackDetails from '../../PackDetails';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

const AddOtherCosts = ({ packId, orderId, versionId, setUpdated, costTypeId, orderSizeGroupId, colorwayId, countryId, closeModal }: any) => {
    const costTypeFieldName = 'other_cost_type_id';
    const costValueTypeFieldName = 'cost';
    const packIdName = 'pack_ids';

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [packDetails, setPackDetails] = useState<any>([]);
    const [costTypes, setCostTypes] = useState<any>([]);
    const [selectedPacks, setSelectedPacks] = useState<number[]>([parseInt(packId)]);
    const [costTypeDetail, setCostTypeDetail] = useState<any>({});
    const [formValidationErrors, setFormValidationErrors] = useState({ hasErrors: false });
    const [displayPackDetails, setDisplayPackDetails] = useState<any>([]);
    const [otherCostValues, setOtherCostValues] = useState<any>([]);
    const [currentPackList, setCurrentPackList] = useState<number[]>([]);
    const [isLoadingPackItems, setIsLoadingPackItems] = useState(false);

    const handleSelectAll = (event: any) => {
        if (event.target.checked) {
            const allPackIds = packDetails.map((pack: any) => pack.id);
            setSelectedPacks([...allPackIds]);
        } else {
            setSelectedPacks([Number(packId)]);
        }
    };
    const handleCheckboxChange = (packId: number, rowDetails: any) => {
        if (selectedPacks.includes(packId)) {
            setSelectedPacks((prevSelectedRows) => prevSelectedRows.filter((rowId) => rowId !== packId));
        } else {
            setSelectedPacks((prevSelectedRows) => [...prevSelectedRows, packId]);
        }
    };
    const getGroupPackItems = () => {
        api.get(getSummaryPackDetailsURL(orderId, versionId, countryId, colorwayId, orderSizeGroupId))
            .then(resp => {
                const resdata = resp?.data || {};
                setSelectedPacks([...resdata.packs]);
                setCurrentPackList([...resdata.packs]);
            })
            .catch(error => {
                toast.error(getDefaultError(error?.response?.status));
            });
    };
    const handleAddCurrentPacks = () => {
        setSelectedPacks([...selectedPacks, ...currentPackList]);
    };
    const columns: ColumnDef<any>[] = [
        {
            accessorKey: "id",
            header: <Checkbox onChange={handleSelectAll} /> as any,
            enableSorting: false,
            enableColumnFilter: false,
            enableGlobalFilter: false,
            cell: props => (
                <Checkbox checked={selectedPacks.includes(props.getValue() as number)} 
                onClick={() => handleCheckboxChange(props.getValue() as number, props.row.original)}
                disabled={props.getValue() == packId} />
            ),
            meta: {
                align: 'center',
                width: 100
            }
        },
        {
            accessorKey: 'displayName',
            header: 'Pack/Description',
        },
    ];

    const handleCreateSelectChange = (rowData: any, actionType: any) => {
        let isNew = false;
        const updatedType = { ...costTypeDetail, other_cost_type_name: rowData.label };
        if (actionType?.action != 'select-option') {
            if ( costTypeId ==0) {
                updatedType.other_cost_type = null;
            }
        }
        else{
            updatedType.other_cost_type = rowData.value;
        }
         setCostTypeDetail(updatedType);

    };

    const handleChange = (event: any) => {
        setCostTypeDetail({ ...costTypeDetail, [event?.target?.name]: event?.target?.value, });
    };

    const fetchData = () => {
        const requests = [
            api.get(restUrls.getPackagingCostTypeList(versionId)),
            api.get(restUrls.getNavigationOrderMaterialURL(orderId, versionId))
        ]
        if (costTypeId != 0 &&  orderSizeGroupId) {
            requests.push(api.get(restUrls.getSummaryOtherCostTypeURL(countryId, colorwayId, orderSizeGroupId, costTypeId)))
        }
        if (costTypeId != 0 && !orderSizeGroupId) {
            requests.push(api.get(restUrls.getOtherCostTypeURL(packId, costTypeId)))
        }
        Promise.all(requests).then(resp => {
            const respData = resp.map((r: any) => r.data);
            const [costTypes, orderPacks, costTypeDetail ] = respData;
            
            const mappedCostTypes = costTypes.map((otherPlacement: { name: any; id: any; }) => ({
                label: otherPlacement.name,
                value: otherPlacement.id,
              }));
            setCostTypes([...mappedCostTypes]);
            setCostTypeDetail({
                ...costTypeDetail,
                other_cost_type_id: costTypeDetail?.other_cost_type,
                other_cost_type_name: costTypeDetail?.other_cost_type_name,
            });
            if (orderSizeGroupId && costTypeId != 0) {
                const packIds = costTypeDetail.pack_ids.map((pack: { id: any; }) => pack.id);
                setSelectedPacks(packIds);
                setOtherCostValues([...costTypeDetail.pack_ids])
            }
            if (costTypeId != 0) {
                const packIds = costTypeDetail.pack_ids.map((pack: { id: any; }) => pack.id);
                setSelectedPacks(packIds);
                setOtherCostValues([...costTypeDetail.pack_ids])
            }
            setPackDetails([...orderPacks?.order_packs]);
            setDisplayPackDetails([...orderPacks?.order_packs]);
         
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoading(false));
    }


    const handleSaveOtherCost = () => {

        const saveApi = restUrls.createOtherCostURL(orderId, versionId);
        const savePayload = {
                other_cost_type_id: costTypeDetail?.other_cost_type,
                other_cost_type_name: costTypeDetail?.other_cost_type_name,
                pack_ids: otherCostValues,
            }
        api.post(saveApi, savePayload).then(resp => {
            setUpdated(true)
            toast.success(DEFAULT_SUCCESS);
        }).catch(error => {
            setFormValidationErrors(error);
            toast.error(getDefaultError(error.response?.status));

        }).finally(() => {
            setIsSaving(false);
        });
    }
    const handleOnChangeSelectPack = (event: any, data: any, reason: any) => {
        data.forEach((d: any) => d.size = d.id);
        const sizeIds = data.map((size: any) => size.id);
        setSelectedPacks(sizeIds);
    }
    const handleFileRemove = (deletePackId: number, index: number) => {
        const updatedSelectedPacks = [...selectedPacks];
        if (index !== -1) {
           updatedSelectedPacks.splice(index, 1);
           setSelectedPacks(updatedSelectedPacks);
        }
        const updatedCostValues = [...otherCostValues];
        if (index !== -1) {
          updatedCostValues.splice(index, 1);
          setOtherCostValues(updatedCostValues);
        }
    };

    const handleChangeCost = (event: React.ChangeEvent<HTMLInputElement>, index: number, id: any) => {
        const updatedCostValues = [...otherCostValues];
        const existingIndex = updatedCostValues.findIndex(cost => cost.id === id);
        if (existingIndex !== -1) {
          updatedCostValues[existingIndex] = { id: id, cost: event.target.value || null };
        } else {
          updatedCostValues.push({ id: id, cost: event.target.value || null });
        }
        setOtherCostValues(updatedCostValues);
      };
    
    const handleSelectedIdsChange = (newSelectedIds:any) => {
        setSelectedPacks(newSelectedIds);
    };

    const handleCopyData = (costId:any) => {
        const firstValue = otherCostValues.find((cost: { id: any; }) => cost.id === costId)?.cost || null;
        const updatedCostValues = selectedPacks.map(id => {
            return { id: id, cost: firstValue };
        });
        setOtherCostValues(updatedCostValues);
    };

    useEffect(() => {
        if (orderId) {
            fetchData();
        }
    }, [orderId,versionId])

    useEffect(() => {
        if (orderSizeGroupId) {
            getGroupPackItems();
        }
    }, [orderSizeGroupId])

    return (
        <>
         {isLoading ? <DefaultLoader/> : <>
                <Box marginBottom={3}>
                    <InputLabel sx={{ mb: 1 }}>Types:</InputLabel>
                    <CreatableSelect
                            options={costTypes}
                            value={costTypes.find((opt:any) => opt.label === costTypeDetail?.other_cost_type_name )}
                            onChange={handleCreateSelectChange}
                            styles={{
                                option: (provided, state) => ({
                                  ...provided,
                                  backgroundColor: state.isSelected ? '#E4F1FF' : 'white',
                                  color:'black',
                                  ':hover': {
                                    backgroundColor: '#F0F0F0',        
                                  },
                                }),
                                control: (provided) => ({
                                    ...provided,
                                    height: '50px',
                                  }),
                              }}
                        />

                    <FormErrorMessage message={formValidationErrors?.[costTypeFieldName]} />
                </Box>
                <Box marginBottom={3}>
                <InputLabel sx={{ mb: 1 }}>Select Order Packs from the select box below:</InputLabel>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Typography sx={{ color: 'red', cursor: 'pointer' }} onClick={() => handleAddCurrentPacks()}>
                            <Button variant='outlined' sx={{ mb: 1 }}>Add Current Packs</Button>
                        </Typography>
                    </Box>
                    <PackDetails
                        packItemData={packDetails}
                        selectedIds={selectedPacks}
                        onSelectedIdsChange={handleSelectedIdsChange}
                        isLoading={isLoadingPackItems} />
                    {/* <RitzMultiSelectCheckBox
                                    id={'ordersizes'}
                                    selectOptions={packDetails}
                                    optionValue={'id'}
                                    optionDisplayValue={'displayName'}
                                    handleOnChange={handleOnChangeSelectPack}
                                    selectedValues={selectedPacks || ''}
                                    handleOnClose={() => console.log('todo remove this')}
                                /> */}
                </Box>
                <Box marginBottom={3}>
                     <TableContainer >
                        <Table size="small" aria-label="a dense table">
                            <TableHead>
                                <TableRow
                                    sx={{
                                        borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`,
                                        background: (theme) => theme.palette.grey[50]
                                    }}>
                                    <TableCell>Country</TableCell>
                                    <TableCell align="left">Colorway</TableCell>
                                    <TableCell align="left">Size</TableCell>
                                    <TableCell align="center" style={{ width: '20%' }}>Cost</TableCell>
                                    <TableCell align="center" >Action</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {displayPackDetails.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} align='center'>No data available.</TableCell>
                                    </TableRow>
                                ) : (
                                    displayPackDetails.filter((packDetails:any) => selectedPacks.includes(packDetails.id)).map((packDetails:any, index:number) => (
                                            <TableRow
                                                key={packDetails.id}
                                                sx={{
                                                    borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`,
                                                    background: (theme) => theme.palette.grey[50]
                                                }}
                                            >
                                                <TableCell component="th" scope="row">{packDetails.country_name}</TableCell>
                                                <TableCell align="left">{packDetails.colorway_name} </TableCell>
                                                <TableCell align="left">{packDetails.size_name}</TableCell>
                                                <TableCell align="center"  >
                                                {index === 0 && (
                                                    <Box style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                        <Tooltip title="Copy consumption and wastage to all sizes." arrow>
                                                            <IconButton size='small' color='primary' onClick={() => handleCopyData(packDetails.id)}>
                                                                <ContentCopyIcon fontSize='inherit' />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Box>
                                                )}
                                                <RitzInput
                                                    name={"cost"}
                                                    id={"cost"}
                                                    selectedValue={otherCostValues.find((item: { id: any; }) => item.id === packDetails.id)?.cost}
                                                    isMulti={true}
                                                    multiline
                                                    row={true}
                                                    isRequired={true}
                                                    handleOnChange={(event: any) => handleChangeCost(event, index, packDetails.id)}
                                                    type={'number'}
                                                />

                                                </TableCell>
                                                <TableCell align="center" ><Typography sx={{ color: 'red', cursor: 'pointer' }} onClick={() => handleFileRemove(packDetails.id, index)}>
                                                    <DeleteForeverIcon />
                                                </Typography></TableCell>
                                            </TableRow>
                                        ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <FormErrorMessage message={formValidationErrors?.[packIdName]} />
                </Box>

                <Box sx={{ mt: 5, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button onClick={() => handleSaveOtherCost()} variant="contained" disabled={isSaving}>
                        {isSaving && <SaveSpinner />}Save
                    </Button>
                </Box>

            </>}
        </>
    )
}

export default AddOtherCosts;
