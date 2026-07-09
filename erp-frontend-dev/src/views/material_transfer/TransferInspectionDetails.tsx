import { Box, Checkbox, IconButton, LinearProgress, Link, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, useTheme } from "@mui/material";
import React, { useState } from "react";
import CustomerBrandMaterialDetail from "../settings/userdefine_material/MaterialDetail";
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { createdGrnDetailsPageURL, createdGrnInspectionDetailsPageURL } from "@/helpers/constants/front_end/GrnUrls";
import NextLink from 'next/link';
import { ReactKeyHelper } from "@/helpers/KeyHelper";
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import PreviewIcon from '@mui/icons-material/Preview';

type ColorMapping = {
  Red: string;
  Green: string;
  Blue: string;
  Yellow: string;
};
const TransferInspectionDetails = ({ qualityData }: any) => {
  const theme = useTheme();
  const keyHelper = new ReactKeyHelper();
  const [showMaterialDetailsModal, setShowMaterialDetailsModal] = useState({ modalStatus: null, materialId: null });

  const colorMapping: ColorMapping | any = {
    Red: '#EB5353',
    Green: '#36AE7C',
    Blue: '#187498',
    Yellow: '#F9D923',
  };
  const renderColorBoxes = (colorTone: any) => {
    if (!colorTone?.display_value) return null;

    const colorParts = colorTone.display_value.split(" - ");

    return (
      <Box sx={{ display: 'flex', gap: 1 }}>
        {colorParts.map((colorPart: string, index: number) => {
          const backgroundColor = colorMapping[colorPart.replace(/\s+/g, '')] || '#000';
          return (
            <Box
              key={index}
              sx={{
                width: 70,
                height: 30,
                backgroundColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 1,
                fontWeight: 'bold',
                color: '#FFFFFF',
              }}
            >
              {colorPart}
            </Box>
          );
        })}
      </Box>
    );
  };
  return (
    <>
      {showMaterialDetailsModal.modalStatus &&
        <CustomerBrandMaterialDetail
          customerBrandMaterialReferenceCodeId={showMaterialDetailsModal?.materialId}
          modalOpen={showMaterialDetailsModal?.modalStatus}
          setModalOpen={() => { setShowMaterialDetailsModal({ modalStatus: false, materialId: null }) }}
        />
      }
      {Object?.entries(qualityData).map(([category, materials]: [string, { material_data?: [] }]) => (
        (!!materials?.material_data && materials.material_data.length > 0) && (
          <React.Fragment key={category}>
            <Box sx={{ mt: 2, mb: 2 }}>
              <Typography variant="h4" color="primary" sx={{ fontWeight: "bold" }}>
                {category.replace("_", " ").toUpperCase()}
              </Typography>
            </Box>
            {category === 'fabric' ? (
              <>
                <Box>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ background: theme.palette.grey[100] }}>
                          <TableCell colSpan={11} sx={{ border: `1px solid ${theme.palette.grey[200]}` }}></TableCell>
                          <TableCell colSpan={3} sx={{ border: `1px solid ${theme.palette.grey[300]}`, textAlign: 'center', backgroundColor:"#E4EFE7" }}>Transfer Verification</TableCell>
                        </TableRow>
                        <TableRow sx={{ background: theme.palette.grey[100] }}>
                          <TableCell rowSpan={2} sx={{ border: `1px solid ${theme.palette.grey[200]}`, width: "10%" }}>Delivery</TableCell>
                          <TableCell rowSpan={2} sx={{ border: `1px solid ${theme.palette.grey[200]}`, width: "10%" }}>Pack List</TableCell>
                          <TableCell rowSpan={2} sx={{ border: `1px solid ${theme.palette.grey[200]}`, width: "10%" }}>Material</TableCell>
                          <TableCell rowSpan={2} sx={{ border: `1px solid ${theme.palette.grey[200]}`, width: "10%" }}>GRN</TableCell>
                          <TableCell rowSpan={2} sx={{ border: `1px solid ${theme.palette.grey[200]}`, width: "10%" }}>Batch</TableCell>
                          <TableCell rowSpan={2} sx={{ border: `1px solid ${theme.palette.grey[200]}`, width: "10%" }}>Roll</TableCell>
                          <TableCell rowSpan={2} sx={{ border: `1px solid ${theme.palette.grey[200]}` }}>Quantity</TableCell>
                          <TableCell rowSpan={2} sx={{ border: `1px solid ${theme.palette.grey[200]}` }}>Color Tone</TableCell>
                          <TableCell rowSpan={2} sx={{ border: `1px solid ${theme.palette.grey[200]}` }}>Shade</TableCell>
                          <TableCell rowSpan={2} sx={{ border: `1px solid ${theme.palette.grey[200]}` }}>Inspect Status</TableCell>
                          <TableCell rowSpan={2} sx={{ border: `1px solid ${theme.palette.grey[200]}` }}>Result</TableCell>
                          <TableCell sx={{ border: `1px solid ${theme.palette.grey[300]}`,  backgroundColor:"#E4EFE7" }}>Quantity</TableCell>
                          <TableCell sx={{ border: `1px solid ${theme.palette.grey[300]}`,  backgroundColor:"#E4EFE7" }}>Color Tone</TableCell>
                          <TableCell sx={{ border: `1px solid ${theme.palette.grey[300]}`,  backgroundColor:"#E4EFE7" }}>Shade</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {materials?.material_data?.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={14} sx={{ border: `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>No data available</TableCell>
                          </TableRow>
                        ) : (
                          materials?.material_data?.map((inspection: any, inspectionIndex: number) => {
                            const totalRollsInInspection = inspection?.batches?.reduce((sum: number, batch: any) => sum + (batch?.rolls?.length || 0), 0);
                            console.log(inspection, "inspection")
                            return inspection?.batches?.map((batch: any, batchIndex: number) => {
                              return batch?.rolls?.map((roll: any, rollIndex: number) => (
                                <TableRow key={`${inspectionIndex}-${batchIndex}-${rollIndex}`}>
                                  {batchIndex === 0 && rollIndex === 0 && (
                                    <>
                                      <TableCell rowSpan={totalRollsInInspection} sx={{ border: `1px solid ${theme.palette.grey[200]}` }}>
                                        <Box>
                                          <Typography>{inspection?.delivery_display_number}</Typography>
                                          <Typography variant="body2" color="text.secondary">
                                            ({inspection?.confirmed_delivery_date})
                                          </Typography>
                                        </Box>
                                      </TableCell>
                                      <TableCell rowSpan={totalRollsInInspection} sx={{ border: `1px solid ${theme.palette.grey[200]}` }}>
                                        {inspection?.pack_list}
                                      </TableCell>
                                      <TableCell rowSpan={totalRollsInInspection} sx={{ border: `1px solid ${theme.palette.grey[200]}` }}>
                                        <Box sx={{ display: "flex", alignItems: "center" }}>
                                          {inspection?.attributes?.ritz_customer_brand_reference_code}
                                          <OpenInNewIcon
                                            sx={{
                                              ml: 1,
                                              color: "rgb(25, 118, 210)",
                                              cursor: "pointer",
                                            }}
                                            onClick={() =>
                                              setShowMaterialDetailsModal({
                                                modalStatus: true,
                                                materialId: inspection?.attributes?.customer_brand_material_id,
                                              })
                                            }
                                          />
                                        </Box>
                                      </TableCell>
                                      <TableCell rowSpan={totalRollsInInspection} sx={{ border: `1px solid ${theme.palette.grey[200]}` }}>
                                        <Box sx={{ display: "flex", alignItems: "center" }}>
                                          <Link target="_blank" component={NextLink} href={createdGrnDetailsPageURL(inspection?.grn_id) || '#'}>
                                            {inspection?.grn_display_number}
                                          </Link>
                                          <Link target="_blank" component={NextLink} href={createdGrnInspectionDetailsPageURL(inspection?.grn_id) || '#'}>
                                            <OpenInNewIcon sx={{ ml: 1, color: "rgb(25, 118, 210)", cursor: "pointer" }} />
                                          </Link>
                                        </Box>
                                      </TableCell>
                                    </>
                                  )}
                                  {rollIndex === 0 && (
                                    <TableCell rowSpan={batch?.rolls?.length} sx={{ border: `1px solid ${theme.palette.grey[200]}` }}>
                                      {batch?.batch_number}
                                    </TableCell>
                                  )}
                                  <TableCell sx={{ border: `1px solid ${theme.palette.grey[200]}` }}>{roll?.pack_number}</TableCell>
                                  <TableCell sx={{ border: `1px solid ${theme.palette.grey[200]}` }}>
                                    {roll?.actual_quantity} {roll?.actual_quantity_units?.display_value}
                                  </TableCell>
                                  <TableCell sx={{ border: `1px solid ${theme.palette.grey[200]}` }}>
                                    {renderColorBoxes(roll?.color_tone)}
                                  </TableCell>
                                  <TableCell sx={{ border: `1px solid ${theme.palette.grey[200]}` }}>{roll?.shade?.display_value}</TableCell>
                                  <TableCell sx={{ border: `1px solid ${theme.palette.grey[200]}`, textAlign: "center" }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      {roll?.inspection_state === "inspection_complete" ? (
                                        <CheckIcon sx={{ color: "green" }} />
                                      ) : roll?.inspection_state === "inspection_not_need" ? (
                                        <CloseIcon sx={{ color: "red" }} />
                                      ) : null}
                                    </Box>
                                  </TableCell>
                                  <TableCell sx={{ border: `1px solid ${theme.palette.grey[200]}` }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', color: roll?.qa_inspection_passed ? 'green' : 'red' }}>
                                      {roll?.qa_inspection_passed ? 'Pass' : !roll?.inspection_state ? 'Fail' : null}
                                    </Box>
                                  </TableCell>
                                  {/* Transfer Columns */}
                                  <TableCell sx={{ border: `1px solid ${theme.palette.grey[300]}`,  backgroundColor:"#E4EFE7" }}>{roll?.transfer_quantity?.quantity} {roll?.transfer_quantity?.quantity_units_display}</TableCell>
                                  <TableCell sx={{ border: `1px solid ${theme.palette.grey[300]}`,  backgroundColor:"#E4EFE7" }}>{renderColorBoxes(roll?.transfer_color_tone)}</TableCell>
                                  <TableCell sx={{ border: `1px solid ${theme.palette.grey[300]}`,  backgroundColor:"#E4EFE7" }}>{roll?.transfer_shade_name}</TableCell>
                                </TableRow>
                              ));
                            });
                          })
                        )}

                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              </>
            )
              : (
                <>
                  <Box>
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow sx={{ background: theme.palette.grey[100] }}>
                            <TableCell colSpan={5} sx={{ border: `1px solid ${theme.palette.grey[200]}` }}></TableCell>
                            <TableCell colSpan={2} sx={{ border: `1px solid ${theme.palette.grey[200]}`, textAlign: 'center',  backgroundColor:"#E4EFE7" }}>Transfer Verification</TableCell>
                          </TableRow>
                          <TableRow sx={{ background: theme.palette.grey[100] }}>
                            <TableCell rowSpan={2} sx={{ border: `1px solid ${theme.palette.grey[200]}`, width: "10%" }}>Delivery</TableCell>
                            <TableCell rowSpan={2} sx={{ border: `1px solid ${theme.palette.grey[200]}`, width: "10%" }}>Pack List</TableCell>
                            <TableCell rowSpan={2} sx={{ border: `1px solid ${theme.palette.grey[200]}`, width: "10%" }}>Material</TableCell>
                            <TableCell rowSpan={2} sx={{ border: `1px solid ${theme.palette.grey[200]}`, width: "10%" }}>GRN</TableCell>
                            <TableCell rowSpan={2} sx={{ border: `1px solid ${theme.palette.grey[200]}` }}>Quantity</TableCell>
                            <TableCell sx={{ border: `1px solid ${theme.palette.grey[200]}`,  backgroundColor:"#E4EFE7" }}>Quantity</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {materials?.material_data?.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={9} sx={{ border: `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>No data available</TableCell>
                            </TableRow>
                          ) : (
                            materials?.material_data?.map((inspection: any, inspectionIndex: number) => (
                              <TableRow key={inspectionIndex}>
                                <TableCell sx={{ border: `1px solid ${theme.palette.grey[200]}` }}>
                                  <Box>
                                    <Typography>{inspection?.delivery_display_number}</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      ({inspection?.confirmed_delivery_date})
                                    </Typography>
                                  </Box>
                                </TableCell>
                                <TableCell sx={{ border: `1px solid ${theme.palette.grey[200]}` }}>
                                  {inspection?.pack_list}
                                </TableCell>
                                <TableCell sx={{ border: `1px solid ${theme.palette.grey[200]}` }}>
                                  <Box sx={{ display: "flex", alignItems: "center" }}>
                                    {inspection?.attributes?.ritz_customer_brand_reference_code}
                                    <OpenInNewIcon
                                      sx={{ ml: 1, color: "rgb(25, 118, 210)", cursor: "pointer" }}
                                      onClick={() =>
                                        setShowMaterialDetailsModal({
                                          modalStatus: true,
                                          materialId: inspection?.attributes?.customer_brand_material_id,
                                        })
                                      }
                                    />
                                  </Box>
                                </TableCell>
                                <TableCell sx={{ border: `1px solid ${theme.palette.grey[200]}` }}>
                                  <Box sx={{ display: "flex", alignItems: "center" }}>
                                    <Link
                                      target="_blank"
                                      component={NextLink}
                                      href={createdGrnDetailsPageURL(inspection?.grn_id) || '#'}
                                    >
                                      {inspection?.grn_display_number}
                                    </Link>
                                    <Link
                                      target="_blank"
                                      component={NextLink}
                                      href={createdGrnInspectionDetailsPageURL(inspection?.grn_id) || '#'}
                                    >
                                      <OpenInNewIcon sx={{ ml: 1, color: "rgb(25, 118, 210)", cursor: "pointer" }} />
                                    </Link>
                                  </Box>
                                </TableCell>
                                <TableCell sx={{ border: `1px solid ${theme.palette.grey[200]}` }}>{inspection?.grn_detail?.actual_quantity} {inspection?.grn_detail?.actual_quantity_units?.display_value}</TableCell>
                                <TableCell sx={{ border: `1px solid ${theme.palette.grey[300]}`,  backgroundColor:"#E4EFE7" }}>{inspection?.transfer_quantity?.quantity || '--'} {inspection?.transfer_quantity?.quantity_units_display}</TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                </>
              )}
          </React.Fragment >
        )
      ))}
    </>
  );
};

export default TransferInspectionDetails;