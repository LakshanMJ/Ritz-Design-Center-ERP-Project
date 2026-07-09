import React, { useEffect, useState } from "react";
import Button from "@mui/material/Button";
import { Alert, Box, Dialog, DialogContent, DialogTitle, FormControl, FormControlLabel, FormLabel, Grid, IconButton, ListItem, ListItemText, Radio, RadioGroup, Typography } from '@mui/material';
import api from "@/services/api";
import DefaultLoader from "@/components/DefaultLoader";
import SaveSpinner from "@/components/SaveSpinner";
import { useRouter } from "next/router";
import RitzInput from "@/components/Ritz/RitzInput";
import * as RestUrls from '../../helpers/constants/RestUrls';
import CostingCard from "@/components/OrderInquiry/Costing/CostingCard";
import { LISTVIEW } from "@/helpers/constants/FileUpload";
import { purchaseOrderClubingPageURL, purchaseOrderCountryToOrderCountryMatchingURL, purchaseOrderInquiriesMatchPageURL } from "@/helpers/constants/FrontEndUrls";
import { getDefaultError } from "@/helpers/Utilities";
import { toast } from "react-hot-toast";
import RitzSingleFileUploader from "@/components/Ritz/RitzSingleFileUploader";
import FormErrorMessage from "@/components/FormErrorMessage";
import RitzRadio from "@/components/Ritz/RitzRadio";
import { grey, red } from "@mui/material/colors";
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CloseIcon from '@mui/icons-material/Close';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import RitzSearchableSelection from "@/components/Ritz/RitzSearchableSelection";


const UploadPurchaseOrder = ({ purchaseOrderId }: any) => {



  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [open, setOpen] = React.useState(false);
  const fileAttachmentLocation = `costing/consumption/fabricmaterial`;
  const [editPoId, setEditPoId] = useState(0);
  const [fileName, setFileName] = useState('');
  // const [updateFileId, setUpdateFileId] = useState(0);
  const [purchaseOrderData, setPurchaseOrderData] = useState([]);
  const [formErrors, setFormErrors] = useState([]);
  const [selectedFileId, setSelectedFileId] = useState(0);
  const [customers, setCustomers] = useState([])
  const [customer, setCustomer] = useState('');
  const [purchaseeOrderFileDetails, setPurchaseOrderFileDetails] = useState<any>({ customer: '', purchase_order_excel: 0, name: '' })
  const [preCostingType, setPreCostingType] = useState<any>(null);

  useEffect(() => {
    setEditPoId(purchaseOrderId)
  }, [purchaseOrderId]);

  useEffect(() => {
    getcustomerList()
  },[])

  const errorObject = {
    "PONumber1": ["Error Description"],
    "PONumber2": ["Error Description 2", "Error Description 3"]
  };
  
  useEffect(() => {
    setEditPoId(purchaseOrderId);
    if (purchaseOrderId > 0) {
      getPoFileUploads();
    } else {
      setIsLoading(false)
    }
  }, [purchaseOrderId]);

  // useEffect(() => {
  //   if (selectedFileId > 0) {
  //     setUpdateFileId(selectedFileId)
  //   } else {
  //     setUpdateFileId(purchaseeOrderFileDetails.purchase_order_excel)
  //   }
  // }, [selectedFileId, purchaseeOrderFileDetails.purchase_order_excel])

  const handleOnChangeName = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFileName(event.target.value);
  }

  const getcustomerList = () => {
    api.get(RestUrls.getGeneralInfoMetaDataURL()).then(resp => {
      const customerList = resp.data.customers
      setCustomers(customerList)
    }).catch((error) => {
      toast.error(getDefaultError(error?.response?.status));
    })
  };


  const getPoFileUploads = () => {
    setIsLoading(true);
    api.get(RestUrls.updatePurchaseOrderFileUploadURL(purchaseOrderId)).then(resp => {
      const resdata = resp?.data || {};
      setPurchaseOrderFileDetails(resdata)
      const updatedPurchaseOrderData = [resdata].map(item => ({
        ...item,
        display_name: item.purchase_order_excel_name
      }));
      setPurchaseOrderData(updatedPurchaseOrderData);
    }).catch((error) => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => setIsLoading(false));
  };

  const handleFileChange = (attachments: any) => {
    const attachmentId = attachments.length > 0 ? attachments[0].id : null;
    setSelectedFileId(attachmentId)
  };

  const handleNextButtonAction = () => {
    if (purchaseOrderId > 0) {
      router.push(purchaseOrderCountryToOrderCountryMatchingURL(purchaseOrderId))
    } else {
      handleNext();
    }

  }

  const handlePurchaseOrderCustomer = (event: any) => {
    setCustomer(event.target.value);
    }

  const handleNext = () => {
    setIsSaving(true);
    const createData = {
      attachment_id: selectedFileId,
    };

    api.post(RestUrls.purchaseOrderFileUploadURL(Number(customer)), createData).then((response) => {
      const uploadedPurchaseOrderId = response?.data.po_list?.uploaded_purchase_order_id
      const firstPurchaseOrderId = response?.data.po_list?.po_ids[0] //need to get purchase order id
      if (uploadedPurchaseOrderId && firstPurchaseOrderId) {
        router.push(purchaseOrderClubingPageURL(firstPurchaseOrderId, uploadedPurchaseOrderId))
      }
      // router.push(purchaseOrderInquiriesMatchPageURL(Number(customer), selectedFileId))
    }).catch(error => {
      const errors = error?.response?.data.errors
      if(errors){
        setOpen(true)
        setFormErrors(errors)
      } else if (error.response && error.response.status === 500){
        toast.error(getDefaultError(error?.response?.status));
      }
    }).finally(() => setIsSaving(false));
  };

  const handleClose = () => {
    setOpen(false);
  };

  //loop all errors in modal
  const dialogContent = [] as any;
  Object.keys(formErrors).forEach((errorKey: any) => {
    const errorDescriptions = formErrors[errorKey];
    dialogContent.push(
      <ListItemText key={errorKey} sx={{ color: 'black', fontWeight: 'bold' }}>
        {errorKey === "General Errors" ? "General Errors" : `${errorKey} Errors`}
      </ListItemText>
        );
    errorDescriptions.forEach((errorDescription: any, index: any) => {
      dialogContent.push(
           <>
            <ListItem disablePadding>
            <ListItemText key={`${errorKey}-error-${index}`} sx={{ marginLeft: '30px', marginBottom: '10px', color: 'black' }}>
              <Grid container padding={0}>
                <Grid xs={1} sx={{padding: '0', marginRight: '-20px'}}><FiberManualRecordIcon sx={{ fontSize: '10px' }} /></Grid>
                <Grid xs={11} sx={{ padding: '0', margin: '0' }}>{errorDescription}</Grid>
              </Grid>
            </ListItemText>
            </ListItem>
           </>
      );
    });
  });
  const handlePreCostingChange = (event: any) => {
    setPreCostingType(event.target.value);
  };
  

  return (
    <>
      {isLoading ? (
        <DefaultLoader />
      ) : (
        <>
          <>
              <CostingCard>
               <RitzRadio
               options={customers}
               name={'name'}
               id={'id'}
               optionValue={'id'}
               optionText={'name'}
               labelText={"Select Customer:"}
               selectedValue={customer || purchaseeOrderFileDetails.customer}
               row={false}
               handleOnChange={handlePurchaseOrderCustomer}
               >
              </RitzRadio>
            </CostingCard>
              {/* <CostingCard style={{ marginBottom: '2%' }}>
              <RitzInput
                name={"name"}
                id={"name"}
                  selectedValue={fileName || purchaseeOrderFileDetails.name}
                isMulti={true}
                multiline
                rows={3}
                row={true}
                isRequired={true}
                labelText={"Purchase Order Description:"}
                handleOnChange={handleOnChangeName}
              />
            </CostingCard> */}
            <CostingCard>
              <Typography variant='h6' sx={{ mb: 1 }}>Purchase Order Attachment:</Typography>
                <RitzSingleFileUploader
                displayType={LISTVIEW}
                selectedFilesParent={purchaseOrderData}
                handleFileChangeParent={(selectedFiles: any) => handleFileChange(selectedFiles)}
                filelocation={fileAttachmentLocation}
              />
            </CostingCard>
          </>
        </>
      )}
      <Button variant="contained" onClick={handleNextButtonAction} sx={{ paddingLeft: '2%', paddingRight: '2%', float: 'right' }}>{isSaving ? <SaveSpinner /> : <> </>}Next</Button>
      {/* show errors on modal */}
      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title" sx={{ backgroundColor: grey[50], marginBottom: '-2%' }}>
          <Grid container alignItems="center" spacing={2} >
            <Grid item>
              <ErrorOutlineIcon  sx={{ color: red[600] }} />
            </Grid>
            <Grid item>
              <Typography variant="h6" sx={{ marginTop: '-1%', color: red[600] }}>
                An error occurred, can not create new purchase order
              </Typography>
            </Grid>
            <Grid item sx={{ flexGrow: 1, marginTop: '20px' }} />
            <Grid item sx={{ marginTop: '-4%', marginRight: '-2%' }}>
              <IconButton edge="end" color="inherit" onClick={handleClose} aria-label="close" >
                <CloseIcon />
              </IconButton>
            </Grid>
          </Grid>
        </DialogTitle >
        <DialogContent sx={{marginTop: '20px'}}>
          <Box>
            {dialogContent}
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UploadPurchaseOrder;
