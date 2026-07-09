import api from '@/services/api'
import toast from 'react-hot-toast'
import { ColumnDef } from '@tanstack/react-table'
import React, { useEffect, useState } from 'react'
import RitzModal from '@/components/Ritz/RitzModal'
import RitzTable from '@/components/Ritz/RitzTable'
import { getDefaultError } from '@/helpers/Utilities'
import DefaultLoader from '@/components/DefaultLoader'
import { Typography, Button, RadioGroup, FormControlLabel, Radio, Box, Link, ToggleButtonGroup, ToggleButton, Checkbox } from '@mui/material'
import * as TransportUrls from '../../helpers/constants/rest_urls/TransportUrls'
import RitzGenericForm from "@/components/Ritz/RitzGenericForm"
import RitzSearchableSelection from '@/components/Ritz/RitzSearchableSelection'
import * as SupplierUrls from '../../helpers/constants/rest_urls/SupplierUrls'
import { supplierDetailsURL , FreightForwarderDetailsURL} from "@/helpers/constants/FrontEndUrls";
import NextLink from 'next/link';

const FreightForwarder = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFirstModalOpen, setIsFirstModalOpen] = useState(false);
  const [isSecondModalOpen, setIsSecondModalOpen] = useState(false);
  const [isThirdModalOpen, setIsThirdModalOpen] = useState(false); 
  const [selection, setSelection] = useState('');
  const [supplier, setSupplier] = useState({ id: "", name: "", email: "", phone_number: "", location: "", fax: "", payment_term: 0, shipping_mode: 0, costing_mode: 0, ex_fty_to_inhouse: 0, fob_to_inhouse: 0, remarks: '', active: true, raw_material: false, service: false });
  const [metaData, setMataData] = useState<any>({});
  const [errors, setErrors] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [freightForwarderId, setFreightForwarderId] = useState(null); 
  const [countryData, setCountryData] = useState([]);
  const [supplierOptions, setSupplierOptions] = useState([]);
  const [selectedCountryPorts, setSelectedCountryPorts] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedPorts, setSelectedPorts] = useState<any[]>([]);

  console.log(data, "data")

  const fetchFreightForwarderData = () => {
    setLoading(true);

    Promise.all([
      api.get(TransportUrls.freightforwarderListURL()),
      api.get(SupplierUrls.supplierMetaDataUrl()),
      api.get(TransportUrls.countryPortListUrl())
    ])
      .then(([freightResponse, supplierResponse, countryResponse]) => {
        setData(freightResponse.data);
        setMataData({ ...supplierResponse.data });
        setCountryData(countryResponse.data);
      })
      .catch(error => {
        toast.error(getDefaultError(error?.response?.status));
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const fetchSupplierOptions = () => {
    api.get(TransportUrls.SupplierListUrl(''))
      .then(response => {
        setSupplierOptions(response.data);
      })
      .catch(error => {
        toast.error(getDefaultError(error?.response?.status));
      });
  };

  const handleAddForwarderClick = () => {
    setIsFirstModalOpen(true);
  };

  const handleFirstModalClose = () => {
    setIsFirstModalOpen(false);
    setSelection('');
  };

  const handleSecondModalClose = () => {
    setIsSecondModalOpen(false);
    setIsFirstModalOpen(true); 
  };

  const handleThirdModalClose = () => {
    setIsThirdModalOpen(false);
  };

  const handleSelectionChange = (event: any) => {
    setSelection(event.target.value);
    if (event.target.value === 'existing') {
      fetchSupplierOptions();
    }
  };

  const handleNext = () => {
    setIsFirstModalOpen(false);
    setIsSecondModalOpen(true);
  };

  const handleChange = (event: any) => {
    setSupplier({
      ...supplier,
      [event?.target?.name]: event?.target?.value,
    });
  };

  const handleSelectChange = (event: any) => {
    setSupplier({ ...supplier, [event?.target?.name]: event?.target?.value, });
  };

  const handleFormSubmit = () => {
    setIsSaving(true);
    const url = selection === 'existing' ? TransportUrls.freightforwarderListURL() : TransportUrls.createSupplierUrl(selection);
    const payload = selection === 'existing' ? { supplier: supplier.id } : supplier;

    api.post(url, payload)
      .then(response => {
        toast.success('Supplier created successfully');
        setFreightForwarderId(response.data.id);
        setIsSecondModalOpen(false);
        setIsThirdModalOpen(true); 
        fetchFreightForwarderData();
        setSupplier({ id: "", name: "", email: "", phone_number: "", location: "", fax: "", payment_term: 0, shipping_mode: 0, costing_mode: 0, ex_fty_to_inhouse: 0, fob_to_inhouse: 0, remarks: '', active: true, raw_material: false, service: false });
      })
      .catch(error => {
        setErrors(error.response.data || {});
        toast.error(getDefaultError(error?.response?.status));
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  const saveFreightForwarderPorts = () => {
    const payload = {
      ports: selectedPorts.map((port: any) => port.id),
    };
  
    api.post(TransportUrls.createFreightForwarderPortURL(freightForwarderId), payload)
      .then(response => {
        toast.success('Freight forwarder and ports saved successfully');
        fetchFreightForwarderData();
        handleThirdModalClose();
      })
      .catch(error => {
        toast.error(getDefaultError(error?.response?.status));
      });
  };

  const formFields: any[] = [
    { label: 'Supplier Name', name: 'name', value: supplier?.name || '', type: 'text', onChange: handleChange },
    { label: 'Email', name: 'email', value: supplier?.email || '', type: 'email', onChange: handleChange },
    { label: 'Phone Number', name: 'phone_number', value: supplier?.phone_number || '', type: 'text', onChange: handleChange },
    { label: 'Fax', name: 'fax', value: supplier?.fax || '', type: 'text', onChange: handleChange },
    { label: 'Location', name: 'location', value: supplier?.location || '', type: 'select', optionText: 'name', optionValue: 'id', options: metaData.location_choices, onChange: handleSelectChange },
    { label: 'Payment Term', name: 'payment_term', value: supplier?.payment_term || '', type: 'select', optionText: 'name', optionValue: 'id', options: metaData.payment_method_types, onChange: handleSelectChange },
    { label: 'Shipping Mode', name: 'shipping_mode', value: supplier?.shipping_mode || '', type: 'select', optionText: 'name', optionValue: 'id', options: metaData.shipping_modes, onChange: handleSelectChange },
    { label: 'Costing Mode', name: 'costing_mode', value: supplier?.costing_mode || '', type: 'select', optionText: 'name', optionValue: 'id', options: metaData.costing_modes, onChange: handleSelectChange },
    { label: 'Ex-Factory To Inhouse', name: 'ex_fty_to_inhouse', value: supplier?.ex_fty_to_inhouse || '', type: 'number', onChange: handleChange },
    { label: 'FOB Inhouse', name: 'fob_to_inhouse', value: supplier?.fob_to_inhouse || '', type: 'number', onChange: handleChange },
    { label: 'Remark', name: 'remarks', value: supplier?.remarks || '', type: 'text', onChange: handleChange },
  ];

  const columns: ColumnDef<any>[] = [
    { 
      header: 'Forwarder Code' ,
      cell: props => (
        <Link component={NextLink} href={FreightForwarderDetailsURL(props.row.original.supplier_details.id)}>
          {props.row.original.name}
        </Link>
      )
    },
    { 
      accessorKey: 'supplier_details.name', 
      header: 'Supplier Name' 
    },
    { 
      accessorKey: 'supplier_details.email', 
      header: 'Supplier Email' 
    },
  ];

  const handleCountryClick = (country: any) => {
    setSelectedCountry(country.id);
    setSelectedCountryPorts(country.ports);
    setSelectedPorts(country.ports);
  };

  const handlePortSelect = (event: any, port: any) => {
    if (event.target.checked) {
      setSelectedPorts([...selectedPorts, port]);
    } else {
      setSelectedPorts(selectedPorts.filter((p: any) => p.id !== port.id));
    }
  };

  const handleSelectAllPorts = (event: any) => {
    if (event.target.checked) {
      setSelectedPorts(selectedCountryPorts);
    } else {
      setSelectedPorts([]);
    }
  };

  const portColumns: ColumnDef<any>[] = [
    { 
      id: 'select',
      header: ({ }) => (
        <Checkbox
          checked={selectedPorts.length === selectedCountryPorts.length}
          onChange={handleSelectAllPorts}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedPorts.some((port: any) => port.id === row.original.id)}
          onChange={(event) => handlePortSelect(event, row.original)}
        />
      ),
    },
    { 
      header: 'Port Name' ,
      accessorKey: 'name'
    },
    { 
      header: 'City' ,
      accessorKey: 'city'
    },
    { 
      header: 'Port Type' ,
      accessorKey: 'port_type'
    },
  ];

  useEffect(() => {
    fetchFreightForwarderData();
  }, []);

  return (
    <>
      <Typography variant='h1'>Freight Forwarder Management</Typography>
      <Button variant="contained" color="primary" onClick={handleAddForwarderClick}>
        Add Forwarder
      </Button>
      {loading ? (
        <DefaultLoader />
      ) : (
        <RitzTable data={data} columns={columns} />
      )}

      <RitzModal open={isFirstModalOpen} onClose={handleFirstModalClose} title={'Select Supplier Option'}>
        <RadioGroup value={selection} onChange={handleSelectionChange}>
          <FormControlLabel value="existing" control={<Radio />} label="Select Existing Supplier" />
          <FormControlLabel value="new_forwarder" control={<Radio />} label="Create New Supplier" />
        </RadioGroup>

        <Box mt={3}> 
          <Button variant="contained" color="primary" onClick={handleNext} disabled={!selection}>
            Next
          </Button>
        </Box>
      </RitzModal>

      <RitzModal open={isSecondModalOpen} onClose={handleSecondModalClose} title={selection === 'existing' ? 'Select Supplier' : 'Create Supplier'}>
        {selection === 'existing' ? (
          <RitzSearchableSelection
            options={supplierOptions}
            name="supplier_id"
            id="supplier_id"
            labelText="Select Supplier"
            handleOnChange={(value: any) => setSupplier({ ...supplier, id: value })}
            optionValue="id"
            optionText="name"
          />
        ) : (
          <RitzGenericForm fields={formFields} submitId={0} errors={errors} isSaving={isSaving} showSubmitButton={false}/>
        )}
        <Box mt={3} display="flex" justifyContent="space-between">
          <Button variant="contained" onClick={handleSecondModalClose}>
            Previous
          </Button>
          <Button variant="contained" color="primary" onClick={handleFormSubmit} disabled={isSaving}>
            Next
          </Button>
        </Box>
      </RitzModal>

      <RitzModal open={isThirdModalOpen} onClose={handleThirdModalClose} title={'Create Port'}>
        <ToggleButtonGroup value={selectedCountry}>
          {countryData.map((country: any) => (
            <ToggleButton 
              key={country.id} 
              style={{
                height: '4em',
                minWidth: '150px',
                border: '1px solid #E0E0E0',
                borderRadius: '5px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                margin: '5px',
                textAlign: 'center',
                marginBottom: '10px',
              }} 
              value={country.id}
              onClick={() => handleCountryClick(country)}
            >
              {country.name}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        <RitzTable 
          data={selectedCountryPorts} 
          columns={portColumns} 
        />
        <Box mt={3} display="flex" justifyContent="space-between">
          <Button variant="contained" color="primary" onClick={saveFreightForwarderPorts} disabled={isSaving}>
            Save
          </Button>
        </Box>
      </RitzModal>
    </>
  );
};

export default FreightForwarder;