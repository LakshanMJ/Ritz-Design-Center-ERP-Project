import React from 'react';
import { Box, Breakpoint, Dialog, DialogContent, DialogTitle, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DefaultLoader from '../DefaultLoader';

interface CustomModalProps {
    open: boolean;
    title: React.ReactNode;
    onClose: () => void;
    children: React.ReactNode;
    isLoading?: boolean;
    maxWidth?: Breakpoint | false;
    fullWidth?: boolean;
    titleSize?: any;
}

const RitzModal: React.FC<CustomModalProps> = ({
    open,
    onClose,
    children,
    title,
    isLoading=false,
    maxWidth='sm', 
    fullWidth=true,
    titleSize='h4'
}) => {
    return (
        <Dialog open={open} onClose={onClose} maxWidth={maxWidth} fullWidth={fullWidth}>
            <DialogTitle id='dialog-title' >
            <Typography component="span" variant={titleSize}>{title}</Typography>
                <IconButton
                    aria-label='close'
                    onClick={onClose}
                    sx={{
                        position: 'absolute',
                        right: 5,
                        top: 5,
                        color: (theme) => theme.palette.grey[500],
                        background: 'none',
                        '&:hover, &:focus, &:active': {
                            color: (theme) => theme.palette.grey[700],
                            background: 'none'
                        }
                    }}
                    size='small'
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent sx={{ pt: 0, pb: 3 }}>
                {isLoading ? <DefaultLoader/> : 
                    <Box sx={{ mt: 1 }}>{children}</Box>
                }
            </DialogContent>
        </Dialog>
    );
};


export default RitzModal;
