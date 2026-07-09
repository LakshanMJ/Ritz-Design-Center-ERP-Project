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
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { purchaseOrderColorwayColorMatchingURL, purchaseOrderDetailPageURL } from '@/helpers/constants/FrontEndUrls';
import { DEFAULT_SUCCESS } from '@/helpers/constants/Constants';
import { useRouter } from 'next/router';

const PurchaseOrderColorways = ({ purchaseOrderId }:any) => {

  const router =useRouter()

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'colorway',
      header: 'Purchase Order Colorway',
      enableSorting: false,
      enableColumnFilter: false,
      enableGlobalFilter: false,
    },
    {
      accessorKey: 'display_value',
      header: 'Costing Order Colorway',
      enableSorting: false,
      enableColumnFilter: false,
      enableGlobalFilter: false,
      cell: (props: any) => {
      const handlePurchaseOderColorwayChange = (event: any, purchaseOrderID: any) =>{
          const matchedOrderColorwayId = event.target.value
          if (matchedOrderColorwayId) {
            const updatedCostingOrderColorways = purchaseOrderColorways.po_colorways.map(colorway => {
              if (colorway.id === purchaseOrderID) {
                return { ...colorway, order_colorway: matchedOrderColorwayId };    
              }
              return colorway;
            });
            setPurchaseOrderColorways(prevState => ({ ...prevState, po_colorways: updatedCostingOrderColorways }));
          }
        }

        return (
          <>
            <RitzSelection
              id={'id'}
              name={'colorway'}
              optionValue={'id'}
              optionText={'colorway'}
              selectedValue={props.row.original.order_colorway || ''}
              isRequired={true}
              options={purchaseOrderColorways.order_colorways}
              handleOnChange={(event: any) => handlePurchaseOderColorwayChange(event, props.row.original.id )}
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
  // const [dialogOpen, setDialogOpen] = useState(false);
  const [prevLoading, setPrevLoading] = useState(false);
  const [nextLoading, setNextLoading] = useState(false);
  const [saveClicked, setSaveClicked] = useState(false);
  // const [isModalLoading, setIsModalLoading] = useState(false);
  const [isSaveBtnClicked, setSaveBtnClicked] = useState(false);
  // const [purchaseOrderList, setPurchaseOrderList] = useState<any>([]);
  const [purchaseOrderColorwayError, setPurchaseOrderColorwayError] = useState<any>([]);
  const [purchaseOrderColorways, setPurchaseOrderColorways] = useState({ po_colorways: [], order_colorways: [], });

  useEffect(() => {
    getPurchaseOrderColorwayList();
  }, [purchaseOrderId]);

  const getPurchaseOrderColorwayList = () => {
    if (purchaseOrderId > 0) {
      setIsLoading(true);
      api.get(RestUrls.purchaseOrderColorwaysListURL(purchaseOrderId))
        .then((resp) => {
          const resdata = resp?.data || [];
          setPurchaseOrderColorways({ ...resdata });
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
      router.push(purchaseOrderColorwayColorMatchingURL(purchaseOrderId))
    } finally {
        setPrevLoading(false)
    }
  }

  const handleNextButtonAction = () => {
    try {
      setNextLoading(true)
      const enableErrorValidation = true
      // const directToQuantityPage = true
      setNextLoading(true)
      handleSave(enableErrorValidation as boolean);
    } finally {
        setNextLoading(false)
    }
  }

  const handleSaveButtonAction = () => {
    try {
      setSaveClicked(true);
      const enableErrorValidation = false
      handleSave(enableErrorValidation as boolean);
    } catch (error) {
    } finally {
        setSaveClicked(false);
    }
  };

  const handleSave = (enableErrorValidation: boolean) => {
    const updatedPurchaseOrderColorways = purchaseOrderColorways.po_colorways.map(colorway => ({
      po_colorway_id: colorway.id,
      order_colorway_id: colorway.order_colorway
    }));

    api.post(RestUrls.purchaseOrderColorwaysMatchingURL(enableErrorValidation), updatedPurchaseOrderColorways)
      .then((resp) => {
        const resdata = resp?.data || [];
        if (resdata.status === 'Successfully Updated') {
          if (resdata) {
            if(enableErrorValidation===false){
              toast.success(DEFAULT_SUCCESS);
            }else{
              router.push(purchaseOrderDetailPageURL(purchaseOrderId));
            }
          }else{

          }}
      })
      .catch((error) => {
        if (error.response && error.response.status === 400) {
          if (error?.response.data.error === 'Please Match All PO Colorways') {
            toast.error(error?.response.data.error)
          } else {
            const errorMesssages = error?.response.data.status
            setPurchaseOrderColorwayError({ errorMesssages })
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


  // const handleDialogClose = () => {
  //   setDialogOpen(false);
  // };

  // const fetchPurchaseOrderList = () => {
  //   try {
  //     setIsModalLoading(true)
  //     if (purchaseOrderId) {
  //       api.get(RestUrls.purchaseOrderStatusListURL(purchaseOrderId))
  //         .then(resp => {
  //           const resdata = resp?.data || [];
  //           // const InactiveOrderdLists = resdata.filter((item: any) => item.status === 'Inactive');
  //             router.push(purchaseOrderDetailPageURL(purchaseOrderId));
  //           } else  {
  //             setDialogOpen(true);
  //             // if (InactiveOrderdLists.length > 0) {
  //             //   setDialogOpen(true);
  //             // } else {
  //             //   // router.push(purchaseOrderdetailPageURL(purchaseOrderId));
  //             // }
  //           }
  //           setPurchaseOrderList([...resdata]);
  //         })
  //         .catch((error) => {
  //           toast.error(getDefaultError(error?.response?.status));
  //         })
  //     } else {
  //       //
  //     }
  //   }
  //   finally {
  //     setIsModalLoading(false)
  //   }
  // };

  // const handleReviewedOrderListItem = (purchase_order_id: number) => {
  //   const purhcaseOrderID = purchase_order_id
  //   router.push(purchaseOrderDetailPageURL(purhcaseOrderID));
  // }

  // const handleReviewingOrderListItem = (purchase_order_id: number) => {
  //   const purhcaseOrderID = purchase_order_id
  //   const edit_purchase_order = false
  //   router.push(purchaseOrderSizeToOrderSizeMatchingURL(purhcaseOrderID, edit_purchase_order));
  // }

  // const filteredNonReviewedList = purchaseOrderList.filter((item: any) => item.status === 'Inactive');
  // const filteredReviewedList = purchaseOrderList.filter((item: any) => item.status === 'Active');

  return (
      <>
      {isLoading ? (
        <DefaultLoader />
      ) : (
    <>
      {purchaseOrderColorwayError?.errorMesssages && Object.keys(purchaseOrderColorwayError.errorMesssages).length > 0 && (
        <>
          {Object.keys(purchaseOrderColorwayError.errorMesssages).map((key, index) => (
            <Typography key={index} sx={{ display: 'flex', alignItems: 'center', padding: '1% 0% 0% 0%', color: 'red' }}>
              <ErrorOutlineIcon fontSize='small' sx={{ marginRight: '5px' }} />
              {/* <RitzFormErrors errorList={`${purchaseOrderCountryError.errorMesssages[key]}`} /> */}
              {`${purchaseOrderColorwayError.errorMesssages[key]}`}
            </Typography>
          ))}
        </>
      )}
      <br />
      <RitzTable
        data={purchaseOrderColorways.po_colorways}
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
      {/* <RitzModal open={dialogOpen} onClose={handleDialogClose} title={filteredNonReviewedList.length > 0 ? ('You have reviewed a purchase order') : ('You have reviewed all purchase orders')} isLoading={isModalLoading}>
        <>
        <Box>
          <Typography>{filteredNonReviewedList.length > 0 ? ('Current reviewed purchase orders') : ('Reviewed Purchase Orders')}</Typography>
          {filteredReviewedList.length === 0 ? (
            <Typography sx={{ fontWeight: '300', textAlign: 'center' }}>There are no reviewed purchase orders</Typography>
          ) : (
            <List>
              {filteredReviewedList.map((activeItem: any) => (
                <ListItem
                  key={activeItem.id}
                  value={activeItem.id}
                  sx={{
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: grey[200],
                    },
                    backgroundColor: activeItem.id == purchaseOrderId ? green[50] : "inherit",
                  }}
                  onClick={() => handleReviewedOrderListItem(activeItem.id)}
                >
                  {activeItem.name}
                </ListItem>
              ))}
            </List>)}
            {filteredNonReviewedList.length > 0 && 
            <>
            <Divider />
            <Typography sx={{marginTop: '5px'}}> Need to review</Typography>
            {filteredNonReviewedList.length === 0 ? (
            <Typography sx={{ fontWeight: '300', textAlign: 'center' }}>There are no purchase orders to review</Typography>
          ) : (
            <List>
              {filteredNonReviewedList.map((inactiveItem: any) => (
                <ListItem
                  key={inactiveItem.id}
                  value={inactiveItem.id}
                  sx={{
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: grey[200],
                    },
                    backgroundColor: inactiveItem.id == purchaseOrderId ? green[50] : "inherit",
                  }}
                  onClick={() => handleReviewingOrderListItem(inactiveItem.id)}
                >
                  {inactiveItem.name}
                </ListItem>
              ))}
            </List>
          )}
            </>
            } 
        </Box>
        </>
      </RitzModal> */}
    </>
  )
}

export default PurchaseOrderColorways