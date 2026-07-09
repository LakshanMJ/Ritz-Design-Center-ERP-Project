import DocumentHead from '@/components/DocumentHead';
import PurchaseOrderPageTitle from '@/components/PurchaseOrder/POPageTitle';
import PurchaseOrderInquiry from '@/views/purchase_order/PurchaseOrderCosting'
import { useRouter } from 'next/router'
import React from 'react'

const CreatePurchaseOrderInquiries = () => {
  const router = useRouter()
  const { customer } = router.query;
  const {file_id } = router.query;
  const title = 'Purchase Order Costing';
  return (
    <>
      <DocumentHead title={title} />
      <PurchaseOrderPageTitle activeIndex={3}>{title}</PurchaseOrderPageTitle>
      <PurchaseOrderInquiry Customer={customer} fileID={file_id} />
    </>
  )
}

export default CreatePurchaseOrderInquiries