import DocumentHead from "@/components/DocumentHead";
import ApprovalDetails from "@/views/approval/ApprovalDetails";
import { useRouter } from "next/router";


const Approvals = () => {
    const router = useRouter();
    const approvalType = 'my_approval'
    const { id } = router.query;
    return (
        <>
            <DocumentHead title='Approval Details' />
            <ApprovalDetails approvalId={id} approvalType={approvalType} />
        </>
    );
}

export default Approvals;