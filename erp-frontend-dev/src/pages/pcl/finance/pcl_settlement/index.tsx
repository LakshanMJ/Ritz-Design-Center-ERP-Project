import DocumentHead from "@/components/DocumentHead";
import PCLSettlementList from "@/views/pcl_activities/pcl_settlement/PCLSettlementList";

const PCLSettlement = () => {
    return (
        <>
            <DocumentHead title='PCL Settlement' />
            <PCLSettlementList/>
        </>
    );
}

export default PCLSettlement;