import DocumentHead from '@/components/DocumentHead'
import MachineListView from '@/views/ie_interface/Machine'
import React from 'react'

const MachineListPage = () => {
  return (
    <>
      <DocumentHead title='Machines' />
      <MachineListView />
    </>
  )
}

export default MachineListPage