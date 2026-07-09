import DocumentHead from '@/components/DocumentHead'
import ConsolidatedTransportDetails from '@/views/transport/VesselCutOffDates'
import React from 'react'

const ConsolidatedTransport = () => {
    return (
        <>
            <DocumentHead title='Vessel Cut Off Dates' />
            <ConsolidatedTransportDetails />
        </>
    )
}

export default ConsolidatedTransport