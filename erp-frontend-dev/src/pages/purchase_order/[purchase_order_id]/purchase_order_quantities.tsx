import DocumentHead from '@/components/DocumentHead';
import PurchaseOrderPageTitle from '@/components/PurchaseOrder/POPageTitle';
import PerchaseOrderQuantity from '@/views/purchase_order/PurchaseOrderQuantity'
import { useRouter } from 'next/router';
import React from 'react'

const PerchaseOrderQuantities = () => {
  const router = useRouter();
  const { purchase_order_id } = router.query;
  const title = 'Purchase Order Quantities';
 
  return (
    <>
     <DocumentHead title={title} />
      <PurchaseOrderPageTitle activeIndex={6}>{title}</PurchaseOrderPageTitle>
      <PerchaseOrderQuantity purchaseOrderId={purchase_order_id} />
    </>
   
  )
}

export default PerchaseOrderQuantities
