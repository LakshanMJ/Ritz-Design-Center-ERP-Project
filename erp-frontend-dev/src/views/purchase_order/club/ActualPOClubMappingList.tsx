import { getDefaultError } from '@/helpers/Utilities';
import api from '@/services/api';
import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast';
import DefaultLoader from '@/components/DefaultLoader';
import RitzTable from '@/components/Ritz/RitzTable';
import { ColumnDef } from '@tanstack/react-table';
import { Button, IconButton, Link, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { useRouter } from 'next/router';
import { purchaseOrderClubDetailsPageURL } from '@/helpers/constants/front_end/POUrls';
import NextLink from 'next/link';
import { purchaseOrderClubDetailsURL } from '@/helpers/constants/rest_urls/POUrls';
import RitzModal from '@/components/Ritz/RitzModal';
import MappingColorways from './MappingColorways';
import SaveSpinner from '@/components/SaveSpinner';
import { orderSummaryVersionURL, purchaseOrderClubingPageURL, purchaseOrderDetailPageURL } from '@/helpers/constants/FrontEndUrls';

const ActualPoClubMappingList = ({ purchaseOrderId, uploadPOId }: any) => {
  const router = useRouter()
  const [actualPoClubs, setActualPoClubs] = useState<any>([]);
  const [isLoading, setIsLoading] = useState(true)
  const [openMappingModal, setOpenMappingModal] = useState<any>({});
  const [nextLoading, setNextLoading] = useState(false);
  const [prevLoading, setPrevLoading] = useState(false);

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'display_number',
      header: 'PO Club Number',
      cell: (props) => {
        const displayValue = props.row.original.display_number || '--';
        return <Link component={NextLink} href={purchaseOrderClubDetailsPageURL(props.row.original.id)}>{displayValue}</Link>;
      },
    },
    {
      accessorKey: 'uploaded_purchase_order',
      header: 'Uploaded Purchase Order',
      cell: (props) => {
        const { purchaseorder_set } = props.row.original;
        if (!purchaseorder_set || purchaseorder_set.length === 0) {
          return null;
        }
        const firstPurchaseOrder = purchaseorder_set[0];
        const file_path = firstPurchaseOrder.uploaded_purchase_order_detail.file_path
        return (
          <Link target="_blank" component={NextLink} href={file_path || '#'}>{firstPurchaseOrder.uploaded_purchase_order_detail?.display_name}</Link>
        );
      }
    },
    {
      accessorKey: 'display_number',
      header: 'Pre Costing No',
      cell: (props) => {
        return <Link component={NextLink} target='_blank' href={orderSummaryVersionURL(props.row.original.pre_costing_order, props.row.original.pre_costing_id)}>{props.row.original.pre_costing_display_number}</Link>;
      },
    },
    {
      accessorKey: 'state.display_value',
      header: 'Mapping',
      cell: (props) => {
        const displayValue = props.row.original.state.display_value || '--';
        return (
          <IconButton
            onClick={() => { handleOpenMappingModal(true, props.row.original?.id, props.row.original?.costing_type, props.row.original?.pre_costing, props.row.original?.state?.value) }}
            size='small'
            color="primary"
          >
            <EditIcon fontSize='inherit' />
          </IconButton>
        )
      },
    }
  ]
  const fetchData = () => {
    const requests = [
      api.get(purchaseOrderClubDetailsURL(uploadPOId)),
    ]
    Promise.all(requests).then(resp => {
      const respData = resp.map((r: any) => r.data);
      const [uploadedPoDetails] = respData;
      setActualPoClubs(uploadedPoDetails.actualpoclub_set);
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => setIsLoading(false));
  };

  const handleOpenMappingModal = (status: any, clubId: any, costingType: any, preCosting: any, clubState: any) => {
    setOpenMappingModal({ modalStatus: status, selectedClubId: clubId, costingType: costingType, preCosting: preCosting, clubState: clubState })
  }

  const handlePreviousButtonAction = () => {
    try {
      setPrevLoading(true)
      router.push(purchaseOrderClubingPageURL(purchaseOrderId, uploadPOId))
    } finally {
      setPrevLoading(false)
    }
  }

  const handleNextButtonAction = () => {
    try {
      setNextLoading(true)
      router.push(purchaseOrderDetailPageURL(purchaseOrderId))
    } finally {
      setNextLoading(false)
    }
  }
  const handleRefreshData = (status: any) => {
    fetchData()
    handleOpenMappingModal(status, null, null, null, null), fetchData()
  }

  useEffect(() => {
    if (uploadPOId) {
      fetchData()
    }
  }, [uploadPOId])


  return (
    <>
      {openMappingModal?.modalStatus && (
        <RitzModal open={openMappingModal?.modalStatus} onClose={() => { handleOpenMappingModal(false, null, null, null, null) , fetchData()}} title='Mapping Colorways/Sizes/Coutries' maxWidth={'xl'} >
          <MappingColorways 
            clubId={openMappingModal?.selectedClubId} 
            costingType={openMappingModal?.costingType} 
            preCosting={openMappingModal?.preCosting} 
            clubState={openMappingModal?.clubState}
            refreshData={handleRefreshData} />
        </RitzModal>
      )}
      {isLoading ? <DefaultLoader /> :
        <>
          <RitzTable data={actualPoClubs} columns={columns} />
          <Button variant="contained" sx={{ marginTop: '1%', paddingLeft: '2%', paddingRight: '2%', marginRight: '5%' }} onClick={handlePreviousButtonAction}>
            {prevLoading ? < SaveSpinner /> : <> </>}Previous
          </Button>
          <Button variant="contained" sx={{ float: 'right', marginTop: '1%', paddingLeft: '2%', paddingRight: '2%' }} onClick={handleNextButtonAction} >{nextLoading ? < SaveSpinner /> : <> </>}Next</Button>
        </>
      }
    </>
  )
}

export default ActualPoClubMappingList