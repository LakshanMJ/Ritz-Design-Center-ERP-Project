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
import { getPOMaterialColorwayFabricsURL, getPoFabricNavigationData, savePOMaterialColorwayFabricsURL } from '@/helpers/constants/rest_urls/POUrls';
import EditPOFabricConsumptionDetails from './EditPOFabricConsumptionRatios';//need to discuss-import EditPOFabricConsumptionDetails from '@/EditPOFabricConsumptionRatios';

const EditPOFabricConsumptionRatioView = ({ purchaseOrderId }: any) => {
    const [navigationData, setNavigationData] = useState<any>({});
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState<string>();
    const [getDataURL, setGetDataURL] = useState<any>();
    const [saveDataURL, setSaveDataURL] = useState<any>();
    const [quantitiesModalOpen, setQuantitiesModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

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
    console.log(navigationData, "navigationDatanavigationData")
    const refreshFabricNavigation = () => {
        const navigationDataURL = getPoFabricNavigationData(purchaseOrderId);
        api.get(navigationDataURL).then(resp => {
            const reseditdata = resp?.data || {};
            setNavigationData({ ...reseditdata });
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoading(false));
    }

    useEffect(() => {
        if (purchaseOrderId) {
            refreshFabricNavigation();
        }
    }, [purchaseOrderId]);
    //To do
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

    const getItemColorwayColorwayTypeStatus = (itemId: any, colorwayId: any, colorwayCategoryId: any) => {

     //To do-API pending
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
                <EditPOFabricConsumptionDetails getDataURL={getDataURL} saveDataURL={saveDataURL} purchaseOrderId={purchaseOrderId} />
            </RitzModal>

            <RitzModal
                onClose={() => setQuantitiesModalOpen(false)}
                title={"Costing Quantities"}
                open={quantitiesModalOpen}
                maxWidth='lg'
                fullWidth={true}
            >
            </RitzModal>
            {isLoading ? <DefaultLoader /> : <>

                <>
                    {navigationData &&
                        navigationData['colorway_country_sizes'] &&
                        navigationData['colorway_country_sizes'].map((colorwayItem: any) => (
                            navigationData.po_items?.map((item: any, itemIndex: number) => {
                                const sizeNames = colorwayItem.po_sizes.map((sizeGroup: any) =>sizeGroup.po_size_name ).join(',');
                                const countryNames = colorwayItem.po_countries.map((countryGroup: any) =>countryGroup.po_country_name).join('/');
                                const itemName = item.po_item_name;
                                const formattedDisplayName = `${colorwayItem.po_colorway} - ${countryNames} - ${itemName} - ${sizeNames}`;

                                return (
                                    <Button
                                        sx={{ textAlign: 'left', display: 'flex' }}
                                        onClick={() => {
                                            modalOpen(
                                                true,
                                                `${formattedDisplayName} - Ratios`,
                                                getPOMaterialColorwayFabricsURL(
                                                    purchaseOrderId,
                                                    colorwayItem.po_colorway_id,
                                                    item.po_item_id
                                                ),
                                                savePOMaterialColorwayFabricsURL(purchaseOrderId)
                                            );
                                        }}
                                        key={formattedDisplayName}
                                    >
                                        <Box sx={{ display: 'flex',marginBottom:2 }}>
                                            {/* need to set this status */}
                                            <ReviewStatus status={getItemColorwayColorwayTypeStatus(item?.item_id, colorwayItem?.colorway_id, 1)}/>
                                            <Box sx={{ pl: 1 }}>{formattedDisplayName}</Box>
                                        </Box>
                                       
                                    </Button>
                                );
                            })
                        ))}
                </>

            </>}

        </>
    );
}

export default EditPOFabricConsumptionRatioView;
