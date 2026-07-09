import React, { useEffect, useState } from 'react';
import { formatAmount, getDefaultError } from '@/helpers/Utilities';
import toast from 'react-hot-toast';
import {  Box, Button,IconButton,Link, Tooltip, Typography} from '@mui/material';
import DefaultLoader from '@/components/DefaultLoader';
import { ReactKeyHelper } from '@/helpers/KeyHelper';
import { useRouter } from 'next/router';
import RitzTable from '@/components/Ritz/RitzTable';
import { ColumnDef } from '@tanstack/react-table';
import RitzModal from '@/components/Ritz/RitzModal';
import CreateDeduction from './CreateDeduction';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import api from '@/services/api';
import { DEFAULT_SUCCESS } from '@/helpers/constants/Constants';
import { deleteIncommingPaymentDeductionURL } from '@/helpers/constants/rest_urls/FinanceUrls';

const IncomingDeductions = ({ incomingPaymentId , deductionData, savedData }: any) => {

    const router = useRouter();
    const keyHelper = new ReactKeyHelper();
    const [isLoading, setIsLoading] = useState(false); 
    const [isSaving, setIsSaving] = useState(false);
    const [isOpenModal, setIsOpenModal] = useState<any>({modalStatus: false, selectedId: null});

    const handleDeleteDeduction =(deductionId: any)=>{
        if (deductionId) {
            api.delete(deleteIncommingPaymentDeductionURL(deductionId)).then(resp => {
                toast.success(DEFAULT_SUCCESS);
                setIsOpenModal({ modalStatus: false, selectedId: null, type: null })
                savedData()
            }).catch(error => {
                toast.error(getDefaultError(error?.response?.status));
            }).finally(() => setIsSaving(false));
        }
    }

    const deductionsColumns: ColumnDef<any>[] = [
        {
            accessorKey: 'reason',
            header: 'Reason',
            cell: props => (
                <Link
                    component={'button'}
                    onClick={() => createModalOpen(true, props.row.original.id, 'deduction')}
                >
                 {props.row.original.reason}
                </Link>
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
            accessorKey: 'currency',
            header: 'Currency',
            cell: props => (
                <>
                    {props.row.original.amount?.amount_currency_display}
                </>
            )
        },
        {
            accessorKey: '',
            header: 'Action',
            cell: (props) => {
                return (
                    <>
                    <Tooltip title={"Delete Deduction"}>
                        <IconButton size='small' color='error' onClick={() => { createModalOpen(true, props.row.original.id, 'delete') }}>
                            <DeleteForeverIcon fontSize='inherit' />
                        </IconButton>
                    </Tooltip>
                    </>
                )
            },
            meta: {
                align: 'center',
                width: 100
            }
        },
    ]

    const createModalOpen = (modalStatus: any, editId: any, modalType: any ) => {
        setIsOpenModal({ modalStatus: modalStatus, selectedId: editId, type: modalType  })
    }

    const handleSavedData =()=>{
        setIsOpenModal({ modalStatus: false, selectedId: null, type: null })
        savedData()
    }

    return (
        <>
            {(isOpenModal?.modalStatus && isOpenModal?.type == 'delete') && (
                <RitzModal
                    open={isOpenModal?.modalStatus}
                    onClose={() => { createModalOpen(false, null, null) }}
                    maxWidth='xs'
                    title='Confirm Delete'
                >
                    <>
                        <Box>
                            <Typography>Are you sure you want to delete this ?</Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'end', mt: 3 }}>
                                <Button variant='contained' onClick={() => { handleDeleteDeduction(isOpenModal?.selectedId) }} color='error'>Delete</Button>
                            </Box>
                        </Box>
                    </>
                </RitzModal>
            )}
            {(isOpenModal?.modalStatus && isOpenModal?.type == 'deduction') && (
                <RitzModal open={isOpenModal?.modalStatus} onClose={() => { createModalOpen(false, null, null) }} title={"Create Deduction"}>
                    <CreateDeduction deductionId={isOpenModal?.selectedId} incomingPaymentId={incomingPaymentId} handleSavedData={handleSavedData} />
                </RitzModal>
            )}
            {isLoading ? (
                <DefaultLoader />
            ) : (
                    <>
                        <Button variant="outlined" onClick={() => { createModalOpen(true, null, 'deduction') }}  >Add Deduction</Button>
                        <RitzTable
                            data={deductionData}
                            columns={deductionsColumns}
                        />
                    </>
            )}
        </>
    );
};

export default IncomingDeductions;
