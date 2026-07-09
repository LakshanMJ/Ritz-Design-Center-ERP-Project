
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
import * as TransportUrls from '../../helpers/constants/rest_urls/TransportUrls';

const TransportType = () => {

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'name',
      header: 'Transport Type',
    },
    {
      accessorKey: "id",
      header: 'Action',
      enableSorting: false,
      enableColumnFilter: false,
      enableGlobalFilter: false,
      cell: props => (
        <IconButton size='small' color='primary' onClick={() => modalOpen(true, "Edit Transport Type", props.getValue())}>
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
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [transportTypes, setTransportTypes] = useState<any>([]);
  const [editTransportTypeId, setEditTransportTypeId] = useState(0);
  const [transportType, setTransportType] = useState({ id: 0, name: "" });

  const handleChange = (event: any) => {
    setTransportType({
      ...transportType,
      [event?.target?.name]: event?.target?.value,
    });
  };

  const formFields: any[] = [
    { label: 'Transport Type', name: 'name', value: transportType?.name || '', type: 'text', onChange: handleChange },
  ]

  const getTransportTypes = () => {
    setIsLoading(true);
    api.get(TransportUrls.transportTypesURL()).then(resp => {
      const resdata = resp?.data || [];
      setTransportTypes([...resdata]);
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => setIsLoading(false));
  };

  const handleSave = () => {
    setIsSaving(true);

    const request = {
      method: editTransportTypeId === 0 ? 'post' : 'put',
      url: editTransportTypeId === 0 ? TransportUrls.createTransportTypeURL() : TransportUrls.updateTransportTypeURL(editTransportTypeId),
      data: transportType
    }

    api(request).then(() => {
      setOpen(false);
      getTransportTypes();
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
      if (error?.response?.data) {
        setErrors(error.response.data);
      }
    }).finally(() => setIsSaving(false));
  };

  const modalOpen = (isOpen: any, title: string, transportTypeId: any) => {
    setTitle(title);
    setEditTransportTypeId(transportTypeId);
    setOpen(isOpen);

    if (transportTypeId === 0) {
      setTransportType({ id: 0, name: '' });
    } else {
      setIsModalLoading(true);
      api.get(TransportUrls.transportTypeURL(transportTypeId)).then(resp => {
        const reseditdata = resp?.data || {};
        setTransportType({ ...reseditdata });
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
    getTransportTypes();
  }, []);

  return (
    <>
      <Typography variant='h1'>Transport Type List</Typography>
      {isLoading ? <DefaultLoader /> : <>
        <Button variant="contained" onClick={() => { modalOpen(true, "Create New Transport Type", 0)}}>Add TransportType</Button>
        <RitzTable
          data={transportTypes}
          columns={columns}
        />
      </>}

      <RitzModal open={open} onClose={modalClose} title={title} isLoading={isModalLoading}>
        <RitzGenericForm fields={formFields} onSumbit={handleSave} submitId={editTransportTypeId} errors={errors} isSaving={isSaving} />
      </RitzModal>
    </>
  );
};

export default TransportType;
