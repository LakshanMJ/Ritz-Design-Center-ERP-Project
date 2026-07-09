import DocumentHead from '@/components/DocumentHead';
import RitzBreadcrumbs from '@/components/Ritz/RitzBreadcrumbs';
import ActualPoClubDetails from '@/views/purchase_order/club/ActualPoClubDetails'
import SupplierPODetails from '@/views/purchase_order/SupplierPODetails';
import { useRouter } from 'next/router';
import React from 'react'

const index = () => {

    const router = useRouter();
    const { supplier_po_id } = router.query;
    const title = 'Supplier PO Details';
    return (
      <>
       <DocumentHead title={title} />
       <RitzBreadcrumbs
        items={[
            { label: 'Supplier POs', url: '/purchase_order/supplier_po_list' },
            { label: 'Supplier PO Details' },
        ]}
        title={title}
        />
      <SupplierPODetails supplierPoId={supplier_po_id}/>
      </>
    )
  }
  
  export default index