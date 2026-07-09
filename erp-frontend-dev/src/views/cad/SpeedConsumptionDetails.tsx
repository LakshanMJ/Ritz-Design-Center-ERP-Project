import React, { useEffect, useRef, useState } from 'react';
import { Typography, Box, Alert, Button, Link, Table, TableHead, TableRow, TableCell, TableBody, TableContainer, useTheme, ToggleButtonGroup, ToggleButton, TextField, IconButton } from '@mui/material';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';
import DefaultLoader from '@/components/DefaultLoader';
import RitzSelection from '@/components/Ritz/RitzSelection';
import { ReactKeyHelper } from '@/helpers/KeyHelper';
import { useRouter } from 'next/router';
import { purchaseOrderClubDetailsPageURL } from '@/helpers/constants/front_end/POUrls';
import NextLink from 'next/link';
import RitzSwitch from '@/components/Ritz/RitzSwitch';
import { pendingSpeedConsumptionDetailURL, speedConsumptionMaterialListURL, speedConsumptionsCompleteURL, speedConsumptionsSaveURL } from '@/helpers/constants/rest_urls/CostingUrls';
import { DEFAULT_SUCCESS } from '@/helpers/constants/Constants';
import RitzSearchableSelection from '@/components/Ritz/RitzSearchableSelection';
import CircularLoader from '@/components/CircularLoader';
import { ArrowBackIos, ArrowForwardIos } from "@mui/icons-material";
import { orderSummaryVersionURL } from '@/helpers/constants/FrontEndUrls';
import RitzMultipleImagePreview from '@/components/Ritz/RitzMultipleImagePreview';

const SpeedConsumptionDetails = ({ costingId, refreshData}: any) => {
    const theme = useTheme();
    const router = useRouter();
    const prevPoClub = useRef<string | null>(null);
    const keyHelper = new ReactKeyHelper();
    const [isLoadingCircularLoader, setIsLoadingCircularLoader] = useState(false);
    const [isLoading, setIsLoading] = useState(true)
    const [speedConsumptionDetails, setSpeedConsumptionDetails] = useState<any>({});
    const [selectedItemDetails, setSelectedItemDetails] = useState<any>({});
    const [speedConsumptionMaterialList, setSpeedConsumptionMaterialList] = useState<any>([]);

    const loadCostingDetails = (costingId: any) => {
        const requests = [
            api.get(pendingSpeedConsumptionDetailURL(costingId)),
            api.get(speedConsumptionMaterialListURL(costingId)),
        ]
        Promise.all(requests).then(response => {
            const [costingDetails, materialList] = response.map((r: any) => r.data);
            setSpeedConsumptionDetails({ ...costingDetails })
            setSpeedConsumptionMaterialList([...materialList])
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false);
        });
    }

    const handleSave = () => {
        setIsLoadingCircularLoader(true)
        const request = {
            method: 'post',
            url: speedConsumptionsSaveURL(),
            data: {
                item_data: selectedItemDetails
            }
        }
        api(request).then(() => {
            toast.success(DEFAULT_SUCCESS);
            loadCostingDetails(costingId);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoadingCircularLoader(false));
    }

    const handleComplete = () => {
        setIsLoadingCircularLoader(true)
        const request = {
            method: 'post',
            url: speedConsumptionsCompleteURL(costingId),
        }
        api(request).then(() => {
            toast.success(DEFAULT_SUCCESS);
            refreshData()
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoadingCircularLoader(false));
    }

    const handleItemOnChange = (event: any, newItemId: number | null) => {
        setSelectedItemDetails({})
        if (newItemId !== null) {
            const selectedItem = speedConsumptionDetails?.item_data?.find((item: any) => item.id === newItemId);
            setSelectedItemDetails(selectedItem);
        }
    };

    const handleChangePlacementData = (value: any, index: number, key: string) => {
        const updatedData = [...selectedItemDetails.placements];
        updatedData[index] = { ...updatedData[index], [key]: value };
        setSelectedItemDetails({ ...selectedItemDetails, placements: updatedData });
    };

    useEffect(() => {
        const { costing } = router.query;
        if (costing && costing !== prevPoClub.current) {
            setIsLoading(true);
            setSelectedItemDetails({});
            loadCostingDetails(parseInt(costing.toString()));
            prevPoClub.current = costing.toString();
        }
    }, [router]);

    return (
        <>
            {isLoadingCircularLoader && (<CircularLoader />)}
            {isLoading ? <DefaultLoader /> : (
                <>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', }}>
                        <Typography variant="h1">
                            <Link component={NextLink} href={orderSummaryVersionURL(speedConsumptionDetails?.order_id, speedConsumptionDetails?.id)}>{speedConsumptionDetails?.long_code}</Link>
                        </Typography>
                    </Box>
                    <Box sx={{ width: '50%' }}>
                        <Table aria-label="simple table">
                            <TableBody>
                                <TableRow>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%' }}>
                                        Tech Pack
                                    </TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%', wordBreak: 'break-all' }}>
                                        {speedConsumptionDetails?.tech_packs?.length === 0 ? ('--') : (
                                            speedConsumptionDetails?.tech_packs?.map((pack: any, index: number) => (
                                                <span key={`${keyHelper.getNextKeyValue()}`}>
                                                    <Link href={pack.file_path} target="_blank" rel="noopener noreferrer" underline="hover">
                                                        {pack.display_name}
                                                    </Link>
                                                    {index !== speedConsumptionDetails.tech_packs.length - 1 && ', '}
                                                </span>
                                            ))
                                        )}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%' }}>
                                        No of Packs
                                    </TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%', wordBreak: 'break-all' }}>{speedConsumptionDetails?.no_of_products}</TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%' }}>
                                        Order Quantity
                                    </TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%', wordBreak: 'break-all' }}>{speedConsumptionDetails?.order_quantity
                                    }</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </Box>
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="h4">Pack Items</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', mt: 2 }}>
                        <ToggleButtonGroup
                            color="primary"
                            value={selectedItemDetails?.id || null}
                            exclusive
                            onChange={handleItemOnChange}
                            aria-label="Customer"
                            sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}
                        >
                            {speedConsumptionDetails?.item_data?.map((item: any) => (
                                <ToggleButton
                                    key={item.id}
                                    value={item.id}
                                    style={{
                                        height: "4em",
                                        minWidth: "120px",
                                        border: "1px solid #E0E0E0",
                                        borderRadius: "5px",
                                        display: "flex",
                                        justifyContent: "center",
                                        alignItems: "center",
                                        textAlign: "center",
                                        marginBottom: "10px",
                                    }}
                                >
                                    {item.name}
                                </ToggleButton>
                            ))}
                        </ToggleButtonGroup>
                    </Box>
                    <Box sx={{ mt: 2 }}>
                        {!selectedItemDetails?.id ? (
                            <Alert severity="info">Please select an Item to view the placement data.</Alert>
                        ) : (
                            <>
                                <TableContainer>
                                    <Table>
                                        <TableHead>
                                            <TableRow sx={{ background: (theme) => theme.palette.grey[100] }}>
                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '25%' }}>Item Image</TableCell>
                                                {selectedItemDetails?.placements?.map((placement: any) => (
                                                    <TableCell key={keyHelper.getNextKeyValue()} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                        {placement?.name}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            <TableRow>
                                                    <TableCell rowSpan={2} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>
                                                        {selectedItemDetails?.images?.length > 0 ? (
                                                            <RitzMultipleImagePreview images={selectedItemDetails?.images} />
                                                        ) : (
                                                            <Typography variant="body2" color="textSecondary">
                                                                No Image Available
                                                            </Typography>
                                                        )}
                                                    </TableCell>
                                                {selectedItemDetails?.placements?.map((placement: any, placementIndex: any) => (
                                                    <TableCell key={keyHelper.getNextKeyValue()} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                        {placement?.material_state ? (
                                                            <Alert severity="info" sx={{ backgroundColor: 'transparent', boxShadow: 'none', border: 'none' }}>Already assigned materials</Alert>
                                                        ) : (
                                                            <>
                                                                <Typography>Material</Typography>
                                                                <RitzSearchableSelection
                                                                    options={speedConsumptionMaterialList}
                                                                    placeholder="Select..."
                                                                    selectedValue={placement?.material_id}
                                                                    handleOnChange={(selectedValue: any) => { handleChangePlacementData(selectedValue, placementIndex, 'material_id') }}
                                                                    id={'id'}
                                                                    name={'id'}
                                                                    optionValue={'id'}
                                                                    optionText={'name'}
                                                                />
                                                            </>
                                                        )}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                            <TableRow>
                                                {selectedItemDetails?.placements?.map((placement: any, placementIndex: any) => (
                                                    <TableCell key={keyHelper.getNextKeyValue()} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                        <Typography>Consumption</Typography>
                                                        <TextField
                                                            id='last_name'
                                                            fullWidth
                                                            autoComplete="off"
                                                            name="last_name"
                                                            value={placement?.estimated_consumption_ratio}
                                                            onChange={(event: any) => { handleChangePlacementData(event?.target?.value, placementIndex, 'estimated_consumption_ratio') }}
                                                        />
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                                    <RitzSwitch name="Complete Status" handleChangeSwitch={() => {}} />
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                                    <Button
                                        variant="contained"
                                        onClick={() => { handleSave(); }}
                                        size="small"
                                        color="primary"
                                    >
                                        Save
                                    </Button>
                                </Box>
                            </>
                        )}

                    </Box>
                </>
            )}
        </>
    );
};

export default SpeedConsumptionDetails;