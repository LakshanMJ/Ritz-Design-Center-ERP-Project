import React, { useEffect, useRef, useState } from 'react';
import { formatAmount, getDefaultError } from '@/helpers/Utilities';
import toast from 'react-hot-toast';
import { Box, Button, IconButton, Link, Typography } from '@mui/material';
import DefaultLoader from '@/components/DefaultLoader';
import { ReactKeyHelper } from '@/helpers/KeyHelper';
import api from '@/services/api';
import { outgoingPaymentsListURL } from '@/helpers/constants/rest_urls/FinanceUrls';
import RitzTable from '@/components/Ritz/RitzTable';
import { ColumnDef } from '@tanstack/react-table';
import NextLink from 'next/link';
import { outgoingPaymentDetailPageURL } from '@/helpers/constants/front_end/FinanceUrls';
import RitzModal from '@/components/Ritz/RitzModal';
import CreateOutgoingPayment from './CreateOutgoingPayment';
import EditIcon from '@mui/icons-material/Edit';
import PCLPOClubList from './PCLPOClubList';
import PCLInvoiceList from './PCLInvoiceList';

const OutgoingPayments = () => {
    const keyHelper = new ReactKeyHelper();
    const [isLoading, setIsLoading] = useState(true);
    const [outgoingPayments, setOutgoingPayments] = useState<any>({})
    const [isOpenInvoiceSelectionModal, setIsOpenInvoiceSelectionModal] = useState<any>({});
    const [isOpenPOSelectionModal, setIsOpenPOSelectionModal] = useState<any>({});
    const [isOpenCreateModal, setIsOpenCreateModal] = useState<any>({});
    const [selectedInvoicePOClubIds, setSelectedInvoicePOClubIds] = useState<any>({ selected_invoices_or_spos: [], selected_po_clubs: [] });
    //table states
    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(50);
    const [totalCount, setTotalCount] = useState(0);
    const [sorting, setSorting] = useState({});
    const [globalFilter, setGlobalFilter] = useState('');
    const [columnFilters, setColumnFilters] = useState({});
    const [isTableLoading, setIsTableLoading] = useState(false);
    const tableRef = useRef(null);

    const fetchData = ({
        pageIndex: paramPageIndex,
        pageSize: paramPageSize,
        globalFilter: paramGlobalFilter,
        columnFilters: paramColumnFilters,
        sorting: paramSorting,
    }: {
        pageIndex?: number,
        pageSize?: number,
        globalFilter?: string,
        columnFilters?: Object,
        sorting?: { column: string, direction: string | boolean },
    } = {}) => {
        setIsTableLoading(true)
        const pageIndexValue = paramPageIndex !== undefined ? paramPageIndex : pageIndex;
        const pageSizeValue = paramPageSize !== undefined ? paramPageSize : pageSize;
        const globalFilterValue = paramGlobalFilter !== undefined ? paramGlobalFilter : globalFilter;
        const columnFiltersValue = paramColumnFilters !== undefined ? paramColumnFilters : columnFilters;
        const sortingValue = paramSorting !== undefined ? paramSorting : sorting;

        const queryParams = getQueryParams(globalFilterValue, columnFiltersValue, sortingValue);
        const requests = [
            api.get(outgoingPaymentsListURL(pageIndexValue + 1, pageSizeValue, queryParams)),
        ];
        Promise.all(requests).then(resp => {
            const respData = resp.map((r: any) => r.data);
            const [outgoingPayments] = respData;
            setOutgoingPayments({ ...outgoingPayments })
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => { setIsLoading(false), setIsTableLoading(false) });
    }

    const getQueryParams = (globalFilter: any, columnFilters: any, sortingValue: any): string => {
        const params: any = {};
        if (globalFilter ) {
          params['global_filter'] = globalFilter;
        }
    
        if (Object.keys(columnFilters)?.length) {
          Object.keys(columnFilters).forEach(key => {
            if (columnFilters[key]) {
              params[key] = columnFilters[key];
            }
          });
        }
    
        if (sortingValue['column'] && sortingValue['direction']) {
          params['sort_col'] = sortingValue['column'];
          params['sort_dir'] = sortingValue['direction'];
        }
    
        if (Object.keys(params)?.length) {
          return new URLSearchParams(params).toString();
        }
    
        return '';
    }

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: 'id',
            header: 'Outgoing Payment No',
            cell: props => (
                <Link component={NextLink} href={outgoingPaymentDetailPageURL(props.row.original.id)}>{props.row.original.display_number}</Link>
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
        {
            accessorKey: 'complete',
            header: 'Action',
            cell: props => (
                <>
                    <IconButton size='small' onClick={() => createModalOpen(true, props.row.original.id)} color='primary' >
                        <EditIcon fontSize='inherit'  />
                    </IconButton>
                </>
            ),
            meta: {
                align: 'center',
                width: 100
            }
        }
        ,
    ]
    
    const handlePageNumberChange = (pageIndex: number) => {
        setPageIndex(pageIndex);
        fetchData({ pageIndex: pageIndex });
    }
      
    const handlePageSizeChange = (pageSize: number) => {
        setPageIndex(0);
        setPageSize(pageSize);
        fetchData({ pageIndex: 0, pageSize: pageSize });
    }
    
    const handleTableSearch = (search: string) => {
        setPageIndex(0);
        tableRef.current.setPageIndex(0);
        setGlobalFilter(search?.trim());
        fetchData({ pageIndex: 0, globalFilter: search?.trim() });
    }
    
    const handleTableFilterSearch = (filters: any) => {
        setPageIndex(0);
        tableRef.current.setPageIndex(0);
        setColumnFilters(filters);
        fetchData({ columnFilters: filters });
    }
    
    const handleSortingChange = (sorting: any) => {
        setPageIndex(0);
        tableRef.current.setPageIndex(0);
        setSorting(sorting);
        fetchData({ sorting: sorting });
    }

    const createModalOpen = (modalStatus: any, selectedId: any) => {
        setIsOpenCreateModal({ modalStatus: modalStatus, selectedId: selectedId })
    }

    const handleInvoicebModal = (modalStatus: any) => {
        setIsOpenInvoiceSelectionModal({ modalStatus: modalStatus })
        setSelectedInvoicePOClubIds({ selected_invoices_or_spos: [], selected_po_clubs: [] })
    }

    const handleInvoiceMainModal = (selectedIds: any) => {
        setIsOpenInvoiceSelectionModal({ modalStatus: false });
        setIsOpenPOSelectionModal({ modalStatus: true });
        setSelectedInvoicePOClubIds((prev: any) => ({
            ...prev,
            selected_invoices_or_spos: selectedIds,
        }));
    };

    const handlePoClubMainModal = (selectedIds: any) => {
        setIsOpenPOSelectionModal({ modalStatus: false });
        setSelectedInvoicePOClubIds((prev: any) => ({
            ...prev,
            selected_po_clubs: selectedIds,
        }));
        createModalOpen(true, null);
    };

    useEffect(() => {
        fetchData()
    }, []);

    return (
        <>
            {isOpenCreateModal?.modalStatus && (
                <RitzModal open={isOpenCreateModal?.modalStatus} maxWidth='xl' onClose={() => { createModalOpen(false, null), setSelectedInvoicePOClubIds({ selected_invoices_or_spos: [], selected_po_clubs: [] }) }} title={"Create Outgoing Payment"}>
                    <CreateOutgoingPayment
                        outgoingPaymentId={isOpenCreateModal?.selectedId}
                        handleSavedData={() => { fetchData() , createModalOpen(false, null) }} />
                </RitzModal>
            )}
            {isOpenInvoiceSelectionModal?.modalStatus && (
                <RitzModal
                    open={isOpenInvoiceSelectionModal?.modalStatus}
                    onClose={() => { handleInvoicebModal(false) }}
                    title={"Select the Settlement Invoices"}
                    maxWidth='xl'
                >
                    <PCLInvoiceList mainModalStatus={handleInvoiceMainModal} />
                </RitzModal>
            )}
            {isOpenPOSelectionModal?.modalStatus && (
                <RitzModal
                    open={isOpenPOSelectionModal?.modalStatus}
                    onClose={() => { setIsOpenPOSelectionModal({ modalStatus: false }); setSelectedInvoicePOClubIds({ selected_invoices_or_spos: [], selected_po_clubs: [] }) }}
                    title={"Select the Settlement PO Clubs"}
                    maxWidth='xl'
                >
                    <PCLPOClubList mainModalStatus={handlePoClubMainModal} />
                </RitzModal>
            )}
            {isLoading ? (
                <DefaultLoader />
            ) : (
                <>
                    <Box>
                        <Typography variant='h1' color='text.primary' sx={{ mt: 2 }}>Outgoing Payments</Typography>
                    </Box>
                    <Box>
                        <Button variant="contained" onClick={() => { createModalOpen(true, null) }} >Add Outgoing Payment</Button>
                        {/* <Button variant="contained" sx={{ ml: 1 }} onClick={() => { handleInvoicebModal(true) }} >Settle Invoices</Button> */}
                        <RitzTable
                            data={outgoingPayments?.results}
                            columns={columns}
                            tableRef={tableRef}
                            serverSideRendering={true}
                            totalCount={totalCount}
                            onPageNumberChange={handlePageNumberChange}
                            onPerPageCountChange={handlePageSizeChange}
                            onSearchTextChange={handleTableSearch}
                            onFilterSearch={handleTableFilterSearch}
                            onSortingChange={handleSortingChange}
                            isLoading={isTableLoading}
                        />
                    </Box>
                </>
            )}
        </>
    );
};

export default OutgoingPayments;
