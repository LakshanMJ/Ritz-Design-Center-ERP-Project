import { Box, Checkbox, Table, TableBody, TableCell, TableHead, TableRow, Typography, useTheme } from "@mui/material";
import React, { useState } from "react";
import CustomerBrandMaterialDetail from "../settings/userdefine_material/MaterialDetail";
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
const TransferBOMDetails = ({ dataSet }: any) => {
  const theme = useTheme();
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
      {Object.entries(dataSet).map(([category, materials]: [string, { material_data?: [] }]) => (
        (!!materials?.material_data && materials.material_data.length > 0) && (
          <React.Fragment key={category}>
            <Box sx={{ mt: 2, mb: 2 }}>
              <Typography variant="h4" color="primary" sx={{ fontWeight: "bold" }}>
                {category.replace("_", " ").toUpperCase()}
              </Typography>
            </Box>
            <Box>
              <Table>
                <TableHead>
                  <TableRow sx={{ background: theme.palette.grey[100] }}>
                    <TableCell sx={{ border: `1px solid ${theme.palette.grey[200]}`, width: "20%" }}>Material Description</TableCell>
                    <TableCell sx={{ border: `1px solid ${theme.palette.grey[200]}`, width: "15%" }}>Transfer Quantity</TableCell>
                    <TableCell sx={{ border: `1px solid ${theme.palette.grey[200]}`, width: "15%" }}>GRN Quantity</TableCell>
                    <TableCell sx={{ border: `1px solid ${theme.palette.grey[200]}`, textAlign: "center", width: "10%" }}>Transfer Verification</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {materials.material_data.map((material: any, index: number) => (
                    <TableRow key={material?.id || index}>
                      <TableCell sx={{ border: `1px solid ${theme.palette.grey[200]}` }}>
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          {material?.attributes?.ritz_customer_brand_reference_code}
                          <OpenInNewIcon
                            sx={{ ml: 1, color: "rgb(25, 118, 210)", cursor: "pointer" }}
                            onClick={() =>
                              setShowMaterialDetailsModal({
                                modalStatus: true,
                                materialId: material?.attributes?.customer_brand_material_id,
                              })
                            }
                          />
                        </Box>
                      </TableCell>
                      <TableCell sx={{ border: `1px solid ${theme.palette.grey[200]}` }}>
                        {material?.transfer_quantity?.quantity} {material?.transfer_quantity?.quantity_units_display}
                      </TableCell>
                      <TableCell sx={{ border: `1px solid ${theme.palette.grey[200]}` }}>
                        {material?.grn_quantity?.quantity} {material?.grn_quantity?.quantity_units_display}
                      </TableCell>
                      <TableCell sx={{ border: `1px solid ${theme.palette.grey[200]}`, textAlign: "center", backgroundColor:"#E4EFE7", }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {material?.transfer_verification ? (
                            <CheckIcon sx={{ color: "green" }} />
                          ) : (
                            <CloseIcon sx={{ color: "red" }} />
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </React.Fragment>
        )
      ))}
    </>
  );
};

export default TransferBOMDetails;