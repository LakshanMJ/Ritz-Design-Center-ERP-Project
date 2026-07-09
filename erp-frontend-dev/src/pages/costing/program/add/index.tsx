import DocumentHead from '@/components/DocumentHead';
import RitzBreadcrumbs from '@/components/Ritz/RitzBreadcrumbs';
import OrderInquiryType from '@/views/costing/OrderInquiryType';

const OrderType = () => {
    return ( 
        <>
            <DocumentHead title='Order Type' />
            <RitzBreadcrumbs
                items={[
                    { label: 'Order Inquiries', url: '/costing' },
                    { label: 'Program' },
                ]}
                title='Order Type Details'
            />
            <OrderInquiryType />
        </>
     );
}

export default OrderType;