import React, { useEffect, useState } from 'react';
import {Link} from '@mui/material';
import DefaultLoader from '@/components/DefaultLoader';
import { ReactKeyHelper } from '@/helpers/KeyHelper';
import { useRouter } from 'next/router';
import RitzTable from '@/components/Ritz/RitzTable';
import { ColumnDef } from '@tanstack/react-table';
import NextLink from 'next/link';
import { purchaseOrderDetailPageURL } from '@/helpers/constants/FrontEndUrls';
import { formatAmount } from '@/helpers/Utilities';

const IncomingReceivings = ({ receivingsData }: any) => {

    const router = useRouter();
    const keyHelper = new ReactKeyHelper();
    const [isLoading, setIsLoading] = useState(false); 
    const [receivingsDetails, setDeductionDetails] = useState<any>([...receivingsData])
    const [isOpenEditModal, setIsOpenEditModal] = useState<any>({modalStatus: false, selectedId: null});

    const redeivingColumns: ColumnDef<any>[] = [
        {
            accessorKey: 'reason',
            header: 'Purchase Order',
            cell: props => (
                <Link component={NextLink} target={'_blank'} href={purchaseOrderDetailPageURL(props.row.original.purchase_order_id)}>{props.row.original.purchase_order}</Link>
            )
        },
        {
            accessorKey: 'reason',
            header: 'Shipment',
            cell: props => (
                <>
                    {props.row.original.display_number}
                </>
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
            accessorKey: 'delivery_date',
            header: 'Plan Date',
        },
        {
            accessorKey: 'due_date',
            header: 'Due Date',
        },
    ]

    return (
        <>
            {isLoading ? (
                <DefaultLoader />
            ) : (
                    <>
                        <RitzTable
                            data={receivingsDetails}
                            columns={redeivingColumns}
                        />
                    </>
            )}
        </>
    );
};

export default IncomingReceivings;
