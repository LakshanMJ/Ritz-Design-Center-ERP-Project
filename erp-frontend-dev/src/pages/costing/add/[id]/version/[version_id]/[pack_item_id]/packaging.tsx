import { useRouter } from "next/router";
import * as RestUrls from "@/helpers/constants/RestUrls";
import * as costingRestUrls from "@/helpers/constants/rest_urls/CostingUrls";
import DocumentHead from "@/components/DocumentHead";
import OrderPackaging from "@/views/costing/OrderInquiry/OrderPack/OrderPackaging";

const Packaging = () => {
    const router = useRouter();

    const { id, version_id, pack_item_id } = router.query;
    const assignedPlacementReducerStateValue = 'order_pack_materials';

    return (
        <>
            <DocumentHead title='Assign Materials' />
            <OrderPackaging
                orderId={id}
                objectId={pack_item_id}
                versionId={version_id}
                materialType={'packaging'}
                materialsURLFunction={RestUrls.getOrderPackMaterialURL}
                materialListReducerState={assignedPlacementReducerStateValue}
                // materialSaveURLFunction={costingRestUrls.savePackPlacementMaterialURL}
            />
        </>
    );
}

export default Packaging;