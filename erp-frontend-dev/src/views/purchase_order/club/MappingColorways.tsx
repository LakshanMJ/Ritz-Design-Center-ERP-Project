import React, { useEffect, useState } from 'react';
import { Box, Button, Divider, FormControl, FormControlLabel, Grid, IconButton, Link, RadioGroup, Table, TableBody, TableCell, TableHead, TableRow, Typography, Radio, Alert, Tooltip } from '@mui/material';
import SaveSpinner from '@/components/SaveSpinner';
import DefaultLoader from '@/components/DefaultLoader';
import RitzSelection from '@/components/Ritz/RitzSelection';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import TextField from '@mui/material/TextField';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';
import { DEFAULT_SUCCESS } from '@/helpers/constants/Constants';
import { poClubColorwayUpdateDeleteURL, poClubColorwayCreateURL, poClubColorwayDeleteURL, poClubColorwayMappedDataSaveURL, poClubColorwayUpdateURL, poClubCountryCraeteURL, poClubCountryUpdateDeleteURL, poClubSizeCraeteURL, poClubSizeUpdateDelteURL, purchaseOrderColorwaySizeCountryDeailsURL, startPreCostingInPoClubURL, poClubColorwaySizeCountryMappingURL } from '@/helpers/constants/rest_urls/POUrls';
import CircularLoader from '@/components/CircularLoader';
import RitzSwitch from '@/components/Ritz/RitzSwitch';
import FormErrorMessage from '@/components/FormErrorMessage';
import CostingCard from '@/components/OrderInquiry/Costing/CostingCard';
import RitzSearchableSelection from '@/components/Ritz/RitzSearchableSelection';
import { clubPreCostingListURL } from '@/helpers/constants/RestUrls';
import EditNoteIcon from '@mui/icons-material/EditNote';

const MappingColorways = ({ clubId, costingType, preCosting, clubState, refreshData }: any) => {
    const colorwayKey = 'colorway';
    const sizeKey = 'size';
    const poColorwaysKey = 'po_colorways';
    const poClubColorwayKey = 'po_club_colorway';
    const poSizesKey = 'po_sizes';
    const poClubSizeKey = 'po_club_size';
    const poCountriesKey = 'po_countries';
    const poClubCountryKey = 'po_club_country';
    const actualpoclubcolorwaySetKey = 'actualpoclubcolorway_set';
    const actualPoClubSizeSetKey = 'actualpoclubsize_set';
    const actualPoClubCountrySetKey = 'actualpoclubcountry_set';
    const colorwayNameKey = 'colorway_name';
    const sizeNameKey = 'size_name';
    const countryNameKey = 'country_name';
    const preCostingType = 'pre_costing';
    const preCostingOrderColorwayKey = 'pre_costing_order_colorway'; 
    const marketingOrderColorwayKey = 'marketing_order_colorway';
    const preCostingOrderSizeKey = 'pre_costing_order_size';
    const marketingOrderSizeKey = 'marketing_order_size';
    const preCostingOrderCountryKey = 'pre_costing_order_country';
    const marketingOrderCountryKey = 'marketing_order_country';

    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingCircularLoader, setIsLoadingCircularLoader] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isCreatingPreCosting, setIsCreatingPreCosting] = useState(false);
    const [editRowData, setEditRowData] = useState<any>({ size: { selectId: null, selectIndex: null, editValue: '' }, colorway: { selectId: null, selectIndex: null, editValue: '' }, country: { selectId: null, selectIndex: null, editValue: '' } });
    const [errors, setErrors] = useState<any>({});
    const [dataSet, setDataSet] = useState<any>({});
    const [preCostingDataSet, setPreCostingDataSet] = useState<any>({ costingType: costingType, preCosting: preCosting });
    const [preCostingList, setPreCostingList] = useState<any>([]);

    const fetchData = (costingType: any) => {
        setErrors({})
        const data = {
            selected_pre_costing: costingType === preCostingType ? preCostingDataSet?.preCosting : null,
            selected_type: preCostingDataSet?.costingType === preCostingType ? true : false
        }
        api.post(purchaseOrderColorwaySizeCountryDeailsURL(clubId), data)
            .then(response => {
                const preCostingData = response?.data || [];
                setDataSet({ ...preCostingData })
            })
            .catch(error => {
                toast.error(getDefaultError(error?.response?.status));
            }).finally(() => {
                setIsLoading(false)
                setIsLoadingCircularLoader(false)
            });
    };

    const getPreCostingList = () => {
        api.get(clubPreCostingListURL(clubId))
            .then(response => {
                const preCostingList = response?.data || [];
                setPreCostingList([...preCostingList])
            })
            .catch(error => {
                toast.error(getDefaultError(error?.response?.status));
            })
            .finally();
    };

    const handleSaveClick = (type: any) => {
        setIsLoadingCircularLoader(true)
        let createURL;
        let updateURL;
        let saveObject;
        if (type === colorwayKey) {
            createURL = poClubColorwayCreateURL();
            updateURL = poClubColorwayUpdateDeleteURL(editRowData?.[type]?.selectId);
            saveObject = colorwayNameKey
        } else if (type === sizeKey) {
            createURL = poClubSizeCraeteURL();
            updateURL = poClubSizeUpdateDelteURL(editRowData?.[type]?.selectId);
            saveObject = sizeNameKey
        } else {
            createURL = poClubCountryCraeteURL();
            updateURL = poClubCountryUpdateDeleteURL(editRowData?.[type]?.selectId);
            saveObject = countryNameKey
        }
        const request = {
            method: editRowData?.[type]?.selectId === 0 ? 'post' : 'put',
            url: editRowData?.[type]?.selectId === 0 ? createURL : updateURL,
            data: {
                [saveObject]: editRowData?.[type]?.editValue,
                po_club: clubId
            }
        }
        api(request).then(() => {
            toast.success(DEFAULT_SUCCESS);
            setEditRowData({ selectId: null, selectIndex: null, editValue: '' });
            fetchData(preCostingDataSet?.costingType)
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsSaving(false);
            setIsLoadingCircularLoader(false)
        });
    };

    const handleEditClick = (type: string, selectId: any, selectIndex: number, editValue: string) => {
        setEditRowData((prevState: any) => ({
            ...prevState,
            [type]: { selectId, selectIndex, editValue },
        }));
    };

    const handleDeleteClick = (id: any, index: number, type: any) => {
        let updateMainKey: string;
        let deleteKey: string;
        if (type === colorwayKey) {
            updateMainKey = poClubColorwayUpdateDeleteURL(id);;
            deleteKey = actualpoclubcolorwaySetKey
        } else if (type === sizeKey) {
            updateMainKey = poClubSizeUpdateDelteURL(id);
            deleteKey = actualPoClubSizeSetKey
        } else {
            updateMainKey = poClubCountryUpdateDeleteURL(id);
            deleteKey = actualPoClubCountrySetKey
        }
        if (id) {
            setIsLoadingCircularLoader(true);
            api.delete(updateMainKey).then(() => {
                toast.success(DEFAULT_SUCCESS);
                fetchData(preCostingDataSet?.costingType)
            }).catch(error => {
                toast.error(getDefaultError(error?.response?.status));
            }).finally(() => {
                setIsLoadingCircularLoader(false);
            });
        } else {
            const existingData = dataSet?.[deleteKey] || [];
            const updatedDataSet = [...existingData];
            if (index >= 0 && index < updatedDataSet.length) {
                updatedDataSet.splice(index, 1);
            }
            setDataSet((prev: any) => ({
                ...prev,
                [deleteKey]: updatedDataSet,
            }));
        }

    };
    const handleAddNewRow = (type: any) => {
        let updateMainKey: string;
        let updateSubKey: string;
        if (type === colorwayKey) {
            updateMainKey = actualpoclubcolorwaySetKey;
            updateSubKey = "Colorway";
        } else if (type === sizeKey) {
            updateMainKey = actualPoClubSizeSetKey;
            updateSubKey = "Size";
        } else {
            updateMainKey = actualPoClubCountrySetKey;
            updateSubKey = "Country";
        }
        const newColorway = {
            id: 0 as any,
            [colorwayNameKey]: `New ${updateSubKey}`,
        };
        setDataSet((prevState: any) => {
            const updatedDataSet = [...prevState?.[updateMainKey], newColorway];
            return {
                ...prevState,
                [updateMainKey]: updatedDataSet,
            };
        });
        setEditRowData((prev: any) => ({
            ...prev,
            [type]: {
                ...prev.colorway,
                selectId: 0,
                selectIndex: dataSet?.[updateMainKey]?.length,
                editValue: `New ${updateSubKey}`,
            },
        }));
    };

    const handleSaveMappedData = (type: any) => {
        setIsLoadingCircularLoader(true)
        const colorwayKey =  preCostingDataSet?.costingType === preCostingType ? preCostingOrderColorwayKey : marketingOrderColorwayKey;
        const sizeKey = preCostingDataSet?.costingType === preCostingType ? preCostingOrderSizeKey : marketingOrderSizeKey;
        const countryKey = preCostingDataSet?.costingType === preCostingType ? preCostingOrderCountryKey : marketingOrderCountryKey;
        const request = {
            method: 'put',
            url: poClubColorwayMappedDataSaveURL(dataSet?.po_club_id),
            data: {
                [actualpoclubcolorwaySetKey]: dataSet?.[actualpoclubcolorwaySetKey]?.map((actualColorway: any) => ({
                    id: actualColorway?.id,
                    [colorwayKey]: actualColorway?.[colorwayKey] || null
                })),
                [actualPoClubCountrySetKey]: dataSet?.[actualPoClubCountrySetKey]?.map((actualCountry: any) => ({
                    id: actualCountry?.id,
                    [countryKey]: actualCountry?.[countryKey] || null
                })),
                [actualPoClubSizeSetKey]: dataSet?.[actualPoClubSizeSetKey]?.map((actualSize: any) => ({
                    id: actualSize?.id,
                    [sizeKey]: actualSize?.[sizeKey] || null
                })),
                [poColorwaysKey]: dataSet?.[poColorwaysKey]?.map((poColorway: any) => ({
                    id: poColorway?.id,
                    [poClubColorwayKey]: poColorway?.[poClubColorwayKey] || null
                })),
                [poCountriesKey]: dataSet?.[poCountriesKey]?.map((poCountry: any) => ({
                    id: poCountry?.id,
                    [poClubCountryKey]: poCountry?.[poClubCountryKey] || null
                })),
                [poSizesKey]: dataSet?.[poSizesKey]?.map((poSize: any) => ({
                    id: poSize?.id,
                    [poClubSizeKey]: poSize?.[poClubSizeKey] || null
                })),
                selected_pre_costing: preCostingDataSet?.costingType === preCostingType ? preCostingDataSet?.preCosting : null,
                selected_type: preCostingDataSet?.costingType === preCostingType ? true : false,
                save_type: type
            }
        }
        api(request).then(() => {
            toast.success(DEFAULT_SUCCESS);
            setEditRowData({ selectId: null, selectIndex: null, editValue: '' });
            fetchData(preCostingDataSet?.costingType)
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
            setErrors({ ...error?.response?.data })

        }).finally(() => {
            setIsSaving(false);
            setIsLoadingCircularLoader(false)
        });
    }

    const handleChangeOrderColorwaySizeCountryMapping = (value: any, selectedIndex: number, type: any) => {
        let updateMainKey: string;
        let updateSubKey: string;
        if (type === colorwayKey) {
            updateMainKey = actualpoclubcolorwaySetKey;
            updateSubKey = preCostingDataSet?.costingType === preCostingType ? preCostingOrderColorwayKey : marketingOrderColorwayKey;
        } else if (type === sizeKey) {
            updateMainKey = actualPoClubSizeSetKey;
            updateSubKey = preCostingDataSet?.costingType === preCostingType ? preCostingOrderSizeKey : marketingOrderSizeKey;
        } else {
            updateMainKey = actualPoClubCountrySetKey;
            updateSubKey = preCostingDataSet?.costingType === preCostingType ? preCostingOrderCountryKey : marketingOrderCountryKey;
        }
        setDataSet((prevState: any) => {
            const updatedPoDataSet = [...(prevState?.[updateMainKey] || [])];
            updatedPoDataSet[selectedIndex] = {
                ...updatedPoDataSet[selectedIndex],
                [updateSubKey]: value,
            };
            return {
                ...prevState,
                [updateMainKey]: updatedPoDataSet,
            };
        });
    };
    const handleChangePOColorwaySizeCountryMapping = (value: any, selectedIndex: number, type: any) => {
        let updateMainKey: string;
        let updateSubKey: string;
        if (type === colorwayKey) {
            updateMainKey = poColorwaysKey;
            updateSubKey = poClubColorwayKey;
        } else if (type === sizeKey) {
            updateMainKey = poSizesKey;
            updateSubKey = poClubSizeKey;
        } else {
            updateMainKey = poCountriesKey;
            updateSubKey = poClubCountryKey;
        }
        setDataSet((prevState: any) => {
            const updatedPoDataSet = [...(prevState?.[updateMainKey] || [])];
            updatedPoDataSet[selectedIndex] = {
                ...updatedPoDataSet[selectedIndex],
                [updateSubKey]: value,
            };
            return {
                ...prevState,
                [updateMainKey]: updatedPoDataSet,
            };
        });
    };

    const handleMapping = () => {
        setIsCreatingPreCosting(true)
        api.post(poClubColorwaySizeCountryMappingURL(clubId), { selected_pre_costing: preCostingDataSet?.preCosting }).then(resp => {
            toast.success(DEFAULT_SUCCESS);
            fetchData(preCostingDataSet?.costingType)
        }).catch(error => {
            setErrors((prevErrors: any) => ({
                ...prevErrors,
                pre_costing: error?.response?.data,
            }));
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsCreatingPreCosting(false)
        });
    }

    const handleCostingDataSet = (value: any, field: any) => {
        setPreCostingDataSet((prevState: any) => ({
            ...prevState,
            [field]: value,
        }));
    }

    useEffect(() => {
        setIsLoading(true)
        if(clubId){
            fetchData(preCostingDataSet?.costingType)
        }
    }, [preCostingDataSet])

    useEffect(() => {
        getPreCostingList();
    }, [])


    return (
        <>
            {isLoadingCircularLoader && (<CircularLoader />)}
            <Box>
                <CostingCard>
                    <FormControl component="fieldset">
                        <Typography variant='h6' sx={{ mb: 1 }}>Is there a Pre-Costing for this Purchase Order Club?</Typography>
                        <RadioGroup
                            aria-label="preCosting"
                            name="preCosting"
                            value={preCostingDataSet?.costingType}
                            onChange={(event: any) => { handleCostingDataSet(event.target.value, 'costingType') }}
                            row
                        >
                            <FormControlLabel disabled={dataSet?.state !== 'open'} value="pre_costing" control={<Radio />} label="Yes" />
                            <FormControlLabel disabled={dataSet?.state !== 'open'} value="marketing_costing" control={<Radio />} label="No" />
                        </RadioGroup>
                    </FormControl>
                    {preCostingDataSet?.costingType === preCostingType && (
                        <Box sx={{ mt: 1 }}>
                            <Typography variant='h6' sx={{ mb: 1 }}>Select Pre-Costing:</Typography>
                            <RitzSearchableSelection
                                options={preCostingList}
                                placeholder="Select..."
                                selectedValue={preCostingDataSet?.preCosting}
                                handleOnChange={(selectedOrderID: any) => { handleCostingDataSet(selectedOrderID, 'preCosting') }}
                                id={'id'}
                                name={'id'}
                                optionValue={'id'}
                                optionText={'display_number'}
                                isReadOnly={dataSet?.state !== 'open'}
                            />
                            <FormErrorMessage message={errors?.pre_costing} />
                            {dataSet?.state == 'open' &&(
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Alert severity="error" sx={{ border: "none", backgroundColor: "transparent", color: 'red' }}>
                                    Hit the save button to auto map Colorways, Countries and Sizes
                                </Alert>
                                <Tooltip title="Mapping" arrow>
                                    <IconButton color="primary" disabled={dataSet?.state !== 'open'} onClick={() => handleMapping()} sx={{ marginLeft: 1 }}>
                                        <EditNoteIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                            )}
                        </Box>
                    )}
                </CostingCard>
            </Box>
            {preCostingDataSet?.costingType ? (
                <>
                    {isLoading ? (
                        <DefaultLoader />
                    ) : (
                        <>
                            <Box>
                                <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>Colorways Mapping</Typography>
                                <Box sx={{ mt: 1 }}>
                                    <Grid container spacing={2} alignItems="stretch">
                                        <Grid item xs={6}>
                                            <Typography variant="h6" sx={{ mb: 1 }} color="primary">Purchase Order Club Colorways</Typography>
                                            <Box>
                                                <Table>
                                                    <TableHead>
                                                        <TableRow>
                                                            {preCostingDataSet?.costingType === preCostingType && (
                                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => theme.palette.grey[50] }}>Marketing Costing Colorway</TableCell>
                                                            )}
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => theme.palette.grey[50] }}>{preCostingDataSet?.costingType === 'pre_costing' ? "Pre Costing Colorway" : "Marketing Costing Colorway"}</TableCell>
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => theme.palette.grey[50] }}>
                                                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                                    <Box>PO Club Colorway</Box>
                                                                    <IconButton
                                                                        size="small"
                                                                        color="primary"
                                                                        onClick={() => { handleAddNewRow('colorway') }}
                                                                        disabled={dataSet?.state !== 'open'}
                                                                    >
                                                                        <AddCircleOutlineIcon />
                                                                    </IconButton>
                                                                </Box>
                                                            </TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {dataSet?.[actualpoclubcolorwaySetKey]?.map((colorway: any, actualColorwayIndex: number) => (
                                                            <TableRow key={actualColorwayIndex} sx={{ height: "auto" }} >
                                                                {preCostingDataSet?.costingType === preCostingType && (
                                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '30%' }} >{colorway?.order_colorway_name || '--'}</TableCell>
                                                                )}
                                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }} >
                                                                    <RitzSelection
                                                                        id="colorway"
                                                                        name="colorway"
                                                                        optionValue="id"
                                                                        optionText="colorway"
                                                                        selectedValue={preCostingDataSet?.costingType === preCostingType ? colorway?.pre_costing_order_colorway : colorway?.marketing_order_colorway}
                                                                        isRequired={true}
                                                                        size='small'
                                                                        options={dataSet?.order_colorways}
                                                                        handleOnChange={(event: any) => handleChangeOrderColorwaySizeCountryMapping(event.target.value, actualColorwayIndex, 'colorway')}
                                                                        isReadOnly={dataSet?.state !== 'open'}
                                                                    />
                                                                    <FormErrorMessage message={errors?.[actualpoclubcolorwaySetKey]?.[colorway?.id]?.[0]} />
                                                                </TableCell>
                                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '35%' }} >
                                                                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                                                                        {editRowData?.['colorway']?.selectIndex === actualColorwayIndex ? (
                                                                            <TextField
                                                                                value={editRowData?.['colorway']?.editValue}
                                                                                onChange={(e) =>
                                                                                    setEditRowData((prev: any) => ({
                                                                                        ...prev,
                                                                                        colorway: {
                                                                                            ...prev.colorway,
                                                                                            editValue: e.target.value,
                                                                                        },
                                                                                    }))
                                                                                }
                                                                                size="small"
                                                                                disabled={dataSet?.state !== 'open'}
                                                                                sx={{ flexGrow: 1 }}
                                                                            />
                                                                        ) : (
                                                                            <Box >{colorway?.[colorwayNameKey]}</Box>
                                                                        )}
                                                                        <Box>
                                                                            {editRowData?.['colorway']?.selectIndex === actualColorwayIndex ? (
                                                                                <>
                                                                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                                                        <IconButton
                                                                                            size="small"
                                                                                            color="primary"
                                                                                            sx={{ ml: 1 }}
                                                                                            onClick={() => handleSaveClick('colorway')}
                                                                                            disabled={dataSet?.state !== 'open'}
                                                                                        >
                                                                                            <SaveIcon />
                                                                                        </IconButton>
                                                                                        <IconButton
                                                                                            size="small"
                                                                                            color="error"
                                                                                            sx={{ ml: 1 }}
                                                                                            disabled={dataSet?.state !== 'open'}
                                                                                            onClick={() => handleDeleteClick(colorway?.id, actualColorwayIndex, 'colorway')}
                                                                                        >
                                                                                            <DeleteIcon />
                                                                                        </IconButton>
                                                                                    </Box>
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <IconButton
                                                                                        size="small"
                                                                                        color="primary"
                                                                                        sx={{ ml: 1 }}
                                                                                        disabled={dataSet?.state !== 'open'}
                                                                                        onClick={() => handleEditClick('colorway', colorway?.id, actualColorwayIndex, colorway?.colorway_name)}
                                                                                    >
                                                                                        <EditIcon />
                                                                                    </IconButton>
                                                                                    <IconButton
                                                                                        size="small"
                                                                                        color="error"
                                                                                        sx={{ ml: 1 }}
                                                                                        disabled={dataSet?.state !== 'open'}
                                                                                        onClick={() => handleDeleteClick(colorway?.id, actualColorwayIndex, 'colorway')}
                                                                                    >
                                                                                        <DeleteIcon />
                                                                                    </IconButton>
                                                                                </>
                                                                            )}
                                                                        </Box>
                                                                    </Box>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </Box>
                                        </Grid>
                                        <Divider orientation="vertical" flexItem sx={{ mx: 2, borderColor: (theme) => theme.palette.grey[300] }} />
                                        <Grid item xs={5}>
                                            <Typography variant="h6" sx={{ mb: 1 }} color="primary">Purchase Order Colorways</Typography>
                                            <Box>
                                                <Table>
                                                    <TableHead>
                                                        <TableRow>
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => theme.palette.grey[50] }}>PO Number</TableCell>
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => theme.palette.grey[50] }}> PO Colorway</TableCell>
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => theme.palette.grey[50] }}>Mapped Color</TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {dataSet?.[poColorwaysKey]?.map((detail: any, colorwayIndex: number) => (
                                                            <TableRow key={detail?.id}>
                                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}><Link>{detail?.purchase_order_display_number}</Link></TableCell>
                                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}> {detail?.colorway}</TableCell>
                                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                                    <RitzSelection
                                                                        id="colorway"
                                                                        name="colorway"
                                                                        optionValue="id"
                                                                        optionText="colorway_name"
                                                                        selectedValue={detail?.[poClubColorwayKey]}
                                                                        isRequired={true}
                                                                        size='small'
                                                                        options={dataSet?.[actualpoclubcolorwaySetKey]?.filter((option: any) => option?.id !== 0)}
                                                                        isReadOnly={dataSet?.state !== 'open'}
                                                                        handleOnChange={(event: any) => handleChangePOColorwaySizeCountryMapping(event.target.value, colorwayIndex, 'colorway')}
                                                                    />
                                                                    <FormErrorMessage message={errors?.[poColorwaysKey]?.[detail?.id]?.[0]} />
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </Box>
                                        </Grid>
                                    </Grid>
                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                                        <Button variant="outlined" disabled={dataSet?.state !== 'open'} onClick={() => { handleSaveMappedData('save') }}>
                                            {isSaving && <SaveSpinner />}
                                            Save
                                        </Button>
                                    </Box>
                                </Box>
                                <Divider orientation="horizontal" flexItem sx={{ mt: 2, mb: 1, borderColor: (theme) => theme.palette.grey[300] }} />
                                <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>Size Mapping</Typography>
                                <Box sx={{ mt: 1 }}>
                                    <Grid container spacing={2} alignItems="stretch">
                                        <Grid item xs={6}>
                                            <Typography variant="h6" sx={{ mb: 1 }} color="primary">Purchase Order Club Sizes</Typography>
                                            <Box>
                                                <Table>
                                                    <TableHead>
                                                        <TableRow>
                                                            {preCostingDataSet?.costingType === preCostingType && (
                                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => theme.palette.grey[50] }}>Marketing Costing Size</TableCell>
                                                            )}
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => theme.palette.grey[50] }}>{preCostingDataSet?.costingType === 'pre_costing' ? "Pre Costing Size" : "Marketing Costing Size"} </TableCell>
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => theme.palette.grey[50] }}>
                                                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                                    <Box>PO Club Size</Box>
                                                                    <IconButton
                                                                        size="small"
                                                                        color="primary"
                                                                        onClick={() => { handleAddNewRow('size') }}
                                                                        disabled={dataSet?.state !== 'open'}
                                                                    >
                                                                        <AddCircleOutlineIcon />
                                                                    </IconButton>
                                                                </Box>
                                                            </TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {dataSet?.[actualPoClubSizeSetKey]?.map((size: any, actualSizeIndex: number) => (
                                                            <TableRow key={actualSizeIndex}>
                                                                {preCostingDataSet?.costingType === preCostingType && (
                                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '30%' }} >{size?.order_size_name || '--'}</TableCell>
                                                                )}
                                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }} >
                                                                    <RitzSelection
                                                                        id="size"
                                                                        name="size"
                                                                        optionValue="id"
                                                                        optionText="name"
                                                                        selectedValue={preCostingDataSet?.costingType === preCostingType ? size?.pre_costing_order_size : size?.marketing_order_size}
                                                                        isRequired={true}
                                                                        size='small'
                                                                        options={dataSet?.order_sizes}
                                                                        isReadOnly={dataSet?.state !== 'open'}
                                                                        handleOnChange={(event: any) => handleChangeOrderColorwaySizeCountryMapping(event.target.value, actualSizeIndex, 'size')}

                                                                    />
                                                                    <FormErrorMessage message={errors?.[actualPoClubSizeSetKey]?.[size?.id]?.[0]} />
                                                                </TableCell>
                                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '35%' }} >
                                                                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                                                                        {editRowData?.['size']?.selectIndex == actualSizeIndex ? (
                                                                            <TextField
                                                                                value={editRowData?.['size']?.editValue}
                                                                                onChange={(e: any) =>
                                                                                    setEditRowData((prev: any) => ({
                                                                                        ...prev,
                                                                                        size: {
                                                                                            ...prev.size,
                                                                                            editValue: e.target.value,
                                                                                        },
                                                                                    }))
                                                                                }
                                                                                disabled={dataSet?.state !== 'open'}
                                                                                size="small"
                                                                                sx={{ flexGrow: 1 }}
                                                                            />
                                                                        ) : (
                                                                            <Box sx={{ flexGrow: 1 }}>{size?.[sizeNameKey]}</Box>
                                                                        )}
                                                                        <Box>
                                                                            {editRowData?.['size']?.selectIndex == actualSizeIndex ? (
                                                                                <Box sx={{ display: 'flex', flexGrow: 1, justifyContent: 'flex-end' }}>
                                                                                    <IconButton
                                                                                        size="small"
                                                                                        color="primary"
                                                                                        sx={{ ml: 1 }}
                                                                                        onClick={() => handleSaveClick('size')}
                                                                                        disabled={dataSet?.state !== 'open'}
                                                                                    >
                                                                                        <SaveIcon />
                                                                                    </IconButton>
                                                                                    <IconButton
                                                                                        size="small"
                                                                                        color="error"
                                                                                        sx={{ ml: 1 }}
                                                                                        onClick={() => handleDeleteClick(size?.id, actualSizeIndex, 'size')}
                                                                                        disabled={dataSet?.state !== 'open'}
                                                                                    >
                                                                                        <DeleteIcon />
                                                                                    </IconButton>
                                                                                </Box>
                                                                            ) : (
                                                                                <>
                                                                                    <IconButton
                                                                                        size="small"
                                                                                        color="primary"
                                                                                        sx={{ ml: 1 }}
                                                                                        onClick={() => handleEditClick('size', size?.id, actualSizeIndex, size?.size_name)}
                                                                                        disabled={dataSet?.state !== 'open'}
                                                                                    >
                                                                                        <EditIcon />
                                                                                    </IconButton>
                                                                                    <IconButton
                                                                                        size="small"
                                                                                        color="error"
                                                                                        sx={{ ml: 1 }}
                                                                                        onClick={() => handleDeleteClick(size?.id, actualSizeIndex, 'size')}
                                                                                        disabled={dataSet?.state !== 'open'}
                                                                                    >
                                                                                        <DeleteIcon />
                                                                                    </IconButton>
                                                                                </>
                                                                            )}
                                                                        </Box>
                                                                    </Box>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </Box>
                                        </Grid>
                                        <Divider orientation="vertical" flexItem sx={{ mx: 2, borderColor: (theme) => theme.palette.grey[300] }} />
                                        <Grid item xs={5}>
                                            <Typography variant="h6" sx={{ mb: 1 }} color="primary">Purchase Order Sizes</Typography>
                                            <Box>
                                                <Table>
                                                    <TableHead>
                                                        <TableRow>
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => theme.palette.grey[50] }}>PO Number</TableCell>
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => theme.palette.grey[50] }}>PO Size</TableCell>
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => theme.palette.grey[50] }}>Mapped Size</TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {dataSet?.[poSizesKey]?.map((poSize: any, sizeIndex: number) => (
                                                            <TableRow key={poSize?.id}>
                                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}><Link>{poSize?.purchase_order_display_number}</Link></TableCell>
                                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}> {poSize?.po_size_name}</TableCell>
                                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                                    <RitzSelection
                                                                        id="po_club_size"
                                                                        name="po_club_size"
                                                                        optionValue="id"
                                                                        optionText="size_name"
                                                                        selectedValue={poSize?.[poClubSizeKey]}
                                                                        isRequired={true}
                                                                        size='small'
                                                                        options={dataSet?.[actualPoClubSizeSetKey]?.filter((option: any) => option?.id !== 0)}
                                                                        handleOnChange={(event: any) => handleChangePOColorwaySizeCountryMapping(event.target.value, sizeIndex, 'size')}
                                                                        isReadOnly={dataSet?.state !== 'open'}
                                                                    />
                                                                    <FormErrorMessage message={errors?.[poSizesKey]?.[poSize?.id]?.[0]} />
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </Box>
                                        </Grid>
                                    </Grid>
                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                                        <Button variant="outlined" disabled={dataSet?.state !== 'open'} onClick={() => { handleSaveMappedData('save') }}>
                                            {isSaving && <SaveSpinner />}
                                            Save
                                        </Button>
                                    </Box>
                                </Box>
                                <Divider orientation="horizontal" flexItem sx={{ mt: 2, mb: 1, borderColor: (theme) => theme.palette.grey[300] }} />
                                <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>Country Mapping</Typography>
                                <Box sx={{ mt: 1 }}>
                                    <Grid container spacing={2} alignItems="stretch">
                                        <Grid item xs={6}>
                                            <Typography variant="h6" sx={{ mb: 1 }} color="primary">Purchase Order Club Countries</Typography>
                                            <Box>
                                                <Table>
                                                    <TableHead>
                                                        <TableRow>
                                                            {preCostingDataSet?.costingType === preCostingType && (
                                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => theme.palette.grey[50] }}>Marketing Costing Country</TableCell>
                                                            )}
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => theme.palette.grey[50] }}>{preCostingDataSet?.costingType === preCostingType ? "Pre Costing Country" : "Marketing Costing Country"}</TableCell>
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => theme.palette.grey[50] }}>
                                                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                                    <Box>PO Club Country</Box>
                                                                    <IconButton
                                                                        size="small"
                                                                        color="primary"
                                                                        onClick={() => { handleAddNewRow('country') }}
                                                                        disabled={dataSet?.state !== 'open'}
                                                                    >
                                                                        <AddCircleOutlineIcon />
                                                                    </IconButton>
                                                                </Box>
                                                            </TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {dataSet?.[actualPoClubCountrySetKey]?.map((country: any, countryIndex: number) => (
                                                            <TableRow key={countryIndex}>
                                                                {preCostingDataSet?.costingType === preCostingType && (
                                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '30%' }} >{country?.order_country_name || '--'}</TableCell>
                                                                )}
                                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }} >
                                                                    <RitzSelection
                                                                        id="order_country"
                                                                        name="order_country"
                                                                        optionValue="id"
                                                                        optionText="name"
                                                                        selectedValue={preCostingDataSet?.costingType === preCostingType ? country?.pre_costing_order_country : country?.marketing_order_country}
                                                                        isRequired={true}
                                                                        size='small'
                                                                        options={dataSet?.order_countries}
                                                                        isReadOnly={dataSet?.state !== 'open'}
                                                                        handleOnChange={(event: any) => handleChangeOrderColorwaySizeCountryMapping(event.target.value, countryIndex, 'country')}

                                                                    />
                                                                    <FormErrorMessage message={errors?.[actualPoClubCountrySetKey]?.[country?.id]?.[0]} />
                                                                </TableCell>
                                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '35%' }} >
                                                                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                                                                        {editRowData?.['country']?.selectIndex == countryIndex ? (
                                                                            <TextField
                                                                                value={editRowData?.['country']?.editValue}
                                                                                onChange={(e) =>
                                                                                    setEditRowData((prev: any) => ({
                                                                                        ...prev,
                                                                                        country: {
                                                                                            ...prev.country,
                                                                                            editValue: e.target.value,
                                                                                        },
                                                                                    }))
                                                                                }
                                                                                size="small"
                                                                                disabled={dataSet?.state !== 'open'}
                                                                                sx={{ flexGrow: 1 }}
                                                                            />
                                                                        ) : (
                                                                            <Box sx={{ flexGrow: 1 }}>{country?.[countryNameKey]}</Box>
                                                                        )}
                                                                        <Box>
                                                                            {editRowData?.['country']?.selectIndex == countryIndex ? (
                                                                                <>
                                                                                    <Box sx={{ display: 'flex', flexGrow: 1, justifyContent: 'flex-end' }}>
                                                                                        <IconButton
                                                                                            size="small"
                                                                                            color="primary"
                                                                                            sx={{ ml: 1 }}
                                                                                            onClick={() => handleSaveClick('country')}
                                                                                            disabled={dataSet?.state !== 'open'}
                                                                                        >
                                                                                            <SaveIcon />
                                                                                        </IconButton>
                                                                                        <IconButton
                                                                                            size="small"
                                                                                            color="error"
                                                                                            sx={{ ml: 1 }}
                                                                                            onClick={() => handleDeleteClick(country?.id, countryIndex, 'country')}
                                                                                            disabled={dataSet?.state !== 'open'}
                                                                                        >
                                                                                            <DeleteIcon />
                                                                                        </IconButton>
                                                                                    </Box>
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <IconButton
                                                                                        size="small"
                                                                                        color="primary"
                                                                                        sx={{ ml: 1 }}
                                                                                        onClick={() => handleEditClick('country', country?.id, countryIndex, country?.country_name)}
                                                                                        disabled={dataSet?.state !== 'open'}
                                                                                    >
                                                                                        <EditIcon />
                                                                                    </IconButton>
                                                                                    <IconButton
                                                                                        size="small"
                                                                                        color="error"
                                                                                        sx={{ ml: 1 }}
                                                                                        onClick={() => handleDeleteClick(country?.id, countryIndex, 'country')}
                                                                                        disabled={dataSet?.state !== 'open'}
                                                                                    >
                                                                                        <DeleteIcon />
                                                                                    </IconButton>
                                                                                </>
                                                                            )}
                                                                        </Box>
                                                                    </Box>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </Box>
                                        </Grid>
                                        <Divider orientation="vertical" flexItem sx={{ mx: 2, borderColor: (theme) => theme.palette.grey[300] }} />
                                        <Grid item xs={5}>
                                            <Typography variant="h6" sx={{ mb: 1 }} color="primary">Purchase Order Countries</Typography>
                                            <Box>
                                                <Table>
                                                    <TableHead>
                                                        <TableRow>
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => theme.palette.grey[50] }}>PO Number</TableCell>
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => theme.palette.grey[50] }}>PO Country</TableCell>
                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => theme.palette.grey[50] }}>Mapped Country</TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {dataSet?.[poCountriesKey]?.map((poCountry: any, countryIndex: number) => (
                                                            <TableRow key={poCountry?.id}>
                                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}><Link>{poCountry?.purchase_order_display_number}</Link></TableCell>
                                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}> {poCountry?.po_country_name}</TableCell>
                                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                                    <RitzSelection
                                                                        id="country_name"
                                                                        name="country_name"
                                                                        optionValue="id"
                                                                        optionText="country_name"
                                                                        selectedValue={poCountry?.[poClubCountryKey]}
                                                                        isRequired={true}
                                                                        size='small'
                                                                        options={dataSet?.[actualPoClubCountrySetKey]?.filter((option: any) => option?.id !== 0)}
                                                                        handleOnChange={(event: any) => handleChangePOColorwaySizeCountryMapping(event.target.value, countryIndex, 'country')}
                                                                        isReadOnly={dataSet?.state !== 'open'}
                                                                    />
                                                                    <FormErrorMessage message={errors?.[poCountriesKey]?.[poCountry?.id]?.[0]} />
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </Box>
                                        </Grid>
                                    </Grid>
                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                                        <Button variant="outlined" disabled={dataSet?.state !== 'open'} onClick={() => { handleSaveMappedData('save') }}>
                                            {isSaving && <SaveSpinner />}
                                            Save
                                        </Button>
                                    </Box>
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                                    {dataSet?.state === 'open' && (
                                        <>
                                            {preCostingDataSet?.costingType === preCostingType && (
                                                <Button variant="contained" sx={{ mr: 1 }} onClick={() => { handleSaveMappedData('verify') }} disabled={isSaving}>{isSaving && <SaveSpinner />}Verify</Button>
                                            )}
                                            <Button variant="contained"  onClick={() => { handleSaveMappedData('save') }} disabled={isSaving}>{isSaving && <SaveSpinner />}Save</Button>
                                        </>
                                    )}
                                    {dataSet?.costing_type != preCostingType && (
                                        <>
                                            {preCostingDataSet?.costingType != preCostingType && (
                                                <Button sx={{ ml: 1 }} variant="contained" onClick={() => { handleSaveMappedData('start_pre_costing') }} disabled={isCreatingPreCosting}>{isCreatingPreCosting && <SaveSpinner />} Start Pre Costing</Button>
                                            )}
                                        </>
                                    )}
                                </Box>
                            </Box>
                        </>
                    )}
                </>
            ) : (
                <>
                    <Alert severity='info'>Please select the costing type</Alert>
                </>
            )}

        </>
    );
};

export default MappingColorways;
