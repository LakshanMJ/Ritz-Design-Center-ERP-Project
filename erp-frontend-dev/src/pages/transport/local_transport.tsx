import DocumentHead from '@/components/DocumentHead'
import LocalTransportDetails from '@/views/transport/LocalTransport'
import React from 'react'

const LocalTransport = () => {
    return (
        <>
            <DocumentHead title='Local Transport' />
            <LocalTransportDetails />
        </>
    )
}

export default LocalTransport