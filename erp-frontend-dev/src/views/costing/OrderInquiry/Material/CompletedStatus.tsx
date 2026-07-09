import RitzSwitch from '@/components/Ritz/RitzSwitch';
import api from '@/services/api';
import React, { useEffect, useState } from 'react';
import * as restUrls from "@/helpers/constants/RestUrls";
import { toast } from 'react-hot-toast';
import { DEFAULT_SUCCESS, VALIDATION_ERROR_CODE } from '@/helpers/constants/Constants';
import { getDefaultError } from '@/helpers/Utilities';
import RitzModal from '@/components/Ritz/RitzModal';
import { Box, Button } from '@mui/material';
import SaveSpinner from '@/components/SaveSpinner';

function CompletedStatus({ orderId, reviewedStatus, materialType, packedId, packedItemId, id, fetchSavedData }: any) {

    const [reviewStatus, setReviewedStatus] = useState(false);
    const [updatedStatus, setUpdatedStatus] = useState(false);
    const [openReviewedModal, setReviewedModal] = useState(false);
    const [reviewdError, setReviewdError] = useState<any>({});
    const [isSaving, setIsSaving] = useState(false);


    useEffect(() => {
        setReviewedStatus(reviewedStatus)
    }, [reviewedStatus]);

    useEffect(() => {
        if (reviewdError.message) {
            setReviewdError({})
        }
        if (reviewdError.message != "true") {

            setReviewedStatus(false)
        }
    }, [reviewdError]);

    const handleReviewedSwitch = (event: any) => {
        setReviewedModal(true);
        setUpdatedStatus(event.target.checked);
    };

    const handleSwitchChange = () => {
        setIsSaving(true);

        let packId, packItemId;
        if (materialType === "material") {
            packId = packedId;
            packItemId = packedItemId;
        } else {
            packId = id;
            packItemId = "";
        }
        const dataList = {
            type: materialType,
            pack_item_id: packItemId,
            pack_id: packId,
            reviewed: updatedStatus
        }

        api.post(restUrls.reviewedStatusURL(orderId as any), dataList)
            .then(resp => {
                toast.success(DEFAULT_SUCCESS);
                setReviewedModal(false);
                fetchSavedData();
            })
            .catch(error => {
                if (VALIDATION_ERROR_CODE === error?.response?.status && error?.response?.data) {
                    toast.error(error?.response?.data.message)
                    setReviewdError(error.response.data);
                } else {
                    toast.error(getDefaultError(error?.response?.status));
                }
            }).finally(() => {
                setIsSaving(false);
            });
    };

    return (
        <>
            {openReviewedModal && (
                <RitzModal open={openReviewedModal} onClose={() => setReviewedModal(false)} title='Confirmation' maxWidth='xs'>
                    Are you sure you want to mark as {updatedStatus ? 'complete' : 'incomplete'}?
                    <Box sx={{ display: 'flex', justifyContent: 'end', mt: 2 }}>
                        <Button variant='contained' onClick={handleSwitchChange} disabled={isSaving}>{isSaving && <SaveSpinner/>}Confirm</Button>
                    </Box>
                </RitzModal>
            )}

            <RitzSwitch
                name="Complete Status"
                status={reviewStatus}
                handleChangeSwitch={handleReviewedSwitch}
            />
        </>

    );

}

export default CompletedStatus;