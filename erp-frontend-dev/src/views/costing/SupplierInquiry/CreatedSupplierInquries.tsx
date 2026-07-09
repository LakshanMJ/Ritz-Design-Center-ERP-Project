import { useEffect, useRef, useState } from "react";
import api from "@/services/api";
import { toast } from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';
import { Box, Button, InputLabel } from "@mui/material";
import { DEFAULT_SUCCESS } from "@/helpers/constants/Constants";
import { prevoiusCreatedSupplierInquiryListURL, supplierInquiryRelatedMaterialListURL, supplierInquryCopyURL } from "@/helpers/constants/rest_urls/CostingUrls";
import RitzTable from "@/components/Ritz/RitzTable";
import { ColumnDef } from "@tanstack/react-table";
import Checkbox from '@mui/material/Checkbox';
import DefaultLoader from "@/components/DefaultLoader";
import RitzSwitch from "@/components/Ritz/RitzSwitch";
import RitzSearchableServerRender from "@/components/Ritz/RitzSearchableServerRender";

const CreatedSupplierInquries = ({ customerBrandMaterialId, versionId, refreshData }: any) => {
    const tableRef = useRef(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [createdInquiries, setCreatedInquiries] = useState<any>({})
    const [selectedInquiries, setSelectedInquiries] = useState<any>([])
    const [costingInquiryStatus, setCostingInquiryStatus] = useState(false);
    const [selectMaterial, setSelectMaterial] = useState(customerBrandMaterialId);
    const [materials, setMaterials] = useState<any>([])
    //tableStates
    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(50);
    const [totalCount, setTotalCount] = useState(0);
    const [sorting, setSorting] = useState({});
    const [globalFilter, setGlobalFilter] = useState('');
    const [columnFilters, setColumnFilters] = useState({});
    const [isTableLoading, setIsTableLoading] = useState(false);

    const isAllChecked = selectedInquiries.length === createdInquiries?.results?.length;
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
                    checked={selectedInquiries.includes(props.row.original?.id)}
                    onChange={(e) => handleCheckboxChange(e.target.checked, props.row.original?.id)}
                />
            ),
            meta: {
                align: 'center',
                width: 100
            }
        },
        {
            accessorKey: 'supplier_name',
            header: 'Supplier',
        },
        {
            accessorKey: 'supplier_material_reference_code',
            header: 'Supplier Reference Code',
        },
        {
            accessorKey: 'ritz_customer_brand_reference_code',
            header: 'Customer Brand Material',
        },
        {
            accessorKey: 'cost_per_unit',
            header: 'Cost Per Unit',
            cell(props) {
                return (
                    <>
                        {props?.row?.original?.cost_per_unit}   {props?.row?.original?.costing_unit_display}
                    </>
                )
            },
        },
        {
            accessorKey: 'lead_time',
            header: 'Lead Time',
        },
    ]
    const handleCheckAll = (isChecked: boolean) => {
        if (isChecked) {
            setSelectedInquiries(createdInquiries?.results.map((inquiry: any) => inquiry.id) || []);
        } else {
            setSelectedInquiries([]);
        }
    };

    const handleCheckboxChange = (isChecked: boolean, inquiryId: number) => {
        setSelectedInquiries((prev: number[]) =>
            isChecked ? [...prev, inquiryId] : prev.filter((id) => id !== inquiryId)
        );
    };

    const onSubmit = () => {
        setIsSaving(true);
        const savePayload ={
            selected_material_id: selectMaterial,
            supplier_inquiries: selectedInquiries,
        }
        api.post(supplierInquryCopyURL(versionId, customerBrandMaterialId), savePayload).then(resp => {
            toast.success(DEFAULT_SUCCESS);
            refreshData();
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsSaving(false);
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

        if (Object.keys(params).length) {
            return new URLSearchParams(params).toString();
        }
        return '';
    };
    const fetchData = ({
        pageIndex: paramPageIndex,
        pageSize: paramPageSize,
        globalFilter: paramGlobalFilter,
        columnFilters: paramColumnFilters,
        sorting: paramSorting,
        isCostingInquiries: paramCostingInquiries,
        material: paramMaterial
    }: {
        pageIndex?: number,
        pageSize?: number,
        globalFilter?: string,
        columnFilters?: Object,
        sorting?: { column: string, direction: string | boolean },
        isCostingInquiries?: boolean,
        material?: number
    } = {}) => {
        setIsTableLoading(true)
        const pageIndexValue = paramPageIndex !== undefined ? paramPageIndex : pageIndex;
        const pageSizeValue = paramPageSize !== undefined ? paramPageSize : pageSize;
        const globalFilterValue = paramGlobalFilter !== undefined ? paramGlobalFilter : globalFilter;
        const columnFiltersValue = paramColumnFilters !== undefined ? paramColumnFilters : columnFilters;
        const sortingValue = paramSorting !== undefined ? paramSorting : sorting;
        const isCostingInquiryValue = paramCostingInquiries !== undefined ? paramCostingInquiries : costingInquiryStatus;
        const material = paramMaterial !== undefined ? paramMaterial : selectMaterial;
        const queryParams = getQueryParams(globalFilterValue, columnFiltersValue, sortingValue);

        Promise.all([
            api.get(prevoiusCreatedSupplierInquiryListURL(material, isCostingInquiryValue, pageIndexValue + 1, pageSizeValue, queryParams))
        ]).then(([createdSupplierInquiries]) => {
            setCreatedInquiries({ ...createdSupplierInquiries.data })
            setTotalCount(createdSupplierInquiries?.data?.count)
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsTableLoading(false);
            setIsLoading(false);
        });
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
   
    const resetStates = () => {
        setPageIndex(0);
        setPageSize(50);
        setTotalCount(0);
        setGlobalFilter('');
        setCreatedInquiries({});
        setIsTableLoading(false);
        setSelectedInquiries([])
      }

    useEffect(() => {
        if (customerBrandMaterialId) {
            resetStates()
            fetchData({ material: customerBrandMaterialId });
        }
    }, [customerBrandMaterialId]);

    return (
        <>
            {isLoading ? (
                <DefaultLoader />
            ) : (
                <>
                    <Box>
                        <RitzSwitch 
                            name="Is show all Costing Inquiries" 
                            status={costingInquiryStatus} 
                            handleChangeSwitch={(event: any) => {setCostingInquiryStatus(event.target.checked), fetchData({ isCostingInquiries: event.target.checked })}} 
                        />
                    </Box>
                    <Box>
                        <InputLabel>Material</InputLabel>
                            <RitzSearchableServerRender
                                id={"materials"}
                                name={"materials"}
                                optionValue={"id"}
                                optionText={"ritz_customer_brand_reference_code"}
                                selectedValue={selectMaterial}
                                isRequired={true}
                                handleOnChange={(selectedOrderID: any) =>{setSelectMaterial(selectedOrderID || customerBrandMaterialId),  fetchData({ material: selectedOrderID });}}
                                optionUrl={(searchtext: string) => supplierInquiryRelatedMaterialListURL(customerBrandMaterialId, searchtext)}
                            />
                    </Box>
                    <Box>
                        <RitzTable

                            data={createdInquiries?.results}
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
                        <Box display="flex" justifyContent="flex-end" sx={{ mt: 2 }}>
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={() => {onSubmit()}}
                                disabled={isSaving}
                            >
                                Save
                            </Button>
                        </Box>
                </>
            )}

        </>
    );
};

export default CreatedSupplierInquries;