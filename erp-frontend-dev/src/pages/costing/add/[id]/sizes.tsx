import {useRouter} from "next/router";
import OrderSizes from "@/views/costing/OrderInquiry/OrderSizes";
import DocumentHead from "@/components/DocumentHead";
import RitzBreadcrumbs from "@/components/Ritz/RitzBreadcrumbs";


const Sizes = () => {
    const router = useRouter();
    const costingID = router.query.id;
    const title = 'Order Size Information';

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
            <OrderSizes orderId={costingID}/>
        </>
    );
}

export default Sizes;