import DocumentHead from "@/components/DocumentHead";
import { useRouter } from "next/router";
import React, {useState} from "react";
import PurchaseOrderPageTitle from "@/components/PurchaseOrder/POPageTitle";
import PurchaseOrderUploadDetails from "@/views/purchase_order/PurchaseOrderUploadDetails";
import RitzBreadcrumbs from "@/components/Ritz/RitzBreadcrumbs";

const PoUploadDetail = () => {
    const router = useRouter();
    const { purchase_order_upload_id } = router.query;
    const title = 'Upload Purchase Order Details';

    return (
        <>
            <DocumentHead title={title} />
            <RitzBreadcrumbs
                items={[
                    { label: 'Purchase Order Clubing', url: '/purchase_order/po_upload_list' },
                    { label: 'PO Upload Details' },
                ]}
                title={title}
            />
            <PurchaseOrderUploadDetails purchaseOrderUploadId={purchase_order_upload_id} />
        </>
    );
}

export default PoUploadDetail;
