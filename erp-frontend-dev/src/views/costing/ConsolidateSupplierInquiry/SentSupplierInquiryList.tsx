import api from "@/services/api";
import { Box, Button, Checkbox, Grid, IconButton, Link, Table, TableBody, TableCell, TableHead, TableRow, ToggleButton, ToggleButtonGroup, Typography, useTheme } from "@mui/material";
import React, { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { getDefaultError } from "@/helpers/Utilities";
import { ColumnDef } from '@tanstack/react-table';
import dayjs from "dayjs";
import { ReactKeyHelper } from "@/helpers/KeyHelper";
import DefaultLoader from "@/components/DefaultLoader";
import RitzModal from "@/components/Ritz/RitzModal";
import { consolidateSupplierInquiryDeleteURL, consolidateSupplierInquiryDetailDeleteURL, sendConsolidateSupplierInquiryListURL } from "@/helpers/constants/rest_urls/CostingUrls";
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import RitzTable from "@/components/Ritz/RitzTable";
import EditIcon from '@mui/icons-material/Edit';
import ConsolidateCostModal from "./ConsolidateCostModal";
import DeleteIcon from '@mui/icons-material/Delete';
import { getActiveSuppliersURL, getConsumptionUnits, getCostPerUnitTypesURL, getTransportTypesURL, supplierInquirySendEmailURL } from "@/helpers/constants/rest_urls/SupplierUrls";
import ReviewStatus from "@/components/OrderInquiry/Costing/ReviewStatus";
import { DEFAULT_SUCCESS } from "@/helpers/constants/Constants";
import RitzToolTip from "@/components/Ritz/RitzTooltip";
import DoneAllIcon from '@mui/icons-material/DoneAll';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import { paymentModesListURL } from "@/helpers/constants/rest_urls/FinanceUrls";
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import SaveSpinner from "@/components/SaveSpinner";

const SentSupplierInquiryList = () => {
    const theme = useTheme();
    const keyHelper = new ReactKeyHelper();
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState({ is_sending: false, is_moving: false });
    const [sendCosolidateSupplierInquiryList, setSendCosolidateSupplierInquiryList] = useState<any>({})
    const [costEnterModal, setCostEnterModal] = useState<any>({})
    const [consolidateStatusTypes, setConsolidateStatusTypes] = useState<any>([{ id: 'all', name: 'All' }, { id: 'pending_email', name: 'Pending Email' }, { id: 'pending', name: 'Pending' }, { id: 'reviewed', name: 'Reviewed' }])
    const [selectedType, setSelectedType] = useState('all');
    const [isOpenDeleteConfirmationModal, setIsOpenDeleteConfirmationModal] = useState<any>({});
    const [metaData, setMetaData] = useState<any>({
        suppliers: [],
        shipModes: [],
        costingTypes: [],
        costPerUnitTypes: [],
    });
    const [selectedInquiries, setSelectedInquiries] = useState<any>([]);

    // Table states
    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(5);
    const [totalCount, setTotalCount] = useState(0);
    const [sorting, setSorting] = useState({});
    const [globalFilter, setGlobalFilter] = useState('');
    const [columnFilters, setColumnFilters] = useState({});
    const [isTableLoading, setIsTableLoading] = useState(false);
    const tableRef = useRef(null);

    const handleRowExpand = (row: any) => {
        row.toggleExpanded();
    }

    const handleOpenEnterCostModal = (status: any, inquiryId: any) => {
        setCostEnterModal({ modalStatus: status, selectedInquiryId: inquiryId })
    }

    const handleDeleteSupplierInquiry = (status: any, inquiryId: any) => {

    }

    const columns: ColumnDef<any>[] = (() => {
        const baseColumns: ColumnDef<any>[] = [
            {
                accessorKey: "supplier_id",
                header: '',
                cell: ({ row }) => (
                    <span style={{ paddingLeft: `${row.depth * 2}rem` }}>
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                            <IconButton
                                size="small"
                                onClick={() => handleRowExpand(row)}
                                style={{ cursor: "pointer" }}
                            >
                                {row.getIsExpanded() ? (
                                    <KeyboardArrowDownIcon />
                                ) : (
                                    <KeyboardArrowRightIcon />
                                )}
                            </IconButton>
                        </Box>
                    </span>
                ),
                enableSorting: false,
                enableColumnFilter: false,
                enableGlobalFilter: false,
                meta: {
                    align: "left",
                    width: 95,
                },
            },
            {
                id: 'display_number',
                accessorFn: (row: any) => row.display_number,
                header: 'Supplier Inquiry No',
            },
        ];

        const checkboxColumn: ColumnDef<any> = {
            id: 'select',
            header: '',
            cell: ({ row }) => (
                <span style={{ paddingLeft: `${row.depth * 2}rem`, width: '20px' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Checkbox
                            size='small'
                            checked={row.getIsSelected()}
                            indeterminate={row.getIsSomeSelected()}
                            onChange={row.getToggleSelectedHandler()}
                        />
                    </Box>
                </span>
            ),
            enableSorting: false,
            enableColumnFilter: false,
            enableGlobalFilter: false,
            meta: {
                width: 40,
                align: "center",
            },
        };

        const restColumns: ColumnDef<any>[] = [
            {
                id: 'supplier_name',
                accessorFn: (row: any) => row.supplier_name,
                header: 'Supplier',
            },
            {
                id: 'material_details.material_label',
                accessorFn: (row: any) => row.material_details?.material_label,
                header: 'Material',
            },
            {
                id: 'material_details.ritz_customer_brand_reference_code',
                accessorFn: (row: any) => row.material_details?.ritz_customer_brand_reference_code,
                header: 'Ritz Reference Code',
                cell: ({ row }) => (
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                        {row?.original?.material_details?.ritz_customer_brand_reference_code}
                        <RitzToolTip
                            materialHeaders={row?.original?.headers}
                            materialDetails={row?.original?.material_details}
                        />
                    </Box>
                ),
            },
            {
                id: 'create_date',
                accessorFn: (row: any) => row?.create_date,
                header: 'Created Date',
            },
            {
                accessorKey: "supplier_id",
                header: 'Action',
                cell(props) {
                    return (
                        <Box>
                            <IconButton
                                onClick={() => handleOpenEnterCostModal(true, props?.row?.original?.id)}
                                size='small'
                                color="primary"
                            >
                                <EditIcon fontSize='inherit' />
                            </IconButton>
                            <IconButton
                                onClick={() => handleOpenDeleteConfirmationModal(true, props?.row?.original?.id, 'supplier_inquiry')}
                                size='small'
                                color="primary"
                            >
                                <DeleteIcon color="error" fontSize='inherit'  />
                            </IconButton>
                        </Box>
                    );
                },
                enableSorting: false,
                enableColumnFilter: false,
                enableGlobalFilter: false,
                meta: {
                    align: "left",
                    width: 95,
                },
            },
        ];
        if (selectedType === 'pending_email') {
            baseColumns.splice(1, 0, checkboxColumn);
        }
        return [...baseColumns, ...restColumns];
    })();

    const getRowCanExpand = (row: any) => {
        const subRows = row?.original?.subRows || [];
        return subRows.length > 0;
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

    const getMetaData = () => {
        Promise.all([
            // api.get(getActiveSuppliersURL()),
            api.get(getConsumptionUnits()),
            api.get(getCostPerUnitTypesURL()),
            api.get(getTransportTypesURL()),
            api.get(paymentModesListURL()),
        ]).then(([
            // suppliers, 
            consumptionUnits, costPerUnits, transportTypes, payModes]) => {
            setMetaData((prev: any) => ({
                ...prev,
                // suppliers: suppliers.data,
                consumptionUnits: consumptionUnits.data,
                costPerUnitTypes: costPerUnits.data,
                shipModes: transportTypes.data,
                payModes: payModes.data
            }));
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        });
    };

    const resetStates = () => {
        setPageIndex(0);
        setPageSize(5);
        setTotalCount(0);
        setGlobalFilter('');
        setColumnFilters([]);
        setSendCosolidateSupplierInquiryList({});
        setIsTableLoading(false);
    }

    const fetchData = ({
        pageIndex: paramPageIndex,
        pageSize: paramPageSize,
        globalFilter: paramGlobalFilter,
        columnFilters: paramColumnFilters,
        sorting: paramSorting,
        consolidateType: paramType
    }: {
        pageIndex?: number,
        pageSize?: number,
        globalFilter?: string,
        columnFilters?: Object,
        sorting?: { column: string, direction: string | boolean },
        consolidateType?: number
    } = {}) => {
        setIsTableLoading(true);
        setSelectedInquiries([]);
        const pageIndexValue = paramPageIndex !== undefined ? paramPageIndex : pageIndex;
        const pageSizeValue = paramPageSize !== undefined ? paramPageSize : pageSize;
        const globalFilterValue = paramGlobalFilter !== undefined ? paramGlobalFilter : globalFilter;
        const columnFiltersValue = paramColumnFilters !== undefined ? paramColumnFilters : columnFilters;
        const sortingValue = paramSorting !== undefined ? paramSorting : sorting;
        const status = paramType !== undefined ? paramType : selectedType;

        const queryParams = getQueryParams(globalFilterValue, columnFiltersValue, sortingValue);

        api.get((pageIndexValue + 1, pageSizeValue, status, queryParams)).then((resp: any) => {
            setTotalCount(resp?.data?.count)
            setSendCosolidateSupplierInquiryList({ ...resp?.data });
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsTableLoading(false);
            setIsLoading(false);
        });
    };

    const handleOpenDeleteConfirmationModal = (status: any, deleteId: any, type: any) => {
        setIsOpenDeleteConfirmationModal({ modalStatus: status, selectedId: deleteId, type: type });
    }

    const handleConfirmDelete = () => {
        const request = {
            method: 'delete',
            url: isOpenDeleteConfirmationModal?.type === 'supplier_inquiry_detail' ? consolidateSupplierInquiryDetailDeleteURL(isOpenDeleteConfirmationModal?.selectedId) : consolidateSupplierInquiryDeleteURL(isOpenDeleteConfirmationModal?.selectedId),
        }
        api(request).then(resp => {
            const responseData = resp?.data || [];
            toast.success(DEFAULT_SUCCESS);
            handleOpenDeleteConfirmationModal(false, null, null);
            fetchData()
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
        });
    };

    const renderSubRow = ({ row }: any) => {
        const subRows = row?.original?.supplier_inquiry_details || [];
        return (
            <Table
                size='small'
                sx={{
                    borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`,
                    '& .MuiTableCell-head': {
                        color: (theme) => theme.palette.grey[700],
                        background: (theme) => theme.palette.grey[50],
                        // fontWeight: 'normal'
                        width: '200px'
                    }
                }}
            >
                <TableHead>
                    <TableRow>
                        <TableCell align='center' />
                        <TableCell>Supplier</TableCell>
                        <TableCell>FOB</TableCell>
                        <TableCell>CIF</TableCell>
                        <TableCell>Costing Unit</TableCell>
                        <TableCell>Cost per Unit</TableCell>
                        <TableCell><abbr title="Expiration">Exp.</abbr> Date</TableCell>
                        <TableCell align='center'>Action</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {subRows?.length > 0 ? (subRows.map((d: any, i: number) => (
                        <TableRow
                            key={i}
                            sx={{
                                '&:last-child td, &:last-child th': {
                                    border: 0,
                                }
                            }}
                        >
                            <TableCell align='center' sx={{ width: '2%' }}><ReviewStatus status={d?.completed} /></TableCell>
                            <TableCell>{d?.supplier_name ?? '--'}</TableCell>
                            <TableCell>{'--'}</TableCell>
                            <TableCell>{d?.cif_price ?? '--'}</TableCell>
                            <TableCell>{d?.costing_unit_display ?? '--'}</TableCell>
                            <TableCell>{'--'}</TableCell>
                            <TableCell>{d?.expiration_date ? dayjs(d?.expiration_date).format('DD/MM/YYYY') : '--'}</TableCell>
                            <TableCell align='center'>
                                <IconButton size='small' onClick={() => { handleOpenDeleteConfirmationModal(true, d?.id, 'supplier_inquiry_detail' )}}>
                                    <DeleteIcon fontSize='inherit'  color="error" />
                                </IconButton>
                            </TableCell>
                        </TableRow>
                    ))) : (
                        <TableRow
                            sx={{
                                '&:last-child td, &:last-child th': {
                                    border: 0,
                                }
                            }}
                        > <TableCell sx={{ textAlign: 'center' }} colSpan={8}>No available supplier inquiry .</TableCell></TableRow>
                    )}
                </TableBody>
            </Table>
        )
    }

    const handleTypeOnChange = (event: any, newCustomer: any) => {
        setSelectedType(newCustomer || 'all');
        fetchData({ consolidateType: newCustomer || 'all' });
    };
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
    const onRowSelect = (selection: any) => {
        const selectedIndexes = Object.keys(selection).map((i: any) => +i);
        const selectedData = selectedIndexes.map((i: number) => sendCosolidateSupplierInquiryList?.results[i]);
        const supplierInquiryIds = selectedData?.map((i: any) => i.id);
        setSelectedInquiries(supplierInquiryIds);
    }
    const handleSendEmail = (type: any) => {
        setIsSending({
            is_sending: type === 'send_email' ? true : false,
            is_moving: type === 'move_to_pending' ? true : false,
        });
        const request = {
            method: 'post',
            url: supplierInquirySendEmailURL(),
            data: {
                type: type,
                inquiry_ids: selectedInquiries
            }
        };
        api(request).then((resp) => {
            const resdata = resp?.data || [];
            fetchData();
            toast.success(DEFAULT_SUCCESS);
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsSending({ is_sending: false, is_moving: false }));
    }

    useEffect(() => {
        resetStates();
        getMetaData();
        fetchData();
    }, []);

    return (
        <>
            {costEnterModal?.modalStatus && (
                <RitzModal open={costEnterModal?.modalStatus} title='Enter Costs' onClose={() => { handleOpenEnterCostModal(false, null) }} maxWidth={false}>
                    <ConsolidateCostModal inquiryId={costEnterModal?.selectedInquiryId} metaDataSet={metaData} isDisabledSupplier={true} refreshData={() => { handleOpenEnterCostModal(false, null), fetchData() }} />
                </RitzModal>
            )}
            {isOpenDeleteConfirmationModal?.modalStatus && (
                <RitzModal open={isOpenDeleteConfirmationModal?.modalStatus} title='Confirmation' onClose={() => { handleOpenDeleteConfirmationModal(false, null, null) }} maxWidth={'sm'}>
                    Are you sure you want to delete this ?
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'end' }}>
                        <Button variant="contained" onClick={handleConfirmDelete} >Ok</Button>
                        <Button variant="contained" color='secondary' onClick={() => { handleOpenDeleteConfirmationModal(false, null, null) }} style={{ marginLeft: '10px' }} >Close</Button>
                    </Box>
                </RitzModal>
            )}

            {isLoading ? (
                <DefaultLoader />
            ) : (
                <>
                    <Box>
                        <Typography variant='h1' color='text.primary'>Supplier Inquiries</Typography>
                    </Box>
                    <ToggleButtonGroup
                        color="primary"
                        value={selectedType}
                        exclusive
                        onChange={handleTypeOnChange}
                        aria-label="Customer"
                        sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}
                    >
                        {consolidateStatusTypes?.map((type: any) => (
                            <ToggleButton key={type.id} style={{
                                height: '4em',
                                minWidth: '150px',
                                border: '1px solid #E0E0E0',
                                borderRadius: '5px',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                textAlign: 'center',
                                marginBottom: '10px',
                            }} value={type.id}>
                                <Box display="flex" alignItems="center" gap={1}>
                                    {type.name}
                                    {type.id === 'pending' ? <PendingActionsIcon sx={{ color: "error.main" }} /> :
                                        type.id === 'reviewed' ? <DoneAllIcon sx={{ color: "green" }} /> :
                                             type.id === 'pending_email' ? <HourglassTopIcon sx={{ color: "primary.main" }} /> :
                                            <FormatListBulletedIcon />}
                                </Box>
                            </ToggleButton>
                        ))}
                    </ToggleButtonGroup>
                    <Box sx={{ mt: 1 }}>
                        {selectedType === 'pending_email' && (
                            <Box sx={{ display: 'flex', justifyContent: 'end', mb: 2 }}>
                                <Button variant="contained" sx={{ mr: 1 }} color="primary" onClick={() => { handleSendEmail('send_email') }} disabled={!selectedInquiries?.length || isSending?.is_sending}>{isSending?.is_sending && <SaveSpinner />}Send Email {selectedInquiries?.length > 0 && <span style={{ marginLeft: '.25rem' }}>({selectedInquiries?.length})</span>}</Button>
                                <Button variant="contained" color="primary" onClick={() => { handleSendEmail('move_to_pending') }} disabled={!selectedInquiries?.length || isSending?.is_moving} >{isSending?.is_moving && <SaveSpinner />}Move To Pending {selectedInquiries?.length > 0 && <span style={{ marginLeft: '.25rem' }}>({selectedInquiries?.length})</span>}</Button>
                            </Box>
                        )}
                        <RitzTable
                            data={sendCosolidateSupplierInquiryList?.results}
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
                            getRowCanExpand={getRowCanExpand}
                            renderSubComponent={renderSubRow}
                            onRowSelect={onRowSelect}
                            multiRowSelect
                            rowSelect
                        />
                    </Box>
                </>
            )}
        </>
    );
};

export default SentSupplierInquiryList;