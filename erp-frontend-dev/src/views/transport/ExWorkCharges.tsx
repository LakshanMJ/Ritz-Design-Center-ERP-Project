

import api from '@/services/api';
import toast from 'react-hot-toast';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import { ColumnDef } from '@tanstack/react-table';
import SaveSpinner from '@/components/SaveSpinner';
import React, { useEffect, useState } from 'react';
import RitzModal from '@/components/Ritz/RitzModal';
import RitzTable from '@/components/Ritz/RitzTable';
import CreatableSelect from 'react-select/creatable';
import { getDefaultError } from '@/helpers/Utilities';
import DefaultLoader from '@/components/DefaultLoader';
import FormErrorMessage from '@/components/FormErrorMessage';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import * as TransportUrls from '../../helpers/constants/rest_urls/TransportUrls';
import { Box, Button, FormControlLabel, Grid, IconButton, InputLabel, MenuItem, Paper, Radio, RadioGroup, Select, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material'
import RitzSearchableSelection from '@/components/Ritz/RitzSearchableSelection';

const ExWorkCharges = () => {

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'charge_name',
      header: 'Ex-Work Charge',
    },
    {
      accessorKey: 'supplier_location_port_name',
      header: 'Supplier Location Port',
    },
    {
      accessorKey: '',
      header: 'Transport Type',
      cell: props => (
        <Typography>{props.row.original.transport_mode === 'sea' ? "Sea" : "Air"}</Typography>
      )
    },
    {
      accessorKey: '',
      header: 'Cost Type',
      cell: (props) => {
        if (props.row.original.cost_type === 'unit_based') {
          return <Typography>Unit Based</Typography>;
        } else if (props.row.original.cost_type === 'fixed_charge') {
          return <Typography>Fixed Charge</Typography>
        } else {
          return <Typography>Range Based</Typography>
        }
      },
    },
    {
      accessorKey: "id",
      header: 'Action',
      enableSorting: false,
      enableColumnFilter: false,
      enableGlobalFilter: false,
      cell: props => (
        <IconButton size='small' color='primary' onClick={() => modalOpen(true, "Edit Ex-Work Charge", props.getValue())}>
          <EditIcon fontSize='inherit' />
        </IconButton>
      ),
      meta: {
        align: 'center',
        width: 100
      }
    }
  ];

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState<string>();
  const [errors, setErrors] = useState<any>({});
  const [addedRows, setAddedRows] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [exWorkCharges, setExWorkCharges] = useState<any>([]);
  const [removedRanges, setRemovedRanges] = useState<any>([]);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [isEditExWorkName, setIsEditExWorkName] = useState(false);
  const [editExWorkChargeId, setEditExWorkChargeId] = useState(0);
  const [exWorkChargesMetadata, setExWorkChargesMetadata] = useState<any>({});
  const [selectedExWorkChargeName, setSelectedExWorkChargeName] = useState(null);
  const [exWorkCharge, setExWorkCharge] = useState({
    name: null,
    supplier_location: null,
    port: null,
    costing_type: '',
    transport_mode: '',
    cost_type: '',
    cost: null,
    costing_units: null,
    deleted_ex_work_charge_range_ids: [],
    ex_work_charge_ranges: [{
      id: null,
      end_range: null,
      start_range: 0,
      cost_type: "",
      amount: null
    }],
  });
  console.log(exWorkCharge,'exWorkCharge')
  const initialExWorkChargeState = {
    name: null as any,
    supplier_location: null as any,
    port: null as any,
    costing_type: null as any,
    transport_mode: '',
    cost_type: '',
    cost: null as any,
    deleted_ex_work_charge_range_ids: [] as any,
    costing_units: null as any,
    ex_work_charge_ranges: [{
      id: null as any,
      end_range: null as any,
      start_range: 0,
      cost_type: "",
      amount: null as any
    }]
  };

  const getExWorkCharges = () => {
    setIsLoading(true);
    api.get(TransportUrls.exWorkChargesURL()).then(resp => {
      const resdata = resp?.data || [];
      setExWorkCharges([...resdata]);
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => setIsLoading(false));
  };

  const getExWorkChargesMetaData = () => {
    setIsLoading(true);
    api.get(TransportUrls.exWorkChargesMetaDataURL()).then((resp) => {
      const resdata = resp?.data || {};
      setExWorkChargesMetadata(resdata);
    }).catch((error) => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => setIsLoading(false));
  };

  //this function use for refresh table if user change cost type
  const getExWorkChargeDetails = () => {
    if (editExWorkChargeId > 0 ){
      api.get(TransportUrls.exWorkChargeURL(editExWorkChargeId)).then(resp => {
        const reseditdata = resp?.data || {};
        setExWorkCharge({ ...reseditdata });
      }).catch(error => {
        toast.error(getDefaultError(error?.response?.status));
      })
    }
  }
  
  const updateSupplierLocation = (selectedSupplierLocation: any) => {
    setExWorkCharge(prev => ({
      ...prev,
      supplier_location: selectedSupplierLocation,
    }));
  };


  const handleRangeChange = (event: any, rangeIndex: any, fieldName: any) => {
    const { value } = event.target;
    const updatedRanges = [...exWorkCharge.ex_work_charge_ranges];

    updatedRanges[rangeIndex] = {
      ...updatedRanges[rangeIndex],
      [fieldName]: value,
    };

    if (fieldName === 'end_range' && rangeIndex < updatedRanges.length - 1) {
      const nextRowStartRange = value;
      updatedRanges[rangeIndex + 1] = {
        ...updatedRanges[rangeIndex + 1],
        start_range: nextRowStartRange,
      };
    }

    setExWorkCharge({
      ...exWorkCharge,
      ex_work_charge_ranges: updatedRanges,
    });
  };

  const handleNameOnChange = (selectedOption: any) => {
    const existingOption = updatedExWorkChargeNames?.find(
      (option: any) => option.label === selectedOption.label
    );

    if (existingOption) {
      setExWorkCharge({ ...exWorkCharge, name: selectedOption.id });
    } else {
      api.post(TransportUrls.createExWorkChargeNameURL(), { name: selectedOption.label, active: true })
        .then((response) => {
          const createdNameId = response?.data.id || {}
          setExWorkCharge({ ...exWorkCharge, name: createdNameId });
          getExWorkChargesMetaData()
        })
        .catch((error) => {
        })
    }
  }

  const handleExWorkNameChange = (event: any) => {
    const newName = event.target.value;

    setSelectedExWorkChargeName((prevSelectedName: any) => ({
      ...prevSelectedName,
      name: newName,
    }));
  };

  const handleChange = (event: any) => {
    const { name, value } = event.target;
    if (name === 'cost_type' && value === 'fixed_charge') {
      // if (editExWorkChargeId === 0) {
        setExWorkCharge({
          ...exWorkCharge,
          cost_type: 'fixed_charge',
          cost: null,
          costing_units: null,
          ex_work_charge_ranges: [],
        });
      // }
    } else if (name === 'cost_type' && value === 'range_based') {
      // if (editExWorkChargeId === 0) {
        const initialRange = {
          id: null as any,
          end_range: null as any,
          start_range: 0,
          cost_type: "",
          amount: null as any,
        };

        setExWorkCharge({
          ...exWorkCharge,
          cost_type: 'range_based',
          cost: null,
          costing_units: null,
          ex_work_charge_ranges: [initialRange],   
        });
      // if (exWorkCharge.cost_type === 'unit_based' || 'fixed_charge'){
      //   getExWorkChargeDetails()
      // }
      // }
    } else if (name === 'cost_type' && value === 'unit_based') {
      // if (editExWorkChargeId === 0) {
        setExWorkCharge({
          ...exWorkCharge,
          cost_type: 'unit_based',
          cost: null,
          ex_work_charge_ranges: []
        }); 
      // }
    } else {
      setExWorkCharge({
        ...exWorkCharge,
        [name]: value,
      });
    }
  };

  const addNewRow = () => {
    const newRow = {
      id: null as any,
      end_range: null as any,
      start_range: exWorkCharge.ex_work_charge_ranges[exWorkCharge.ex_work_charge_ranges.length - 1].end_range,
      cost_type: '',
      amount: null as any,
    };

    setExWorkCharge({
      ...exWorkCharge,
      ex_work_charge_ranges: [...exWorkCharge.ex_work_charge_ranges, newRow],
    });

    setAddedRows([...addedRows, newRow]);
  };

  const handleDeleteRow = (rangeIndex: any) => {
    if (editExWorkChargeId > 0) {
      const removedId = exWorkCharge.ex_work_charge_ranges[rangeIndex].id;
      setRemovedRanges((prevRemovedRanges: any) => [...prevRemovedRanges, removedId]);
      const updatedRanges = [...exWorkCharge.ex_work_charge_ranges];
      updatedRanges.splice(rangeIndex, 1);
      setExWorkCharge({
        ...exWorkCharge,
        ex_work_charge_ranges: updatedRanges,
      });
    } else {
      const updatedRanges = [...exWorkCharge.ex_work_charge_ranges];
      updatedRanges.splice(rangeIndex, 1);
      setExWorkCharge({
        ...exWorkCharge,
        ex_work_charge_ranges: updatedRanges,
      });
    }
  };

  const handleSave = () => {
    setIsSaving(true);

    const updatedExWorkCharge = {
      ...exWorkCharge,
      deleted_ex_work_charge_range_ids: removedRanges || [],
    };

    const request = {
      method: editExWorkChargeId === 0 ? 'post' : 'put',
      url: editExWorkChargeId === 0 ? TransportUrls.createExWorkChargeURL() : TransportUrls.updateExWorkChargeURL(editExWorkChargeId),
      data: editExWorkChargeId === 0 ? exWorkCharge : updatedExWorkCharge
    }

    api(request).then(() => {
      setOpen(false);
      getExWorkCharges()
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
      if (error?.response?.data) {
        setErrors(error.response.data);
      }
    }).finally(() => setIsSaving(false));
  };

  const handleSaveExWorkName = () => {
    api.put(TransportUrls.updateExWorkChargeNameURL(selectedExWorkChargeName.id), selectedExWorkChargeName).then(resp => {
      getExWorkChargesMetaData()
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    })
  }

  const modalOpen = (isOpen: any, title: string, exWorkChargeId: any) => {
    setTitle(title);
    setEditExWorkChargeId(exWorkChargeId);
    setOpen(isOpen);
    setErrors({})
    if (exWorkChargeId === 0) {
      //
    } else {
      setIsModalLoading(true);
      api.get(TransportUrls.exWorkChargeURL(exWorkChargeId)).then(resp => {
        const reseditdata = resp?.data || {};
        setExWorkCharge({ ...reseditdata });
      }).catch(error => {
        toast.error(getDefaultError(error?.response?.status));
      }).finally(() => setIsModalLoading(false));
    }
  }

  const modalClose = () => {
    setOpen(false);
    setErrors({});
    setIsEditExWorkName(false)
    // setExWorkCharges([])
  };

  const updatedExWorkChargeNames = exWorkChargesMetadata.ex_work_charge_names?.map((item: any) => {
    return { ...item, label: item.name };
  });

  useEffect(() => {
    getExWorkCharges()
    getExWorkChargesMetaData()
  }, []);

  useEffect(() => {
    if (exWorkCharge.name !== null && exWorkChargesMetadata.ex_work_charge_names) {
      const selectedName = exWorkChargesMetadata.ex_work_charge_names.find(
        (item:any) => item.id === exWorkCharge.name
      );
      setSelectedExWorkChargeName(selectedName);
    }
  }, [exWorkCharge.name, exWorkChargesMetadata.ex_work_charge_names]);

  return (
    <>
      <Typography variant='h1'>Ex-Work Charges List</Typography>
 
      {isLoading ? <DefaultLoader /> : <>
        <Button variant="contained" onClick={() => { modalOpen(true, "Create New Ex-Work Charge", 0); setExWorkCharge(initialExWorkChargeState); setIsEditExWorkName(false) }}>Add Ex-Work Charge</Button>
        <RitzTable
          data={exWorkCharges}
          columns={columns}
        />
        <RitzModal open={open} onClose={modalClose} title={title} isLoading={isModalLoading} fullWidth maxWidth='md'>
          <Box sx={{ marginBottom: '20px' }}>
            <Typography component="legend" sx={{ mb: 1 }}>Name</Typography>
            <Grid container spacing={0}>
              {!isEditExWorkName ? (
                <>
                  <Grid item xs={!exWorkCharge.name ? 12 : 11.5}>
                      <CreatableSelect
                        options={updatedExWorkChargeNames}
                        onChange={handleNameOnChange}
                        value={updatedExWorkChargeNames?.find((option: any) => option.id === exWorkCharge.name) || null}
                        styles={{
                          option: (provided, state) => ({
                            ...provided,
                            backgroundColor: state.isSelected ? '#E4F1FF' : 'white',
                            color: 'black',
                            ':hover': {
                              backgroundColor: '#F0F0F0',
                            },
                          }),
                          control: (provided) => ({
                            ...provided,
                            height: '50px',
                          }),
                        }}
                      />
                  </Grid>
                  <Grid item xs={0.5}>
                    {updatedExWorkChargeNames?.find((option: any) => option.id === exWorkCharge.name) && (
                      <IconButton size='medium' color='primary' sx={{ height: '50px', marginLeft: '5px' }} onClick={() => { setIsEditExWorkName(true) }}>
                        <EditIcon fontSize='inherit' sx={{ margin: '5px 5px 5px 5px' }} />
                      </IconButton>
                    )}
                  </Grid>
                </>
              ) : (
                <>
                    <Grid item xs={11.5}>
                  <TextField
                    variant="outlined"
                    name="end_range"
                    fullWidth
                    size="medium"
                    value={selectedExWorkChargeName.name}
                    onChange={handleExWorkNameChange}
                    sx={{ height: '50px' }}
                  />
                </Grid>
                    <Grid item xs={0.5}>
                      <IconButton size='medium' color='success' sx={{ height: '50px', marginLeft: '5px' }} onClick={() => { setIsEditExWorkName(false); handleSaveExWorkName() }}>
                  <SaveIcon fontSize='inherit' sx={{ margin: '5px 5px 5px 5px' }} />
                  </IconButton>
                </Grid>
                </>
              )}
            </Grid>
            <FormErrorMessage message={errors.name} />
          </Box>
          <Box sx={{ marginBottom: '20px' }}>
            <Typography component="legend" sx={{ mb: 1 }}>Supplier Location</Typography>
            <RitzSearchableSelection
                options={exWorkChargesMetadata?.supplier_locations}
                placeholder="Select..."
                selectedValue={exWorkCharge?.supplier_location || ''}
                handleOnChange={(option: any) => {updateSupplierLocation(option)}}
                id={'id'}
                name={'id'}
                optionValue={'id'}
                optionText={'name'}
            />
            <FormErrorMessage message={errors.supplier_location} />
          </Box>
          {exWorkChargesMetadata?.ports && (
              <Box sx={{ marginBottom: '20px' }}>
                <Typography component="legend" sx={{ mb: 1 }}>Port</Typography>
                <Select
                  value={exWorkCharge.port || ''}
                  onChange={(event: any) => {
                    const selectedSupplierPort = event.target.value
                    setExWorkCharge({ ...exWorkCharge, port: selectedSupplierPort, });
                  }}
                  fullWidth
                >
                  {exWorkChargesMetadata?.ports.map((port: any) => (
                    <MenuItem key={port.id} value={port.id}>
                      {port.name}
                    </MenuItem>
                  ))}
                </Select>
                <FormErrorMessage message={errors.port} />
              </Box>
            )
          }
          <Box sx={{ marginBottom: '20px' }}>
            <Typography component="legend" sx={{ mb: 1 }}>Transport Mode</Typography>
            <RadioGroup
              aria-label="transport-mode"
              name="transport_mode"
              value={exWorkCharge.transport_mode}
              onChange={handleChange}
              style={{ display: 'flex', flexDirection: 'row' }}
            >
              {exWorkChargesMetadata.transport_modes?.map((mode: any) => (
                <FormControlLabel
                  key={mode.id}
                  value={mode.id}
                  control={<Radio />}
                  label={mode.name}
                />
              ))}
            </RadioGroup>
          </Box>
          <Box sx={{ marginBottom: '20px' }}>
            <InputLabel component="legend" sx={{ mb: 1 }}>Cost Type</InputLabel>
            <RadioGroup
              aria-label="cost_type"
              name="cost_type"
              value={exWorkCharge.cost_type}
              onChange={(event) => {
                if (event.target.value !== exWorkCharge.cost_type) {
                  handleChange(event);
                }
              }}
              style={{ display: 'flex', flexDirection: 'row' }}
            >
              {exWorkChargesMetadata.cost_types?.map((mode: any) => (
                <FormControlLabel
                  key={mode.id}
                  value={mode.id}
                  control={<Radio />}
                  label={mode.name}
                  // disabled={editExWorkChargeId > 0}
                />
              ))}
            </RadioGroup>
            <FormErrorMessage message={errors.cost_type} />
          </Box>
          {(exWorkCharge.cost_type === 'fixed_charge' || exWorkCharge.cost_type === 'unit_based') && (
            <Box sx={{ marginBottom: '20px' }}>
              <InputLabel component="legend" sx={{ mb: 1 }}>Cost</InputLabel>
              <TextField
                variant="outlined"
                name='cost'
                type='number'
                fullWidth
                value={exWorkCharge.cost || ''}
                onChange={handleChange}
                sx={styleForNumberField}
              />
            </Box>
          )}
          {exWorkCharge.cost_type === 'unit_based' && (
            <Box sx={{ marginBottom: '20px' }}>
              <InputLabel component="legend" sx={{ mb: 1 }}>Costing Units</InputLabel>
              <RadioGroup
                aria-label="costing_units"
                name="costing_units"
                value={exWorkCharge.costing_units || ''}
                onChange={handleChange}
                style={{ display: 'flex', flexDirection: 'row' }}
              >
                {exWorkChargesMetadata.costing_units?.map((mode: any) => (
                  <FormControlLabel
                    key={mode.id}
                    value={mode.id}
                    control={<Radio />}
                    label={mode.name}
                  />
                ))}
              </RadioGroup>
            </Box>
          )}
          {exWorkCharge.cost_type === 'range_based' && (
            <Box sx={{ marginBottom: '20px' }}>
              <Button variant='outlined' sx={{ float: 'right', marginBottom: '10px' }} onClick={addNewRow}>
                Add
              </Button>
              <TableContainer component={Paper}>
                <Table sx={{ overflow: 'hidden' }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Start Range</TableCell>
                      <TableCell>End Range</TableCell>
                      <TableCell>Cost Amount($)</TableCell>
                      <TableCell>Cost Type</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {exWorkCharge.ex_work_charge_ranges.map((range, rangeIndex) => (
                      <TableRow key={range.id}>
                        <TableCell sx={{ width: '100px' }}>
                          <TextField
                            variant="outlined"
                            name='start_range'
                            fullWidth
                            size='small'
                            type='number'
                            value={rangeIndex === 0 ? 0 : (range.start_range || '')}
                            onChange={(e) => handleRangeChange(e, rangeIndex, 'start_range')}
                            sx={styleForNumberField}
                          />
                        </TableCell>
                        <TableCell sx={{ width: '100px' }}>
                          <TextField
                            variant="outlined"
                            name="end_range"
                            fullWidth
                            size="small"
                            type='number'
                            value={range.end_range || ''}
                            onChange={(e) => handleRangeChange(e, rangeIndex, 'end_range')}
                            sx={styleForNumberField}
                          />
                        </TableCell>
                        <TableCell sx={{ width: '100px' }}>
                          <TextField
                            variant="outlined"
                            name='cost'
                            fullWidth
                            size='small'
                            type='number'
                            value={range.amount || ''}
                            onChange={(e) => handleRangeChange(e, rangeIndex, 'amount')}
                            sx={styleForNumberField}
                          />
                        </TableCell>
                        <TableCell sx={{ width: '100px' }}>
                          <Grid container spacing={0}>
                            <Grid item xs={10}>
                              <Select
                                labelId={`cost-type-label-${range.id}`}
                                id={`cost-type-select-${range.id}`}
                                fullWidth
                                size='small'
                                name="cost_type"
                                value={range.cost_type || ''}
                                onChange={(e) => handleRangeChange(e, rangeIndex, 'cost_type')}
                              >
                                {exWorkChargesMetadata.cost_types_range_based?.map((mode: any) => (
                                  <MenuItem key={mode.id} value={mode.id}>
                                    {mode.name}
                                  </MenuItem>
                                ))}
                              </Select>
                            </Grid>
                            <Grid item xs={2}>
                              {rangeIndex > 0 && rangeIndex === exWorkCharge.ex_work_charge_ranges.length - 1 && (
                                <IconButton sx={{ marginRight: '10px', marginLeft: '5px' }} onClick={() => handleDeleteRow(rangeIndex)}>
                                  <DeleteOutlineIcon color='warning' />
                                </IconButton>
                              )}
                            </Grid>
                          </Grid>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
          <Button variant="contained" sx={{ display: 'flex', justifyContent: 'end', float: 'right' }} onClick={handleSave}>{isSaving && <SaveSpinner />}{editExWorkChargeId > 0 ? "Update" : "Create"}</Button>
        <Box>
            {errors.start_range && (
              <FormErrorMessage message={"Start Range: " + errors.start_range} />
            )}
            {errors.cost && (
              <FormErrorMessage message={"Cost: " + errors.cost} />
            )}
            {errors.cost_type && (
              <FormErrorMessage message={"Cost Type: " + errors.cost_type} />
            )} 
        </Box>
        </RitzModal>
      </>}
    </>
  )
}

export default ExWorkCharges

const styleForNumberField =  {
  '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': {
    WebkitAppearance: 'none',
    display: 'none',
    margin: 0,
  },
  '& input[type=number]': {
    'MozAppearance': 'textfield',
  },
}