import DocumentHead from "@/components/DocumentHead";
import UserListPage from "@/views/settings/user/UserListView";

const user = () => {
    return (
        <>
            <DocumentHead title='Users' />
            <UserListPage />
        </>
    );
}

export default user;