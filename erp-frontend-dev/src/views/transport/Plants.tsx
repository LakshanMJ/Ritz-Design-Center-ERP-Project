
import api from '@/services/api'
import toast from 'react-hot-toast'
import EditIcon from '@mui/icons-material/Edit';
import { ColumnDef } from '@tanstack/react-table'
import React, { useEffect, useState } from 'react'
import RitzModal from '@/components/Ritz/RitzModal'
import RitzTable from '@/components/Ritz/RitzTable'
import { getDefaultError } from '@/helpers/Utilities'
import DefaultLoader from '@/components/DefaultLoader'
import { Typography, Button, IconButton } from '@mui/material'
import RitzGenericForm from '@/components/Ritz/RitzGenericForm'
import * as TransportUrls from '../../helpers/constants/rest_urls/TransportUrls';

const Plant = () => {

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'name',
      header: 'Plant',
    },
    {
      accessorKey: 'id',
      header: 'Action',
      enableSorting: false,
      enableColumnFilter: false,
      enableGlobalFilter: false,
      cell: props => (
        <IconButton size='small' color='primary' onClick={() => modalOpen(true, 'Edit Plant', props.getValue())}>
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
  const [portTypes, setPortTypes] = useState([]);
  const [plants, setPlants] = useState<any>([]);
  const [errors, setErrors] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [editPlantId, setEditPlantId] = useState(0);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [locationCountries, setLocationCountries] = useState<any>([]);
  const [plant, setPlant] = useState({
    id: 0,
    name: '',
    address_line_1: '',
    address_line_2: '', 
    city: '',
    country :0,
    port_type: '',
    email: '',
    phone_number: '',
    contact_person : '',
    billing_location_name : '',
    billing_address_line_1 : '',
    billing_address_line_2 : '',
    billing_address_city : '',
    billing_address_country : 0,
    billing_phone_number : '',
    billing_email : '',
    value_added_tax_registration_number : '',
    simplified_value_added_tax_registration_number : '',
    board_of_investment_registration_number : '',
  });

  const handleChange = (event: any) => {
    setPlant({
      ...plant,
      [event?.target?.name]: event?.target?.value,
    });
  };

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = event.target;
    setPlant(prev => ({ ...prev, [name]: value }));
  };

  const formFields: any[] = [
    { label: 'Name', name: 'name', value: plant?.name || '', type: 'text', onChange: handleChange },
    { label: 'Address Line 1', name: 'address_line_1', value: plant?.address_line_1 || 0, type: 'text', onChange: handleChange },
    { label: 'Address Line 2', name: 'address_line_2', value: plant?.address_line_2 || '', type: 'text', onChange: handleChange },
    { label: 'City', name: 'city', value: plant?.city, type: 'text', onChange: handleChange },
    { label: 'Country', name: 'country', value: plant?.country || '', type: 'select', optionText: 'name', optionValue: 'id', options: locationCountries, onChange: handleSelectChange },
    { label: 'Port Type', name: 'port_type', value: plant?.port_type || '', type: 'select', optionText: 'name', optionValue: 'id', options: portTypes, onChange: handleSelectChange },
    { label: 'Email', name: 'email', value: plant?.email || '', type: 'text', onChange: handleChange },
    { label: 'Phone Number', name: 'phone_number', value: plant?.phone_number  || '', type: 'text', onChange: handleChange },
    { label: 'Contact Person', name: 'contact_person', value: plant?.contact_person  || '', type: 'text', onChange: handleChange },
    { label: 'Billing Location Name ', name: 'billing_location_name', value: plant?.billing_location_name  || '', type: 'text', onChange: handleChange },
    { label: 'Billing Address Line 1', name: 'billing_address_line_1', value: plant?.billing_address_line_1  || '', type: 'text', onChange: handleChange },
    { label: 'Billing Address Line 2', name: 'billing_address_line_2', value: plant?.billing_address_line_2  || '', type: 'text', onChange: handleChange },
    { label: 'City', name: 'billing_address_city', value: plant?.billing_address_city, type: 'text', onChange: handleChange },
    { label: 'Country', name: 'billing_address_country', value: plant?.billing_address_country || '', type: 'select', optionText: 'name', optionValue: 'id', options: locationCountries, onChange: handleSelectChange },
    { label: 'Billing Phone Number  ', name: 'billing_phone_number', value: plant?.billing_phone_number  || '', type: 'text', onChange: handleChange },
    { label: 'Billing Email', name: 'billing_email', value: plant?.billing_email  || '', type: 'text', onChange: handleChange },
    { label: 'VAT Reg. Number', name: 'value_added_tax_registration_number', value: plant?.value_added_tax_registration_number  || '', type: 'text', onChange: handleChange },
    { label: 'Simplified VAT Reg. Number', name: 'simplified_value_added_tax_registration_number', value: plant?.simplified_value_added_tax_registration_number   || '', type: 'text', onChange: handleChange },
    { label: 'BOI Reg. Number', name: 'board_of_investment_registration_number', value: plant?. board_of_investment_registration_number || '', type: 'text', onChange: handleChange },
  ];

  const getPortTypes = () => {
    setIsLoading(true);
    api.get(TransportUrls.portsURL()).then(resp => {
      const resdata = resp?.data || [];
      setPortTypes([...resdata]);
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => setIsLoading(false));
  };

  const getPlants = () => {
    setIsLoading(true);
    api.get(TransportUrls.plantsURL()).then(resp => {
      const resdata = resp?.data || [];
      setPlants([...resdata]);
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
  
  const handleSave = () => {
    setIsSaving(true);

    const request = {
      method: editPlantId === 0 ? 'post' : 'put',
      url: editPlantId === 0 ? TransportUrls.createPlantURL() : TransportUrls.updatePlantURL(editPlantId),
      data: plant
    }

    api(request).then(() => {
      setOpen(false);
      getPlants();
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
      if (error?.response?.data) {
        setErrors(error.response.data);
      }
    }).finally(() => setIsSaving(false));
  }

  const modalOpen = (isOpen: any, title: string, plantId: any) => {
    setTitle(title);
    setEditPlantId(plantId);
    setOpen(isOpen);

    if (plantId === 0) {
      setPlant({
        id: 0,
        name: '',
        address_line_1: '',
        address_line_2: '', 
        city: '',
        country :0,
        port_type: '',
        email: '',
        phone_number: '',
        contact_person : '',
        billing_location_name : '',
        billing_address_line_1 : '',
        billing_address_line_2 : '',
        billing_address_city : '',
        billing_address_country : 0,
        billing_phone_number : '',
        billing_email : '',
        value_added_tax_registration_number : '',
        simplified_value_added_tax_registration_number : '',
        board_of_investment_registration_number : '',
      });
    } else {
      setIsModalLoading(true);
      api.get(TransportUrls.plantURL(plantId)).then(resp => {
        const reseditdata = resp?.data || {};
        setPlant({ ...reseditdata });
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
    getPlants();
    getLocationCountries();
    getPortTypes();
  }, []);

  return (
    <>
      <Typography variant='h1'>Plant List</Typography>
      {isLoading ? <DefaultLoader /> : <>
        <Button variant='contained' onClick={() => { modalOpen(true, 'Create New Plant', 0) }}>Add Plant</Button>
        <RitzTable
          data={plants}
          columns={columns}
        />
      </>}

      <RitzModal open={open} onClose={modalClose} title={title} isLoading={isModalLoading}>
        <RitzGenericForm fields={formFields} onSumbit={handleSave} submitId={editPlantId} errors={errors} isSaving={isSaving} />
      </RitzModal>
    </>
  )
}

export default Plant