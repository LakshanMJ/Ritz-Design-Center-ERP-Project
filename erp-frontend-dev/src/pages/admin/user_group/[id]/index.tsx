import DocumentHead from '@/components/DocumentHead'
import UserGroupView from '@/views/settings/user_group/UserGroupView'

const user_profile = () => {
  return (
    <>
      <DocumentHead title='Group Details' />
      <UserGroupView />
    </>
  )
}

export default user_profile