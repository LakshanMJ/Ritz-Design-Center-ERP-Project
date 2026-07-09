import { Box, CircularProgress } from '@mui/material';
import React from 'react';

const CircularLoader = () => {
    return (
        <Box 
            sx={{ 
                position: 'fixed', 
                top: 0, 
                left: 0, 
                width: '100%', 
                height: '100%', 
                bgcolor: 'rgba(0, 0, 0, 0.5)', 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                zIndex: 9999 
            }}
        >
            <CircularProgress />
        </Box>
    );
};

export default CircularLoader;