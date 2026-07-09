import DefaultLoader from "@/components/DefaultLoader";
import RitzModal from "@/components/Ritz/RitzModal";
import RitzTable from "@/components/Ritz/RitzTable";
import { customersURL } from "@/helpers/constants/RestUrls";
import { getDefaultError } from "@/helpers/Utilities";
import api from "@/services/api";
import { Box, Button, Card, Checkbox, FormControl, FormControlLabel, Link, MenuItem, Radio, RadioGroup, Select, Table, TableBody, TableCell, TableHead, TableRow, ToggleButton, ToggleButtonGroup, Typography, useTheme } from "@mui/material";
import { ColumnDef } from "@tanstack/react-table";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/router";
import { orderSummaryPageURL } from "@/helpers/constants/FrontEndUrls";
import { inhouseMaterialListURL } from "@/helpers/constants/rest_urls/MaterialTransferUrls";
import RitzSelection from "@/components/Ritz/RitzSelection";
import { plantWarehouseListURL } from "@/helpers/constants/rest_urls/GrnUrls";
import TransferConfirmation from "./TransferConfirmation";
import OtherMaterialTransfer from "./OtherMaterialTransfer";
import { purchaseOrderClubDetailsPageURL } from "@/helpers/constants/front_end/POUrls";

const MaterialTransferDashboard = () => {
    const router = useRouter();
    const theme = useTheme();
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCustomer, setSelectedCustomer] = useState<any>('');
    const [customerdata, setCustomerData] = useState<any[]>([]);
    const [transferModalData, setTransferModalData] = useState<any>({});
    const [grnTransferData, setGrnTransferData] = useState<any>({});
    const [openOtherMaterialTransferModal, setOpenOtherMaterialTransferModal] = useState<any>(false);
    // Table states
    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(50);
    const [totalCount, setTotalCount] = useState(0);
    const [sorting, setSorting] = useState({});
    const [globalFilter, setGlobalFilter] = useState('');
    const [columnFilters, setColumnFilters] = useState({});
    const [isTableLoading, setIsTableLoading] = useState(false);
    const tableRef = useRef(null);

    const handleTransferConfirmation = (type: any, clubId: any, status: any, transferStatus: any, transferData: any)=>{
        setTransferModalData({ type: type, modalStatus: status, clubId: clubId, transferStatus: transferStatus, transferData: transferData });
    }

    const tableCols: ColumnDef<any>[] = [
        {
            accessorKey: 'order',
            header: 'Order',
            cell: (props) => {
                const order = props.row.original.marketing_costing_display_number
                return <Link href={orderSummaryPageURL(props.row.original.order_inquiry_id, props.row.original.version_id)} target="_blank" >{order}</Link>;
            }
        },
        {
            accessorKey: 'original_po_club',
            header: 'PO Club',
            cell: (props) => {
                const poClub = props.row.original.short_code
                return <Link href={purchaseOrderClubDetailsPageURL(props.row.original.original_po_club)} target="_blank" >{poClub}</Link>;
            }
        },
        {
            accessorKey: 'id',
            header: 'Material Transfer',
            cell: props => (
                <Box>
                    <Button variant="outlined" onClick={() => { handleTransferConfirmation('complete_transfer', props.row.original.id, true, props.row.original.material_transfer_status, props.row.original.material_transfer_data) }}  >Transfer</Button>
                </Box>
            ),
            enableSorting: false,
            enableColumnFilter: false,
            enableGlobalFilter: false,
            meta: {
                align: 'center',
                width: 150
            }
        },

    ]

    const getMetaData = () => {
        setIsLoading(true);
        Promise.all([
            api.get(customersURL()),
        ]).then(([customersResp]) => {
            setCustomerData(customersResp.data || []);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false);
        });
    };

    const fetchData = ({
        pageIndex: paramPageIndex,
        pageSize: paramPageSize,
        globalFilter: paramGlobalFilter,
        columnFilters: paramColumnFilters,
        sorting: paramSorting,
        customer: paramCustomer,
    }: {
        pageIndex?: number,
        pageSize?: number,
        globalFilter?: string,
        columnFilters?: Object,
        sorting?: { column: string, direction: string | boolean },
        customer?: number,
    } = {}) => {
        setIsTableLoading(true);
        const pageIndexValue = paramPageIndex !== undefined ? paramPageIndex : pageIndex;
        const pageSizeValue = paramPageSize !== undefined ? paramPageSize : pageSize;
        const globalFilterValue = paramGlobalFilter !== undefined ? paramGlobalFilter : globalFilter;
        const columnFiltersValue = paramColumnFilters !== undefined ? paramColumnFilters : columnFilters;
        const sortingValue = paramSorting !== undefined ? paramSorting : sorting;
        const customerValue = paramCustomer !== undefined ? paramCustomer : selectedCustomer;

        const queryParams = getQueryParams(customerValue, globalFilterValue, columnFiltersValue, sortingValue);

        api.get(inhouseMaterialListURL(pageIndexValue + 1, pageSizeValue, queryParams)).then((resp: any) => {
            setGrnTransferData({ ...resp?.data });
            setTotalCount(resp?.data?.count)
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false);
            setIsTableLoading(false);
        });
    };

    const getQueryParams = (customer: any, globalFilter: any, columnFilters: any, sortingValue: any): string => {
        const params: any = {};
        params['customer_id'] = customer || '';
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

    const handleCustomerOnChange = (event: any, newCustomer: any) => {
        setSelectedCustomer(newCustomer);
        fetchData({ customer: newCustomer });
    };

    const handleOpenMaterialTransferModal = (status: any) => {
        setOpenOtherMaterialTransferModal(status)
    }

    useEffect(() => {
        fetchData();
        getMetaData();
    }, [])

    return (
        <>
            {openOtherMaterialTransferModal && (
                <RitzModal open={openOtherMaterialTransferModal} title='Material Transfer' onClose={() => { handleOpenMaterialTransferModal(false) }} maxWidth={'lg'}>
                   <OtherMaterialTransfer/>
                </RitzModal>
            )}
            {transferModalData?.modalStatus && (
                <RitzModal open={transferModalData?.modalStatus} title='Confirmation' onClose={() => { handleTransferConfirmation(null, false, null, null, {}) }} maxWidth={'lg'}>
                    <TransferConfirmation clubId={transferModalData?.clubId} transferStatus={transferModalData?.transferStatus} transferData={transferModalData?.transferData} />
                </RitzModal>
            )}
            {isLoading ? (
                <DefaultLoader />
            ) : (
                <>
                    <Typography variant='h1'>Material Transfer Dashboard</Typography>
                    <Box>
                        <Typography variant="h5" sx={{ marginBottom: '1em', marginTop: '1em' }}>Customer</Typography>
                        <Box sx={{ display: 'flex' }}>
                            <ToggleButtonGroup
                                color="primary"
                                value={selectedCustomer}
                                exclusive
                                onChange={handleCustomerOnChange}
                                aria-label="Customer"
                                sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}
                            >
                                <ToggleButton
                                    style={{ height: '4em', minWidth: '150px', border: '1px solid #E0E0E0', borderRadius: '5px', display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center', marginBottom: '10px', }} value=''>
                                    All
                                </ToggleButton>
                                {customerdata.map((customer: any) => (
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
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'end', mt: 1, mb: 1 }}>
                        <Button variant="contained" sx={{ mr: 1 }} color="primary" onClick={() => { handleOpenMaterialTransferModal(true);}} >Material Transfer</Button>
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


export default MaterialTransferDashboard;