import React, { useEffect, useState } from "react";
import { Box, Card, CardContent, CardHeader, Grid, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { useRouter } from "next/router";
import {
    orderMaterialAssignURL,
    orderMaterialPackagingAssignURL,
    orderMaterialSupplierSelectURL,
    orderPackagingSuppliersSelectURL
} from "@/helpers/constants/FrontEndUrls";
import EditIcon from '@mui/icons-material/Edit';
import * as restUrls from "@/helpers/constants/RestUrls";
import api from "@/services/api";
import DefaultLoader from "@/components/DefaultLoader";
import {COMPLETED_VERSION_STATE, PENDING_SUPPLIER_SELECTION_VERSION_STATE} from "@/helpers/constants/CostingStates";
import { toast } from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';
import GradingIcon from '@mui/icons-material/Grading';
import ReviewStatus from "@/components/OrderInquiry/Costing/ReviewStatus";
import VisibilityIcon from '@mui/icons-material/Visibility';
import RitzModal from "@/components/Ritz/RitzModal";
import CostingSummary from "./CostingSummary";

const OrderPack = ({ orderId, versionId, versionData }: any) => {

    const router = useRouter();
    const [navigation, setNavigation] = useState<any>({});
    const [isLoading, setIsLoading] = useState(true);
    const showSupplierLinks = versionData?.version_state?.value === PENDING_SUPPLIER_SELECTION_VERSION_STATE;
    const costingCompleteState = versionData?.version_state?.value === COMPLETED_VERSION_STATE;
    const [openSummaryModal, setOpenSummaryModal] = useState({modalStaus: false, selectedPackId: null});

    useEffect(() => {
        if (orderId && versionId) {
            fetchData();
        }
    }, [orderId, versionId]);

    const fetchData = () => {
        api.get(restUrls.getNavigationOrderMaterialURL(orderId, versionId)).then(resp => {
            const respData = resp?.data || {};
            setNavigation(respData);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false);
        });
    }

    const getSizeString = (sizes: any) => {
        let sizeString = '';
        sizes?.forEach((size: any, index: number) => {
            let trailVal = index - 1 < sizes.length - 2 ? ", " : " "
            sizeString += size?.abbreviation + trailVal
        });
        return sizeString;
    }

    const handleOrderPackEditOnClick = (colorway_id: number, size_id: number, item_id: number, country_id: number, isSupplierUrl?: boolean) => {
        let orderPackItem = navigation?.order_pack_items.find((orderPackItem: any) => {
            return orderPackItem.item_id == item_id && orderPackItem.size_id == size_id && orderPackItem.colorway_id == colorway_id && orderPackItem.country_id == country_id;
        });
        if (orderPackItem) {
            let url = orderMaterialAssignURL(orderId, orderPackItem?.id, versionId);

            if (isSupplierUrl) {
                url = orderMaterialSupplierSelectURL(orderId, orderPackItem?.id, versionId);
            } else if (versionData?.['version_state']?.['value']  == PENDING_SUPPLIER_SELECTION_VERSION_STATE) {
                url = orderMaterialSupplierSelectURL(orderId, orderPackItem?.id, versionId);
            }
            router.push(url);
        }
    }

    const handleMaterialPackagingOnClick = (colorway_id: number, size_id: number, country_id: number, isSupplierUrl?: boolean) => {
        let orderPack = navigation?.order_packs.find((orderPack: any) => {
            return orderPack.size == size_id && orderPack.colorway == colorway_id && orderPack.country == country_id;
        });
 
        if (orderPack) {
            let url = orderMaterialPackagingAssignURL(orderId, orderPack?.id, versionId);
            if (isSupplierUrl) {
                url = orderPackagingSuppliersSelectURL(orderId, orderPack?.id, versionId);
            } else if (versionData?.['version_state']?.['value'] == PENDING_SUPPLIER_SELECTION_VERSION_STATE) {
                url = orderMaterialSupplierSelectURL(orderId, orderPack?.id, versionId);
            }
            router.push(url);
        }
    }

    const getPackItemCompletionStatus = (colorway_id: number, size_id: number, item_id: number, country_id: number) => {
        let orderPackItem = navigation?.order_pack_items.find((orderPackItem: any) => {
            return orderPackItem.item_id == item_id && orderPackItem.size_id == size_id && orderPackItem.colorway_id == colorway_id && orderPackItem.country_id == country_id;
        });
        if (orderPackItem) {
            return orderPackItem?.reviewed;
        }
        return false;
    }

    const getPackagingCompleteStatus = (colorway_id: number, size_id: number, country_id: number, isSupplierUrl?: boolean) => {
        let orderPack = navigation?.order_packs.find((orderPack: any) => {
            return orderPack.size == size_id && orderPack.colorway == colorway_id && orderPack.country == country_id;
        });
        if (orderPack) {
            return orderPack?.reviewed;
        }
        return false;
    }
    const handleViewSummary = (colorway_id: number, size_id: number, country_id: number, isSupplierUrl?: boolean) => {
        let orderPack = navigation?.order_packs.find((orderPack: any) => {
            return orderPack.size == size_id && orderPack.colorway == colorway_id && orderPack.country == country_id;
        });
         setOpenSummaryModal({modalStaus: true, selectedPackId: orderPack.id})
    }

    return (
        <>
        {openSummaryModal?.modalStaus &&(
            <RitzModal
            onClose={() => setOpenSummaryModal({modalStaus: false, selectedPackId: null})}
            title={"Costing Sheet"}
            open={openSummaryModal?.modalStaus}
            maxWidth='xl'
            fullWidth={true}
        >
            <CostingSummary orderId={orderId} versionId={versionId} packId={openSummaryModal?.selectedPackId} />
        </RitzModal>
        )} 
        {isLoading ? <DefaultLoader/> : 
            <Stack>
                {navigation?.order_pack_size_groups?.map((size_group_pack: any, index: number) => (
                    <Box key={`${index}`} sx={{ mb: index < (navigation?.order_pack_size_groups?.length - 1) ? 5 : 0 }}>
                        <Typography variant='h4' sx={{ ml: .2, mb: 2 }}>
                            {`${size_group_pack?.order_country?.name} - ${size_group_pack?.order_colorway?.name} - ${getSizeString(size_group_pack?.order_sizes)} Packs`}
                        </Typography>
                        {/* <Divider sx={{ mt: 1, mb: 2 }} /> */}
                        <Grid container columnSpacing={3} rowSpacing={2}>
                            {size_group_pack?.order_sizes.map((size: any, index2: number) => (
                                <Grid item key={`${index}-${index2}`} xs={12} md={6} lg={4}>
                                    <Card variant='outlined' key={index2}>
                                        <CardHeader
                                            sx={{
                                                py: 1,
                                                backgroundColor: (theme) => theme.palette.grey[50]
                                            }}
                                            titleTypographyProps={{
                                                variant: 'h6',
                                                fontWeight: 400
                                            }}
                                            title={`${size_group_pack?.order_country?.name} - ${size_group_pack?.order_colorway.name} - ${size?.abbreviation} Pack`}
                                            action={
                                                ((versionData?.version_state?.value === 'complete')) && (
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleViewSummary(
                                                            size_group_pack?.order_colorway?.id,
                                                            size?.id,
                                                            size_group_pack?.order_country?.id,
                                                            false
                                                        )}
                                                        style={{ cursor: "pointer" }}
                                                    >
                                                        <VisibilityIcon color="primary" />
                                                    </IconButton>
                                                )
                                            }
                                        />
                                        <CardContent>
                                            {navigation?.items?.map((order_item: any, index3: number) => (
                                                <Box key={`${index}_${index2}_${index3}`}>
                                                    <Box
                                                        sx={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                        }}
                                                    >
                                                        <Box sx={{ display: 'flex' }}>
                                                            <ReviewStatus status={getPackItemCompletionStatus(
                                                                size_group_pack?.order_colorway?.id,
                                                                size?.id,
                                                                order_item?.id,
                                                                size_group_pack?.order_country?.id)}/>
                                                            <Box sx={{ pl: 1 }}>{order_item?.name} ({navigation?.item_colorway_categories?.[size_group_pack?.order_colorway.id]?.items?.[order_item?.id]?.colorway_category})</Box>
                                                        </Box>
                                                        <Box>
                                                           {!showSupplierLinks && !costingCompleteState  &&
                                                                <IconButton size='small' color='primary' onClick={() => handleOrderPackEditOnClick(
                                                                    size_group_pack?.order_colorway?.id,
                                                                    size?.id,
                                                                    order_item?.id,
                                                                    size_group_pack?.order_country?.id,
                                                                )} >
                                                                    <EditIcon fontSize='inherit' />
                                                                </IconButton>
                                                            }
                                                            {(showSupplierLinks || costingCompleteState) && (
                                                                <Tooltip title='Select Suppliers' disableInteractive>
                                                                    <IconButton size='small' color='primary' onClick={() => handleOrderPackEditOnClick(
                                                                        size_group_pack?.order_colorway?.id,
                                                                        size?.id,
                                                                        order_item?.id,
                                                                        size_group_pack?.order_country?.id,
                                                                        true
                                                                    )}>
                                                                        <GradingIcon fontSize='inherit' />
                                                                    </IconButton>
                                                                </Tooltip>
                                                            )}
                                                        </Box>
                                                    </Box>
                                                </Box>
                                            ))}
                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <Box sx={{ display: 'flex' }}>
                                                    <ReviewStatus status={getPackagingCompleteStatus(
                                                        size_group_pack?.order_colorway?.id,
                                                        size?.id,
                                                        size_group_pack?.order_country?.id
                                                    )}/>
                                                    <Box sx={{ pl: 1 }}>Packaging</Box>
                                                </Box>
                                                <Box>
                                                {!showSupplierLinks && !costingCompleteState &&
                                                        <IconButton size='small' color='primary' onClick={() => [handleMaterialPackagingOnClick(
                                                            size_group_pack?.order_colorway?.id,
                                                            size?.id,
                                                            size_group_pack?.order_country?.id,
                                                            false
                                                        )]}>
                                                            <EditIcon fontSize='inherit' />
                                                        </IconButton>
                                                    }
                                                    
                                                {(showSupplierLinks || costingCompleteState) && (
                                                        <Tooltip title='Select Suppliers' disableInteractive onClick={() => [ handleMaterialPackagingOnClick(
                                                            size_group_pack?.order_colorway?.id,
                                                            size?.id,
                                                            size_group_pack?.order_country?.id,
                                                            true
                                                        )]}>
                                                            <IconButton size='small' color='primary'>
                                                                <GradingIcon fontSize='inherit' />
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}                                             
                                                </Box>
                                            </Box>  
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    </Box>
                ))}
            </Stack>
        }</>
    );
};

export default OrderPack;