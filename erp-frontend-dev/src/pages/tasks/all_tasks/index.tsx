import DocumentHead from "@/components/DocumentHead";
import Tasks from "@/views/approval/Tasks";
import { Typography } from "@mui/material";

const AllTasks = () => {
    const title = 'All Tasks';
    const taskType ='all_tasks'

    return (
        <>
            <DocumentHead title='All Tasks' />
            <Typography variant='h1' color='text.primary'>{title}</Typography>
            <Tasks taskType={taskType} />
        </>
    );
}

export default AllTasks;