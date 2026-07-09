import React from 'react';
import { Tooltip, Box, Typography, IconButton } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
const RitzToolTip = ({ materialHeaders = [], materialDetails = {} }: any) => {
    return (
        <Tooltip arrow title={
            <Box>
                {materialHeaders.map((header: any, headerIndex: any) => (
                    <Typography key={headerIndex}>
                        {header.label} : {materialDetails[header.name]}
                    </Typography>
                ))}
            </Box>
        }>
            <IconButton size="small">
                <InfoIcon fontSize="small" />
            </IconButton>
        </Tooltip>
    );
};
export default RitzToolTip;