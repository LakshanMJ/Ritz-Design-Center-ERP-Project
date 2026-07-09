import DocumentHead from '@/components/DocumentHead'
import SupplierDetailView from '@/views/settings/suppliers/SupplierDetailView'
import router from 'next/router'

const supplier_details = () => {
  const supplier_id =  router.query.id
  return (
    <>
      <DocumentHead title='Supplier Details' />
      <SupplierDetailView supplierId={supplier_id}/>
    </>
  )
}

export default supplier_details