import React, { useEffect, useState } from "react";
import { Box, Button, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography, useTheme } from "@mui/material";
import api from "@/services/api";
import DefaultLoader from "@/components/DefaultLoader";
import { ReactKeyHelper } from "@/helpers/KeyHelper";
import toast from "react-hot-toast";
import { getDefaultError } from "@/helpers/Utilities";
import { costingSpeedConsumptionDetailsURL, costingSpeedConsumptionSaveURL, speedConsumptionsSendToCadTeamURL } from "@/helpers/constants/rest_urls/CostingUrls";
import { DEFAULT_SUCCESS } from "@/helpers/constants/Constants";
import RitzModal from "@/components/Ritz/RitzModal";
import SystemMatchingPlacementConsumptions from "./SystemMatchingPlacementConsumptions";
import { ArrowBackIos, ArrowForwardIos } from "@mui/icons-material";
import RitzMultipleImagePreview from "@/components/Ritz/RitzMultipleImagePreview";

const SpeedConsumptionRequest = ({ orderId, versionId, versionData }: any) => {
    const theme = useTheme();
    const keyHelper = new ReactKeyHelper();
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [openYYDetailsModal, setOpenYYDetailsModal] = useState<any>({})
    const [productsDetails, setProductsDetails] = useState<any>({})
    const [errors, setErrors] = useState<any>({})

    const fetchData = () => {
        Promise.all([
            api.get(costingSpeedConsumptionDetailsURL(versionId)),
        ]).then(resp => {
            const respData = resp.map((r: any) => r.data);
            const [consumptionData, unitsList] = respData;
            setProductsDetails({ ...consumptionData });
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false);
        });
    }

    const handleChangeConsumptionData = (value: any, itemIndex: any, placementIndex: any, field: any) => {
        if (!productsDetails?.item_data) return;
        const updatedRatios = [...productsDetails.item_data];

        const updatedItem = { ...updatedRatios[itemIndex] };
        if (!updatedItem?.placements) return;

        const updatedPlacements = [...updatedItem.placements];
        const updatedPlacement = { ...updatedPlacements[placementIndex] };
        updatedPlacement[field] = value;

        updatedPlacements[placementIndex] = updatedPlacement;
        updatedItem.placements = updatedPlacements;

        updatedRatios[itemIndex] = updatedItem;
        setProductsDetails({ ...productsDetails, item_data: updatedRatios });
    };

    const handleSave = () => {
        const request = {
            method: 'post',
            url: costingSpeedConsumptionSaveURL(),
            data: {
                item_data: productsDetails?.item_data
            }
        }
        api(request).then(() => {
            toast.success(DEFAULT_SUCCESS);
            fetchData()
        }).catch(error => {
            setErrors(error?.response?.data)
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsSaving(false));
    }

    const handleSendToCadTeam = () => {
        const request = {
            method: 'post',
            url: speedConsumptionsSendToCadTeamURL(versionId),
        }
        api(request).then(() => {
            toast.success(DEFAULT_SUCCESS);
            fetchData()
        }).catch(error => {
            setErrors(error?.response?.data)
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsSaving(false));
    }

    const handleOpenYYModal = (status: any, selectedId: any) => {
        setOpenYYDetailsModal({ modalStatus: status, selectedId: selectedId })
    }

    useEffect(() => {
        if (versionId) {
            fetchData()
        }
    }, [versionId]);


    return (
        <>
            {openYYDetailsModal?.modalStatus && (
                <RitzModal maxWidth='xl' open={openYYDetailsModal?.modalStatus} title={'System Matching Details'} onClose={() => setOpenYYDetailsModal({ modalStatus: false, selectedId: null })}>
                    <SystemMatchingPlacementConsumptions itemId={openYYDetailsModal?.selectedId} versionId={versionId} />
                </RitzModal>
            )}
            {isLoading ? (
                <DefaultLoader />
            ) : (
                <>
                    <Box sx={{ width: '50%' }}>
                        <Table aria-label="simple table">
                            <TableBody>
                                <TableRow>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%' }}>
                                        No of Products
                                    </TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%', wordBreak: 'break-all' }}>
                                        {productsDetails?.no_of_products}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%' }}>
                                        Order Quantity
                                    </TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%', wordBreak: 'break-all' }}>
                                        {productsDetails?.order_quantity}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%' }}>
                                        Pack Items
                                    </TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%', wordBreak: 'break-all' }}>
                                        {productsDetails?.item_data?.map((item: any) => item?.name).join(' / ')}
                                    </TableCell>
                                </TableRow>
                                <TableRow>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%' }}>
                                        Pack YY
                                    </TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%', wordBreak: 'break-all' }}>
                                        <TextField
                                            id={"consumption"}
                                            name={"consumption"}
                                            value={productsDetails?.total_yy}
                                            autoComplete="new-username"
                                            onChange={(event: any) => { setProductsDetails({ ...productsDetails, pack_yy: event.target.value }); }}
                                            fullWidth
                                            disabled={true}
                                            type="number"
                                        />
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </Box>
                    <Box>
                        {productsDetails?.item_data?.map((item: any, itemIndex: any) => (
                            <React.Fragment key={keyHelper.getNextKeyValue()}>
                                <Box sx={{ mt: 1 }}>
                                    <Typography sx={{ color: 'primary.main' }} variant="h6">{item?.name}</Typography>
                                </Box>
                                <Box sx={{ mt: 1, overflowX: 'auto', width: '100%' }}>
                                    <TableContainer sx={{ minWidth: '800px' }}>
                                        <Table aria-label="simple table">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '25%' }}>Image</TableCell>
                                                    {item?.placements?.map((placement: any) => (
                                                        <TableCell key={keyHelper.getNextKeyValue()}
                                                            sx={{
                                                                border: (theme) => `1px solid ${theme.palette.grey[200]}`,
                                                                minWidth: '150px',
                                                                textAlign: 'center',
                                                                whiteSpace: 'nowrap',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                            }}>
                                                            {placement?.name}
                                                        </TableCell>
                                                    ))}
                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center', width: '15%' }}>Action</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                <TableRow>
                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>
                                                        <RitzMultipleImagePreview images={item?.images || []} />
                                                    </TableCell>
                                                    {item?.placements?.map((placement: any, placementIndex: any) => (
                                                        <TableCell key={keyHelper.getNextKeyValue()} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                            <Typography>Consumption</Typography>
                                                            <TextField
                                                                id={"consumption"}
                                                                name={"consumption"}
                                                                value={placement?.estimated_consumption_ratio}
                                                                autoComplete="new-username"
                                                                onChange={(event: any) => { handleChangeConsumptionData(parseFloat(event?.target?.value), itemIndex, placementIndex, 'estimated_consumption_ratio') }}
                                                                fullWidth
                                                                type="number"
                                                            />
                                                        </TableCell>
                                                    ))}
                                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center', width: '15%' }}>
                                                        <Button
                                                            variant="outlined"
                                                            color="primary"
                                                            onClick={() => { handleOpenYYModal(true, item?.id) }}
                                                            disabled={isSaving}
                                                        >
                                                            YY Request
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Box>
                            </React.Fragment>
                        ))}
                    </Box>
                    <Box display="flex" justifyContent="flex-end" sx={{ mt: 2 }}>
                        <Button variant="contained" color="primary" onClick={() => { handleSave() }} disabled={productsDetails?.send_to_cad_status} > Save </Button>
                        <Button sx={{ ml: 1 }} variant="contained" color="primary" onClick={() => { handleSendToCadTeam() }} disabled={productsDetails?.send_to_cad_status} > Send To CAD Team</Button>
                    </Box>
                </>
            )}
        </>
    );
};

export default SpeedConsumptionRequest;
