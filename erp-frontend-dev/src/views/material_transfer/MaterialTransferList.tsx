import DefaultLoader from "@/components/DefaultLoader";
import RitzTable from "@/components/Ritz/RitzTable";
import { getDefaultError } from "@/helpers/Utilities";
import api from "@/services/api";
import { Box, Link, ToggleButton, ToggleButtonGroup, Typography, useTheme } from "@mui/material";
import { ColumnDef } from "@tanstack/react-table";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/router";
import { materialTransferList } from "@/helpers/constants/rest_urls/MaterialTransferUrls";
import { materialTransferDetailsFromListPageURL } from "@/helpers/constants/front_end/CostingUrls";

const MaterialTransferList = () => {
    const router = useRouter();
    const theme = useTheme();
    const [isLoading, setIsLoading] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<any>('');
    const [grnTransferData, setGrnTransferData] = useState<any>({});
    // Table states
    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(50);
    const [totalCount, setTotalCount] = useState(0);
    const [sorting, setSorting] = useState({});
    const [globalFilter, setGlobalFilter] = useState('');
    const [columnFilters, setColumnFilters] = useState({});
    const [isTableLoading, setIsTableLoading] = useState(false);
    const tableRef = useRef(null);
    const states = [{ id: '', name: 'All' }, { id: 'draft', name: 'Pending' }, { id: 'transfer_in_progress', name: 'In Progress' }, { id: 'complete', name: 'Complete' }, { id: 'canceled', name: 'Canceled' }];

    const tableCols: ColumnDef<any>[] = [
        {
            accessorKey: 'display_number',
            header: 'Material Transfer No',
            cell: (props) => {
                const order = props.row.original.display_number
                return <Link href={materialTransferDetailsFromListPageURL(props.row.original.id)} >{order}</Link>;
            }
        },
        {
            accessorKey: '',
            header: 'From Warehouse',
        },
        {
            accessorKey: 'warehouse_name',
            header: 'To Warehouse',
        },
        {
            accessorKey: 'state_display',
            header: 'State',
        },
    ]

    const fetchData = ({
        pageIndex: paramPageIndex,
        pageSize: paramPageSize,
        globalFilter: paramGlobalFilter,
        columnFilters: paramColumnFilters,
        sorting: paramSorting,
        state: paramState,
    }: {
        pageIndex?: number,
        pageSize?: number,
        globalFilter?: string,
        columnFilters?: Object,
        sorting?: { column: string, direction: string | boolean },
        state?: number,
    } = {}) => {
        setIsTableLoading(true);
        const pageIndexValue = paramPageIndex !== undefined ? paramPageIndex : pageIndex;
        const pageSizeValue = paramPageSize !== undefined ? paramPageSize : pageSize;
        const globalFilterValue = paramGlobalFilter !== undefined ? paramGlobalFilter : globalFilter;
        const columnFiltersValue = paramColumnFilters !== undefined ? paramColumnFilters : columnFilters;
        const sortingValue = paramSorting !== undefined ? paramSorting : sorting;
        const customerValue = paramState !== undefined ? paramState : selectedCustomer;

        const queryParams = getQueryParams(customerValue, globalFilterValue, columnFiltersValue, sortingValue);

        api.get(materialTransferList(pageIndexValue + 1, pageSizeValue, queryParams)).then((resp: any) => {
            setGrnTransferData({ ...resp?.data });
            setTotalCount(resp?.data?.count)
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false);
            setIsTableLoading(false);
        });
    };

    const getQueryParams = (state: any, globalFilter: any, columnFilters: any, sortingValue: any): string => {
        const params: any = {};
        params['state'] = state || '';
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

    const handleCustomerOnChange = (event: any, state: any) => {
        setSelectedCustomer(state);
        fetchData({ state: state });
    };

    useEffect(() => {
        fetchData();
    }, [])

    return (
        <>
            {isLoading ? (
                <DefaultLoader />
            ) : (
                <>
                    <Typography variant='h1'>Material Transfer List</Typography>
                    <Box>
                        <Box sx={{ display: 'flex' }}>
                            <ToggleButtonGroup
                                color="primary"
                                value={selectedCustomer}
                                exclusive
                                onChange={handleCustomerOnChange}
                                aria-label="Customer"
                                sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}
                            >
                                {states.map((state: any) => (
                                    <ToggleButton
                                        key={state.id}
                                        value={state.id}
                                        style={{ height: '4em', minWidth: '150px', border: '1px solid #E0E0E0', borderRadius: '5px', display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center', marginBottom: '10px', }}>
                                        {state.name}
                                    </ToggleButton>

                                ))}
                            </ToggleButtonGroup>
                        </Box>
                    </Box>
                    <Box>
                        <RitzTable
                            data={grnTransferData?.results}
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
                    </Box>
                </>
            )}
        </>
    );
}


export default MaterialTransferList;