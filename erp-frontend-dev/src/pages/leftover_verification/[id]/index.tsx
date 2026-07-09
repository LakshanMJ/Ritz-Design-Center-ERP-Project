import DocumentHead from '@/components/DocumentHead';
import LeftoverDetail from '@/views/leftover/LeftoverDetail';
import { useRouter } from 'next/router';
import React from 'react'

const leftoverDetails = () => {
  const router = useRouter();
  const { id } = router.query;
  const title = "Leftover Verifications";
  return (
    <>
      <DocumentHead title={title} />
      <LeftoverDetail verificationId={id} />
    </>
  )
}

export default leftoverDetails