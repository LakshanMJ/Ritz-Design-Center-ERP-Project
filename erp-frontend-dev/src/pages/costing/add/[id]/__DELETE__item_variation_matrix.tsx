import {useRouter} from "next/router";
import OrderItemVariation from "@/views/costing/OrderInquiry/OrderItemVariations";
import DocumentHead from "@/components/DocumentHead";
import RitzBreadcrumbs from "@/components/Ritz/RitzBreadcrumbs";

const VariationMatrix = () => {

    const router = useRouter();
    const { id } = router.query;
    const title = 'Variations Types';

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
            <OrderItemVariation orderId={id}/>
        </>
    );
}

export default VariationMatrix;