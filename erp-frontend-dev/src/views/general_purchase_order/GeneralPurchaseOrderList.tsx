import { getDefaultError } from '@/helpers/Utilities';
import api from '@/services/api';
import React, { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast';
import * as poUrls from "@/helpers/constants/rest_urls/POUrls";
import DefaultLoader from '@/components/DefaultLoader';
import RitzTable from '@/components/Ritz/RitzTable';
import { ColumnDef } from '@tanstack/react-table';
import { IconButton, Link, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { useRouter } from 'next/router';
import { generalPurchaseOrderDetailsPageURL, purchaseOrderClubDetailsPageURL } from '@/helpers/constants/front_end/POUrls';
import index from '@/pages/purchase_order/purchase_order_club/[purchase_order_club_id]';
import NextLink from 'next/link';
import { purchaseOrderDetailPageURL } from '@/helpers/constants/FrontEndUrls';

const GeneralPurchaseOrderList = () => {

  const router = useRouter()
  const [generalPos, setGeneralPos] = useState<any>({});

  const [isLoading, setIsLoading] = useState(false)
  //table states
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  const [sorting, setSorting] = useState({});
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState({});
  const [isTableLoading, setIsTableLoading] = useState(false);
  const tableRef = useRef(null);

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'id',
      header: 'General Po Number',
      cell: (props) => {
        const displayValue = props.row.original.display_number || '--';
        return <Link component={NextLink} href={generalPurchaseOrderDetailsPageURL(props.row.original.id)}>{displayValue}</Link>;

      },
    },
    {
      accessorKey: 'po_club',
      header: 'PO Club Number',
      cell: (props) => {
        const displayValue = props.row.original.po_club_display_number || '--';
        return <Link component={NextLink} href={purchaseOrderClubDetailsPageURL(props.row.original.po_club)}>{displayValue}</Link>;

      },
    },
    {
      accessorKey: 'costing',
      header: 'Costing',
      cell: (props) => {
        const displayValue = props.row.original.costing_display_number || '--';
        return <Link 
        component={NextLink} 
        href={`/costing/add/${props.row.original.order_id}/version/${props.row.original.costing_id}`}
      >
        {displayValue}
      </Link>;

      },
    },
    {
      accessorKey: 'state',
      header: 'Status',
      cell: (props) => {
        const displayValue = props.row.original.state_display || '--';
        return <Typography>{displayValue}</Typography>;
      },
    }
  ]

  const getGeneralPos = ({
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
    setIsTableLoading(true);
    const pageIndexValue = paramPageIndex !== undefined ? paramPageIndex : pageIndex;
    const pageSizeValue = paramPageSize !== undefined ? paramPageSize : pageSize;
    const globalFilterValue = paramGlobalFilter !== undefined ? paramGlobalFilter : globalFilter;
    const columnFiltersValue = paramColumnFilters !== undefined ? paramColumnFilters : columnFilters;
    const sortingValue = paramSorting !== undefined ? paramSorting : sorting;

    const queryParams = getQueryParams(globalFilterValue, columnFiltersValue, sortingValue);

    api.get(poUrls.generalPoListURL(pageIndexValue + 1, pageSizeValue, queryParams)).then(resp => {
      const resdata = resp?.data || [];
      setGeneralPos({ ...resdata });
      setTotalCount(resdata?.count)
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
  }
  const handlePageNumberChange = (pageIndex: number) => {
    setPageIndex(pageIndex);
    getGeneralPos({ pageIndex: pageIndex });
  }
  
  const handlePageSizeChange = (pageSize: number) => {
    setPageIndex(0);
    setPageSize(pageSize);
    getGeneralPos({ pageIndex: 0, pageSize: pageSize });
  }

  const handleTableSearch = (search: string) => {
    setPageIndex(0);
    tableRef.current.setPageIndex(0);
    setGlobalFilter(search?.trim());
    getGeneralPos({ pageIndex: 0, globalFilter: search?.trim() });
  }

  const handleTableFilterSearch = (filters: any) => {
    setPageIndex(0);
    tableRef.current.setPageIndex(0);
    setColumnFilters(filters);
    getGeneralPos({ columnFilters: filters });
  }

  const handleSortingChange = (sorting: any) => {
    setPageIndex(0);
    tableRef.current.setPageIndex(0);
    setSorting(sorting);
    getGeneralPos({ sorting: sorting });
  }

  useEffect(() => {
    getGeneralPos()
  }, [])


  return (
    <>
      {isLoading ? <DefaultLoader /> : <>
        <RitzTable 
          data={generalPos?.results} 
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

export default GeneralPurchaseOrderList