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

interface TransportFixedChargeMetaData {
  costing_types?: any[];
  trade_types?: any[];
  transport_types?: any[];
  ports?: any[];
  fixed_charge_names?: any[];
  currencies?: any[];
}

const TransportFixedCharges = () => {

  const [fixedCharge, setFixedCharge] = useState({ costing_type: '', charge: null, charge_currency:null, trade_type: '', transport_type: null, port: null, charge_type: null});
  const [fixedChargesList, setFixedChargesList] = useState([]);
  const [transportFixedChargeMetaData,setTransportFixedChargeMetaData] = useState<TransportFixedChargeMetaData>({})
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
          size='small' color='primary' onClick={() => modalOpen(true, "Edit Transport Fixed Charge", props.row.original.id)}>
          <EditIcon fontSize='inherit' />
        </IconButton>
      ),
      meta: {
        align: 'center',
        width: 100
      }
    }
    ];

  const fixedChargeOptions = transportFixedChargeMetaData?.fixed_charge_names?.map((item) => ({
  label: item.name,
  value: item.id,
  ...item,
  }));

  const getTransportFixedCharges = () => {
      setIsLoading(true);
      api.get(TransportUrls.transportFixedChargeList()).then(resp => {
        const resdata = resp?.data || [];
        setFixedChargesList([...resdata]);
      }).catch(error => {
        toast.error(getDefaultError(error?.response?.status));
      }).finally(() => setIsLoading(false));
  };

  const getTransportFixedChargeDetails = () => {
      setIsLoading(true);
      api.get(TransportUrls.transportFixedChargeDetail(modalState?.editId)).then(resp => {
        const resdata = resp?.data || [];
        setFixedCharge({...resdata});
      }).catch(error => {
        toast.error(getDefaultError(error?.response?.status));
      }).finally(() => setIsLoading(false));
  };

  const getTransportFixedChargeMetaData = () => {
      setIsLoading(true);
      api.get(TransportUrls.transportFixedChargeMetaData()).then(resp => {
        const resdata = resp?.data || [];
        setTransportFixedChargeMetaData({...resdata});
      }).catch(error => {
        toast.error(getDefaultError(error?.response?.status));
      }).finally(() => setIsLoading(false));
  };

  const handleSave = () => {
    setIsSaving(true);

    const request = {
      method: !modalState?.editId ? 'post' : 'put',
      url:  !modalState?.editId ? TransportUrls.transportFixedChargeCreate() : TransportUrls.transportFixedChargeUpdate(modalState?.editId),
      data: fixedCharge
    }

    api(request).then(() => {
      setModalState(prev => ({...prev, open: false}));
      getTransportFixedCharges();
      setFixedCharge({
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
      const existingOption = fixedChargeOptions?.find(
        (option: any) => option.label === selectedOption.label
      );
  
      if (existingOption) {
        setFixedCharge({ ...fixedCharge, charge_type: selectedOption.id });
      } else {
        api.post(TransportUrls.transportFixedChargeNameCreate(), { name: selectedOption.label, active: true })
          .then((response) => {
            const createdNameId = response?.data.id || {}
            setFixedCharge({ ...fixedCharge, charge_type: createdNameId });
            getTransportFixedChargeMetaData()
          })
          .catch((error) => {
          })
      }
    }
  
  const modalClose = () => {
    setFixedCharge({
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
    getTransportFixedCharges();
    getTransportFixedChargeMetaData();
  }, []);

  useEffect(() => {
    if (modalState?.editId > 0) {
      getTransportFixedChargeDetails();
    }
  }, [modalState?.editId]);

  return (
    <>
      <Typography variant='h1' >Transport Fixed Charges</Typography>
      <Button
        variant="contained"
        color="primary"
        onClick={() => {modalOpen(true, "Create Transport Fixed Charge", null)}}
        >
          Add Charge
      </Button>

      <RitzTable 
        data={fixedChargesList || []} 
        columns={columns} 
      />

      <RitzModal open={modalState?.open} onClose={modalClose} title={modalState?.modal_status}  fullWidth maxWidth='md'>
        <Box sx={{ marginBottom: '20px' , paddingBottom: '20px' }}>

          <Typography component="legend" sx={{ mb: 1, mt:1 }}>Costing Type</Typography>
          <Select
            value={fixedCharge.costing_type || ''}
            onChange={(event: any) => {
              setFixedCharge({ ...fixedCharge, costing_type: event.target.value, });
            }}
            fullWidth
          >
            {transportFixedChargeMetaData.costing_types?.map((item: any) => (
              <MenuItem key={item.costing_type} value={item.costing_type}>
                {item.display}
              </MenuItem>
            ))}
          </Select>

          <Typography component="legend" sx={{ mb: 1, mt:1}}>Charge</Typography>
          <TextField
              value={fixedCharge?.charge || ''}
              autoComplete="new-username"
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                const input = event.target.value;
                if (/^\d*\.?\d*$/.test(input)) {
                  setFixedCharge({ ...fixedCharge, charge: input });
                }
              }}
              fullWidth
              type="text"
          />

          <Typography component="legend" sx={{ mb: 1, mt:1}}>Charge Unit</Typography>
          <Select
            value={fixedCharge.charge_currency || ''}
            onChange={(event: any) => {
              setFixedCharge({ ...fixedCharge, charge_currency: event.target.value, });
            }}
            fullWidth
          >
            {transportFixedChargeMetaData.currencies?.map((item: any) => (
              <MenuItem key={item.currency} value={item.currency}>
                {item.display}
              </MenuItem>
            ))}
          </Select>

          <Typography component="legend" sx={{ mb: 1, mt:1 }}>Trade Type</Typography>
          <Select
            value={fixedCharge.trade_type || ''}
            onChange={(event: any) => {
              setFixedCharge({ ...fixedCharge, trade_type: event.target.value, });
            }}
            fullWidth
          >
            {transportFixedChargeMetaData.trade_types?.map((item: any) => (
              <MenuItem key={item.trade_type} value={item.trade_type}>
                {item.display}
              </MenuItem>
            ))}
          </Select>

          <Typography component="legend" sx={{ mb: 1, mt:1 }}>Transport Type</Typography>
          <Select
            value={fixedCharge.transport_type || ''}
            onChange={(event: any) => {
              setFixedCharge({ ...fixedCharge, transport_type: event.target.value, });
            }}
            fullWidth
          >
            {transportFixedChargeMetaData.transport_types?.map((item: any) => (
              <MenuItem key={item.id} value={item.id}>
                {item.name}
              </MenuItem>
            ))}
          </Select>

          <Typography component="legend" sx={{ mb: 1, mt:1}}>Port</Typography>
          <Select
            value={fixedCharge.port || ''}
            onChange={(event: any) => {
              setFixedCharge({ ...fixedCharge, port: event.target.value, });
            }}
            fullWidth
          >
            {transportFixedChargeMetaData.ports?.map((item: any) => (
              <MenuItem key={item.id} value={item.id}>
                {item.name}
              </MenuItem>
            ))}
          </Select>

          <Typography component="legend" sx={{ mb: 1, mt:1 }}>Charge Type</Typography>
          <CreatableSelect
            options={fixedChargeOptions}
            onChange={handleChargeTypeOnChange}
            value={fixedChargeOptions?.find((option) => option.value === fixedCharge.charge_type) || null}
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

export default TransportFixedCharges