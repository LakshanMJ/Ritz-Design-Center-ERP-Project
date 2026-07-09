import DocumentHead from '@/components/DocumentHead';
import GrnDetailView from '@/views/grn/GrnDetailView';
import { useRouter } from 'next/router';
import React from 'react'

const createdGrnDetails = () => {
    const router = useRouter();
    const { grnId, supplier_po } = router.query;
    const title = "Goods Received Note (GRN)";
  return (
    <>
     <DocumentHead title={title} />
    <GrnDetailView grnId={grnId} supplierPo={supplier_po} />
    </>
  )
}

export default createdGrnDetails