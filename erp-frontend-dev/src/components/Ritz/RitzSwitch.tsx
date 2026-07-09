import React from 'react';
import { Box, Switch, alpha, styled } from "@mui/material";

const RitzSwitch = ({ name, status, handleChangeSwitch, isReadOnly=false }: any) => {
    const GreenSwitch = styled(Switch)(({ theme }) => ({
        '& .MuiSwitch-switchBase.Mui-checked': {
            color: '#1ECB00',
            '&:hover': {
                backgroundColor: alpha('#1ECB00', theme.palette.action.hoverOpacity),
            },
        },
        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
            backgroundColor: '#1ECB00',
        },
    }));

    return (
        <Box display="flex" justifyContent="flex-end" >
            <p style={{ fontSize: '16px', marginLeft: '-10px' }}>{name}<GreenSwitch color="primary" checked={status || false} onChange={handleChangeSwitch} disabled={isReadOnly} /></p>
        </Box>

    );
};

export default RitzSwitch;