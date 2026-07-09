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
  Alert,
} from "@mui/material";
import * as VirtualWarehouseUrls from "@/helpers/constants/rest_urls/VirtualWarehouseUrls";
import api from "@/services/api";
import DefaultLoader from "@/components/DefaultLoader";
import RitzTablePagination from "@/components/Ritz/RitzTablePagination";
import RitzTooltip from "@/components/Ritz/RitzTooltip";
import { formatAmount } from "@/helpers/Utilities";

interface CostingPoClubMaterialDetailsProps {
  warehouseId: string;
  customerId: string;
  costingId: string;
  poClubId: string;
  versionDisplayNumber: string;
  customerName: string;
  warehouseName: string;
  displyNumber: string;
}

const CostingPoClubMaterialDetails: React.FC<CostingPoClubMaterialDetailsProps> = ({
  warehouseId,
  customerId,
  costingId,
  poClubId,
  versionDisplayNumber,
  customerName,
  warehouseName,
  displyNumber,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [materialDetails, setMaterialDetails] = useState<any[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [tablePageSize, setTablePageSize] = useState(50);
  const [paginationData, setPaginationData] = useState({
    count: 0,
    next: null,
    previous: null,
  });
  const [totalMaterialQuantity, setTotalMaterialQuantity] = useState<number>(0);
  const [totalMaterialPrice, setTotalMaterialPrice] = useState<number>(0);
  const [TotalMaterialQuantityUnits, setTotalMaterialQuantityUnits] = useState<string>("");

  const fetchMaterialDetails = (page: number = 1, pageSize: number = tablePageSize) => {
    setIsLoading(true);
    const url = VirtualWarehouseUrls.WarehouseCustomerCostingPoClubMaterialDetails(
      warehouseId,
      customerId,
      costingId,
      poClubId,
      page,
      pageSize
    );

    api
      .get(url)
      .then((response) => {
        setMaterialDetails(response.data?.results || []);
        setPaginationData({
          count: response.data?.count || 0,
          next: response.data?.next,
          previous: response.data?.previous,
        });
        setTotalMaterialQuantity(response.data?.meta_data?.total_material_quantity || 0);
        setTotalMaterialPrice(response.data?.meta_data?.total_material_price || 0);
        setTotalMaterialQuantityUnits(response.data?.meta_data?.total_material_quantity_units || "");
      })
      .catch((error) => {
        console.error("Error fetching material details:", error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handlePageNumberChange = (_: any, newPage: number) => {
    setPageIndex(newPage);
    fetchMaterialDetails(newPage + 1, tablePageSize);
  };

  const handlePageSizeChange = (event: any) => {
    const newSize = parseInt(event.target.value, 10);
    setTablePageSize(newSize);
    setPageIndex(0);
    fetchMaterialDetails(1, newSize);
  };

  useEffect(() => {
    fetchMaterialDetails();
  }, [warehouseId, customerId, costingId, poClubId]);

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>
        {customerName} in {warehouseName} - {versionDisplayNumber} - {displyNumber}
      </Typography>
      {isLoading ? (
        <DefaultLoader />
      ) : materialDetails.length > 0 ? (
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
                  <TableCell
                    sx={{
                      fontWeight: "bold",
                      fontSize: "1em",
                      border: "1px solid #E0E0E0",
                    }}
                  >
                    Material
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: "bold",
                      fontSize: "1em",
                      border: "1px solid #E0E0E0",
                    }}
                  >
                    Rack
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: "bold",
                      fontSize: "1em",
                      border: "1px solid #E0E0E0",
                    }}
                  >
                    Bins
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: "bold",
                      fontSize: "1em",
                      border: "1px solid #E0E0E0",
                    }}
                  >
                    Quantity
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: "bold",
                      fontSize: "1em",
                      border: "1px solid #E0E0E0",
                    }}
                  >
                    Price(USD)
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {materialDetails.map((material: any, materialIndex: number) =>
                  material.rack_details?.length > 0 ? (
                    material.rack_details.map((rack: any, rackIndex: number) => (
                      <TableRow key={`${materialIndex}_${rackIndex}`}>
                        {rackIndex === 0 && (
                          <TableCell
                            rowSpan={material.rack_details.length}
                            sx={{ border: "1px solid #E0E0E0" }}
                          >
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              <Typography>
                                {material.customer_barnd_material_details.ritz_customer_brand_reference_code}
                              </Typography>
                              {material.customer_brand_material_headers && (
                                <RitzTooltip
                                  materialHeaders={material.customer_brand_material_headers}
                                  materialDetails={material.customer_barnd_material_details}
                                />
                              )}
                            </Box>
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
                              rowSpan={material.rack_details.length}
                              sx={{ border: "1px solid #E0E0E0" }}
                            >
                              {`${formatAmount(material.material_quantity || "--")} ${material.material_quantity_units || ""}`}
                            </TableCell>
                            <TableCell
                              rowSpan={material.rack_details.length}
                              sx={{ border: "1px solid #E0E0E0" }}
                            >
                              {formatAmount(material.material_price)}
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow key={`${materialIndex}_no_racks`}>
                      <TableCell sx={{ border: "1px solid #E0E0E0" }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Typography>
                            {material.customer_barnd_material_details.ritz_customer_brand_reference_code}
                          </Typography>
                          {material.customer_brand_material_headers && (
                            <RitzTooltip
                              materialHeaders={material.customer_brand_material_headers}
                              materialDetails={material.customer_barnd_material_details}
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ border: "1px solid #E0E0E0" }}>N/A</TableCell>
                      <TableCell sx={{ border: "1px solid #E0E0E0" }}>N/A</TableCell>
                      <TableCell sx={{ border: "1px solid #E0E0E0" }}>
                        {`${formatAmount(material.material_quantity || "--")} ${material.material_quantity_units || ""}`}
                      </TableCell>
                      <TableCell sx={{ border: "1px solid #E0E0E0" }}>
                        {formatAmount(material.material_price)}
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
        <Alert severity="info">No material details found.</Alert>
      )}
    </Box>
  );
};

export default CostingPoClubMaterialDetails;