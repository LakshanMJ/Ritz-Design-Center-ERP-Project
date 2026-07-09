import React, { useEffect, useRef, useState } from "react";
import { Box, ToggleButton, ToggleButtonGroup, Typography, Link } from "@mui/material";
import DefaultLoader from "../../components/DefaultLoader";
import RitzTable from "@/components/Ritz/RitzTable";
import api from "@/services/api";
import { toast } from "react-hot-toast";
import { getDefaultError } from "@/helpers/Utilities";
import * as RestUrls from "../../helpers/constants/RestUrls";
import NextLink from "next/link";

const CostingList = () => {
  const [selectedCustomer, setSelectedCustomer] = useState<string>(""); // Default to empty string
  const [customerList, setCustomerList] = useState<any[]>([]);
  const [costingData, setCostingData] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isTableLoading, setIsTableLoading] = useState(false);

  // Table states
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState({});
  const [sorting, setSorting] = useState({});
  const tableRef = useRef<any>(null);

  const tableCols = [
    {
      accessorKey: "short_code",
      header: "Display Number",
      cell: (props: any) => {
        const row = props.row.original;
        const id = row?.order_inquiry_details?.id;
        const latest_version_id = row?.order_inquiry_details?.latest_version_id || row?.id;
        const short_code = row?.short_code || "";
        return (
          <Link
            component={NextLink}
            href={`/costing/add/${id}/version/${latest_version_id}`}
            style={{ cursor: "pointer" }}
          >
            {short_code}
          </Link>
        );
      },
    },
    {
      accessorKey: "customer",
      header: "Customer",
    },
    {
      accessorKey: "brand_name",
      header: "Brand Name",
    },
    {
      accessorKey: "date",
      header: "Date",
    },
    {
      accessorKey: "year",
      header: "Year",
    },
    {
      accessorKey: "style_number",
      header: "Style Number",
    },
    {
      accessorKey: "costing_type",
      header: "Costing Type",
      cell: (props: any) => {
        const row = props.row.original;
        const displayValue = row.costing_type_display_value;
        return (
          <Box>
            {displayValue}
          </Box>
        );
      },
    },
    {
      accessorKey: "version_state_display_value",
      header: "Status",
      enableColumnFilter: false,
      enableGlobalFilter: false,
    },
  ];

  const getMetaCustomerData = () => {
    api
      .get(RestUrls.customersURL())
      .then((response) => {
        setCustomerList(response.data || []);
      })
      .catch((error) => {
        toast.error(getDefaultError(error?.response?.status));
      });
  };

  const handleCustomerOnChange = (event: any, newCustomer: string) => {
    setSelectedCustomer(newCustomer || "");
    fetchCostingData({ customer: newCustomer || "" });
  };

  const fetchCostingData = ({
    pageIndex: paramPageIndex,
    pageSize: paramPageSize,
    globalFilter: paramGlobalFilter,
    columnFilters: paramColumnFilters,
    sorting: paramSorting,
    customer: paramCustomer,
  }: {
    pageIndex?: number;
    pageSize?: number;
    globalFilter?: string;
    columnFilters?: Object;
    sorting?: { column: string; direction: string | boolean };
    customer?: string;
  } = {}) => {
    setIsTableLoading(true);

    const pageIndexValue = paramPageIndex !== undefined ? paramPageIndex : pageIndex;
    const pageSizeValue = paramPageSize !== undefined ? paramPageSize : pageSize;
    const globalFilterValue = paramGlobalFilter !== undefined ? paramGlobalFilter : globalFilter;
    const columnFiltersValue = paramColumnFilters !== undefined ? paramColumnFilters : columnFilters;
    const sortingValue = paramSorting !== undefined ? paramSorting : sorting;
    const customerValue = paramCustomer !== undefined ? paramCustomer : selectedCustomer;

    const queryParams = getQueryParams(globalFilterValue, columnFiltersValue, sortingValue);

    api
      .get(RestUrls.OrderCostingVersionDetail(pageIndexValue + 1, pageSizeValue, customerValue, queryParams))
      .then((resp: any) => {
        setCostingData({ ...resp?.data });
        setTotalCount(resp?.data?.count);
      })
      .catch((error) => {
        toast.error(getDefaultError(error?.response?.status));
      })
      .finally(() => {
        setIsLoading(false);
        setIsTableLoading(false);
      });
  };

  const getQueryParams = (globalFilter: string, columnFilters: any, sortingValue: any): string => {
    const params: any = {};
    if (globalFilter) {
      params["global_filter"] = globalFilter;
    }
    if (Object.keys(columnFilters)?.length) {
      Object.keys(columnFilters).forEach((key) => {
        if (columnFilters[key]) {
          params[key] = columnFilters[key];
        }
      });
    }
    if (sortingValue?.column && sortingValue?.direction) {
      params["sort_col"] = sortingValue.column;
      params["sort_dir"] = sortingValue.direction;
    }
    return new URLSearchParams(params).toString();
  };

  const handlePageNumberChange = (pageIndex: number) => {
    setPageIndex(pageIndex);
    fetchCostingData({ pageIndex });
  };

  const handlePageSizeChange = (pageSize: number) => {
    setPageIndex(0);
    setPageSize(pageSize);
    fetchCostingData({ pageIndex: 0, pageSize });
  };

  const handleTableSearch = (search: string) => {
    setPageIndex(0);
    if (tableRef.current?.setPageIndex) tableRef.current.setPageIndex(0);
    setGlobalFilter(search?.trim());
    fetchCostingData({ pageIndex: 0, globalFilter: search?.trim() });
  };

  const handleTableFilterSearch = (filters: any) => {
    setPageIndex(0);
    if (tableRef.current?.setPageIndex) tableRef.current.setPageIndex(0);
    setColumnFilters(filters);
    fetchCostingData({ columnFilters: filters });
  };

  const handleSortingChange = (sorting: any) => {
    setPageIndex(0);
    if (tableRef.current?.setPageIndex) tableRef.current.setPageIndex(0);
    setSorting(sorting);
    fetchCostingData({ sorting });
  };

  useEffect(() => {
    getMetaCustomerData();
    fetchCostingData();
  }, []);

  return (
    <>
      <Typography variant="h1">Costing List</Typography>
      {isLoading ? (
        <DefaultLoader />
      ) : (
        <>
          <Box sx={{ display: "flex", mb: 2 }}>
            <ToggleButtonGroup
              color="primary"
              value={selectedCustomer}
              exclusive
              onChange={handleCustomerOnChange}
              aria-label="Customer"
              sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}
            >
              <ToggleButton
                style={{
                  height: "4em",
                  minWidth: "150px",
                  border: "1px solid #E0E0E0",
                  borderRadius: "5px",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  textAlign: "center",
                  marginBottom: "10px",
                }}
                value=""
              >
                All
              </ToggleButton>
              {customerList?.map((customer: any) => (
                <ToggleButton
                  key={customer.id}
                  style={{
                    height: "4em",
                    minWidth: "150px",
                    border: "1px solid #E0E0E0",
                    borderRadius: "5px",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    textAlign: "center",
                    marginBottom: "10px",
                  }}
                  value={customer.id}
                >
                  {customer.name}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>
          <RitzTable
            data={costingData?.results}
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
      )}
    </>
  );
};

export default CostingList;