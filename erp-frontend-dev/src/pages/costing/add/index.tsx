import DocumentHead from '@/components/DocumentHead';
import RitzBreadcrumbs from '@/components/Ritz/RitzBreadcrumbs';
import OrderInquiryGeneralInfoForm from '@/views/costing/OrderInquiryGeneralInfoForm';

const IndexPage = () => {
    return ( 
        <>
            <DocumentHead title='Create Order Inquiry' />
            <RitzBreadcrumbs
                items={[
                    { label: 'Order Inquiries', url: '/costing' },
                    { label: 'Order Details' },
                ]}
                title='Order General Information'
            />
            <OrderInquiryGeneralInfoForm />
        </>
     );
}

export default IndexPage;