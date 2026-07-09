import React, { useEffect, useState } from 'react';
import { getDefaultError } from '@/helpers/Utilities';
import toast from 'react-hot-toast';
import DefaultLoader from '@/components/DefaultLoader';
import { ReactKeyHelper } from '@/helpers/KeyHelper';
import api from '@/services/api';
import { pclMatchingInvoiceListURL } from '@/helpers/constants/rest_urls/FinanceUrls';
import { Box, Button, Link} from '@mui/material';
import RitzTable from '@/components/Ritz/RitzTable';
import { ColumnDef } from '@tanstack/react-table';
import Checkbox from '@mui/material/Checkbox';
import NextLink from 'next/link';
import CircularLoader from '@/components/CircularLoader';

const PCLInvoiceList = ({ mainModalStatus, }: any) => {
    const keyHelper = new ReactKeyHelper();
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingCircularLoader, setIsLoadingCircularLoader] = useState(false);
    const [pclMatchingInvoiceList, setPclMatchingInvoiceList] = useState<any>([])
    const [currentPage, setCurrentPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(50);
    const [searchedText, setSearchedText] = useState('');
    const [checkedIds, setCheckedIds] = useState<any>([]);
    
    const handleCheckboxChange = (id: number, type: string) => {
        setCheckedIds((prev: any) => {
            const exists = prev.some((item: any) => item.id === id);
            if (exists) {
                return prev.filter((item: any) => item.id !== id);
            } else {
                return [...prev, { id, type }];
            }
        });
    };

    const fetchData = () => {
        const requests = [
            api.get(pclMatchingInvoiceListURL(currentPage + 1, rowsPerPage > 50 ? rowsPerPage : 50, searchedText)),

        ];
        Promise.all(requests).then(resp => {
            const respData = resp.map((r: any) => r.data);
            const [invoiceList] = respData;
            setPclMatchingInvoiceList([...invoiceList?.results])
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {setIsLoading(false), setIsLoadingCircularLoader(false)});
    }

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: 'id',
            header: ({ table }) => (
                <Checkbox
                    checked={table.getRowModel().rows.every((row) => 
                        checkedIds.some((item: any) => item.id === row.original.id)
                    )}
                    onChange={(e) => {
                        if (e.target.checked) {
                            setCheckedIds(
                                table.getRowModel().rows.map((row) => ({
                                    id: row.original.id,
                                    type: row.original.type
                                }))
                            );
                        } else {
                            setCheckedIds([]);
                        }
                    }}
                />
            ),
            cell: (props: any) => (
                <Checkbox
                    checked={checkedIds.some((item: any) => item.id === props.row.original.id)}
                    onChange={() => handleCheckboxChange(props.row.original.id, props.row.original.type)}
                />
            ),
            meta: {
                align: 'center',
                width: 35
            },
            enableSorting: false,
            enableColumnFilter: false,
            enableGlobalFilter: false,
        },
        {
            accessorKey: 'display_number',
            header: 'Invoice',

        },
        {
            accessorKey: 'costing_or_po_club',
            header: 'Costing / PO Club',

        },
        {
            accessorKey: 'customer_name',
            header: 'Customer',

        },
        {
            accessorKey: 'material',
            header: 'Material',
            cell(props) {
                return (
                    <>
                        {props?.row.original.material_types?.join(' / ')}
                    </>
                );
            },
        },
        {
            accessorKey: 'supplier_name',
            header: 'Supplier'
        },
        {
            accessorKey: 'payment_term',
            header: 'Payment Term',
        },
        {
            accessorKey: 'amount.amount',
            header: 'Amount',
            cell(props) {
                return (
                    <>
                        {props?.row.original.amount?.amount} {props?.row.original.amount?.amount_currency_display}
                    </>
                );
            },
        },
        {
            accessorKey: 'payment_due_date',
            header: 'Due Date',
            cell(props) {
                return (
                    <>
                        {props?.row.original.payment_due_date || '--'}
                    </>
                );
            },
        },
        {
            accessorKey: 'invoice.display_name',
            header: 'Document',
            cell(props) {
                return (
                    <>
                        <Link target="_blank" component={NextLink} href={props?.row.original.file_path?.file_path || '#'}>{props?.row.original.file_path?.display_name || '--'}</Link>
                    </>
                );
            },
        }
    ]

    const handlePoClubModal = (checkedIds: any) => {
        mainModalStatus(checkedIds)
    }
    const handleTableChange = (page: any) => {
        setCurrentPage(page);
    };
    const handleTableRowsChange = (rows: any) => {
        setRowsPerPage(rows);
    };
    const handleSerchChange = (text: any) => {
        setSearchedText(text);
    };

    useEffect(() => {
        if(searchedText){
         setIsLoadingCircularLoader(true)
        }
        fetchData()
    }, [currentPage, rowsPerPage, searchedText]);

    return (
        <>
            {isLoadingCircularLoader && (<CircularLoader />)}
            {isLoading ? (
                <DefaultLoader />
            ) : (
                <>
                    <Box>
                        {isLoading ? <DefaultLoader /> :
                            <RitzTable
                                data={pclMatchingInvoiceList}
                                columns={columns}
                                serverSideRendering={true}
                                onPageNumberChange={handleTableChange}
                                onPerPageCountChange={handleTableRowsChange}
                                onSearchTextChange={handleSerchChange}
                            />
                        }
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                        <Button variant="contained" color="primary" onClick={() => { handlePoClubModal(checkedIds) }} size="small" sx={{ mt: 1 }}>Next</Button>
                    </Box>

                </>
            )}
        </>
    );
};

export default PCLInvoiceList;
