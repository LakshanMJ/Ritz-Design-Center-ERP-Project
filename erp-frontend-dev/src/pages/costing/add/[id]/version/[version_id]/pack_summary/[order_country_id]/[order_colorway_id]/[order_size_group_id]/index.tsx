import { useRouter } from "next/router";
import OrderMaterials from "@/views/costing/OrderInquiry/Material/OrderMaterials";
import * as RestUrls from "@/helpers/constants/RestUrls";
import * as costingRestUrls from "@/helpers/constants/rest_urls/CostingUrls";
import DocumentHead from "@/components/DocumentHead";
import SizeGroupPackMaterials from "@/views/costing/OrderInquiry/GroupedCosting/GroupedOrderMaterials";

const Packaging = () => {
    const router = useRouter();

    const { id, version_id, order_country_id, order_colorway_id, order_size_group_id } = router.query;

    return (
        <>
            <DocumentHead title='Pack Summary' />
           <SizeGroupPackMaterials
               versionId={version_id}
               orderId={id}
               orderColorwayId={order_colorway_id}
               orderCountryId={order_country_id}
               orderSizeGroupId={order_size_group_id} />
        </>
    );
}

export default Packaging;