import React, {useEffect, useState} from 'react';
import {
    getOrderPackSizeGroupCadInfoURL,
    getOrderInquiryDetailsUpdateURL, getPackConsumptionRatioSaveURL
} from "@/helpers/constants/RestUrls";
import api from "@/services/api";
import MaterialConsumptionRatios from "@/views/cad/MaterialConsumptionRatios";
import { Alert } from '@mui/material';
import DefaultLoader from '@/components/DefaultLoader';
import { toast } from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';


const EditPackConsumptionRatios = ({orderId, versionId, orderCountryId, orderColorwayId, orderSizeGroupId}: any) => {
    const [materialConsumptionData, setMaterialConsumptionData] = useState([]);
    const [orderInquiry, setOrderInquiry] = useState([]);
    const saveURL = getPackConsumptionRatioSaveURL(orderId, versionId);
    const orderInquiryUrl = getOrderInquiryDetailsUpdateURL(orderId);
    const [isLoading, setIsLoading] = useState(true);

    // Load all data
    useEffect(() => {
        if (orderId && orderColorwayId && orderCountryId && orderSizeGroupId) {
            const materialDataUrl = getOrderPackSizeGroupCadInfoURL(versionId, orderId, orderColorwayId, orderCountryId, orderSizeGroupId);

            const requests = [
                api.get(materialDataUrl),
                api.get(orderInquiryUrl),
            ];

            Promise.all(requests).then(resp => {
                const respData = resp.map(r => r.data);
                const [consumptionData, orderInquiryData] = respData;
                setMaterialConsumptionData({...consumptionData});
                setOrderInquiry({...orderInquiryData});

                // console.log(consumptionData)
            }).catch(error => {
                toast.error(getDefaultError(error?.response?.status));
            }).finally(() => {
                setIsLoading(false);
            });
        }
    }, [orderId, orderColorwayId, orderCountryId, orderSizeGroupId]);

    const getItemColorwayType = () => {
        const colorwayType = orderInquiry?.['colorway_item_types']?.find((item: any) => {
            return item.colorway == orderColorwayId;
        });

        return {colorway_type: colorwayType?.colorway_type, order_colorway_type_display: colorwayType?.colorway_type_display};
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

export default EditPackConsumptionRatios;
