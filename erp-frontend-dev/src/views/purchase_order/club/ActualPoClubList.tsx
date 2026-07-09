import { getDefaultError } from '@/helpers/Utilities';
import api from '@/services/api';
import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import * as poUrls from "@/helpers/constants/rest_urls/POUrls";
import DefaultLoader from '@/components/DefaultLoader';
import RitzTable from '@/components/Ritz/RitzTable';
import { ColumnDef } from '@tanstack/react-table';
import { IconButton, Link, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { ACTIVE_STATUS, CLOSE_STATUS, INACTIVE_STATUS, OPEN_STATUS } from '@/helpers/constants/Constants';
import { useRouter } from 'next/router';
import { purchaseOrderClubDetailsPageURL } from '@/helpers/constants/front_end/POUrls';
import NextLink from 'next/link';
import { orderSummaryPageURL, purchaseOrderDetailPageURL } from '@/helpers/constants/FrontEndUrls';

const ActualPoClubList = () => {
    const router = useRouter();

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: 'id',
            header: 'PO Club Number',
            cell: (props) => {   
                const displayValue = props.row?.original?.short_code || '--';
                return <Link component={NextLink} href={purchaseOrderClubDetailsPageURL(props.row.original.id)}>{displayValue}</Link>;
            },
        },
        {
            accessorKey: 'purchaseorder',
            header: 'Purchase Order(s)',
            enableSorting: false,
            cell: (props) => {   
                const displayValue = props.row.original.purchaseorder_set || '--';
                const poNames = displayValue.map((po:any) => (
                    <Link
                        key={po.id}
                        href={purchaseOrderDetailPageURL(po.id)}
                        onClick={(event) => {
                            event.preventDefault(); 
                            window.open(purchaseOrderDetailPageURL(po.id), '_blank'); 
                        }}
                    >
                        {po.display_number}
                    </Link>
                ));
                const joinedNames = poNames.reduce((prev:any, curr:any, index:any) => (
                    index === 0 ? [curr] : [...prev, ', ', <br key={index} />, curr]
                ), []);
            
                return <Typography>{joinedNames}</Typography>;
            },
        },
        {
            accessorKey: 'marketing_costing_id',
            header: 'Marketing Costing',
            cell: (props) => {   
                const displayValue = props.row?.original?.marketing_costing_display_number || '--';
                return <Link component={NextLink} href={orderSummaryPageURL(props.row?.original?.marketing_costing_order, props.row?.original?.marketing_costing)}>{displayValue}</Link>;
            },
        },
        {
            accessorKey: 'pre_costing_id',
            header: 'Pre Costing',
            cell: (props) => {   
                const displayValue = props.row?.original?.pre_costing_long_code || '--';
                return <Link component={NextLink} href={orderSummaryPageURL(props.row?.original?.pre_costing_order, props.row?.original?.pre_costing)}>{displayValue}</Link>;
            },
        },
        {
            accessorKey: 'uploaded_purchase_order',
            header: 'Uploaded Purchase Order',
            enableSorting: false,
            cell: (props) => {
                const handleDownload = (filePath: string, fileName: string) => {
                    if (!filePath) {
                        toast.error("The file cannot be located or is invalid.");
                        return;
                    }
                    const link = document.createElement('a');
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                    link.href = filePath;
                    link.download = fileName;
                    link.click();
                };

                const { purchaseorder_set } = props.row.original;
                if (!purchaseorder_set || purchaseorder_set.length === 0) {
                    return null; 
                }
                const firstPurchaseOrder = purchaseorder_set[0];
                const file_path = firstPurchaseOrder.uploaded_purchase_order_detail.file_path;
                const display_name = firstPurchaseOrder.uploaded_purchase_order_detail.display_name;
                return (
                    <Link
                        underline='hover'
                        sx={{ color: '#237CD4' }}
                        component={NextLink}
                        href="#"
                        onClick={() => handleDownload(file_path, display_name)}
                    >
                        {firstPurchaseOrder.uploaded_purchase_order_detail?.display_name}
                    </Link>
                );
            },
            enableColumnFilter: false, 
        },
        {
            accessorKey: 'state',
            header: 'Status',
            cell: (props) => {   
                const displayValue = props.row.original.state.display_value || '--';
                return <Typography>{displayValue}</Typography>;
            },
        }
    ];

    const [actualPoClubs, setActualPoClubs] = useState<any>([]); 
    const [isLoading, setIsLoading] = useState(false);

    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(50);
    const [totalCount, setTotalCount] = useState(0);
    const [sorting, setSorting] = useState({});
    const [globalFilter, setGlobalFilter] = useState('');
    const [columnFilters, setColumnFilters] = useState({});
    const [isTableLoading, setIsTableLoading] = useState(false);
    const tableRef = useRef(null);

    const getActualPoClubs = ({
        pageIndex: paramPageIndex,
        pageSize: paramPageSize,
        globalFilter: paramGlobalFilter,
        columnFilters: paramColumnFilters,
        sorting: paramSorting
    }: {
        pageIndex?: number,
        pageSize?: number,
        globalFilter?: string,
        columnFilters?: Object,
        sorting?: { column: string, direction: string | boolean }
    } = {}) => {
        setIsTableLoading(true);

        const pageIndexValue = paramPageIndex !== undefined ? paramPageIndex : pageIndex;
        const pageSizeValue = paramPageSize !== undefined ? paramPageSize : pageSize;
        const globalFilterValue = paramGlobalFilter !== undefined ? paramGlobalFilter : globalFilter;
        const columnFiltersValue = paramColumnFilters !== undefined ? paramColumnFilters : columnFilters;
        const sortingValue = paramSorting !== undefined ? paramSorting : sorting;

        const queryParams = getQueryParams(globalFilterValue, columnFiltersValue, sortingValue);

        api.get(poUrls.actualPoClubslistURL(pageIndexValue + 1, pageSizeValue, queryParams)).then((resp: any) => {
            setActualPoClubs([...resp?.data?.results]);
            setTotalCount(resp?.data?.count);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false);
            setIsTableLoading(false);
        });
    };

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
    };

    const handlePageNumberChange = (pageIndex: number) => {
        setPageIndex(pageIndex);
        getActualPoClubs({ pageIndex: pageIndex });
    };

    const handlePageSizeChange = (pageSize: number) => {
        setPageIndex(0);
        setPageSize(pageSize);
        getActualPoClubs({ pageIndex: 0, pageSize: pageSize });
    };

    const handleTableSearch = (search: string) => {
        setPageIndex(0);
        tableRef.current.setPageIndex(0);
        setGlobalFilter(search?.trim());
        getActualPoClubs({ pageIndex: 0, globalFilter: search?.trim() });
    };

    const handleTableFilterSearch = (filters: any) => {
        setPageIndex(0);
        tableRef.current.setPageIndex(0);
        setColumnFilters(filters);
        getActualPoClubs({ columnFilters: filters });
    };

    const handleSortingChange = (sorting: any) => {
        setPageIndex(0);
        tableRef.current.setPageIndex(0);
        setSorting(sorting);
        getActualPoClubs({ sorting: sorting });
    };

    const resetStates = () => {
        setPageIndex(0);
        setPageSize(50);
        setTotalCount(0);
        setGlobalFilter('');
        setColumnFilters({});
        setActualPoClubs([]);
        setIsTableLoading(false);
    };

    useEffect(() => {
        resetStates();
        getActualPoClubs();
    }, []);

    return (
        <>
        {isLoading ? <DefaultLoader /> : 
        <>
            <RitzTable 
                data={actualPoClubs} 
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
        </>
        }
        </>
    );
};

export default ActualPoClubList;