import { Box, Checkbox, LinearProgress, Link, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, useTheme } from "@mui/material";
import React, { useState } from "react";
import CustomerBrandMaterialDetail from "../settings/userdefine_material/MaterialDetail";
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { createdGrnDetailsPageURL } from "@/helpers/constants/front_end/GrnUrls";
import NextLink from 'next/link';
import { ReactKeyHelper } from "@/helpers/KeyHelper";
const TransferGRNDetails = ({ dataSet }: any) => {
  const theme = useTheme();
  const keyHelper = new ReactKeyHelper();
  const [showMaterialDetailsModal, setShowMaterialDetailsModal] = useState({ modalStatus: null, materialId: null });

  return (
    <>
      {showMaterialDetailsModal.modalStatus &&
        <CustomerBrandMaterialDetail
          customerBrandMaterialReferenceCodeId={showMaterialDetailsModal?.materialId}
          modalOpen={showMaterialDetailsModal?.modalStatus}
          setModalOpen={() => { setShowMaterialDetailsModal({ modalStatus: false, materialId: null }) }}
        />
      }

      {Object?.entries(dataSet).map(([category, materials]: [string, { material_data?: [] }]) => (
        (!!materials?.material_data && materials.material_data.length > 0) && (
          <React.Fragment key={category}>
            <Box sx={{ mt: 2, mb: 2 }}>
              <Typography variant="h4" color="primary" sx={{ fontWeight: "bold" }}>
                {category.replace("_", " ").toUpperCase()}
              </Typography>
            </Box>
            <Box>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ background: theme.palette.grey[100] }}>
                      <TableCell colSpan={5} sx={{ border: `1px solid ${theme.palette.grey[200]}` }}></TableCell>
                      <TableCell colSpan={5} sx={{ border: `1px solid ${theme.palette.grey[300]}`, textAlign: 'center', backgroundColor:"#E4EFE7", }}> Transfer Verification</TableCell>
                    </TableRow>
                    <TableRow sx={{ background: theme.palette.grey[100] }}>
                      <TableCell rowSpan={2} sx={{ border: `1px solid ${theme.palette.grey[200]}`, width: "10%" }}>Delivery</TableCell>
                      <TableCell rowSpan={2} sx={{ border: `1px solid ${theme.palette.grey[200]}`, width: "10%" }}>Material Description</TableCell>
                      <TableCell rowSpan={2} sx={{ border: `1px solid ${theme.palette.grey[200]}`, width: "10%" }}>GRN No</TableCell>
                      <TableCell rowSpan={2} sx={{ border: `1px solid ${theme.palette.grey[200]}`, width: "10%" }}>GRN Quantity</TableCell>
                      <TableCell sx={{ border: `1px solid ${theme.palette.grey[200]}`, width: "10%" }}>Excess Threshold</TableCell>
                      <TableCell sx={{ border: `1px solid ${theme.palette.grey[300]}`,  backgroundColor:"#E4EFE7" }}>GRN Quantity</TableCell>
                      <TableCell sx={{ border: `1px solid ${theme.palette.grey[300]}`,  backgroundColor:"#E4EFE7" }}>Excess Quantity</TableCell>
                      <TableCell sx={{ border: `1px solid ${theme.palette.grey[300]}`,  backgroundColor:"#E4EFE7" }}>Difference</TableCell>
                      <TableCell sx={{ border: `1px solid ${theme.palette.grey[300]}`,  backgroundColor:"#E4EFE7" }}>Remark</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {materials?.material_data?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} sx={{ border: `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>No data available</TableCell>
                      </TableRow>
                    ) : (
                      materials?.material_data?.map((material: any, index: number) => {
                        const progressValue = material?.excess_threshold // D-need to add calculation in this section
                        return (
                          <TableRow key={`${keyHelper.getNextKeyValue()}`}>
                            <TableCell sx={{ border: `1px solid ${theme.palette.grey[200]}` }}>
                              <Box>
                                <Typography>{material?.delivery_display_number}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                  ({material?.confirmed_delivery_date})
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell sx={{ border: `1px solid ${theme.palette.grey[200]}` }}>
                              <Box sx={{ display: "flex", alignItems: "center" }}>
                                {material?.attributes?.ritz_customer_brand_reference_code}
                                <OpenInNewIcon
                                  sx={{
                                    ml: 1,
                                    color: "rgb(25, 118, 210)",
                                    cursor: "pointer",
                                  }}
                                  onClick={() =>
                                    setShowMaterialDetailsModal({
                                      modalStatus: true,
                                      materialId: material?.attributes?.customer_brand_material_id,
                                    })
                                  }
                                />
                              </Box>
                            </TableCell>
                            <TableCell sx={{ border: `1px solid ${theme.palette.grey[200]}` }}><Link target="_blank" component={NextLink} href={createdGrnDetailsPageURL(material?.grn_id) || '#'}>{material?.grn_display_number}</Link></TableCell>
                            <TableCell sx={{ border: `1px solid ${theme.palette.grey[200]}` }}>{material?.grn_quantity?.quantity} {material?.grn_quantity?.quantity_units_display}</TableCell>
                            <TableCell sx={{ border: `1px solid ${theme.palette.grey[200]}`, textAlign: "center" }}>
                              <Box sx={{ position: "relative", width: "100%", height: "20px", backgroundColor: "#f0f0f0" }}>
                                <Box
                                  sx={{
                                    position: "absolute",
                                    top: 0,
                                    left: "50%",
                                    width: `${Math.abs(progressValue)}%`,
                                    height: "100%",
                                    backgroundColor: progressValue >= 0 ? "#4caf50" : "#d32f2f",
                                    transform: progressValue >= 0 ? "translateX(0)" : "translateX(-100%)",
                                  }}
                                />
                                <Box
                                  sx={{
                                    position: "absolute",
                                    top: "100%",
                                    left: "50%",
                                    transform: "translateX(-50%)",
                                    color: "#000",
                                    fontSize: "12px",
                                    fontWeight: "bold",
                                    whiteSpace: "nowrap",
                                    marginTop: "4px",
                                  }}
                                >
                                  {progressValue}%
                                </Box>
                              </Box>
                            </TableCell>
                            {/* transferdata */}
                            <TableCell sx={{ border: `1px solid ${theme.palette.grey[300]}`,  backgroundColor:"#E4EFE7" }}>{material?.transfer_total_grn_quantity?.quantity} {material?.transfer_total_grn_quantity?.quantity_units_display}</TableCell>
                            <TableCell sx={{ border: `1px solid ${theme.palette.grey[300]}`,  backgroundColor:"#E4EFE7" }}>{material?.transfer_total_excess_quantity?.quantity} {material?.transfer_total_excess_quantity?.quantity_units_display}</TableCell>
                            <TableCell sx={{ border: `1px solid ${theme.palette.grey[300]}`,  backgroundColor:"#E4EFE7" }}>{material?.transfer_total_difference_quantity?.quantity} {material?.transfer_total_difference_quantity?.quantity_units_display}</TableCell>
                            <TableCell sx={{ border: `1px solid ${theme.palette.grey[300]}` ,  backgroundColor:"#E4EFE7"}}>--</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </React.Fragment>
        )
      ))}
    </>
  );
};

export default TransferGRNDetails;