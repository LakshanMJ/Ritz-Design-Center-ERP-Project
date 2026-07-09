import {useRouter} from "next/router";
import OrderMaterials from "@/views/costing/OrderInquiry/Material/OrderMaterials";
import {useState} from "react";
import * as RestUrls from "@/helpers/constants/RestUrls";
import * as costingUrls from "@/helpers/constants/rest_urls/CostingUrls";
import {PENDING_SUPPLIER_SELECTION_VERSION_STATE} from "@/helpers/constants/CostingStates";

const SelectSuppliers = () => {
    const assignedPlacementReducerStateValue = 'order_pack_item_materials';
    const router = useRouter();
    const { id, version_id, pack_item_id} = router.query;
    const [ materialTitle, setMaterialTitle ] = useState<any>({});

    return (
        <>
            <OrderMaterials
                orderId={id}
                objectId={pack_item_id}
                versionId={version_id}
                editObjectDetails={materialTitle}
                materialType={'material'}
                materialListReducerState={assignedPlacementReducerStateValue}
                materialsURLFunction={RestUrls.getOrderPackItemMaterialURL}
                // materialSaveURLFunction={costingUrls.savePackItemPlacementMaterialURL}
                materialSupplierURLFunction={RestUrls.packItemMaterialSupplierInquiryURL}
                costingPhase={PENDING_SUPPLIER_SELECTION_VERSION_STATE}
            />
        </>
     );
}

export default SelectSuppliers;