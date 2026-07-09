import DocumentHead from '@/components/DocumentHead'
import GrnDashboard from '@/views/grn/GrnDashboard'
import LeftoverDashboard from '@/views/leftover/LeftoverDashboard';
import { Typography } from '@mui/material';
import React from 'react'

const LeftoverVerification = () => {
  const title = 'Material Verification';
  return (
    <>
      <DocumentHead title={title} />
      <LeftoverDashboard />
    </>
  )
}

export default LeftoverVerification