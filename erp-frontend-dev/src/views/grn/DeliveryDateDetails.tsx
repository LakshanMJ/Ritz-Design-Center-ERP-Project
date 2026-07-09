import React, { useEffect, useState } from 'react';
import { getDefaultError } from '@/helpers/Utilities';
import toast from 'react-hot-toast';
import { Alert, Box, Button, Card, CardHeader, Checkbox, Grid, IconButton, Link, ListItemIcon, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography, darken, useTheme } from '@mui/material';
import DefaultLoader from '@/components/DefaultLoader';
import api from '@/services/api';
import { supplierPOdeliveryDatesDetails } from '@/helpers/constants/rest_urls/SupplierPoUrls';
import RitzModal from '@/components/Ritz/RitzModal';
import AttachmentDetails from '../supplier_po/reports/AttachmentDetails';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import { ReactKeyHelper } from '@/helpers/KeyHelper';
import MoneyOffIcon from '@mui/icons-material/MoneyOff';
import SPODeliveryFOCDetails from '../supplier_po/reports/SPODeliveryFOCDetails';

const DeliveryDateDetails = ({ supplierPoId , selectedData }: any) => {
  const theme = useTheme()
  const keyHelper = new ReactKeyHelper();
  const [isLoading, setIsLoading] = useState(true);
  const [deliveryDatesData, setDeliveryDatesData] = useState<any>({});
  const [isOpenFOCDetailsModal, setIsOpenFOCDetailsModal] = useState(false);
  const [selectedDeliveryDate, setSelectedDeliveryDate] = useState(null);
  const [selectedFOCDeliveryDate, setSelectedFOCDeliveryDate] = useState(null);

  const fetchData = () => {
    setIsLoading(true)
    const requests = [
      api.get(supplierPOdeliveryDatesDetails(supplierPoId)),
    ]
    Promise.all(requests).then(response => {
      const [supplierPoDetails] = response.map((r: any) => r.data);
      setDeliveryDatesData(supplierPoDetails);
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => setIsLoading(false));
  };


  const handleCheckboxChange = (id:any) => {
    setSelectedDeliveryDate(id === selectedDeliveryDate ? null : id);
  };

  const handleNext = () => {
    const data = {
      delivery_date_id: selectedDeliveryDate,
      spo_id: supplierPoId,
    };
    selectedData(data);
  };

  const handleSetFOCDetails = (deliveryId: any) => {
    setSelectedFOCDeliveryDate(deliveryId)
    setIsOpenFOCDetailsModal(true)
  }


  useEffect(() => {
    if (supplierPoId) {
      fetchData();
    }
  }, [supplierPoId]);


  return (
    <>

      {isLoading ? <DefaultLoader /> : (
        <>
          {isOpenFOCDetailsModal && (
            <RitzModal
              open={isOpenFOCDetailsModal}
              onClose={() => {setIsOpenFOCDetailsModal(false)}}
              maxWidth='md'
              title='FOC Details'
            >
              <SPODeliveryFOCDetails deliveryId={selectedFOCDeliveryDate} />
            </RitzModal>)
          }
          <Box sx={{ mb: 3 }}>
            <Typography fontWeight='bold'>Supplier</Typography>
            <TextField
              id={'supplier_po_number'}
              name={'supplier_po_number'}
              value={deliveryDatesData?.supplier_name || ''}
              autoComplete="new-username"
              fullWidth
              type="text"
              disabled
            />
          </Box>
          <Box sx={{ mb: 3 }}>
            <Typography fontWeight='bold'>Supplier PO :</Typography>
            <TextField
              id={'supplier_po_number'}
              name={'supplier_po_number'}
              value={deliveryDatesData?.supplier_po_number || ''}
              autoComplete="new-username"
              fullWidth
              type="text"
              disabled
            />
          </Box>
          <Box sx={{ mb: 3 }}>
            <Typography fontWeight='bold'>Please Select the Delivery Date below :</Typography>
            <Table>
              {deliveryDatesData.supplierdeliverydate_set?.map((deliveryDate: any, deliveryIndex: any) => (
                <React.Fragment key={`${keyHelper.getNextKeyValue()}`}>
                  <TableHead key={`${keyHelper.getNextKeyValue()}`}>
                    <TableRow sx={{background: theme.palette.grey[100] } }>
                      <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }} colSpan={3}>
                        {/* <Checkbox
                          checked={selectedDeliveryDate === deliveryDate.id}
                          onChange={() => handleCheckboxChange(deliveryDate.id)}
                        />
                        {deliveryDate?.confirmed_delivery_date} */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Checkbox
                              checked={selectedDeliveryDate === deliveryDate.id}
                              onChange={() => handleCheckboxChange(deliveryDate.id)}
                            />
                            <Box sx={{ ml: 1 }}>
                              {deliveryDate?.confirmed_delivery_date}
                            </Box>
                            {deliveryDate?.is_foc && (
                              <Box sx={{ borderRadius: '16px', ml: 3, border: '1px solid', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', fontSize: '0.875rem' }}>
                                <MoneyOffIcon sx={{ mr: 1 }} color={'primary'} />
                                <Typography color={"primary"} fontWeight='bold'>FOC</Typography>
                              </Box>
                            )}
                          </Box>
                            {deliveryDate.is_grn_created === "True" && (
                              <Box sx={{ display: 'flex', alignItems: 'center', color: 'green' }}>
                                Already Created GRN
                                <DoneAllIcon sx={{ ml: 2, color: 'green' }} />

                              </Box>
                            )}
                        </Box>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Material</TableCell>
                      <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Material Code</TableCell>
                      <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Ritz Code</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {deliveryDate.materials?.map((material: any, materialIndex: any) => (
                      <TableRow key={`${keyHelper.getNextKeyValue()}`}>
                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>{material.attributes?.material_label}</TableCell>
                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>{material?.attributes?.reference_code}</TableCell>
                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>{material?.attributes?.ritz_customer_brand_reference_code}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </React.Fragment>
              ))}
            </Table>
          </Box>
          <Box style={{ display: 'flex', justifyContent: 'end' }}>
            <Button variant="contained" color="primary" onClick={handleNext}>Next</Button>
          </Box>
        </>
      )}
    </>
  );
};

export default DeliveryDateDetails;
