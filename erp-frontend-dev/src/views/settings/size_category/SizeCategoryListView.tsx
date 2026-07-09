import React, { useEffect, useState } from "react"
import Button from "@mui/material/Button";
import EditIcon from '@mui/icons-material/Edit';
import { IconButton, Typography } from '@mui/material';
import * as RestUrls from '../../../helpers/constants/RestUrls';
import { ACTIVE_STATUS, INACTIVE_STATUS } from "@/helpers/constants/Constants";
import RitzModal from "@/components/Ritz/RitzModal";
import RitzGenericForm from "@/components/Ritz/RitzGenericForm";
import RitzTable from "@/components/Ritz/RitzTable";
import { ColumnDef } from "@tanstack/react-table";
import api from "@/services/api";
import DefaultLoader from "@/components/DefaultLoader";
import { toast } from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';


const SizeCategoryListView = () => {

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'name',
      header: 'Size Category',
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
        <IconButton size='small' color='primary' onClick={() => modalOpen(true, "Edit Size Category", props.getValue())}>
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
  const [size_category, setSizeCategory] = useState({ id: 0, name: '', active: true });
  const [editSizeCategoryId, setEditSizeCategoryId] = useState(0);
  const [sizeCategories, setSizeCategories] = useState<any>([]);
  const [errors, setErrors] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (event: any) => {
    setSizeCategory({
      ...size_category,
      [event?.target?.name]: event?.target?.value,
    });
  };

  const handleChangeChacked = (event: any) => {
    setSizeCategory({
      ...size_category,
      [event?.target?.name]: event?.target?.checked,
    });
  };

  const formFields: any[] = [
    { label: 'Size Category Name', name: 'name', value: size_category?.name || '', type: 'text', onChange: handleChange },
    { label: 'Status', name: 'active', value: size_category?.active, type: 'switch', onChange: handleChangeChacked },
  ];

  const modalOpen = (isOpen: any, title: string, categoryId: any) => {
    setTitle(title);
    setEditSizeCategoryId(categoryId);
    setOpen(isOpen);

    if (categoryId === 0) {
      setSizeCategory({ id: 0, name: "", active: true });
    } else {
      setIsModalLoading(true);
      api.get(RestUrls.sizeCategoryURL(categoryId)).then(resp => {
        const reseditdata = resp?.data || {};
        setSizeCategory({ ...reseditdata });
      }).catch(error => {
        toast.error(getDefaultError(error?.response?.status));
      }).finally(() => setIsModalLoading(false));
    }
  };

  const modalClose = () => {
    setErrors({});
    setOpen(false);
  };

  const getSizeCategories = () => {
    setIsLoading(true);
    api.get(RestUrls.sizeCategoriesURL()).then(resp => {
      const resdata = resp?.data || [];
      setSizeCategories([...resdata]);
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => setIsLoading(false));
  };

  const handleSave = () => {
    setIsSaving(true);
    setErrors({});

    const request = {
      method: editSizeCategoryId === 0 ? 'post' : 'put',
      url: editSizeCategoryId === 0 ? RestUrls.createSizeCategoryURL() : RestUrls.updateSizeCategoryURL(editSizeCategoryId),
      data: size_category
    }

    api(request).then(() => {
      setOpen(false);
      getSizeCategories();
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
    getSizeCategories();
  }, []);


  return (
    <>
      <Typography variant='h1'>Size Category List</Typography>

      {isLoading ? <DefaultLoader /> : <>
        <Button variant="contained" onClick={() => { modalOpen(true, "Create Category", 0) }}>Add Size Category</Button>
        <RitzTable
          data={sizeCategories}
          columns={columns}
        />
      </>}

      <RitzModal open={open} onClose={modalClose} title={title} isLoading={isModalLoading}>
        <RitzGenericForm fields={formFields} onSumbit={handleSave} submitId={editSizeCategoryId} errors={errors} isSaving={isSaving} />
      </RitzModal>
    </>
  )
}

export default SizeCategoryListView;
