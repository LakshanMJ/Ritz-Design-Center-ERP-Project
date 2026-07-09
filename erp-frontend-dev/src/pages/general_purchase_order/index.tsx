import DocumentHead from '@/components/DocumentHead';
import GeneralPurchaseOrderList from '@/views/general_purchase_order/GeneralPurchaseOrderList';
import ActualPoClubList from '@/views/purchase_order/club/ActualPoClubList';
import { Typography } from '@mui/material';
import React from 'react'

const GeneralPurchaseOrders = () => {

    const title = 'General Purchase Orders';

    return (
      <>
      <DocumentHead title={title} />
      <Typography variant='h1' color='text.primary'>{title}</Typography>
      <GeneralPurchaseOrderList/>
      </>
    )
}

export default GeneralPurchaseOrders