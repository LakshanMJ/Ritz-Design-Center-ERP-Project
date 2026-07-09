import React, { useEffect, useState } from 'react';
import { getDefaultError } from '@/helpers/Utilities';
import toast from 'react-hot-toast';
import { Alert, Box, Button, Card, CardHeader, IconButton, Table, TableBody, TableCell, TableContainer, TableRow, TextField, Tooltip, Typography } from '@mui/material';
import DefaultLoader from '@/components/DefaultLoader';
import api from '@/services/api';
import * as GrnUrls from '../../helpers/constants/rest_urls/GrnUrls';
import RitzToolTip from '@/components/Ritz/RitzTooltip';
import { getConsumptionMeasuringUnitsURL } from '@/helpers/constants/RestUrls';
import RitzSelection from '@/components/Ritz/RitzSelection';
import { DEFAULT_SUCCESS } from '@/helpers/constants/Constants';
import { ReactKeyHelper } from '@/helpers/KeyHelper';
import SaveSpinner from '@/components/SaveSpinner';
import LocalGroceryStoreIcon from '@mui/icons-material/LocalGroceryStore';
import RitzModal from '@/components/Ritz/RitzModal';
import AddBinLocation from './AddBinLocation';

const GrnAdjustment = ({ grnId }: any) => {
  const keyHelper = new ReactKeyHelper();
  const [isLoading, setIsLoading] = useState(true);
  const [grnAdjustmentDetails, setGrnAdjustmentDetails] = useState<any>([]);
  const [measuringUnits, setMeasuringUnits] = useState<any>({});
  const [refreshingValues, setRefreshingValues] = useState(false)
  const [openBinLocationModal, setOpenBinLocationModal] = useState(false)

  const fetchData = () => {
    if (grnId > 0) {
      setIsLoading(true);
      const requests = [
        api.get(GrnUrls.grnQuantityAdjusmentDetailsURL(grnId)),
        api.get(getConsumptionMeasuringUnitsURL()),
      ]
      Promise.all(requests).then((resp) => {
        const respData = resp.map(r => r.data);
        const [grnDetails, measuringUnits] = respData
        setGrnAdjustmentDetails([...grnDetails]);
        setMeasuringUnits({ ...measuringUnits });
      })
        .catch((error) => {
          toast.error(getDefaultError(error?.response?.status));
        })
        .finally(() => setIsLoading(false));
    }
  };

  const handleChangeQuantity = (value: any, index: number, field: any) => {
    setGrnAdjustmentDetails((prevState: any) => {
      const updatedState = [...prevState];
      updatedState[index] = { ...updatedState[index], [field]: value };
      return updatedState;
    });
  };

  const handleSaveChanges = () => {
    const request = {
      method: 'post',
      url: GrnUrls.grnQuantityAdjusmentDetailsUpdateURL(grnId),
      data: {
        data: grnAdjustmentDetails?.map((material: any) => ({
          id: material?.id,
          usable_quantity: material?.usable_quantity,
          usable_quantity_units: material?.usable_quantity_units,
          mismatch_quantity: material?.mismatch_quantity,
          mismatch_quantity_units: material?.mismatch_quantity_units,
          total_actual_quantity: material?.total_actual_quantity,
          total_actual_quantity_units: material?.total_actual_quantity_units,
          total_deficit_quantity: material?.total_deficit_quantity,
          total_deficit_quantity_units: material?.total_deficit_quantity_units,
          total_excess_quantity: material?.total_excess_quantity,
          total_excess_quantity_units: material?.total_excess_quantity_units,
          total_indicated_quantity: material?.total_indicated_quantity,
          total_indicated_quantity_units: material?.total_indicated_quantity_units,
          total_qa_rejected_quantity: material?.total_qa_rejected_quantity,
          total_qa_rejected_quantity_units: material?.total_qa_rejected_quantity_units,
          width_replacement_quantity: material?.width_replacement_quantity,
          width_replacement_quantity_units: material?.width_replacement_quantity_units,
        }))
      }
    };
    api(request).then((resp) => {
      const resdata = resp?.data || [];
      toast.success(DEFAULT_SUCCESS);
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally();
  }

  const handleRecalculateValues = () => {
    setRefreshingValues(true)
    api.post(GrnUrls.grnQuantityReCalculateURL(grnId))
        .then(response => {
            toast.success(DEFAULT_SUCCESS);
            fetchData();
        })
        .catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        })
        .finally(() => {
            setRefreshingValues(false);
        });
  }
  const handleOpenAddBinLocationModal = (status: any) => {
    setOpenBinLocationModal(status)
  }


  useEffect(() => {
    if (grnId) {
      fetchData();
    }
  }, []);

  return (
    <>
      {openBinLocationModal && (
        <RitzModal open={openBinLocationModal} onClose={()=>{setOpenBinLocationModal(false)}} title='Assign Bin Location' maxWidth={'xl'} >
          <AddBinLocation grnId={grnId} refreshData={() => { setOpenBinLocationModal(false) }} />
        </RitzModal>
      )}
      {isLoading ? (
        <DefaultLoader />
      ) : (
        <>
          {grnAdjustmentDetails.length === 0 && (
            <Alert severity="info">GRN Adjusment data not available at the moment</Alert>
          )}
          
            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <Button variant="outlined" sx={{ mb: 1, mr:1}} disabled={refreshingValues} onClick={() => { handleOpenAddBinLocationModal(true) }}>Assign Bins</Button>
              <Button variant="outlined" sx={{ mb: 1}} disabled={refreshingValues} onClick={() => { handleRecalculateValues() }}>{refreshingValues ? < SaveSpinner /> : <> </>}Refresh & Recalculate Values </Button>
            </Box>
          <TableContainer>
            {grnAdjustmentDetails.map((grnDetail: any, materialIndex: number) => (
              <React.Fragment key={`${keyHelper.getNextKeyValue()}`}>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, mb: 1 }}>
                  <Typography variant='h4' color='primary.main'>{grnDetail.material?.ritz_customer_brand_reference_code || 'N/A'}</Typography>
                  <RitzToolTip
                    materialHeaders={grnDetail?.headers}
                    materialDetails={grnDetail?.material}
                  />
                </Box>
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight:'bold' }}>Description</TableCell>
                      <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight:'bold' }}>Calculated Quantity</TableCell>
                      <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight:'bold'}}>Verification Quantity</TableCell>
                      <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, fontWeight:'bold' }}>Quantity Unit</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '50%' }}>Usable Quantity</TableCell>
                      <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '10%' }}>{grnDetail?.calculated_values?.usable_quantity} {grnDetail?.calculated_values?.usable_quantity_units_display_value}</TableCell>
                      <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '25%' }}>
                        <TextField
                          id='usable_quantity'
                          fullWidth
                          autoComplete="off"
                          name="usable_quantity"
                          value={grnDetail?.usable_quantity}
                          onChange={(event: any) => { handleChangeQuantity(parseFloat(event?.target?.value), materialIndex, 'usable_quantity') }}
                          type="number"
                          onFocus={(e) => e.target.addEventListener("wheel", function (e) { e.preventDefault() }, { passive: false })}
                        />
                      </TableCell>
                      <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                        <RitzSelection
                          id={'usable_quantity_units'}
                          name={'usable_quantity_units'}
                          optionValue={'value'}
                          optionText={'display_value'}
                          selectedValue={grnDetail?.usable_quantity_units}
                          isRequired={true}
                          options={measuringUnits?.all}
                          handleOnChange={(event: any) => { handleChangeQuantity(event?.target?.value, materialIndex, 'usable_quantity_units') }}
                        ></RitzSelection>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Mismatch Quantity</TableCell>
                      <TableCell sx={{  border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '10%' }}>{grnDetail?.calculated_values?.mismatch_quantity} {grnDetail?.calculated_values?.mismatch_quantity_units_display_value}</TableCell>
                      <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                        <TextField
                          id='mismatch_quantity'
                          fullWidth
                          autoComplete="off"
                          name="mismatch_quantity"
                          value={grnDetail?.mismatch_quantity}
                          onChange={(event: any) => { handleChangeQuantity(parseFloat(event?.target?.value), materialIndex, 'mismatch_quantity') }}
                          type="number"
                          onFocus={(e) => e.target.addEventListener("wheel", function (e) { e.preventDefault() }, { passive: false })}
                        />
                      </TableCell>
                      <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                        <RitzSelection
                          id={'mismatch_quantity_units'}
                          name={'mismatch_quantity_units'}
                          optionValue={'value'}
                          optionText={'display_value'}
                          selectedValue={grnDetail?.mismatch_quantity_units}
                          isRequired={true}
                          options={measuringUnits?.all}
                          handleOnChange={(event: any) => { handleChangeQuantity(event?.target?.value, materialIndex, 'mismatch_quantity_units') }}
                        ></RitzSelection>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Actual Quantity</TableCell>
                      <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`,width: '10%' }}>{grnDetail?.calculated_values?.total_actual_quantity} {grnDetail?.calculated_values?.total_actual_quantity_units_display_value}</TableCell>
                      <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                        <TextField
                          id='total_actual_quantity'
                          fullWidth
                          autoComplete="off"
                          name="total_actual_quantity"
                          value={grnDetail?.total_actual_quantity}
                          onChange={(event: any) => { handleChangeQuantity(parseFloat(event?.target?.value), materialIndex, 'total_actual_quantity') }}
                          type="number"
                          onFocus={(e) => e.target.addEventListener("wheel", function (e) { e.preventDefault() }, { passive: false })}
                        />
                      </TableCell>
                      <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                        <RitzSelection
                          id={'order_price_units'}
                          name={'order_price_units'}
                          optionValue={'value'}
                          optionText={'display_value'}
                          selectedValue={grnDetail?.total_actual_quantity_units}
                          isRequired={true}
                          options={measuringUnits?.all}
                          handleOnChange={(event: any) => { handleChangeQuantity(event?.target?.value, materialIndex, 'total_actual_quantity_units') }}
                        ></RitzSelection>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Deficit Quantity</TableCell>
                      <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`,width: '10%' }}>{grnDetail?.calculated_values?.total_deficit_quantity} {grnDetail?.calculated_values?.total_deficit_quantity_units_display_value}</TableCell>
                      <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                        <TextField
                          id='total_deficit_quantity'
                          fullWidth
                          autoComplete="off"
                          name="total_deficit_quantity"
                          value={grnDetail?.total_deficit_quantity}
                          onChange={(event: any) => { handleChangeQuantity(parseFloat(event?.target?.value), materialIndex, 'total_deficit_quantity') }}
                          type="number"
                          onFocus={(e) => e.target.addEventListener("wheel", function (e) { e.preventDefault() }, { passive: false })}
                        />
                      </TableCell>
                      <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                        <RitzSelection
                          id={'total_deficit_quantity_units'}
                          name={'total_deficit_quantity_units'}
                          optionValue={'value'}
                          optionText={'display_value'}
                          selectedValue={grnDetail?.total_deficit_quantity_units}
                          isRequired={true}
                          options={measuringUnits?.all}
                          handleOnChange={(event: any) => { handleChangeQuantity(event?.target?.value, materialIndex, 'total_deficit_quantity_units') }}
                        ></RitzSelection>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Excess Quantity</TableCell>
                      <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '10%' }}>{grnDetail?.calculated_values?.total_excess_quantity} {grnDetail?.calculated_values?.total_excess_quantity_units_display_value}</TableCell>
                      <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                        <TextField
                          id='total_excess_quantity'
                          fullWidth
                          autoComplete="off"
                          name="total_excess_quantity"
                          value={grnDetail?.total_excess_quantity}
                          onChange={(event: any) => { handleChangeQuantity(parseFloat(event?.target?.value), materialIndex, 'total_excess_quantity') }}
                          type="number"
                          onFocus={(e) => e.target.addEventListener("wheel", function (e) { e.preventDefault() }, { passive: false })}
                        />
                      </TableCell>
                      <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                        <RitzSelection
                          id={'total_excess_quantity_units'}
                          name={'total_excess_quantity_units'}
                          optionValue={'value'}
                          optionText={'display_value'}
                          selectedValue={grnDetail?.total_excess_quantity_units}
                          isRequired={true}
                          options={measuringUnits?.all}
                          handleOnChange={(event: any) => { handleChangeQuantity(event?.target?.value, materialIndex, 'total_excess_quantity_units') }}
                        ></RitzSelection>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Indicated Quantity</TableCell>
                      <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '10%' }}>{grnDetail?.calculated_values?.total_indicated_quantity} {grnDetail?.calculated_values?.total_indicated_quantity_units_display_value}</TableCell>
                      <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                        <TextField
                          id='total_indicated_quantity'
                          fullWidth
                          autoComplete="off"
                          name="total_indicated_quantity"
                          value={grnDetail?.total_indicated_quantity}
                          onChange={(event: any) => { handleChangeQuantity(parseFloat(event?.target?.value), materialIndex, 'total_indicated_quantity') }}
                          type="number"
                          onFocus={(e) => e.target.addEventListener("wheel", function (e) { e.preventDefault() }, { passive: false })}
                        />
                      </TableCell>
                      <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                        <RitzSelection
                          id={'total_indicated_quantity_units'}
                          name={'total_indicated_quantity_units'}
                          optionValue={'value'}
                          optionText={'display_value'}
                          selectedValue={grnDetail?.total_indicated_quantity_units}
                          isRequired={true}
                          options={measuringUnits?.all}
                          handleOnChange={(event: any) => { handleChangeQuantity(event?.target?.value, materialIndex, 'total_indicated_quantity_units') }}
                        ></RitzSelection>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>QA Rejected Quantity</TableCell>
                      <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '10%' }}>{grnDetail?.calculated_values?.total_qa_rejected_quantity} {grnDetail?.calculated_values?.total_qa_rejected_quantity_units_display_value}</TableCell>
                      <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                        <TextField
                          id='total_qa_rejected_quantity'
                          fullWidth
                          autoComplete="off"
                          name="total_qa_rejected_quantity"
                          value={grnDetail?.total_qa_rejected_quantity}
                          onChange={(event: any) => { handleChangeQuantity(parseFloat(event?.target?.value), materialIndex, 'total_qa_rejected_quantity') }}
                          type="number"
                          disabled
                          onFocus={(e) => e.target.addEventListener("wheel", function (e) { e.preventDefault() }, { passive: false })}
                        />
                      </TableCell>
                      <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                        <RitzSelection
                          id={'total_qa_rejected_quantity_units'}
                          name={'total_qa_rejected_quantity_units'}
                          optionValue={'value'}
                          optionText={'display_value'}
                          selectedValue={grnDetail?.total_qa_rejected_quantity_units}
                          isRequired={true}
                          isReadOnly={true}
                          options={measuringUnits?.all}
                          handleOnChange={(event: any) => { handleChangeQuantity(event?.target?.value, materialIndex, 'total_qa_rejected_quantity_units') }}
                        ></RitzSelection>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Width Replacement Quantity</TableCell>
                      <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '10%' }}>{grnDetail?.calculated_values?.width_replacement_quantity} {grnDetail?.calculated_values?.width_replacement_quantity_units_display_value}</TableCell>
                      <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                        <TextField
                          id='width_replacement_quantity'
                          fullWidth
                          autoComplete="off"
                          name="width_replacement_quantity"
                          value={grnDetail?.width_replacement_quantity}
                          onChange={(event: any) => { handleChangeQuantity(parseFloat(event?.target?.value), materialIndex, 'width_replacement_quantity') }}
                          type="number"
                          onFocus={(e) => e.target.addEventListener("wheel", function (e) { e.preventDefault() }, { passive: false })}
                        />
                      </TableCell>
                      <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                        <RitzSelection
                          id={'width_replacement_quantity_units'}
                          name={'width_replacement_quantity_units'}
                          optionValue={'value'}
                          optionText={'display_value'}
                          selectedValue={grnDetail?.width_replacement_quantity_units}
                          isRequired={true}
                          options={measuringUnits?.all}
                          handleOnChange={(event: any) => { handleChangeQuantity(event?.target?.value, materialIndex, 'width_replacement_quantity_units') }}
                        ></RitzSelection>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

              </React.Fragment>
            ))}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
              <Button variant="outlined" onClick={() => { handleSaveChanges() }} >Save</Button>
            </Box>
          </TableContainer>
        </>
      )}
    </>
  );
};

export default GrnAdjustment;
