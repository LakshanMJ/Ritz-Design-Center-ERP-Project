import FormErrorMessage from "@/components/FormErrorMessage";
import * as RestUrls from '@/helpers/constants/RestUrls';
import * as SupplierUrls from '@/helpers/constants/rest_urls/SupplierUrls';
import RitzModal from "@/components/Ritz/RitzModal";
import SaveSpinner from "@/components/SaveSpinner";
import { getDefaultError } from "@/helpers/Utilities";
import { DEFAULT_SUCCESS, VALIDATION_ERROR_CODE } from "@/helpers/constants/Constants";
import api from "@/services/api";
import { Box, Button, Grid } from "@mui/material";
import { useState } from "react";
import toast from "react-hot-toast";

/* Common delete modal for admin pages */

export const DeleteModal = ({ open, onClose, refreshData, deleteId='', page='', deleteData }: any) => {
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState({});

    const handleRemove = () => {
        setIsSaving(true);

        const deleteServices = {
            user: {
                role: RestUrls.userRoleRemoveURL(deleteId, deleteData?.data?.id),
                group: RestUrls.userGroupRemoveURL(deleteId, deleteData?.data?.id)
            },
            role: {
                group: RestUrls.roleGroupRemoveURL(deleteData?.data?.id, deleteId),
                user: RestUrls.userRoleRemoveURL(deleteData?.data?.id, deleteId),
            },
            group: {
                role: RestUrls.roleGroupRemoveURL(deleteId, deleteData?.data?.id),
                user: RestUrls.userGroupRemoveURL(deleteData?.data?.id, deleteId)
            },
            supplier: {
                customer: SupplierUrls.deleteAssignedSupplierCustomerBrandsUrl(deleteId),
                material: SupplierUrls.deleteAssignedSupplierMaterialsUrl(deleteData?.data?.id, deleteData?.data?.supplierId)
            }
        }
        const request = {
            method: 'delete',
            url: deleteServices[page][deleteData?.type]
        }

        api(request).then(resp => {
            toast.success(DEFAULT_SUCCESS);
            onClose();
            refreshData();
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
            if (error?.response?.status === VALIDATION_ERROR_CODE && error?.response?.data) {
                setErrors(error.response.data);
            }
        }).finally(() => {
            setIsSaving(false);
        });
    }

    return (
        <RitzModal
            open={open}
            onClose={onClose}
            maxWidth='xs'
            title='Confirm Delete'
        >
            <Box>
                Are you sure you want to delete this {deleteData?.type}?

                {deleteData?.type === 'user' && (
                    <Grid container sx={{ mt: 2 }}>
                        <Grid item xs={4} sx={{ fontWeight: 'bold' }}>Username</Grid>
                        <Grid item xs={8}>{deleteData?.data?.username}</Grid>

                        <Grid item xs={4} sx={{ fontWeight: 'bold' }}>Name</Grid>
                        <Grid item xs={8}>{deleteData?.data?.first_name} {deleteData?.data?.last_name}</Grid>

                        <Grid item xs={4} sx={{ fontWeight: 'bold' }}>Email</Grid>
                        <Grid item xs={8}>{deleteData?.data?.email}</Grid>
                    </Grid>
                )}

                {deleteData?.type !== 'user' && <p style={{ fontWeight: 'bold' }}>{deleteData?.data?.name}</p>}
            </Box>
            {/* {Object.keys(errors)?.length > 0 && <FormErrorMessage type='alert' message={errors} /> } */}
            <Box sx={{ display: 'flex', justifyContent: 'end', mt: 3 }}>
                <Button variant='contained' onClick={handleRemove} color='error' disabled={isSaving}>
                    {isSaving && <SaveSpinner/>}Delete
                </Button>
            </Box>
        </RitzModal>
    )
}