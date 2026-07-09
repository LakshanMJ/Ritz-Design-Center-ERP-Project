import api from "@/services/api";
import { toast } from 'react-hot-toast';
import Button from "@mui/material/Button";
import EditIcon from '@mui/icons-material/Edit';
import { ColumnDef } from "@tanstack/react-table";
import React, { useEffect, useState } from "react";
import RitzModal from "@/components/Ritz/RitzModal";
import RitzTable from "@/components/Ritz/RitzTable";
import { getDefaultError } from '@/helpers/Utilities';
import DefaultLoader from "@/components/DefaultLoader";
import { IconButton, Typography } from '@mui/material';
import RitzGenericForm from "@/components/Ritz/RitzGenericForm";
import * as TransportUrl from '../../helpers/constants/rest_urls/TransportUrls';

const VehicleType = () => {

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'name',
      header: 'Vehicle Type',
    },
    {
      accessorKey: 'maximum_volume',
      header: 'Maximum CBM',
      cell: (props: any) => {
        return(
          <Typography>
            {props?.row?.original?.maximum_volume} {props?.row?.original?.maximum_volume_unit_display || ''}
          </Typography>
        )
      }
    },
    {
      accessorKey: 'maximum_weight',
      header: 'Maximum Weight',
      cell: (props: any) => {
        return(
          <Typography>
            {props?.row?.original?.maximum_weight} {props?.row?.original?.maximum_weight_unit_display || ''}
          </Typography>
        )
      }
    },
    {
      accessorKey: 'transport_cost_per_kilometer',
      header: 'Transport Cost (per kilometre)',
      cell: (props: any) => {
        return(
          <Typography>
            {props?.row?.original?.transport_cost_per_kilometer} {props?.row?.original?.transport_cost_currency || ''}
          </Typography>
        )
      }
    },
    {
      accessorKey: "id",
      header: 'Action',
      enableSorting: false,
      enableColumnFilter: false,
      enableGlobalFilter: false,
      cell: props => (
        <IconButton size='small' color='primary' onClick={() => modalOpen(true, "Edit Vehicle Type", props.getValue())}>
          <EditIcon fontSize='inherit' />
        </IconButton>
      ),
      meta: {
        align: 'center',
        width: 100
      }
    }
  ];


  interface VehicleTypeMeta {
    volume_units?: any[];
    weight_units?: any[];
    currencies?: any[];
  }

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState<string>();
  const [errors, setErrors] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [vehicleTypes, setVehicleTypes] = useState<any>([]);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [editVehicleTypeId, setEditVehicleTypeId] = useState(0);
  const [vehicleType, setVehicleType] = useState({ id: 0, name: "", maximum_volume: 0,maximum_volume_unit:0, maximum_weight: 0,maximum_weight_unit: 0, transport_cost_per_kilometer: 0,transport_cost_currency: 0 });
  const [vehicleTypeMeta, setVehicleTypeMeta] = useState<VehicleTypeMeta>({});

  const handleChange = (event: any) => {
    const { name, value } = event.target;
    if (name === 'maximum_volume') {
      const regex = /^\d*\.?\d{0,2}$/;
      if (regex.test(value) || value === '') {
        setVehicleType({
          ...vehicleType,
          [name]: value,
        });
      }
    } else if (name === 'maximum_weight_kg') {
      const regex = /^\d*\.?\d{0,2}$/;
      if (regex.test(value) || value === '') {
        setVehicleType({
          ...vehicleType,
          [name]: value,
        });
      }
    } else if (name === 'transport_cost_per_kilometer') {
      const regex = /^\d*\.?\d{0,2}$/;
      if (regex.test(value) || value === '') {
        setVehicleType({
          ...vehicleType,
          [name]: value,
        });
      }
    } 
    else {
      setVehicleType({
        ...vehicleType,
        [name]: value,
      });
    }
  };

  const handleSelectChange = (event: any) => {
    const { name, value } = event.target;
    setVehicleType({ ...vehicleType, [name]: value });
  };
  
  const formFields: any[] = [
    { label: 'Vehicle Type', name: 'name', value: vehicleType?.name || '', type: 'text', onChange: handleChange },
    { label: 'Maximum CBM', name: 'maximum_volume', value: vehicleType?.maximum_volume || '', type: 'number', onChange: handleChange },
    { label: 'Maximum CBM Unit', name: 'maximum_volume_unit', value: vehicleType?.maximum_volume_unit || '', type: 'select', optionText: 'display', optionValue: 'unit', options: vehicleTypeMeta?.volume_units, onChange: handleSelectChange },
    { label: 'Maximum Weight', name: 'maximum_weight', value: vehicleType?.maximum_weight || '', type: 'number', onChange: handleChange },
    { label: 'Maximum Weight Unit', name: 'maximum_weight_unit', value: vehicleType?.maximum_weight_unit || '', type: 'select', optionText: 'display', optionValue: 'unit', options: vehicleTypeMeta?.weight_units, onChange: handleSelectChange },
    { label: 'Transport Cost (per kilometre)', name: 'transport_cost_per_kilometer', value: vehicleType?.transport_cost_per_kilometer || '', type: 'number', onChange: handleChange },
    { label: 'Transport Cost Unit', name: 'transport_cost_currency', value: vehicleType?.transport_cost_currency || '', type: 'select', optionText: 'display', optionValue: 'currency', options: vehicleTypeMeta?.currencies, onChange: handleSelectChange },
  ]

  const getVehicleTypesMetaData = () => {
    setIsLoading(true);
    api.get(TransportUrl.vehicleTypeMetaData()).then((resp) => {
      const resdata = resp?.data || {};
      setVehicleTypeMeta(resdata);
    }).catch((error) => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => setIsLoading(false));
  };

  const getVehicleTypes = () => {
    setIsLoading(true);
    api.get(TransportUrl.vehicleTypesURL()).then(resp => {
      const resdata = resp?.data || [];
      setVehicleTypes([...resdata]);
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => setIsLoading(false));
  };

  const handleSave = () => {
    setIsSaving(true);

    const request = {
      method: editVehicleTypeId === 0 ? 'post' : 'put',
      url: editVehicleTypeId === 0 ? TransportUrl.createVehicleTypeURL() : TransportUrl.updateVehicleTypeURL(editVehicleTypeId),
      data: vehicleType
    }

    api(request).then(() => {
      setOpen(false);
      getVehicleTypes();
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
      if (error?.response?.data) {
        setErrors(error.response.data);
      }
    }).finally(() => setIsSaving(false));
  };

  const modalOpen = (isOpen: any, title: string, vehicleTypeId: any) => {
    setTitle(title);
    setEditVehicleTypeId(vehicleTypeId);
    setOpen(isOpen);

    if (vehicleTypeId === 0) {
      setVehicleType({ id: 0, name: "", maximum_volume: 0,maximum_volume_unit:0, maximum_weight: 0,maximum_weight_unit: 0, transport_cost_per_kilometer: 0,transport_cost_currency: 0 });
    } else {
      setIsModalLoading(true);
      api.get(TransportUrl.vehicleTypeURL(vehicleTypeId)).then(resp => {
        const reseditdata = resp?.data || {};
        setVehicleType({ ...reseditdata });
      }).catch(error => {
        toast.error(getDefaultError(error?.response?.status));
      }).finally(() => setIsModalLoading(false));
    }
  };

  const modalClose = () => {
    setOpen(false);
    setErrors({});
  };

  useEffect(() => {
    getVehicleTypes();
    getVehicleTypesMetaData();
  }, []);


  return (
    <>
      <Typography variant='h1'>Vehicle Type List</Typography>
      {isLoading ? <DefaultLoader /> : <>
        <Button variant="contained" onClick={() => { modalOpen(true, "Create New Vehicle Type", 0) }}>Add Vehicle Type</Button>
        <RitzTable
          data={vehicleTypes}
          columns={columns}
        />
      </>}

      <RitzModal open={open} onClose={modalClose} title={title} isLoading={isModalLoading}>
        <RitzGenericForm fields={formFields} onSumbit={handleSave} submitId={editVehicleTypeId} errors={errors} isSaving={isSaving} />
      </RitzModal>
    </>
  );
};

export default VehicleType;