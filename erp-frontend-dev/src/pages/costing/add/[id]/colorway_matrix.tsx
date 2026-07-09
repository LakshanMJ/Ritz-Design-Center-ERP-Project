import {useRouter} from "next/router";
import OrderItemColorway from "@/views/costing/OrderInquiry/OrderItemColorway";
import DocumentHead from "@/components/DocumentHead";
import RitzBreadcrumbs from "@/components/Ritz/RitzBreadcrumbs";

const ColorwayMatrix = () => {

    const router = useRouter();
    const { id } = router.query;
    const title = 'Colorway Types';

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
            <OrderItemColorway orderId={id}/>
        </>
    );
}

export default ColorwayMatrix;