import DocumentHead from "@/components/DocumentHead";
import PendingPOClubList from "@/views/pcl_activities/pending_pcl_po_club/PendingPOClubList";

const PendingPCLPoClubs = () => {
    return (
        <>
            <DocumentHead title='Pending PCL PO Clubs' />
            <PendingPOClubList/>
        </>
    );
}

export default PendingPCLPoClubs;