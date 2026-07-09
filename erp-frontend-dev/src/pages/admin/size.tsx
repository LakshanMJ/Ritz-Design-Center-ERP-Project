import DocumentHead from "@/components/DocumentHead";
import SizeListView from "@/views/settings/size/SizeListView";

const size = () => {
  return (
   <>
    <DocumentHead title='Sizes' />
    <SizeListView />
   </>
  )
}

export default size