import DocumentHead from '@/components/DocumentHead';
import PurchaseOrderPageTitle from '@/components/PurchaseOrder/POPageTitle';
import PerchaseOrderCountry from '@/views/purchase_order/PurchaseOrderCountry'
import { useRouter } from 'next/router';
import React from 'react'

const PerchaseOrderCountries = () => {
  const router = useRouter();
  const { purchase_order_id } = router.query;
  const title = 'Purchase Order Countries';

  return (
    <>
      <DocumentHead title={title} />
      <PurchaseOrderPageTitle activeIndex={5}>{title}</PurchaseOrderPageTitle>
      <PerchaseOrderCountry purchaseOrderId={purchase_order_id}/>
    </>
  )
}

export default PerchaseOrderCountries
