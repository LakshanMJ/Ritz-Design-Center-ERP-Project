import DocumentHead from '@/components/DocumentHead'
import ProgramesListPage from "@/views/costing/OrderProgramList";
import React from 'react'

const programs = () => {
  return (
    <>
     <DocumentHead title='Programs' />
     <ProgramesListPage />
    </>
  )
}

export default programs