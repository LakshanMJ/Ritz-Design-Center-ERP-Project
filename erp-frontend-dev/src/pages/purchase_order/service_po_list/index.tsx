import DocumentHead from '@/components/DocumentHead';
import ServicePOList from '@/views/purchase_order/ServicePOList';
import { useRouter } from 'next/router';
import React from 'react'

const ServicePO = () => {
    const router = useRouter();
    const title = 'Service POs';
    return (
      <>
        <DocumentHead title={title} />
        <ServicePOList />
    </>
    )
}

export default ServicePO;