import api from "@/services/api";
import { Box, Button, Grid, Link, Table, TableBody, TableCell, TableHead, TablePagination, TableRow, ToggleButton, ToggleButtonGroup, Typography, useTheme } from "@mui/material";
import React, { useEffect, useRef, useState } from "react";
import * as RestUrls from '@/helpers/constants/RestUrls';
import toast from "react-hot-toast";
import { getDefaultError } from "@/helpers/Utilities";
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from "dayjs";
import Checkbox from '@mui/material/Checkbox';
import { ReactKeyHelper } from "@/helpers/KeyHelper";
import DefaultLoader from "@/components/DefaultLoader";
import RitzModal from "@/components/Ritz/RitzModal";
import SendingSupplierInquiryDetails from "./SendingSupplierInquiryDetails";
import { consolidateSupplierInquiryMaterialListURL } from "@/helpers/constants/rest_urls/CostingUrls";
import CustomerBrandMaterialDetail from "@/views/settings/userdefine_material/MaterialDetail";
import ControlPointIcon from '@mui/icons-material/ControlPoint';
import { ColumnDef } from '@tanstack/react-table';
import RitzTable from "@/components/Ritz/RitzTable";
import ConsolidateEnterCostModal from "./ConsolidateEnterCostModal";
import { getActiveSuppliersURL, getConsumptionUnits, getCostPerUnitTypesURL, getTransportTypesURL } from "@/helpers/constants/rest_urls/SupplierUrls";
import { paymentModesListURL } from "@/helpers/constants/rest_urls/FinanceUrls";

const CostingMaterialList = () => {
    const theme = useTheme();
    const keyHelper = new ReactKeyHelper();
    const tableRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [openSupplierInquiryModal, setOpenSupplierInquiryModal] = useState(false);
    const [selectedMaterials, setSelectedMaterials] = useState<any>([]);
    const materialCategories = [{ id: "fabric", name: "Fabric" }, { id: "sewing_trim", name: "Sewing Trims" }, { id: "packaging_trim", name: "Packaging" }];
    const [selectedFilterData, setSelectedFilterData] = useState<any>({
        customer: null,
        material_category: [],
        from_date: dayjs().format("YYYY-MM-DD"),
        to_date: dayjs().add(7, "day").format("YYYY-MM-DD"),
    });
    const [metaData, setMetaData] = useState<any>({
        customers: [],
        suppliers: [],
        shipModes: [],
        costingTypes: [],
        costPerUnitTypes: [],
    });
    console.log(metaData,'metaData')
    const [openMaterialDetailModal, setOpenMaterialDetailModal] = useState<any>({})
    const [openMaterialCostEnterModal, setOpenMaterialCostEnterModal] = useState<any>({})
    const [costingMaterislList, setCostingMaterislList] = useState<any>({});
    //tableStates
    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(5);
    const [totalCount, setTotalCount] = useState(0);
    const [sorting, setSorting] = useState({});
    const [globalFilter, setGlobalFilter] = useState('');
    const [columnFilters, setColumnFilters] = useState({});
    const [isTableLoading, setIsTableLoading] = useState(false);

    const isAllChecked = selectedMaterials.length === costingMaterislList?.results?.length;

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: "id",
            header: <Checkbox
                checked={isAllChecked}
                onChange={(e: any) => handleCheckAll(e.target.checked)} /> as any,
            enableSorting: false,
            enableColumnFilter: false,
            enableGlobalFilter: false,
            cell: props => (
                <Checkbox
                    checked={selectedMaterials.includes(props.row.original?.material_details?.customer_brand_material_id)}
                    onChange={(e) => handleCheckboxChange(e.target.checked, props.row.original?.material_details?.customer_brand_material_id)}
                />
            ),
            meta: {
                align: 'center',
                width: 100
            }
        },
        {
            accessorKey: 'material_details.ritz_customer_brand_reference_code',
            header: 'Material',
        },
        {
            accessorKey: 'material_details.material_label',
            header: 'Mateiral Category',
        },
        {
            accessorKey: 'material_details.reference_code',
            header: 'Material Reference Code',
        },
        {
            accessorKey: 'displayName',
            header: 'Enter Cost',
            cell: props => (
                <Box>
                    <Button onClick={() => { handleOpenEnterCostModal(true, props?.row?.original?.headers, props?.row?.original?.material_details) }}  >
                        <ControlPointIcon />
                    </Button>
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
    ];

    const getMetaData = () => {
        console.log("Inside")
        Promise.all([
            api.get(RestUrls.customersURL()),
            api.get(getActiveSuppliersURL()),
            // api.get(getConsumptionUnits()),
            // api.get(getCostPerUnitTypesURL()),
            // api.get(getTransportTypesURL()),
            // api.get(paymentModesListURL()),
        ]).then(([customers, suppliers, 
            // consumptionUnits,
            //  costPerUnits, 
            //  transportTypes, 
            //  paymentMethods
            ]) => {
            console.log("Customers response:", customers);
            setMetaData((prev: any) => ({
                ...prev,
                customers: customers.data,
                suppliers: suppliers.data,
                // consumptionUnits: consumptionUnits.data,
                // costPerUnitTypes: costPerUnits.data,
                // shipModes: transportTypes.data,
                // payModes: paymentMethods.data
            }));
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false);
        });
    };

    const fetchTableData = ({
        pageIndex: paramPageIndex,
        pageSize: paramPageSize,
        globalFilter: paramGlobalFilter,
        columnFilters: paramColumnFilters,
        sorting: paramSorting,
        customer: paramCustomer,
        materialCategories: paramMaterialCategories,
        fromDate: paramfromDate,
        toDate: paramToDate,
    }: {
        pageIndex?: number,
        pageSize?: number,
        globalFilter?: string,
        columnFilters?: Object,
        sorting?: { column: string, direction: string | boolean },
        customer?: string | null,
        materialCategories?: string[],
        fromDate?: string,
        toDate?: string,
    } = {}) => {
        setSelectedMaterials([])
        setIsTableLoading(true);
        const pageIndexValue = paramPageIndex !== undefined ? paramPageIndex : pageIndex;
        const pageSizeValue = paramPageSize !== undefined ? paramPageSize : pageSize;
        const globalFilterValue = paramGlobalFilter !== undefined ? paramGlobalFilter : globalFilter;
        const columnFiltersValue = paramColumnFilters !== undefined ? paramColumnFilters : columnFilters;
        const sortingValue = paramSorting !== undefined ? paramSorting : sorting;
        const customer = paramCustomer !== undefined ? paramCustomer : selectedFilterData?.customer;
        const materialCategories = paramMaterialCategories !== undefined ? paramMaterialCategories : selectedFilterData?.material_category;
        const fromDate = paramfromDate !== undefined ? paramfromDate : selectedFilterData?.from_date;
        const toDate = paramToDate !== undefined ? paramToDate : selectedFilterData?.to_date;

        const queryParams = getQueryParams(customer, materialCategories, fromDate, toDate, globalFilterValue, columnFiltersValue, sortingValue);

        api.get(consolidateSupplierInquiryMaterialListURL(pageIndexValue + 1, pageSizeValue, queryParams)).then((resp: any) => {
            setCostingMaterislList({ ...resp.data })
            setTotalCount(resp?.data?.count)
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsTableLoading(false);
        });
    };
    const getQueryParams = (customer: string, materialCategories: string[], fromDate: any, toDate: any, globalFilter: any, columnFilters: any, sortingValue: any): string => {
        const params: any = {};
        params['customer_id'] = customer || '';

        params['from_date'] = fromDate || '';

        params['to_date'] = toDate || '';

        params['material_categories'] = materialCategories || '';
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

        if (Object.keys(params).length) {
            return new URLSearchParams(params).toString();
        }
        return '';
    };

    const handleOpenEnterCostModal = (status: any, materialHeaders: any, materialDetails: any) => {
        setOpenMaterialCostEnterModal({
            modalStatus: status,
            selectedMaterial: {
                materialHeaders: materialHeaders || [],
                materialData: materialDetails || {}
            }
        });
    }

    const handleCustomerOnChange = (event: any, newValue: any) => {
        if (newValue !== null) {
            setSelectedFilterData((prev: any) => ({
                ...prev,
                customer: newValue,
            }));
            fetchTableData({ customer: newValue });
        }

    };
    const handleMaterialOnChange = (event: any, newValue: any) => {
        if (newValue !== null) {
            setSelectedFilterData((prev: any) => ({
                ...prev,
                material_category: newValue,
            }));
            fetchTableData({ materialCategories: newValue });
        }
    };

    const handleSearchValue = (value: string, field: string) => {
        let updatedFromDate = selectedFilterData?.from_date;
        let updatedToDate = selectedFilterData?.to_date;
        if (field === "from_date") {
            updatedFromDate = value;
            updatedToDate = dayjs(value).add(7, "day").format("YYYY-MM-DD");
        } else if (field === "to_date") {
            updatedToDate = value;
        }
        setSelectedFilterData((prev: any) => ({
            ...prev,
            [field]: value,
            ...(field === "from_date" && {
                to_date: updatedToDate,
            }),
        }));
        fetchTableData({
            fromDate: updatedFromDate,
            toDate: updatedToDate,
        });
    };
    const handleCheckboxChange = (isChecked: boolean, materialId: number) => {
        setSelectedMaterials((prev: number[]) =>
            isChecked ? [...prev, materialId] : prev.filter((id) => id !== materialId)
        );
    };

    const handleCheckAll = (isChecked: boolean) => {
        if (isChecked) {
            setSelectedMaterials(costingMaterislList?.results.map((material: any) => material.id) || []);
        } else {
            setSelectedMaterials([]);
        }
    };

    const handleOpenSupplierInquirySendModal = (status: any) => {
        setOpenSupplierInquiryModal(status);
    }

    const handlePageNumberChange = (pageIndex: number) => {
        setPageIndex(pageIndex);
        fetchTableData({ pageIndex: pageIndex });
    }

    const handlePageSizeChange = (pageSize: number) => {
        setPageIndex(0);
        setPageSize(pageSize);
        fetchTableData({ pageIndex: 0, pageSize: pageSize });
    }

    const handleTableSearch = (search: string) => {
        setPageIndex(0);
        tableRef.current.setPageIndex(0);
        setGlobalFilter(search?.trim());
        fetchTableData({ pageIndex: 0, globalFilter: search?.trim() });
    }

    const handleTableFilterSearch = (filters: any) => {
        setPageIndex(0);
        tableRef.current.setPageIndex(0);
        setColumnFilters(filters);
        fetchTableData({ columnFilters: filters });
    }

    const handleSortingChange = (sorting: any) => {
        setPageIndex(0);
        tableRef.current.setPageIndex(0);
        setSorting(sorting);
        fetchTableData({ sorting: sorting });
    }
   
    const resetStates = () => {
        setPageIndex(0);
        setPageSize(50);
        setTotalCount(0);
        setGlobalFilter('');
        setCostingMaterislList({});
        setIsTableLoading(false);
      }

    useEffect(() => {
        resetStates();
        getMetaData();
        fetchTableData();
    }, []);

    return (
        <>
            {openMaterialDetailModal.modalStatus && (
                <CustomerBrandMaterialDetail
                    customerBrandMaterialReferenceCodeId={openMaterialDetailModal?.selectedMaterialId}
                    modalOpen={openMaterialDetailModal.modalStatus}
                    setModalOpen={() => { setOpenMaterialDetailModal({ modalStatus: false, selectedMaterialId: null }) }}
                />
            )}
            {openMaterialCostEnterModal?.modalStatus && (
                <RitzModal
                    onClose={() => handleOpenEnterCostModal(false, [], {})}
                    title={"Enter Cost"}
                    open={openMaterialCostEnterModal?.modalStatus}
                    maxWidth={false}
                    fullWidth={true}
                >
                    <ConsolidateEnterCostModal materialDetails={openMaterialCostEnterModal?.selectedMaterial} metaDataSet={metaData} refreshData={() => { handleOpenEnterCostModal(false, [], {}), fetchTableData() }} />
                </RitzModal>
            )}
            {openSupplierInquiryModal && (
                <RitzModal
                    onClose={() => handleOpenSupplierInquirySendModal(false)}
                    title={"Send Inquiry"}
                    open={openSupplierInquiryModal}
                    maxWidth={false}
                    fullWidth={true}
                >
                    <SendingSupplierInquiryDetails selectedMaterials={selectedMaterials} refreshData={() => { handleOpenSupplierInquirySendModal(false) }} />
                </RitzModal>
            )}
            {isLoading ? (
                <DefaultLoader />
            ) : (
                <>
                    <Box>
                        <Typography variant='h1' color='text.primary'>Costing Materials</Typography>
                    </Box>
                    <Box>
                        <Typography variant="h5" sx={{ marginBottom: '1em', marginTop: '1em' }}>Customer</Typography>
                        <Box sx={{ display: 'flex' }}>
                            <ToggleButtonGroup
                                color="primary"
                                value={selectedFilterData?.customer || 0}
                                exclusive
                                onChange={handleCustomerOnChange}
                                aria-label="Customer"
                                sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}
                            >
                                <ToggleButton
                                    style={{ height: '4em', minWidth: '150px', border: '1px solid #E0E0E0', borderRadius: '5px', display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center', marginBottom: '10px', }} value={0}>
                                    All
                                </ToggleButton>
                                {metaData?.customers.map((customer: any) => (
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
                    <Box>
                        <Typography variant="h5" sx={{ marginBottom: '1em', marginTop: '1em' }}>Material Category</Typography>
                        <Box sx={{ display: 'flex' }}>
                            <ToggleButtonGroup
                                color="primary"
                                value={selectedFilterData?.material_category}
                                onChange={handleMaterialOnChange}
                                aria-label="Material Categories"
                                sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}
                            >
                                {materialCategories.map((category: any) => (
                                    <ToggleButton key={category.id} style={{ height: '4em', minWidth: '150px', border: '1px solid #E0E0E0', borderRadius: '5px', display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center', marginBottom: '10px', }}
                                        value={category.id}>
                                        {category.name}
                                    </ToggleButton>
                                ))}
                            </ToggleButtonGroup>
                        </Box>
                    </Box>
                    <Box>
                        <Grid container alignItems="center" spacing={4}>
                            <Grid item xs={12} sm={6} md={2}>
                                <Typography variant="h5" sx={{ marginBottom: '1em', marginTop: '1em' }}>From Date</Typography>
                                <LocalizationProvider dateAdapter={AdapterDayjs}>
                                    <DatePicker
                                        format='DD/MM/YYYY'
                                        value={selectedFilterData.from_date ? dayjs(selectedFilterData.from_date) : null}
                                        onChange={(e: any) => handleSearchValue(dayjs(e.$d).format('YYYY-MM-DD'), 'from_date')}
                                    />
                                </LocalizationProvider>

                            </Grid>
                            <Grid item xs={12} sm={6} md={2}>
                                <Typography variant="h5" sx={{ marginBottom: '1em', marginTop: '1em' }}>To Date</Typography>
                                <LocalizationProvider dateAdapter={AdapterDayjs}>
                                    <DatePicker
                                        format='DD/MM/YYYY'
                                        value={selectedFilterData.to_date ? dayjs(selectedFilterData.to_date) : null}
                                        onChange={(e: any) => handleSearchValue(dayjs(e.$d).format('YYYY-MM-DD'), 'to_date')}
                                    />
                                </LocalizationProvider>

                            </Grid>
                        </Grid>
                    </Box>
                    <Box sx={{ mt: 5, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button disabled={selectedMaterials?.length === 0} onClick={() => { handleOpenSupplierInquirySendModal(true) }} variant="contained">Send Inquiry</Button>
                    </Box>
                    <Box sx={{ mt: 1 }}>
                        <RitzTable
                            data={costingMaterislList?.results}
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

export default CostingMaterialList;