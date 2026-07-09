import DocumentHead from '@/components/DocumentHead';
import { Typography } from '@mui/material';

const PageNotFound = () => {
    return (
        <>
            <DocumentHead title='Not Found'/>
            <Typography variant='h1'>Not Found</Typography>
            <p>Could not find the requested resource.</p>
        </>
    );
};

export default PageNotFound;