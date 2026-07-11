import React, { useEffect, useState, useRef } from "react";
import { Box, ToggleButton, ToggleButtonGroup, Typography, Card, CardContent, Table, TableContainer, TableHead, TableRow, TableCell, TableBody, Tabs, Tab, Alert } from '@mui/material';
import * as RestUrls from '@/helpers/constants/RestUrls';
import * as VirtualWarehouseUrls from '@/helpers/constants/rest_urls/VirtualWarehouseUrls';
import DefaultLoader from "@/components/DefaultLoader";
import api from "@/services/api";
import { toast } from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';
import RitzTooltip from '@/components/Ritz/RitzTooltip';
import RitzTablePagination from '@/components/Ritz/RitzTablePagination'; 

const MaterialSummary = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [customerData, setCustomerData] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [categoryData, setCategoryData] = useState<Record<string, any[]>>({
    fabric: [],
    sewing_trim: [],
    packaging_trim: []
  });
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({
    fabric: false,
    sewing_trim: false,
    packaging_trim: false
  });
  const [activeTab, setActiveTab] = useState<string>("fabric");
  const [pageIndex, setPageIndex] = useState(0);
  const [tablePageSize, setTablePageSize] = useState(5);
  const tableRef = useRef(null);

  const categories = ['fabric', 'sewing_trim', 'packaging_trim'];
  const categoryLabels: Record<string, string> = {
    fabric: 'Fabric',
    sewing_trim: 'Sewing Trim',
    packaging_trim: 'Packaging Trim'
  };
  const [paginationData, setPaginationData] = useState<Record<string, any>>({
    fabric: {
      count: 0,
      next: null,
      previous: null,
      pageIndex: 0,
      pageSize: tablePageSize  
    },
    sewing_trim: {
      count: 0,
      next: null,
      previous: null,
      pageIndex: 0,
      pageSize: tablePageSize  
    },
    packaging_trim: {
      count: 0,
      next: null,
      previous: null,
      pageIndex: 0,
      pageSize: tablePageSize  
    }
  });

  const getData = () => {
    setIsLoading(true);

    api.get(RestUrls.customersURL())
      .then((response) => {
        const customers = response.data || [];
        setCustomerData(customers);
        if (customers.length > 0) {
          fetchAllCategoriesData('');
        }
      })
      .catch(error => {
        toast.error(getDefaultError(error?.response?.status));
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handleCustomerOnChange = (event: any, newCustomer: string | null) => {
    setSelectedCustomer(newCustomer);
    setPageIndex(0);
    setPaginationData({
      fabric: {
        count: 0,
        next: null,
        previous: null,
        pageIndex: 0,
        pageSize: tablePageSize  
      },
      sewing_trim: {
        count: 0,
        next: null,
        previous: null,
        pageIndex: 0,
        pageSize: tablePageSize  
      },
      packaging_trim: {
        count: 0,
        next: null,
        previous: null,
        pageIndex: 0,
        pageSize: tablePageSize  
      }
    });
    if (newCustomer) {
      fetchAllCategoriesData(newCustomer);
    } else {
      fetchAllCategoriesData('');
    }
  };

  const fetchAllCategoriesData = (customerId: string) => {
    setCategoryData({
      fabric: [],
      sewing_trim: [],
      packaging_trim: []
    });
  
    categories.forEach(category => {
      setLoadingStates(prev => ({
        ...prev,
        [category]: true
      }));
  
      // fetchMaterialData(customerId, category, 0, tablePageSize);
    });
  };

  // const fetchMaterialData = (customerId: string, category: string, pageIndex: number, pageSize: number) => {
  //   const url = customerId
  //     ? VirtualWarehouseUrls.MaterialSummarybyCustomerURL(customerId, category, '', '', pageIndex + 1, pageSize)
  //     : VirtualWarehouseUrls.MaterialSummarybyCustomerURL('', category, '', '', pageIndex + 1, pageSize);

  //   api.get(url)
  //     .then((response) => {
  //       setCategoryData(prev => ({
  //         ...prev,
  //         [category]: response.data?.results || []
  //       }));
        
  //       setPaginationData(prev => ({
  //         ...prev,
  //         [category]: {
  //           count: response.data?.count || 0,
  //           next: response.data?.next,
  //           previous: response.data?.previous,
  //           pageIndex: pageIndex,
  //           pageSize: pageSize
  //         }
  //       }));
  //     })
  //     .catch(error => {
  //       toast.error(`Error loading ${categoryLabels[category]}: ${getDefaultError(error?.response?.status)}`);
  //     })
  //     .finally(() => {
  //       setLoadingStates(prev => ({
  //         ...prev,
  //         [category]: false
  //       }));
  //     });
  // };

  const handleTabChange = (event: any, newValue: string) => {
    setActiveTab(newValue);
    setPageIndex(0);
    // fetchMaterialData(
    //   selectedCustomer || '', 
    //   newValue, 
    //   0, 
    //   tablePageSize
    // );
  };

  const handlePageNumberChange = (event: any, newPage: number) => {
    // fetchMaterialData(
    //   selectedCustomer || '', 
    //   activeTab, 
    //   newPage, 
    //   paginationData[activeTab].pageSize
    // );
    
    setPaginationData(prev => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        pageIndex: newPage
      }
    }));
  };

  const handlePageSizeChange = (event: any) => {
    const newSize = parseInt(event.target.value, 10);
    setTablePageSize(newSize); 
    
    setPaginationData(prev => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        pageIndex: 0,
        pageSize: newSize
      }
    }));
    
    // fetchMaterialData(
    //   selectedCustomer || '', 
    //   activeTab, 
    //   0, 
    //   newSize
    // );
  };

  useEffect(() => {
    getData();
  }, []);

  return (
    <>
      <Typography variant='h1' sx={{ marginBottom: '1em' }}>Store Bin Wise Stock</Typography>
      
      {isLoading ? <DefaultLoader /> : (
        <Box>
          <Card>
            <CardContent>
              <Box>
                <Typography variant="h5" sx={{ marginBottom: '1em', marginTop: '1em' }}>Customer</Typography>
                <Box sx={{ display: 'flex', marginBottom: '1em' }}>
                  <ToggleButtonGroup
                    color="primary"
                    value={selectedCustomer}
                    exclusive
                    onChange={handleCustomerOnChange}
                    aria-label="Customer"
                    sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}
                  >
                    <ToggleButton
                      style={{ height: '4em', minWidth: '150px', border: '1px solid #E0E0E0', borderRadius: '5px', display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center', marginBottom: '10px', }} 
                      value=''>
                      All
                    </ToggleButton>
                    {customerData.map((customer: any) => (
                      <ToggleButton key={customer.id} 
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
                        value={customer.id}>
                        {customer.name}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                </Box>
              </Box>

              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs
                  value={activeTab}
                  onChange={handleTabChange}
                  aria-label="material categories"
                >
                  {categories.map(category => (
                    <Tab 
                      key={category}
                      label={categoryLabels[category]}
                      value={category}
                    />
                  ))}
                </Tabs>
              </Box>

              {categories.map(category => (
                <Box
                  key={category}
                  role="tabpanel"
                  hidden={activeTab !== category}
                  id={`tabpanel-${category}`}
                  aria-labelledby={`tab-${category}`}
                  sx={{ mt: 2 }}
                >
                  {activeTab === category && (
                    loadingStates[category] ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                        <DefaultLoader />
                      </Box>
                    ) : categoryData[category].length > 0 ? (
                      <>
                        <TableContainer>
                          <Typography variant="h5" sx={{ mb: 2 }}>
                            {categoryLabels[category]} Materials
                          </Typography>
                          <Table sx={{ borderCollapse: 'collapse', minWidth: 650 }}>
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ fontWeight: 'bold', fontSize: '1em', border: '1px solid #E0E0E0' }}>Ritz Reference Code</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', fontSize: '1em', border: '1px solid #E0E0E0' }}>Allocated Racks</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', fontSize: '1em', border: '1px solid #E0E0E0' }}>Allocated Bins</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', fontSize: '1em', border: '1px solid #E0E0E0' }}>Quantity</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', fontSize: '1em', border: '1px solid #E0E0E0' }}>Total Price</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {categoryData[category].map((material: any, materialIndex: number) => (
                                material.rack_details?.length > 0 ? (
                                  material.rack_details.map((rack: any, rackIndex: number) => (
                                    <TableRow key={`${materialIndex}_${rackIndex}`}>
                                      {rackIndex === 0 && (
                                        <TableCell rowSpan={material.rack_details.length} sx={{ border: '1px solid #E0E0E0' }}>
                                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Typography>
                                              {material.attributes?.ritz_customer_brand_reference_code || material.name}
                                            </Typography>
                                            {material.headers && (
                                              <RitzTooltip
                                                materialHeaders={material.headers}
                                                materialDetails={material.attributes}
                                              />
                                            )}
                                          </Box>
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
                                          <TableCell rowSpan={material.rack_details.length} sx={{ border: '1px solid #E0E0E0' }}>
                                            {material.material_quantity}
                                          </TableCell>
                                          <TableCell rowSpan={material.rack_details.length} sx={{ border: '1px solid #E0E0E0' }}>
                                            {'--'}
                                          </TableCell>
                                        </>
                                      )}
                                    </TableRow>
                                  ))
                                ) : (
                                  <TableRow key={`${materialIndex}_no_racks`}>
                                    <TableCell sx={{ border: '1px solid #E0E0E0' }}>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography>
                                          {material.attributes?.ritz_customer_brand_reference_code || material.name}
                                        </Typography>
                                        {material.headers && (
                                          <RitzTooltip
                                            materialHeaders={material.headers}
                                            materialDetails={material.attributes}
                                          />
                                        )}
                                      </Box>
                                    </TableCell>
                                    <TableCell sx={{ border: '1px solid #E0E0E0' }}>N/A</TableCell>
                                    <TableCell sx={{ border: '1px solid #E0E0E0' }}>N/A</TableCell>
                                    <TableCell sx={{ border: '1px solid #E0E0E0' }}>{material.material_quantity}</TableCell>
                                    <TableCell sx={{ border: '1px solid #E0E0E0' }}>{'--'}</TableCell>
                                  </TableRow>
                                )
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                        <RitzTablePagination
                          count={paginationData[category].count}
                          page={paginationData[category].pageIndex}
                          rowsPerPage={tablePageSize}  
                          onPageChange={handlePageNumberChange}
                          onRowsPerPageChange={handlePageSizeChange}
                          next={paginationData[category].next}
                        />
                      </>
                    ) : (
                      <Alert severity="info" sx={{ mt: 3 }}>
                        No {categoryLabels[category]} materials found.
                      </Alert>
                    )
                  )}
                </Box>
              ))}
            </CardContent>
          </Card>
        </Box>
      )}
    </>
  );
};

export default MaterialSummary;