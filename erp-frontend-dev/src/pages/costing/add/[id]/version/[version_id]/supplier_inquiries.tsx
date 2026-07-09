import InquiryView from '@/views/costing/SupplierInquiry/InquiryView';
import DocumentHead from '@/components/DocumentHead';
import { useRouter } from 'next/router';
import RitzBreadcrumbs from '@/components/Ritz/RitzBreadcrumbs';
import * as appUrls from '@/helpers/constants/FrontEndUrls';

const SupplierInquiry = () => {
    const router = useRouter();
    const { id, version_id } = router.query;

    return (
        <>
            <DocumentHead title='Supplier Order Inquiry' />

            <RitzBreadcrumbs
                items={[
                    { url: '/costing', label: 'Order Inquiries' },
                    { url: `${appUrls.orderSummaryVersionURL(+id, +version_id)}?tab=1`, label: 'Order Summary' },
                    { label: 'Supplier Order Inquiry' },
                ]}
                title='Supplier Order Inquiry'
            />
            
            <InquiryView orderId={id} versionId={version_id}/>
        </>
    );
};

export default SupplierInquiry;