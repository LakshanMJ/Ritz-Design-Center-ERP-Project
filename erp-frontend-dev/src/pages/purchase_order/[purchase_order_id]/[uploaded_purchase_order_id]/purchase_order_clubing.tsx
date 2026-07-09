import DocumentHead from '@/components/DocumentHead';
import PurchaseOrderPageTitle from '@/components/PurchaseOrder/POPageTitle';
import PoClub from '@/views/purchase_order/PoClub';
import PurchaseOrderCosting from '@/views/purchase_order/PurchaseOrderCosting'
import { useRouter } from 'next/router';
import React from 'react'

const purchaseOrderClubing = () => {
  const router = useRouter();
  const { purchase_order_id, uploaded_purchase_order_id, pre_costing_included } = router.query;
  const title = 'Purchase Order Clubing';
  return (
    <>
      <DocumentHead title={title} />
      <PurchaseOrderPageTitle activeIndex={10}>{title}</PurchaseOrderPageTitle>
      <PoClub purchaseOrderUploadId={uploaded_purchase_order_id} selectedPoID={purchase_order_id} preCostingIncluded={pre_costing_included}  type={'mapping'} />
    </>

  )
}

export default purchaseOrderClubing;