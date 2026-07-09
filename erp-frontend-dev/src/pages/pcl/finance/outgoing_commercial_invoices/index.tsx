import DocumentHead from "@/components/DocumentHead";
import OutgoingCommercialInvoiceList from "@/views/pcl_activities/finance/OutgoingCommercialInvoiceList";

const OutgoingCommercialInvoices = () => {
    return (
        <>
            <DocumentHead title='Outgoing Commercial Invoices' />
            <OutgoingCommercialInvoiceList/>
        </>
    );
}

export default OutgoingCommercialInvoices;