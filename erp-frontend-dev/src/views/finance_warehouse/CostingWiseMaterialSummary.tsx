import { useEffect, useState, useRef } from "react";
import { Box, ToggleButton, ToggleButtonGroup, Typography, Card, CardContent, Grid, List, ListItem, ListItemButton, ListItemText, Divider, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, Tab, Alert, Button } from '@mui/material';
import * as RestUrls from '@/helpers/constants/RestUrls';
import DefaultLoader from "@/components/DefaultLoader";
import * as CostingUrls from '@/helpers/constants/front_end/CostingUrls';
import * as VirtualWarehouseUrls from '@/helpers/constants/rest_urls/VirtualWarehouseUrls';
import api from "@/services/api";
import { toast } from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';
import React from "react";
import RitzTooltip from '@/components/Ritz/RitzTooltip';
import RitzTablePagination from '@/components/Ritz/RitzTablePagination';
import RitzInput from '@/components/Ritz/RitzInput';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ViewPOWiseURL } from "@/helpers/constants/front_end/CostingUrls";

const CostingWiseMaterialSummary = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [customerData, setCustomerData] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [selectedCostingId, setSelectedCostingId] = useState<number | null>(null);
  const [costingIds, setCostingIds] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
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
  const [shortCodePageSize, setShortCodePageSize] = useState(5);
  const [tablePageSize, setTablePageSize] = useState(5);
  const [isScrollLoading, setIsScrollLoading] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const router = useRouter();
  const listRef = useRef<HTMLDivElement>(null);
  const [hasMoreData, setHasMoreData] = useState(true); 
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
        setSelectedCustomer('');
        if (customers.length > 0) {
          fetchCostingIds('', 1, shortCodePageSize, '');
        }
      })
      .catch(error => {
        toast.error(getDefaultError(error?.response?.status));
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const fetchCostingIds = (customerId: string, page: number = 1, size: number = shortCodePageSize, search: string = '') => {
    if (!hasMoreData && page > 1) return; 
  
    const url = VirtualWarehouseUrls.CustomerCostingIdsURL(customerId, search, size, page);
  
    api.get(url)
      .then((response) => {
        const costingVersions = response.data?.results || [];
        setCostingIds(prev => (page === 1 ? costingVersions : [...prev, ...costingVersions]));
  
        if (costingVersions.length < size) {
          setHasMoreData(false);
        } else {
          setHasMoreData(true);
        }
      })
      .catch(error => {
        toast.error(getDefaultError(error?.response?.status));
      })
      .finally(() => {
        setIsScrollLoading(false);
      });
  };

  const handleCustomerOnChange = (event: any, newCustomer: string | null) => {
    setSelectedCustomer(newCustomer);
    setPageIndex(0);
    setSearchTerm(''); 
    setHasMoreData(true); 
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
    if (newCustomer !== null) {
      fetchCostingIds(newCustomer, 1, shortCodePageSize, '');
    } else {
      setCostingIds([]);
    }
  };
  
  const handleCostingClick = (costingId: number) => {
    setSelectedCostingId(costingId);
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
    fetchAllCategoriesData(selectedCustomer || '', costingId);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };
  
  const handleSearchKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      setPageIndex(0);
      setHasMoreData(true);
      fetchCostingIds(selectedCustomer || '', pageIndex + 1, shortCodePageSize, searchTerm);
    }
  };

  const fetchAllCategoriesData = (customerId: string, costingId: number) => {
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
  
      fetchMaterialData(customerId, category, costingId, 0, tablePageSize);
    });
  };

  const fetchMaterialData = (customerId: string, category: string, costingId: number, pageIndex: number, pageSize: number) => {
    const url = VirtualWarehouseUrls.MaterialSummarybyCustomerURL(customerId, category, costingId, '', pageIndex + 1, pageSize);
  
    api.get(url)
      .then((response) => {
        const results = response.data?.results || [];
        setCategoryData(prev => ({
          ...prev,
          [category]: results
        }));
        
        setPaginationData(prev => ({
          ...prev,
          [category]: {
            count: response.data?.count || 0,
            next: response.data?.next,
            previous: response.data?.previous,
            pageIndex: pageIndex,
            pageSize: pageSize
          }
        }));
      })
      .catch(error => {
        toast.error(`Error loading ${categoryLabels[category]}: ${getDefaultError(error?.response?.status)}`);
      })
      .finally(() => {
        setLoadingStates(prev => ({
          ...prev,
          [category]: false
        }));
      });
  };

  const handleTabChange = (event: any, newValue: string) => {
    setActiveTab(newValue);
    setPageIndex(0);
    fetchMaterialData(
      selectedCustomer || '', 
      newValue, 
      selectedCostingId || 0, 
      0, 
      tablePageSize
    );
  };

  const handleScroll = (event: any) => {
    const { scrollTop, scrollHeight, clientHeight } = event.target;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
  
    if (isAtBottom && !isScrollLoading && hasMoreData) {
      setIsScrollLoading(true);
      const nextPage = pageIndex + 1;
      setPageIndex(nextPage);
      fetchCostingIds(selectedCustomer || '', nextPage, shortCodePageSize, searchTerm);
    }
  };

  const handlePageNumberChange = (event: any, newPage: number) => {
    fetchMaterialData(
      selectedCustomer || '', 
      activeTab, 
      selectedCostingId || 0, 
      newPage, 
      paginationData[activeTab].pageSize
    );
    
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
    
    fetchMaterialData(
      selectedCustomer || '', 
      activeTab, 
      selectedCostingId || 0, 
      0, 
      newSize
    );
  };

  useEffect(() => {
    getData();
  }, []);

  return (
    <>
      <Typography variant='h1' sx={{ marginBottom: '1em' }}>Costing Wise Material Summary</Typography>
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
                      <ToggleButton
                        key={customer.id}
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
                        value={customer.id}
                      >
                        {customer.name}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                </Box>
              </Box>

              <Grid container direction="row" sx={{ height: '100vh', display: 'flex' }}>
                {/* Sidebar for Costing IDs */}
                <Grid
                  item
                  xs={12}
                  md={2}
                  sx={{
                    backgroundColor: '#f5f5f5',
                    borderRight: '1px solid #ddd',
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                }}
                >
                  <Card sx={{ flex: 1, boxShadow: 'none', borderRadius: 0, display: 'flex', flexDirection: 'column' }}>
                    <CardContent
                      sx={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: 2,
                        paddingTop: 1,
                      }}
                      ref={listRef}
                      onScroll={handleScroll}
                    >
                      <Box sx={{ mb: 2, px: 1 }}>
                        <RitzInput
                          id="search-costing"
                          name="search-costing"
                          placeholderText="Costing"
                          selectedValue={searchTerm}
                          handleOnChange={handleSearchChange}
                          handleOnKeyDown={handleSearchKeyDown}
                          size="small"
                          fullWidth={true}
                        />
                      </Box>
                      
                      <Box>
                        {costingIds.length > 0 ? (
                          costingIds.map((costing: any) => (
                            <Box key={costing.costing_version_id} marginBottom={-1}>
                              <List dense>
                                <ListItem
                                  key={costing.costing_version_id}
                                  disablePadding
                                  selected={selectedCostingId === costing.costing_version_id}
                                >
                                  <ListItemButton onClick={() => handleCostingClick(costing.costing_version_id)}>
                                    <ListItemText
                                      primary={
                                        <Box display="flex" alignItems="center" justifyContent="space-between">
                                          <Typography
                                            color={selectedCostingId === costing.costing_version_id ? 'primary' : 'inherit'}
                                            fontWeight={selectedCostingId === costing.costing_version_id ? 'bold' : 'normal'}
                                          >
                                            {`${costing.short_code}`}
                                          </Typography>
                                        </Box>
                                      }
                                    />
                                  </ListItemButton>
                                </ListItem>
                              </List>
                              <Divider />
                            </Box>
                          ))
                        ) : (
                          <Box sx={{ p: 2, textAlign: 'center' }}>
                            <Typography variant="body2" color="text.secondary">
                              No costing IDs found
                            </Typography>
                          </Box>
                        )}
                      </Box>
                      {isScrollLoading && (
                        <Box display="flex" justifyContent="center" padding={2}>
                          <DefaultLoader />
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>

                {/* Main Content for Costing Details */}
                <Grid
                  item
                  xs={12}
                  md={10}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {selectedCostingId ? (
                    <Box sx={{ marginLeft: 2, marginTop: 2 }}>
                      <Link
                        href={ViewPOWiseURL(selectedCustomer, selectedCostingId)}>
                        <Button variant="contained" color="primary" size="small">
                          View PO Wise
                        </Button>
                      </Link>
                      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2, display: 'flex', justifyContent: 'space-between' }}>
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
                                    {categoryLabels[category]} Materials for {costingIds.find(c => c.costing_version_id === selectedCostingId)?.version_display_number}
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
                                                    {material.material_price}
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
                                            <TableCell sx={{ border: '1px solid #E0E0E0' }}>{material.material_price}</TableCell>
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
                                No {categoryLabels[category]} materials found for this costing.
                              </Alert>
                            )
                          )}
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Box sx={{ marginLeft: 2, marginTop: 2, padding: 3 }}>
                      <Alert severity="info" sx={{ mt: 3 }}>
                        Select a costing from the sidebar to view material details.
                      </Alert>
                    </Box>
                  )}
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Box>
      )}
    </>
  );
};

export default CostingWiseMaterialSummary;