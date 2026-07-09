import DocumentHead from "@/components/DocumentHead";
import OutgoingPayments from "@/views/pcl_activities/finance/OutgoingPayments";

const OutgoingPayment = () => {
    return (
        <>
            <DocumentHead title='Outgoing Payments' />
            <OutgoingPayments/>
        </>
    );
}

export default OutgoingPayment;