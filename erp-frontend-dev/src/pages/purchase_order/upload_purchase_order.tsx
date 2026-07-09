import DocumentHead from '@/components/DocumentHead';
import PurchaseOrderPageTitle from '@/components/PurchaseOrder/POPageTitle';
import UploadPurchaseOrder from '@/views/purchase_order/UploadPurchaseOrder'
import { useRouter } from 'next/router';
import React from 'react'

const UploadPurchaseOrderPage = () => {
    const router = useRouter();
  const { purchase_order_id } = router.query;
    const title = 'Create New Purchase Order';
    return (
      <>
        <DocumentHead title={title} />
        <PurchaseOrderPageTitle activeIndex={2}>{title}</PurchaseOrderPageTitle>
        <UploadPurchaseOrder purchaseOrderId={purchase_order_id} />
    </>
    )
}

export default UploadPurchaseOrderPage;