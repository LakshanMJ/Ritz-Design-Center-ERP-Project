import DefaultLoader from '@/components/DefaultLoader'
import api from '@/services/api';
import { Box, Button, InputLabel, Link, List, ListItem, Menu, MenuItem, Typography } from '@mui/material';
import React, { useEffect, useRef, useState } from 'react';
import * as RestUrls from '../../helpers/constants/RestUrls';
import toast from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';
import RitzTable from '@/components/Ritz/RitzTable';
import { ColumnDef } from '@tanstack/react-table';
import SaveSpinner from '@/components/SaveSpinner';
import { purchaseOrderExcelFileUploadCreatePageURL, purchaseOrderDetailPageURL, orderSummaryPageURL } from '@/helpers/constants/FrontEndUrls';
import { purchaseOrderClubDetailsPageURL } from '@/helpers/constants/front_end/POUrls';
import { useRouter } from 'next/router';

const PurchaseOrderList = () => {

  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [purchaseOrders, setPurchaseOrders] = useState<any>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState({});
  const [sorting, setSorting] = useState({});
  const [isTableLoading, setIsTableLoading] = useState(false);
  const tableRef = useRef(null);

  const handlePageNumberChange = (pageIndex: number) => {
    setPageIndex(pageIndex);
    getTableData({ pageIndex: pageIndex });
  }

  const handlePageSizeChange = (pageSize: number) => {
    setPageIndex(0);
    setPageSize(pageSize);
    getTableData({ pageIndex: 0, pageSize: pageSize });
  }

  const handleTableSearch = (search: string) => {
    setPageIndex(0);
    tableRef.current.setPageIndex(0);
    setGlobalFilter(search?.trim());
    getTableData({ pageIndex: 0, globalFilter: search?.trim() });
  }

  const handleTableFilterSearch = (filters: any) => {
    setPageIndex(0);
    tableRef.current.setPageIndex(0);
    setColumnFilters(filters);
    getTableData({ columnFilters: filters });
  }

  const handleSortingChange = (sorting: any) => {
    setPageIndex(0);
    tableRef.current.setPageIndex(0);
    setSorting(sorting);
    getTableData({ sorting: sorting });
  }

  const getTableData = ({
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

    api.get(RestUrls.purchaseOrdersURL(pageIndexValue + 1, pageSizeValue, queryParams)).then((resp: any) => {
      setPurchaseOrders(resp?.data);
      setTotalCount(resp?.data?.length);
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => {
      setIsLoading(false);
      setIsTableLoading(false);
    });
  }

  const getQueryParams = (globalFilter: any, columnFilters: any, sortingValue: any): string => {
    const params: any = {};
    if (globalFilter) {
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

  const handleCreatePurchaseOrder = () => {
    try {
      setPageLoading(true)
      router.push(purchaseOrderExcelFileUploadCreatePageURL())
    } finally {
      setPageLoading(false)
    }
  }

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'id',
      header: 'Purchase Order',
      cell: props => (
        <Link sx={{cursor: 'pointer'}} href={purchaseOrderDetailPageURL(props.row.original.id)}>{props.row.original.short_code}</Link>
      )
    },
    {
      accessorKey: 'costing_version_id',
      header: 'Order Inquiry',
      cell: props => (
        <Link sx={{cursor: 'pointer'}} href={orderSummaryPageURL(props.row.original.order_id, props.row.original.costing_version)} >{props.row.original.order_inquiry.display_number}</Link>
      )
    },
    {
      accessorKey: 'actual_po_club_id',
      header: 'PO Club',
      cell: props => (
        <Link sx={{cursor: 'pointer'}} href={purchaseOrderClubDetailsPageURL(props.row.original.actual_po_club)}>{props.row.original.po_club.display_number}</Link>
      )
    },
    {
      accessorKey: 'customer_name',
      header: 'Customer Name',
    },
    {
      accessorKey: 'brand_name',
      header: 'Brand Name',
    },
    {
      accessorKey: 'state.display_value',
      header: 'Status',
      cell: (props) => {   
        const displayValue = props.row.original.state.display_value || '--';
        return <Typography>{displayValue}</Typography>;
      },
    }
  ];

  useEffect(() => {
    getTableData();
  }, []);

  return (
    <>
      {isLoading ? <DefaultLoader /> : <>
        <Button variant="contained" onClick={handleCreatePurchaseOrder}>{pageLoading ? < SaveSpinner /> : <> </>}Create Purchase Order</Button>
        <RitzTable
          data={purchaseOrders?.results}
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
      </>}
    </>
  )
}

export default PurchaseOrderList;