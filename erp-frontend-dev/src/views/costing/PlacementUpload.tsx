import React, { useEffect, useState } from "react";
import DoneAllIcon from '@mui/icons-material/DoneAll';
import CheckIcon from '@mui/icons-material/Check';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { Box, Button, Typography } from "@mui/material";
import IndividualPlacementUpload from "./IndividualPlacementUpload";
import AllPlacementUpload from "./AllPlacementUpload";
import api from "@/services/api";
import * as RestUrls from '../../helpers/constants/RestUrls';
import { toast } from 'react-hot-toast';
import { getDefaultError } from "@/helpers/Utilities";
import {
  PENDING_CONSUMPTION_DATA_VERSION_STATE,
  PENDING_MATERIALS_VERSION_STATE
} from "@/helpers/constants/CostingStates";
import RitzModal from "@/components/Ritz/RitzModal";

const PlacementUpload = (props: { order_id: any, version_id: any, versionData:any }) => {
  const individualTypeName="individual"
  const applicableAllTypeName="applicable_all"
  const [open, setOpen] = React.useState(false);
  const [orderInquiry, setOrderInquiry] = useState<any>({})
  const [activeButton, setActiveButton] = useState<any>()
  const [activeStatus, setActiveStatus] = useState<any>()
  const [editableState, setEditableState] = React.useState(false);

  const handleChangeButton = (event: React.MouseEvent<HTMLElement>, activeTabStatus: string) => {
    if (activeTabStatus != null) {
      setOpen(true);
      setActiveStatus(activeTabStatus)
    }
  };

  const handleClose = () => {
    setOpen(false);
  };

  const updatepatternType = (status: any) => {
    api.put(RestUrls.updatePatternType(props.order_id,props.version_id), { pattern_type: status })
      .then(resp => {
        const responseData = resp?.data || [];
        const updatedStatus = responseData;
      })
      .catch(error => {
        toast.error(getDefaultError(error?.response?.status));
        // TODO ERROR
      });
  }

  const getOrderInquiryData = () => {
    api.get(RestUrls.getOrderInquiryDetailsUpdateURL(props.order_id))
      .then(resp => {
        const responseData = resp?.data || [];
        setOrderInquiry(responseData);
        setActiveButton(responseData.pattern_type);
      })
      .catch(error => {
        toast.error(getDefaultError(error?.response?.status));
        // TODO ERROR
      });
  }


  const handleConfirm = () => {
    if (activeButton == individualTypeName && activeStatus != null) {
      setActiveButton(applicableAllTypeName);
      updatepatternType(applicableAllTypeName)

    }
    if (activeButton == applicableAllTypeName && activeStatus != null) {
      setActiveButton(individualTypeName);
      updatepatternType(individualTypeName)
    }
    setOpen(false);
  };

  useEffect(() => {
    if(props.order_id){
      getOrderInquiryData();
    }
    if(props?.versionData?.version_state?.value !== PENDING_CONSUMPTION_DATA_VERSION_STATE){
      setEditableState(true)
    }
}, [props.order_id]);

  return (
    <>
      <Typography variant='h2' sx={{ mb: 4 }}>Upload Item Patterns</Typography>
      <ToggleButtonGroup
        value={activeButton}
        exclusive
        onChange={handleChangeButton}
        aria-label="text alignment"
        disabled={editableState}
      >
        <ToggleButton value={individualTypeName} aria-label="left aligned" style={{ marginBottom: "20px" }}>
          < CheckIcon style={{ marginRight: 3 }} />Individual Patterns
        </ToggleButton>
        <ToggleButton value={applicableAllTypeName} aria-label="centered" style={{ marginBottom: "20px" }}>
          < DoneAllIcon style={{ marginRight: 3 }} />Applicable to All
        </ToggleButton>
      </ToggleButtonGroup>

      {activeButton === individualTypeName && (
        <>
          <IndividualPlacementUpload orderId={props.order_id} versionId={props.version_id} orderInquiry={orderInquiry} activeStatus={editableState} />
        </>
      )}
      {activeButton === applicableAllTypeName && (
        <>
          <AllPlacementUpload orderId={props.order_id} versionId={props.version_id} orderInquiry={orderInquiry} activeStatus={editableState} />
        </>
      )}

      {open && <RitzModal open={open} onClose={handleClose} title='Confirmation' maxWidth='xs'>
          {
            activeButton === individualTypeName && activeStatus != null ? (
              <>
                Once it is selected, the image can be uploaded simultaneously for all colorways related to the item  and <b> all the images you have uploaded will be removed.</b> Do you want to continue?
              </>
            ) : null
          }
          {
            activeButton === "applicable_all" && activeStatus != null ? (
              <>
               Once it is selected, the image can be uploaded separately for item colorways. Do you want to continue?
              </>
            ) : null
          }

        <Box sx={{ display: 'flex', justifyContent: 'end', mt: 3 }}>
          <Button variant="contained" onClick={handleConfirm}>Confirm</Button>
        </Box>
      </RitzModal>}
    </>
  )
}

export default PlacementUpload;

