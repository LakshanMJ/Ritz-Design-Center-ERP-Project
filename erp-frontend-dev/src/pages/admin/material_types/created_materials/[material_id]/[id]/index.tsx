import DocumentHead from '@/components/DocumentHead'
import CreatedMaterialVeriationDetails from '@/views/settings/userdefine_material/CreatedMaterialVeriationDetails';
import { useRouter } from 'next/router';
import React from 'react'

const MateriaGenericDetails = () => {
    const router = useRouter();
    const title = 'Created Material Details'
    const material_id = router.query.material_id;
    const variation_id = router.query.id;

    console.log(router.query.material_type)
    return (
        <>
            <DocumentHead title={title} />
            <CreatedMaterialVeriationDetails materialId={material_id} variationId={variation_id}/>
        </>)
}

export default MateriaGenericDetails