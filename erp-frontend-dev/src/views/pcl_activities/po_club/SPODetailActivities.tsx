import React, { useEffect, useState } from 'react';
import { getDefaultError } from '@/helpers/Utilities';
import toast from 'react-hot-toast';
import { Alert, Box, Card, CardHeader, Grid, Link, List, ListItem, ListItemIcon, ListItemText, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import DefaultLoader from '@/components/DefaultLoader';
import api from '@/services/api';
import { spoGRNDetailsURL } from '@/helpers/constants/rest_urls/POUrls';

const SPODetailActivities = ({ spoId }: any) => {
  const [isLoading, setIsLoading] = useState(false);
  const [spoDetails, setSpoDetails] = useState<any>({});

  const fetchData = () => {
    setIsLoading(true);
    api.get(spoGRNDetailsURL(spoId)).then(resp => {
      const reseditdata = resp?.data || {};
      setSpoDetails({ ...reseditdata });
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if(spoId){
      fetchData()
    }
  }, []);

  return (
    <>
      {isLoading ? (
        <DefaultLoader />
      ) : (
        <>
          <Box >
                <Table
                  size="small"
                  sx={{
                    border: (theme) => `1px solid ${theme.palette.grey[200]}`,
                    '& .MuiTableCell-head': {
                      color: (theme) => theme.palette.grey[700],
                      background: (theme) => theme.palette.grey[50],
                      overflowX: '100%', 
                    },
                  }}
                >
                  <TableHead>
                    <TableRow>
                      <TableCell>Supplier</TableCell>
                      <TableCell>Material</TableCell>
                      <TableCell>Material Code</TableCell>
                      <TableCell>Ritz Code</TableCell>
                      <TableCell>Requested Date</TableCell>
                      <TableCell>PI Quantity</TableCell>
                      <TableCell>Quantity</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {spoDetails?.materials?.length > 0 ? (
                      spoDetails?.materials?.map((supplier: any, i: number) => (
                        <TableRow
                          key={i}
                          sx={{
                            '&:last-child td, &:last-child th': {
                              border: 0,
                            },
                            marginTop: '10px',
                            marginBottom: '10px'
                          }}
                        >
                          <TableCell>{spoDetails?.supplier_name ?? "--"}</TableCell>
                          <TableCell>{supplier?.material_label ?? "--"}</TableCell>
                          <TableCell>{supplier?.reference_code ?? "--"}</TableCell>
                          <TableCell>{supplier?.ritz_customer_brand_reference_code ?? "--"}</TableCell>
                          <TableCell>{supplier?.requested_date ?? "--"}</TableCell>
                          <TableCell>{supplier.proforma_invoice_quantity ? `${supplier.proforma_invoice_quantity?.quantity} ${supplier.proforma_invoice_quantity?.quantity_units_display}` : "--"}</TableCell>
                          <TableCell>{supplier.quantity ? `${supplier.quantity.quantity} ${supplier.quantity.quantity_units_display}` : "--"}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell  colSpan={7} sx={{ textAlign: 'center', marginTop: '5px', marginBottom: '5px' }}>
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

export default SPODetailActivities;
