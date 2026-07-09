import DocumentHead from '@/components/DocumentHead';
import PurchaseOrders from '@/views/purchase_order/PurchaseOrderList'
import { Typography } from '@mui/material';
import React from 'react'

const PurchaseOrderList = () => {
  const title = 'Purchase Orders';
  return (
     <>
      <DocumentHead title={title} />
      <Typography variant='h1' color='text.primary'>{title}</Typography>
      <PurchaseOrders />
     </>
  )
}

export default PurchaseOrderList