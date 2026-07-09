import { useRouter } from "next/router";
import OrderMaterials from "@/views/costing/OrderInquiry/Material/OrderMaterials";
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState } from "react";
import * as RestUrls from "@/helpers/constants/RestUrls";
import * as costingRestUrls from "@/helpers/constants/rest_urls/CostingUrls";
import {PENDING_SUPPLIER_SELECTION_VERSION_STATE} from "@/helpers/constants/CostingStates";
import OrderPackaging from "@/views/costing/OrderInquiry/OrderPack/OrderPackaging";

const Packaging = () => {
    const router = useRouter();

    // pack_item_id here is pack_id
    const { id, version_id, pack_item_id } = router.query;
    const assignedPlacementReducerStateValue = 'order_pack_materials';

    return (
        <>
            <OrderPackaging
                orderId={id}
                objectId={pack_item_id}
                versionId={version_id}
                materialType={'packaging'}
                materialsURLFunction={RestUrls.getOrderPackMaterialURL}
                materialListReducerState={assignedPlacementReducerStateValue}
                // materialSaveURLFunction={costingRestUrls.savePackPlacementMaterialURL}
                materialSupplierURLFunction={RestUrls.packMaterialSupplierInquiryURL}
                costingPhase={PENDING_SUPPLIER_SELECTION_VERSION_STATE}
            />
        </>
    );
}

export default Packaging;