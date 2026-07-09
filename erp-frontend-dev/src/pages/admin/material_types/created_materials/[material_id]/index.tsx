import DocumentHead from '@/components/DocumentHead'
import CreatedMaterialDetails from '@/views/settings/userdefine_material/CreatedMaterialDetails';
import { useRouter } from 'next/router';
import React from 'react'

const MateriaGenericDetails = () => {
    const router = useRouter();
    const title = 'Created Material Details'
    const material_type = router.query.material_id;
    
    return (
        <>
            <DocumentHead title={title} />
            <CreatedMaterialDetails materialType={material_type}/>
        </>)
}

export default MateriaGenericDetails