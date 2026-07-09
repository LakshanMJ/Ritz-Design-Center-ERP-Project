import React, { useEffect, useState } from "react"
import Button from "@mui/material/Button";
import EditIcon from '@mui/icons-material/Edit';
import { IconButton, Typography } from '@mui/material';
import * as RestUrls from '../../../helpers/constants/RestUrls';
import RitzModal from "@/components/Ritz/RitzModal";
import { ACTIVE_STATUS, INACTIVE_STATUS } from "@/helpers/constants/Constants";
import RitzGenericForm from "@/components/Ritz/RitzGenericForm";
import { ColumnDef } from "@tanstack/react-table";
import RitzTable from "@/components/Ritz/RitzTable";
import api from "@/services/api";
import DefaultLoader from "@/components/DefaultLoader";
import { toast } from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';


const FabricCompositionListView = () => {

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'name',
      header: 'Composition',
    },
    {
      accessorKey: 'type_details',
      header: 'Composition Type',
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
        <IconButton size='small' color='primary' onClick={() => modalOpen(true, "Edit Composition", props.getValue())}>
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
  const [fabricComposition, setFabricComposition] = useState({ id: 0, name: "", type: "", active: true });
  const [editFabricCompositionId, setEditFabricCompositionId] = useState(0);
  const [errors, setErrors] = useState<any>({});
  const [fabricCompositions, setFabricCompositions] = useState<any>([]);
  const [materialTypes, setMaterialTypes] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSelectChange = (event: any) => {
    setFabricComposition({ ...fabricComposition, type: event.target.value });
  };

  const handleChange = (event: any) => {
    setFabricComposition({
      ...fabricComposition,
      [event?.target?.name]: event?.target?.value,
    });
  };

  const handleChangeChacked = (event: any) => {
    setFabricComposition({
      ...fabricComposition,
      [event?.target?.name]: event?.target?.checked,
    });
  };

  const formFields: any[] = [
    { label: 'Category Type', name: 'type', value: fabricComposition?.type || '', type: 'select', optionText: 'name', optionValue: 'id', options: materialTypes.material_types, onChange: handleSelectChange },
    { label: 'Composition Name', name: 'name', value: fabricComposition?.name || '', type: 'text', onChange: handleChange },
    { label: 'Status', name: 'active', value: fabricComposition?.active, type: 'switch', onChange: handleChangeChacked },
  ];

  const modalOpen = (isOpen: any, title: string, fabric_compositionId: any) => {
    setTitle(title);
    setEditFabricCompositionId(fabric_compositionId);
    setOpen(isOpen);

    if (fabric_compositionId === 0) {
      setFabricComposition({ id: 0, name: "", type: "", active: true });
    } else {
      setIsModalLoading(true);
      api.get(RestUrls.fabricCompositionURL(fabric_compositionId)).then(resp => {
        const resdata = resp?.data || {};
        setFabricComposition({ ...resdata });
      }).catch(error => {
        toast.error(getDefaultError(error?.response?.status));
      }).finally(() => setIsModalLoading(false));
    }
  };

  const modalClose = () => {
    setOpen(false);
    setErrors({});
  };

  const getData = () => {
    setIsLoading(true);

    Promise.all([
      api.get(RestUrls.fabricCompositionsURL()),
      api.get(RestUrls.itemAttributePlacemnetTypeURL())
    ]).then(resp => {
      const respData = resp.map((r: any) => r.data);
      const [compositions, types] = respData;
      setFabricCompositions([...compositions]);
      setMaterialTypes({ ...types });
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => setIsLoading(false));
  }

  const handleSave = () => {
    setIsSaving(true);
    setErrors({});

    const request = {
      method: editFabricCompositionId === 0 ? 'post' : 'put',
      url: editFabricCompositionId === 0 ? RestUrls.createFabricCompositionURL() : RestUrls.updatefabricCompositionURL(editFabricCompositionId),
      data: fabricComposition
    }

    api(request).then(() => {
      setOpen(false);
      getData();
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
      if (error?.response?.data) {
        setErrors(error.response.data);
      }
    }).finally(() => setIsSaving(false));
  };

  useEffect(() => {
    getData();
  }, []);


  return (
    <>
      <Typography variant='h1'>Composition List</Typography>
      {isLoading ? <DefaultLoader /> : <>
        <Button variant="contained" onClick={() => { modalOpen(true, "Create New Fabric Composition", 0) }}>Add Composition</Button>
        <RitzTable
          data={fabricCompositions}
          columns={columns}
        />
      </>}

      <RitzModal open={open} onClose={modalClose} title={title} isLoading={isModalLoading}>
        <RitzGenericForm fields={formFields} onSumbit={handleSave} submitId={editFabricCompositionId} errors={errors} isSaving={isSaving} />
      </RitzModal>
    </>
  );
};

export default FabricCompositionListView;