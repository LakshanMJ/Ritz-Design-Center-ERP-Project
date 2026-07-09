import React, { useEffect, useState } from 'react';
import { getDefaultError } from '@/helpers/Utilities';
import toast from 'react-hot-toast';
import { Alert, Avatar, Box, Button, Card, CardActions, CardContent, CardHeader, CardMedia, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography } from '@mui/material';
import DefaultLoader from '@/components/DefaultLoader';
import api from '@/services/api';
import * as GrnUrls from '../../helpers/constants/rest_urls/GrnUrls';
import RitzQR from '@/components/Ritz/RitzQR';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { red } from '@mui/material/colors';

const GRNBarcodes = ({sourceId}: any) => {
  const [isLoading, setIsLoading] = useState(true);
  const [QRDetails, setQRDetails] = useState([]);

  const fetchData = () => {
    if (sourceId > 0) {
      setIsLoading(true);
      const requests = [
        api.get(GrnUrls.MaterialQRCodeDetailsUrl(sourceId)),
      ]
      Promise.all(requests).then((resp) => {
        const respData = resp.map(r => r.data);
        const [QRDetails] = respData
        setQRDetails([...QRDetails]);
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

  const handleQrCodeGenerate = (grnMaterialId: number) => {
    console.log(grnMaterialId,'grnMaterialId')
    api.get(GrnUrls.grCodeGenerateURL(grnMaterialId), { responseType: 'blob' }).then(response => {
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.setAttribute('download', `qr_code_${sourceId}_fabric.pdf`);
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      window.URL.revokeObjectURL(url);
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    });
  }
    return (
      <>
        {isLoading ? (
          <DefaultLoader />
        ) : (
          <>
              {QRDetails.length === 0 && (<Alert severity="info">QR codes are not available at the moment</Alert>)}
              {QRDetails.map((item: any, itemIndex: number) => (
                <React.Fragment key={itemIndex}>
                  <Card variant="outlined" sx={{ mb: 3, mt: 1 }} key={itemIndex}>
                    <CardHeader
                      title={item?.ritz_customer_brand_reference_code}
                      sx={{
                        background: (theme) => theme.palette.grey[100],
                        fontWeight: 'bold',
                        borderBottom: (theme) => `1px solid ${theme.palette.grey[300]}`,
                        display: 'flex',
                        justifyContent: 'space-between'
                      }}
                      action={
                        <Tooltip title="Download PDF" sx={{color: red[500], cursor: 'pointer' }}>
                          <PictureAsPdfIcon onClick={() => handleQrCodeGenerate(item?.grn_material_id)}/>
                        </Tooltip>
                      }
                    >
                    </CardHeader>
                    <CardContent>
                    <Grid container spacing={3}>
                      {item?.rolls.map((barcode: any, barcodeIndex: number) => (
                      <React.Fragment key={barcodeIndex}>
                          <Grid xs={12} md={3} sm={3} lg={2.4}>
                            
                          <Box>
                          <Box sx={{m:2 , display:'flex', flexDirection:'row'}}>
                              <Box sx={{width:'90px', Height:'90px'}}>
                                <RitzQR value={barcode?.barcode} size={150}/>
                              </Box>
                              <Box sx={{ml:2}}>
                                <Typography sx={textStyles}>Roll Number</Typography>
                                <Typography sx={textStyles}><strong>{barcode?.pack_number || '--'}</strong></Typography>
                                <Typography sx={textStyles}>Batch Number</Typography>
                                <Typography sx={textStyles}><strong>{barcode?.batch_number?.display_value || '--'}</strong></Typography>
                                <Typography sx={textStyles}>Item Code</Typography>
                                <Typography sx={textStyles}><strong>{item?.ritz_customer_brand_reference_code || '--'}</strong></Typography>
                              </Box>
                            </Box>
                           
                            <Box sx={{ml:2}}> 
                            <Typography sx={textStyles}>Order ID:{barcode?.order_id || '--'}</Typography>
                            <Typography sx={textStyles}>Length:{barcode?.indicated_width || '--'}</Typography>
                            <Typography sx={textStyles}>Style:{barcode?.style_number || '--'}</Typography>
                            <Typography sx={textStyles}>Shade:{barcode?.shade?.display_value || '--'}</Typography>
                            <Typography sx={textStyles}>Width:{barcode?.actual_width?.display_value || '--'}</Typography>
                            </Box>
                          </Box>
                          
                          </Grid>
                      </React.Fragment>
                      ))}
                    </Grid>
                    </CardContent>
                  </Card>
                </React.Fragment>
              ))}
          </>
        )}
      </>
    );
  };

  export default GRNBarcodes;

  const textStyles = {
    fontFamily: 'Courier New',
    lineHeight: '1.1em'
  }
