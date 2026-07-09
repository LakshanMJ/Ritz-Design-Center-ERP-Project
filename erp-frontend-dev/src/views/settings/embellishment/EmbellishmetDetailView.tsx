import React, { useEffect } from "react";
import { useState } from "react";
import { useRouter } from "next/router";
import DeleteIcon from '@mui/icons-material/Delete';
import * as RestUrls from '../../../helpers/constants/RestUrls';
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { Alert, Breadcrumbs, Card, Divider, Grid, Link, Tab, Tabs } from "@mui/material";
import NextLink from 'next/link';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import RitzTable from "@/components/Ritz/RitzTable";
import { ColumnDef } from "@tanstack/react-table";
import api from "@/services/api";
import EditIcon from '@mui/icons-material/Edit';
import DefaultLoader from "@/components/DefaultLoader";
import dayjs from "dayjs";
import RitzModal from "@/components/Ritz/RitzModal";
import RitzGenericForm from "@/components/Ritz/RitzGenericForm";
import toast from "react-hot-toast";
import { getDefaultError } from "@/helpers/Utilities";
import { debug } from "console";
import { ACTIVE_STATUS, INACTIVE_STATUS } from "@/helpers/constants/Constants";
import {getDetailEmbellishmentSubTypeURL, getDetailEmbellishmentTypeURL, createEmbellishmentSubTypeURL,updateEmbellishmentSubTypeURL} from "@/helpers/constants/rest_urls/CostingUrls";

const EmbellishmentTypeDetailView = () => {
  const router = useRouter();
  const [title, setTitle] = useState<string>()
  const [isLoading, setIsLoading] = useState(true);
  const selectedEmbellishmentId = Number(router.query.id || 0);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [embellishmentTypeDetail, setEditEmbellishmentTypeDetail] = useState<any>({});
  const [embellishmentSubType, setEmbellishmentSubType] = useState({ id: 0, name: '', active: true, embellishment_type:selectedEmbellishmentId});
  const [embellishmentTypeDetails, setEmbellishmentTypeDetails] = useState<any>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [editEmbellishmentTypeId, setEditEmbellishmentTypeId] = useState(0);

  const modalOpen = (isOpen: any, title: string, typeId: any) => {
    setTitle(title)
    setEditEmbellishmentTypeId(typeId);
    setOpen(isOpen);

    if (typeId === 0) {
      setEmbellishmentSubType({ id: 0, name: '', active: true, embellishment_type:selectedEmbellishmentId});
  } else {
      setIsModalLoading(true);
      api.get(getDetailEmbellishmentSubTypeURL(typeId)).then(resp => {
          const reseditdata = resp?.data || {};
          setEmbellishmentSubType({ ...reseditdata });
      }).catch(error => {
          toast.error(getDefaultError(error?.response?.status));
      }).finally(() => {
          setIsModalLoading(false);
      });
  }
  };


  const getData = () => {
    setIsLoading(true);
    Promise.all([
      api.get(getDetailEmbellishmentTypeURL(selectedEmbellishmentId as any)),
    ]).then(resp => {
      const respData = resp.map((r: any) => r.data);
      const [embellishmentTypeDetail] = respData;
      setEditEmbellishmentTypeDetail({ ...embellishmentTypeDetail });
      setEmbellishmentTypeDetails([...embellishmentTypeDetail.embellishmentsubtype_set]);
    }).catch(error => {
      (error.response && error.response.data)
    }).finally(() => setIsLoading(false));
  }

  const handleModalClose = () => {
    setOpen(false)
  };
  
  const embellishmentTypesColumns: ColumnDef<any>[] = [
    {
      accessorKey: 'name',
      header: 'Type',
    },
    {
      accessorKey: 'active',
      header: 'Status',
      accessorFn: (row: any) => row['active'] ? ACTIVE_STATUS : INACTIVE_STATUS
    },
    {
      accessorKey: "id",
      header: 'Actions',
      enableSorting: false,
      enableColumnFilter: false,
      enableGlobalFilter: false,
      cell: props => (
        <div>
          <IconButton size='small' color='primary' onClick={() => modalOpen(true, `Update ${embellishmentTypeDetail?.name} Type`, props.getValue())}>
            <EditIcon fontSize='inherit' />
          </IconButton>
          {/* <IconButton size='small' color='error'>
            <DeleteIcon fontSize='inherit' />
          </IconButton> */}
        </div>
      ),
      meta: {
        align: 'center',
        width: 100
      }
    }
  ];
  const handleChange = (event: any) => {
    setEmbellishmentSubType({
      ...embellishmentSubType,
      [event?.target?.name]: event?.target?.value,
    });
  };

  const handleChangeChacked = (event: any) => {
    setEmbellishmentSubType({
      ...embellishmentSubType,
      [event?.target?.name]: event?.target?.checked,
    });
  };

  const formFields: any[] = [
    { label: `${embellishmentTypeDetail?.name} Type Name :`, name: 'name', value: embellishmentSubType?.name || '', type: 'text', onChange: handleChange },
    { label: 'Status', name: 'active', value: embellishmentSubType?.active, type: 'switch', onChange: handleChangeChacked },
  ];

  const handleSave = () => {
    setIsSaving(true);
    setErrors({});
    const request = {
      method: editEmbellishmentTypeId === 0 ? 'post' : 'put',
      url: editEmbellishmentTypeId === 0 ? createEmbellishmentSubTypeURL() : updateEmbellishmentSubTypeURL(editEmbellishmentTypeId),
      data: embellishmentSubType
    };

    api(request).then(() => {
      setOpen(false);
      getData();
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
      if (error?.response?.data) {
        setErrors(error.response.data);
      }
    }).finally(() => {
      setIsSaving(false);
    });
  }

  useEffect(() => {
    if (selectedEmbellishmentId > 0) {
      getData();
    }
  }, [selectedEmbellishmentId]);

  return (
    <>
      {isLoading ? <DefaultLoader /> : <>
        <Breadcrumbs
          separator={<NavigateNextIcon fontSize="small" />}
          aria-label="breadcrumb"
          sx={{ mb: 1.5 }}
        >
          <Link underline='hover' color='inherit' component={NextLink} href={'/admin/embellishment'}>Embellishment List</Link>
          <Typography color='text.primary'>Embellishment Type Details</Typography>
        </Breadcrumbs>
        <Typography variant='h1'>{embellishmentTypeDetail?.name}</Typography>
        <Card variant='outlined' sx={{ mb: 2 }}>
          <Grid container columnSpacing={2} px={2}>
            <Grid item sm={4} xs={6}>
              <dl>
                <dt>Created Date:</dt>
                <dd>{embellishmentTypeDetail?.created ? dayjs(embellishmentTypeDetail.updated).format('DD/MM/YYYY') : '--'}</dd>

              </dl>
            </Grid>
            <Divider orientation='vertical' variant='middle' flexItem />
            <Grid item sm={4} xs={6}>
              <dl>
                <dt>Updated Date:</dt>
                <dd>{embellishmentTypeDetail?.updated ? dayjs(embellishmentTypeDetail.updated).format('DD/MM/YYYY') : '--'}</dd>
              </dl>
            </Grid>
          </Grid>
        </Card>

        <Box sx={{ width: '100%', typography: 'body1' }}>
          <Button variant="outlined" sx={{ my: 3 }} onClick={() => { modalOpen(true, `Create ${embellishmentTypeDetail?.name} Type`, 0) }}>Create {embellishmentTypeDetail?.name} Type</Button>
          <RitzTable
            title={`${embellishmentTypeDetail?.name} Types List`}
            data={embellishmentTypeDetails}
            columns={embellishmentTypesColumns}
          />
        </Box>
        {open && (
          <RitzModal open={open} onClose={handleModalClose} title={title} isLoading={isModalLoading}>
            <RitzGenericForm fields={formFields} onSumbit={handleSave} submitId={editEmbellishmentTypeId} errors={errors} isSaving={isSaving} />
          </RitzModal>
        )}
      </>}
    </>
  );
};
export default EmbellishmentTypeDetailView;