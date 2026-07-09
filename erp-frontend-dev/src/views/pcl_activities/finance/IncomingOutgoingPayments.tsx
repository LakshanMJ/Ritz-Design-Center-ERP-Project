import React, { useEffect, useState } from 'react';
import {Link} from '@mui/material';
import DefaultLoader from '@/components/DefaultLoader';
import { ReactKeyHelper } from '@/helpers/KeyHelper';
import { useRouter } from 'next/router';
import RitzTable from '@/components/Ritz/RitzTable';
import { ColumnDef } from '@tanstack/react-table';
import RitzModal from '@/components/Ritz/RitzModal';
import CreateDeduction from './CreateDeduction';
import CreateOutgoingPayment from './CreateOutgoingPayment';
import NextLink from 'next/link';
import { outgoingPaymentDetailPageURL } from '@/helpers/constants/front_end/FinanceUrls';
import { formatAmount } from '@/helpers/Utilities';

const IncomingOutgoingPayments = ({ outgoingPaymentsData, incomingPaymentId, savedData }: any) => {

    const router = useRouter();
    const keyHelper = new ReactKeyHelper();
    const [isLoading, setIsLoading] = useState(false); 
    const [isOpenEditModal, setIsOpenEditModal] = useState<any>({modalStatus: false, selectedId: null});

    const outgoingPaymentColumns: ColumnDef<any>[] = [
        {
            accessorKey: 'display_number',
            header: 'Outgoing Payment No',
            cell: props => (
                <Link component={NextLink} target={'_blank'} href={outgoingPaymentDetailPageURL(props.row.original.id)}>{props.row.original.display_number}</Link>
            )
        },
        {
            accessorKey: 'amount',
            header: 'Amount (USD)',
            cell: props => (
                <>
                    {formatAmount(props.row.original.amount?.amount)}
                </>
            )
        },
        {
            accessorKey: 'payment_date',
            header: 'Payment Date',
        },
        {
            accessorKey: 'complete',
            header: 'Status',
            cell: ({ row }) => (row.original.complete ? 'Complete' : 'InComplete'),
        },
    ]

    const createModalOpen = (modalStatus: any, outgoingPaymentId: any ) => {
        setIsOpenEditModal({ modalStatus: modalStatus, selectedId: outgoingPaymentId })
    }

    const handleSavedData =()=>{
        setIsOpenEditModal({ modalStatus: false, selectedId: false })
        savedData()
    }

    return (
        <>
            {/* {isOpenEditModal?.modalStatus && (
                <RitzModal open={isOpenEditModal?.modalStatus} onClose={()=>{createModalOpen(false, null)}} title={"Create Outgoing Payment"}>
                    <CreateOutgoingPayment outgoingPaymentId={isOpenEditModal?.selectedId} incomingPaymentId={incomingPaymentId} handleSavedData={handleSavedData} />
                </RitzModal>
            )} */}
            {isLoading ? (
                <DefaultLoader />
            ) : (
                    <>
                        {/* <Button variant="outlined" onClick={() => { createModalOpen(true, null) }}  >Add Outgoing Payment</Button> */}
                        <RitzTable
                            data={outgoingPaymentsData}
                            columns={outgoingPaymentColumns}
                        />
                    </>
            )}
        </>
    );
};

export default IncomingOutgoingPayments;
