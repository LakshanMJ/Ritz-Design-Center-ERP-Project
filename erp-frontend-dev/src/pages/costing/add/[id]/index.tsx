import {useRouter} from "next/router";
import OrderInquiryGeneralInfoForm from "@/views/costing/OrderInquiryGeneralInfoForm";
import DocumentHead from "@/components/DocumentHead";
import RitzBreadcrumbs from "@/components/Ritz/RitzBreadcrumbs";

const EditPage = () => {

    const router = useRouter();
    const { id } = router.query;
    const title = 'Order General Information';

    return (
        <>
            <DocumentHead title={title}/>
            <RitzBreadcrumbs
                items={[
                    { label: 'Order Inquiries', url: '/costing' },
                    { label: 'Order Details' },
                ]}
                title={title}
            />
            <OrderInquiryGeneralInfoForm orderId={id} />
        </>
     );
}

export default EditPage;