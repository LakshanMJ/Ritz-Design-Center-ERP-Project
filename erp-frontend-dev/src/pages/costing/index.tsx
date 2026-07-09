import OrderInquiryList from "@/views/costing/OrderInquiryList";
import DocumentHead from "@/components/DocumentHead";


const OrderInquiryListPage = () => {
    return (
        <>
            <DocumentHead title='Order Inquiries' />
            <OrderInquiryList/>
        </>
    );
}

export default OrderInquiryListPage;