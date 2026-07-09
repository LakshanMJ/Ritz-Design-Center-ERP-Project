import DocumentHead from '@/components/DocumentHead'
import UserProfileView from '@/views/settings/user/UserProfileView'

const user_profile = () => {
  return (
    <>
      <DocumentHead title='User Details' />
      <UserProfileView/>
    </>
  )
}

export default user_profile