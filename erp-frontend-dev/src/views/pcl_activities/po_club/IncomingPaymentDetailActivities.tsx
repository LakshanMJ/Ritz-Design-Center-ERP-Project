import React, { useEffect, useState } from 'react';
import { getDefaultError } from '@/helpers/Utilities';
import toast from 'react-hot-toast';
import { Box, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import DefaultLoader from '@/components/DefaultLoader';
import api from '@/services/api';
import { incomingPaymentDetailsURL } from '@/helpers/constants/rest_urls/FinanceUrls';

const IncomingPaymentDetailActivities = ({ incomingPaymentId }: any) => {
  const [isLoading, setIsLoading] = useState(false);
  const [incomingDetails, setIncomingDetails] = useState<any>({});
  const fetchData = () => {
    setIsLoading(true);
    api.get(incomingPaymentDetailsURL(incomingPaymentId)).then(resp => {
      const reseditdata = resp?.data || {};
      setIncomingDetails({ ...reseditdata });
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (incomingPaymentId) {
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
                  <TableCell >Payment Date</TableCell>
                  <TableCell >Completed Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableCell>{incomingDetails?.amount?.amount} {incomingDetails?.amount?.amount_currency_display}</TableCell>
                <TableCell>{incomingDetails?.payment_date ?? '-'}</TableCell>
                <TableCell> {incomingDetails?.complete ? 'Completed' : 'Incompleted'}</TableCell>
              </TableBody>
            </Table>
          </Box>
        </>
      )}
    </>
  );
};

export default IncomingPaymentDetailActivities;
