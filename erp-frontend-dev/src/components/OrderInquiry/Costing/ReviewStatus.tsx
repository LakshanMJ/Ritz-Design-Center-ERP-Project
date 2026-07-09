import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
// import DoneIcon from '@mui/icons-material/Done';
import { Box, Tooltip } from '@mui/material';
import { HiCheck } from 'react-icons/hi';

const ReviewStatus = ({ status }: any) => {

    return (
        <Tooltip title={status ? 'Complete' : 'Action Required'} disableInteractive>
            <Box sx={{ display: 'inline', fontSize: '1rem' }}>
                {status ? (
                    <HiCheck fontSize='inherit' color='green' />
                ): (
                    <PriorityHighIcon fontSize='inherit' color='error' />
                )}
            </Box>
        </Tooltip>
    )
};

export default ReviewStatus;
