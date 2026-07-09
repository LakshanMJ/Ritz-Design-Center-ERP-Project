import React, { useEffect, useState } from 'react';
import { Grid, Button } from "@mui/material";
import * as RestUrls from "@/helpers/constants/RestUrls";
import api from "@/services/api";
import { Box } from '@mui/material';
import RitzModal from '@/components/Ritz/RitzModal';
import EditFabricConsumptionRatios from '@/views/cad/EditFabricConsumptionRatios';
import CostingQuantities from "@/views/costing/CostingQuantities";
import DefaultLoader from '@/components/DefaultLoader';
import ReviewStatus from "@/components/OrderInquiry/Costing/ReviewStatus";
import { toast } from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';

const EditFabricConsumptionRatioView = ({orderId, versionId}: any) => {
    const [navigationData, setNavigationData] = useState<any>({});
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState<string>();
    const [getDataURL, setGetDataURL] = useState<any>();
    const [saveDataURL, setSaveDataURL] = useState<any>();
    const [quantitiesModalOpen, setQuantitiesModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    /*let groupedItems: any[] = [];
    navigationData?.['colorway_item_types']?.forEach((item: any) => {
        item.colorway_types.forEach((colorwayType: any) => {
            colorwayType.colorways.forEach((colorway: any) => {
                navigationData?.['order_countries']?.forEach((country: any) => {

                    navigationData?.['size_groups'].forEach((group: any) => {
                        groupedItems.push({
                            item,
                            colorwayType,
                            colorway,
                            country,
                            group
                        });
                    });
                });
            });
        });
    });*/
    // const sortedKeys = Object.keys(groupedItems).sort();
    const modalOpen = (isOpen: any, title: string, getDataURL: any, saveDataURL: any) => {
        setGetDataURL(getDataURL)
        setSaveDataURL(saveDataURL)
        setTitle(title);
        setOpen(isOpen);
    };
    const modalClose = () => {
        setOpen(false);
        refreshFabricNavigation();
    };

    const refreshFabricNavigation = () => {
        const navigationDataURL = RestUrls.getFabricNavigationData(orderId as any, versionId as any);
            api.get(navigationDataURL).then(resp => {
                const reseditdata = resp?.data || {};
                setNavigationData({ ...reseditdata });
            }).catch(error => {
                toast.error(getDefaultError(error?.response?.status));
            }).finally(() => setIsLoading(false));
    }

    useEffect(() => {
        if (orderId && versionId) {
            refreshFabricNavigation();
        }
    }, [orderId, versionId]);

    const getPackItemCompletionStatus = (itemId: any, colorwayId: any, orderCountryId: any, orderGroupId: any, colorwayCategoryId: any) => {
        let packComplete = true;

        const matchingPackItems = navigationData['pack_items_completion_status'].filter((packItem: any) => (
            packItem['colorway_id'] == colorwayId && packItem['item_id'] == itemId && packItem['size_group_id'] == orderGroupId &&
                packItem['order_country_id'] == orderCountryId && packItem['colorway_category_id'] == colorwayCategoryId
        ));

        matchingPackItems.map((packItem: any) => {
            if (!packItem?.['completion_status']) {
                packComplete = false;
            }
        });

        return packComplete;
    }

    const getItemColorwayColorwayTypeStatus = (itemId: any, colorwayId: any,  colorwayCategoryId: any) => {

        const matchingPackItems = navigationData['colorway_item_colorway_type_status'].filter((packItems: any) => (
            packItems['colorway_id'] == colorwayId && packItems['item_id'] == itemId && packItems['colorway_category_id'] == colorwayCategoryId
        ));

        let packComplete = matchingPackItems.length > 0;

        matchingPackItems.map((packItem: any) => {
            if (!packItem?.['completion_status']) {
                packComplete = false;
            }
        });
        return packComplete;
    }

    const getItemColorwayTypeStatus = (itemId: any, colorwayCategoryId: any) => {

        const matchingPackItems = navigationData['item_colorway_type_status'].filter((packItems: any) => (
            packItems['item_id'] == itemId && packItems['colorway_category_id'] == colorwayCategoryId
        ));

        let packComplete = matchingPackItems.length > 0;

        matchingPackItems.map((packItem: any) => {
            if (!packItem?.['completion_status']) {
                packComplete = false;
            }
        });
        return packComplete;
    }
    return (
        <>
            <RitzModal open={open} onClose={modalClose} maxWidth='xl' fullWidth={true} title={title}>
                <EditFabricConsumptionRatios getDataURL={getDataURL} saveDataURL={saveDataURL} />
            </RitzModal>

            <RitzModal
                onClose={() => setQuantitiesModalOpen(false)}
                title={"Costing Quantities"}
                open={quantitiesModalOpen}
                maxWidth='lg'
                fullWidth={true}
            >
                <CostingQuantities orderId={orderId} versionId={versionId} readOnly={true} showNavigation={false}></CostingQuantities>
            </RitzModal>

            {isLoading ? <DefaultLoader/> : <>

            {/* <Box sx={{ mb: 3 }}>
                <Button variant="outlined" color="primary" onClick={() => setQuantitiesModalOpen(true)}>Show Quantities</Button>
            </Box> */}

            <>
                {navigationData &&
                    navigationData?.['colorway_item_categories']?.map((item: any, cwItemTypeIndex: number) => {
                        return (
                            item?.['colorway_categories']?.map((colorwayCategory: any, cwTypeIndex: number) => {
                                let colorwayTypeCwSizes: any[] = [];
                                return (
                                    <Grid container key={`${cwItemTypeIndex}-${cwTypeIndex}`} spacing={2} sx={{ mb: 4 }}> {/* Use unique key */}
                                        <Grid item xs={12} md={8} className={'colorwaytype-ratios'}>
                                            {
                                                colorwayCategory?.['colorways'].map((colorway: any, cwIndex: number) => {
                                                    let colorwaySizes: any = [];
                                                    return (
                                                        <Grid container spacing={2} key={`${cwItemTypeIndex}-${cwTypeIndex}-${cwIndex}`}> {/* Use unique key */}
                                                            <Grid item xs={12} md={6} className={'colorway-ratios'}>
                                                                {
                                                                    navigationData?.['order_countries'].map((orderCountry: any, countryIndex: number) => {

                                                                        return (
                                                                            <Box key={`${cwItemTypeIndex}-${cwTypeIndex}-${cwIndex}-${countryIndex}`}> {/* Use unique key */}
                                                                                {
                                                                                    navigationData?.['size_groups'].map((sizeGroup: any, sizeGroupIndex: number) => {
                                                                                        const sizeNames = () => sizeGroup?.['order_sizes'].map((size: any, sizeIndex: number) => size.size_name).join(', ');
                                                                                        colorwayTypeCwSizes.push(`${orderCountry.country_name} - ${item.item_name} [ ${item.item_identifier} ] - ${colorwayCategory.colorway_category} - ${colorway.colorway_name} - ${sizeNames()}`)
                                                                                        colorwaySizes.push(`${orderCountry.country_name} - ${item.item_name} [ ${item.item_identifier} ] - ${colorwayCategory.colorway_category} - ${colorway.colorway_name} - ${sizeNames()}`)

                                                                                        return(
                                                                                        <Box key={`${cwItemTypeIndex}-${cwTypeIndex}-${cwIndex}-${countryIndex}-${sizeGroupIndex}`}> {/* Use unique key */}

                                                                                            <Button
                                                                                                sx={{ textAlign: 'left', display: 'flex' }}
                                                                                                onClick={() => { modalOpen(true, `${orderCountry.country_name} - ${item.item_name} - ${colorwayCategory.colorway_category} - ${colorway.colorway_name} - ${sizeNames()}`,
                                                                                                    RestUrls.getItemColorwayCountrySizeGroupFabricsURL(orderId, versionId, item?.item_id, colorway?.colorway_id, orderCountry.order_country_id, sizeGroup?.order_group_id, colorwayCategory?.colorway_category_id),
                                                                                                    RestUrls.saveItemColorwayCountrySizeGroupFabricsURL(orderId, versionId, item?.item_id, colorway?.colorway_id, orderCountry.order_country_id, sizeGroup?.order_group_id, colorwayCategory?.colorway_category_id)) }}
                                                                                                >
                                                                                                    <Box sx={{ display: 'flex' }}>
                                                                                                        <ReviewStatus status={getPackItemCompletionStatus(item?.item_id, colorway?.colorway_id, orderCountry.order_country_id, sizeGroup?.order_group_id, colorwayCategory?.colorway_category_id) }/>
                                                                                                        <Box sx={{ pl: 1 }}>{orderCountry.country_name} - {item.item_name} [ {item.item_identifier} ] - {colorwayCategory.colorway_category} - {colorway.colorway_name} - {sizeNames()}</Box>
                                                                                                    </Box>
                                                                                            </Button>
                                                                                        </Box>
                                                                                    )})
                                                                                }
                                                                            </Box>
                                                                        )
                                                                    })
                                                                }
                                                            </Grid>
                                                            <Grid item xs={12} md={6} className={'full-colorway-rato'}>
                                                                <Button 
                                                                    sx={{ textAlign: 'left', display: 'flex' }}
                                                                    onClick={() => { modalOpen(true, `${colorway.colorway_name} - ${item.item_name} -  Ratios`,
                                                                        RestUrls.getItemColorwayFabricsURL(orderId, versionId, item?.item_id, colorway?.colorway_id, colorwayCategory.colorway_category_id),
                                                                        RestUrls.saveItemColorwayFabricsURL(orderId, versionId, item?.item_id, colorway?.colorway_id, colorwayCategory.colorway_category_id)) }}
                                                                >
                                                                    <Box sx={{ display: 'flex' }}>
                                                                        <ReviewStatus status={getItemColorwayColorwayTypeStatus(item?.item_id, colorway?.colorway_id, colorwayCategory?.colorway_category_id)}/>
                                                                        <Box sx={{ pl: 1 }}>
                                                                            {
                                                                                colorwaySizes.map((cwSize: any, cwSizeIndex: number) => (
                                                                                    <Box key={`item-colorway-${cwItemTypeIndex}-${cwTypeIndex}-${cwIndex}-${cwSizeIndex}`}>{cwSize}</Box>
                                                                                ))
                                                                            }
                                                                        </Box>
                                                                    </Box>
                                                                </Button>
                                                            </Grid>
                                                        </Grid>
                                                    )
                                                })
                                            }
                                        </Grid>
                                        <Grid item xs={12} md={4}>
                                            <Button
                                                sx={{ textAlign: 'left', display: 'flex' }}
                                                onClick={() => { modalOpen(true, `${item.item_name} (${colorwayCategory.colorway_category}) Ratios`,
                                                    RestUrls.getItemColorwayTypeFabricsURL(orderId, versionId, item?.item_id, colorwayCategory.colorway_category_id),
                                                    RestUrls.saveItemColowayTypeFabricsURL(orderId, versionId, item?.item_id, colorwayCategory.colorway_category_id)) }}
                                            >
                                                <Box sx={{ display: 'flex' }}>
                                                    <ReviewStatus status={getItemColorwayTypeStatus(item?.item_id, colorwayCategory?.colorway_category_id)}/>
                                                    <Box sx={{ pl: 1 }}>
                                                        {
                                                            colorwayTypeCwSizes.map((cwTypeCwSize: any, cwTypeCwSizeIndex: number) => (
                                                                <Box key={`item-colorway-${cwItemTypeIndex}-${cwTypeIndex}-${cwTypeCwSizeIndex}`}>{cwTypeCwSize}</Box>
                                                            ))
                                                        }

                                                    </Box>
                                                </Box>
                                            </Button>
                                        </Grid>
                                    </Grid>
                                )
                        }))
                    })
                }
            </>
            
            </>}

        </>
    );
}

export default EditFabricConsumptionRatioView;
