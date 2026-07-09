import { useEffect, useState, useRef } from "react";
import { Box, ToggleButton, ToggleButtonGroup, Typography, Alert, Card, CardContent, IconButton, Button, Link } from '@mui/material';
import * as RestUrls from '@/helpers/constants/RestUrls';
import * as MaterialAdministrationUrls from '@/helpers/constants/rest_urls/MaterialAdministrationUrls';
import DefaultLoader from "@/components/DefaultLoader";
import api from "@/services/api";
import { toast } from 'react-hot-toast';
import { getDefaultError, hasRole } from '@/helpers/Utilities';
import RitzTable from '@/components/Ritz/RitzTable';
import RitzModal from '@/components/Ritz/RitzModal';
import RitzTooltip from '@/components/Ritz/RitzTooltip';
import { ColumnDef } from '@tanstack/react-table';
import VisibilityIcon from "@mui/icons-material/Visibility";
import MaterialDetails from "./MaterialDetails";
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import SaveSpinner from "@/components/SaveSpinner";
import { ReactKeyHelper } from "@/helpers/KeyHelper";
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { ADMIN } from "@/helpers/constants/RoleManager";
import { customerBrandMaterialDeleteURL } from "@/helpers/constants/RestUrls";
import { orderSummaryVersionURL } from "@/helpers/constants/FrontEndUrls";

const CustomerMaterials = () => {
  const keyHelper = new ReactKeyHelper();
  const [isLoading, setIsLoading] = useState(true);
  const [customerdata, setCustomerData] = useState<any[]>([]);
  const [UserDefinedMaterials, setUserDefinedMaterials] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [isItemsLoading, setIsItemsLoading] = useState(false);
  const [state, setState] = useState({ selectedItems: [], userDefinedMaterials: [] });
  const [selectedMaterialCategories, setSelectedMaterialCategories] = useState<string[]>([]);
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState({});
  const [data, setData] = useState<any>({});
  const tableRef = useRef(null);
  const [openModal, setOpenModal] = useState(false);
  const [modalData, setModalData] = useState<any>(null);
  const [isShowValiadtion, setIsShowValiadtion] = useState({modalStaus: false, errors: []});
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState({modalStaus: false, material: null});
  const [isDeleting, setIsDeleting] = useState(false);
  const canEdit = hasRole(ADMIN);
  const materialCategories = [{ id: "fabric", name: "Fabric" }, { id: "sewing_trim", name: "Sewing Trims" }, { id: "packaging_trim", name: "Packaging" }];

  const getData = () => {
    setIsLoading(true);

    Promise.all([
      api.get(RestUrls.customersURL()),
      api.get(MaterialAdministrationUrls.getUserDefineMaterialsURL())
    ]).then(([customersResp, userDefinedMaterialsResp]) => {
      setCustomerData(customersResp.data || []);
      setUserDefinedMaterials(userDefinedMaterialsResp.data || []);
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => {
      setIsLoading(false);
    });
  };

  const fetchItems = (customerId: string) => {
    setIsItemsLoading(true);
    api.get(RestUrls.cutomerItemsURL(customerId))
      .then((response) => {
        setItems(response.data);
      })
      .catch((error) => {
        toast.error(getDefaultError(error?.response?.status));
      })
      .finally(() => {
        setIsItemsLoading(false);
      });
  };

  const handleCustomerOnChange = (event: React.MouseEvent<HTMLElement>, newCustomer: string | null) => {
    setSelectedCustomer(newCustomer);
    setState({ selectedItems: [], userDefinedMaterials: [] });
    if (newCustomer) {
      fetchItems(newCustomer);
    } else {
      setItems([]);
    }
    fetchTableData({ customer: newCustomer });
  };

  const handleItemChange = (event: React.MouseEvent<HTMLElement>, newItems: string[]) => {
    setState({ ...state, selectedItems: newItems });
    fetchTableData({ items: newItems });
  };

  const handleMaterialCategoryChange = (event: React.MouseEvent<HTMLElement>, newCategories: string[]) => {
    setSelectedMaterialCategories(newCategories);
    fetchTableData({ materialCategories: newCategories });
  };

  const handleViewDetailsClick = (materialId: number) => {
    setOpenModal(true);
    setModalData({ customer_brand_material_id: materialId });
};

  const fetchTableData = ({
    customer = selectedCustomer,
    items = state.selectedItems,
    materialCategories = selectedMaterialCategories,
    pageIndex: paramPageIndex,
    pageSize: paramPageSize,
    globalFilter: paramGlobalFilter,
    columnFilters: paramColumnFilters,
  }: {
    customer?: string | null,
    items?: any[],
    materialCategories?: string[],
    pageIndex?: number,
    pageSize?: number,
    globalFilter?: string,
    columnFilters?: Object,
  } = {}) => {
    setIsTableLoading(true);

    const pageIndexValue = paramPageIndex !== undefined ? paramPageIndex : pageIndex;
    const pageSizeValue = paramPageSize !== undefined ? paramPageSize : pageSize;
    const globalFilterValue = paramGlobalFilter !== undefined ? paramGlobalFilter : globalFilter;
    const columnFiltersValue = paramColumnFilters !== undefined ? paramColumnFilters : columnFilters;

    const queryParams = getQueryParams(customer, items, materialCategories, globalFilterValue, columnFiltersValue);
    api.get(MaterialAdministrationUrls.customerMaterialDetailListURL(pageIndexValue + 1, pageSizeValue, queryParams)).then((resp: any) => {
      setData({...resp.data})
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => {
      setIsTableLoading(false);
    });
  };

  const handleDeleteMaterialModal = (open: boolean, material: any) => {
    setIsDeleteModalOpen({modalStaus: open, material: material?.attributes?.customer_brand_material_id});
  }

  const handleDeleteMaterial = () => {
    setIsDeleting(true);
    setIsShowValiadtion({modalStaus: false, errors: []});
    api.post(customerBrandMaterialDeleteURL(isDeleteModalOpen.material))
      .then(() => {
        toast.success('Material deleted successfully');
        setIsDeleteModalOpen({modalStaus: false, material: null});
        fetchTableData();
      })
      .catch(error => {
        toast.error(getDefaultError(error?.response?.status));
        setIsShowValiadtion({modalStaus: true, errors: error?.response?.data?.results || []});
        setIsDeleteModalOpen({modalStaus: false, material: null});
      })
      .finally(() => {
        setIsDeleting(false);
      });
  }
  
  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'customer_name',
      header: 'Customer Name'
    },
    {
      accessorKey: 'brand_name',
      header: 'Brand Name'
    },
    {
      accessorKey: 'material_label',
      header: 'Material Category'
    },
    {
      accessorKey: 'attributes.ritz_customer_brand_reference_code',
      header: 'Ritz Reference Code',
      cell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography>{row.original.attributes.ritz_customer_brand_reference_code}</Typography>
          <RitzTooltip
            materialHeaders={row.original.headers}
            materialDetails={row.original.attributes}
          />
        </Box>
      ),
    },       
    {
      accessorKey: 'attributes.reference_code',
      header: 'Material Reference Code'
    },
    {
      header: "View Details",
      cell: ({ row }) => (
        <>
          <Box display="flex" gap={1} justifyContent="center">
            <IconButton
              onClick={() => handleViewDetailsClick(row.original.id)}
              color="primary"
            >
              <VisibilityIcon />
            </IconButton>
            {canEdit && (
              <IconButton
                color="error"
                onClick={() => handleDeleteMaterialModal(true, row.original)}
              >
                <DeleteForeverIcon />
              </IconButton>
            )}
          </Box>
        </>
        
      ),
    }
  ];

  const getQueryParams = (customer: string, items: any[], materialCategories: string[], globalFilter: any, columnFilters: any): string => {
    const params: any = {};

    params['customer_ids'] = customer || '';

    params['item_ids'] = items || '';

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
    if (Object.keys(params).length) {
      return new URLSearchParams(params).toString();
    }
    return '';
  };

  const handlePageNumberChange = (pageIndex: number) => {
    setPageIndex(pageIndex);
    fetchTableData({ pageIndex });
  };

  const handlePageSizeChange = (pageSize: number) => {
    setPageIndex(0);
    setPageSize(pageSize);
    fetchTableData({ pageSize, pageIndex: 0 });
  };

  const handleTableSearch = (search: string) => {
    setPageIndex(0);
    if (tableRef.current) {
      tableRef.current.setPageIndex(0);
    }
    setGlobalFilter(search?.trim());
    fetchTableData({ pageIndex: 0, globalFilter: search?.trim() });
  };

  const handleTableFilterSearch = (filters: any) => {
    setPageIndex(0);
    if (tableRef.current) {
      tableRef.current.setPageIndex(0);
    }
    setColumnFilters(filters);
    fetchTableData({ columnFilters: filters });
  };

  useEffect(() => {
    getData();
    fetchTableData();
  }, []);

  return (
    <>
      {isShowValiadtion.modalStaus && (
        <RitzModal open={isShowValiadtion.modalStaus} onClose={()=>{setIsShowValiadtion({modalStaus:false, errors: []})}} maxWidth='md' fullWidth={true} title={"Action Blocked: Material in Use"}>
          <Box sx={{ mt: 1 }}>
            <Box>
              <Box  sx={{ marginBottom: '15px' }}>
                   <Alert severity="error" sx={{ mt: 2 }}>This material cannot be deleted because it is currently used in the following costings:</Alert>
                      <Box sx={{ mt: 3 }}>
                        {isShowValiadtion?.errors.map((transfer: any) => (
                          <Box key={transfer.id} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                            <FiberManualRecordIcon sx={{ fontSize: 8, color: 'primary.main', mr: 1 }} />
                            <Link
                              href={orderSummaryVersionURL(transfer?.order_id, transfer?.id)}
                              target="_blank"
                              underline="hover"
                            >
                              {transfer.long_code}
                            </Link>
                          </Box>
                        ))}
                      </Box>
                </Box>
            </Box>
          </Box>
        </RitzModal>
      )}
      {isDeleteModalOpen && <RitzModal
        open={isDeleteModalOpen.modalStaus}
        onClose={()=>{handleDeleteMaterialModal(false, null)}}
        maxWidth='xs'
        title='Confirm Delete'
      >
        <>
          <Box>
            <Typography>Are you sure you want to delete this material ?</Typography>
            <Box sx={{ display: 'flex', justifyContent: 'end', mt: 3 }}>
              <Button variant='contained' onClick={()=>{handleDeleteMaterial();}} color='error' disabled={isDeleting}>
                {isDeleting && <SaveSpinner />}Delete
              </Button>
            </Box>
          </Box>
        </>
      </RitzModal>}
      <Typography variant='h1'>Customer Materials</Typography>
        {openModal && ( 
              <RitzModal
                open={openModal}
                title="Material Details"
                onClose={() => setOpenModal(false)}
                isLoading={!modalData}
                maxWidth="lg"  
                fullWidth={true} 
              >
                <MaterialDetails materialId={modalData?.customer_brand_material_id} />
              </RitzModal>
      )}
      {isLoading ? <DefaultLoader /> : (
        <>
        <Box>
          <Box>
            <Card>
              <CardContent>
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
                    style={{height: '4em',minWidth: '150px',border: '1px solid #E0E0E0',borderRadius: '5px',display: 'flex',justifyContent: 'center',alignItems: 'center',textAlign: 'center',marginBottom: '10px',}} value=''>
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

              <Box>
                <Typography variant="h5" sx={{ marginBottom: '1em', marginTop: '1em' }}>Item</Typography>

                {selectedCustomer === null && (
                    <Alert severity="info" sx={{ mt: 3 }}>
                      Please select a customer.
                    </Alert>
                  )}
                  
                {isItemsLoading ? <DefaultLoader /> : (
                  <Box sx={{ display: 'flex' }}>
                    <ToggleButtonGroup
                      color="primary"
                      value={state.selectedItems}
                      onChange={handleItemChange}
                      aria-label="Items"
                      sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}
                    >
                      {items.map((items: any) => (
                        <ToggleButton
                          key={items.id}
                          style={{height: '4em',minWidth: '150px',border: '1px solid #E0E0E0',borderRadius: '5px',display: 'flex',justifyContent: 'center',alignItems: 'center',textAlign: 'center',marginBottom: '10px',}}
                          value={items.id}
                        >
                          {items.name}
                        </ToggleButton>
                      ))}
                    </ToggleButtonGroup>
                  </Box>
                )}
              </Box>

              <Box>
                <Typography variant="h5" sx={{ marginBottom: '1em', marginTop: '1em' }}>Material Category</Typography>
                <Box sx={{ display: 'flex' }}>
                  <ToggleButtonGroup
                    color="primary"
                    value={selectedMaterialCategories}
                    onChange={handleMaterialCategoryChange}
                    aria-label="Material Categories"
                    sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}
                  >
                    {materialCategories.map((category: any) => (
                      <ToggleButton key={category.id} style={{height: '4em',minWidth: '150px',border: '1px solid #E0E0E0',borderRadius: '5px',display: 'flex',justifyContent: 'center',alignItems: 'center',textAlign: 'center',marginBottom: '10px',}}
                       value={category.id}>
                        {category.name}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                </Box>
              </Box>
              </CardContent>
            </Card>
          </Box>
          </Box>
            <RitzTable
              data={data.results}
              columns={columns}
              tableRef={tableRef}
              serverSideRendering={true}
              totalCount={data.count}
              onPageNumberChange={handlePageNumberChange}
              onPerPageCountChange={handlePageSizeChange}
              onSearchTextChange={handleTableSearch}
              onFilterSearch={handleTableFilterSearch}
              isLoading={isTableLoading}
              enableGlobalFilter={false} 
              enableColumnFilter={false}
            />
            
          
        </>
      )}
    </>
  );
};

export default CustomerMaterials;