import SaveSpinner from '@/components/SaveSpinner'
import api from '@/services/api';
import { Button, Typography } from '@mui/material'
import React, { useEffect, useState } from 'react'
import * as RestUrls from '../../helpers/constants/RestUrls';
import { getDefaultError, hasRole } from '@/helpers/Utilities';
import toast from 'react-hot-toast';
import RitzTable from '@/components/Ritz/RitzTable';
import { ColumnDef } from '@tanstack/react-table';
import RitzSelection from '@/components/Ritz/RitzSelection';
import DefaultLoader from '@/components/DefaultLoader';
import { purchaseOrderCountryToOrderCountryMatchingURL, purchaseOrderInquiryPageURL, purchaseOrderDetailPageURL } from '@/helpers/constants/FrontEndUrls';
import { DEFAULT_SUCCESS } from '@/helpers/constants/Constants';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { useRouter } from 'next/router';
import RitzFormErrors from '@/components/Ritz/RitzFormErrors';
import { ADMIN } from '@/helpers/constants/RoleManager';

const PurchaseOrderSizes = ({ purchaseOrderId }: any) => {

  const router = useRouter()

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'po_size_name',
      header: 'Purchase Order Size',
      enableSorting: false,
      enableColumnFilter: false,
      enableGlobalFilter: false,
    },
    {
      accessorKey: 'display_value',
      header: 'Costing Order Size',
      enableSorting: false,
      enableColumnFilter: false,
      enableGlobalFilter: false,
      cell: (props: any) => {
        const handlePurchaseOdersizeChange = (event: any, purchaseOrderID: any) => {
          const matchedOrderSizeId = event.target.value
          if (matchedOrderSizeId) {
            const updatedCostingOrderSizes = purchaseOrderSizes.po_sizes.map(size => {
              if (size.id === purchaseOrderID) {
                return { ...size, order_size: matchedOrderSizeId };
              }
              return size;
            });
            setPurchaseOrderSizes(prevState => ({ ...prevState, po_sizes: updatedCostingOrderSizes }));
          }
        }

        return (
          <>
            <RitzSelection
              id={'id'}
              name={'name'}
              optionValue={'id'}
              optionText={'name'}
              selectedValue={props.row.original.order_size || ''}
              isRequired={true}
              options={purchaseOrderSizes.order_sizes}
              handleOnChange={(event: any) => handlePurchaseOdersizeChange(event, props.row.original.id)}
              isReadOnly={!isAccessGranted}
            />
          </>
        );
      },
      meta: {
        align: 'left',
        width: 500,
      },
    },
  ];

  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [prevLoading, setPrevLoading] = useState(false);
  const [nextLoading, setNextLoading] = useState(false);
  const [saveClicked, setSaveClicked] = useState(false);
  const [isSaveBtnClicked, setSaveBtnClicked] = useState(false);
  const [isAccessGranted, setIsAccessGranted] = useState(false);
  const [purchaseOrderSizeError, setPurchaseOrderSizeError] = useState<any>([]);
  const [purchaseOrderSizes, setPurchaseOrderSizes] = useState({ po_sizes: [], order_sizes: [], });

  const canEdit = hasRole(ADMIN);

  const handleQuantityChanges = () => {
    setIsVisible(true)
    try {
      if (canEdit) {
        setIsAccessGranted(true)
      } else {
        toast.error('Unable to edit matched sizes. please contact the system administrator')
      }
    } finally {
      setIsVisible(false)
    }
  }

  const getPurchaseOrderSizeList = () => {
    if (purchaseOrderId > 0) {
      setIsLoading(true);
      api.get(RestUrls.purchaseOrderSizesListURL(purchaseOrderId))
        .then((resp) => {
          const resdata = resp?.data || [];
          setPurchaseOrderSizes({ ...resdata });
        })
        .catch((error) => {
          toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoading(false));
    } else {
      //
    }
  };

  const handlePreviousButtonAction = () => {
    try {
      setPrevLoading(true)
      if (canEdit) {
        router.push(purchaseOrderInquiryPageURL(purchaseOrderId))
      } else {
        router.push(purchaseOrderDetailPageURL(purchaseOrderId))
      }
    } finally {
      setPrevLoading(false)
    }
  }

  const handleNextButtonAction = () => {
    try {
      setNextLoading(true)
      const enableErrorValidation = true
      const directToQuantityPage = true
      setNextLoading(true)
      handleSave(directToQuantityPage as boolean, enableErrorValidation as boolean);
    } finally {
      setNextLoading(false)
    }
  }

  const handleSaveButtonAction = () => {
    try {
      setSaveClicked(true);
      const enableErrorValidation = false
      const directToQuantityPage = false
      handleSave(directToQuantityPage as boolean, enableErrorValidation as boolean);
      setIsAccessGranted(false)
    } catch (error) {
    } finally {
      setSaveClicked(false);
    }
  };

  const handleSave = (isNextButtonclicked: boolean, enableErrorValidation: boolean) => {

    setPurchaseOrderSizeError({});

    const updatedPurchaseOrderSizes = purchaseOrderSizes.po_sizes.map(size => ({
      po_size_id: size.id,
      order_size_id: size.order_size
    }));

    api.post(RestUrls.purchaseOrderSizesMatchingURL(enableErrorValidation), updatedPurchaseOrderSizes)
      .then((resp) => {
        const resdata = resp?.data || [];
        if (resdata.status === 'Successfully Updated') {
          if (isNextButtonclicked) {
            router.push(purchaseOrderCountryToOrderCountryMatchingURL(purchaseOrderId));
          } else {
            toast.success(DEFAULT_SUCCESS);
          }
          return
        } else {
          toast.error(resdata.error)
          return
        }
      })
      .catch((error) => {
        if (error.response && error.response.status === 400) {
          if (error?.response.data.error === 'Please Match All PO Sizes') {
            toast.error(error?.response.data.error)
          } else {
            const errorMesssages = error?.response.data.status
            setPurchaseOrderSizeError({ errorMesssages })
          }
        } else {
          toast.error(getDefaultError(error?.response?.status));
        }
      }).finally(() => {
        if (isSaveBtnClicked) {
          setSaveBtnClicked(false);
        }
      });
  };

  useEffect(() => {
    getPurchaseOrderSizeList();
  }, [purchaseOrderId]);

  return (
    <>
      <Button variant="contained" sx={{ float: 'right', marginBottom: '1%' }} onClick={handleQuantityChanges}>
        {isVisible ? <SaveSpinner /> : <> </>}Edit
      </Button>
      {isLoading ? (
        <DefaultLoader />
      ) : (
        <>
          {purchaseOrderSizeError?.errorMesssages && Object.keys(purchaseOrderSizeError.errorMesssages).length > 0 && (
            <>
              {Object.keys(purchaseOrderSizeError.errorMesssages).map((key, index) => (
                <Typography key={index} sx={{ display: 'flex', alignItems: 'center', padding: '1% 0% 0% 0%', color: 'red' }}>
                  <ErrorOutlineIcon fontSize='small' sx={{ marginRight: '5px' }} />
                  {/* <RitzFormErrors errorList={`${purchaseOrderSizeError.errorMesssages[key]}`} /> */}
                  {`${purchaseOrderSizeError.errorMesssages[key]}`}
                </Typography>
              ))}
            </>
          )}
          <br />
          <RitzTable
            data={purchaseOrderSizes.po_sizes}
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
            {saveClicked ? < SaveSpinner /> : <> </>}Save
          </Button>}
        </>)}
    </>
  )
}

export default PurchaseOrderSizes