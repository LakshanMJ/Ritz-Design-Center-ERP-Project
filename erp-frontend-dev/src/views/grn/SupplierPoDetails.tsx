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
import { purchaseOrderDetailPageURL } from '@/helpers/constants/FrontEndUrls';

const SupplierPoDetails = ({ supplierPoId }: any) => {

  const [isLoading, setIsLoading] = useState(true);
  const [supplierPoDetails, setSupplierPoDetails] = useState<any>([]);
  const [materialDetails, setMaterialDetails] = useState<any>({});
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null);
  const getPurchaseOrderDetails = () => {
    setIsLoading(true)
    const requests = [
      api.get(GrnUrls.getSupplierPoDetailsURL(supplierPoId)),
    ]
    Promise.all(requests).then(response => {
      const [supplierPoDetails, materialDetails] = response.map((r: any) => r.data);
      setSupplierPoDetails([...supplierPoDetails]);
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => setIsLoading(false));
  };

  const getMetrialDetails = () => {
    const requests = [
      api.get(GrnUrls.getMaterialsDetailsPoWiseURL(supplierPoId, selectedDelivery.id)),
    ]
    Promise.all(requests).then(response => {
      const [materialDetails] = response.map((r: any) => r.data);
      setMaterialDetails(materialDetails);
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => setIsLoading(false));
  };

  const handleCardClick = (delivery: any) => {
    setSelectedDelivery(delivery);
  };
  
  const handleDownload = (filePath: string, fileName: string) => {
    if (!filePath) {
      toast.error("The file cannot be located or is invalid.");
      return;
    }
    const link = document.createElement('a');
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.href = filePath;
    link.download = fileName;
    link.click();
  };

  const calculateRowSpan = (deliveryNoteSet:any) => {
    let totalLength = 0;
  
    deliveryNoteSet.forEach((deliveryNote:any) => {
      totalLength += deliveryNote.pack_list.length;
    });
    return totalLength ;
  }

  useEffect(() => {
    if (supplierPoId != 0) {
      getPurchaseOrderDetails();
    }
  }, [supplierPoId]);
  
  useEffect(() => {
    if (selectedDelivery) {
      getMetrialDetails();
    }
  }, [selectedDelivery]);


  return (
    <>

      {isLoading ? <DefaultLoader /> : (
        <>
          <Grid container spacing={2}>
            {supplierPoDetails.map((deliveryData: any, deliveryIndex: any) => (
              <Grid item xs={12} sm={4} md={3} key={deliveryIndex}>
                <Card variant="outlined" key={deliveryIndex} sx={{ border: selectedDelivery?.id === deliveryData.id && '3px solid green', cursor: 'pointer' }} onClick={() => handleCardClick(deliveryData)}>
                  <CardHeader
                    title={deliveryData.delivery_display}
                  />
                  <Table size="small" >
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Planned Delivery Date</TableCell>
                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Actual Delivery Date</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>  {deliveryData?.confirmed_delivery_date ? deliveryData?.confirmed_delivery_date : '-'}</TableCell>
                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>{deliveryData?.actual_delivery_date ? deliveryData?.actual_delivery_date?.delivery_date : '-'}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </Card>
              </Grid>
            ))}
          </Grid>
          {selectedDelivery == null ? (
            <Alert severity='info' sx={{ mt: 1 }}>
              Please click on the delivary card to view all delivary details.
            </Alert>
          ) : (
            <>
              <Box sx={{ mt: 4 }}>
                <Typography variant='h4'>{selectedDelivery.delivery_display}</Typography>
              </Box>
              <Box sx={{ mt: 2 }}>
                <Typography fontWeight='bold'>Pack Details :</Typography>
              </Box>
              <Box sx={{ mt: 2, width: '50%' }}>
                <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01), textAlign: 'left' }}>Invoice Detail</TableCell>
                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01), textAlign: 'left' }}>DeliveryNote</TableCell>
                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01), textAlign: 'left' }}>Pack Lists</TableCell>
                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01), textAlign: 'left' }}>GRNs</TableCell>
                      </TableRow>
                    </TableHead>
                  <TableBody>
                  <>
                    {selectedDelivery.supplier_po_delivery_invoice?.supplierpoinvoicedeliverynote_set?.length === 0 || selectedDelivery.supplier_po_delivery_invoice == null ? (
                      <TableRow >
                        <TableCell colSpan={4} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>
                          No data available
                        </TableCell>
                      </TableRow>
                    ) : (

                      selectedDelivery.supplier_po_delivery_invoice?.supplierpoinvoicedeliverynote_set?.map((details: any, index: any) => (
                        <React.Fragment key={details.id}>
                          {details.pack_list.map((pack: any, packIndex: number) => (
                            <React.Fragment key={`${details.id}_${pack.id}`}>
                              <TableRow>
                                {index === 0 && packIndex === 0 && (
                                  <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }} rowSpan={calculateRowSpan(selectedDelivery.supplier_po_delivery_invoice?.supplierpoinvoicedeliverynote_set)}>
                                    <Link sx={{ cursor: 'pointer' }} onClick={() => handleDownload(selectedDelivery.supplier_po_delivery_invoice?.invoice?.['file_path'], selectedDelivery.supplier_po_delivery_invoice?.invoice?.['display_name'])}>{selectedDelivery.supplier_po_delivery_invoice?.supplier_invoice_number}</Link>
                                  </TableCell>
                                )}
                                {packIndex === 0 && (
                                  <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }} rowSpan={details.pack_list.length}>
                                    <Link sx={{ cursor: 'pointer' }} onClick={() => handleDownload(details?.delivery_note?.['file_path'], details?.pack_list?.['display_name'])}>{details.display_number}</Link>
                                  </TableCell>
                                )}
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>
                                  <Link sx={{ cursor: 'pointer' }} onClick={() => handleDownload(pack?.file_path, pack?.display_name)}>{pack.display_number}</Link>
                                </TableCell>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left', wordBreak: 'break-all' }}>
                                  {pack.grns.map((grn: any, index:any) => (
                                    <React.Fragment key={index}>
                                      <Link sx={{ cursor: 'pointer' }} href={createdGrnDetailsPageURL(grn.id)} target="_blank">
                                        {grn.display_number}
                                      </Link>
                                      {grn !== pack.grns[pack.grns.length - 1] && ','}
                                    </React.Fragment>
                                  ))}
                                </TableCell>
                              </TableRow>
                            </React.Fragment>
                          ))}
                        </React.Fragment>
                      )) 
                    )}
                    </>
                  </TableBody>
                </Table>
              </Box>
              <Box sx={{ mt: 4, mb: 2 }}>
                <Typography fontWeight='bold'>Material Allocation Details :</Typography>
              </Box>
              <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left', background: (theme) => darken(theme.palette.grey[50], 0.01) }}></TableCell>
                      <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left', background: (theme) => darken(theme.palette.grey[50], 0.01) }}/>
                      {materialDetails?.purchase_orders?.map((po: any, poIndex: any) => (
                        <TableCell key={poIndex} colSpan={3} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center', background: (theme) => darken(theme.palette.grey[50], 0.01) }}>
                          <Link sx={{ cursor: 'pointer' }} href={purchaseOrderDetailPageURL(po.id)} target="_blank">
                            {po.display_number}
                          </Link>
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Material</TableCell>
                      <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Ritz Code</TableCell>
                      {materialDetails?.purchase_orders?.map((po: any, poIndex: any) => (
                        <React.Fragment key={poIndex}>
                          <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>PO Required Total Quantity</TableCell>
                          <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>Delivery Allocated Quantity</TableCell>
                          <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>Delivery Fulfilled Quantity</TableCell>
                        </React.Fragment>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {materialDetails?.quantities?.map((material:any, materialIndex:any) => (
                      <TableRow key={materialIndex}>
                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>{material.material?.material_label}</TableCell>
                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>{material.material?.ritz_customer_brand_reference_code}</TableCell>
                        {materialDetails?.purchase_orders?.map((po:any, poIndex:any) => {
                          const uniqueQuantityField = material.purchaser_order_allocations.find((quantity: { po_id: any; }) => quantity.po_id === po.id)
                          return (
                            <React.Fragment key={poIndex}>
                              <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>
                                {uniqueQuantityField?.purchase_order_required_quantity?.quantity} {uniqueQuantityField?.purchase_order_required_quantity?.quantity_units_display}
                              </TableCell>
                              <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>
                               {uniqueQuantityField?.purchase_order_allocated_quantity?.quantity}  {uniqueQuantityField?.purchase_order_allocated_quantity?.quantity_units_display}
                              </TableCell>
                              <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>
                               {uniqueQuantityField?.grns_purchase_order_allocated_quantity?.quantity}  {uniqueQuantityField?.grns_purchase_order_allocated_quantity?.quantity_units_display}
                              </TableCell>
                            </React.Fragment>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
              </Table>
            </>
          )}
         
        </>
      )}
    </>
  );
};

export default SupplierPoDetails;