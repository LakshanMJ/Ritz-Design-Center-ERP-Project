import DefaultLoader from '@/components/DefaultLoader';
import SaveSpinner from '@/components/SaveSpinner'
import api from '@/services/api';
import { Button, TextField, Typography, alpha } from '@mui/material'
import { ColumnDef } from '@tanstack/react-table';
import * as RestUrls from '../../helpers/constants/RestUrls';
import React, { useEffect, useState } from 'react'
import { getDefaultError, hasRole } from '@/helpers/Utilities';
import toast from 'react-hot-toast';
import { useRouter } from 'next/router';
import RitzTable from '@/components/Ritz/RitzTable';
import { ADMIN } from '@/helpers/constants/RoleManager';
import { grey } from '@mui/material/colors';
import { purchaseOrderColorwayColorMatchingURL, purchaseOrderCountryToOrderCountryMatchingURL, } from '@/helpers/constants/FrontEndUrls';
import { DEFAULT_SUCCESS } from '@/helpers/constants/Constants';

const PurchaseOrderQuantity = ({ purchaseOrderId }: any) => {

  const router = useRouter();

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'id',
      header: 'Purchase Order Details',
      enableSorting: false,
      enableColumnFilter: false,
      enableGlobalFilter: false,
      cell: (props: any) => {
        return (
          <Typography>{props.row.original.po_country.order_country_name} - {props.row.original.po_colorway.po_colorway_name} - {props.row.original.po_size.po_size_name}</Typography>
        );
      },
      meta: {
        align: 'left',
        width: 500,
      },
    },
    {
      accessorKey: 'quantity',
      header: 'Quantity',
      enableSorting: false,
      enableColumnFilter: false,
      enableGlobalFilter: false,
      cell: (props: any) => {
        const rowIndex = props.row.index;

        const handlePurchaseOderQuantityChange = (event: any, purchaseOrderID: any) => {
          const changedPurchaseeOrderQuantity = event.target.value
          if (changedPurchaseeOrderQuantity) {
            const updatedCostingOrderColorways = purchaseOrderPackDetails.map(purchaseOrderQuantity => {
              if (purchaseOrderQuantity.id === purchaseOrderID) {
                return { ...purchaseOrderQuantity, quantity: changedPurchaseeOrderQuantity };
              }
              return purchaseOrderQuantity;
            });
            setPurchaseOrderPackDetails(updatedCostingOrderColorways);
          }
        }


        return (
          <>
            <TextField
              name={'quantity'}
              type={'number'}
              id={`quantity-${rowIndex}`}
              fullWidth
              value={props.row.original.quantity}
              disabled={!isAccessGranted}
              onChange={(event: any) => { handlePurchaseOderQuantityChange(event, props.row.original.id), handleIndexValue(props.row.index) }}
              autoFocus={focusedInputIndex === props.row.index}
              sx={{
                background: 'white',
                '& .Mui-disabled': {
                  background: alpha(grey[50], 0.5),
                },
                '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': {
                  WebkitAppearance: 'none',
                  display: 'none',
                  margin: 0,
                },
                '& input[type=number]': {
                  'MozAppearance': 'textfield',
                },
              }}
            />
          </>
        );
      },
      meta: {
        align: 'left',
        width: 200,
      },
    },
  ];

  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [prevLoading, setPrevLoading] = useState(false);
  const [nextLoading, setNextLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [isAccessGranted, setIsAccessGranted] = useState(false);
  const [focusedInputIndex, setFocusedInputIndex] = useState<number | null>(null);
  const [purchaseOrderPackDetails, setPurchaseOrderPackDetails] = useState<any[]>([]);

  const canEdit = hasRole(ADMIN);

  useEffect(() => {
    getPurchaseOrderPackDetails();
  }, [purchaseOrderId])

  const getPurchaseOrderPackDetails = () => {
    if (purchaseOrderId > 0) {
      setIsLoading(true);
      api.get(RestUrls.purchaseOrderPackDetailURL(purchaseOrderId))
        .then(resp => {
          const resdata = resp?.data || [];
          setPurchaseOrderPackDetails([...resdata]);
        })
        .catch((error) => {
          toast.error(getDefaultError(error?.response?.status));
        })
        .finally(() => setIsLoading(false));
    } else {
      //
    }
  };

  const handleQuantityChanges = () => {
    if (canEdit) {
      setIsAccessGranted(true)
    } else {
      toast.error('Unable to edit quantities. please contact the system administrator')
    }
  }

  const handleIndexValue = (index: any) => {
    const currentIndexValue = index
    setFocusedInputIndex(currentIndexValue);
  }

  const handlePreviousButtonAction = () => {
    try {
      setPrevLoading(true)
      router.push(purchaseOrderCountryToOrderCountryMatchingURL(purchaseOrderId))
    } finally {
        setPrevLoading(false)
    }
  }

  const handleNextButtonAction = () => {
    try {
      setNextLoading(true)
      const enableErrorValidation = true
      const directToColorwayPage = true
      setNextLoading(true)
      handleSave(enableErrorValidation as boolean, directToColorwayPage as boolean);
    } finally {
      setNextLoading(false)
    }
  }

  const handleSaveButtonAction = () => {
    try {
      setIsSaving(true)
      const enableErrorValidation = true
      const directToColorwayPage = false
      handleSave(enableErrorValidation as boolean, directToColorwayPage as boolean);
      setIsAccessGranted(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSave = (enableErrorValidation: boolean, isNextButtonclicked: boolean) => {
    setIsModalLoading(true)

    const updatedPurchaseOrderQuantity = purchaseOrderPackDetails.map(quantity => ({
      po_pack_id: quantity.id,
      quantity: Number(quantity.quantity)
    }));

    api.put(RestUrls.purchaseOrderQuantitiesMatchingURL(enableErrorValidation), updatedPurchaseOrderQuantity).then((resp) => {
      const resdata = resp?.data || [];
      if (resdata) {
        if (isNextButtonclicked === true) {
          router.push(purchaseOrderColorwayColorMatchingURL(purchaseOrderId));
        } else {
          toast.success(DEFAULT_SUCCESS);
        }
      } else {
        //
      }
    }).catch(error => {
      if (error.response && error.response.status === 400) {
        toast.error(error?.response.data.error)
      } else {
        toast.error(getDefaultError(error?.response?.status));
      }
    }).finally(() => {
      setIsModalLoading(false)
    });
  };


  return (
    <>
      {isLoading ? (
        <DefaultLoader />
      ) : (
        <>
          <Button variant="contained" sx={{ float: 'right', marginBottom: '1%' }} onClick={handleQuantityChanges}>
            {isVisible ? <SaveSpinner /> : <> </>}Edit
          </Button>
          <RitzTable
            data={purchaseOrderPackDetails}
            columns={columns}
            enableGlobalFilter={false}
            enableColumnFilter={false}
            pagination={false}
          />
          <Button variant="contained" sx={{ marginTop: '1%', paddingLeft: '2%', paddingRight: '2%', marginRight: '5%' }} onClick={handlePreviousButtonAction}>
            {prevLoading ? < SaveSpinner /> : <> </>}Previous
          </Button>
          <Button variant="contained" sx={{ float: 'right', marginTop: '1%', paddingLeft: '2%', paddingRight: '2%' }} onClick={handleNextButtonAction}>
            {nextLoading ? < SaveSpinner /> : <> </>}Next
          </Button>
          {isAccessGranted && <Button variant="contained" sx={{ float: 'right', marginTop: '1%', paddingLeft: '2%', paddingRight: '2%', marginRight: '1%' }} onClick={handleSaveButtonAction}>
            {isSaving ? < SaveSpinner /> : <> </>}Save
          </Button>}
        </>)}
    </>
  )
}

export default PurchaseOrderQuantity