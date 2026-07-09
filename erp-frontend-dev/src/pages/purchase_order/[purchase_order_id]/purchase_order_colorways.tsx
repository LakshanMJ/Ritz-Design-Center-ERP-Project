import DocumentHead from '@/components/DocumentHead';
import PurchaseOrderPageTitle from '@/components/PurchaseOrder/POPageTitle';
import PurchaseOrderColorway from '@/views/purchase_order/PurchaseOrderColorways'
import { useRouter } from 'next/router';
import React from 'react'

const PurchaseOrderColorways = () => {
  const router = useRouter();
  const { purchase_order_id } = router.query;
  const title = 'Purchase Order Colorways';
  return (
    <>
      <DocumentHead title={title} />
      <PurchaseOrderPageTitle activeIndex={7}>{title}</PurchaseOrderPageTitle>
      <PurchaseOrderColorway purchaseOrderId={purchase_order_id} />
    </>

  )
}

export default PurchaseOrderColorways
