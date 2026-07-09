import {
    Box, Button
} from "@mui/material";
import React, {useEffect, useState} from "react";
import api from "@/services/api";
import { toast } from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';
import RitzModal from "@/components/Ritz/RitzModal";
import SaveSpinner from "@/components/SaveSpinner";
import {DEFAULT_SUCCESS, ORDER_PACK_ITEM_EMB_SERVICE_TYPE, ORDER_PACK_ITEM_WASH_SERVICE_TYPE} from "@/helpers/constants/Constants";
import * as RestUrls from "@/helpers/constants/rest_urls/CostingUrls";


const EditPackItemEMBService = ({ orderId, versionId, packItemId, serviceId, serviceType, modalOpen, setModalOpen, setUpdated }: any) => {

    const empServiceKey = 'Embellishment Service';
    const [isSaving, setIsSaving] = useState(false);
    const onDelete = () => {
        setIsSaving(true);
        let url;
        if (serviceType == empServiceKey) {
            url = RestUrls.packItemEMBDetailDeleteURL(serviceId);
        }
        else {
            url = RestUrls.packItemWashDetailDeleteURL(versionId, serviceId);
        }
        api.delete(url).then(() => {
            setModalOpen(false);
            setUpdated(true);
            toast.success(DEFAULT_SUCCESS);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsSaving(false);
        });
    };
    return (
        <RitzModal open={modalOpen} title='Delete Service Type' onClose={() => { setModalOpen(false) }} maxWidth={'xs'}>
            Are you sure you want to delete this Service Type ?
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                <Button variant='contained' onClick={onDelete} disabled={isSaving}>
                    {isSaving && <SaveSpinner />}Delete
                </Button>
            </Box>
        </RitzModal>
    );
};

export default EditPackItemEMBService;