import DocumentHead from '@/components/DocumentHead'
import SizeCategoryPage from '@/views/settings/size_category/SizeCategoryListView'

const size_category = () => {
  return (
   <>
      <DocumentHead title='Size Categories' />
      <SizeCategoryPage />
   </>
  )
}

export default size_category