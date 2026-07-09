import RitzModal from '@/components/Ritz/RitzModal';
import RitzTable from '@/components/Ritz/RitzTable';
import { getDefaultError } from '@/helpers/Utilities';
import api from '@/services/api';
import { Box, Button, IconButton, MenuItem, Select, SelectChangeEvent, TextField, Typography } from '@mui/material';
import { ColumnDef } from '@tanstack/react-table';
import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast';
import * as TransportUrls from '../../helpers/constants/rest_urls/TransportUrls';
import CreatableSelect from 'react-select/creatable';
import SaveSpinner from '@/components/SaveSpinner';
import EditIcon from '@mui/icons-material/Edit';

interface TransportTransportPerUnitChargesMetaData {
  costing_types?: any[];
  trade_types?: any[];
  transport_types?: any[];
  ports?: any[];
  per_unit_charge_names?: any[];
  currencies?: any[];
}

const TransportPerUnitCharges = () => {

  const [perUnitCharge, setPerUnitCharge] = useState({ costing_type: '', charge: null, charge_currency:null, trade_type: '', transport_type: null, port: null, charge_type: null});
  const [perUnitChargesList, setPerUnitChargesList] = useState([]);
  const [transportTransportPerUnitChargesMetaData,setTransportTransportPerUnitChargesMetaData] = useState<TransportTransportPerUnitChargesMetaData>({})
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [modalState, setModalState] = useState({
    open: false,
    modal_status: '',
    editId: null
  });
  const [errors, setErrors] = useState<any>({});
  const columns: ColumnDef<any>[] = [
      { 
        accessorKey: 'costing_type_display',
        header: 'Costing Type'
      },
      { 
        accessorKey: 'charge', 
        header: 'Charge',
        cell: (props: any) => {
          return(
            <Typography>
              {props?.row?.original?.charge} {props?.row?.original?.charge_currency || ''}
            </Typography>
          )
        }
      },
      { 
        accessorKey: 'trade_type_display', 
        header: 'Trade Type'
      },
      { 
        accessorKey: 'transport_type_name', 
        header: 'Transport Type' 
      },
      { 
        accessorKey: 'port_name', 
        header: 'Port' 
      },
      { 
        accessorKey: 'charge_name', 
        header: 'Charge Name' 
      },
      {
      accessorKey: "id",
      header: 'Action',
      enableSorting: false,
      enableColumnFilter: false,
      enableGlobalFilter: false,
      cell: props => (
        <IconButton 
          size='small' color='primary' onClick={() => modalOpen(true, "Edit Transport Per Unit Charge", props.row.original.id)}>
          <EditIcon fontSize='inherit' />
        </IconButton>
      ),
      meta: {
        align: 'center',
        width: 100
      }
    }
    ];

  const perUnitChargeOptions = transportTransportPerUnitChargesMetaData?.per_unit_charge_names?.map((item) => ({
    label: item.name,
    value: item.id,
    ...item,
  }));

  const getTransportPerUnitCharges = () => {
      setIsLoading(true);
      api.get(TransportUrls.transportPerUnitChargeNameList()).then(resp => {
        const resdata = resp?.data || [];
        setPerUnitChargesList([...resdata]);
      }).catch(error => {
        toast.error(getDefaultError(error?.response?.status));
      }).finally(() => setIsLoading(false));
  };

  const getTransportPerUnitChargeDetails = () => {
      setIsLoading(true);
      api.get(TransportUrls.transportPerUnitChargeDetail(modalState?.editId)).then(resp => {
        const resdata = resp?.data || [];
        setPerUnitCharge({...resdata});
      }).catch(error => {
        toast.error(getDefaultError(error?.response?.status));
      }).finally(() => setIsLoading(false));
  };

  const getTransportPerUnitChargeMetaData = () => {
      setIsLoading(true);
      api.get(TransportUrls.transportPerUnitChargeMetaData()).then(resp => {
        const resdata = resp?.data || [];
        setTransportTransportPerUnitChargesMetaData({...resdata});
      }).catch(error => {
        toast.error(getDefaultError(error?.response?.status));
      }).finally(() => setIsLoading(false));
  };

  const handleSave = () => {
    setIsSaving(true);

    const request = {
      method: !modalState?.editId ? 'post' : 'put',
      url:  !modalState?.editId ? TransportUrls.transportPerUnitChargeCreate() : TransportUrls.transportPerUnitChargeUpdate(modalState?.editId),
      data: perUnitCharge
    }

    api(request).then(() => {
      setModalState(prev => ({...prev, open: false}));
      getTransportPerUnitCharges();
      setPerUnitCharge({
        costing_type: '',
        charge: null,
        charge_currency: null,
        trade_type: '',
        transport_type: null,
        port: null,
        charge_type: null,
      });
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
      if (error?.response?.data) {
        setErrors(error.response.data);
      }
    }).finally(() => setIsSaving(false));
  }

  const handleChargeTypeOnChange = (selectedOption: any) => {
      const existingOption = perUnitChargeOptions?.find(
        (option: any) => option.label === selectedOption.label
      );
  
      if (existingOption) {
        setPerUnitCharge({ ...perUnitCharge, charge_type: selectedOption.id });
      } else {
        api.post(TransportUrls.transportPerUnitChargeNameCreate(), { name: selectedOption.label, active: true })
          .then((response) => {
            const createdNameId = response?.data.id || {}
            setPerUnitCharge({ ...perUnitCharge, charge_type: createdNameId });
            getTransportPerUnitChargeMetaData()
          })
          .catch((error) => {
          })
      }
    }
  
  const modalClose = () => {
    setPerUnitCharge({
      costing_type: '',
      charge: null,
      charge_currency: null,
      trade_type: '',
      transport_type: null,
      port: null,
      charge_type: null,
    });

    setModalState({
      open: false,
      modal_status: '',
      editId: null
    });

    setErrors({});
  };

  const modalOpen = (open: boolean, modal_status: string, editId?: number | null) => {
    setModalState(prev => ({...prev, open: open}));
    setModalState(prev => ({...prev, modal_status: modal_status}));
    setModalState(prev => ({...prev, editId: editId}));
  }

  useEffect(() => {
    getTransportPerUnitCharges();
    getTransportPerUnitChargeMetaData();
  }, []);

  useEffect(() => {
    if (modalState?.editId > 0) {
      getTransportPerUnitChargeDetails();
    }
  }, [modalState?.editId]);

  return (
    <>
      <Typography variant='h1' >Transport Per-Unit Charges</Typography>
      <Button
        variant="contained"
        color="primary"
        onClick={() => {modalOpen(true, "Create Transport Per Unit Charge", null)}}
        >
          Add Charge
      </Button>

      <RitzTable 
        data={perUnitChargesList || []} 
        columns={columns} 
      />

      <RitzModal open={modalState?.open} onClose={modalClose} title={modalState?.modal_status}  fullWidth maxWidth='md'>
        <Box sx={{ marginBottom: '20px' , paddingBottom: '20px' }}>

          <Typography component="legend" sx={{ mb: 1, mt:1 }}>Costing Type</Typography>
          <Select
            value={perUnitCharge.costing_type || ''}
            onChange={(event: any) => {
              setPerUnitCharge({ ...perUnitCharge, costing_type: event.target.value, });
            }}
            fullWidth
          >
            {transportTransportPerUnitChargesMetaData.costing_types?.map((item: any) => (
              <MenuItem key={item.costing_type} value={item.costing_type}>
                {item.display}
              </MenuItem>
            ))}
          </Select>

          <Typography component="legend" sx={{ mb: 1, mt:1}}>Charge</Typography>
          <TextField
              value={perUnitCharge?.charge || ''}
              autoComplete="new-username"
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                const input = event.target.value;
                if (/^\d*\.?\d*$/.test(input)) {
                  setPerUnitCharge({ ...perUnitCharge, charge: input });
                }
              }}
              fullWidth
              type="text"
          />

          <Typography component="legend" sx={{ mb: 1, mt:1}}>Charge Unit</Typography>
          <Select
            value={perUnitCharge.charge_currency || ''}
            onChange={(event: any) => {
              setPerUnitCharge({ ...perUnitCharge, charge_currency: event.target.value, });
            }}
            fullWidth
          >
            {transportTransportPerUnitChargesMetaData.currencies?.map((item: any) => (
              <MenuItem key={item.currency} value={item.currency}>
                {item.display}
              </MenuItem>
            ))}
          </Select>

          <Typography component="legend" sx={{ mb: 1, mt:1 }}>Trade Type</Typography>
          <Select
            value={perUnitCharge.trade_type || ''}
            onChange={(event: any) => {
              setPerUnitCharge({ ...perUnitCharge, trade_type: event.target.value, });
            }}
            fullWidth
          >
            {transportTransportPerUnitChargesMetaData.trade_types?.map((item: any) => (
              <MenuItem key={item.trade_type} value={item.trade_type}>
                {item.display}
              </MenuItem>
            ))}
          </Select>

          <Typography component="legend" sx={{ mb: 1, mt:1 }}>Transport Type</Typography>
          <Select
            value={perUnitCharge.transport_type || ''}
            onChange={(event: any) => {
              setPerUnitCharge({ ...perUnitCharge, transport_type: event.target.value, });
            }}
            fullWidth
          >
            {transportTransportPerUnitChargesMetaData.transport_types?.map((item: any) => (
              <MenuItem key={item.id} value={item.id}>
                {item.name}
              </MenuItem>
            ))}
          </Select>

          <Typography component="legend" sx={{ mb: 1, mt:1}}>Port</Typography>
          <Select
            value={perUnitCharge.port || ''}
            onChange={(event: any) => {
              setPerUnitCharge({ ...perUnitCharge, port: event.target.value, });
            }}
            fullWidth
          >
            {transportTransportPerUnitChargesMetaData.ports?.map((item: any) => (
              <MenuItem key={item.id} value={item.id}>
                {item.name}
              </MenuItem>
            ))}
          </Select>

          <Typography component="legend" sx={{ mb: 1, mt:1 }}>Charge Type</Typography>
          <CreatableSelect
            options={perUnitChargeOptions}
            onChange={handleChargeTypeOnChange}
            value={perUnitChargeOptions?.find((option) => option.value === perUnitCharge.charge_type) || null}
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
          <Button variant="contained" sx={{ display: 'flex', justifyContent: 'end', float: 'right', mt:2, mb:40 }} onClick={handleSave}>{isSaving && <SaveSpinner />}{modalState?.editId ? "Update" : "Create"}</Button>
        </Box>
      </RitzModal>
    </>
    
  )
}

export default TransportPerUnitCharges