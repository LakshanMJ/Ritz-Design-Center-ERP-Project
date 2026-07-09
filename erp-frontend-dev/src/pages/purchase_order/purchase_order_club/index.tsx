import DocumentHead from '@/components/DocumentHead';
import ActualPoClubList from '@/views/purchase_order/club/ActualPoClubList';
import { Typography } from '@mui/material';
import React from 'react'

const ActualPoClubs = () => {

    const title = 'Purchase Order Clubs';

    return (
      <>
      <DocumentHead title={title} />
      <Typography variant='h1' color='text.primary'>{title}</Typography>
      <ActualPoClubList/>
      </>
    )
}

export default ActualPoClubs