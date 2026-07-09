import DocumentHead from "@/components/DocumentHead";
import Tasks from "@/views/approval/Tasks";
import { Typography } from "@mui/material";

const MyTasks = () => {
    const title = 'My Tasks';
    const taskType = 'my_tasks'

    return (
        <>
            <DocumentHead title='My Tasks' />
            <Typography variant='h1' color='text.primary'>{title}</Typography>
            <Tasks taskType={taskType} />
        </>
    );
}

export default MyTasks;