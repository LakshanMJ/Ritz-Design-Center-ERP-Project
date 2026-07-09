import DocumentHead from '@/components/DocumentHead'
import CreatedMaterials from '@/views/settings/userdefine_material/CreatedMaterials'

const CreatedMaterial = () => {
    const title = 'Created Materials'
    return (
        <>
            <DocumentHead title={title} />
            <CreatedMaterials />
        </>
    )
}

export default CreatedMaterial