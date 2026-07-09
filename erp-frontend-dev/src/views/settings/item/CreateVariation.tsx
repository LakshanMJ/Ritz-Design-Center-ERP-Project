import RitzGenericForm from '@/components/Ritz/RitzGenericForm';
import RitzModal from '@/components/Ritz/RitzModal';
import api from '@/services/api';
import React, { useEffect, useState } from 'react';
import * as RestUrls from '../../../helpers/constants/RestUrls';

const CreateVariation = ({ openModal, title, submitId, selecteditemId, selectedVariationId, closeModalData, savedVariations }: any) => {
  const [variation, setVariation] = useState({ id: 0, variation_name: '', active: true,item: selecteditemId });
  const [variationError, setVariationError] = useState<any>({});
  const [items, setItems] = useState<any>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showErrorNotification, setShowErrorNotification] = useState({ status: false, message: "" });

  useEffect(() => {
    getData();
  }, [selecteditemId]);

  const modalClose = () => {
    closeModalData(false); // Calling the parent componenet-Reveiw
  };
  console.log(variationError,"variationError")
  const getData = () => {
    setIsLoading(true);

    let requests = [
     api.get(RestUrls.itemsURL()),
    ]
    if (selectedVariationId > 0) {
      requests.push(api.get(RestUrls.getVariationDetailURL(selectedVariationId)))
    }
    Promise.all(requests).then(resp => {
      const respData = resp.map((r: any) => r.data);
      const [items,variation] = respData;
      setItems([...items]); 
      if (selectedVariationId > 0) {
      setVariation({...variation});
      }
    
    }).catch(error => {
      //TODO
    }).finally(() => setIsLoading(false));
  }

  const handleChange = (event: any) => {
    setVariation({
      ...variation,
      [event?.target?.name]: event?.target?.value,
    });
    if (variationError != null) {
      setVariationError({ [event?.target?.name]: [] });
    }
  };
  const handleSelectChangeItem = (event: any) => {
    setVariation({ ...variation, item: event.target.value });
  };
  const handleChangeChacked = (event: any) => {
    setVariation({
      ...variation,
      [event?.target?.name]: event?.target?.checked,
    });
  };

  const handleSave = () => {
    setIsSaving(true);
    const request = {
      method: selectedVariationId === 0 ? 'post' : 'put',
      url: selectedVariationId === 0 ? RestUrls.createItemVariationURL() : RestUrls.updateItemVariationURL(selectedVariationId),
      data: variation
    }

    api(request).then(() => {
      modalClose();
      savedVariations();
    }).catch(error => {
      if (error.response && error.response.status === 404) {
        setShowErrorNotification({ status: true, message: "404 - Something wrong with the URL" })
      } else if (error.response && error.response.status === 500) {
        setShowErrorNotification({ status: true, message: "500 - Internal server error" })
      } else if (error.response && error.response.data) {
        const errorMsg = error.response.data;
        setVariationError({...errorMsg });
      } else {
        console.log('Error:', error.message);
        setShowErrorNotification({ status: true, message: "Oops, something wasn't right" })
      }
    }).finally(() => {
      setIsSaving(false);
    });
  };

  const createPlacementFields = [
    { label: 'Item', name: 'item', value: variation?.item || '', type: 'select', isDisabled: true, optionText: 'name', optionValue: 'id', options: items, onChange: handleSelectChangeItem },
    { label: 'Variation', name: 'variation_name', value: variation?.variation_name || '', type: 'text', onChange: handleChange },
    { label: 'Status', name: 'active', value: variation?.active, type: 'switch', onChange: handleChangeChacked },
  ];

  const resetNotification = () => {
    setShowErrorNotification({ status: false, message: "" });
  };

  return (
    <>
      <RitzModal open={openModal} onClose={modalClose} title={title} isLoading={isLoading}>
        <RitzGenericForm fields={createPlacementFields} onSumbit={handleSave} submitId={submitId} errors={variationError} isSaving={isSaving} />
      </RitzModal>
    </>
  );
};

export default CreateVariation;