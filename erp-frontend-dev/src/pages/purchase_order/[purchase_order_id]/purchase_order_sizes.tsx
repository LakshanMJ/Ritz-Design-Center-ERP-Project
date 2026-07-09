import DocumentHead from '@/components/DocumentHead';
import PurchaseOrderPageTitle from '@/components/PurchaseOrder/POPageTitle';
import PerchaseOrderSize from '@/views/purchase_order/PurchaseOrderSize'
import { useRouter } from 'next/router';
import React from 'react'

const PerchaseOrderSizes = () => {
  const router = useRouter();
  const { purchase_order_id } = router.query;
  const title = 'Purchase Order Sizes';
  return (
    <>
      <DocumentHead title={title} />
      <PurchaseOrderPageTitle activeIndex={4}>{title}</PurchaseOrderPageTitle>
      <PerchaseOrderSize purchaseOrderId={purchase_order_id} />
    </>

  )
}

export default PerchaseOrderSizes
