import DocumentHead from '@/components/DocumentHead'
import ItemDetailView from '@/views/settings/item/ItemDetailView'

const item_details = () => {
  return (
    <>
      <DocumentHead title='Item Details' />
      <ItemDetailView />
    </>
  )
}

export default item_details