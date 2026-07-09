import { Box } from '@mui/material';
import React from 'react';
import { FaSpinner } from 'react-icons/fa';


const DefaultLoader = () => {
    return (
        <Box
            sx={{
                p: 2,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
            }}>
                <FaSpinner className='spin' />
                <Box sx={{ ml: 1 }}>Loading...</Box>
        </Box>
    )
};

export default DefaultLoader;