import React, { useEffect, useState } from 'react';
import api from '@/services/api';
import toast from 'react-hot-toast';
import DefaultLoader from '@/components/DefaultLoader';
import { Breadcrumbs, Typography, Link, Card, Grid, Divider, Button, IconButton, Box } from '@mui/material';
import RitzTable from '@/components/Ritz/RitzTable';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RitzGenericForm from '@/components/Ritz/RitzGenericForm';
import RitzModal from '@/components/Ritz/RitzModal';
import { ColumnDef } from '@tanstack/react-table';
import SaveSpinner from '@/components/SaveSpinner';
import { getDefaultError, hasRole } from '@/helpers/Utilities';
import { ADMIN } from '@/helpers/constants/RoleManager';
import * as TransportUrls from '../../../helpers/constants/rest_urls/TransportUrls';
import * as SupplierUrls from '../../../helpers/constants/rest_urls/SupplierUrls';

const FreightForwarderWarehouse = ({ freightForwarderId }: any) => {
  const [isLoading, setIsLoading] = useState(true);
  const [warehouseData, setWarehouseData] = useState<any[]>([]);
  const [editId, setEditId] = useState(0);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState<string>('');
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const [countries, setCountries] = useState<any[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<any>({});
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null);
  const canDelete = hasRole(ADMIN);

  const warehouseColumns: ColumnDef<any>[] = [
    {
      accessorKey: 'name',
      header: 'Warehouse Name',
    },
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
      header: 'Country Name',
    },
    {
      accessorKey: 'contact_person',
      header: 'Contact Person',
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
      accessorKey: "id",
      header: 'Action',
      enableSorting: false,
      enableColumnFilter: false,
      enableGlobalFilter: false,
      cell: props => (
        <Box display="flex" justifyContent="center">
          <IconButton size='small' color='primary' onClick={() => modalOpen(true, "Edit Warehouse", props.getValue() as number)}>
            <EditIcon fontSize='inherit' />
          </IconButton>
          {canDelete && (
            <IconButton size='small' color='error' onClick={() => handleDeleteWarehouse(props.getValue() as number)}>
              <DeleteIcon fontSize='inherit' />
            </IconButton>
          )}
        </Box>
      ),
      meta: {
        align: 'center',
        width: 100
      }
    }
  ];

  const getWarehouseData = () => {
    setIsLoading(true);
    api.get(TransportUrls.createWarehouseUrl(freightForwarderId)).then(resp => {
      const respData = resp?.data || [];
      setWarehouseData(respData);
    })
    .catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    })
    .finally(() => setIsLoading(false));
  };

  const getSupplierLocationCountries = () => {
    api.get(SupplierUrls.supplierLocationCountriesUrl()).then(resp => {
      const respData = resp?.data || [];
      setCountries(respData);
    })
    .catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    });
  };

  const handleSaveWarehouse = () => {
    setErrors({});
    setIsSaving(true);
  
    const request = {
      method: editId === 0 ? 'post' : 'put',
      url: editId === 0 ? TransportUrls.createWarehouseUrl(freightForwarderId) : TransportUrls.updateWarehouseUrl(editId),
      data: selectedWarehouse
    };
  
    api(request).then(() => {
      setOpen(false);
      getWarehouseData();
      setSelectedWarehouse({ name: '', address_line_1: '', address_line_2: '', city: '', country: '', contact_person: '', email: '', phone_number: '' });
      toast.success(editId === 0 ? 'Successfully created warehouse' : 'Successfully updated warehouse');
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
      if (error?.response?.data) {
        setErrors(error.response.data);
      }
    }).finally(() => setIsSaving(false));
  };

  const handleDeleteWarehouse = (warehouseId: number) => {
    setDeleteItemId(warehouseId);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deleteItemId !== null) {
      api.delete(TransportUrls.updateWarehouseUrl(deleteItemId))
        .then(() => {
          toast.success('Warehouse deleted successfully.');
          getWarehouseData();
        })
        .catch(error => {
          toast.error(getDefaultError(error?.response?.status));
        })
        .finally(() => {
          setIsDeleteModalOpen(false);
          setDeleteItemId(null);
        });
    }
  };

  const modalOpen = (isOpen: boolean, title: string, selectedId: number) => {
    setTitle(title);
    setEditId(selectedId);
    setOpen(isOpen);
    if (selectedId === 0) {
      setSelectedWarehouse({ name: '', address_line_1: '', address_line_2: '', city: '', country: '', contact_person: '', email: '', phone_number: '' });
    } else {
      const selected = warehouseData.find(warehouse => warehouse.id === selectedId);
      if (selected) {
        setSelectedWarehouse({ ...selected });
      }
    }
  };

  const modalClose = () => {
    setOpen(false);
    setErrors({});
  };

  const handleWarehouseChange = (event: any) => {
    setSelectedWarehouse({
      ...selectedWarehouse,
      [event?.target?.name]: event?.target?.value,
    });
  };

  const handleWarehouseSelectChange = (event: any) => {
    setSelectedWarehouse({ ...selectedWarehouse, country: event.target.value });
  };

  const warehouseFormFields: any[] = [
    { label: 'Name', name: 'name', value: selectedWarehouse?.name || '', type: 'text', onChange: handleWarehouseChange },
    { label: 'Address Line 1', name: 'address_line_1', value: selectedWarehouse?.address_line_1 || '', type: 'text', onChange: handleWarehouseChange },
    { label: 'Address Line 2', name: 'address_line_2', value: selectedWarehouse?.address_line_2 || '', type: 'text', onChange: handleWarehouseChange },
    { label: 'City', name: 'city', value: selectedWarehouse?.city || '', type: 'text', onChange: handleWarehouseChange },
    { label: 'Country', name: 'country', value: selectedWarehouse?.country || '', type: 'select', optionText: 'name', optionValue: 'id', options: countries, onChange: handleWarehouseSelectChange },
    { label: 'Contact Person', name: 'contact_person', value: selectedWarehouse?.contact_person || '', type: 'text', onChange: handleWarehouseChange },
    { label: 'Email', name: 'email', value: selectedWarehouse?.email || '', type: 'email', onChange: handleWarehouseChange },
    { label: 'Phone Number', name: 'phone_number', value: selectedWarehouse?.phone_number || '', type: 'text', onChange: handleWarehouseChange },
  ];

  useEffect(() => {
    if (freightForwarderId) {
      getWarehouseData();
      getSupplierLocationCountries();
    }
  }, [freightForwarderId]);

  return (
    <>
      {isLoading ? <DefaultLoader /> : (
        <>
          <Button variant="outlined" sx={{ my: 3 }} onClick={() => modalOpen(true, "Create New Warehouse", 0)}>Create Warehouse</Button>
          <RitzTable
            title="Warehouses"
            data={warehouseData}
            columns={warehouseColumns}
            border={false}
          />
        </>
      )}
      <RitzModal open={open} onClose={modalClose} title={title} isLoading={isModalLoading}>
        <RitzGenericForm fields={warehouseFormFields} onSumbit={handleSaveWarehouse} submitId={editId} errors={errors} isSaving={isSaving} />
      </RitzModal>
      <RitzModal open={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirm Delete">
        <Typography>Are you sure you want to delete this warehouse?</Typography>
        <Box display="flex" justifyContent="flex-end" mt={2}>
          <Button variant="outlined" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleConfirmDelete} sx={{ ml: 2 }}>Delete</Button>
        </Box>
      </RitzModal>
    </>
  );
};

export default FreightForwarderWarehouse;