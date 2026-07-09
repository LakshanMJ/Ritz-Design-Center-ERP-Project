import { useState } from "react";
import * as supplierUrls from '@/helpers/constants/rest_urls/SupplierUrls';
import api from "@/services/api";
import { toast } from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';
import RitzModal from "@/components/Ritz/RitzModal";
import { Box, Button } from "@mui/material";
import SaveSpinner from "@/components/SaveSpinner";
import { DEFAULT_SUCCESS } from "@/helpers/constants/Constants";


const QueuedEmailModal = ({ orderId, versionId, modalOpen, setModalOpen, emailCount, refreshData }: any) => {
    const [isSaving, setIsSaving] = useState(false);

    const onSubmit = () => {
        setIsSaving(true);

        api.put(supplierUrls.updateQueuedEmailsURL(+versionId)).then(resp => {
            console.log(resp)
            toast.success(DEFAULT_SUCCESS);
            setModalOpen(false);
            refreshData();
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsSaving(false);
        });
    }

    return (
        <RitzModal open={modalOpen} title='Send Queued Emails' onClose={() => setModalOpen(false)}>
            <Box sx={{ mb: 3 }}>
                Are you sure you want to send all <strong>{emailCount}</strong> pending emails?
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                <Button variant='contained' onClick={onSubmit} disabled={isSaving}>
                    {isSaving && <SaveSpinner />}Send
                </Button>
            </Box>
        </RitzModal>
    );
};

export default QueuedEmailModal;