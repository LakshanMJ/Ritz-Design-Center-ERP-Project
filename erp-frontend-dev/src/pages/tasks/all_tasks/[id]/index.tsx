import DocumentHead from "@/components/DocumentHead";
import ApprovalDetails from "@/views/approval/ApprovalDetails";
import TaskDetails from "@/views/approval/TaskDetails";
import { useRouter } from "next/router";


const AllTaskDetails = () => {
    const router = useRouter();
    const taskType = 'all_tasks'
    const { id } = router.query;
    return (
        <>
            <DocumentHead title='Task Details' />
            <TaskDetails taskId={id} taskType={taskType} />
        </>
    );
}

export default AllTaskDetails;