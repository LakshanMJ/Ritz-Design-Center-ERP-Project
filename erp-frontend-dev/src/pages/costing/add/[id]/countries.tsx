import {useRouter} from "next/router";
import OrderCountries from "@/views/costing/OrderInquiry/OrderCountries"
import DocumentHead from "@/components/DocumentHead";
import RitzBreadcrumbs from "@/components/Ritz/RitzBreadcrumbs";

const DetailsPage = () => {

    const router = useRouter();
    const { id } = router.query;
    const title = 'Order Countries';

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
            <OrderCountries orderId={id}/>
        </>
     );
}

export default DetailsPage;