import React, { useEffect, useState } from 'react';
import { getDefaultError } from '@/helpers/Utilities';
import toast from 'react-hot-toast';
import { Box, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import DefaultLoader from '@/components/DefaultLoader';
import api from '@/services/api';
import { grnMaterialDetailsSummaryURL } from '@/helpers/constants/rest_urls/POUrls';

const GRNDetailActivities = ({ grnId }: any) => {
  const [isLoading, setIsLoading] = useState(false);
  const [grnDetails, setGrnDetails] = useState<any>([]);
  const fetchData = () => {
    setIsLoading(true);
    api.get(grnMaterialDetailsSummaryURL(grnId)).then(resp => {
      const reseditdata = resp?.data || {};
      setGrnDetails([...reseditdata]);
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (grnId) {
      fetchData()
    }
  }, []);

  return (
    <>
      {isLoading ? (
        <DefaultLoader />
      ) : (
        <>
          <Box>
            <Table
              size="small"
              sx={{
                border: (theme) => `1px solid ${theme.palette.grey[200]}`,
                '& .MuiTableCell-head': {
                  color: (theme) => theme.palette.grey[700],
                  background: (theme) => theme.palette.grey[50],
                },
              }}
            >
              <TableHead>
                <TableRow>
                    <TableCell >Material</TableCell>
                    <TableCell >Material Code</TableCell>
                    <TableCell >Material Ritz Reference Code</TableCell>
                    <TableCell >Total Indicated Quantity</TableCell>
                    <TableCell >Total Expected Quantity Unit</TableCell>
                    <TableCell >QA Pass Quantity</TableCell>
                    <TableCell >Reject Quantity</TableCell>
                    <TableCell >Usable Quantity</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {grnDetails?.length > 0 ? (
                  grnDetails?.map((material: any, materialIndex: number) => (
                    <>
                      <TableRow
                        key={materialIndex}
                        sx={{
                          '&:last-child td, &:last-child th': {
                            border: 0,
                          },
                        }}
                      >
                      
                        <TableCell>{material?.material_details?.material_label ?? '-'}</TableCell>
                        <TableCell>{material?.material_details?.ritz_customer_brand_reference_code ?? '-'}</TableCell>
                        <TableCell>{material?.material_details?.reference_code ?? '-'}</TableCell>
                        <TableCell>{material?.total_expected_quantity ?? '-'}</TableCell>
                        <TableCell>{material?.total_expected_quantity_units ?? '-'}</TableCell>
                        <TableCell>{material?.total_qa_passed_quantity?.total_qa_passed_quantity? `${material.total_qa_passed_quantity.total_qa_passed_quantity} ${material.total_qa_passed_quantity.total_qa_passed_quantity_units}`: '-'}</TableCell>
                        <TableCell>{material?.total_qa_rejected_quantity ?? '-'} {material?.total_qa_rejected_quantity_units}</TableCell>
                        <TableCell>{material?.usable_quantity < 0 ? 0 : material?.usable_quantity ?? '-'} {material?.usable_quantity_units}</TableCell>
                      </TableRow>
                    </>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={grnDetails?.grn_headers?.length || 7} sx={{ textAlign: 'center' }}>
                      <Box>There is nothing to show on material details.</Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
        </>
      )}
    </>
  );
};

export default GRNDetailActivities;
