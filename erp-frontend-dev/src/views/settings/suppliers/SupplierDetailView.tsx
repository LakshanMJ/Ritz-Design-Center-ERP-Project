import api from '@/services/api';
import React, { useEffect, useState } from 'react'
import * as RestUrls from '../../../helpers/constants/RestUrls';
import * as SupplierUrls from '../../../helpers/constants/rest_urls/SupplierUrls';
import { getDefaultError, hasRole } from '@/helpers/Utilities';
import toast from 'react-hot-toast';
import DefaultLoader from '@/components/DefaultLoader';
import { Breadcrumbs, Typography, Link, Card, Grid, Divider, Button, IconButton, Box, Checkbox } from '@mui/material';
import NextLink from 'next/link';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { TabContext } from '@mui/lab';
import router from 'next/router';
import { RitzTabPanel, RitzTabs } from '@/components/Ritz/RitzTabs';
import RitzTable from '@/components/Ritz/RitzTable';
import EditIcon from '@mui/icons-material/Edit';
import { ColumnDef } from '@tanstack/react-table';
import { ACTIVE_STATUS, INACTIVE_STATUS } from '@/helpers/constants/Constants';
import RitzGenericForm from '@/components/Ritz/RitzGenericForm';
import RitzModal from '@/components/Ritz/RitzModal';
import DeleteIcon from '@mui/icons-material/Delete';
import RitzCheckBox from '@/components/Ritz/RitzCheckBox';
import SaveSpinner from '@/components/SaveSpinner';
import { DeleteModal } from '../DeleteModal';
import dayjs from "dayjs";
import FreightForwarderWarehouse from '@/views/transport/freight_forwarder_tabs/FreightForwarderWareHouse';
import FreightForwarderPorts from '@/views/transport/freight_forwarder_tabs/FreightForwarderPorts';
import FreightForwarderCutofDates from '@/views/transport/freight_forwarder_tabs/FreightForwarderCutofDates';


const SupplierDetailView = ({supplierId}: any) => {


  const contactPeopleColumns: ColumnDef<any>[] = [
  {
      accessorKey: 'name',
      header: 'Contact Person Name',
  },
  {
      accessorKey: 'email',
      header: 'Email',
  },
  {
      accessorKey: 'phone_number',
      header: 'Phone Number',
  },
  {
    accessorKey: 'active',
    header: 'Status',
    accessorFn: (row: any) => row['active'] ? ACTIVE_STATUS : INACTIVE_STATUS
  },
  {
    accessorKey: 'primary_contact',
    header: 'Primary Contact Number',
    accessorFn: (row: any) => row['primary_contact'] ? 'True' : 'False'
},
  {
      accessorKey: "id",
      header: 'Action',
      enableSorting: false,
      enableColumnFilter: false,
      enableGlobalFilter: false,
      cell: props => (
          <IconButton size='small' color='primary' onClick={() => modalOpen(true, "Edit Contact Person", props.getValue(), 'contact_person')}>
              <EditIcon fontSize='inherit' />
          </IconButton>
      ),
      meta: {
          align: 'center',
          width: 100
      }
  }
  ]

  const customersColumns: ColumnDef<any>[] = [
  {
      accessorKey: 'customer_name',
      header: 'Customer Name',
  },
  {
    accessorKey: 'brand_name',
    header: 'Brand Name',
  },
  {
    accessorKey: 'active',
    header: 'Status',
  },
  {
    accessorKey: "id",
    header: 'Action',
    enableSorting: false,
    enableColumnFilter: false,
    enableGlobalFilter: false,
    cell: props => (
        <IconButton size='small' color='error' onClick={() => {handleOpenDeleteModal(props.row.original.id, props.row.original); setDeleteModalOpen(true)}}>
            <DeleteIcon fontSize='inherit' />
        </IconButton>
    ),
    meta: {
        align: 'center',
        width: 100
    }
  }
  ]



  const materialsColumns: ColumnDef<any>[] = [
    {
        accessorKey: 'material',
        header: 'Material',
    },
    {
      accessorKey: 'category',
      header: 'Category',
    },
    {
      accessorKey: 'consumption_measurement_unit',
      header: 'Consumtion Measurement Unit',
    },
    {
      accessorKey: 'estimated_consumption_ratio_units',
      header: 'Estimate Consumtion Ratio Units',
    },
    {
      accessorKey: 'active',
      header: 'Status',
      accessorFn: (row: any) => row['active'] ? ACTIVE_STATUS : INACTIVE_STATUS
    },
    {
      accessorKey: "id",
      header: 'Action',
      enableSorting: false,
      enableColumnFilter: false,
      enableGlobalFilter: false,
      cell: props => (
          <IconButton size='small' color='error' onClick={() => {handleOpenDeleteModal(props.row.original.id, props.row.original); setDeleteModalOpen(true)}}>
              <DeleteIcon fontSize='inherit' />
          </IconButton>
      ),
      meta: {
          align: 'center',
          width: 100
      }
    }
    ]


  const locationsColumns: ColumnDef<any>[] = [
    {
        accessorKey: 'address_line_1',
        header: 'Address Line 1',
    },
    {
        accessorKey: 'address_line_2',
        header: 'Address Line 2',
    },
    {
        accessorKey: 'city',
        header: 'City',
    },
    {
      accessorKey: 'country_name',
      header: 'Country',
    },
    {
      accessorKey: 'active',
      header: 'Status',
      accessorFn: (row: any) => row['active'] ? ACTIVE_STATUS : INACTIVE_STATUS
    },
    {
        accessorKey: "id",
        header: 'Action',
        enableSorting: false,
        enableColumnFilter: false,
        enableGlobalFilter: false,
        cell: props => (
            <IconButton size='small' color='primary' onClick={() => modalOpen(true, "Edit Supplier Location", props.getValue(), 'location')}>
                <EditIcon fontSize='inherit' />
            </IconButton>
        ),
        meta: {
            align: 'center',
            width: 100
        }
    }
    ]

  const [supplier, setSupplier] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [editId, setEditId] = useState(0);
  const [tabState, setTabState] = useState('1');  
  const [open, setOpen] = useState(false);
  const [tabType, setTabType] = useState('');
  const [title, setTitle] = useState<string>();
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState([]);
  const [selectedMaterialIds, setSelectedMaterialIds] = useState([]);
  const [errors, setErrors] = useState<any>({});
  const [customers, setCustomers] = useState<any>([]);
  const [countries, setCountries] = useState<any>([]);
  const [materials, setMaterials] = useState<any>([]);
  const [metaData, setMataData] = useState<any>({});
  const [deleteCustomerId, setDeleteCustomerId] = useState(0)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [supplierContactPersonDetails, setSupplierContactPersonDetails] = useState({ id: 0, name: "", email: "", phone_number: "", active: true, primary_contact: false,  supplier: supplierId });
  const [supplierLocationDetails, setSupplierLocationDetails] = useState({ id: 0, address_line_1: "", address_line_2: "", city: "", country: "", active: true,  supplier: supplierId });

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(0);
  const [deleteData, setDeleteData] = useState({ type: 'customer', data: {}});



  const rawMaterialOption = [
    {
      id: 1,
      name: 'Raw Material'
    }
  ]

  const serviceOption = [
    {
      id: 1,
      name: 'Service'
    }
  ]




  const getSupplierDetails = () => {
    setIsLoading(true);
    api.get(RestUrls.supplierURL(supplierId)).then(resp => {
      const reseditdata = resp?.data || {};
      setSupplier({ ...reseditdata });
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => setIsLoading(false));
  };



  const getUnassignedCustomerBrands = () => {
    api.get(SupplierUrls.unassignedCustomerBrandListUrl(supplierId)).then(resp => {
        const respData = resp?.data || [];
        respData.sort((a: any, b: any) => b.id - a.id);
        setCustomers([...respData]);
    }).catch(error => {
        toast.error(getDefaultError(error?.response?.status));
    })
  };

  const getSupplierLocationCountries = () => {
    api.get(SupplierUrls.supplierLocationCountriesUrl()).then(resp => {
        const respData = resp?.data || [];
        respData.sort((a: any, b: any) => b.id - a.id);
        setCountries([...respData]);
    }).catch(error => {
        toast.error(getDefaultError(error?.response?.status));
    })
  };

  const getUnassignedMaterials = () => {
    api.get(SupplierUrls.supplierUnassignedMaterialUrl(supplierId)).then(resp => {
        const respData = resp?.data || [];
        respData.sort((a: any, b: any) => b.id - a.id);
        setMaterials([...respData]);
    }).catch(error => {
        toast.error(getDefaultError(error?.response?.status));
    })
  };

  const getSupplierMetaData = () => {
    api.get(SupplierUrls.supplierMetaDataUrl()).then(resp => {
        const respData = resp?.data || [];
        setMataData({...respData});
    }).catch(error => {
        toast.error(getDefaultError(error?.response?.status));
    })
  };

  const modalOpen = (isOpen: any, title: string, selectedId: any, type: any) => {
    try {
      setIsModalLoading(true);
      setTitle(title);
      setEditId(selectedId);
      setOpen(isOpen);
      setTabType(type)
  
      if(type == 'contact_person'){
        if (selectedId === 0) {
          setSupplierContactPersonDetails({ id: 0, name: "", email: "", phone_number: "", active: true, primary_contact: false,  supplier: supplierId });
        } else {
            api.get(SupplierUrls.supplierContactPersonUrl(selectedId)).then(resp => {
                const reseditdata = resp?.data || {};
                setSupplierContactPersonDetails({ ...reseditdata });
            }).catch(error => {
                toast.error(getDefaultError(error?.response?.status));
            })
        }
      }else if (type == 'location'){
        if (selectedId === 0) {
          setSupplierLocationDetails({ id: 0, address_line_1: "", address_line_2: "", city: "", country: "", active: true,  supplier: supplierId  });
        } else {
            api.get(SupplierUrls.supplierLocationUrl(selectedId)).then(resp => {
                const reseditdata = resp?.data || {};
                setSupplierLocationDetails({ ...reseditdata });
            }).catch(error => {
                toast.error(getDefaultError(error?.response?.status));
            })
        }
      }else if (type == 'material'){
        getUnassignedMaterials()
      }
    } finally {
      setIsModalLoading(false);
    }
  };

  const modalClose = () => {
    setOpen(false);
    setErrors({});
  };

  const handleOpenDeleteModal = (id: any, data: any) => {
    setDeleteId(id);
    data.supplierId = supplierId;
    setDeleteData({ type: data.customer_name != undefined ? 'customer' : 'material', data });
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeleteData({ type: '', data: {} });
  };

  const handleRefreshData = () => {
    getSupplierDetails()
  };

  const handleChangeTabs = (event: string) => {
    const url = {
      pathname: router.pathname,
      query: {...router.query, tab: event}
    }
    router.replace(url, undefined, { shallow: true });
  }

  const handleContactPersonChange = (event: any) => {
    setSupplierContactPersonDetails({
        ...supplierContactPersonDetails,
        [event?.target?.name]: event?.target?.value,
    });
  };

  const handleLocationChange = (event: any) => {
    setSupplierLocationDetails({
        ...supplierLocationDetails,
        [event?.target?.name]: event?.target?.value,
    });
  };
  
  const handleContactPersonChangeChecked = (event: any) => {
    setSupplierContactPersonDetails({
        ...supplierContactPersonDetails,
        [event?.target?.name]: event?.target?.checked,
    });
  };

  const handleLocationChangeChecked = (event: any) => {
    setSupplierLocationDetails({
        ...supplierLocationDetails,
        [event?.target?.name]: event?.target?.checked,
    });
  };

  const handleLocationSelectChange = (event: any) => {
    setSupplierLocationDetails({ ...supplierLocationDetails, country: event.target.value });
  };
  
  const handleCustomerSelectChange = (event: any) => {
    const { value, checked } = event.target;
    if (checked) {
      setSelectedCustomerIds([
          ...selectedCustomerIds,
          { id: value?.toString() }
      ]);
  } else {
      let updated = [...selectedCustomerIds].filter((i: any) => i.id?.toString() !== value?.toString());
      setSelectedCustomerIds(updated);
  }
  };

  const handleMaterialSelectChange = (event: any) => {
    const { value, checked } = event.target;
    if (checked) {
      setSelectedMaterialIds([
          ...selectedMaterialIds,
          { id: value?.toString() }
      ]);
  } else {
      let updated = [...selectedMaterialIds].filter((i: any) => i.id?.toString() !== value?.toString());
      setSelectedMaterialIds(updated);
  }
  }

  const handleChange = (event: any) => {
    setSupplier({
        ...supplier,
        [event?.target?.name]: event?.target?.value,
    });
  };  

  const handleChangeChacked = (event: any) => {
    setSupplier({
        ...supplier,
        [event?.target?.name]: event?.target?.checked,
    });
  };




  const handleSelectChange = (event: any) => {
    setSupplier({ ...supplier, [event?.target?.name]: event.target.value });
  };
  0
  const handleSaveContactPerson = () => {
    setErrors({});
    setIsSaving(true);

    const request = {
      method: editId === 0 ? 'post' : 'put',
      url: editId === 0 ? SupplierUrls.createSupplierContactPersonUrl() : SupplierUrls.updateSupplierContactPersonUrl(editId),
      data: supplierContactPersonDetails
    }

    api(request).then(() => {
      setOpen(false);
      getSupplierDetails();
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
      if (error?.response?.data) {
          setErrors(error.response.data);
      }
    }).finally(() => setIsSaving(false));
  }

  const handleSave = () => {
    setErrors({});
    setIsSaving(true);

    const request = {
      method: editId === 0 ? 'post' : 'put',
      url: editId === 0 ? SupplierUrls.createSupplierLocationUrl() : SupplierUrls.updateSupplierLocationsUrl(editId),
      data: supplierLocationDetails
    }

    api(request).then(() => {
      setOpen(false);
      getSupplierDetails();
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
      if (error?.response?.data) {
          setErrors(error.response.data);
      }
    }).finally(() => setIsSaving(false));
  }
  
  const handleUpdateSupplierDetails = (type: any) => {
    setIsSaving(true);
    const customerIds = selectedCustomerIds.map(customer => customer.id);
    const assignedCustomerDetails = {
      supplier_id :supplierId,
      customer_brands: customerIds
    }

    const materialIds = selectedMaterialIds.map(material => material.id);
    const assignedMaterialDetails = {
      supplier_id :supplierId,
      supplier_materials: materialIds
    }

    const request = {
      method: 'post',
      url: type === 'customer' ? SupplierUrls.assignSupplierCustomerBrandsUrl() : SupplierUrls.assignsupplierMaterialUrl(),
      data: type === 'customer' ? assignedCustomerDetails : assignedMaterialDetails
  }
  
    api(request).then(() => {
      setOpen(false);
      getSupplierDetails();
      if(type == 'customer'){
        getUnassignedCustomerBrands()
      }else {
      //
      }
  }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
      if (error?.response?.data) {
          setErrors(error.response.data);
      }
  }).finally(() => setIsSaving(false));
    }

  const handleSupplierUpdate  = () => {
    setIsSaving(true);
    api.put(RestUrls.updateSupplierURL(supplierId), supplier).then(() => {
      setOpen(false);
      getSupplierDetails()
  }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
      if (error?.response?.data) {
          setErrors(error.response.data);
      }
  }).finally(() => setIsSaving(false));
  }

  const stateOption = [
    {
      id: 1,
      name: 'Status'
    }
  ]

  const primaryContactOption = [
    {
      id: 1,
      name: 'Set As Primary Contact'
    }
  ]

  const contactPersonFormFields: any[] = [
    { label: 'Contact Person Name', name: 'name', value: supplierContactPersonDetails?.name || '', type: 'text', onChange: handleContactPersonChange },
    { label: 'Email', name: 'email', value: supplierContactPersonDetails?.email || '', type: 'email', onChange: handleContactPersonChange },
    { label: 'Phone Number', name: 'phone_number', value: supplierContactPersonDetails?.phone_number || '', type: 'text', onChange: handleContactPersonChange },
    { label: '', name: 'active', value: supplierContactPersonDetails?.active, type: 'checkbox', optionText: 'name', optionValue: 'id', options: stateOption, onChange: handleContactPersonChangeChecked },
    { label: '', name: 'primary_contact', value: supplierContactPersonDetails?.primary_contact, type: 'checkbox', optionText: 'name', optionValue: 'id', options: primaryContactOption, onChange: handleContactPersonChangeChecked },
  ]

  const locationFormFields: any[] = [
    { label: 'Address Line 1', name: 'address_line_1', value: supplierLocationDetails?.address_line_1 || '', type: 'text', onChange: handleLocationChange },
    { label: 'Address Line 2', name: 'address_line_2', value: supplierLocationDetails?.address_line_2 || '', type: 'email', onChange: handleLocationChange },
    { label: 'City', name: 'city', value: supplierLocationDetails?.city || '', type: 'text', onChange: handleLocationChange },
    { label: 'Country', name: 'country', value: supplierLocationDetails?.country || '', type: 'select', optionText: 'name', optionValue: 'id', options: countries, onChange: handleLocationSelectChange },
    { secondaryLabel: 'Status', name: 'active', value: supplierLocationDetails?.active, type: 'checkbox', optionText: 'name', optionValue: 'id', options: stateOption, onChange: handleLocationChangeChecked },
  ]

  const supplierFormFields: any[] = [
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
    { label: '', name: 'active', value: supplier?.active, type: 'checkbox', optionText: 'name', optionValue: 'id', options: stateOption, onChange: handleChangeChacked },
    { label: '', name: 'raw_material', value: supplier?.raw_material, type: 'checkbox', optionText: 'name', optionValue: 'id', options: rawMaterialOption, onChange: handleChangeChacked },
    { label: '', name: 'service', value: supplier?.service, type: 'checkbox',  optionText: 'name', optionValue: 'id', options: serviceOption, onChange: handleChangeChacked },
]


  const renderTabContent = () => {
    if (tabType === 'contact_person') {
      return <RitzGenericForm fields={contactPersonFormFields} onSumbit={handleSaveContactPerson} submitId={editId} errors={errors} isSaving={isSaving} /> ;
    } else if (tabType === 'customer') {
      return (
        <>
              <Box marginBottom={3}>
               {customers.length > 0 ? 
               (
                <>
                 <RitzCheckBox
                    id={'id'}
                    name={'name'}
                    isRequired={true}
                    options={customers}
                    optionValue={'id'}
                    optionText={'customer_brand_name'}
                    row={true}
                    selectedValues={selectedCustomerIds}
                    selectedOptionValue={'id'}
                    handleOnChange={handleCustomerSelectChange}
                />
                </>            
               ) : (
                <>
                <Typography>All Customers Assigned To This Supplier</Typography>
                </>
               )}
            </Box>
            <Box marginTop={3}>
                <Button onClick={()=> {handleUpdateSupplierDetails('customer')}} variant="contained" style={{ float: 'right' }} disabled={isSaving}>
                    {isSaving && <SaveSpinner />}Assign
                </Button>
            </Box>
        </>
      );
    } else if (tabType === 'location') {
      return <RitzGenericForm fields={locationFormFields} onSumbit={handleSave} submitId={editId} errors={errors} isSaving={isSaving} /> ;
    } else if(tabType === 'material') {
      return (
        <>
          <Box marginBottom={3}>
               {materials.length > 0 ? 
               (
                <>
                 <RitzCheckBox
                    id={'id'}
                    name={'name'}
                    isRequired={true}
                    options={materials}
                    optionValue={'id'}
                    optionText={'material'}
                    row={true}
                    selectedValues={selectedMaterialIds}
                    selectedOptionValue={'id'}
                    handleOnChange={handleMaterialSelectChange}
                />
                </>            
               ) : (
                <>
                <Typography>All Materials Assigned To This Supplier</Typography>
                </>
               )}
            </Box>
            <Box marginTop={3}>
                <Button onClick={()=> {handleUpdateSupplierDetails('material')}} variant="contained" style={{ float: 'right' }} disabled={isSaving}>
                    {isSaving && <SaveSpinner />}Assign
                </Button>
            </Box>
        </>
      )
    }else if(tabType === 'supplier') {
      return <RitzGenericForm fields={supplierFormFields} onSumbit={handleSupplierUpdate} submitId={supplierId} errors={errors} isSaving={isSaving} />
    } else {
      return <Typography>Unrecongised Tab</Typography>;
    }
  };

  useEffect(() => {
    if(supplierId){
      getSupplierDetails()      
      getSupplierLocationCountries()
    }
  }, [supplierId])
  
  useEffect(() => {
    const { tab } = router.query;
    if (tab) {
      setTabState(tab.toString());
    }
  }, [router.query]);

  useEffect(() => {
    if (deleteCustomerId> 0) {
      setDeleteModalOpen(true);
    }
  }, [deleteCustomerId]);

  return (
    <>
    {isLoading ? <DefaultLoader /> : <>

    <Breadcrumbs
          separator={<NavigateNextIcon fontSize="small" />}
          aria-label="breadcrumb"
          sx={{ mb: 1.5 }}
        >
          <Link underline='hover' color='inherit' component={NextLink} href={'/admin/supplier'}>Supplier List</Link>
          <Typography color='text.primary'>Supplier Details</Typography>
        </Breadcrumbs>
        <Typography variant='h1'>{supplier?.name}</Typography>
        <Button variant='contained' sx={{mb:2}} onClick={() => { modalOpen(true, "Edit Supplier", 0, 'supplier'); getSupplierMetaData()}}>Edit</Button>
        <Card variant='outlined' sx={{ mb: 2 }}>
        <Grid container columnSpacing={2} px={2}>
            <Grid item sm={3} xs={3}>
                <dl>
                    <dt>Email</dt>
                    <dd>{supplier.email || '--'}</dd>
                </dl>
               <dl style={{ marginTop: '15px' }}>
                    <dt>Payment Type</dt>
                    <dd>{supplier.payment_term_display || '--'}</dd>
                </dl>
               <dl style={{ marginTop: '15px' }}>
                    <dt>Ex Factory To Inhouse</dt>
                    <dd>{supplier.ex_fty_to_inhouse || '--'}</dd>
                </dl>
               <dl style={{ marginTop: '15px' }}>
                    <dt>Raw Material</dt>
                    <dd>{supplier.raw_material === true ? 'True' : 'False'}</dd>
                </dl>
            </Grid>
            <Divider orientation='vertical' variant='middle' flexItem />
            <Grid item sm={3} xs={3} >
               <dl>
                    <dt>Phone Number</dt>
                    <dd>{supplier.phone_number || '--'}</dd>
                </dl>
               <dl style={{ marginTop: '15px' }}>
                    <dt>Shipping mode</dt>
                    <dd>{supplier.shipping_mode_display || '--'}</dd>
                </dl>
               <dl style={{ marginTop: '15px' }}>
                    <dt>FOB To Inhouse</dt>
                    <dd>{supplier.fob_to_inhouse || '--'}</dd>
                </dl>
                <dl style={{ marginTop: '15px' }}>
                    <dt>Created Date</dt>
                    <dd>{supplier?.created ? dayjs(supplier.created).format('DD/MM/YYYY') : '--'}</dd>
                </dl>
            </Grid>
            <Divider orientation='vertical' variant='middle' flexItem />
            <Grid item sm={2} xs={3}>
               <dl>
                    <dt>Fax</dt>
                    <dd>{supplier.fax || '--'}</dd>
                </dl>
               <dl style={{ marginTop: '15px' }}>
                    <dt>Costing Mode</dt>
                    <dd>{supplier.costing_mode_display || '--'}</dd>
                </dl>
               <dl style={{ marginTop: '15px' }}>
                    <dt>Status</dt>
                    <dd>{supplier.active === true ? ACTIVE_STATUS : INACTIVE_STATUS}</dd>
                </dl>
                <dl style={{ marginTop: '15px' }}>
                    <dt>Updated Date</dt>
                    <dd>{supplier?.updated ? dayjs(supplier.updated).format('DD/MM/YYYY') : '--'}</dd>
                </dl>
            </Grid>
            <Divider orientation='vertical' variant='middle' flexItem />
            <Grid item sm={3} xs={3} >
               <dl>
                    <dt>Location</dt>
                    <dd>{supplier.location_display}</dd>
                </dl>
               <dl style={{ marginTop: '15px' }}>
                    <dt>Remark</dt>
                    <dd>{supplier.remarks || '--'}</dd>
                </dl>
               <dl style={{ marginTop: '15px' }}>
                    <dt>Service</dt>
                    <dd>{supplier.service === true ? 'True' : 'False'}</dd>
                </dl>
            </Grid>
        </Grid>
      </Card>
            <TabContext value={tabState}>
            <Box sx={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
            <RitzTabs 
              tabs={supplier.supplier_type == 'freight_forwarder' 
                ? ['Contacts', 'Customers', 'Locations', 'Materials', 'Ports', 'Cut off Dates' , 'Warehouse'] 
                : ['Contacts', 'Customers', 'Locations', 'Materials']} 
              activeTab={tabState} 
              emitChange={handleChangeTabs} />
            </Box>
            <RitzTabPanel value='1' sx={{ pt: 2 }}>
            <Button variant="outlined" sx={{ my: 3 }} onClick={() => { modalOpen(true, "Create New Contact Person", 0, 'contact_person') }}>Create Contact Person</Button>
            <RitzTable
                title="Supplier's Contact People"
                data={supplier.contact_persons}
                columns={contactPeopleColumns}
                border={false}
                    />
            </RitzTabPanel>
            <RitzTabPanel value='2' sx={{ pt: 2 }}>
            <Button variant="outlined" sx={{ my: 3 }} onClick={() => { modalOpen(true, "Assign New Customer", 0, 'customer'); getUnassignedCustomerBrands(); setSelectedCustomerIds([]) } }>Assign Customers</Button>
            <RitzTable
                title="Supplier's Customers"
                data={supplier.customers}
                columns={customersColumns}
                border={false}
                    />
            </RitzTabPanel>
            <RitzTabPanel value='3' sx={{ pt: 2 }}>
            <Button variant="outlined" sx={{ my: 3 }} onClick={() => { modalOpen(true, "Create New Supplier Location", 0, 'location') }}>Create Location</Button>
            <RitzTable
                title="Supplier's Locations"
                data={supplier.locations}
                columns={locationsColumns}
                border={false}
                    />
            </RitzTabPanel>
            <RitzTabPanel value='4' sx={{ pt: 2 }}>
            <Button variant="outlined" sx={{ my: 3 }} onClick={() => { modalOpen(true, "Assign New Material", 0, 'material'); getUnassignedMaterials(); setSelectedMaterialIds([])  }}>Assign Material</Button>
            <RitzTable
                title="Supplier's Materials"
                data={supplier.materials}
                columns={materialsColumns}
                border={false}
                    />
            </RitzTabPanel>
            <RitzTabPanel value='5' sx={{ pt: 2 }}>
              <FreightForwarderPorts freightForwarderId={supplier?.freight_forwarder_id} />
            </RitzTabPanel>
                <RitzTabPanel value='6' sx={{ pt: 2 }}>
                  <FreightForwarderCutofDates freightForwarderId={supplier?.freight_forwarder_id} />
                </RitzTabPanel>
              <RitzTabPanel value='7' sx={{ pt: 2 }}>
                  <FreightForwarderWarehouse freightForwarderId={supplier?.freight_forwarder_id} />
                </RitzTabPanel>
            </TabContext>
    </>}
    <RitzModal open={open} onClose={modalClose} title={title} isLoading={isModalLoading}>
    {renderTabContent()} 
    </RitzModal>
    {deleteModalOpen && (
      <DeleteModal
      open={isDeleteModalOpen}
      onClose={handleCloseDeleteModal}
      refreshData={handleRefreshData}
      deleteId={deleteId}
      page="supplier" 
      deleteData={deleteData}
      />
      )}
    </>
  )
}

export default SupplierDetailView