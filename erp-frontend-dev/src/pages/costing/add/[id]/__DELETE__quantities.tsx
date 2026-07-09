import RitzBreadcrumbs from "@/components/Ritz/RitzBreadcrumbs";
import CostingQuantities from "@/views/costing/CostingQuantities";
import {useRouter} from "next/router";
const AddQuantities = () => {
    const router = useRouter();
    const { id } = router.query;
    return (
        <>
            <RitzBreadcrumbs
                items={[
                    { label: 'Order Inquiries', url: '/costing' },
                    { label: 'Order Details' },
                ]}
                title={'Order Pack Quantities'}
            />
            <CostingQuantities orderId={id}/>
        </>
     );
}

export default AddQuantities;