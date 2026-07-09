import React, { useEffect, useState } from 'react';
import { getDefaultError } from '@/helpers/Utilities';
import toast from 'react-hot-toast';
import { Alert, Box, Card, CardHeader, Divider, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import DefaultLoader from '@/components/DefaultLoader';
import api from '@/services/api';
import LaunchIcon from '@mui/icons-material/Launch';
import { createdGrnDetailsPageURL } from '@/helpers/constants/front_end/GrnUrls';

const GrnSummaryReport = ({ sourceDataUrl, sourceId }: any) => {
  const [isLoading, setIsLoading] = useState(true);
  const [grnDetails, setGrnDetails] = useState({pending_deliveries:[], grn_list:[]});
  const fetchData = () => {
    if (sourceId > 0) {
      setIsLoading(true);
      const requests = [
        api.get(sourceDataUrl(sourceId)),
      ]
      Promise.all(requests).then((resp) => {
        const respData = resp.map(r => r.data);
        const [grnSummaryData] = respData
        setGrnDetails(grnSummaryData)
      })
        .catch((error) => {
          toast.error(getDefaultError(error?.response?.status));
        })
        .finally(() => setIsLoading(false));
    }
  };

  const handleLinkGrn = (grnId: number) => {
    const newPageUrl = createdGrnDetailsPageURL(grnId);
    window.open(newPageUrl, '_blank');
  }

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
            <Box>
              <Box>
                <Typography variant='h6' style={{ fontWeight: 'bold', marginRight: '10px'}}> Pending Deliveries : </Typography>
              </Box>
              <Box sx={{mb:2}}>
                {grnDetails?.pending_deliveries.length == 0 && (
                  <Alert severity="info" sx={{ mt: 1, mb: 1 }}>No available pending deliveries </Alert>
                )
                }
                <TableContainer>
                  {grnDetails?.pending_deliveries.map((deliveryData: any, deliveryIndex: number) => (
                    <React.Fragment key={deliveryIndex}>
                      <Card variant="outlined" sx={{ mb: 2, mt: 1 }} key={deliveryIndex}>
                        <CardHeader
                          title={
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {deliveryData?.date}
                            </Box>
                          }
                          sx={{
                            background: (theme) => theme.palette.grey[100],
                            fontWeight: 'bold',
                            borderBottom: (theme) => `1px solid ${theme.palette.grey[300]}`,
                          }}
                        ></CardHeader>
                        <Grid container spacing={1}>
                          <Table aria-label="simple table">
                            <TableHead>
                              <TableRow >
                                <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Material</TableCell>
                                <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Material Reference Code</TableCell>
                                <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Ritz Reference Code</TableCell>
                                <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Order Quantity</TableCell>
                                <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Price</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {deliveryData?.material_details.map((material: any, grnIndex: number) => (
                                <TableRow key={grnIndex}>
                                  <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{material.material || '--'}</TableCell>
                                  <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{material.reference_code || '--'}</TableCell>
                                  <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{material.ritz_reference_code || '--'}</TableCell>
                                  <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{material.quantity || '--'}</TableCell>
                                  <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{material.price || '--'}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </Grid>
                      </Card>
                    </React.Fragment>
                  ))}
                </TableContainer>
              </Box>
              <Box>
                <Typography variant='h6' style={{ fontWeight: 'bold', marginRight: '10px'}}> Created GRNs :  </Typography>
              </Box>
              <Box>
              {grnDetails?.grn_list.length == 0 && (
                  <Alert severity="info" sx={{ mt: 1, mb: 1 }}>No available GRNs </Alert>
                )
                }
                <TableContainer>
                  {grnDetails?.grn_list.map((grnDetail: any, grnIndex: number) => (
                    <React.Fragment key={grnIndex}>
                      <Card variant="outlined" sx={{ mb: 2, mt: 1 }} key={grnIndex}>
                        <CardHeader
                          title={
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {grnDetail?.grn_number}
                              <LaunchIcon sx={{ marginLeft: '5px', color: 'primary.main', cursor: 'pointer' }} onClick={() => handleLinkGrn(grnDetail.id)} />

                            </Box>
                          }
                          sx={{
                            background: (theme) => theme.palette.grey[100],
                            fontWeight: 'bold',
                            borderBottom: (theme) => `1px solid ${theme.palette.grey[300]}`,
                          }}
                        ></CardHeader>
                        <Grid container spacing={1}>
                          <Table aria-label="simple table">
                            <TableHead>
                              <TableRow >
                                <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Material</TableCell>
                                <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Material Reference Code</TableCell>
                                <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Ritz Reference Code</TableCell>
                                <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Total Actual Quantity</TableCell>
                                <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Total Actual Quantity Units</TableCell>
                                <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Grn Price</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {grnDetail?.material_details.map((material: any, grnIndex: number) => (
                                <TableRow key={grnIndex}>
                                  <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{material.material || '--'}</TableCell>
                                  <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{material.reference_code || '--'}</TableCell>
                                  <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{material.ritz_reference_code || '--'}</TableCell>
                                  <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{material.total_actual_quantity || '--'}</TableCell>
                                  <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{material.total_actual_quantity_units || '--'}</TableCell>
                                  <TableCell sx={{ borderRight: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{material.grn_price || '--'}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </Grid>
                      </Card>
                    </React.Fragment>
                  ))}
                </TableContainer>
              </Box>
            </Box>
        </>
      )}
    </>
  );
};

export default GrnSummaryReport;
