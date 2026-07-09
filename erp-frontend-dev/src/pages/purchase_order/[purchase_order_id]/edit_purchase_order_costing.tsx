import DocumentHead from '@/components/DocumentHead';
import PurchaseOrderPageTitle from '@/components/PurchaseOrder/POPageTitle';
import PurchaseOrderCosting from '@/views/purchase_order/PurchaseOrderCosting'
import { useRouter } from 'next/router';
import React from 'react'

const PurchaseOrderInquiries = () => {
  const router = useRouter();
  const { purchase_order_id } = router.query;
  const title = 'Edit Purchase Order Costing';
  return (
    <>
      <DocumentHead title={title} />
      <PurchaseOrderPageTitle activeIndex={9}>{title}</PurchaseOrderPageTitle>
      <PurchaseOrderCosting purchaseOrderId={purchase_order_id} />
    </>

  )
}

export default PurchaseOrderInquiries;