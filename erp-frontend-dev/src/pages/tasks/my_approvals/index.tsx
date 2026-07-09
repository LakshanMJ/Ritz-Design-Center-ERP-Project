import DocumentHead from "@/components/DocumentHead";
import Approvals from "@/views/approval/Approvals";
import { Typography } from "@mui/material";

const MyApprovals = () => {
    const title = 'Approvals';
    const approvalType = 'my_approval'

    return (
        <>
            <DocumentHead title='Approvals' />
            <Typography variant='h1' color='text.primary'>{title}</Typography>
            <Approvals approvalType={approvalType} />
        </>
    );
}

export default MyApprovals;