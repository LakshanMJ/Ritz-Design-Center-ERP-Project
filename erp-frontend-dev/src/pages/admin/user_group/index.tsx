import DocumentHead from "@/components/DocumentHead";
import GroupListPage from "@/views/settings/user_group/UserGroupListView";

const user = () => {
    return (
        <>
            <DocumentHead title='User Groups' />
            <GroupListPage />
        </>
    );
}

export default user;