import DocumentHead from '@/components/DocumentHead'
import ProgramedOrderInquiryList from '@/views/costing/ProgramedOrderInquiryDetailsList';
import router from 'next/router';
import React from 'react'

const programedOrderInquiryList = () => {
  const  programID = router.query.program_id;
  return (
    <>
    <DocumentHead title='Program Details' />
    <ProgramedOrderInquiryList  programId={programID}/>
    </>
  )
}

export default programedOrderInquiryList