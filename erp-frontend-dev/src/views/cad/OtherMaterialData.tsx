import React, { useEffect, useState } from 'react';
import * as RestUrls from '@/helpers/constants/RestUrls';
import EditIcon from '@mui/icons-material/Edit';
import api from '@/services/api';
import { Box, Card, CardContent, CardHeader, Grid, IconButton } from '@mui/material';
import DefaultLoader from '@/components/DefaultLoader';
import RitzModal from "@/components/Ritz/RitzModal";
import EditPackItemConsumptionRatios from "@/views/cad/EditPackItemConsumptionRatios";
import EditPackConsumptionRatios from "@/views/cad/EditPackConsumptionRatios";
import CostingQuantities from "@/views/costing/CostingQuantities";
import ReviewStatus from "@/components/OrderInquiry/Costing/ReviewStatus";
import { toast } from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';

const OtherMaterialData = ({ orderId, versionId }: any) => {
    const orderPackItemConsumptionDataModal = 'pack_item_consumption_data';
    const orderPackConsumptionDataModal = 'pack_consumption_data';
    const colorwayIdKey = 'colorway_id';
    const orderCountryIdKey = 'order_country_id';
    const orderItemIdKey = 'order_item_id';
    const orderGroupIdKey = 'order_group_id';
    const consumptionTypeKey = 'consumption_type';

    const [isLoading, setIsLoading] = useState(true);
    const [consumptionDataModalVisible, setConsumptionDataModalVisible] = useState(false);
    const [quantitiesModalOpen, setQuantitiesModalOpen] = useState(false);
    const [consumptionModalDataIDs, setConsumptionModalDataIDs] = useState({});
    const [modalTitle, setModalTitle] = useState('');

    const [navigationData, setNavigationData] = useState({
        item_colorway_categories: [],
        order_countries: [],
        order_groups: [],
    });

    const refreshNavigationData = () => {
        const navigationDataURL = RestUrls.getCadNavigationData(orderId as any, versionId as any);
        api.get(navigationDataURL).then((resp) => {
            const reseditdata = resp?.data || {};
            setNavigationData({ ...reseditdata });
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false);
        });

    }
    useEffect(() => {
        // setIsLoading(true);
        if (orderId && versionId) {
            refreshNavigationData();
        }
    }, [orderId, versionId]);

    useEffect(() => {
        if (!consumptionDataModalVisible && orderId && versionId) {
            refreshNavigationData();
        }
    }, [consumptionDataModalVisible]);
    const getSizeNamesByOrderGroup = (orderGroupId: any) => {
        const orderGroup = navigationData.order_groups.find((group) => group.order_group_id === orderGroupId);
        if (orderGroup) {
            return orderGroup.order_sizes.map((size: any) => size.size_name).join(', ');
        }
        return '';
    };

    const handleEditClickPackaging = (order_country_id: any, colorway_id: any, order_group_id: any, name: string) => {
        setConsumptionModalDataIDs({
            [colorwayIdKey]: colorway_id,
            [orderCountryIdKey]: order_country_id,
            [orderGroupIdKey]: order_group_id,
            [consumptionTypeKey]: orderPackConsumptionDataModal
        });
        setConsumptionDataModalVisible(true);
        setModalTitle(name);
    };

    const handleEditClick = (colorway_id: any, order_country_id: any, order_group_id: any, order_item_id: any, name: string) => {
        setConsumptionModalDataIDs({
            [colorwayIdKey]: colorway_id,
            [orderCountryIdKey]: order_country_id,
            [orderItemIdKey]: order_item_id,
            [orderGroupIdKey]: order_group_id,
            [consumptionTypeKey]: orderPackItemConsumptionDataModal
        });
        setConsumptionDataModalVisible(true);
        setModalTitle(name);
    };

    const renderedPackagingLines = new Set();

    const getPackItemCompletionStatus = (colorwayId: any, countryId: any, orderItemId: any, sizeGroupId: any) => {
        let completeStatus = true;
        navigationData?.['pack_items_complete_status'].map((packItem: any) => {
            if (packItem?.['colorway_id'] == colorwayId && packItem?.['country_id'] == countryId // && pack_item?.['size_id'] == sizeId
                    && packItem?.['size_group_id'] == sizeGroupId && packItem?.['order_item_id'] == orderItemId) {

                if (!packItem?.['complete_status']) {
                    completeStatus = false;
                }
            }
        });
        return completeStatus;
    }

    const getPackCompletionStatus = (colorwayId: any, countryId: any, sizeGroupId: any) => {
        let completeStatus = true;
        navigationData?.['packs_complete_status'].map((pack: any) => {
            if (pack?.['colorway_id'] == colorwayId && pack?.['country_id'] == countryId // && pack_item?.['size_id'] == sizeId
                    && pack?.['size_group_id'] == sizeGroupId) {

                if (!pack?.['complete_status']) {
                    completeStatus = false;
                }
            }
        });
        return completeStatus;
    }

    return (
        <>
            {isLoading ? <DefaultLoader /> : (
                <Grid container spacing={2}>
                    {navigationData.item_colorway_categories.map((item, index) => (
                        <Grid item xs={12} md={6} lg={4} key={index}>
                            <Card variant="outlined">
                                <CardHeader title={`${item.item_display_name} - Sewing Trims`}   sx={{ backgroundColor: (theme) => theme.palette.grey[50] }} />
                                <CardContent>
                                    {item.colorway_categories.map((colorwayCategory: any) => (
                                        <React.Fragment key={colorwayCategory.colorway_category_id}>
                                            {colorwayCategory.colorways.map((colorway: any) => (
                                                <React.Fragment key={colorwayCategory.colorway_category_id}>
                                                    {navigationData.order_countries.map((country) => (
                                                        <React.Fragment key={country.order_country_id}>
                                                            {navigationData.order_groups.map((orderGroup) => {
                                                                const sizeNames = getSizeNamesByOrderGroup(orderGroup.order_group_id);
                                                                return (
                                                                    <React.Fragment key={orderGroup.order_group_id}>
                                                                        <Box sx={{ pb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                            <Box sx={{ display: 'flex' }}>
                                                                                <ReviewStatus status={getPackItemCompletionStatus(colorway.colorway_id, country.order_country_id,  item.order_item_id, orderGroup.order_group_id)}/>
                                                                                <Box sx={{ pl: 1 }}>{country.country_name} - {colorway.colorway} - {colorwayCategory.colorway_category} - {sizeNames}</Box>
                                                                            </Box>
                                                                            <IconButton
                                                                                onClick={() => handleEditClick(
                                                                                    colorway.colorway_id,
                                                                                    country.order_country_id,
                                                                                    orderGroup.order_group_id,
                                                                                    item.order_item_id,
                                                                                    `${country.country_name} - ${colorway.colorway} - ${colorwayCategory.colorway_category} - ${sizeNames}`
                                                                                )}
                                                                                size='small'
                                                                                color="primary"
                                                                            >
                                                                                <EditIcon fontSize='inherit' />
                                                                            </IconButton>
                                                                        </Box>
                                                                    </React.Fragment>
                                                                );
                                                            })}
                                                        </React.Fragment>
                                                    ))}
                                                </React.Fragment>
                                            ))}
                                        </React.Fragment>
                                    ))}
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}

                    <Grid item xs={12} md={6} lg={4}>
                        <Card variant="outlined">
                            <CardHeader title="Packaging" sx={{ backgroundColor: (theme) => theme.palette.grey[50] }} />
                            <CardContent id="packaging">
                                {navigationData.order_countries.map((country) => (
                                    <React.Fragment key={country.order_country_id}>
                                        {navigationData.item_colorway_categories.map((item) => (
                                            <React.Fragment key={item.order_item_id}>
                                                {item.colorway_categories.map((colorwayCategory: any) => (
                                                    <React.Fragment key={colorwayCategory.colorway_category_id}>
                                                        {colorwayCategory.colorways.map((colorway: any) => (
                                                            <React.Fragment key={colorway.colorway_id}>
                                                                {navigationData.order_groups.map((orderGroup) => {
                                                                    const sizeNames = getSizeNamesByOrderGroup(orderGroup.order_group_id);
                                                                    const lineKey = `${country.order_country_id}-${colorway.colorway_id}-${orderGroup.order_group_id}`;
                                                                    if (renderedPackagingLines.has(lineKey)) {
                                                                        return null;
                                                                    }
                                                                    renderedPackagingLines.add(lineKey);

                                                                    return (
                                                                        <React.Fragment key={orderGroup.order_group_id}>
                                                                            <Box sx={{ pb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                                <Box sx={{ display: 'flex' }}>
                                                                                    <ReviewStatus status={getPackCompletionStatus(colorway.colorway_id, country.order_country_id,  orderGroup.order_group_id)}/>
                                                                                    <Box sx={{ pl: 1 }}>{country.country_name} - {colorway.colorway} - {sizeNames}</Box>
                                                                                </Box>

                                                                                <IconButton
                                                                                    color='primary'
                                                                                    size='small'
                                                                                    onClick={() =>
                                                                                        handleEditClickPackaging(
                                                                                            country.order_country_id,
                                                                                            colorway.colorway_id,
                                                                                            orderGroup.order_group_id,
                                                                                            `${country.country_name} - ${colorway.colorway} - ${sizeNames}`
                                                                                        )
                                                                                    }
                                                                                >
                                                                                    <EditIcon fontSize='inherit' />
                                                                                </IconButton>
                                                                            </Box>
                                                                        </React.Fragment>
                                                                    );
                                                                })}
                                                            </React.Fragment>
                                                        ))}
                                                    </React.Fragment>
                                                ))}
                                            </React.Fragment>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            <RitzModal
                onClose={() => setConsumptionDataModalVisible(false)} 
                title={modalTitle}
                open={consumptionDataModalVisible} 
                maxWidth='lg' 
                fullWidth
            >
                { consumptionModalDataIDs?.[consumptionTypeKey] == orderPackItemConsumptionDataModal &&
                    <EditPackItemConsumptionRatios
                        orderId={orderId}
                        versionId={versionId}
                        orderCountryId={consumptionModalDataIDs?.[orderCountryIdKey]}
                        orderColorwayId={consumptionModalDataIDs?.[colorwayIdKey]}
                        orderSizeGroupId={consumptionModalDataIDs?.[orderGroupIdKey]}
                        orderItemId={consumptionModalDataIDs?.[orderItemIdKey]}
                    />
                }
                { consumptionModalDataIDs?.[consumptionTypeKey] == orderPackConsumptionDataModal &&
                    <EditPackConsumptionRatios
                        orderId={orderId}
                        versionId={versionId}
                        orderCountryId={consumptionModalDataIDs?.[orderCountryIdKey]}
                        orderColorwayId={consumptionModalDataIDs?.[colorwayIdKey]}
                        orderSizeGroupId={consumptionModalDataIDs?.[orderGroupIdKey]}
                    />
                }
            </RitzModal>

            <RitzModal
                onClose={() => setQuantitiesModalOpen(false)}
                title={"Costing Quantities"}
                open={quantitiesModalOpen}
                maxWidth='md'
                fullWidth
            >
                <CostingQuantities orderId={orderId} versionId={versionId} readOnly={true} showNavigation={false}></CostingQuantities>
            </RitzModal>
        </>
    );
};

export default OtherMaterialData;