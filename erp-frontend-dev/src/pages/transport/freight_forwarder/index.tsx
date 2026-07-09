import DocumentHead from '@/components/DocumentHead'
import FreightForwarderView from '@/views/transport/freightforwarder'
import React from 'react'

const FreightForwarderPage = () => {
    return (
        <>
            <DocumentHead title='Freight Forwarder Management' />
            <FreightForwarderView />
        </>
    )
}

export default FreightForwarderPage;
