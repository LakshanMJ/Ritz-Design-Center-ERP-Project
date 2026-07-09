import SaveSpinner from '@/components/SaveSpinner'
import api from '@/services/api';
import { Button, Typography } from '@mui/material'
import React, { useEffect, useState } from 'react'
import * as RestUrls from '../../helpers/constants/RestUrls';
import { getDefaultError } from '@/helpers/Utilities';
import toast from 'react-hot-toast';
import RitzTable from '@/components/Ritz/RitzTable';
import { ColumnDef } from '@tanstack/react-table';
import RitzSelection from '@/components/Ritz/RitzSelection';
import DefaultLoader from '@/components/DefaultLoader';
import { purchaseOrderQuantityToOrderQuantityMatchingURL, purchaseOrderSizeToOrderSizeMatchingURL } from '@/helpers/constants/FrontEndUrls';
import { DEFAULT_SUCCESS } from '@/helpers/constants/Constants';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { useRouter } from 'next/router';
import RitzFormErrors from '@/components/Ritz/RitzFormErrors';

const PurchaseOrderCountries = ({ purchaseOrderId }: any) => {

  const router = useRouter()

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'po_country_name',
      header: 'Purchase Order Country',
      enableSorting: false,
      enableColumnFilter: false,
      enableGlobalFilter: false,
    },
    {
      accessorKey: 'display_value',
      header: 'Costing Order Country',
      enableSorting: false,
      enableColumnFilter: false,
      enableGlobalFilter: false,
      cell: (props: any) => {
        const handlePurchaseOderCountryChange = (event: any, purchaseOrderID: any) => {
          const matchedOrderCountryId = event.target.value
          if (matchedOrderCountryId) {
            const updatedCostingOrderCountries = purchaseOrderCountries.po_countries.map(country => {
              if (country.id === purchaseOrderID) {
                return { ...country, order_country: matchedOrderCountryId };
              }
              return country;
            });
            setPurchaseOrderCountries(prevState => ({ ...prevState, po_countries: updatedCostingOrderCountries }));
          }
        }

        return (
          <>
            <RitzSelection
              id={'id'}
              name={'name'}
              optionValue={'id'}
              optionText={'name'}
              selectedValue={props.row.original.order_country || ''}
              isRequired={true}
              options={purchaseOrderCountries.order_countries}
              handleOnChange={(event: any) => handlePurchaseOderCountryChange(event, props.row.original.id)}
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
  const [prevLoading, setPrevLoading] = useState(false);
  const [nextLoading, setNextLoading] = useState(false);
  const [saveClicked, setSaveClicked] = useState(false);
  const [isSaveBtnClicked, setSaveBtnClicked] = useState(false);
  const [purchaseOrderCountryError, setPurchaseOrderCountryError] = useState<any>([]);
  const [purchaseOrderCountries, setPurchaseOrderCountries] = useState({ po_countries: [], order_countries: [], });

  useEffect(() => {
    getPurchaseOrderCountryList();
  }, [purchaseOrderId]);

  const getPurchaseOrderCountryList = () => {
    if (purchaseOrderId > 0) {
      setIsLoading(true);
      api.get(RestUrls.purchaseOrderCountriesListURL(purchaseOrderId))
        .then((resp) => {
          const resdata = resp?.data || [];
          setPurchaseOrderCountries({ ...resdata });
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
      router.push(purchaseOrderSizeToOrderSizeMatchingURL(purchaseOrderId))
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
    } catch (error) {
    } finally {
      setSaveClicked(false);
    }
  };

  const handleSave = (isNextButtonclicked: boolean, enableErrorValidation: boolean) => {
    const updatedPurchaseOrderCountries = purchaseOrderCountries.po_countries.map(country => ({
      po_country_id: country.id,
      order_country_id: country.order_country
    }));

    api.post(RestUrls.purchaseOrderCountriesMatchingURL(enableErrorValidation), updatedPurchaseOrderCountries)
      .then((resp) => {
        const resdata = resp?.data || [];
        if (resdata.status === 'Successfully Updated') {
          if (isNextButtonclicked) {
            router.push(purchaseOrderQuantityToOrderQuantityMatchingURL(purchaseOrderId));
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
          if (error?.response.data.error === 'Please Match All PO Countries') {
            toast.error(error?.response.data.error)
          } else {
            const errorMesssages = error?.response.data.status
            setPurchaseOrderCountryError({ errorMesssages })
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

  return (
    <>
      {isLoading ? (
        <DefaultLoader />
      ) : (
        <>
          {purchaseOrderCountryError?.errorMesssages && Object.keys(purchaseOrderCountryError.errorMesssages).length > 0 && (
            <>
              {Object.keys(purchaseOrderCountryError.errorMesssages).map((key, index) => (
                <Typography key={index} sx={{ display: 'flex', alignItems: 'center', padding: '1% 0% 0% 0%', color: 'red' }}>
                  <ErrorOutlineIcon fontSize='small' sx={{ marginRight: '5px' }} />
                  {/* <RitzFormErrors errorList={`${purchaseOrderCountryError.errorMesssages[key]}`} /> */}
                  {`${purchaseOrderCountryError.errorMesssages[key]}`}
                </Typography>
              ))}
            </>
          )}
          <br />
          <RitzTable
            data={purchaseOrderCountries.po_countries}
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
          <Button variant="contained" sx={{ float: 'right', marginTop: '1%', paddingLeft: '2%', paddingRight: '2%', marginRight: '1%' }} onClick={handleSaveButtonAction}>
            {saveClicked ? < SaveSpinner /> : <> </>}Save
          </Button>
        </>)}
    </>
  )
}

export default PurchaseOrderCountries