import React from 'react'
import EditMaterialDetail from '@/views/settings/userdefine_material/EditAttributeDetail'
import DocumentHead from '@/components/DocumentHead'
import { useRouter } from 'next/router';

const editMaterialDetail = () => {
  const router = useRouter();
  const materialID = router.query.id;
  const attribute_id = router.query.attribute_id;
  return (
    <>
      <DocumentHead title='Material Details' />
      <EditMaterialDetail materialID={materialID} attributeId={attribute_id} isMaterialOptions/>
    </>
  )
}

export default editMaterialDetail