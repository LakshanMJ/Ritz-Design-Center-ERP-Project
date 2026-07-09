import React from 'react';
import OrderColorwayCategory from "@/views/costing/OrderInquiry/OrderColorwayCategory";
import { useRouter } from 'next/router';
import DocumentHead from '@/components/DocumentHead';
import RitzBreadcrumbs from '@/components/Ritz/RitzBreadcrumbs';

const ColorwayCategories = () => {
    const router = useRouter();
    const { id } = router.query;
    const title = 'Colorway Categories';

    return (
        <>
            <DocumentHead title={title}/>
            <RitzBreadcrumbs
                items={[
                    { label: 'Order Inquiries', url: '/costing' },
                    { label: 'Order Details' },
                ]}
                title={title}
            />
            <OrderColorwayCategory orderId={id}/>
        </>
    );
};

export default ColorwayCategories;