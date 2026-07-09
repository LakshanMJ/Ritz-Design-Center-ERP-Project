import RitzGenericForm from '@/components/Ritz/RitzGenericForm';
import RitzModal from '@/components/Ritz/RitzModal';
import api from '@/services/api';
import React, { useEffect, useState } from 'react';
import * as RestUrls from '../../../helpers/constants/RestUrls';
import { toast } from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';


const CreatePlacement = ({ openModal, title, submitId, selecteditemId, closeModalData, savedPlacements }: any) => {
  const [placement, setPlacement] = useState({ id: 0, placement: '', active: true,  mandatory: false, type: '', item: selecteditemId, assign_type: '', estimated_consumption_ratio:'', estimated_consumption_ratio_units:'' });
  const [errors, setErrors] = useState<any>({});
  const [placementTypes, setPlacementTypes] = useState<any>({});
  const [placementAssignmentTypes, setplacementAssignmentTypes] = useState<any>({});
  const [items, setItems] = useState<any>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const stateOption = [
    {
      id: 1,
      name: 'Status'
    }
  ]

  const mandatoryOption = [
    {
      id: 1,
      name: 'Mandatory'
    }
  ]

  useEffect(() => {
    setErrors({});
    getData();
  }, [selecteditemId]);

  const modalClose = () => {
    setErrors({});
    closeModalData(false);
  };

  const getData = () => {
    setIsLoading(true);

    let requests = [
      api.get(RestUrls.itemAttributesPlacementAssignTypeURL()),
      api.get(RestUrls.itemAttributePlacemnetTypeURL()),
      api.get(RestUrls.itemsURL()),
      api.get(RestUrls.getItemAttributesURL(selecteditemId as any))
    ]

    if (submitId > 0) {
      requests.push(api.get(RestUrls.itemAttributeURL(submitId)))
    }

    Promise.all(requests).then(resp => {
      const respData = resp.map((r: any) => r.data);
      const [placementAssign, placementTypes, items, placement] = respData;

      setItems([...items]);
      setPlacementTypes({ ...placementTypes });
      setplacementAssignmentTypes({ ...placementAssign });

      if (submitId > 0) {
        const placementData = (placement || []).find((i: any) => i.id === submitId);
        setPlacement(placementData);
      }
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => setIsLoading(false));
  }

  const handleChange = (event: any) => {
    setPlacement({
      ...placement,
      [event?.target?.name]: event?.target?.value,
    });
  };

  const handleSelectChangePlacementType = (event: any) => {
    setPlacement({ ...placement, type: event.target.value });
  };

  const handleSelectChangePlacemenAssigntType = (event: any) => {
    setPlacement({ ...placement, assign_type: event.target.value });
  };

  const handleSelectChangeItem = (event: any) => {
    setPlacement({ ...placement, item: event.target.value });
  };

  const handleChangeChacked = (event: any) => {
    setPlacement({
      ...placement,
      [event?.target?.name]: event?.target?.checked,
    });
  };

  const handleSave = () => {
    setIsSaving(true);
    setErrors({});

    const request = {
      method: submitId === 0 ? 'post' : 'put',
      url: submitId === 0 ? RestUrls.createItemAttributeURL() : RestUrls.updateItemAttributeURL(submitId),
      data: placement
    }

    api(request).then(() => {
      modalClose();
      savedPlacements();
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
      if (error?.response?.data) {
        setErrors(error.response.data);
      }
    }).finally(() => {
      setIsSaving(false);
    });
  };
  const createPlacementFields = [
    { label: 'Items', name: 'item', value: placement?.item || '', type: 'select', isDisabled: true, options: items || [], onChange: handleSelectChangeItem , optionText: 'name', optionValue: 'id'},
    { label: 'Placement', name: 'placement', value: placement?.placement || '', type: 'text', onChange: handleChange },
    { label: 'Placement Type', name: 'type', value: placement?.type || '', type: 'select', options: placementTypes.material_types || [], onChange: handleSelectChangePlacementType, optionText: 'name', optionValue: 'id' },
    {
      label: 'Placement Assignment Type', name: 'assign_type', value: placement?.assign_type || '', type: 'select',
      options: placementAssignmentTypes.placement_assign_types || [], onChange: handleSelectChangePlacemenAssigntType, optionText: 'name', optionValue: 'id'
    },
    { label: 'Estimated Consumption', name: 'estimated_consumption_ratio', value: placement?.estimated_consumption_ratio || '', type: 'text', onChange: handleChange },
    { label: 'Estimated Consumption Ratio Units', name: 'estimated_consumption_ratio_units', value: placement?.estimated_consumption_ratio_units || '', type: 'text', onChange: handleChange, isDisabled:true },
    { label: '', name: 'active', value: placement?.active || false, type: 'checkbox', optionText: 'name', optionValue: 'id', options: stateOption, onChange: handleChangeChacked },
    { label: '', name: 'mandatory', value: placement?.mandatory || false, type: 'checkbox', optionText: 'name', optionValue: 'id', options: mandatoryOption, onChange: handleChangeChacked },
  ];
  const getEstimatedConsumptionRelatedToMaterialType = () => {
    const index = placementTypes.material_types.findIndex((types: { id: any; }) => types.id === placement.type);
    const updatedPlacement = { ...placement, estimated_consumption_ratio_units: placementTypes.material_types[index]?.estimated_consumption_ratio_units };
    setPlacement(updatedPlacement);

  };
  useEffect(() => {
    if (placement?.type) {
      getEstimatedConsumptionRelatedToMaterialType()
    }
  }, [placement?.type]);


  return (
    <>
      <RitzModal open={openModal} onClose={modalClose} title={title} isLoading={isLoading}>
        <RitzGenericForm fields={createPlacementFields} onSumbit={handleSave} submitId={submitId} errors={errors} isSaving={isSaving} />
      </RitzModal>
    </>
  );
};

export default CreatePlacement;