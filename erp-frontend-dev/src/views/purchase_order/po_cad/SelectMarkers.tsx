import React, { useEffect } from "react";
import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import {
  Checkbox,
  InputLabel,
} from "@mui/material";

import api from "@/services/api";
import DefaultLoader from "@/components/DefaultLoader";
import { changePurchaseOrderMarkerMaterialsURL, purchaseOrderMarkersChangeListURL } from "@/helpers/constants/rest_urls/POUrls";
import toast from "react-hot-toast";
import { DEFAULT_SUCCESS } from "@/helpers/constants/Constants";
import { getDefaultError } from "@/helpers/Utilities";
import SaveSpinner from "@/components/SaveSpinner";
import RitzRadio from "@/components/Ritz/RitzRadio";

const SelectMarker = ({ selectedPlacementIds, markerId, clubId, selectedItem, selectedMaterialId, savedData}: any) => {
  const [markerDetails, setMarkerDetails] = useState<any>([]);//Todo
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [packItemStatus, setPackItemStatus] = useState<any>({});
  const [selectMarker, setSelectMarker] = useState<any>({});
  const getData = () => {
    setIsLoading(true);
    const requests = [
      api.get(purchaseOrderMarkersChangeListURL(clubId, selectedMaterialId, selectedItem, markerId  )),//Todo 
    ];
    Promise.all(requests).then(resp => {
      const respData = resp.map((r: any) => r.data);
      const [markers] = respData;
      setMarkerDetails([...markers])
    }).catch(error => {

      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => setIsLoading(false));
  }

  const handleOnChangeSizeCategory = (event: any) => {
    const { value } = event.target;
    setSelectMarker({
      ...selectMarker,
      marker_id: value,
    });
  };

  const handleSaveChangeMarker = () => {
    const saveApi = changePurchaseOrderMarkerMaterialsURL(clubId, markerId);
    const data = {
      destination_marker_id: selectMarker.marker_id,
      po_pack_item_ids: selectedPlacementIds?.packItemsIds,
      removed: packItemStatus.pack_item_status || false
    }
    api.post(saveApi, data).then(resp => {
      savedData()
      toast.success(DEFAULT_SUCCESS);
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => {
      setIsSaving(false);
    });
  }

  useEffect(() => {
    getData();
  }, []);

  return (
    <>
      {isLoading ? <DefaultLoader /> : <>
      <Box marginBottom={1}>
            <InputLabel sx={{ mb: 1 }}>Select the marker:</InputLabel>
            <RitzRadio
              options={markerDetails}
              name={'markers'}
              id={"markers"}
              isMulti={false}
              selectedValue={selectMarker.marker_id}
              isRequired={true}
              handleOnChange={handleOnChangeSizeCategory}
              optionValue={'id'}
              optionText={'marker_name'}
            />
          </Box>
        <Box>
              <Checkbox sx={{ ml: -1 }} checked={packItemStatus?.pack_item_status || false} name="pack_item_status" onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                setPackItemStatus({ ...packItemStatus, [event.target.name]: event.target.checked });
              }} />  Removed selected pack items from current marker
            </Box>
          <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={() => handleSaveChangeMarker()} variant="contained" disabled={isSaving}>
              {isSaving && <SaveSpinner />}Save
            </Button>
          </Box>


      </>}
    </>
  );
};
export default SelectMarker;