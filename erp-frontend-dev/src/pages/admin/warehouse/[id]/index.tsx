import DocumentHead from '@/components/DocumentHead'
import WarehouseDetailView from '@/views/settings/warehouse/WarehouseDetailView'
import router from 'next/router'

const warehouse_details = () => {
  const { id } = router.query

  return (
    <>
      <DocumentHead title='WareHouse Details' />
      <WarehouseDetailView warehouseId={id} />
    </>
  )
}

export default warehouse_details