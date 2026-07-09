import GrnDetailView from '@/views/grn/GrnDetailView';
import { useRouter } from 'next/router';
import React, { useState } from 'react'

const CreatingGrnView = () => {
  const router = useRouter();
  const { supplier_po } = router.query;

  return (
    <>
    <GrnDetailView grnId={0} supplierPo={supplier_po}/>
    </>
  )
}

export default CreatingGrnView