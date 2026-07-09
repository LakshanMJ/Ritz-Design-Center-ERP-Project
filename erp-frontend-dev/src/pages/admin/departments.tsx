import DocumentHead from "@/components/DocumentHead";
import DepartmentsList from "@/views/settings/departments/DepartmentsList";

const season = () => {
    return (
        <>
            <DocumentHead title='Departments' />
            <DepartmentsList/>
        </>
    );
}

export default season;