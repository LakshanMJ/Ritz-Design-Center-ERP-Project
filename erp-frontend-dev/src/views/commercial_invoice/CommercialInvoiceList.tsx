import React, { useEffect, useRef, useState } from 'react';
import { formatAmount, getDefaultError } from '@/helpers/Utilities';
import toast from 'react-hot-toast';
import { Box, Button, Link, Typography } from '@mui/material';
import DefaultLoader from '@/components/DefaultLoader';
import { ReactKeyHelper } from '@/helpers/KeyHelper';
import api from '@/services/api';
import { supplierCommercialInvoiceListUrl} from '@/helpers/constants/rest_urls/FinanceUrls';
import RitzTable from '@/components/Ritz/RitzTable';
import { ColumnDef } from '@tanstack/react-table';
import NextLink from 'next/link';
import { commercialInvoiceSummaryPageURL } from '@/helpers/constants/front_end/FinanceUrls';

const CommercialInvoiceList = () => {
    const keyHelper = new ReactKeyHelper();
    const [isLoading, setIsLoading] = useState(true);
    const [outgoingCommercialInvoiceDetails, setOutgoingCommercialInvoiceDetails] = useState<any>({})
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
            api.get(supplierCommercialInvoiceListUrl(pageIndexValue + 1, pageSizeValue, queryParams)),
        ];
        Promise.all(requests).then(resp => {
            const respData = resp.map((r: any) => r.data);
            const [outgoingPayments] = respData;
            setOutgoingCommercialInvoiceDetails({...outgoingPayments})
            setTotalCount(outgoingPayments?.count)
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
            header: 'Ritz Invoice No',
            cell: props => (
                <Link component={NextLink} href={commercialInvoiceSummaryPageURL(props.row.original.id)}>{props.row.original.display_number}</Link>
            )
        },
        {
            accessorKey: 'supplier_invoice_number',
            header: 'Supplier Invoice No',
            cell: props => (
                <>
                    {props?.row.original.supplier_invoice_number}
                </>
            )
        },
        {
            accessorKey: 'supplier_name',
            header: 'Supplier',
            cell: props => (
                <>
                    {props?.row.original.supplier_name}
                </>
            )
        },
        {
            accessorKey: 'get_ci_state_display',
            header: 'State',
        },
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

    useEffect(() => {
        fetchData()
    }, []);

    return (
        <>
            {isLoading ? (
                <DefaultLoader />
            ) : (
                <>
                    <Box>
                        <Typography variant='h1' color='text.primary' sx={{ mt: 2 }}>Commercial Invoices</Typography>
                    </Box>
                    <Box>
                        <RitzTable
                            data={outgoingCommercialInvoiceDetails?.results}
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

export default CommercialInvoiceList;
