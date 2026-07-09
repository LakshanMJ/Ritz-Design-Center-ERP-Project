import DocumentHead from '@/components/DocumentHead';
import MaterialTransferDashboard from '@/views/material_transfer/MaterialTransferDashboard';
import { useRouter } from 'next/router';
import React from 'react'

const MaterialTransfer = () => {
    const router = useRouter();
    const title = 'Material Transfer Dashboard';
    return (
        <>
            <DocumentHead title={title} />
            <MaterialTransferDashboard/>
        </>
    )
}

export default MaterialTransfer