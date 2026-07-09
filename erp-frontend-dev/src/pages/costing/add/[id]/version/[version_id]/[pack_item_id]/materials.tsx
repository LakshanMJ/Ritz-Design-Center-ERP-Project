import {useRouter} from "next/router";
import OrderMaterials from "@/views/costing/OrderInquiry/Material/OrderMaterials";
import * as RestUrls from "@/helpers/constants/RestUrls";
import * as costingUrls from "@/helpers/constants/rest_urls/CostingUrls";
import DocumentHead from "@/components/DocumentHead";

const Materials = () => {
    const assignedPlacementReducerStateValue = 'order_pack_item_materials';
    const router = useRouter();
    const { id, version_id, pack_item_id} = router.query;

    return (
        <>
            <DocumentHead title='Assign Materials' />
            <OrderMaterials
                orderId={id}
                objectId={pack_item_id}
                versionId={version_id}
                materialType={'material'}
                materialListReducerState={assignedPlacementReducerStateValue}
                materialsURLFunction={RestUrls.getOrderPackItemMaterialURL}
                // materialSaveURLFunction={costingUrls.savePackItemPlacementMaterialURL}
            ></OrderMaterials>
        </>
     );
}

export default Materials;