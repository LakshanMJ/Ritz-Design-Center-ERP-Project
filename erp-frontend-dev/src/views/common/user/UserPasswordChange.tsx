import { Grid, TextField, Typography, InputAdornment, IconButton, Button, InputLabel, Alert, AlertTitle } from '@mui/material';
import { useState } from 'react';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import * as RestUrls from '../../../helpers/constants/RestUrls';
import api from '@/services/api';
import SaveSpinner from '@/components/SaveSpinner';
import FormErrorMessage from '@/components/FormErrorMessage';
import { DEFAULT_SUCCESS, VALIDATION_ERROR_CODE } from '@/helpers/constants/Constants';
import { toast } from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';

const UserPasswordChange = ({ userInfoValues, resetPassword }: any) => {
    const [showPassword, setShowPassword] = useState({
        previous: false,
        newPassword: false,
        confirmPassword: false,
    });
    const [newPasswordChange, setNewPasswordChange] = useState({ old_password: '', new_password: '', new_password2: '' });
    const [errors, setErrors] = useState<any>({});
    const [isSaving, setIsSaving] = useState(false);

    const handleTogglePassword = (field: any) => {
        setShowPassword((prevState) => ({
            ...prevState,
            [field]: !prevState[field],
        }));
    };

    const handleChange = (event: any) => {
        const { name, value } = event.target;
        setNewPasswordChange((prevnewUserInfo) => ({
            ...prevnewUserInfo,
            [name]: value,
        }));
    };


    const handleSave = () => {

        const newUserPasswordChange = {
            old_password: newPasswordChange.old_password,
            password: newPasswordChange.new_password,
            new_password2: newPasswordChange.new_password2,
            reset_password: resetPassword,
            username: userInfoValues?.username
        }

        setIsSaving(true);
        setErrors({});

        api.put(RestUrls.userDetailForUserURL(), newUserPasswordChange)
            .then(() => {
                toast.success(DEFAULT_SUCCESS);
            }).catch(error => {
                if (VALIDATION_ERROR_CODE === error?.response?.status && error?.response?.data) {
                    setErrors(error.response.data);
                }
                toast.error(getDefaultError(error?.response?.status));
            }).finally(() => {
                setIsSaving(false);
            });
    }

    return (
        <>
            <Grid container spacing={2} sx={{ mb: 4 }}>
                <Grid item xs={12}>
                    <Grid item md={12} lg={6}>
                        <Alert severity='info' icon={false}>
                            <AlertTitle>Password Requirements</AlertTitle>
                            <Typography variant='body1' component='ul' sx={{ pl: 2.5 }}>
                                <li>Must be at least 9 characters long</li>
                                <li>Must not consist solely of numeric digits</li>
                                <li>Avoid passwords resembling personal attributes or common terms</li>
                            </Typography>
                        </Alert>
                    </Grid>
                </Grid>
            </Grid>

            <Grid container spacing={2}>
                <Grid item xs={12}>
                    <Grid item md={12} lg={6}>
                        <InputLabel htmlFor='old_password' sx={{ mb: 1 }}>Previous Password:</InputLabel>
                        <TextField
                            id='old_password'
                            fullWidth
                            autoComplete="off"
                            type={showPassword.previous ? 'text' : 'password'}
                            name='old_password'
                            value={newPasswordChange.old_password}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={() => handleTogglePassword('previous')}>
                                            {showPassword.previous ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                            onChange={handleChange}
                        />
                        {errors?.old_password && <FormErrorMessage message={errors.old_password} />}
                    </Grid>
                </Grid>

                <Grid item xs={12}>
                    <Grid item md={12} lg={6}>
                        <InputLabel htmlFor='new_password' sx={{ mb: 1 }}>New Password:</InputLabel>
                        <TextField
                            id='new_password'
                            fullWidth
                            autoComplete="off"
                            type={showPassword.newPassword ? 'text' : 'password'}
                            name='new_password'
                            value={newPasswordChange.new_password}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={() => handleTogglePassword('newPassword')}>
                                            {showPassword.newPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                            onChange={handleChange}
                        />
                        {errors?.password && <FormErrorMessage message={errors.password} />}
                    </Grid>
                </Grid>
                
                <Grid item xs={12}>
                    <Grid item md={12} lg={6}>
                        <InputLabel htmlFor='new_password2' sx={{ mb: 1 }}>Confirm Password:</InputLabel>
                        <TextField
                            id='new_password2'
                            fullWidth
                            autoComplete="off"
                            type={showPassword.confirmPassword ? 'text' : 'password'}
                            name='new_password2'
                            value={newPasswordChange.new_password2}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={() => handleTogglePassword('confirmPassword')}>
                                            {showPassword.confirmPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                            onChange={handleChange}
                        />
                        {errors?.new_password2 && <FormErrorMessage message={errors.new_password2} />}
                    </Grid>
                </Grid>
                
                <Grid item xs={12}>
                    {errors?.non_field_errors && <FormErrorMessage message={errors.non_field_errors} />}
                    <Button
                        variant="contained" 
                        color="primary" 
                        size="large" 
                        sx={{ mt: 2 }} 
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving && <SaveSpinner />}Save
                    </Button>
                </Grid>
            </Grid>
        </>
    );
};

export default UserPasswordChange;