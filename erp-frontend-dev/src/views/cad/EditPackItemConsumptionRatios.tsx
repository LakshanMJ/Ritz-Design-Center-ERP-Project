import React, {useEffect, useState} from 'react';
import MaterialConsumptionRatios from "@/views/cad/MaterialConsumptionRatios";
import {
    getConsumptionRatioSaveURL,
    getOrderPackItemSizeGroupCadInfo,
    getOrderInquiryDetailsUpdateURL
} from "@/helpers/constants/RestUrls";
import api from "@/services/api";
import { Alert } from '@mui/material';
import DefaultLoader from '@/components/DefaultLoader';
import { toast } from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';


const EditPackItemConsumptionRatios = ({orderId, versionId, orderCountryId, orderColorwayId, orderSizeGroupId, orderItemId}: any) => {
    const [materialConsumptionData, setMaterialConsumptionData] = useState([]);
    const [orderInquiry, setOrderInquiry] = useState([]);
    const saveURL = getConsumptionRatioSaveURL(orderId, versionId);// 1 - TODO - version fix thischange version
    const orderInquiryUrl = getOrderInquiryDetailsUpdateURL(orderId);
    const [isLoading, setIsLoading] = useState(true);

    // Load all data
    useEffect(() => {
        if (orderId && orderColorwayId && orderCountryId && orderItemId && orderSizeGroupId) {
            const materialDataUrl = getOrderPackItemSizeGroupCadInfo(versionId, orderId, orderColorwayId, orderCountryId, orderItemId, orderSizeGroupId);

            const requests = [
                api.get(materialDataUrl),
                api.get(orderInquiryUrl),
            ];

            Promise.all(requests).then(resp => {
                const respData = resp.map(r => r.data);
                const [consumptionData, orderInquiryData] = respData;
                setMaterialConsumptionData({...consumptionData});
                setOrderInquiry({...orderInquiryData});
            }).catch(error => {
                toast.error(getDefaultError(error?.response?.status));
            }).finally(() => {
                setIsLoading(false);
            });
        }
    }, [orderId, orderColorwayId, orderCountryId, orderItemId, orderSizeGroupId]);

    const getItemColorwayType = () => {
        const orderItem = orderInquiry?.['items']?.find((item: any) => {
            return orderItemId == item.id;
        });
        const colorwayType = orderInquiry?.['colorway_item_types']?.find((item: any) => {
            return item.item == orderItemId && item.colorway == orderColorwayId;
        });
        return {order_item_id: orderItem?.id, colorway_type: colorwayType?.colorway_type, order_colorway_type_display: colorwayType?.colorway_type_display, meta_item_id: orderItem?.item};
    }


    return (
        <>
            {isLoading ? <DefaultLoader/> : 
                <>
                    {!Object.keys(materialConsumptionData).length ? <Alert color='info' icon={false}>No materials have been specified yet.</Alert> : 
                        <MaterialConsumptionRatios data={materialConsumptionData} saveURL={saveURL} orderId={orderId} colorwayTypeDetails={getItemColorwayType()} versionId={versionId}/>
                    }
                </>
            }
        </>
    );
}

export default EditPackItemConsumptionRatios;
