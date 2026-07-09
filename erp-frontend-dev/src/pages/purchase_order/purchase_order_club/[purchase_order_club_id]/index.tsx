import DocumentHead from '@/components/DocumentHead';
import RitzBreadcrumbs from '@/components/Ritz/RitzBreadcrumbs';
import ActualPoClubDetails from '@/views/purchase_order/club/ActualPoClubDetails'
import { useRouter } from 'next/router';
import React from 'react'

const index = () => {

  const router = useRouter();
  const { purchase_order_club_id } = router.query;
  const title = 'Purchase Order Club Details';
  return (
    <>
     <DocumentHead title={title} />
     <RitzBreadcrumbs
      items={[
          { label: 'Purchase Orders Club', url: '/purchase_order/purchase_order_club' },
          { label: 'Purchase Order Club Details' },
      ]}
      title={title}
      />
    <ActualPoClubDetails clubId={purchase_order_club_id}/>
    </>
  )
}

export default index