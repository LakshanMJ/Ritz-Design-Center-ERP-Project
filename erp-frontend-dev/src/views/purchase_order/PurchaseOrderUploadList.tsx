import DefaultLoader from '@/components/DefaultLoader'
import api from '@/services/api';
import { Button, IconButton, Typography } from '@mui/material'
import React, { useEffect, useState } from 'react'
import * as RestUrls from '../../helpers/constants/RestUrls';
import toast from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';
import RitzTable from '@/components/Ritz/RitzTable';
import { ColumnDef } from '@tanstack/react-table';
import EditIcon from '@mui/icons-material/Edit';
import { OPEN_STATUS } from '@/helpers/constants/Constants';
import { useRouter } from 'next/router';
import { purchaseOrderExcelFileUploadCreatePageURL, purchaseOrderDetailPageURL } from '@/helpers/constants/FrontEndUrls';
import SaveSpinner from '@/components/SaveSpinner';
import { purchaseOrderUploadDetailPageURL } from '@/helpers/constants/front_end/POUrls';
import { purchaseOrderUploadedListURL } from '@/helpers/constants/rest_urls/POUrls';

const PurchaseOrderUploadList = () => {

  const router = useRouter();
  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'id',
      header: 'Upload ID',
    },
    {
      accessorKey: 'po_file_name',
      header: 'Upload File',
    },
    {
      accessorKey: 'active',
      header: 'Status',
      cell: (props) => {
        const stateValue = props.row.original.active;
        const Status = stateValue === true ? "active" : 'Inactive';
        return <Typography>{Status}</Typography>;
      },
    },
    {
      accessorKey: "id",
      header: 'Action',
      enableSorting: false,
      enableColumnFilter: false,
      enableGlobalFilter: false,
      cell: (props) => {
        const { id } = props.row.original;
        return (
          <IconButton size='small' color='primary' onClick={() => { handleUploadOrderDetailPageUrl(id) }}>
            <EditIcon fontSize='inherit' />
          </IconButton>
        )
      },
      meta: {
        align: 'center',
        width: 100
      }
    }
  ];

  const [isLoading, setIsLoading] = useState(true);
  const [purchaseOrders, setPurchaseOrders] = useState<any>([]);

  const getPurchaseOrderUploadedList = () => {
    setIsLoading(true);
    api.get(purchaseOrderUploadedListURL()).then(resp => {
      const resdata = resp?.data || [];
      setPurchaseOrders([...resdata]);
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => setIsLoading(false));
  };

  const handleUploadOrderDetailPageUrl = (id: any) => {
    router.push(purchaseOrderUploadDetailPageURL(id))

  }

  useEffect(() => {
    getPurchaseOrderUploadedList();
  }, []);

  return (
    <>
      {isLoading ? <DefaultLoader /> : <>
        <RitzTable
          data={purchaseOrders}
          columns={columns}
        />
      </>}
    </>
  )
}

export default PurchaseOrderUploadList