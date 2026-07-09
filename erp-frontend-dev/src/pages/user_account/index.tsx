import DocumentHead from '@/components/DocumentHead'
import UserProfile from '@/views/common/user/UserProfile'

const user_account = () => {
    return (
        <>
            <DocumentHead title='User Account' />
            <UserProfile />
        </>
    )
}
export default user_account