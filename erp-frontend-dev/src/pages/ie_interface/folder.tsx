
import DocumentHead from '@/components/DocumentHead'
import FolderListView from '@/views/ie_interface/Folder'
import React from 'react'

const FolderListPage = () => {
  return (
    <>
      <DocumentHead title='Folders' />
      <FolderListView />
    </>
  )
}

export default FolderListPage