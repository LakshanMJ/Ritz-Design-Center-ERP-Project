import DocumentHead from "@/components/DocumentHead";
import PCLDueCalender from "@/views/pcl_activities/pcl_settlement/PCLDueCalender";
import PCLSettlementList from "@/views/pcl_activities/pcl_settlement/PCLSettlementList";

const PCLDueCalendar = () => {
    return (
        <>
            <DocumentHead title='PCL Due Calendar' />
            <PCLDueCalender/>
        </>
    );
}

export default PCLDueCalendar;