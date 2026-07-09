import DocumentHead from '@/components/DocumentHead'
import GrnDashboard from '@/views/grn/GrnDashboard'
import { Typography } from '@mui/material';
import React from 'react'

const GrnInquiries = () => {
  const title = 'Goods Received Note (GRN)';
  return (
    <>
    <DocumentHead title={title} />
    {/* <Typography variant='h1' color='text.primary'>{title}</Typography> */}
    <GrnDashboard />
    </>
  )
}

export default GrnInquiries