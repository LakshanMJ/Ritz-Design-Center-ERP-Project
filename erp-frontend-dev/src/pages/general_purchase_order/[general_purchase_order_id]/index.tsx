import DocumentHead from "@/components/DocumentHead";
import { useRouter } from "next/router";
import PurchaseOrderDetails from "@/views/purchase_order/PurchaseOrderDetails"

import React, {useState} from "react";
import PurchaseOrderPageTitle from "@/components/PurchaseOrder/POPageTitle";
import GeneralPurchaseOrderDetails from "@/views/general_purchase_order/GeneralPurchaseOrderDetails";

const OrderSummaryPage = () => {
    const router = useRouter();
    const { general_purchase_order_id } = router.query;
    const title = ' General Purchase Order Details';

    return (
        <>
            <DocumentHead title={title} />
            <GeneralPurchaseOrderDetails generalPurchaseOrderId={general_purchase_order_id} />
        </>
    );
}

export default OrderSummaryPage;
