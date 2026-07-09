import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Alert,
  Link,
} from "@mui/material";
import * as VirtualWarehouseUrls from "@/helpers/constants/rest_urls/VirtualWarehouseUrls";
import api from "@/services/api";
import { toast } from "react-hot-toast";
import { getDefaultError, formatAmount } from "@/helpers/Utilities";
import DefaultLoader from "@/components/DefaultLoader";
import RitzTablePagination from "@/components/Ritz/RitzTablePagination";
import LaunchIcon from '@mui/icons-material/Launch';
import { purchaseOrderClubDetailsPageURL } from '@/helpers/constants/front_end/POUrls';

interface CustomerWiseCostingPoClubProps {
  warehouseId: string;
  customerId: string;
  costingId: string;
  versionDisplayNumber: string;
  customerName: string;
  warehouseName: string;
  onViewMaterialDetails: (poClubId: string, displayNumber: string) => void;
}

const CustomerWiseCostingPoClub: React.FC<CustomerWiseCostingPoClubProps> = ({
  warehouseId,
  customerId,
  costingId,
  versionDisplayNumber,
  customerName,
  warehouseName,
  onViewMaterialDetails
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [poClubDetails, setPoClubDetails] = useState<any[]>([]);
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

  const fetchPoClubDetails = (page: number = 1, pageSize: number = tablePageSize) => {
    setIsLoading(true);
    const url = VirtualWarehouseUrls.warehouseCustomerCostingPoClubDetails(warehouseId, customerId, costingId, page, pageSize);

    api
      .get(url)
      .then((response) => {
        const details = response.data?.results || [];
        setPoClubDetails(details);
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
    fetchPoClubDetails(newPage + 1, tablePageSize);
  };

  const handlePageSizeChange = (event: any) => {
    const newSize = parseInt(event.target.value, 10);
    setTablePageSize(newSize);
    setPageIndex(0);
    fetchPoClubDetails(1, newSize);
  };

  useEffect(() => {
    fetchPoClubDetails();
  }, [warehouseId, customerId, costingId]);

  const processPoClubData = (data: any[]) => {
    return data.map(poClub => {
      const racks = poClub.rack_details || [];
      return {
        ...poClub,
        racks: racks
      };
    });
  };

  const processedData = processPoClubData(poClubDetails);

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>
        {customerName} in {warehouseName} - {versionDisplayNumber}
      </Typography>

      {isLoading ? (
        <DefaultLoader />
      ) : processedData.length > 0 ? (
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
                  <TableCell sx={{ fontWeight: "bold", fontSize: "1em", border: "1px solid #E0E0E0" }}>
                    PO Club Display Number
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold", fontSize: "1em", border: "1px solid #E0E0E0" }}>
                    Allocated Rack
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold", fontSize: "1em", border: "1px solid #E0E0E0" }}>
                    Allocated Bins
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold", fontSize: "1em", border: "1px solid #E0E0E0" }}>
                    Quantity
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold", fontSize: "1em", border: "1px solid #E0E0E0" }}>
                    Price(USD)
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold", fontSize: "1em", border: "1px solid #E0E0E0" }}>
                    Action
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {processedData.map((poClub: any, poClubIndex: number) => 
                  poClub.rack_details?.length > 0 ? (
                    poClub.rack_details.map((rack: any, rackIndex: number) => (
                      <TableRow key={`${poClubIndex}_${rackIndex}`}>
                        {rackIndex === 0 && (
                          <TableCell
                            rowSpan={poClub.rack_details.length}
                            sx={{ border: "1px solid #E0E0E0" }}
                          >
                            <Link
                                sx={{ cursor: 'pointer' }}
                                href={purchaseOrderClubDetailsPageURL(poClub.po_club_id)} 
                              >
                                {poClub.short_code}
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
                            <TableCell
                              rowSpan={poClub.rack_details.length}
                              sx={{ border: "1px solid #E0E0E0" }}
                            >
                              {`${formatAmount(poClub.material_quantity || "--")} ${poClub.material_quantity_units || ""}`}
                            </TableCell>
                            <TableCell
                              rowSpan={poClub.rack_details.length}
                              sx={{ border: "1px solid #E0E0E0" }}
                            >
                              {formatAmount(poClub.material_price)}
                            </TableCell>
                            <TableCell
                              rowSpan={poClub.rack_details.length}
                              sx={{ border: "1px solid #E0E0E0" }}
                            >
                              <IconButton onClick={() => onViewMaterialDetails(poClub.po_club_id, poClub.short_code)}>
                                <LaunchIcon />
                              </IconButton>
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow key={`${poClubIndex}_no_racks`}>
                      <TableCell sx={{ border: "1px solid #E0E0E0" }}>
                        {poClub.short_code}
                      </TableCell>
                      <TableCell sx={{ border: "1px solid #E0E0E0" }}>N/A</TableCell>
                      <TableCell sx={{ border: "1px solid #E0E0E0" }}>N/A</TableCell>
                      <TableCell sx={{ border: "1px solid #E0E0E0" }}>
                        {`${formatAmount(poClub.material_quantity || "--")} ${poClub.material_quantity_units || ""}`}
                      </TableCell>
                      <TableCell sx={{ border: "1px solid #E0E0E0" }}>
                        {formatAmount(poClub.material_price)}
                      </TableCell>
                      <TableCell sx={{ border: "1px solid #E0E0E0" }}>
                        <IconButton onClick={() => onViewMaterialDetails(poClub.po_club_id, poClub.short_code)}>
                          <LaunchIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  )
                )}
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
      ) : (
        <Alert severity="info">No PO Club details found.</Alert>
      )}
    </Box>
  );
};

export default CustomerWiseCostingPoClub;