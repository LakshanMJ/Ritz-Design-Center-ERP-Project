import DocumentHead from "@/components/DocumentHead";
import RitzBreadcrumbs from "@/components/Ritz/RitzBreadcrumbs";
import OrderSummary from "@/views/costing/OrderSummary";
import {useRouter} from "next/router";

const OrderSummaryPage = () => {
    const router = useRouter();
    const { id } = router.query;
    const title = 'Order Summary';

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
            <OrderSummary orderId={id}/>
        </>
     );
}

export default OrderSummaryPage;
