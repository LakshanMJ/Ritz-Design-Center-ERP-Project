import React, { useEffect, useState } from 'react';
import api from '@/services/api';
import { Alert, Box, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { getDefaultError } from '@/helpers/Utilities';
import toast from 'react-hot-toast';
import DefaultLoader from '@/components/DefaultLoader';
import { poPackagingSummaryDetailsURL } from '@/helpers/constants/rest_urls/POUrls';
import ExcitingPackagingInstructions from './ExcitingPackagingInstructions';
import CurrentPackagingInstructions from './CurrentPackagingInstructions';

const PurchaseOrderPackagingSummary = ({ purchaseOrderId }: any) => {
  const [isLoading, setIsLoading] = useState(true);
  const [packagingSummaryDetails, setPackagingSummaryDetails] = useState<any>([]);

  const getMaxSizeLength = (countries: any[]) => {
    return countries.reduce((maxSize, country) => {
      const countryMaxSize = country.colorways.reduce((max: any, colorway: any) => {
        return Math.max(max, colorway.sizes.length);
      }, 0);
      return Math.max(maxSize, countryMaxSize);
    }, 0);
  }

  const fetchData = () => {
    Promise.all([
      api.get(poPackagingSummaryDetailsURL(purchaseOrderId))
    ]).then(resp => {
      const respData = resp.map((r: any) => r.data);
      const [packagingData] = respData;
      setPackagingSummaryDetails([...packagingData])
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => {
      setIsLoading(false)
    });
  }

  useEffect(() => {
    if (purchaseOrderId) {
      fetchData()
    }
  }, [purchaseOrderId]);

  return (
    <>
      {isLoading ? <DefaultLoader /> :
        <Box>
          {packagingSummaryDetails?.length == 0 ? (
            <>
               <Alert severity="info">Packaging summary is not available at this moment</Alert>
            </>

          ) : (
            <>
              {packagingSummaryDetails.map((packDetail: any, packingIndex: any) => (
                <Box key={packDetail.id} sx={{ mb: 2 }}>
                  <Box sx={{ color: 'primary.main', mb: 1 }}>
                    <Typography sx={{ fontSize: '1rem', fontWeight: 'bold' }} color='primary'>{packDetail.carton?.attributes?.material_label} ({packDetail.carton?.attributes?.ritz_customer_brand_reference_code})</Typography>
                  </Box>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>Country</TableCell>
                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>Colorway</TableCell>
                        <TableCell colSpan={getMaxSizeLength(packDetail.countries)} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>Size</TableCell>
                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>No Of Cartons</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {packDetail?.countries?.map((country: any) => (
                        country?.colorways?.map((colorway: any, colorwayIndex: any) => (
                          <React.Fragment key={colorway?.id}>
                            <TableRow>
                              {colorwayIndex === 0 && (
                                <TableCell rowSpan={(country?.colorways.length * 2)} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>
                                  {country?.name}
                                </TableCell>
                              )}
                              <TableCell rowSpan={2} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>{colorway.name}</TableCell>

                              {colorway.sizes?.map((size: any) => (
                                <TableCell key={size.id} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center', fontWeight: 'bold' }}>
                                  {size?.size}
                                </TableCell>
                              ))}

                              {colorway.sizes?.length < getMaxSizeLength(packDetail.countries) && (
                                Array.from({ length: getMaxSizeLength(packDetail?.countries) - colorway.sizes?.length }).map((_, idx) => (
                                  <TableCell key={`empty-${colorway.id}-${idx}`} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}></TableCell>
                                ))
                              )}

                              {colorwayIndex === 0 && (
                                <TableCell rowSpan={(country?.colorways?.length * 2)} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>
                                  {packDetail?.number_of_cartons}
                                </TableCell>
                              )}
                            </TableRow>

                            <TableRow>
                              {colorway.sizes?.map((size: any) => (
                                <TableCell key={size.id} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>
                                  {size.colorway_size_quantity?.quantity__sum ? `${size.colorway_size_quantity?.quantity__sum} Pcs` : '--'}
                                </TableCell>
                              ))}

                              {colorway.sizes.length < getMaxSizeLength(packDetail.countries) && (
                                Array.from({ length: getMaxSizeLength(packDetail.countries) - colorway.sizes.length }).map((_, idx) => (
                                  <TableCell key={`empty-quantity-${colorway?.id}-${idx}`} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}></TableCell>
                                ))
                              )}
                            </TableRow>

                          </React.Fragment>
                        ))
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              ))}
            </>
          )}
        </Box>
      }
    </>
  );
};

export default PurchaseOrderPackagingSummary;