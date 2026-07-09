import DocumentHead from "@/components/DocumentHead";
import PCLDetails from "@/views/pcl_activities/finance/PCLDetails";

const FinanceDashBoard = () => {
    return (
        <>
            <DocumentHead title='Finance DashBoard' />
            {/* <FinanceDashboard/> */}
            <PCLDetails/>
        </>
    );
}

export default FinanceDashBoard;