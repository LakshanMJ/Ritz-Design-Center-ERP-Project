import React, { useEffect, useState } from "react";
import { 
  Box, 
  ToggleButton, 
  ToggleButtonGroup, 
  Typography, 
  Card, 
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  IconButton
} from '@mui/material';
import * as GrnUrls from '@/helpers/constants/rest_urls/GrnUrls';
import * as VirtualWarehouseUrls from '@/helpers/constants/rest_urls/VirtualWarehouseUrls';
import api from "@/services/api";
import { toast } from 'react-hot-toast';
import { getDefaultError , formatAmount} from '@/helpers/Utilities';
import DefaultLoader from "@/components/DefaultLoader";
import RitzModal from "@/components/Ritz/RitzModal";
import CustomerWiseCosting from "./CustomerWiseCosting";
import RitzTablePagination from '@/components/Ritz/RitzTablePagination';
import LaunchIcon from '@mui/icons-material/Launch';

const FabricSummary = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [warehouseData, setWarehouseData] = useState<any[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<any>(''); 
  const [selectedWarehouseName, setSelectedWarehouseName] = useState<string>('All Warehouses');
  const [customerDetails, setCustomerDetails] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomerName, setSelectedCustomerName] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [pageIndex, setPageIndex] = useState(0);
  const [tablePageSize, setTablePageSize] = useState(50);
  const [paginationData, setPaginationData] = useState({
    count: 0,
    next: null,
    previous: null
  });
  const [totalMaterialQuantity, setTotalMaterialQuantity] = useState<number>(0);
  const [totalMaterialPrice, setTotalMaterialPrice] = useState<number>(0);
  const [TotalMaterialQuantityUnits, setTotalMaterialQuantityUnits] = useState<string>('');

  const getWarehouseData = () => {
    setIsLoading(true);

    api.get(GrnUrls.plantWarehouseListURL())
      .then((response) => {
        const warehouses = response.data || [];
        setWarehouseData(warehouses);
        fetchCustomerDetails('');
      })
      .catch(error => {
        toast.error(getDefaultError(error?.response?.status));
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const fetchCustomerDetails = (warehouseId: string = '', page: number = 1, pageSize: number = tablePageSize) => {
    setLoadingDetails(true);
    setCustomerDetails([]);

    const url = VirtualWarehouseUrls.warehouseCustomerDetailsURL(warehouseId, page, pageSize);
    
    api.get(url)
      .then((response) => {
        const details = response.data?.results || [];
        setCustomerDetails(details);
        setPaginationData({
          count: response.data?.count || 0,
          next: response.data?.next,
          previous: response.data?.previous
        });

        setTotalMaterialQuantity(response.data?.meta_data?.total_material_quantity || 0);
        setTotalMaterialPrice(response.data?.meta_data?.total_material_price || 0);
        setTotalMaterialQuantityUnits(response.data?.meta_data?.total_material_quantity_units || 0);
      })
      .catch(error => {
        toast.error(getDefaultError(error?.response?.status));
      })
      .finally(() => {
        setLoadingDetails(false);
      });
  };

  const handlePageNumberChange = (_: any, newPage: number) => {
    setPageIndex(newPage);
    fetchCustomerDetails(selectedWarehouse, newPage + 1, tablePageSize);
  };

  const handlePageSizeChange = (event: any) => {
    const newSize = parseInt(event.target.value, 10);
    setTablePageSize(newSize);
    setPageIndex(0);
    fetchCustomerDetails(selectedWarehouse, 1, newSize);
  };

  const handleWarehouseOnChange = (event: any, newWarehouse: any) => {
    setSelectedWarehouse(newWarehouse);
    const warehouseName = warehouseData.find(w => w.id === newWarehouse)?.name || 'All Warehouses';
    setSelectedWarehouseName(warehouseName);
    setPageIndex(0);
    fetchCustomerDetails(newWarehouse);
  };

  const handleViewAction = (customerId: string, customerName: string) => {
    setSelectedCustomerId(customerId);
    setSelectedCustomerName(customerName);
    setIsModalOpen(true);
  };

  useEffect(() => {
    getWarehouseData();
  }, []);

  return (
    <>
      <Typography variant='h1' sx={{ marginBottom: '1em' }}>Fabric Summary</Typography>
      {isLoading ? <DefaultLoader /> : (
        <Box>
          <Card>
            <CardContent>
              <Box>
                <Typography variant="h5" sx={{ marginBottom: '1em', marginTop: '1em' }}>Warehouse</Typography>
                <Box sx={{ display: 'flex', marginBottom: '1em' }}>
                  <ToggleButtonGroup
                    color="primary"
                    value={selectedWarehouse}
                    exclusive
                    onChange={handleWarehouseOnChange}
                    aria-label="Warehouse"
                    sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}
                  >
                    <ToggleButton
                      style={{
                        height: '4em',
                        minWidth: '150px',
                        border: '1px solid #E0E0E0',
                        borderRadius: '5px',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        textAlign: 'center',
                        marginBottom: '10px',
                      }}
                      value='' // "All" warehouses
                    >
                      All
                    </ToggleButton>
                    {warehouseData.map((warehouse: any) => (
                      <ToggleButton
                        key={warehouse.id}
                        style={{
                          height: '4em',
                          minWidth: '150px',
                          border: '1px solid #E0E0E0',
                          borderRadius: '5px',
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          textAlign: 'center',
                          marginBottom: '10px',
                        }}
                        value={warehouse.id}
                      >
                        {warehouse.name}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                </Box>
              </Box>

              {loadingDetails ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <DefaultLoader />
                </Box>
              ) : customerDetails.length > 0 ? (
                <>
                  <TableContainer>
                    <Typography variant="h5" sx={{ mb: 2 }}>
                      Fabric Details {selectedWarehouse ? `for ${selectedWarehouseName}` : 'Across All Warehouses'}
                    </Typography>

                    <TableContainer sx={{ marginTop: 4, width: '50%', marginBottom: 4 }}>
                      <Table sx={{ borderCollapse: 'collapse', minWidth: 350 }}>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', fontSize: '1em', border: '1px solid #E0E0E0' }}>Total Material Quantity</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', fontSize: '1em', border: '1px solid #E0E0E0' }}>Total Material Price(USD)</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          <TableRow>
                            <TableCell sx={{ border: '1px solid #E0E0E0' }}>{`${formatAmount(totalMaterialQuantity || '--')} ${TotalMaterialQuantityUnits || ''}`}</TableCell>
                            <TableCell sx={{ border: '1px solid #E0E0E0' }}>{formatAmount(totalMaterialPrice)}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>

                    <Table sx={{ borderCollapse: 'collapse', minWidth: 650 }}>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 'bold', fontSize: '1em', border: '1px solid #E0E0E0' }}>Customer</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', fontSize: '1em', border: '1px solid #E0E0E0' }}>Allocated Racks</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', fontSize: '1em', border: '1px solid #E0E0E0' }}>Allocated Bins</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', fontSize: '1em', border: '1px solid #E0E0E0' }}>Quantity</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', fontSize: '1em', border: '1px solid #E0E0E0' }}>Price(USD)</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', fontSize: '1em', border: '1px solid #E0E0E0' }}>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {customerDetails.map((customer: any, customerIndex: number) => (
                          customer.rack_details?.length > 0 ? (
                            customer.rack_details.map((rack: any, rackIndex: number) => (
                              <TableRow key={`${customerIndex}_${rackIndex}`}>
                                {rackIndex === 0 && (
                                  <TableCell rowSpan={customer.rack_details.length} sx={{ border: '1px solid #E0E0E0' }}>
                                    {customer.customer_name}
                                  </TableCell>
                                )}
                                <TableCell sx={{ border: '1px solid #E0E0E0' }}>
                                  {rack.display_number}
                                </TableCell>
                                <TableCell sx={{ border: '1px solid #E0E0E0' }}>
                                  {rack.bin_details?.map((bin: any) => bin.display_number).join(', ')}
                                </TableCell>
                                {rackIndex === 0 && (
                                  <>
                                    <TableCell rowSpan={customer.rack_details.length} sx={{ border: '1px solid #E0E0E0' }}>
                                      {`${formatAmount(customer.material_quantity || '--')} ${customer.material_quantity_units || ''}`}
                                    </TableCell>
                                    <TableCell rowSpan={customer.rack_details.length} sx={{ border: '1px solid #E0E0E0' }}>
                                      {formatAmount(customer.material_price || '--')}
                                    </TableCell>
                                    <TableCell rowSpan={customer.rack_details.length} sx={{ border: '1px solid #E0E0E0' }}>
                                      <IconButton onClick={() => handleViewAction(customer.customer_id, customer.customer_name)}>
                                        <LaunchIcon />
                                      </IconButton>
                                    </TableCell>
                                  </>
                                )}
                              </TableRow>
                            ))
                          ) : (
                            <TableRow key={`${customerIndex}_no_racks`}>
                              <TableCell sx={{ border: '1px solid #E0E0E0' }}>
                                {customer.customer_name}
                              </TableCell>
                              <TableCell sx={{ border: '1px solid #E0E0E0' }}>N/A</TableCell>
                              <TableCell sx={{ border: '1px solid #E0E0E0' }}>N/A</TableCell>
                              <TableCell sx={{ border: '1px solid #E0E0E0' }}>
                                {`${formatAmount(customer.material_quantity || '--')} ${customer.material_quantity_units || ''}`}
                              </TableCell>
                              <TableCell sx={{ border: '1px solid #E0E0E0' }}>{formatAmount(customer.material_price || '--')}</TableCell>
                              <TableCell sx={{ border: '1px solid #E0E0E0' }}>
                                <IconButton onClick={() => handleViewAction(customer.customer_id, customer.customer_name)}>
                                  <LaunchIcon />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          )
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  
                  <RitzTablePagination
                    count={paginationData.count}
                    page={pageIndex}
                    rowsPerPage={tablePageSize}
                    onPageChange={handlePageNumberChange}
                    onRowsPerPageChange={handlePageSizeChange}
                    next={paginationData.next}
                  />
                </>
              ) : selectedWarehouse !== '' && (
                <Alert severity="info" sx={{ mt: 3 }}>
                  No fabric details found for this warehouse.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Box>
      )}
      <RitzModal open={isModalOpen} onClose={() => setIsModalOpen(false)} title={"Costing Details"} maxWidth="lg" fullWidth>
        <CustomerWiseCosting 
          warehouseId={selectedWarehouse} 
          customerId={selectedCustomerId} 
          warehouseName={selectedWarehouseName}
          customerName={selectedCustomerName}
        />
      </RitzModal>
    </>
  );
};

export default FabricSummary;