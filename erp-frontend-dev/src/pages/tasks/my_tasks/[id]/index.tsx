import DocumentHead from "@/components/DocumentHead";
import ApprovalDetails from "@/views/approval/ApprovalDetails";
import TaskDetails from "@/views/approval/TaskDetails";
import { useRouter } from "next/router";


const MyTaskDetails = () => {
    const router = useRouter();
    const taskType = 'my_tasks'
    const { id } = router.query;
    return (
        <>
            <DocumentHead title='Task Details' />
            <TaskDetails taskId={id} taskType={taskType} />
        </>
    );
}

export default MyTaskDetails;