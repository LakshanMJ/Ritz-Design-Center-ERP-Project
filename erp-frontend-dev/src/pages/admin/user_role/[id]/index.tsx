import DocumentHead from '@/components/DocumentHead'
import UserRoleView from '@/views/settings/user_role/UserRoleView'

const user_profile = () => {
  return (
    <>
      <DocumentHead title='Role Details' />
      <UserRoleView />
    </>
  )
}

export default user_profile