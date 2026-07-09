import React, { useEffect, useState } from "react";
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Button, Link } from "@mui/material";
import * as VirtualWarehouseUrls from "@/helpers/constants/rest_urls/VirtualWarehouseUrls";
import { orderSummaryPageURL } from '@/helpers/constants/FrontEndUrls';
import api from "@/services/api";
import { toast } from "react-hot-toast";
import { getDefaultError, formatAmount } from "@/helpers/Utilities";
import DefaultLoader from "@/components/DefaultLoader";
import CustomerWiseCostingPoClub from "./CustomerWiseCostingPoClub";
import RitzTablePagination from "@/components/Ritz/RitzTablePagination";
import CostingPoClubMaterialDetails from "./CostingPoClubMaterialDetails";
import LaunchIcon from '@mui/icons-material/Launch';

interface CustomerWiseCostingProps {
  warehouseId: string;
  customerId: string;
  warehouseName: string;
  customerName: string;
}

type ViewType = 'main' | 'po_club' | 'material_details';

const CustomerWiseCosting: React.FC<CustomerWiseCostingProps> = ({ warehouseId, customerId, warehouseName, customerName }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [costingDetails, setCostingDetails] = useState<any[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [tablePageSize, setTablePageSize] = useState(50);
  const [paginationData, setPaginationData] = useState({
    count: 0,
    next: null,
    previous: null
  });
  const [totalMaterialQuantity, setTotalMaterialQuantity] = useState<number>(0);
  const [totalMaterialPrice, setTotalMaterialPrice] = useState<number>(0);
  const [TotalMaterialQuantityUnits, setTotalMaterialQuantityUnits] = useState<string>("");
  
  const [currentView, setCurrentView] = useState<ViewType>('main');
  const [selectedCostingId, setSelectedCostingId] = useState<string>("");
  const [selectedVersionDisplayNumber, setSelectedVersionDisplayNumber] = useState<string>("");
  const [selectedPoClubId, setSelectedPoClubId] = useState<string>("");
  const [selectedPoClubDisplayNumber, setSelectedPoClubDisplayNumber] = useState<string>("");

  const fetchCustomerCostingDetails = (page: number = 1, pageSize: number = tablePageSize) => {
    setIsLoading(true);
    const url = VirtualWarehouseUrls.warehouseCustomerCostingDetails(warehouseId, customerId, page, pageSize);

    api.get(url)
      .then((response) => {
        const details = response.data?.results || [];
        setCostingDetails(details);
        setPaginationData({
          count: response.data?.count || 0,
          next: response.data?.next,
          previous: response.data?.previous
        });
        setTotalMaterialQuantity(response.data?.meta_data?.total_material_quantity || 0);
        setTotalMaterialPrice(response.data?.meta_data?.total_material_price || 0);
        setTotalMaterialQuantityUnits(response.data?.meta_data?.total_material_quantity_units || "");
      })
      .catch((error) => {
        toast.error(getDefaultError(error?.response?.status));
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handlePageNumberChange = (_: any, newPage: number) => {
    setPageIndex(newPage);
    fetchCustomerCostingDetails(newPage + 1, tablePageSize);
  };

  const handlePageSizeChange = (event: any) => {
    const newSize = parseInt(event.target.value, 10);
    setTablePageSize(newSize);
    setPageIndex(0);
    fetchCustomerCostingDetails(1, newSize);
  };

  const handleViewPoClub = (costingId: string, versionDisplayNumber: string) => {
    setSelectedCostingId(costingId);
    setSelectedVersionDisplayNumber(versionDisplayNumber);
    setCurrentView('po_club');
  };

  const handleViewMaterialDetails = (poClubId: string, displayNumber: string) => {
    setSelectedPoClubId(poClubId);
    setSelectedPoClubDisplayNumber(displayNumber);
    setCurrentView('material_details');
  };

  const handleBack = () => {
    if (currentView === 'material_details') {
      setCurrentView('po_club');
    } else if (currentView === 'po_club') {
      setCurrentView('main');
    }
  };

  useEffect(() => {
    fetchCustomerCostingDetails();
  }, [warehouseId, customerId]);

  return (
    <Box>

      {currentView === 'main' ? (
        <>
          <Typography variant="h5" sx={{ mb: 2 }}>
            {customerName} in {warehouseName}
          </Typography>
          
          {isLoading ? (
            <DefaultLoader />
          ) : (
            <>
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
              
              <TableContainer>
                <Table sx={{ borderCollapse: "collapse", minWidth: 650 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: "bold", fontSize: "1em", border: "1px solid #E0E0E0" }}>Costing Display Number</TableCell>
                      <TableCell sx={{ fontWeight: "bold", fontSize: "1em", border: "1px solid #E0E0E0" }}>Allocated Racks</TableCell>
                      <TableCell sx={{ fontWeight: "bold", fontSize: "1em", border: "1px solid #E0E0E0" }}>Allocated Bins</TableCell>
                      <TableCell sx={{ fontWeight: "bold", fontSize: "1em", border: "1px solid #E0E0E0" }}>Quantity</TableCell>
                      <TableCell sx={{ fontWeight: "bold", fontSize: "1em", border: "1px solid #E0E0E0" }}>Price(USD)</TableCell>
                      <TableCell sx={{ fontWeight: "bold", fontSize: "1em", border: "1px solid #E0E0E0" }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {costingDetails.map((customer: any, customerIndex: number) => (
                      customer.rack_details?.length > 0 ? (
                        customer.rack_details.map((rack: any, rackIndex: number) => (
                          <TableRow key={`${customerIndex}_${rackIndex}`}>
                            {rackIndex === 0 && (
                              <TableCell rowSpan={customer.rack_details.length} sx={{ border: "1px solid #E0E0E0" }}>
                                <Link
                                  sx={{ cursor: 'pointer' }}
                                  href={orderSummaryPageURL(customer.order_id, customer.costing_id)} 
                                >
                                  {customer.short_code}
                                </Link>
                              </TableCell>
                            )}
                            <TableCell sx={{ border: "1px solid #E0E0E0" }}>
                              {rack.display_number}
                            </TableCell>
                            <TableCell sx={{ border: "1px solid #E0E0E0" }}>
                              {rack.bin_details?.map((bin: any) => bin.display_number).join(", ")}
                            </TableCell>
                            {rackIndex === 0 && (
                              <>
                                <TableCell rowSpan={customer.rack_details.length} sx={{ border: "1px solid #E0E0E0" }}>
                                  {`${formatAmount(customer.material_quantity || "--")} ${customer.material_quantity_units || ""}`}
                                </TableCell>
                                <TableCell rowSpan={customer.rack_details.length} sx={{ border: "1px solid #E0E0E0" }}>
                                  {formatAmount(customer.material_price)}
                                </TableCell>
                                <TableCell rowSpan={customer.rack_details.length} sx={{ border: "1px solid #E0E0E0" }}>
                                  <IconButton onClick={() => handleViewPoClub(customer.costing_id, customer.short_code)}>
                                    <LaunchIcon />
                                  </IconButton>
                                </TableCell>
                              </>
                            )}
                          </TableRow>
                        ))
                      ) : (
                        <TableRow key={`${customerIndex}_no_racks`}>
                          <TableCell sx={{ border: "1px solid #E0E0E0" }}>
                            {customer.costing_id}
                          </TableCell>
                          <TableCell sx={{ border: "1px solid #E0E0E0" }}>N/A</TableCell>
                          <TableCell sx={{ border: "1px solid #E0E0E0" }}>N/A</TableCell>
                          <TableCell sx={{ border: "1px solid #E0E0E0" }}>
                            {`${formatAmount(customer.material_quantity || "--")} ${customer.material_quantity_units || ""}`}
                          </TableCell>
                          <TableCell sx={{ border: "1px solid #E0E0E0" }}>{formatAmount(customer.material_price)}</TableCell>
                          <TableCell sx={{ border: "1px solid #E0E0E0" }}>
                            <IconButton onClick={() => handleViewPoClub(customer.costing_id, customer.short_code)}>
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
          )}
        </>
      ) : currentView === 'po_club' ? (
        <CustomerWiseCostingPoClub
          warehouseId={warehouseId}
          customerId={customerId}
          costingId={selectedCostingId}
          versionDisplayNumber={selectedVersionDisplayNumber}
          customerName={customerName}
          warehouseName={warehouseName}
          onViewMaterialDetails={handleViewMaterialDetails}
        />
      ) : (
        <CostingPoClubMaterialDetails
          warehouseId={warehouseId}
          customerId={customerId}
          costingId={selectedCostingId}
          poClubId={selectedPoClubId}
          versionDisplayNumber={selectedVersionDisplayNumber}
          customerName={customerName}
          warehouseName={warehouseName}
          displyNumber={selectedPoClubDisplayNumber}
        />
      )}

      {currentView !== 'main' && (
        <Button variant="contained" onClick={handleBack} sx={{ mb: 2 }}>
          Back
        </Button>
      )}

    </Box>
  );
};

export default CustomerWiseCosting;