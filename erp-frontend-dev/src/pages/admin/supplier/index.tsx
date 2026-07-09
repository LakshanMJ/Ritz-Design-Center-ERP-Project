import DocumentHead from '@/components/DocumentHead'
import SupplierListView from '@/views/settings/suppliers/SupplierListView'

const suppliers = () => {
  return (
    <>
      <DocumentHead title='Suppliers' />
      <SupplierListView />
    </>
  )
}

export default suppliers