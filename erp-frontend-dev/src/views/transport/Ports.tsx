import DefaultLoader from '@/components/DefaultLoader'
import RitzGenericForm from '@/components/Ritz/RitzGenericForm'
import RitzModal from '@/components/Ritz/RitzModal'
import RitzTable from '@/components/Ritz/RitzTable'
import { Typography, Button, IconButton } from '@mui/material'
import * as TransportUrls from '../../helpers/constants/rest_urls/TransportUrls';
import { ColumnDef } from '@tanstack/react-table'
import { title } from 'process'
import EditIcon from '@mui/icons-material/Edit';
import React, { useEffect, useState } from 'react'
import api from '@/services/api'
import { getDefaultError } from '@/helpers/Utilities'
import toast from 'react-hot-toast'

const Ports = () => {

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'name',
      header: 'Port',
    },
    {
      accessorKey: 'port_type',
      header: 'Port Type',
      cell: props => (
        <Typography>{props.row.original.transport_mode === 'sea' ? "Sea" : "Air"}</Typography>
      )
    },
    {
      accessorKey: '',
      header: 'Address',
      cell: props => (
        <>
          <Typography>{props.row.original.address_line_1}, {props.row.original.address_line_2}</Typography>
          <Typography>{props.row.original.city}</Typography>
          <Typography>{props.row.original.country_name}</Typography> 
        </>
       
      ),
    },
    {
      accessorKey: 'id',
      header: 'Action',
      enableSorting: false,
      enableColumnFilter: false,
      enableGlobalFilter: false,
      cell: props => (
        <IconButton size='small' color='primary' onClick={() => modalOpen(true, 'Edit Port', props.getValue())}>
          <EditIcon fontSize='inherit' />
        </IconButton>
      ),
      meta: {
        align: 'center',
        width: 100
      }
    }
  ];

  const [isLoading, setIsLoading] = useState(true);
  const [ports, setPorts] = useState<any>([]);
  const [title, setTitle] = useState<string>();
  const [editPortId, setEditPortId] = useState(0);
  const [locationCountries, setLocationCountries] = useState<any>([]);
  const [port, setPort] = useState({ id: 0, name: '', port_type: '', address_line_1: '', address_line_2: '', city: '', country: 0 });
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [PortTypeMetadata, setPortTypeMetadata] = useState<any>([]);
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (event: any) => {
    setPort({
      ...port,
      [event?.target?.name]: event?.target?.value,
    });
  };

  const handleSelectChange = (event: any) => {
    const { name, value } = event.target;
    setPort({ ...port, [name]: value });
  };

  const formFields: any[] = [
    { label: 'Name', name: 'name', value: port?.name || '', type: 'text', onChange: handleChange },
    { label: 'Port Type', name: 'port_type', value: port?.port_type || '', type: 'select', optionText: 'name', optionValue: 'id', options: PortTypeMetadata, onChange: handleSelectChange },
    { label: 'Address Line 1', name: 'address_line_1', value: port?.address_line_1 || 0, type: 'text', onChange: handleChange },
    { label: 'Address Line 2', name: 'address_line_2', value: port?.address_line_2 || '', type: 'text', onChange: handleChange },
    { label: 'City', name: 'city', value: port?.city, type: 'text', onChange: handleChange },
    { label: 'Country', name: 'country', value: port?.country || '', type: 'select', optionText: 'name', optionValue: 'id', options: locationCountries, onChange: handleSelectChange },
  ];

  const getPorts = () => {
    setIsLoading(true);
    api.get(TransportUrls.portsURL()).then(resp => {
      const resdata = resp?.data || [];
      setPorts([...resdata]);
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => setIsLoading(false));
  };

  const getLocationCountries = () => {
    setIsLoading(true);
    api.get(TransportUrls.locationCountriesURL()).then(resp => {
      const resdata = resp?.data || [];
      setLocationCountries([...resdata]);
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => setIsLoading(false));
  };

  const getPortTypeMetaData = () => {
    setIsLoading(true);
    api.get(TransportUrls.exWorkChargesMetaDataURL()).then((resp) => {
      const resdata = resp?.data.transport_modes || {};
      console.log(resdata)
      setPortTypeMetadata(resdata);
    }).catch((error) => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => setIsLoading(false));
  };

  const handleSave = () => {
    setIsSaving(true);

    const request = {
      method: editPortId === 0 ? 'post' : 'put',
      url: editPortId === 0 ? TransportUrls.createPortURL() : TransportUrls.updatePortURL(editPortId),
      data: port
    }

    api(request).then(() => {
      setOpen(false);
      getPorts();
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
      if (error?.response?.data) {
        setErrors(error.response.data);
      }
    }).finally(() => setIsSaving(false));
  }

  const modalOpen = (isOpen: any, title: string, portId: any) => {
    setTitle(title);
    setEditPortId(portId);
    setOpen(isOpen);

    if (portId === 0) {
      setPort({ id: 0, name: '', port_type: '', address_line_1: '', address_line_2: '', city: '', country: 0 });
    } else {
      setIsModalLoading(true);
      api.get(TransportUrls.portURL(portId)).then(resp => {
        const reseditdata = resp?.data || {};
        setPort({ ...reseditdata });
      }).catch(error => {
        toast.error(getDefaultError(error?.response?.status));
      }).finally(() => setIsModalLoading(false));
    }
  }

  const modalClose = () => {
    setOpen(false);
    setErrors({});
  };

  useEffect(() => {
    getPorts();
    getLocationCountries();
    getPortTypeMetaData()
  }, []);

  return (
    <>
      <Typography variant='h1'>Port List</Typography>
      {isLoading ? <DefaultLoader /> : <>
        <Button variant='contained' onClick={() => { modalOpen(true, 'Create New Port', 0) }}>Add Port</Button>
        <RitzTable
          data={ports}
          columns={columns}
        />
      </>}

      <RitzModal open={open} onClose={modalClose} title={title} isLoading={isModalLoading}>
        <RitzGenericForm fields={formFields} onSumbit={handleSave} submitId={editPortId} errors={errors} isSaving={isSaving} />
      </RitzModal>
    </>
  )
}

export default Ports