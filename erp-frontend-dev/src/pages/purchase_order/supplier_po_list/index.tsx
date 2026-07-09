import DocumentHead from '@/components/DocumentHead';
import SupplierPOList from '@/views/purchase_order/SupplierPOList'
import { useRouter } from 'next/router';
import React from 'react'

const SupplierPO = () => {
    const router = useRouter();
    const title = 'Supplier POs';
    return (
      <>
        <DocumentHead title={title} />
        <SupplierPOList />
    </>
    )
}

export default SupplierPO;