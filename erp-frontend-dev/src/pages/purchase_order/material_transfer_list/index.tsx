import DocumentHead from '@/components/DocumentHead';
import MaterialTransferList from '@/views/material_transfer/MaterialTransferList';
import { useRouter } from 'next/router';
import React from 'react'

const MaterialTransfers = () => {
    const router = useRouter();
    const title = 'Material Transfer List';
    return (
        <>
            <DocumentHead title={title} />
            <MaterialTransferList/>
        </>
    )
}

export default MaterialTransfers