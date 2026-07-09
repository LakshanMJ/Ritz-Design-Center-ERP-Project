import DefaultLoader from '@/components/DefaultLoader'
import RitzTable from '@/components/Ritz/RitzTable'
import SaveSpinner from '@/components/SaveSpinner'
import api from '@/services/api'
import { Button, Typography } from '@mui/material'
import { ColumnDef } from '@tanstack/react-table'
import React, { useEffect, useState } from 'react'
import * as RestUrls from '../../helpers/constants/RestUrls';
import { purchaseOrderSizeToOrderSizeMatchingURL, purchaseOrderDetailPageURL, purchaseOrderClubingPageURL } from '@/helpers/constants/FrontEndUrls'
import { useRouter } from 'next/router'
import toast from 'react-hot-toast'
import { getDefaultError, hasRole } from '@/helpers/Utilities'
import { DEFAULT_SUCCESS } from '@/helpers/constants/Constants'
import RitzSearchableSelection from '@/components/Ritz/RitzSearchableSelection'
import { ADMIN } from '@/helpers/constants/RoleManager'

const PurchaseOrderInquiries = ({ purchaseOrderId, Customer, fileID }: any) => {


  const router = useRouter()

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'purchase_order',
      header: 'Purchase Order',
      enableSorting: false,
      enableColumnFilter: false,
      enableGlobalFilter: false,
      cell(props) {
        return (
          <Typography>{props.row.original.name}</Typography>
        )
      },
    },
    {
      accessorKey: '',
      header: ' Order ID',
      enableSorting: false,
      enableColumnFilter: false,
      enableGlobalFilter: false,
      cell: (props: any) => {

        const orderIds = purchaseOrderInquiries.order_inquiries
        const { index } = props.row;


        return (
          <RitzSearchableSelection
            options={orderIds}
            placeholder="Select..."
            selectedValue={selectedId[index] || props.row.original.order_id || ''}
            handleOnChange={(selectedOrderID: any) => handleSelectedOrderIds(index, selectedOrderID)}
            id={'id'}
            name={'order_id'}
            optionValue={'order_id'}
            optionText={'order_id'}
            isReadOnly={!isAccessGranted}
          />
        );
      },
      meta: {
        width: 400
      }
    },
    {
      accessorKey: '',
      header: ' Order Version',
      enableSorting: false,
      enableColumnFilter: false,
      enableGlobalFilter: false,
      cell: (props: any) => {

        const allVersionData = purchaseOrderInquiries.order_inquiries.reduce(
          (versions: string | any[], inquiry: { versions: any }) => versions?.concat(inquiry.versions),
          []
        );

        const selectedOrderId = selectedId[props.row.index];

        const filteredVersions = allVersionData.filter(
          (version: any) => version.order === selectedOrderId
        );

        const handleSelectChange = (version: any, purchaseOrderID: any) => {
          const matchedVersion = version;
          if (matchedVersion) {
            const updatedCostingVersion = purchaseOrderInquiries.purchase_orders.map((order: { id: any }) => {
              if (order.id === purchaseOrderID) {
                return { ...order, costing_version: matchedVersion };
              }
              return order;
            });
            setPurchaseOrderInquiries((prevState: any) => ({ ...prevState, purchase_orders: updatedCostingVersion }));
          }
        }

        const purchase_order_id = props.row.original.id


        return (
          <>
            <RitzSearchableSelection
              options={filteredVersions}
              placeholder="Select..."
              selectedValue={matchedVersions[purchase_order_id] || props.row.original.costing_version || ''}
              handleOnChange={(version: any) => handleSelectChange(version, purchase_order_id)}
              isRequired={true}
              id={'id'}
              name={'name'}
              optionValue={'id'}
              optionText={'name'}
              isReadOnly={!isAccessGranted}
            />
          </>
        );
      },
      meta: {
        width: 400
      }
    }
  ];

  const [isLoading, setIsLoading] = useState(true);
  const [nextLoading, setNextLoading] = useState(false);
  const [saveClicked, setSaveClicked] = useState(false);
  const [prevLoading, setPrevLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [purchaseOrderInquiries, setPurchaseOrderInquiries] = useState<any>({});
  const [selectedId, setSelectedId] = useState<any>({});
  const [matchedVersions, setMatchedVersions] = useState<any>({});
  const [purchaseOrderVersionError, setPurchaseOrderVersionError] = useState<any>([]);
  const [isAccessGranted, setIsAccessGranted] = useState(false);
console.log(purchaseOrderInquiries,"purchaseOrderInquiries")
  const canEdit = hasRole(ADMIN);

  const getPurchaseOrder = () => {

    let getUrl = ''
    if(Customer > 0 && fileID > 0) {
      getUrl  = RestUrls.customerOrderVersionMatchListURL(Customer, fileID)
    }else if(purchaseOrderId > 0) {
      getUrl = RestUrls.poCustomerOrderVersionMatchListURL(purchaseOrderId)
    }

    if(getUrl){
      try {
        setIsLoading(true);
        api.get(getUrl).then(resp => {
          const resdata = resp?.data || [];
          setPurchaseOrderInquiries({ ...resdata });
        }).catch(error => {
          toast.error(getDefaultError(error?.response?.status));
        }).finally(() => setIsLoading(false));
    } finally {
      setIsLoading(true);
    }
    }

  };

  const handleVersionChanges = () => {
    setIsVisible(true)
    if (canEdit) {
      setIsAccessGranted(true)
    } else {
      toast.error('Unable to edit matched version. please contact the system administrator')
    }
    setIsVisible(false)
  }



  const handleSelectedOrderIds = (index: number, selectedOrderID: any) => {
    if (selectedOrderID > 0) {
      setSelectedId((prevSelectedId: any) => ({
        ...prevSelectedId,
        [index]: selectedOrderID
      }));
    } else {
      const orderInquiries = purchaseOrderInquiries.purchase_orders;
      if (orderInquiries && orderInquiries.length > index) {
        setSelectedId((prevSelectedId: any) => ({
          ...prevSelectedId,
          [index]: orderInquiries[index].order_id
        }));
      }
    }
  };

  useEffect(() => {
    if (
      purchaseOrderInquiries &&
      purchaseOrderInquiries.purchase_orders &&
      purchaseOrderInquiries.purchase_orders.length > 0 &&
      Object.keys(selectedId).length === 0
    ) {
      const orderInquiries = purchaseOrderInquiries.purchase_orders;
      const updatedSelectedId = orderInquiries.reduce((assignedValue: any, _: any, index: any) => {
        assignedValue[index] = orderInquiries[index]?.order_id || '';
        return assignedValue;
      }, {});
      setSelectedId(updatedSelectedId);
    }
  }, [purchaseOrderId, purchaseOrderInquiries]);



  const handleSaveButtonAction = () => {
    try {
      setSaveClicked(true)
      handleSave()
      setIsAccessGranted(false)
    } finally {
        setSaveClicked(false)
    }
  }

  const handleNextButtonAction = () => {
    try {
      setNextLoading(true)
      handleSaveNext()
    } finally {
        setNextLoading(false)
    }
  }

  const handlePreviousButtonAction = () => {
    try {
      setPrevLoading(true)
      router.push(purchaseOrderClubingPageURL(purchaseOrderId, purchaseOrderInquiries?.purchase_orders?.[0].uploaded_purchase_order))
    } finally {
      setPrevLoading(false)
    }
  }

  const handleSave = () => {
    const enableErrorValidation = false

    const updatedPurchaseOrderColorways = purchaseOrderInquiries.purchase_orders.map((order: any) => ({
      purchase_order_id: order.id,
      version_id: order.costing_version
    }));

    setPurchaseOrderVersionError({});
    api.post(RestUrls.purchaseOrderVersionsMatchingURL(enableErrorValidation), updatedPurchaseOrderColorways)
      .then((resp) => {
        const resdata = resp?.data || [];
        if (resdata.status === 'Successfully Updated') {
          toast.success(DEFAULT_SUCCESS);
          return
        } else {
            toast.error(resdata.error)
        }
      })
      .catch((error) => {
        if (error.response && error.response.status === 400) {
          if (error?.response.data.error === 'Please match all purchase orders') {
            toast.error(error?.response.data.error)
          } else {
            const errorMesssages = error?.response.data.status
            setPurchaseOrderVersionError({ errorMesssages })
          }
        } else {
          toast.error(getDefaultError(error?.response?.status));
        }
      })
  };

  const handleSaveNext = () => {

    const updatedPurchaseOrderColorways = purchaseOrderInquiries.purchase_orders.map((order: any) => ({
      purchase_order_id: order.id,
      version_id: order.costing_version
    }));

     var enableErrorValidation = true

    setPurchaseOrderVersionError({});
    api.post(RestUrls.purchaseOrderVersionsMatchingURL(enableErrorValidation), updatedPurchaseOrderColorways)
      .then((resp) => {
        const resdata = resp?.data || [];
        const purchaseOrderIds = purchaseOrderInquiries.purchase_orders.map((purchaseOrder: any) => purchaseOrder.id);
        const firstPurchaseOrder = purchaseOrderIds[0];
        if (resdata.status === 'Successfully Updated') {
            router.push(purchaseOrderSizeToOrderSizeMatchingURL(firstPurchaseOrder));
        } else {
          toast.error(resdata.error)
        }
      })
      .catch((error) => {
        if (error.response && error.response.status === 400) {
          if (error?.response.data.error === 'Please match all purchase orders') {
            toast.error(error?.response.data.error)
          } else {
            const errorMesssages = error?.response.data.status
            setPurchaseOrderVersionError({ errorMesssages })
          }
        } else {
          toast.error(getDefaultError(error?.response?.status));
        }
      })
  };

  useEffect(() => {
    getPurchaseOrder();
  }, [purchaseOrderId, Customer, fileID  ]);

  return (
    <>
      {isLoading ? (
        <DefaultLoader />
      ) : (
        <>
          <Button variant="contained" sx={{ float: 'right', marginBottom: '1%' }} onClick={handleVersionChanges}>
            {isVisible ? <SaveSpinner /> : <> </>}Edit
          </Button>
          <RitzTable
            data={purchaseOrderInquiries.purchase_orders}
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
        </>
      )}
    </>
  )
}

export default PurchaseOrderInquiries