import DocumentHead from '@/components/DocumentHead';
import RitzBreadcrumbs from '@/components/Ritz/RitzBreadcrumbs';
import ActualPoClubDetails from '@/views/purchase_order/club/ActualPoClubDetails'
import TransportDeliveryTrackingDetails from '@/views/transport/TransportDeliveryTrackingDetails';
import { useRouter } from 'next/router';
import React from 'react'

const index = () => {

    const router = useRouter();
    const { transport_tracking_id } = router.query;
    const title = '  Transport Delivery Date Tracking Details';
    return (
      <>
       <DocumentHead title={title} />
       <RitzBreadcrumbs
        items={[
            { label: 'Import Delivery Track', url: '/transport/import_delivery_track' },
            { label: 'Transport Delivery Date Tracking Details' },
        ]}
        title={title}
        />
      <TransportDeliveryTrackingDetails transportTrackingId={transport_tracking_id}/>
      </>
    )
  }
  
  export default index