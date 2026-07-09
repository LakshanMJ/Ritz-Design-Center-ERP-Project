import DocumentHead from '@/components/DocumentHead';
import PurchaseOrderUploadList from '@/views/purchase_order/PurchaseOrderUploadList';
import { Typography } from '@mui/material';
import React from 'react'

const UploadPurchaseOrderList = () => {
  const title = 'Uploaded Purchase Orders';
  return (
     <>
      <DocumentHead title={title} />
      <Typography variant='h1' color='text.primary'>{title}</Typography>
      <PurchaseOrderUploadList />
     </>
  )
}

export default UploadPurchaseOrderList