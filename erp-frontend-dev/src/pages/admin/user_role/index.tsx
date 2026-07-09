import DocumentHead from "@/components/DocumentHead";
import UserRoleListPage from "@/views/settings/user_role/UserRoleListView";

const user = () => {
    return (
        <>
            <DocumentHead title='User Roles' />
            <UserRoleListPage />
        </>
    );
}

export default user;