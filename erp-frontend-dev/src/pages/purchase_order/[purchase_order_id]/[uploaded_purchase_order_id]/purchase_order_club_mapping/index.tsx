import DocumentHead from '@/components/DocumentHead';
import PurchaseOrderPageTitle from '@/components/PurchaseOrder/POPageTitle';
import ActualPOClubMappingList from '@/views/purchase_order/club/ActualPOClubMappingList';
import { useRouter } from 'next/router';
import React from 'react'

const purchaseOrderClubing = () => {
  const router = useRouter();
  const { purchase_order_id, uploaded_purchase_order_id } = router.query;
  const title = 'Purchase Order Clubs Mapping';
  return (
    <>
      <DocumentHead title={title} />
      <PurchaseOrderPageTitle activeIndex={10}>{title}</PurchaseOrderPageTitle>
      <ActualPOClubMappingList purchaseOrderId={purchase_order_id} uploadPOId={uploaded_purchase_order_id} />
    </>

  )
}

export default purchaseOrderClubing;