import DocumentHead from "@/components/DocumentHead";
import PCLList from "@/views/pcl_activities/finance/PCLList";

const PCLListView = () => {
    return (
        <>
            <DocumentHead title='PCL Facility List' />
            <PCLList/>
        </>
    );
}

export default PCLListView;