import { useEffect, useState } from 'react';
import { useRouter } from "next/router";
// import NextLink from 'next/link';
import { Alert, Box, Button, Card, FormControl, Grid, IconButton, InputAdornment, InputLabel, Link, OutlinedInput, Stack, Typography } from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import SaveSpinner from '@/components/SaveSpinner';
import { useSelector } from 'react-redux';
import FormErrorMessage from '@/components/FormErrorMessage';
import { login } from '@/services/api';
import DocumentHead from '@/components/DocumentHead';

const LoginView = () => {
    const router = useRouter();
    const isLoggedIn = useSelector((state: any) => state.AuthReducer.isLoggedIn);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [errors, setErrors] = useState<any>({});
    const [isSaving, setIsSaving] = useState(false);
    const [show, setShow] = useState(false);

    const handleClick = () => setShow(!show);

    const onSubmit = async (event: any) => {
        event.preventDefault();
        setErrorMsg('');
        setErrors({});
        setIsSaving(true);

        try {
            const auth = await login(username, password);
            if (auth?.success) {
                router.push('/');
            } else {
                setErrorMsg('Unable to login.');
                setIsSaving(false);
            }
        } catch (error: any) {
            const { response } = error;
            if (response?.data?.detail) {
                setErrorMsg(response.data.detail);
            } else if (response?.data) {
                setErrorMsg('Unable to login.');
                setErrors(response.data);
            } else {
                setErrorMsg('Unable to login.')
            }
            setIsSaving(false);
        }
    };

    useEffect(() => {
        if (isLoggedIn) {
            router.push('/'); //TODO add redirect url
        }    
    }, []);

    return (
        <Box sx={{
            display: 'flex',
            flexGrow: 1,
            backgroundImage: 'url("/images/jeans.png")',
            backgroundSize: 'cover',
            backgroundPosition: 'left',
            backgroundRepeat: 'no-repeat',
            minHeight: '100vh',
        }}>
            <DocumentHead />
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    // maxWidth: '25rem',
                    width: '25rem',
                    margin: '0 auto'
                }}
            >

                <Grid
                    component={Card}
                    variant="elevation"
                    elevation={0}
                    container
                    direction="column"
                    alignItems="center"
                    justifyContent="center"
                    sx={{
                        p: 4,
                        backgroundColor: 'rgba(255, 255, 255, 0.15)',
                        backdropFilter: 'blur(10px)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                        borderRadius: 3,
                        border: '1px solid rgba(255,255,255,0.2)',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                            boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
                        },
                    }}
                >
                    <Grid item sx={{ mb: 5, alignItems: 'center' }}>
                        <img width={200} src="/images/nexa3.png" alt="logo" />
                    </Grid>

                    <Grid item sx={{ width: '100%' }}>
                        {errorMsg && <Alert severity="error" sx={{ mb: 3 }}>{errorMsg}</Alert>}

                        <form onSubmit={e => onSubmit(e)}>
                            <Stack spacing={3}>
                                <FormControl fullWidth variant="outlined">
                                    <Typography variant="subtitle2" sx={{ mb: 1, color: '#fff', fontWeight: 500 }}>
                                        Username
                                    </Typography>
                                    <OutlinedInput
                                        autoFocus
                                        id="username"
                                        placeholder="Enter username"
                                        onChange={(e: any) => setUsername(e.target.value)}
                                        sx={{
                                            backgroundColor: 'rgba(255, 255, 255, 0.15)',
                                            borderRadius: '12px',
                                            color: '#fff',
                                            overflow: 'hidden',
                                            '& .MuiOutlinedInput-notchedOutline': {
                                                borderColor: 'rgba(255,255,255,0.4)',
                                            },
                                            '&:hover .MuiOutlinedInput-notchedOutline': {
                                                borderColor: 'rgba(255,255,255,0.7)',
                                            },
                                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                borderColor: '#fff',
                                                boxShadow: '0 0 8px rgba(255,255,255,0.5)',
                                            },
                                            '& .MuiInputBase-input': {
                                                color: '#000000ff',
                                                '::placeholder': {
                                                    color: 'rgba(0, 0, 0, 0.7)',
                                                    opacity: 1,
                                                },
                                            },
                                            
                                            '& input:-webkit-autofill': {
                                                borderRadius: 'inherit',
                                                boxShadow: '0 0 0 1000px rgba(255,255,255,0.15) inset !important',
                                                WebkitBoxShadow: '0 0 0 1000px rgba(255,255,255,0.15) inset !important',
                                                WebkitTextFillColor: '#000000ff !important',
                                                transition: 'background-color 9999s ease-in-out 0s !important',
                                            },
                                        }}
                                    />

                                    {errors?.username && <FormErrorMessage message={errors?.username} />}
                                </FormControl>

                                <FormControl fullWidth variant="outlined">
                                    <Typography variant="subtitle2" sx={{ mb: 1, color: '#fff', fontWeight: 500 }}>
                                        Password
                                    </Typography>
                                    <OutlinedInput
                                        id="pw"
                                        type={show ? 'text' : 'password'}
                                        placeholder="Enter password"
                                        onChange={(e: any) => setPassword(e.target.value)}
                                        endAdornment={
                                            <InputAdornment position="end">
                                                <IconButton onClick={handleClick}>
                                                    {show ? <Visibility /> : <VisibilityOff />}
                                                </IconButton>
                                            </InputAdornment>
                                        }
                                        sx={{
                                            backgroundColor: 'rgba(255,255,255,0.2)',
                                            color: '#fff',
                                            borderRadius: 2,
                                            overflow: 'hidden',
                                            '& .MuiOutlinedInput-notchedOutline': {
                                                borderColor: 'rgba(255,255,255,0.4)',
                                                transition: 'border-color 0.3s ease',
                                            },
                                            '&:hover .MuiOutlinedInput-notchedOutline': {
                                                borderColor: 'rgba(255,255,255,0.7)',
                                            },
                                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                borderColor: '#fff',
                                                boxShadow: '0 0 8px rgba(255,255,255,0.5)',
                                            },
                                            '& .MuiInputBase-input': {
                                                color: '#000',
                                                transition: 'color 0.3s ease',
                                                '::placeholder': {
                                                    color: 'rgba(0, 0, 0, 0.7)',
                                                    opacity: 1,
                                                },
                                            },
                                          
                                            '& input:-webkit-autofill': {
                                                borderRadius: 'inherit',
                                                boxShadow: '0 0 0 1000px rgba(255,255,255,0.2) inset !important',
                                                WebkitBoxShadow: '0 0 0 1000px rgba(255,255,255,0.2) inset !important',
                                                WebkitTextFillColor: '#000 !important',
                                                transition: 'background-color 9999s ease-in-out 0s !important',
                                            },
                                        }}
                                    />
                                    {errors?.password && <FormErrorMessage message={errors?.password} />}
                                </FormControl>

                                <Box pt={1}>
                                    <Button
                                        type="submit"
                                        fullWidth
                                        size="large"
                                        variant="contained"
                                        disabled={isSaving}
                                        sx={{
                                            background: 'linear-gradient(135deg, #6b73ff 0%, #000dff 100%)',
                                            color: '#fff',
                                            fontWeight: 600,
                                            borderRadius: 2,
                                            transition: 'all 0.3s ease',
                                            '&:hover': {
                                                background: 'linear-gradient(135deg, #000dff 0%, #6b73ff 100%)',
                                                transform: 'translateY(-2px)',
                                                boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
                                            },
                                        }}
                                    >
                                        {isSaving && <SaveSpinner />} Login
                                    </Button>
                                </Box>
                            </Stack>
                        </form>
                    </Grid>
                </Grid>
            </Box>
        </Box>
    )
};

export default LoginView;
