import DocumentHead from '@/components/DocumentHead'
import CustomerMaterials from '@/views/settings/customer_materials/CustomerMaterials'

const CreatedMaterial = () => {
    const title = 'Customer Materials'
    return (
        <>
            <DocumentHead title={title} />
            <CustomerMaterials />
        </>
    )
}

export default CreatedMaterial