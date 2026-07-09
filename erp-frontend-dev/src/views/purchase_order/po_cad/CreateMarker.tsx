import { getDefaultError } from '@/helpers/Utilities';
import api from '@/services/api';
import { Box, Button, Card, Checkbox, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast';
import * as POUrls from '@/helpers/constants/rest_urls/POUrls';
import RitzCheckBox from '@/components/Ritz/RitzCheckBox';
import SaveSpinner from '@/components/SaveSpinner';
import { DEFAULT_SUCCESS } from '@/helpers/constants/Constants';
import { blue, green, red } from '@mui/material/colors';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';


const CreateMarker = ({itemId, clubId, customerBrandMaterialId, onMarkerCreatedSuccess}: any) => {

  const placementsKey = 'placements';
  const displayNameKey = 'display_name';
  const itemLevelMarkerType = 'item_level_marker';
  const placementLevelMarkerType = 'placement_level_marker';

  const [isSaving, setIsSaving] = useState(false);
  const [markerType, setMarkerType] = useState(itemLevelMarkerType);
  const [selectedPlacements, setSelectedPlacements] = useState([]);
  const [markerPlacemnetData, setMarkerPlacementData] = useState<any>({marker_id: 0, [placementsKey]: []})


  const handleChange = ( event: any, changedMarkerType: string) => {
    if (changedMarkerType) {
      setMarkerType(changedMarkerType);
    }
  };

  const getMarkerMetaData = () => {
    if (itemId > 0 && clubId > 0) {
      Promise.all([
        api.get(POUrls.poClubItemPlacementListUrl(clubId, customerBrandMaterialId, '')),
      ]).then((resp) => {
          const respData = resp.map((r: any) => r.data);
          const [markerCreateData] = respData;
          setMarkerPlacementData({ ...markerCreateData });
        })
        .catch((error) => {
          toast.error(getDefaultError(error?.response?.status));
        })
        .finally(() => {
         
        });
    }
  };

  const handleOnChange = (event: any) => {
    const { value, checked } = event.target;
  
    const placementExists = selectedPlacements.some(
      (selectedPlacement) => selectedPlacement.id === value
    );
  
    const similarIds = markerPlacemnetData?.placements
      ?.filter(
        (placement: any) =>
          placement.size_id ===
          markerPlacemnetData?.placements?.find(
            (placement: any) => placement.id === parseInt(value, 10)
          )?.size_id
      )
      .map((placement: any) => ({ id: placement.id.toString() }));
  
    if (checked && !placementExists) {
      if (markerType === itemLevelMarkerType) {
        setSelectedPlacements((prevSelectedPlacements) => [
          ...prevSelectedPlacements,
          ...similarIds, // Use spread to add individual objects
        ]);
      } else {
        setSelectedPlacements((prevSelectedPlacements) => [
          ...prevSelectedPlacements,
          { id: value },
        ]);
      }
    } else {
      if (markerType === itemLevelMarkerType) {
        setSelectedPlacements((prevSelected: any) =>
          prevSelected.filter(
            (i: any) =>
              !similarIds.some((similarId: any) => similarId.id === i.id)
          )
        );
      } else {
        setSelectedPlacements((prevSelected) =>
          prevSelected.filter(
            (selectedPlacement) => selectedPlacement.id !== value
          )
        );
      }
    }
  };

    const handleCreateNewMarker = () => {
      setIsSaving(true);
      const selectedPlacementIds = selectedPlacements.map((placemnet) => placemnet.id);

      const selectedPlacemnets = {
        marker_id: null as any,
        markerType: markerType,
        placements: selectedPlacementIds
      }
      api.post(POUrls.poClubMarkerCreateURL(clubId, customerBrandMaterialId), selectedPlacemnets).then(resp => {
        const responseData = resp?.data || [];
        if (responseData.success) {
          onMarkerCreatedSuccess();
          toast.success(DEFAULT_SUCCESS);
          // getMarkerMetaData();
        }  
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => {
        setIsSaving(false);
    });
    }

  useEffect(() => {
    if (markerType && itemId && clubId && customerBrandMaterialId) {
      getMarkerMetaData();
    }
  }, [markerType, itemId, clubId, customerBrandMaterialId]);


  useEffect(() => {
    setSelectedPlacements([])
  },[markerType])


  return (
    <>
      <Box sx={{mt: 1, ml: 1}}>
        <Typography variant='h5' sx={{mb: 1}}>Create New Marker</Typography>
      <ToggleButtonGroup
        color="primary"
        value={markerType}
        exclusive
        onChange={handleChange}
        aria-label="Platform">
          <ToggleButton value={itemLevelMarkerType}>Item Level Marker</ToggleButton>
          <ToggleButton value={placementLevelMarkerType}>Placement Level Marker</ToggleButton>
      </ToggleButtonGroup>
      </Box>
      <Box sx={{mt: 3,}}>
        <Typography variant='h6' sx={{mb: 2, ml: 2, mt: 2}}>{markerPlacemnetData?.[displayNameKey]}</Typography>
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
        <TableRow key={placement.id}
           sx={{
            backgroundColor: selectedPlacements.some(
              (selectedPlacement) => selectedPlacement.id.toString() === placement.id.toString()
            ) ? blue[50]
              : 'inherit',
             borderColor: placement.filled_quantity > placement.required_quantity
                  ? blue[500]
                  : placement.required_quantity === placement.filled_quantity
                  ? green[500]
                  : 'inherit'
          }}>
            <TableCell>
              <Checkbox
                value={placement.id.toString()}
                checked={selectedPlacements.some((selectedPlacement) => selectedPlacement.id.toString() === placement.id.toString())}
                onChange={(event) => handleOnChange(event)}
              />
            </TableCell>
            <TableCell>{placement.name}</TableCell>
            <TableCell>
              {placement.required_quantity || 0}
            </TableCell>
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
      <Box sx={{ mt: 5, mr: 2, mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button onClick={() => handleCreateNewMarker()} variant="contained" disabled={isSaving}>
          {isSaving && <SaveSpinner />} Create
        </Button>
      </Box>
        </Box>
    </>
  )
}

export default CreateMarker