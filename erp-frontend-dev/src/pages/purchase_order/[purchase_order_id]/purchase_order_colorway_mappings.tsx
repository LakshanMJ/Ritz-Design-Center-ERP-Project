import DocumentHead from '@/components/DocumentHead'
import PurchaseOrderPageTitle from '@/components/PurchaseOrder/POPageTitle'
import POColorwayColorMapping from '@/views/purchase_order/POColorwayColorMapping';
import { useRouter } from 'next/router';
import React from 'react'

const PurchaseOrderColorwayMappings = () => {

    const router = useRouter();
    const { purchase_order_id } = router.query;
    const title = 'Colorway Category Mappings';

    return (
        <>
            <DocumentHead title={title} />
            <PurchaseOrderPageTitle activeIndex={8}>{title}</PurchaseOrderPageTitle>
            <POColorwayColorMapping purchaseOrderId={purchase_order_id} />
        </>
    )
}

export default PurchaseOrderColorwayMappings