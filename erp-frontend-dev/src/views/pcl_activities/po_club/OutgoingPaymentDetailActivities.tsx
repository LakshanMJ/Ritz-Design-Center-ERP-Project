import React, { useEffect, useState } from 'react';
import { getDefaultError } from '@/helpers/Utilities';
import toast from 'react-hot-toast';
import { Box, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import DefaultLoader from '@/components/DefaultLoader';
import api from '@/services/api';
import { outgoingPaymentDetailsURL } from '@/helpers/constants/rest_urls/FinanceUrls';

const OutgoingPaymentDetailActivities = ({ outgoingPaymentId }: any) => {
  const [isLoading, setIsLoading] = useState(false);
  const [outgoingPaymentDetails, setOutgoingPaymentDetails] = useState<any>({});
  const fetchData = () => {
    setIsLoading(true);
    api.get(outgoingPaymentDetailsURL(outgoingPaymentId)).then(resp => {
      const reseditdata = resp?.data || {};
      setOutgoingPaymentDetails({ ...reseditdata });
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (outgoingPaymentId) {
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
                  <TableCell >Amount</TableCell>
                  <TableCell >Payment Method</TableCell>
                  <TableCell >Payment Date</TableCell>
                  <TableCell >Completed Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableCell>{outgoingPaymentDetails?.amount?.amount} {outgoingPaymentDetails?.amount?.amount_currency_display}</TableCell>
                <TableCell>{outgoingPaymentDetails?.payment_method_display ?? '-'}</TableCell>
                <TableCell>{outgoingPaymentDetails?.payment_date ?? '-'}</TableCell>
                <TableCell>{outgoingPaymentDetails?.complete ? 'Completed' : 'Incompleted'}</TableCell>
              </TableBody>
            </Table>
          </Box>
        </>
      )}
    </>
  );
};

export default OutgoingPaymentDetailActivities;
