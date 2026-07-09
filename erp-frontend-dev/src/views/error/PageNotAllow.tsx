import DocumentHead from '@/components/DocumentHead';
import { Typography } from '@mui/material';

const PageNotAllow = () => {
    return (
        <>
            <DocumentHead title='Page Not Allowed'/>
            <Typography variant='h1'>Page Not Allowed</Typography>
            <p>Please contact the System Administrator for further assistance.</p>
        </>
    );
};

export default PageNotAllow;