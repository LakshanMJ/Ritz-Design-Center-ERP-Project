import DocumentHead from '@/components/DocumentHead';
import RitzBreadcrumbs from '@/components/Ritz/RitzBreadcrumbs';
import ServicePODetails from '@/views/purchase_order/ServicePODetails';
import { useRouter } from 'next/router';
import React from 'react'

const index = () => {

    const router = useRouter();
    const { service_po_id } = router.query;
    const title = 'Service PO Details';
    return (
      <>
       <DocumentHead title={title} />
       <RitzBreadcrumbs
        items={[
            { label: 'Service POs', url: '/purchase_order/service_po_list' },
            { label: 'Service PO Details' },
        ]}
        title={title}
        />
      <ServicePODetails servicePoId={service_po_id}/>
      </>
    )
  }
  
  export default index