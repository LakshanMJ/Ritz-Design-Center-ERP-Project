import React, { useEffect, useState } from 'react';
import { getDefaultError } from '@/helpers/Utilities';
import toast from 'react-hot-toast';
import { Alert, Box, Link, Table, TableBody, TableCell, TableHead, TableRow, Typography, useTheme } from '@mui/material';
import DefaultLoader from '@/components/DefaultLoader';
import api from '@/services/api';
import { useRouter } from 'next/router';
import { supplierPODeliveryDetails } from '@/helpers/constants/rest_urls/GrnUrls';
import RitzToolTip from '@/components/Ritz/RitzTooltip';
import { ReactKeyHelper } from '@/helpers/KeyHelper';
import { createdGrnDetailsPageURL } from '@/helpers/constants/front_end/GrnUrls';
import NextLink from 'next/link';

const SPODeliverySummary = ({ clubId }: any) => {
  const router = useRouter();
  const keyHelper = new ReactKeyHelper();
  const theme = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [spoDeliveryData, setSpoDeliveryData] = useState<any>({});

  const fetchData = () => {
    setIsLoading(true);
    const requests = [
      api.get(supplierPODeliveryDetails(clubId)),
    ]
    Promise.all(requests).then((resp) => {
      const respData = resp.map(r => r.data);
      const [deliveryDetails] = respData
      setSpoDeliveryData({ ...deliveryDetails })
    })
      .catch((error) => {
        toast.error(getDefaultError(error?.response?.status));
      })
      .finally(() => setIsLoading(false));
  }


  useEffect(() => {
    if (clubId) {
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
            {Object.entries(spoDeliveryData).map(([category, values], index) => {
              const materials = values as any[];
              return (
                <React.Fragment key={keyHelper.getNextKeyValue()}>
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="h1" color="primary" sx={{ fontWeight: 'bold' }}>
                      {category.replace("_", " ").toUpperCase()}
                    </Typography>
                  </Box>
                  <Box>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ background: theme.palette.grey[100] }}>
                          <TableCell sx={{ border: `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Material</TableCell>
                          <TableCell sx={{ border: `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Supplier PO</TableCell>
                          <TableCell sx={{ border: `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>PI Qty</TableCell>
                          <TableCell sx={{ border: `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>BOM Qty</TableCell>
                          <TableCell sx={{ border: `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>Delivery</TableCell>
                          <TableCell sx={{ border: `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>GRN's</TableCell>
                          <TableCell sx={{ border: `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>GRN Qty</TableCell>
                          <TableCell sx={{ border: `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>Usable Qty</TableCell>
                          <TableCell sx={{ border: `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>Replacement Qty</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {materials.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={9} sx={{ border: `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>
                              No available delivery details.
                            </TableCell>
                          </TableRow>
                        ) : (
                          materials.map((material, materialIndex) => {
                            const materialRowSpan = material.supplier_pos?.reduce((accSupplier: any, supplierPO: any) => {
                              const supplierPORowSpan = supplierPO.deliveries?.reduce((accDelivery: any, delivery: any) => {
                                return accDelivery + (delivery.grns?.length > 0 ? delivery.grns.length : 1);
                              }, 0) || 0;
                              return accSupplier + supplierPORowSpan;
                            }, 0) || 0;
                            return material.supplier_pos?.map((supplierPO: any, supplierPOIndex: any) => {
                              const supplierPORowSpan = supplierPO.deliveries?.reduce((accDelivery: any, delivery: any) => {
                                return accDelivery + (delivery.grns?.length > 0 ? delivery.grns.length : 1);
                              }, 0) || 0;
                              return supplierPO.deliveries?.map((delivery: any, deliveryIndex: any) => {
                                const deliveryRowSpan = delivery.grns?.length > 0 ? delivery.grns.length : 1;
                                if (delivery.grns?.length > 0) {
                                  return delivery.grns.map((grn: any, grnIdx: any) => (
                                    <TableRow key={keyHelper.getNextKeyValue()} >
                                      {supplierPOIndex === 0 && deliveryIndex === 0 && grnIdx === 0 && (
                                        <TableCell rowSpan={materialRowSpan} sx={{ border: `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>
                                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            {material?.attributes?.ritz_customer_brand_reference_code}
                                            <RitzToolTip materialHeaders={material?.headers} materialDetails={material?.attributes} />
                                          </Box>
                                        </TableCell>
                                      )}
                                      {deliveryIndex === 0 && grnIdx === 0 && (
                                        <>
                                          <TableCell rowSpan={supplierPORowSpan} sx={{ border: `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>
                                            <Link>{supplierPO?.display_number}</Link>
                                          </TableCell>
                                          <TableCell rowSpan={supplierPORowSpan} sx={{ border: `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>
                                            {supplierPO?.pi_quantity?.quantity} {supplierPO?.pi_quantity?.quantity_units_display}
                                          </TableCell>
                                        </>
                                      )}
                                      {supplierPOIndex === 0 && deliveryIndex === 0 && grnIdx === 0 && (
                                        <TableCell rowSpan={materialRowSpan} sx={{ border: `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>
                                          {material?.bom_quantity?.quantity} {material?.bom_quantity?.quantity_units_display}
                                        </TableCell>
                                      )}
                                      {grnIdx === 0 && (
                                        <TableCell rowSpan={deliveryRowSpan} sx={{ border: `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>
                                          {delivery?.display_number} ({delivery?.confirmed_delivery_date})
                                        </TableCell>
                                      )}

                                      <TableCell sx={{ border: `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>
                                        <Link target="_blank" component={NextLink} href={createdGrnDetailsPageURL(grn?.id)|| '#'}>{grn?.display_number}</Link>
                                      </TableCell>
                                      <TableCell sx={{ border: `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>
                                        {grn?.grn_quantity?.quantity} {grn?.grn_quantity?.quantity_units_display}
                                      </TableCell>
                                      <TableCell sx={{ border: `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>
                                        {grn?.usable_quantity?.quantity} {grn?.usable_quantity?.quantity_units_display}
                                      </TableCell>
                                      <TableCell sx={{ border: `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>
                                        {grn?.replacement_quantity?.quantity} {grn?.replacement_quantity?.quantity_units_display}
                                      </TableCell>
                                    </TableRow>
                                  ));
                                } else {
                                  return (
                                    <TableRow key={keyHelper.getNextKeyValue()} >
                                      {supplierPOIndex === 0 && deliveryIndex === 0 && (
                                        <TableCell rowSpan={materialRowSpan} sx={{ border: `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>
                                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            {material?.attributes?.ritz_customer_brand_reference_code}
                                            <RitzToolTip materialHeaders={material?.headers} materialDetails={material?.attributes} />
                                          </Box>
                                        </TableCell>
                                      )}
                                      {deliveryIndex === 0 && (
                                        <>
                                          <TableCell rowSpan={supplierPORowSpan} sx={{ border: `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>
                                            <Link>{supplierPO?.display_number}</Link>
                                          </TableCell>
                                          <TableCell rowSpan={supplierPORowSpan} sx={{ border: `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>
                                            {supplierPO?.pi_quantity?.quantity} {supplierPO?.pi_quantity?.quantity_units_display}
                                          </TableCell>
                                        </>
                                      )}
                                      {supplierPOIndex === 0 && deliveryIndex === 0 && (
                                        <TableCell rowSpan={materialRowSpan} sx={{ border: `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>
                                          {material?.bom_quantity?.quantity} {material?.bom_quantity?.quantity_units_display}
                                        </TableCell>
                                      )}
                                      <TableCell sx={{ border: `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>
                                        {delivery?.display_number}
                                      </TableCell>
                                      <TableCell colSpan={4} sx={{ border: `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>
                                        <Alert severity="info">No available GRN's for this delivery.</Alert>
                                      </TableCell>
                                    </TableRow>
                                  );
                                }
                              });
                            });
                          })
                        )}
                      </TableBody>

                    </Table>
                  </Box>
                </React.Fragment>
              );
            })}

          </Box>

        </>
      )}
    </>
  );
};

export default SPODeliverySummary;
