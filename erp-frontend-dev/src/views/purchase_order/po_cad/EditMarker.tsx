import { getDefaultError } from '@/helpers/Utilities';
import api from '@/services/api';
import { Alert, Box, Button, Card, Checkbox, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import * as POUrls from '@/helpers/constants/rest_urls/POUrls';
import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast';
import DefaultLoader from '@/components/DefaultLoader';
import RitzCheckBox from '@/components/Ritz/RitzCheckBox';
import SaveSpinner from '@/components/SaveSpinner';
import { DEFAULT_SUCCESS } from '@/helpers/constants/Constants';
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";


const EditMarker = ({itemId, markerClassification, clubId, customerBrandMaterialId, onMarkerChangesSuccess, selectedPlacementData}: any) => {
  const placementsKey = 'placements';
  const displayNameKey = 'display_name';
  const itemLevelMarkerType = 'item_level_marker';
  const placementLevelMarkerType = 'placement_level_marker';

  const [markerType, setMarkerType] = useState(selectedPlacementData.marker_type ? selectedPlacementData.marker_type : itemLevelMarkerType);
  const [isLoading, setIsLoading] = useState(true);
  const [markerPlacemnetData, setMarkerPlacementData] = useState<any>({[placementsKey]: []})
  const [selectedPlacements, setSelectedPlacements] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = ( event: any, changedMarkerType: string) => {
    if (changedMarkerType) {
      setMarkerType(changedMarkerType);
    }
  };

  const handleOnChange = (event: any) => {
    const {value, checked} = event.target;

    const similarIds = markerPlacemnetData?.placements
        ?.filter((placement: any) => placement.size_id === markerPlacemnetData?.placements?.find((placement: any) => placement.id === parseInt(value, 10))?.size_id)
        .map((placement: any) => ({id: placement.id.toString()}));

    if (checked) {

      if (markerType === itemLevelMarkerType) {
        setSelectedPlacements([...selectedPlacements, ...similarIds]);
      } else {
        setSelectedPlacements([...selectedPlacements, {id: value?.toString()}]);
      }

    } else {
      if (markerType === itemLevelMarkerType) {
        setSelectedPlacements((prevSelected) =>
            prevSelected.filter((i: any) =>
                !similarIds.some((similarId: any) => similarId.id === i.id)
            )
        );
      } else {
        setSelectedPlacements((prevSelected) =>
            prevSelected.filter((i: any) => i.id?.toString() !== value?.toString())
        );
      }
    }
  };
  
  const handleEditMarker = () => {
    setIsSaving(true);
    const selectedPlacementIds = selectedPlacements.map((placemnet) => placemnet.id);
    const selectedPlacemnets = {
      marker_id: selectedPlacementData.marker_id ? selectedPlacementData.marker_id : null,
      markerType: markerType,
      placements: selectedPlacementIds,
      marker_classification: markerClassification
    }

    api.post(POUrls.poClubMarkerCreateURL(clubId, customerBrandMaterialId), selectedPlacemnets).then(resp => {
      const responseData = resp?.data || [];
      if (responseData.success) {
        onMarkerChangesSuccess();
        toast.success(DEFAULT_SUCCESS);
      }
    }).catch(error => {
        if (error?.response?.data) {
          toast.error(error?.response?.data?.[placementsKey]);
        }else {
          toast.error(getDefaultError(error?.response?.status));
        }
    }).finally(() => {
        setIsSaving(false);
    });
  };

  const getMarkerMetaData = () => {
    if (clubId > 0) {
      setIsLoading(true);
      Promise.all([
        api.get(POUrls.poClubItemPlacementListUrl(clubId, customerBrandMaterialId, markerClassification)),
      ]).then((resp) => {
          const respData = resp.map((r: any) => r.data);
          const [markerCreateData] = respData;
          setMarkerPlacementData({ ...markerCreateData });
        })
        .catch((error) => {
          toast.error(getDefaultError(error?.response?.status));
        })
        .finally(() => {
          setIsLoading(false);  
        });
    }
  };
  
  useEffect(() => {
    if (markerType && itemId && clubId && customerBrandMaterialId) {
      getMarkerMetaData();
    }
  }, [markerType, itemId, clubId, customerBrandMaterialId])
  
  useEffect(() => {
    if (selectedPlacementData && Object.keys(selectedPlacementData).length > 0) {
      if (selectedPlacementData?.[placementsKey] && selectedPlacementData?.[placementsKey]?.length > 0) {
        const poPackItemPlacementIds = selectedPlacementData?.[placementsKey]?.map((placement: any) => ({
          id: placement.po_pack_item_placement_id.toString()
        }));
          setSelectedPlacements(poPackItemPlacementIds);
      }
    }else {
      //
    }
  }, [markerType, markerPlacemnetData, selectedPlacementData]);
  
  useEffect(() => {
    setSelectedPlacements([]);
  }, [markerType]);
  
  return (
    <>
    <ToggleButtonGroup
      color="primary"
      value={markerType}
      exclusive
      onChange={handleChange}
      aria-label="Platform">
        <ToggleButton value={itemLevelMarkerType}>Item Level Marker</ToggleButton>
        <ToggleButton value={placementLevelMarkerType}>Placement Level Marker</ToggleButton>
    </ToggleButtonGroup>
      {
      isLoading ? <DefaultLoader /> 
      : <>
        <Box sx={{mt: 3,}}>
        <Alert severity='info' icon={false}>selecting single placement will also select all of the placement on that pack item</Alert>
          <Typography variant='h6' sx={{mb: 2, ml: 2, mt: 2}}>{markerPlacemnetData?.[displayNameKey]}</Typography>
            <Box sx={{ml:2}}>
            <TableContainer  sx={{ border: '1px solid rgba(0, 0, 0, 0.06)', mt: 2}}>
              <Table >
                <TableHead>
                  <TableRow sx={{backgroundColor: (theme) => theme.palette.grey[100]}}>
                    <TableCell sx={{width: '1%'}}></TableCell>
                    <TableCell >Placement</TableCell>
                    <TableCell sx={{width: '15%'}}>Required Quantity</TableCell>
                    <TableCell sx={{width: '15%'}}>Filled Quantity</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                {markerPlacemnetData?.placements.map((placement: any) => (
                  <TableRow key={placement.id}>
                      <TableCell>
                        <Checkbox
                          value={placement.id.toString()}
                          checked={selectedPlacements.some((selectedPlacement) => selectedPlacement.id.toString() === placement.id.toString())}
                          onChange={(event) => handleOnChange(event)}
                        />
                      </TableCell>
                      <TableCell>{placement.name}</TableCell>
                      <TableCell>{placement.required_quantity || 0}</TableCell>
                      <TableCell>
                        {placement.filled_quantity || 0}

                        { placement.filled_quantity > placement.required_quantity &&
                            <WarningAmberIcon sx={{color: 'red', ml: 4, float: 'right'}}/>
                        }

                        { placement.filled_quantity == placement.required_quantity &&
                            <CheckCircleOutlineIcon sx={{color: 'green', ml: 4, float: 'right'}}/>
                        }
                      </TableCell>
                  </TableRow>
                ))}
                </TableBody>
              </Table>
            </TableContainer>
            </Box>
            <Box sx={{ mt: 5, display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={handleEditMarker} variant="contained" disabled={isSaving}>
            {isSaving && <SaveSpinner />} {selectedPlacementData.marker_type ? 'Update' : 'Create'}
          </Button>
        </Box>
        </Box>
      </>}
    </>
  )
}

export default EditMarker