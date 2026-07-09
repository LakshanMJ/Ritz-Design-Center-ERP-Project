import DocumentHead from '@/components/DocumentHead';
import RitzBreadcrumbs from '@/components/Ritz/RitzBreadcrumbs';
import OrderInquiryType from '@/views/costing/OrderInquiryType';
import router from 'next/router';

const OrderType = () => {
    const orderProgrameId =  router.query.order_program_id
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
            <OrderInquiryType programeID={orderProgrameId}/>
        </>
     );
}

export default OrderType;