import DocumentHead from "@/components/DocumentHead";
import IncomingPayments from "@/views/pcl_activities/finance/IncomingPayments";

const IncomingPayment = () => {
    return (
        <>
            <DocumentHead title='IncomingPayments' />
            <IncomingPayments/>
        </>
    );
}

export default IncomingPayment;