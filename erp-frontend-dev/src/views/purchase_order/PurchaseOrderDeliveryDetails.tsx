import React, { useEffect, useState } from 'react';
import api from '@/services/api';
import { Alert, Box, Button, darken, Divider, IconButton, Table, TableBody, TableCell, TableHead, TableRow, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material';
import { getDefaultError } from '@/helpers/Utilities';
import toast from 'react-hot-toast';
import DefaultLoader from '@/components/DefaultLoader';
import { poPackagingSummaryDetailsURL, purchaseOrderDeliveryPackDeleteURL, purchaseOrderDeliveryPacksDataSaveURL, purchaseOrderDeliveryPacksDetailsURL } from '@/helpers/constants/rest_urls/POUrls';
import RitzInput from '@/components/Ritz/RitzInput';
import FormErrorMessage from '@/components/FormErrorMessage';
import { ReactKeyHelper } from '@/helpers/KeyHelper';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from "dayjs";
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import SaveIcon from '@mui/icons-material/Save';
import { DEFAULT_SUCCESS } from '@/helpers/constants/Constants';
import RitzModal from '@/components/Ritz/RitzModal';

const PurchaseOrderDeliverySummary = ({ purchaseOrderId }: any) => {
  const keyHelper = new ReactKeyHelper();
  const [isLoading, setIsLoading] = useState(true);
  const [deliveryDetails, setDeliveryDetails] = useState<any>({});
  const [selectedDeleteData, setSelectedDeleteData] = useState<any>({});
  const [errorsDetails, setErrorDetails] = useState<any>({});
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const fetchData = () => {
    Promise.all([
      api.get(purchaseOrderDeliveryPacksDetailsURL(purchaseOrderId))
    ]).then(resp => {
      const respData = resp.map((r: any) => r.data);
      const [packagingData] = respData;
      setDeliveryDetails({ ...packagingData })
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => {
      setIsLoading(false)
    });
  }
  const handlePackChange = (deliveryIndex: number, newSelectedPacks: number[]) => {
    setDeliveryDetails((prevDetails: any) => {
      const updatedDetails = { ...prevDetails };
      const pack_meta = updatedDetails.delivery_data?.[deliveryIndex].po_delivery_packs_meta_data;
      if (pack_meta) {
        updatedDetails.delivery_data[deliveryIndex].po_delivery_packs_meta_data = pack_meta.map((pack: any) => {
          const isSelected = newSelectedPacks.includes(pack.po_pack_id);
          return {
            ...pack,
            selected: isSelected,
            quantity: isSelected ? pack.quantity : null,
          };
        });
      }
      return updatedDetails;
    });
  };

  const handleChangeDate = (newDate: string, deliveryIndex: number) => {
    const isValidDate = dayjs(newDate).isValid();
    setDeliveryDetails((prevDetails: any) => {
      const updatedDetails = { ...prevDetails };
      updatedDetails.delivery_data[deliveryIndex].delivery_date = isValidDate ? newDate : null;;
      return updatedDetails;
    });
  };

  const handleDeleteDelivery = () => {
    if (selectedDeleteData?.deliveryId) {
      api.delete(purchaseOrderDeliveryPackDeleteURL(selectedDeleteData?.deliveryId)).then(() => {
        fetchData()
        toast.success(DEFAULT_SUCCESS);
      }).catch(error => {
        toast.error(getDefaultError(error?.response?.status));
      }).finally();
    } else {
      setDeliveryDetails((prevDetails: any) => {
        const updatedDetails = { ...prevDetails };
        updatedDetails.delivery_data.splice(selectedDeleteData?.deliveryIndex, 1);
        updatedDetails.no_of_deliveries = updatedDetails.delivery_data.length;
        return updatedDetails;
      });
    }
    setIsDeleteModalOpen(false)
  };

  const handleSetSelectedDelivertIds = (deliveryIndex: number, deliveryId: any) => {
    if (deliveryDetails?.delivery_data?.length <= 1) {
      toast.error("At least one delivery must remain.");
      return;
    }
    setSelectedDeleteData({ deliveryIndex: deliveryIndex, deliveryId: deliveryId })
    setIsDeleteModalOpen(true)

  }

  const isCheckData = (deliveryIndex: number): boolean => {
    const pack_meta = deliveryDetails.delivery_data?.[deliveryIndex]?.po_delivery_packs_meta_data;
    return pack_meta?.every((pack: any) => !pack.selected);
  };

  const handleChangeNoOfDeliveries = (event: any) => {
    const value = Number(event.target.value);
    if (isNaN(value) || value < 0) return;
    if (value > 10) {
      toast.error("The number of deliveries must be less than 10. Please adjust the quantity.");
      return;
    }

    setDeliveryDetails((prevDetails: any) => {
      const updatedDetails = { ...prevDetails };
      const currentDeliveriesLength = updatedDetails.delivery_data.length;
      const toAddedDeliveryLength = value - currentDeliveriesLength;

      if (toAddedDeliveryLength > 0) {
        const newDeliveries = Array.from({ length: toAddedDeliveryLength }, () => ({
          id: null as any,
          delivery_date: null as any,
          po_delivery_packs_meta_data: deliveryDetails?.initial_po_pack_meta_data || [],
        }));
        updatedDetails.delivery_data = [...updatedDetails.delivery_data, ...newDeliveries];
      } else if (toAddedDeliveryLength < 0) {
        toast.error("Please delete existing deliveries before reducing the number of deliveries");
        return prevDetails;
      }
      updatedDetails.no_of_deliveries = value;

      return updatedDetails;
    });
  };

  const handleSave = () => {
    const updatedDeliveryData = deliveryDetails?.delivery_data.map((delivery: { po_delivery_packs_meta_data: any[]; }) => {
      const deletedIds = delivery?.po_delivery_packs_meta_data?.filter(pack => pack?.selected === false && pack?.id).map(pack => pack?.id);
      return {
        ...delivery,
        deleted_ids: deletedIds
      };
    });
    const savedDataSet = {
      no_of_deliveries: deliveryDetails?.no_of_deliveries,
      delivery_data: updatedDeliveryData
    };

    const request = {
      method: 'post',
      url: purchaseOrderDeliveryPacksDataSaveURL(purchaseOrderId),
      data: savedDataSet
    };
    api(request).then(() => {
      toast.success(DEFAULT_SUCCESS);
      setErrorDetails({})
      fetchData()
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
      setErrorDetails({ ...error?.response.data })
    });
  }

  const checkPackStatus = (packIndex: number, deliveryIndex: number, packId: number) => {
    const availableQty = deliveryDetails.delivery_data?.[deliveryIndex]?.po_delivery_packs_meta_data?.[packIndex]?.po_pack_quantity;
    const totalQuantity = deliveryDetails.delivery_data?.reduce((sum: number, delivery: any) => {
      const packMeta = delivery.po_delivery_packs_meta_data?.[packIndex];
      return sum + (packMeta?.po_pack_id === packId ? Number(packMeta.quantity || 0) : 0);
    }, 0);
    return totalQuantity >= availableQty;

  };

  const handleQuantityChange = (event: any, deliveryIndex: number, packIndex: any, packId: number, value: any) => {
    setDeliveryDetails((prevDetails: any) => {
      const updatedDetails = { ...prevDetails };
      const delivery = updatedDetails.delivery_data?.[deliveryIndex];
      if (delivery) {
        const pack = delivery.po_delivery_packs_meta_data?.find((p: any) => p.po_pack_id === packId);
        if (pack) {
          pack.quantity = parseFloat(value);
        }
      }
      return updatedDetails;
    });
  };

  useEffect(() => {
    if (deliveryDetails?.delivery_data?.length === 0) {
      setDeliveryDetails((prevDetails: any) => ({
        ...prevDetails,
        delivery_data: [
          {
            id: null,
            delivery_date: null,
            po_delivery_packs_meta_data: prevDetails?.initial_po_pack_meta_data || [],
          }
        ],
        no_of_deliveries: 1
      }));
    }
  }, [deliveryDetails]);

  useEffect(() => {
    if (purchaseOrderId) {
      fetchData()
    }
  }, [purchaseOrderId]);

  return (
    <>
      {isDeleteModalOpen && (
        <RitzModal
          open={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          maxWidth='xs'
          title='Confirm Delete'
        >
          <>
            <Box>
              <Typography>Are you sure you want to delete this file?</Typography>
              <Box sx={{ display: 'flex', justifyContent: 'end', mt: 3 }}>
                <Button variant='contained' onClick={handleDeleteDelivery} color='error'>Delete</Button>
              </Box>
            </Box>
          </>
        </RitzModal>
      )}
      {isLoading ? <DefaultLoader /> :
        <Box>
          <Box sx={{ mt: 1 }}>
            <Typography variant='h6' sx={{ mb: 1, fontWeight: 'bold' }} >No. of Deliveries :</Typography>
          </Box>
          <Box sx={{ mt: 1, width: '10%' }}>
            <RitzInput
              fullWidth
              name={`no_of_deliveries`}
              id={`no_of_deliveries`}
              type={'number'}
              isMulti={false}
              isRequired={true}
              selectedValue={deliveryDetails?.no_of_deliveries || ''}
              handleOnChange={(e: any) => handleChangeNoOfDeliveries(e)}
            />
          </Box>
          <Box sx={{ mt: 2, mb: 2 }}>
            <Divider />
          </Box>
          {deliveryDetails?.delivery_data?.map((delivery: any, deliveryIndex: any) => (
            <React.Fragment key={`${keyHelper.getNextKeyValue()}`}>
              <Box sx={{ mt: 1, }}>
                <Box>
                  <ToggleButtonGroup
                    color="primary"
                    value={delivery?.po_delivery_packs_meta_data.filter((pack: any) => pack.selected)?.map((pack: any) => pack.po_pack_id) || null}
                    onChange={(event, newSelectedPacks) => { handlePackChange(deliveryIndex, newSelectedPacks) }}
                    aria-label={`colorways`}
                    sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}
                  >
                    {delivery?.po_delivery_packs_meta_data?.map((pack: any, packIndex: any) => {
                      if (!pack.selected && checkPackStatus(packIndex, deliveryIndex, pack.po_pack_id)) {
                        return null;
                      }
                      return (
                        <ToggleButton
                          key={`${keyHelper.getNextKeyValue()}`}
                          value={pack.po_pack_id}
                          style={{
                            height: '4em',
                            border: '1px solid #E0E0E0',
                            borderRadius: '5px',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            textAlign: 'center',
                            marginBottom: '10px',
                          }}
                        >
                          {pack?.name}
                        </ToggleButton>
                      );
                    })}
                  </ToggleButtonGroup>
                </Box>
                <Box sx={{ mt: 1, mb: 2, width: '25%' }}>
                  <Typography sx={{ mb: 1 }}>Delivery Date</Typography>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DatePicker
                      format='DD/MM/YYYY'
                      value={dayjs(delivery?.delivery_date)}
                      onChange={(e: any) => handleChangeDate(dayjs(e?.$d).format('YYYY-MM-DD'), deliveryIndex)}
                      slotProps={{
                        textField: {
                          size: 'small'
                        }
                      }}
                    />
                  </LocalizationProvider>
                  <FormErrorMessage message={errorsDetails?.delivery_errors?.[deliveryIndex]?.delivery_date_error} />
                </Box>
              </Box>
              <Box sx={{ mt: 1 }}>
                {isCheckData(deliveryIndex) ? (
                  <>
                    <Box sx={{ width: '50%' }}>
                      <Alert color="info" sx={{ mt: 1 }}>
                        Please select at least one pack to display the delivery matrix.
                      </Alert>
                    </Box>
                  </>

                ) : (
                  <>
                    <Table sx={{ width: '50%' }}>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Pack</TableCell>
                          <TableCell sx={{ borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => darken(theme.palette.grey[50], 0.01) }}>Quantity (Pcs)</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {delivery?.po_delivery_packs_meta_data?.filter((pack: any) => delivery.po_delivery_packs_meta_data?.find((meta: any) => meta?.po_pack_id === pack?.po_pack_id && meta?.selected))
                          .map((pack: any, packIndex: any) => (
                            <TableRow key={`${keyHelper.getNextKeyValue()}`}>
                              <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{pack?.name}</TableCell>
                              <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                <TextField
                                  id={`quantity-${pack?.po_pack_id}`}
                                  fullWidth
                                  autoComplete="off"
                                  name="quantity"
                                  value={pack?.quantity || null}
                                  type="number"
                                  onChange={(e) => handleQuantityChange(e, deliveryIndex, packIndex, pack?.po_pack_id, e.target.value)}
                                  onFocus={(e) => e.target.addEventListener("wheel", function (e) { e.preventDefault() }, { passive: false })}
                                />
                                <FormErrorMessage message={errorsDetails?.delivery_errors?.[deliveryIndex]?.quantity_errors?.[packIndex]?.quantity} />
                                <FormErrorMessage message={errorsDetails?.total_pack_quantity_errors?.[pack?.po_pack_id]?.error} />
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </>
                )}

              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                <Tooltip title="Save Pack" arrow>
                  <IconButton
                    color="primary"
                    onClick={handleSave}
                  >
                    <SaveIcon fontSize="inherit" color='success' />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete Pack" arrow>
                  <IconButton
                    color="error"
                    onClick={() => handleSetSelectedDelivertIds(deliveryIndex, delivery?.id)}
                  >
                    <DeleteForeverIcon fontSize='inherit' />
                  </IconButton>
                </Tooltip>
              </Box>
              <Box sx={{ mt: 2, mb: 2 }}>
                <Divider />
              </Box>
            </React.Fragment>
          ))}
        </Box>
      }
    </>
  );
};

export default PurchaseOrderDeliverySummary;