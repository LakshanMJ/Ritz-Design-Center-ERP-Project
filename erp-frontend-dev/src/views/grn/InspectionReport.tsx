import React, { useEffect, useState } from 'react';
import { getDefaultError } from '@/helpers/Utilities';
import toast from 'react-hot-toast';
import { Alert, Box, Card, CardHeader, Grid, InputLabel, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import DefaultLoader from '@/components/DefaultLoader';
import api from '@/services/api';
import * as GrnUrls from '../../helpers/constants/rest_urls/GrnUrls';
import RitzUploader from '@/components/Ritz/RitzUploader';
import RitzImageUploader from '@/components/Ritz/RitzImageUploader';
import { THUMBNAILVIEW } from '@/helpers/constants/FileUpload';

const InspectionReport = ({ sourceId, sourceDataUrl }: any) => {
  const [isLoading, setIsLoading] = useState(true);
  const [inspectionDetails, setInspectionDetails] = useState([]);

  const fetchData = () => {
    if (sourceId > 0) {
      setIsLoading(true);
      const requests = [
        api.get(GrnUrls.grnInspectionSummaryListUrl(sourceId)),
      ]
      Promise.all(requests).then((resp) => {
        const respData = resp.map(r => r.data);
        const [inspectionReportDetails] = respData
        setInspectionDetails([...inspectionReportDetails]);
      })
        .catch((error) => {
          toast.error(getDefaultError(error?.response?.status));
        })
        .finally(() => setIsLoading(false));
    }
  };
  useEffect(() => {
    if (sourceId) {
      fetchData();
    }
  }, []);

  return (
    <>
      {isLoading ? (
        <DefaultLoader />
      ) : (
        <>
          {inspectionDetails.length === 0 && (
            <Alert severity="info">Inspection reports not available at the moment</Alert>
          )}
          <TableContainer>
            {inspectionDetails.map((inspectionDetail: any, materialIndex: number) => (
              <React.Fragment key={materialIndex}>
                <Card variant="outlined" sx={{ mb: 3, mt: 1 }} key={materialIndex}>
                  <CardHeader
                    title={inspectionDetail?.material_details?.ritz_customer_brand_reference_code}
                    sx={{
                      background: (theme) => theme.palette.grey[100],
                      fontWeight: 'bold',
                      borderBottom: (theme) => `1px solid ${theme.palette.grey[300]}`,
                    }}
                  ></CardHeader>
                  <Grid container spacing={1}>
                    {inspectionDetail.batch_details && inspectionDetail.batch_details.length > 0 ? (
                      inspectionDetail.batch_details.map((batchDetail: any, batchDetailIndex: number) => (
                        <Grid item xs={3} sm={3} key={batchDetailIndex}>
                          <Card sx={{ mb: 1, mt: 1, ml: 1, mr: 1 }}>
                            <Table aria-label="simple table">
                              <TableBody>
                                <TableRow>
                                  <TableCell sx={{ fontWeight: 'bold' }}>{batchDetail.batch_number}</TableCell>
                                  <TableCell />
                                </TableRow>
                                <TableRow>
                                  <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%' }}>Average Point Value</TableCell>
                                  <TableCell sx={{ width: '50%', wordBreak: 'break-all' }}>{batchDetail.avg_defect_rate_per_100_square_yards}</TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%' }}>Remarks</TableCell>
                                  <TableCell sx={{ width: '50%', wordBreak: 'break-all' }}>{batchDetail.remark || '--'}</TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%' }}>Rolls with Roll to Roll Shade</TableCell>
                                  <TableCell sx={{ width: '50%', wordBreak: 'break-all' }}>{batchDetail.roll_to_roll_shading.join(', ') || '--'}</TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%' }}>Rolls with Within the Roll Shade</TableCell>
                                  <TableCell sx={{ width: '50%', wordBreak: 'break-all' }}>{batchDetail.within_the_roll_shading.join(', ') || '--'}</TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%' }}>Failed Rolls</TableCell>
                                  <TableCell sx={{ width: '50%', wordBreak: 'break-all' }}>{batchDetail.fail_rolls.join(', ') || '--'}</TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </Card>
                        </Grid>
                      ))
                    ) : (
                      <Grid item xs={12} sx={{ mb: 1 }}>
                        <Typography sx={{ mt: 1 }} variant="body1" align="center">No available shade groups</Typography>
                      </Grid>
                    )}
                  </Grid>
                </Card>
              </React.Fragment>
            ))}
          </TableContainer>
        </>
      )}
    </>
  );
};

export default InspectionReport;
