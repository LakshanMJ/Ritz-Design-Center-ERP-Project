import React, { useState } from 'react';
import { TextField, Grid, Button, InputLabel } from '@mui/material';
import * as RestUrls from '../../../helpers/constants/RestUrls';
import api from '@/services/api';
import SaveSpinner from '@/components/SaveSpinner';
import { useDispatch } from 'react-redux';
import { setAuthState } from '@/states/Auth/AuthActions';
import FormErrorMessage from '@/components/FormErrorMessage';
import { toast } from 'react-hot-toast';
import { DEFAULT_SUCCESS, VALIDATION_ERROR_CODE } from '@/helpers/constants/Constants';
import { getDefaultError } from '@/helpers/Utilities';

const UserInfo = ({ userInfoValues }: any) => {
    const [userInfo, setUserInfo] = useState(userInfoValues || {});
    const [errors, setErrors] = useState<any>({});
    const [isSaving, setIsSaving] = useState(false);
    const dispatch = useDispatch();

    const handleChange = (event: any) => {
        const { name, value } = event.target;
        setUserInfo({
            ...userInfo,
            [name]: value
        });
    };

    const handleSave = () => {
        setIsSaving(true);
        setErrors({});

        api.put(RestUrls.userDetailForUserURL(), userInfo)
            .then(resp => {
                const updated = resp?.data || {};

                // Update localStorage and AuthReducer
                const existing = JSON.parse(localStorage.getItem('authUser'));
                const updatedAuthUser = {
                    ...existing,
                    ...updated
                };
                localStorage.setItem('authUser', JSON.stringify(updatedAuthUser));
                dispatch(setAuthState({ authUser: updatedAuthUser }));

                toast.success(DEFAULT_SUCCESS);
            }).catch(error => {
                if (VALIDATION_ERROR_CODE === error?.response?.status && error?.response?.data) {
                    setErrors(error.response.data);
                }
                toast.error(getDefaultError(error?.response?.status));
            }).finally(() => {
                setIsSaving(false);
            });
    };

    return (
        <>
            <Grid container spacing={2}>
                <Grid item xs={12}>
                    <Grid item md={12} lg={6}>
                        <InputLabel htmlFor='first_name' sx={{ mb: 1 }}>
                            First Name:
                        </InputLabel>
                        <TextField
                            id='first_name'
                            fullWidth
                            autoComplete="off"
                            name="first_name"
                            value={userInfo?.first_name}
                            onChange={handleChange}
                        />
                        {errors?.first_name && <FormErrorMessage message={errors.first_name} />}
                    </Grid>
                </Grid>
                
                <Grid item xs={12}>
                    <Grid item md={12} lg={6}>
                        <InputLabel htmlFor='last_name' sx={{ mb: 1 }}>
                            Last Name:
                        </InputLabel>
                        <TextField
                            id='last_name'
                            fullWidth
                            autoComplete="off"
                            name="last_name"
                            value={userInfo?.last_name}
                            onChange={handleChange}
                        />
                        {errors?.last_name && <FormErrorMessage message={errors.last_name} />}
                    </Grid>
                </Grid>

                <Grid item xs={12}>
                    <Grid item md={12} lg={6}>
                        <InputLabel htmlFor='email' sx={{ mb: 1 }}>
                            Email:
                        </InputLabel>
                        <TextField
                            id='email'
                            fullWidth
                            autoComplete="off"
                            name="email"
                            value={userInfo?.email}
                            onChange={handleChange}
                        />
                        {errors?.email && <FormErrorMessage message={errors.email} />}
                    </Grid>
                </Grid>

                <Grid item xs={12}>
                    <Button
                        variant="contained"
                        color="primary"
                        size="large"
                        onClick={handleSave}
                        disabled={isSaving}
                        sx={{ mt: 2 }}
                    >
                        {isSaving && <SaveSpinner />}Save
                    </Button>
                </Grid>
            </Grid>
        </>
    );
};

export default UserInfo;