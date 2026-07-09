import api from '@/services/api';
import NextLink from 'next/link';
import toast from 'react-hot-toast';
import React, { useEffect, useRef, useState } from 'react';
import RitzTable from '@/components/Ritz/RitzTable';
import { getDefaultError } from '@/helpers/Utilities';
import DefaultLoader from '@/components/DefaultLoader';
import * as MaterialAdministrationUrls from '@/helpers/constants/rest_urls/MaterialAdministrationUrls';
import * as RestUrls from '@/helpers/constants/RestUrls';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { Alert, Breadcrumbs, Button, Grid, Link, Typography } from '@mui/material';
import { createdMaterialVariationDetailsListURL } from '@/helpers/constants/front_end/AdminUrls';
import RitzMultiSelectCheckBox from '@/components/Ritz/RitzMultiSelectCheckBox';
import SaveSpinner from '@/components/SaveSpinner';

const CreatedMaterialDetails = (props: any) => {
  const materialType = props?.materialType;

  const [data, setData] = useState<any>([]);
  const [columns, setColumns] = useState([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isItemsLoading, setIsItemsLoading] = useState(false);

  // Table states
  const [isSearching, setIsSearching] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  const [sorting, setSorting] = useState({});
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState({});
  const [isTableLoading, setIsTableLoading] = useState(false);
  const tableRef = useRef(null);


  const handleCustomerChange = (event: any, data: any, reason: any) => {
    data.forEach((d: any) => d.customer = d.id);
    const customerIds = data.map((customer: any) => customer.id);
    setSelectedCustomers(customerIds);
    getItems(customerIds);
  }

  const handleItemChange = (event: any, data: any, reason: any) => {
    data.forEach((d: any) => d.item = d.id);
    const itemIds = data.map((item: any) => item.id);
    setSelectedItems(itemIds);
  }

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

  const getItems = (customerIds: any) => {
    setIsItemsLoading(true);
    setSelectedItems([]);

    api.get(RestUrls.cutomerItemsURL(customerIds)).then(resp => {
      setItems(resp?.data || []);
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => {
      setIsItemsLoading(false);
    });
  }

  const getData = () => {
    setIsLoading(true);

    Promise.all([
      api.get(RestUrls.customersURL()),
      api.get(RestUrls.cutomerItemsURL([])),
      api.get(MaterialAdministrationUrls.createdMaterialDetailListURL(materialType, pageIndex + 1, pageSize))
    ]).then(resp => {
      const respData = resp.map((i: any) => i.data);
      const [customers, items, material] = respData;
      setCustomers(customers || []);
      setItems(items || []);
      setMaterial(material);
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => {
      setIsLoading(false);
    });
  }

  const setMaterial = (material: any) => {
    const data = material?.results || [];

    setData(data);
    setTotalCount(material?.count || 0);

    if (data?.length) {
      const headers = material?.headers;
 
      const columns: any[] = Object.values(headers).map((header: any) => ({
        id: header.value,
        accessorFn: (row: any) => row[header.name],
        header: header.label,
      }));
            
      columns.push({
        accessorFn: (row: any) => row['generic_material_variation_id'],
        header: 'Action',
        enableSorting: false,
        enableColumnFilter: false,
        enableGlobalFilter: false,
        cell: (props: any) => (
          <Button
            variant='text'
            color='primary'
            component={NextLink}
            href={createdMaterialVariationDetailsListURL(materialType, props.row.original.generic_material_variation_id)}
          >View</Button>
        ),
        meta: {
          align: 'center',
          width: 100
        }
      });

      setColumns(columns);
    }
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

    // Use parameters if passed in, otherwise use parent values
    const pageIndexValue = paramPageIndex !== undefined ? paramPageIndex : pageIndex;
    const pageSizeValue = paramPageSize !== undefined ? paramPageSize : pageSize;
    const globalFilterValue = paramGlobalFilter !== undefined ? paramGlobalFilter : globalFilter;
    const columnFiltersValue = paramColumnFilters !== undefined ? paramColumnFilters : columnFilters;
    const sortingValue = paramSorting !== undefined ? paramSorting : sorting;

    const queryParams = getQueryParams(globalFilterValue, columnFiltersValue, sortingValue);

    api.get(MaterialAdministrationUrls.createdMaterialDetailListURL(materialType, pageIndexValue + 1, pageSizeValue, queryParams)).then((resp: any) => {
      setMaterial(resp?.data || {});
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => {
      setIsTableLoading(false);
      setIsSearching(false);
    });
  }

  const getQueryParams = (globalFilter: any, columnFilters: any, sortingValue: any): string => {
    const params: any = {};

    if (selectedCustomers?.length) {
      params['customer_ids'] = selectedCustomers;
    }

    if (selectedItems?.length) {
      params['item_ids'] = selectedItems;
    }
    
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

  const onSearch = () => {
    setPageIndex(0);
    tableRef.current.setPageIndex(0);

    setIsSearching(true);
    getTableData({ pageIndex: 0 });
  }

  const resetStates = () => {
    setPageIndex(0);
    setPageSize(50);
    setTotalCount(0);
    setGlobalFilter('');
    setColumnFilters([]);
    setSelectedCustomers([]);
    setSelectedItems([]);
    setIsTableLoading(false);
    setIsSearching(false);
    setIsItemsLoading(false);
  }

  // ------ Change detection ----- 
  // Page init
  useEffect(()=> {
    if (materialType) {
      resetStates();
      getData();
    }
  }, [materialType]);

  return (
    <>
    <Breadcrumbs
      separator={<NavigateNextIcon fontSize="small" />}
      aria-label="breadcrumb"
      sx={{ mb: 1.5 }}
    >
      <Link underline='hover' color='inherit' component={NextLink} href={'/admin/material_types/created_materials'}>Created Material List</Link>
      <Typography color='text.primary'>Created Material Details</Typography>
    </Breadcrumbs>
    <Typography variant='h1'>{data?.[0]?.material_label}</Typography>

    {isLoading ? <DefaultLoader /> : (
      <>
        <Grid container spacing={2}>
          <Grid item xs={4}>
            <Typography variant='h6'>Customer</Typography>
            <RitzMultiSelectCheckBox 
              id={'customer'}
              disableCloseOnSelect
              selectOptions={customers}
              optionValue={'id'}
              optionDisplayValue={'name'}
              handleOnChange={handleCustomerChange}
              selectedValues={selectedCustomers || ''}
            />
          </Grid>
          <Grid item xs={4}>
            <Typography variant='h6'>Item {isItemsLoading && <SaveSpinner/>}</Typography>
            <RitzMultiSelectCheckBox
              id={'item'}
              disableCloseOnSelect
              selectOptions={items}
              optionValue={'id'}
              optionDisplayValue={'name'}
              handleOnChange={handleItemChange}
              selectedValues={selectedItems || ''}
              disabled={isItemsLoading}
            />
          </Grid>
        </Grid>
        <Button sx={{ my: 2 }} variant='contained' onClick={onSearch} disabled={isSearching}>
          {isSearching && <SaveSpinner/>}Search
        </Button>

        {!data.length && (
          <Alert severity='error' icon={false} sx={{ mt: 5, mb: 2 }}>
            Nothing to show. Please ensure that materials have been assigned.
          </Alert>
        )}

        <RitzTable
          data={data}
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
    )}
    </>
  )
}

export default CreatedMaterialDetails;