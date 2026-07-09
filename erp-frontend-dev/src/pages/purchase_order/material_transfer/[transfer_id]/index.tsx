import DocumentHead from '@/components/DocumentHead';
import RitzBreadcrumbs from '@/components/Ritz/RitzBreadcrumbs';
import MaterialTransferDetails from '@/views/material_transfer/MaterialTransferDetails';
import { useRouter } from 'next/router';
import React from 'react'

const index = () => {

    const router = useRouter();
    const { transfer_id, } = router.query;
    const title = 'Material Transfer Details';
    const breadcrumbItems = [
        { label: 'Material Transfer Dashboard', url: '/purchase_order/material_transfer/' },
        { label: 'Material Transfer Details', url: `/purchase_order/material_transfer/${transfer_id}` },
    ]

    return (
        <>
            <DocumentHead title={title} />
            <RitzBreadcrumbs
                items={breadcrumbItems}
                title={title}
            />
            <MaterialTransferDetails tranferId={transfer_id} />
        </>
    )
}

export default index