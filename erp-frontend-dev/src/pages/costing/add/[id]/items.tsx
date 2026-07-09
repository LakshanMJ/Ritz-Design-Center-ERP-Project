import {useRouter} from "next/router";
import OrderItemInformation from "@/views/costing/OrderInquiry/OrderItems";
import DocumentHead from "@/components/DocumentHead";
import RitzBreadcrumbs from "@/components/Ritz/RitzBreadcrumbs";


const OrderItems = (props: {id: number}) => {
    const router = useRouter();
    const { id } = router.query;
    const title = 'Order Items';

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
            <OrderItemInformation orderId={id}/>
        </>
     );
}

export default OrderItems;