import React, { useEffect, useState } from 'react';
import { getDefaultError } from '@/helpers/Utilities';
import toast from 'react-hot-toast';
import { Alert, Box, Card, CardHeader, Grid, IconButton, Link, ListItemIcon, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography, darken } from '@mui/material';
import DefaultLoader from '@/components/DefaultLoader';
import api from '@/services/api';
import * as GrnUrls from '../../helpers/constants/rest_urls/GrnUrls';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import InfoIcon from '@mui/icons-material/Info';
import { createdGrnDetailsPageURL } from '@/helpers/constants/front_end/GrnUrls';

const DDQDetails = ({ supplierPoId, selectedDeliveryId }: any) => {

  const [isLoading, setIsLoading] = useState(true);
  const [supplierPoDetails, setSupplierPoDetails] = useState<any>([]);
  const [materialDetails, setMaterialDetails] = useState<any>({});
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null);
  const getPurchaseOrderDetails = () => {
    setIsLoading(true)
    const requests = [
      api.get(GrnUrls.getDDQandDDQIDetailsURL(supplierPoId)),
    ]
    Promise.all(requests).then(response => {
      const [supplierPoDetails] = response.map((r: any) => r.data);
      setSupplierPoDetails([...supplierPoDetails]);
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => setIsLoading(false));
  };

  const handleCardClick = (delivery: any) => {
    setSelectedDelivery(delivery);
  };
  
  useEffect(() => {
    if (supplierPoId != 0) {
      getPurchaseOrderDetails();
    }
  }, [supplierPoId]);

  useEffect(() => {
    if (selectedDeliveryId && supplierPoDetails.length > 0) {
      const selectDeliveryData = supplierPoDetails.find((opt: any) => opt.id === selectedDeliveryId);
      if (selectDeliveryData) {
        setSelectedDelivery(selectDeliveryData);
      } else {
        setSelectedDelivery(null); 
      }
    }
  }, [selectedDeliveryId, supplierPoDetails]);

  return (
    <>

      {isLoading ? <DefaultLoader /> : (
        <>
          <Grid container spacing={2}>
            {supplierPoDetails.map((deliveryData: any, deliveryIndex: any) => (
              <Grid item xs={12} sm={12} md={12} key={deliveryIndex}>
                <Card variant="outlined" key={deliveryIndex} sx={{ border: selectedDelivery?.id === deliveryData.id && '1px solid green', cursor: 'pointer' }} onClick={() => handleCardClick(deliveryData)}>
                  <CardHeader
                    title={deliveryData.delivery_display}
                  />
                    <Table size="small" sx={{maxWidth: '600px', marginBottom: '1em'}}>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Planned Delivery Date</TableCell>
                          <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Actual Delivery Date</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        <TableRow>
                          <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>{deliveryData.confirmed_delivery_date}</TableCell>
                          <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>{deliveryData.actual_delivery_date}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>

                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left'}}><Typography variant="body1" fontWeight="bold">Material</Typography></TableCell>
                          <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left', width: '200px'}}><Typography variant="body1" fontWeight="bold">PI/ Confirmed Delivery Quantity</Typography></TableCell>
                          <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left', width: '200px'}}><Typography variant="body1" fontWeight="bold">Replacement Quantity</Typography></TableCell>
                          <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left', width: '200px' }}><Typography variant="body1" fontWeight="bold">Pack List Quantity</Typography></TableCell>
                          <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left', width: '200px' }}><Typography variant="body1" fontWeight="bold">Actual Quantity</Typography></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {deliveryData?.materials?.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} align="center">
                              No materials found
                            </TableCell>
                          </TableRow>
                        ) : (
                          deliveryData.materials?.map((materialData: any, materialIndex: any) => (
                            <TableRow key={materialIndex}>
                              <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>
                                <Box sx={{ display: 'flex', flexDirection: 'row' }}>
                                    <Tooltip arrow title={
                                          <Box>
                                            {materialData.headers.map((header: any, headerIndex: number) => (
                                              <Typography key={headerIndex}>{header.label} : {materialData.material[header.name]}</Typography>
                                            ))}
                                          </Box>
                                        }>
                                  <InfoIcon fontSize="small" sx={{ opacity: '60%', mr: 1, color: '#1b77d2' }} />
                                  </Tooltip>
                                  {materialData.material?.ritz_customer_brand_reference_code}

                                </Box>
                              </TableCell>
                              <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>{materialData?.delivery_date_pi_quantity?.quantity} {materialData?.delivery_date_pi_quantity?.quantity_units_display}</TableCell>
                              <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>{materialData?.grn_requires_replacement_quantity?.quantity} {materialData?.grn_requires_replacement_quantity?.quantity_units_display}</TableCell>
                              <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>{materialData?.grn_indicated_quantity?.quantity} {materialData?.grn_indicated_quantity?.quantity_units_display}</TableCell>
                              <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>{materialData?.grn_total_actual_quantity?.quantity} {materialData?.grn_total_actual_quantity?.quantity_units_display}</TableCell>
                            </TableRow>
                          ))
                        )}
                    </TableBody>
                  </Table>
                </Card>
              </Grid>
            ))}
          </Grid>
        </>
      )}
    </>
  );
};

export default DDQDetails;
