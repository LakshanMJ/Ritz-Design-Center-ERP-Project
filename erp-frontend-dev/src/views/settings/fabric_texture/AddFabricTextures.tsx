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


const FabricTextureListView = () => {

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'name',
      header: 'Fabric Texture',
    },
    {
      accessorKey: 'active',
      header: 'Status',
      accessorFn: (row) => row['active'] ? ACTIVE_STATUS : INACTIVE_STATUS
    },
    {
      accessorKey: "id",
      header: 'Action',
      enableSorting: false,
      enableColumnFilter: false,
      enableGlobalFilter: false,
      cell: props => (
        <IconButton size='small' color='primary' onClick={() => modalOpen(true, "Edit Fabric Texture", props.getValue())}>
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
  const [fabricTexture, setFabricTexture] = useState({ id: 0, name: "", active: true });
  const [editFabricTextureId, setEditFabricTextureId] = useState(0);
  const [fabricTextures, setFabricTextures] = useState<any>([]);
  const [errors, setErrors] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (event: any) => {
    setFabricTexture({
      ...fabricTexture,
      [event?.target?.name]: event?.target?.value,
    });
  };

  const handleChangeChacked = (event: any) => {
    setFabricTexture({
      ...fabricTexture,
      [event?.target?.name]: event?.target?.checked,
    });
  };

  const formFields: any[] = [
    { label: 'Fabric Texture Name', name: 'name', value: fabricTexture?.name || '', type: 'text', onChange: handleChange },
    { label: 'Status', name: 'active', value: fabricTexture?.active, type: 'switch', onChange: handleChangeChacked },
  ];

  const modalOpen = (isOpen: any, title: string, fabric_textureId: any) => {
    setTitle(title);
    setEditFabricTextureId(fabric_textureId);
    setOpen(isOpen);

    if (fabric_textureId === 0) {
      setFabricTexture({ id: 0, name: "", active: true });
    } else {
      setIsModalLoading(true);
      api.get(RestUrls.fabricTextureURL(fabric_textureId)).then(resp => {
        const reseditdata = resp?.data || {};
        setFabricTexture({ ...reseditdata });
      }).catch(error => {
        toast.error(getDefaultError(error?.response?.status));
      }).finally(() => setIsModalLoading(false));
    }
  };

  const modalClose = () => {
    setOpen(false);
    setErrors({});
  };


  const getFabricTexture = () => {
    setIsLoading(true);

    api.get(RestUrls.fabricTexturesURL()).then(resp => {
      const resdata = resp?.data || [];
      setFabricTextures([...resdata]);
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => setIsLoading(false));
  };

  const handleSave = () => {
    setIsSaving(true);
    setErrors({});

    const request = {
      method: editFabricTextureId === 0 ? 'post' : 'put',
      url: editFabricTextureId === 0 ? RestUrls.createFabricTextureURL() : RestUrls.updatefabricTextureURL(editFabricTextureId),
      data: fabricTexture
    }

    api(request).then(() => {
      setOpen(false);
      getFabricTexture();
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
      if (error?.response?.data) {
        setErrors(error.response.data);
      }
    }).finally(() => {
      setIsSaving(false);
    });
  };

  useEffect(() => {
    getFabricTexture();
  }, []);

  return (
    <>
      <Typography variant='h1'>Fabric Texture List</Typography>

      {isLoading ? <DefaultLoader /> : <>
        <Button variant="contained" onClick={() => { modalOpen(true, "Create New Fabric Texture", 0) }}>Add Fabric Texture</Button>
        <RitzTable
          data={fabricTextures}
          columns={columns}
        />
      </>}

      <RitzModal open={open} onClose={modalClose} title={title} isLoading={isModalLoading}>
        <RitzGenericForm fields={formFields} onSumbit={handleSave} submitId={editFabricTextureId} errors={errors} isSaving={isSaving} />
      </RitzModal>
    </>
  );
};

export default FabricTextureListView;