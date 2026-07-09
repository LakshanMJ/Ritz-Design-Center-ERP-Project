import DocumentHead from "@/components/DocumentHead";
import RitzBreadcrumbs from "@/components/Ritz/RitzBreadcrumbs";
import OrderInquiryColorways from "@/views/costing/OrderInquiry/OrderInquiryColorways";
import {useRouter} from "next/router";


const OrderColorways = (props: {id: number}) => {
    const router = useRouter();
    const { id } = router.query;
    const title = 'Order Colorways';

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
            <OrderInquiryColorways orderId={id}/>
        </>
     );
}

export default OrderColorways;