import DocumentHead from "@/components/DocumentHead";
import PCLFacilityList from "@/views/pcl_activities/pcl_facility/PCLFacilityList";

const PCLFacility = () => {
    return (
        <>
            <DocumentHead title='PCL Facility DashBoard' />
            <PCLFacilityList/>
        </>
    );
}

export default PCLFacility;