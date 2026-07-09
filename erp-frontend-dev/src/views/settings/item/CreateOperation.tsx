import RitzGenericForm from '@/components/Ritz/RitzGenericForm';
import RitzModal from '@/components/Ritz/RitzModal';
import api from '@/services/api';
import React, { useEffect, useState } from 'react';
import * as RestUrls from '../../../helpers/constants/RestUrls';
import { Box, MenuItem, Select, InputLabel, TextField, Button, Switch } from '@mui/material';
import SaveSpinner from '@/components/SaveSpinner';
import RitzMultipleFileUploader from '@/components/Ritz/RitzMultipleFileUploader';
import { LISTVIEW } from '@/helpers/constants/FileUpload';
import FormErrorMessage from '@/components/FormErrorMessage';
import RitzSelection from '@/components/Ritz/RitzSelection';
import toast from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';

const CreateOperation = ({ openModal, title, submitId, selecteditemId, selectedVariationId, selectedOperationId, closeModalData, savedVariations, getOperationURL, updateOperationURL, saveOperationURL }: any) => {
  const [operation, setOperation] = useState({ id: 0, variation: selectedVariationId, operation_name: '', costing_smv: '', factory_smv: '', active: true, video: '', item: selecteditemId, machine_type: '', folder_type: '' });
  const [operationError, setOperationError] = useState<any>({});
  const [items, setItems] = useState<any>([]);
  const [variations, setVariations] = useState<any>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showErrorNotification, setShowErrorNotification] = useState({ status: false, message: "" });
  const [selectedVideoId, setSelectedVideoId] = useState(null);
  const [videoDataArray, setVideoDataArray] = useState([]);
  const [machines, setMachines] = useState([]);
  const [folders, setFolders] = useState([]);
  const operationFieldName = 'operation_name';
  const modalClose = () => {
    closeModalData(false); // Calling the parent componenet-Reveiw
  };
  const getData = () => {
    setIsLoading(true);
    let requests = [
      api.get(RestUrls.itemsURL()),
      api.get(RestUrls.machinesURL()),
      api.get(RestUrls.foldersURL()),
      api.get(RestUrls.getItemOperationsURL(selecteditemId)),

    ]

    if (selectedOperationId > 0) {
      requests.push(api.get(getOperationURL(selectedOperationId)))
    }
    Promise.all(requests).then(resp => {
      const respData = resp.map((r: any) => r.data);
      const [items, machines, folders, variations, operation] = respData;
      setItems([...items]);
      setMachines([...machines])
      setFolders([...folders])
      setVariations([...variations.variations])
      const getSelectedVideoDetails = [operation].map(operationdata => ({
        ...operationdata,
        display_name: operationdata.display_name,
        file_path: operationdata.file_path,
        id: operationdata.video
      }));
      if (selectedOperationId > 0) {
        setOperation({ ...operation });
        if (getSelectedVideoDetails.some((videoData) => videoData.video !== null)) {
          setVideoDataArray(getSelectedVideoDetails);//Pending Single Upload Component
        }
      }
    }).catch(error => {
    }).finally(() => setIsLoading(false));
  }
  const handleChange = (event: any) => {
    setOperation({
      ...operation, [event?.target?.name]: event?.target?.value,
    });
    if (operationError != null) {
      setOperationError({ [event?.target?.name]: [] });
    }
  };
  const handleSelectChangeItem = (event: any) => {
    setOperation({ ...operation, item: event.target.value });
  };
  const handleChangeChacked = (event: any) => {
    setOperation({
      ...operation,
      [event?.target?.name]: event?.target?.checked,
    });
  };

  const handleSave = () => {
    setIsSaving(true);
    const request = {
      method: selectedOperationId === 0 ? 'post' : 'put',
      url: selectedOperationId === 0 ? saveOperationURL : updateOperationURL(selectedOperationId),
      data: operation
    }

    api(request).then(() => {
      modalClose();
      savedVariations();
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
      if (error.response && error.response.data) {
        const errorMsg = error.response.data;
        setOperationError({ ...errorMsg });
      }
    }).finally(() => {
      setIsSaving(false);
    });
  };

  const handleFileChange = (attachment: any) => {
    const attachmentId = attachment.length > 0 ? attachment[0].id : null;
    setSelectedVideoId(attachmentId)
    if (attachment.length === 0) {
      setSelectedVideoId(0)
    }
  };
  const fileAttacehemtLocation = `costing/consumption/fabricmaterial/`;
  useEffect(() => {
    setOperation((prevState) => ({
      ...prevState,
      video: selectedVideoId === 0 ? null : selectedVideoId,
    }));
  }, [selectedVideoId]);

  useEffect(() => {
    getData();
  }, [selecteditemId]);

  return (
    <>
      <RitzModal open={openModal} onClose={modalClose} title={title} isLoading={isLoading} maxWidth={'md'}>
        <Box sx={{ mb: 3 }}>
          <InputLabel sx={{ mb: 1 }} >Item</InputLabel>
          <RitzSelection
            id={'item'}
            name={'item'}
            optionValue={'id'}
            optionText={'name'}
            selectedValue={selecteditemId}
            isRequired={true}
            options={items}
            handleOnChange={handleSelectChangeItem}
            isReadOnly={true}
          />
        </Box>
        <Box sx={{ mb: 3 }}>
          <InputLabel sx={{ mb: 1 }} >Variation</InputLabel>
          <RitzSelection
            id={'variation'}
            name={'variation'}
            optionValue={'id'}
            optionText={'variation_name'}
            selectedValue={selectedVariationId}
            isRequired={true}
            options={variations}
            handleOnChange={handleChange}
            isReadOnly={true}
          />

        </Box>
        <Box sx={{ mb: 3 }}>
          <InputLabel sx={{ mb: 1 }} >Folder Type</InputLabel>
          <RitzSelection
            id={'folder_type'}
            name={'folder_type'}
            optionValue={'id'}
            optionText={'name'}
            selectedValue={operation?.folder_type}
            isRequired={true}
            options={folders}
            handleOnChange={handleChange}
          />
        </Box>
        <Box sx={{ mb: 3 }}>
          <InputLabel sx={{ mb: 1 }} >Machine Type</InputLabel>
          <RitzSelection
            id={'machine_type'}
            name={'machine_type'}
            optionValue={'id'}
            optionText={'name'}
            selectedValue={operation?.machine_type}
            isRequired={true}
            options={machines}
            handleOnChange={handleChange}
          />

        </Box>
        <Box sx={{ mb: 3 }}>
          <InputLabel sx={{ mb: 1 }} >Operation</InputLabel>
          <TextField
            id={operationFieldName}
            name={operationFieldName}
            value={operation.operation_name || ''}
            autoComplete="new-username"
            onChange={handleChange}
            fullWidth
            type="text"

          />
          <FormErrorMessage message={operationError?.[operationFieldName]} />
        </Box>
        <Box sx={{ mb: 3 }}>
          <InputLabel sx={{ mb: 1 }} >Costed SMV</InputLabel>
          <TextField
            id={"costing_smv"}
            name={"costing_smv"}
            value={operation.costing_smv || ''}
            autoComplete="new-username"
            onChange={handleChange}
            fullWidth
            type="text"

          />
        </Box>
        <Box sx={{ mb: 3 }}>
          <InputLabel sx={{ mb: 1 }} >Factory SMV</InputLabel>
          <TextField
            id={"factory_smv"}
            name={"factory_smv"}
            value={operation.factory_smv || ''}
            autoComplete="new-username"
            onChange={handleChange}
            fullWidth
            type="text"

          />
        </Box>
        <Box sx={{ mb: 3 }}>
          <InputLabel sx={{ mb: 1 }} >Uploads</InputLabel>
          <RitzMultipleFileUploader displayType={LISTVIEW} selectedFilesParent={videoDataArray || []} handleFileChangeParent={(selectedFiles: any) => handleFileChange(selectedFiles)} filelocation={fileAttacehemtLocation} />
        </Box>
        <Box sx={{ mb: 3 }}>
          <InputLabel sx={{ mb: 1 }} >Status</InputLabel>
          <Switch
            id={"active"}
            name={"active"}
            checked={operation?.active ?? false}
            onChange={handleChangeChacked}
          />
        </Box>
        <Box style={{ display: 'flex', justifyContent: 'end' }}>
          <Button variant="contained" color="primary" onClick={handleSave} disabled={isSaving}>
            {isSaving && <SaveSpinner />}{submitId > 0 ? "Update" : "Create"}
          </Button>
        </Box>
      </RitzModal>
    </>
  );
};
export default CreateOperation;