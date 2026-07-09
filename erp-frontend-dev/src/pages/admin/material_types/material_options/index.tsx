import DocumentHead from '@/components/DocumentHead'
import MaterialOptions from '@/views/settings/userdefine_material/MaterialOptions'

const MaterialOption = () => {
  const title = 'Material Options'
  return (
     <>
      <DocumentHead title={title} />
      <MaterialOptions />
    </>
  )
}

export default MaterialOption