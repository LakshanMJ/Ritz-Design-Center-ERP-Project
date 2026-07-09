import DocumentHead from "@/components/DocumentHead";
import CommercialInvoiceList from "@/views/commercial_invoice/CommercialInvoiceList";
const CommercialInvoice = () => {
    return (
        <>
            <DocumentHead title='Commercial Invoices' />
            <CommercialInvoiceList/>
        </>
    );
}

export default CommercialInvoice;