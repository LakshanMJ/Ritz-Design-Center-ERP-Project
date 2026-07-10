import React, { useEffect, useRef, useState } from "react";
import { Box, InputLabel, Link, List, ListItem, Menu, MenuItem, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import DefaultLoader from "../../components/DefaultLoader";
import Button from '@mui/material/Button';
import NextLink from 'next/link';
import * as RestUrls from '../../helpers/constants/RestUrls';
import { ColumnDef } from "@tanstack/react-table";
import RitzTable from "@/components/Ritz/RitzTable";
import api from "@/services/api";
import {costingGeneralIfoURL, costingOrderTypeURL, orderSummaryVersionURL} from "@/helpers/constants/FrontEndUrls";
import { toast } from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';
import dayjs from "dayjs";
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import router from "next/router";
import { programedOrderInquiriesSummaryUrl } from "@/helpers/constants/front_end/CostingUrls";
import RitzModal from "@/components/Ritz/RitzModal";
import RitzSearchableSelection from "@/components/Ritz/RitzSearchableSelection";
import SaveSpinner from "@/components/SaveSpinner";
import { DEFAULT_SUCCESS } from "@/helpers/constants/Constants";


const OrderInquiryList = () => {
  const versionModalTitle = 'Select Order Version';
  const [orderInquiries, setOrderInquiries] = useState<any>({});
  const [orderVersions, setOrderVersions] = useState<any>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [versionMenuAnchorEl, setVersionMenuAnchorEl] = useState<null | HTMLElement>(null);
  const versionMenuOpen = Boolean(versionMenuAnchorEl);
  const [versionModalOpen, setVersionModalOpen] = useState({modalOpen:false, orderId:null, versions:[],});
  const [copyVersionSelectionModalOpen, setCopyVersionSelectionModalOpen] = useState(false);
  const [selectedVersionData, setSelectedVersionData] = useState<any>({});
  const [selectedCustomer, setSelectedCustomer] = useState<any>(0);
  const [customerList, setCustomerList] = useState<any[]>([]);

  // Table states
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const [totalCount, setTotalCount] = useState(0);
  const [sorting, setSorting] = useState({});
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState({});
  const [isTableLoading, setIsTableLoading] = useState(false);
  const tableRef = useRef(null);

  const tableCols: ColumnDef<any>[] = [
    {
      accessorKey: 'id',
      header: 'Order',
      enableColumnFilter: false,
      enableGlobalFilter: false,
      cell: (props: any) => {
        if (props.row.original) {
          const {id,latest_version_id,costing_versions:versions,short_code} = props.row.original;
          const hasMultipleVersions = versions && versions.length > 1;
          const noVersions = !versions || versions.length === 0;

          const handleClick = () => {
            setVersionModalOpen({ modalOpen: true, orderId: id, versions });
          };

          return (
            <Link 
              component={NextLink}
              href={'#'}
              onClick={noVersions || !hasMultipleVersions ? undefined : handleClick}
            >
              {short_code}
            </Link>
          );
        } else {
          return <Typography>--</Typography>;
        }
      } 
    },
    {
      id: 'order_program',
      header: 'Program',
      accessorFn: (row: any) => row.order_program,
      enableColumnFilter: false,
      enableGlobalFilter: false,
      cell: (props: any) => {
        if (props.row.original.order_program) {
          return (
            <Link target='blank' component={NextLink} href={programedOrderInquiriesSummaryUrl(props.row.original.order_program)}>{props.row.original.order_program_display_number}</Link>
          );
        } else {
          return <Typography>--</Typography>;
        }
      }     
    },
    {
      id: 'customer.name',
      accessorFn: (row: any) => row.customer?.name,
      header: 'Customer',
    },
    {
      id: 'brand.name',
      accessorFn: (row: any) => row.brand?.name,
      header: 'Brand Name',
    },
    {
      id: 'date',
      accessorFn: (row: any) => (row.date && dayjs(row.date).format('DD/MM/YYYY')),
      header: 'Date',
      cell: (props: any) => (
        props.getValue() && dayjs(props.row.original.date).format('DD/MM/YYYY')
      ),
    },
    {
      accessorKey: 'year',
      header: 'Year',
    },
    {
      accessorKey: 'style_number',
      header: 'Style Number',
      meta: {
        align: 'center'
      }
    },
    {
      accessorKey: 'costing_type_display',
      header: 'Costing Type',
    },
    {
      id: 'state.display_value',
      accessorFn: (row: any) => row.state?.display_value,
      header: 'Status',
      enableColumnFilter: false,
      enableGlobalFilter: false,
    }
  ]

  const handleVersionClick = (event: React.MouseEvent<HTMLElement>) => {
    setVersionMenuAnchorEl(event.currentTarget);
  }

  const handleCopyExistingInquiry = () => {
    setVersionMenuAnchorEl(null);
    setCopyVersionSelectionModalOpen(true);
    loadCostingVersions();
  }

  const loadCostingVersions = () => {
    api.get(RestUrls.costingVersionsListURL()).then(resp => {
      const reseditdata = resp?.data || {};
      setOrderVersions([...reseditdata?.results]);
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    });
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

  const handleCreateOrderCosting = () => {
    setIsSaving(true)
    api.post(RestUrls.createPreCostingURL(selectedVersionData?.costing_order_id, selectedVersionData?.id, 'marketing_costing')).then(resp => {
      toast.success(DEFAULT_SUCCESS);
      const responseData = resp?.data || [];
      setSelectedVersionData({})
      setCopyVersionSelectionModalOpen(false)
      if (responseData) {
        router.push(orderSummaryVersionURL(responseData?.costing_id, responseData?.costing_version_id));
      }
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => setIsSaving(false));
  }

  const onVersionChange = (selectedOrderID: any) => {
    const selectedVersion = orderVersions.find((order: any) => order.id === selectedOrderID);
    if (selectedVersion) {
      setSelectedVersionData({
        id: selectedOrderID,
        costing_order_id: selectedVersion.costing_order_id, 
      });
    }
  }

  const getTableData = ({
    pageIndex: paramPageIndex,
    pageSize: paramPageSize,
    globalFilter: paramGlobalFilter,
    columnFilters: paramColumnFilters,
    sorting: paramSorting,
    customer:  paramCustomer
  }: {
    pageIndex?: number,
    pageSize?: number,
    globalFilter?: string,
    columnFilters?: Object,
    sorting?: { column: string, direction: string | boolean },
    customer?: number
  } = {}) => {
    setIsTableLoading(true);
    // Use parameters if passed in, otherwise use parent values
    const pageIndexValue = paramPageIndex !== undefined ? paramPageIndex : pageIndex;
    const pageSizeValue = paramPageSize !== undefined ? paramPageSize : pageSize;
    const globalFilterValue = paramGlobalFilter !== undefined ? paramGlobalFilter : globalFilter;
    const columnFiltersValue = paramColumnFilters !== undefined ? paramColumnFilters : columnFilters;
    const sortingValue = paramSorting !== undefined ? paramSorting : sorting;
    const customer = paramCustomer !== undefined ? paramCustomer : selectedCustomer;

    const queryParams = getQueryParams(globalFilterValue, columnFiltersValue, sortingValue);
    
    api.get(RestUrls.orderInquiriesURL(pageIndexValue + 1, pageSizeValue, customer, queryParams)).then((resp: any) => {
      setOrderInquiries({...resp?.data});
      setTotalCount(resp?.data?.count)
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => {
      setIsLoading(false);
      setIsTableLoading(false);
    });
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
  const getMetaCustomerData = () => {
      Promise.all([
        api.get(RestUrls.customersURL()),
      ]).then(([customersResp]) => {
        setCustomerList(customersResp.data || []);
      }).catch(error => {
        toast.error(getDefaultError(error?.response?.status));
      })
  };

  const handleCustomerOnChange = (event: any, newCustomer: any) => {
    setSelectedCustomer(newCustomer || 0);
    getTableData({ customer: newCustomer || 0 });
  };
  const resetStates = () => {
    setPageIndex(0);
    setPageSize(50);
    setTotalCount(0);
    setGlobalFilter('');
    setColumnFilters([]);
    setOrderInquiries([]);
    setIsTableLoading(false);
  }

  // ------ Change detection ----- 
  // Page init
  useEffect(() => {
    resetStates();
    getTableData();
    getMetaCustomerData();
  }, []);

  return (
    <>
    {/* MODALS */}
    {copyVersionSelectionModalOpen && (
      <RitzModal 
        open={copyVersionSelectionModalOpen} 
        title={versionModalTitle} 
        onClose={() => {setCopyVersionSelectionModalOpen(false), setSelectedVersionData({})}}
      >
        <Box>
          <InputLabel sx={{ mb: 1, fontWeight: 'bold' }}>Completed Order Versions:</InputLabel>
        </Box>
        <Box>
          <RitzSearchableSelection
            options={orderVersions}
            placeholder="Select..."
            selectedValue={selectedVersionData.id}
            handleOnChange={(selectedOrderID: any) => onVersionChange(selectedOrderID)}
            id={'id'}
            name={'id'}
            optionValue={'id'}
            optionText={'display_number'}
          />
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          <Button variant='contained' onClick={()=>{handleCreateOrderCosting()}} disabled={isSaving}>{isSaving && <SaveSpinner />}Create</Button>
        </Box>
      </RitzModal>
    )}

    {versionModalOpen.modalOpen && (
      <RitzModal 
        open={versionModalOpen.modalOpen} 
        title={versionModalTitle} 
        onClose={() => setVersionModalOpen({modalOpen:false,orderId:null,versions:[]})}
      >
        {versionModalOpen.versions && versionModalOpen.versions.length > 0 ? (
          <List>
            {versionModalOpen.versions.map((version, index) => (
              <ListItem key={index}>
                <Link target='blank' href={`/costing/add/${versionModalOpen.orderId}/version/${version.id}`} sx={{ cursor: 'pointer' }} >{version.display_number}</Link>
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography>No costing versions available</Typography>
        )}
      </RitzModal>
    )}

    <Typography variant='h1'>Order Inquiries</Typography>
      
    {isLoading ? <DefaultLoader /> : 
    <>
        <Box sx={{ display: 'flex', mb:2 }}>
            <ToggleButtonGroup
              color="primary"
              value={selectedCustomer}
              exclusive
              onChange={handleCustomerOnChange}
              aria-label="Customer"
              sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}
            >
              <ToggleButton
                style={{ height: '4em', minWidth: '150px', border: '1px solid #E0E0E0', borderRadius: '5px', display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center', marginBottom: '10px', }} value={0}>
                All
              </ToggleButton>
              {customerList?.map((customer: any) => (
                <ToggleButton key={customer.id} style={{
                  height: '4em',
                  minWidth: '150px',
                  border: '1px solid #E0E0E0',
                  borderRadius: '5px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  textAlign: 'center',
                  marginBottom: '10px',
                }} value={customer.id}>
                  {customer.name}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
      </Box>
      <Button
        variant='outlined'
        onClick={handleVersionClick}
        endIcon={<KeyboardArrowDownIcon />}
        sx={{ mr: 1.5 }}
      >
        Create Inquiry
      </Button>
      <Menu
        anchorEl={versionMenuAnchorEl}
        open={versionMenuOpen}
        onClose={() => setVersionMenuAnchorEl(null)}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        <MenuItem component={NextLink} href={costingOrderTypeURL()}>
          Program
        </MenuItem>
        <MenuItem component={NextLink} href={costingGeneralIfoURL()}>
          Not a program
        </MenuItem>
        <MenuItem onClick={() => handleCopyExistingInquiry()}>
          Copy from existing order inquiry
        </MenuItem>
      </Menu>

      <RitzTable 
        data={orderInquiries?.results} 
        columns={tableCols}
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

export default OrderInquiryList;