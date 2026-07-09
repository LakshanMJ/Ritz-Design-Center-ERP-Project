import React, { useEffect, useState } from "react";
import { Box, Button, Divider, Grid } from "@mui/material";
import api from "@/services/api";
import * as restUrls from "@/helpers/constants/RestUrls";
import SaveSpinner from "@/components/SaveSpinner";
import ErrorIcon from '@mui/icons-material/Error';
import RitzModal from "@/components/Ritz/RitzModal";
import toast from "react-hot-toast";
import { getDefaultError } from "@/helpers/Utilities";
import { DEFAULT_SUCCESS, VALIDATION_ERROR_CODE } from "@/helpers/constants/Constants";
import { PENDING_CONSUMPTION_DATA_VERSION_STATE, PENDING_MATERIALS_VERSION_STATE, PENDING_SUPPLIER_SELECTION_VERSION_STATE } from "@/helpers/constants/CostingStates";

const StateChangeButton = ({ versionData, buttonText='Send to CAD Team', status, refreshData }: any) => {
  const [isSaving, setIsSaving] = useState(false);
  const [versionDetail, setVersionDetail] = useState<any>({});
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [errorsModalOpen, setErrorsModalOpen] = useState(false);
  const [errors, setErrors] = useState<any>([]);


  const onSubmit = () => {
    setIsSaving(true);
    const { order, id } = versionData;

    api.post(restUrls.changeVersionStateURL(order, id)).then(resp => {
      toast.success(DEFAULT_SUCCESS);
      refreshData();
      setConfirmModalOpen(false);
    }).catch(error => {
      if (VALIDATION_ERROR_CODE === error?.response?.status && error?.response?.data?.errors) {
        const errorMessages = error.response.data.errors;
        setErrors(errorMessages);
        setConfirmModalOpen(false);
        setErrorsModalOpen(true);
      } else {
        toast.error(getDefaultError(error?.response?.status));
      }
    }).finally(() => {
      setIsSaving(false);
    });
  };

  const handleErrorsDialogClose = () => {
    setErrors([]);
    setErrorsModalOpen(false);
  };

  useEffect(() => {
    setVersionDetail(versionData);
  }, [versionData]);


  return (
    <>
      {versionDetail?.['version_state']?.['value'] === status && (
        <Button variant="outlined" color="primary" onClick={() => setConfirmModalOpen(true)}>{buttonText}</Button>
      )}

      {confirmModalOpen && (
        <RitzModal open={confirmModalOpen} onClose={() => setConfirmModalOpen(false)} title={buttonText}>
          Are you sure you want to 
            {status === PENDING_MATERIALS_VERSION_STATE && ' send this order to the CAD team?'}
            {status === PENDING_CONSUMPTION_DATA_VERSION_STATE && ' mark consumption ratios as complete?'}
            {status === PENDING_SUPPLIER_SELECTION_VERSION_STATE && ' mark this version as complete?'}

          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'right' }}>
            <Button variant='contained' onClick={onSubmit} disabled={isSaving}>
              {isSaving && <SaveSpinner/>}Confirm
            </Button>
          </Box>
        </RitzModal>
      )}

      {/* show erros dialog box */}
      {errorsModalOpen && (
        <RitzModal open={errorsModalOpen} onClose={handleErrorsDialogClose} title='Operation Failed'>
          Please fix the issues below to send this order to the CAD team.
          <Divider sx={{ mt: 2, mb: 3 }}/>
            <Box>
                {errors.map((errorItem: string, index: number) => (
                    <Grid container spacing={1} key={index}>
                        <Grid item>
                            <ErrorIcon style={{ verticalAlign: 'middle', color: 'red', fontSize: 'medium' }} />
                        </Grid>
                        <Grid item xs={11}>
                            <span>{errorItem}</span>
                        </Grid>
                    </Grid>
                ))}
            </Box>
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'end' }}>
                <Button variant="outlined" color='secondary' onClick={handleErrorsDialogClose}>Close</Button>
            </Box>
        </RitzModal>
      )}
    </>
  );
};

export default StateChangeButton;
