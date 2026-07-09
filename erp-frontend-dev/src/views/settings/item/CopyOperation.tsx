import RitzGenericForm from '@/components/Ritz/RitzGenericForm';
import RitzModal from '@/components/Ritz/RitzModal';
import api from '@/services/api';
import React, { useEffect, useState } from 'react';
import * as RestUrls from '../../../helpers/constants/RestUrls';
import { Box, MenuItem, Select, InputLabel, TextField, Button, Switch, FormControl, RadioGroup, FormControlLabel, Radio, Alert } from '@mui/material';
import SaveSpinner from '@/components/SaveSpinner';
import RitzMultipleFileUploader from '@/components/Ritz/RitzMultipleFileUploader';
import { LISTVIEW } from '@/helpers/constants/FileUpload';
import FormErrorMessage from '@/components/FormErrorMessage';
import RitzSelection from '@/components/Ritz/RitzSelection';
import toast from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';
import RitzTable from '@/components/Ritz/RitzTable';
import { ColumnDef } from '@tanstack/react-table';
import DefaultLoader from '@/components/DefaultLoader';
import { DEFAULT_SUCCESS } from '@/helpers/constants/Constants';

const CopyOperation = ({orderItemId, colorwayCategoryId, versionId, colorwayId, savedData, modalClose }: any) => {

  const [selectedValue, setSelectedValue] = useState();
  const [itemColorwayTypes, setItemColorwayTypes] = useState<any>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [validationErrors, setValidationErrors] = useState({errors:'' });

  const fetchData = () => {
    const requests = [
      api.get(RestUrls.getCopyItemVariationsURL(versionId, orderItemId, colorwayCategoryId, colorwayId)),
    ]
    Promise.all(requests).then(resp => {
      const respData = resp.map((r: any) => r.data);
      const [operations] = respData;
      const data = operations.map((operation: any) => ({
        id: operation.id,
        display_name: `${operation.item_name} [ ${operation.item_identifier} ] - ${operation.colorway_name} (${operation.colorway_category_display}) `,
      }));

      setItemColorwayTypes([...data]);
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => setIsLoading(false));
  }
  const handleRadioChange = (event: any) => {
    setSelectedValue(event.target.value);
  };

  const handleSave = () => {
    const saveData = { colorway_item_type_id: selectedValue }
    const saveApi = RestUrls.createItemColorwayOperationCopyURL(versionId, orderItemId, colorwayCategoryId, colorwayId);
    api.post(saveApi, saveData).then(resp => {
      savedData(true);
      modalClose(false)
      toast.success(DEFAULT_SUCCESS);
    }).catch(error => {
     // setValidationErrors(error.response.data);
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => {
      setIsSaving(false);
    });
  }

  useEffect(() => {
     fetchData()
  }, [orderItemId, colorwayCategoryId, versionId]);

  return (
    <>
      {isLoading ? <DefaultLoader /> : <>
        <Box marginBottom={3}>
          {itemColorwayTypes.length > 0 ? (
            <FormControl>
              <RadioGroup name="radio-buttons-group" onChange={handleRadioChange}>
                {itemColorwayTypes.map((colorwayItmeType: any) => (
                  <FormControlLabel
                    key={colorwayItmeType.id}
                    value={colorwayItmeType.id}
                    control={<Radio />}
                    label={colorwayItmeType.display_name}
                  />
                ))}
              </RadioGroup>
              <FormErrorMessage message={validationErrors.errors} />
            </FormControl>
          ) : (
            <Alert severity="error" sx={{ mt: 2 }}>There is no matching colorway categories.</Alert>
          )}
        </Box>
        <Box sx={{ mt: 5, display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={() => handleSave()} variant="contained" disabled={isSaving || itemColorwayTypes.length == 0}>
            {isSaving && <SaveSpinner />}Save
          </Button>
        </Box>

      </>}
    </>
   
  );
};
export default CopyOperation;