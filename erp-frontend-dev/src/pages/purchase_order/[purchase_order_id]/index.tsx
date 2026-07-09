import DocumentHead from "@/components/DocumentHead";
import { useRouter } from "next/router";
import PurchaseOrderDetails from "@/views/purchase_order/PurchaseOrderDetails"

import React, {useState} from "react";
import PurchaseOrderPageTitle from "@/components/PurchaseOrder/POPageTitle";

const OrderSummaryPage = () => {
    const router = useRouter();
    const { purchase_order_id } = router.query;
    const title = 'Purchase Order Details';

    return (
        <>
            <DocumentHead title={title} />
            <PurchaseOrderPageTitle activeIndex={1}>{title}</PurchaseOrderPageTitle>
            <PurchaseOrderDetails purchaseOrderId={purchase_order_id} />
        </>
    );
}

export default OrderSummaryPage;
