import { getDefaultError, hasRole } from '@/helpers/Utilities';
import api from '@/services/api';
import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast';
import * as POUrls from '@/helpers/constants/rest_urls/POUrls';
import DefaultLoader from '@/components/DefaultLoader';
import placementsColors from '@/helpers/purchaseOrder/ColorHelper'
import {
  TableContainer,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Select,
  MenuItem,
  IconButton,
  Box,
  Typography,
  InputLabel,
  Button,
  Card,
  Checkbox,
  Divider,
  Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { green, red } from '@mui/material/colors';
import SaveSpinner from '@/components/SaveSpinner';
import { DEFAULT_SUCCESS } from '@/helpers/constants/Constants';
import FormErrorMessage from '@/components/FormErrorMessage';
import RitzSwitch from '@/components/Ritz/RitzSwitch';
import RitzMultipleFileUploader from '@/components/Ritz/RitzMultipleFileUploader';
import { LISTVIEW } from '@/helpers/constants/FileUpload';
import { ReactKeyHelper } from "@/helpers/KeyHelper";
import RitzInput from '@/components/Ritz/RitzInput';
import EditIcon from '@mui/icons-material/Edit';
import ClearIcon from '@mui/icons-material/Clear';
import CheckIcon from '@mui/icons-material/Check';
import * as poUrls from "@/helpers/constants/rest_urls/POUrls";
import RitzSelection from '@/components/Ritz/RitzSelection';
import RitzModal from '@/components/Ritz/RitzModal';
import MarkerPoints from './MarkerPoints';
import { MERCHANT_ADMIN } from '@/helpers/constants/RoleManager';


const PORatioBreakDown = ({ itemId, markerClassification, clubId, customerBrandMaterialId, selectedMarkerId, onMarkerCadChangesSuccess, openEditMarkerModal, openEditCadInfoModal, onRefresh }: any) => {

  const consumptionRatioKey = 'consumption_ratio';
  const areaKey = 'area';
  const ratioKey = 'ratio';
  const wastageKey = 'wastage';
  const pliesKey = 'number_of_plies';
  const widthKey = 'width';
  const markerClassificationKey = 'marker_classification';
  const placementDataKey = 'placement_data';
  const ratioDataKey = 'ratio_data';
  const placementsKey = 'placements';
  const attachmentsKey = 'attachments';
  const markerPlacementIdKey = 'marker_placement_id';
  const poPackItemIdKey = 'po_pack_item_id'
  const poPackItemPlacementIdKey = 'po_pack_item_placement_id';
  const consumptionErrorKey = 'consumption_errors';
  const markerErrorKey = 'marker_errors';
  const statusErrorKey = 'status_errors';
  const statusKey = 'complete_status';
  const areaErrorKey = 'area_errors';
  const ratioErrorKey = 'ratio_errors';
  const reviewedStatusKey = 'reviewed';
  const packItemMaxValueKey = 'pack_item_max_value';
  const relatedMarkersKey = 'related_markers';
  const modalOpenKey = 'modalOpen';
  const isDisabledKey = 'disabled';
  const derivedMarkersKey = 'derived_markers';
  const markerPointsKey = 'marker_points'
  const markerLengthUnitKey = 'marker_length_unit'
  const markerLengthKey = 'marker_length'
  const markerPointUnitKey = 'marker_point_unit'

  const randomColors = placementsColors[Math.floor(Math.random() * placementsColors.length)];

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [widthDetails, setWidthDetails] = useState<any>([]);
  const [markerClassifications, setMarkerClassifications] = useState<any>([]);
  const [standardLengthUnits, setStandardLengthUnits] = useState<any>([]);
  const [errors, setErrors] = useState<any>({});
  const [ratioForRow, setRatioForRow] = useState<Array<{ value: string, rowIndex: number }>>([]);
  const [selectedFileIds, setSelectedFileIds] = useState([]);
  const [completedMarkerStatus, setCompletedMarkerStatus] = useState(false);
  const [isMarkerPlacementMoved, setIsMarkerPlacementMoved] = useState(false)
  const [toAddPlacemnetToExistingMarker, setToAddPlacemnetToExistingMarker] = useState({ [modalOpenKey]: false });
  const [selectedRelatedMarker, setSelectedRelatedMarker] = useState(0);
  const [headerAndRowIndex, setHeaderAndRowIndex] = useState({ headerIndex: -1, rowIndex: -1 });
  const [incompletePlacements, setIncompletePlacements] = useState<any>({});
  const [markerCadDetails, setMarkerCadDetails] = useState<any>({
    [consumptionRatioKey]: null,
    [pliesKey]: null,
    [wastageKey]: null,
    [widthKey]: null,
    [derivedMarkersKey]: [] as any,
    [markerPointsKey]: [] as any
  });
  const [createMarkerSaving, setCreateMarkerSaving] = useState(false);
  const [addPlacementToMarkerOpening, setAddPlacementToMarkerOpening] = useState(false);
  const [addPlacementToMarkerSaving, setAddPlacementToMarkerSaving] = useState(false);
  const [createMarkerErrors, setCreateMarkerErrors] = useState<any>([]);
  const [relatedMarkers, setRelatedMarkers] = useState<any>([]);
  const [selectedMarkerPlacementIds, setSelectedMarkerPlacementIds] = useState([]);
  const canEdit = hasRole(MERCHANT_ADMIN);
  const [showIcons, setShowIcons] = useState(true);

  const fileLocation = `costing/consumption/fabricmaterial`;
  const keyHelper = new ReactKeyHelper();

  const regex = /^[0-9]{1,3}$/;

  const handlePlacementInputChange = (event: any) => {
    const { name, value } = event.target;
    setMarkerCadDetails((prevDetails: any) => ({
      ...prevDetails,
      [name]: value,
    }));
  };

  const toggleIconsVisibility = () => {
    setShowIcons((prev) => !prev); // Toggle visibility
  };

  const handleFileChange = (event: any) => {
    const fileIds = event.map((file: any) => file.id)
    const updatedMarkerAttachments = [...event];
    setMarkerCadDetails((prevDetails: any) => ({
      ...prevDetails,
      [attachmentsKey]: updatedMarkerAttachments,
    }));
    setSelectedFileIds(event)
  };
  const handleOtherWidthFileChange = (event: any, otherWidthIndex: any) => {
    const fileIds = event.map((file: any) => file.id)
    const updatedOtherWidths = [...markerCadDetails.derived_markers];
    const updatedMarkerAttachments = [...event];
    updatedOtherWidths[otherWidthIndex].attachments = updatedMarkerAttachments;
    setMarkerCadDetails({
      ...markerCadDetails,
      derived_markers: updatedOtherWidths
    });


  };
  // console.log(markerCadDetails,"markerCadDetails")
  const handleRatioInputChanges = (event: any, markerPlacementId: number, placements: any) => {
    const selectedMarkerPlacemnetId = placements?.[placementsKey]?.[markerPlacementId]?.[markerPlacementIdKey];
    const { name, value } = event.target;
    if (regex.test(value) && name === 'ratio' || name != 'ratio') {
      const updatedRatioData = (markerCadDetails?.[ratioDataKey] || []).map((item: any) => {
        if (
          item.placements &&
          item.placements[markerPlacementId] &&
          item.placements[markerPlacementId]['marker_placement_id'] === selectedMarkerPlacemnetId
        ) {
          item.placements[markerPlacementId][name] = parseFloat(value);
          item.savedValue = parseFloat(value);
        }
        return item;
      });

      setMarkerCadDetails((prevDetails: any) => ({
        ...prevDetails,
        [ratioDataKey]: updatedRatioData,
      }));
    }
  };

  const handleIncompletePlacementRatioChange = (event: any, placementData: any, prevRatio: number) => {
    const { name, value } = event.target
    setIncompletePlacements((prevIncompletedPlacement: any) => {
      return {
        ...prevIncompletedPlacement,
        [placementData.marker_placement_id]: {
          ...prevIncompletedPlacement[placementData.marker_placement_id],
          [name]: Number(value),
        },
      };
    });
  }
  const updateIncompleteData = (packItemPlacements: any) => {
    const ratioValues = Object.values(packItemPlacements).map((placementDetail: any) => placementDetail?.[ratioKey]);
    const highestRatio = Math.max(...ratioValues);

    const unFilledPlacements = Object.values(packItemPlacements).filter((packItemPlacement: any) => packItemPlacement?.[ratioKey] < highestRatio);
    const updatedUnfilledPlacements = unFilledPlacements.map((placement: any) => ({
      ...placement,
      ratio: highestRatio - placement.ratio
    }));

    let filteredIncompletePlacements = {} as any;
    updatedUnfilledPlacements.forEach((unFilledPlacement, index) => {
      unFilledPlacement['max_ratio'] = highestRatio;
      filteredIncompletePlacements[unFilledPlacement[markerPlacementIdKey]] = unFilledPlacement;
    });

    let incompletePlacementsCopy = { ...incompletePlacements } as any;

    Object.values(packItemPlacements).forEach((packItemPlacement: any) => {

      if (incompletePlacements[packItemPlacement[markerPlacementIdKey]]) {
        delete incompletePlacementsCopy[packItemPlacement[markerPlacementIdKey]];
      }
    });
    setIncompletePlacements({ ...incompletePlacementsCopy, ...filteredIncompletePlacements });
  }

  const handlePlacementChange = (headerIndex: number, rowIndex: number, changedMarkerPlacemnetId: number, newValue: any, currentValue: number) => {
    const changedValue = newValue
    if (regex.test(changedValue) || changedValue === '') {
      // const ratioDifference = currentValue - changedValue
      let updatedPackItemPlacementData;
      const updatedMarkerCadDetails = JSON.parse(JSON.stringify(markerCadDetails));
      // const updatedMarkerCadDetails2 = JSON.parse(JSON.stringify(markerCadDetails));
      // const _ = require('lodash');
      // const updatedMarkerCadDetails = _.cloneDeep(markerCadDetails);
      // const updatedMarkerCadDetails2 = _.cloneDeep(markerCadDetails);
      updatedMarkerCadDetails?.[ratioDataKey]?.forEach((item: any, itemIndex: number) => {
        const placementId = markerCadDetails.placement_data[headerIndex].id;
        const markerPlacementId = item.placements?.[placementId]?.marker_placement_id;
        if (markerPlacementId === changedMarkerPlacemnetId) {
          updatedMarkerCadDetails.ratio_data[itemIndex].placements[placementId].ratio = changedValue;
          updatedPackItemPlacementData = updatedMarkerCadDetails.ratio_data[itemIndex].placements;
          // const updatedPlacementId = markerCadDetails.ratio_data[itemIndex].placements[placementId].order_placement_id;
          // updatedPackItemPlacementData[updatedPlacementId].ratio = ratioDifference

        }
      });
      updateIncompleteData(updatedPackItemPlacementData);

      setMarkerCadDetails(updatedMarkerCadDetails);
      setHeaderAndRowIndex({ headerIndex: headerIndex + 1, rowIndex });
    }
  };

  const handleSingleRatioForAllRowRatio = (event: any, previousValue: number, rowIndex: any, poPackItemId: number) => {
    const { value } = event.target;
    
    // Allow empty value or any positive number
    if (value === '' || (!isNaN(value) && Number(value) >= 0)) {
      setRatioForRow((prevValues) => {
        const updatedValues = [...prevValues];
        updatedValues[rowIndex] = { value, rowIndex };
        return updatedValues;
      });
  
      setMarkerCadDetails((prevDetails: any) => {
        const updatedDetails = { ...prevDetails };
  
        if (updatedDetails && updatedDetails[ratioDataKey]) {
          const updatedRatioData = updatedDetails[ratioDataKey].map((cadItem: any) => {
            if (cadItem.po_pack_item_id === poPackItemId) {
              const updatedPlacements = { ...cadItem.placements };
  
              Object.keys(updatedPlacements).forEach((key) => {
                updatedPlacements[key].ratio = value === '' ? null : Number(value);
              });
  
              return {
                ...cadItem,
                placements: updatedPlacements,
              };
            }
            return cadItem;
          });
  
          updatedDetails[ratioDataKey] = updatedRatioData;
          return updatedDetails;
        }
        return prevDetails;
      });
  
      setHeaderAndRowIndex({ headerIndex: 0, rowIndex });
    }
  };

  const handleAddClick = (headerIndex: number, rowIndex: number, changedMarkerPlacementId: any, currentValue: any) => {
    const valueToAdd = currentValue === null ? 1 : currentValue + 1;
    if (regex.test(valueToAdd) || valueToAdd === '') {
      handlePlacementChange(headerIndex, rowIndex, changedMarkerPlacementId, valueToAdd, currentValue);
    }

  };

  const handleRemoveClick = (headerIndex: number, rowIndex: number, changedMarkerPlacementId: any, currentValue: any) => {
    if (regex.test(currentValue) || currentValue === '') {
      if (currentValue > 0) {
        const newValue = Math.max(0, currentValue - 1);
        handlePlacementChange(headerIndex, rowIndex, changedMarkerPlacementId, newValue, currentValue);
      } else {
        const newValue = Math.max(0, 0);
        handlePlacementChange(headerIndex, rowIndex, changedMarkerPlacementId, newValue, currentValue);
      }
    }
  };

  const getMarkerCadData = () => {
    setIsLoading(isMarkerPlacementMoved ? false : true);
    const requests = [
      api.get(POUrls.poClubMarkerCadDetailsURL(selectedMarkerId)),
      api.get(POUrls.poClubMarkerWidthListURL(clubId, customerBrandMaterialId)),
      api.get(POUrls.consumptionUnitsUrl()),
      api.get(POUrls.poClubMarkerClassificationListURL()),
    ];
    Promise.all(requests).then(resp => {
      const respData = resp?.map((r: any) => r.data);
      const [markerCadDetails, widthData, unitsData, markerClassification] = respData;
      setMarkerCadDetails({ ...markerCadDetails })    
      setWidthDetails(widthData)
      setStandardLengthUnits(unitsData.standard_length_units)
      setCompletedMarkerStatus(markerCadDetails?.[reviewedStatusKey]);
      setMarkerClassifications([...markerClassification])
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => setIsLoading(false));
  }

  const handleSaveMarkerCadDetails = () => {
    setIsSaving(isMarkerPlacementMoved ? false : true);
    const placementsData = markerCadDetails?.ratio_data?.map((item: any) => {
      const placements = Object.values(item?.placements || {}).map((placement: any) => ({
        id: placement.marker_placement_id,
        area: placement.area,
        ratio: placement.ratio,
      }));

      return placements;
    });

    const flattenedPlacements = placementsData?.flat() || [];

    const attachmentIds = markerCadDetails?.[attachmentsKey]?.map((attachment: any) => attachment.id);

    const updatedCadData = {
      'consumption_ratio': markerCadDetails.consumption_ratio || null,
      'wastage': markerCadDetails.wastage || null,
      'width': markerCadDetails.width || null,
      'number_of_plies': markerCadDetails.number_of_plies || null,
      'reviewed': completedMarkerStatus ,
      'placements': flattenedPlacements,
      'attachments': markerCadDetails.attachments,
      'marker_points': markerCadDetails.marker_points,
      'marker_length': markerCadDetails.marker_length || null,
      'marker_length_unit': markerCadDetails.marker_length_unit || null,
      'marker_point_unit': markerCadDetails.marker_point_unit || null,
      'deleted_marker_point_ids': deletedMarkerPointIds,
      'derived_markers': markerCadDetails.derived_markers,
      'marker_classification': markerCadDetails.marker_classification,

    }

    try {
      api.post(POUrls.poClubMarkerCadDataSaveURL(clubId, selectedMarkerId), updatedCadData).then(resp => {
        const responseData = resp?.data || [];
        if (responseData.success) {
          if (!isMarkerPlacementMoved) {
            getMarkerCadData();
          }
          toast.success(DEFAULT_SUCCESS);
          onMarkerCadChangesSuccess(true);
          onRefresh();
          setErrors({})
        
      }
     
    })
    .catch((error) => {
      toast.error(getDefaultError(error?.response?.status));
      if (error?.response?.data) {
        setErrors(error.response.data);
      }
      setCompletedMarkerStatus(markerCadDetails?.[reviewedStatusKey]);
    })
    .finally(() => {
      setIsSaving(false);
      setIsMarkerPlacementMoved(false);
    });
  } catch (error) {
    console.error("Unexpected error occurred:", error);
  }
};

  const handleMarkerReviewedAction = (event: any) => {
    setCompletedMarkerStatus(event.target.checked);
  }
  const handleDerivedMarkerReviewedAction = (event: any, otherWidthIndex: any) => {
    const updatedOtherWidths = [...markerCadDetails.derived_markers];
    updatedOtherWidths[otherWidthIndex] = {
      ...updatedOtherWidths[otherWidthIndex],
      reviewed: event.target.checked
    };
    setMarkerCadDetails({
      ...markerCadDetails,
      derived_markers: updatedOtherWidths
    });
  }
  

  useEffect(() => {
    if (selectedMarkerId > 0 && clubId > 0) {
      getMarkerCadData()
    }
  }, [selectedMarkerId, clubId])

  const getCellRatioSquares = (numSquares: any, rowRatioValue: any) => {
    const squaresPerRow = 4;
    const squares = Array.from({ length: numSquares }, (_, index) => {
      const assignedRatio = index + 1;
      return (
        <>
        {/* Conditional Rendering of Icons */}
        {showIcons && (
          assignedRatio <= rowRatioValue ? (
            <CheckIcon sx={{ 'color': 'green', 'border': 'solid 1px green', 'width': '15px', 'height': '15px', 'margin': '2px' }} />
          ) : (
            <ClearIcon sx={{ 'color': 'red', 'border': 'solid 1px red', 'width': '15px', 'height': '15px', 'margin': '2px' }} />
          )
        )}
      </>
      );
    });

    const rows = [];
    for (let i = 0; i < squares.length; i += squaresPerRow) {
      rows.push(squares.slice(i, i + squaresPerRow));
    }

    return (
      <>
        <Box>
          {rows.map((row, index) => (
            <Box key={index}>{row}</Box>
          ))}
        </Box>
      </>
    );
  }

  const renderRatioCountOnSquares = (rowData: any, placement: any) => {
    const placements = rowData?.placements;

    const packitemId = rowData.po_pack_item_id;
    const rowRatio = placements?.[placement?.id]?.[ratioKey];

    if (!placements) {
      return null;
    }
    const ratioValues = Object.values(placements).map((placementDetail: any) => placementDetail?.[ratioKey]);
    const highestRatio = Math.max(...ratioValues);

    return getCellRatioSquares(highestRatio, rowRatio)
  };

  const handleCheckBoxOnClick = (event: any, placementData: any) => {
    const checked = event?.target?.checked;
    let data = [...selectedMarkerPlacementIds];
    if (checked) {

      let ratio = null;
      if (placementData?.['max_ratio'] && placementData?.[ratioKey]) {
        ratio = placementData['max_ratio'] - placementData[ratioKey];
      }

      data.push({
        [poPackItemPlacementIdKey]: placementData[poPackItemPlacementIdKey],
        [markerPlacementIdKey]: placementData[markerPlacementIdKey],
        [areaKey]: placementData[areaKey],
        [ratioKey]: placementData[ratioKey]

      });
    } else {
      data = data.filter((selectedPlacement: any) => selectedPlacement[markerPlacementIdKey] != placementData[markerPlacementIdKey]);
    }
    setSelectedMarkerPlacementIds(data);
  }

  const refreshRelatedMarkerData = () => {
    const markerUrl = poUrls.poClubMarkerCadDetailsURL(selectedMarkerId);
    api.get(markerUrl).then(resp => {

      const details = { ...markerCadDetails, [relatedMarkersKey]: resp?.data?.[relatedMarkersKey] || [] };
      setMarkerCadDetails({ ...details })
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    });
  }

  const openMarkerCadInfoModal = (selectedMaterialId: any, selectedMarkerId: any) => {
    openEditCadInfoModal(selectedMaterialId, selectedMarkerId)
  }

  const openMarkerEditPlacemnetModal = (selectedMaterialId: any, selectedMarkerId: any) => {
    openEditMarkerModal(selectedMaterialId, selectedMarkerId)
  }

  const handleCreateSubMarkerCreate = () => {
    setCreateMarkerSaving(true);
    const url = poUrls.poClubSubMarkerCreateURL(selectedMarkerId);
    const data = { 'marker_placements': selectedMarkerPlacementIds };

    if (selectedMarkerPlacementIds.length > 0) {

      api.post(url, data).then(resp => {
        const responseData = resp?.data || [];
        if (responseData.success) {
          refreshRelatedMarkerData();
          onMarkerCadChangesSuccess(true);
          setIsMarkerPlacementMoved(true)
          handleSaveMarkerCadDetails()
          selectedMarkerPlacementIds.forEach((selectedCreateMarkerPlacementId: any) => {

            delete incompletePlacements[selectedCreateMarkerPlacementId[markerPlacementIdKey]];
          });
          setSelectedMarkerPlacementIds([]);
        }
      }).catch(error => {
        toast.error(getDefaultError(error?.response?.status));
        if (error?.response?.data) {
          const errors = error?.response?.data?.errors
          setCreateMarkerErrors(errors);
        }
      }).finally(() => {
        setCreateMarkerSaving(false);
        getMarkerCadData()
      });

    } else {
      toast.error("Please select at least one placement to create a new marker");
      setCreateMarkerSaving(false);
    }
  }

  const handleAddToExistingMarker = () => {
    setAddPlacementToMarkerSaving(true)
    const url = poUrls.addPlacementsToExistingMarkerURL(selectedMarkerId);
    const data = {
      marker_id: selectedRelatedMarker,
      po_placements: selectedMarkerPlacementIds.map((placement) => {
        const { area, ratio, po_pack_item_placement_id } = placement;
        return {
          po_pack_item_placement_id,
          area,
          ratio,
        };
      }),
    }

    if (selectedRelatedMarker > 0) {
      api.post(url, data).then(resp => {
        const respData = resp?.data || [];
        if (respData.status = 'Successfully Created') {
          setToAddPlacemnetToExistingMarker({ [modalOpenKey]: false });
          refreshRelatedMarkerData()
          // getMarkerCadData()
          setIsMarkerPlacementMoved(true)
          handleSaveMarkerCadDetails()
        }
      }).catch(error => {
        toast.error(getDefaultError(error?.response?.status));
      }).finally(() => {
        setAddPlacementToMarkerSaving(false)
        setSelectedRelatedMarker(0)
        setSelectedMarkerPlacementIds([])
        setIncompletePlacements({})
      })
    } else {
      toast.error("Please select any related marker for add placements")
    }
  }

  const handleRelatedMarkerSelect = (event: any) => {
    const { name, value } = event.target;
    setSelectedRelatedMarker(value);
  }

  const addToExistingMarkerModalClose = () => {
    setToAddPlacemnetToExistingMarker({ [modalOpenKey]: false });
  }
  const handleAddToExistingMarkerButtonClick = () => {
    try {
      setAddPlacementToMarkerOpening(true)
      if (selectedMarkerPlacementIds.length > 0) {
        setToAddPlacemnetToExistingMarker({ [modalOpenKey]: true });
      } else {
        toast.error("Please select at least one placement to add to a existing marker");
      }
    } finally {
      setAddPlacementToMarkerOpening(false)
    }
  }


  const uniqueColorwayIds = [...new Set(markerCadDetails?.[ratioDataKey]?.map((item: any) => item?.po_colorway_id).filter(Boolean).map(String))];
  let suffleedColors = placementsColors[Math.floor(Math.random() * placementsColors.length)];
  const colorwayIdColorMap = Object.fromEntries(uniqueColorwayIds.map((id, index) => [id, placementsColors[index % placementsColors.length]]));

  const getMissingPlacementsUI = () => {
    return (
      Object.values(incompletePlacements).length > 0 && (
        <>
          <Box style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant={'h4'}>Create Markers</Typography>
            <Box>
              <Button variant="contained" onClick={handleAddToExistingMarkerButtonClick} disabled={createMarkerSaving}>
                {addPlacementToMarkerSaving && <SaveSpinner />} Add To Existing Marker
              </Button>
              <Button variant="contained" onClick={handleCreateSubMarkerCreate} disabled={createMarkerSaving} sx={{ ml: 1 }}>
                {createMarkerSaving && <SaveSpinner />} Create Marker
              </Button>
            </Box>
          </Box>
          <TableContainer sx={{ border: '1px solid rgba(0, 0, 0, 0.06)', mt: 2 }}>
            <Table >
              <TableHead>
                <TableRow sx={{ backgroundColor: (theme) => theme.palette.grey[100] }}>
                  <TableCell sx={{ width: '1%' }}></TableCell>
                  <TableCell>
                    Placements
                  </TableCell>
                  <TableCell sx={{ width: '14%' }}>
                    Ratio
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>

                {Object.values(incompletePlacements).map((incompletePlacement: any) => (
                  <TableRow key={incompletePlacement?.['po_pack_item_placement_id']}>
                    <TableCell>
                      <Checkbox onClick={(event: any) => { handleCheckBoxOnClick(event, incompletePlacement) }} />
                    </TableCell>
                    <TableCell>{incompletePlacement['placement_display']}
                    </TableCell>
                    <TableCell>
                      <RitzInput
                        inputType={'number'}
                        name={'ratio'}
                        selectedValue={incompletePlacement['ratio'] || 0}
                        handleOnChange={(event: any) => handleIncompletePlacementRatioChange(event, incompletePlacement, incompletePlacement['ratio'])}
                        size={'small'}
                        fullWidth
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ mt: 2 }}>
            <FormErrorMessage message={createMarkerErrors} />
          </Box>
        </>
      )
    )
  }

  useEffect(() => {
    if (toAddPlacemnetToExistingMarker) {
      api.get(poUrls.relatedMarkersListURL(clubId, customerBrandMaterialId, selectedMarkerId)).then(resp => {
        const respData = resp?.data
        setRelatedMarkers(respData)
      }).catch(error => {
        toast.error(getDefaultError(error?.response?.status));
      })
    }
  }, [toAddPlacemnetToExistingMarker])

  const units = [{ id: 1, name: 'Mtrs' }, { id: 2, name: 'Pcs' }]

  const handleOtherWidthsInputChange = (event: any, otherWidthIndex: number) => {
    const { name, value } = event.target;
    const updatedOtherWidths = [...markerCadDetails.derived_markers];
    updatedOtherWidths[otherWidthIndex] = {
      ...updatedOtherWidths[otherWidthIndex],
      [name]: value || null
    };
    setMarkerCadDetails({
      ...markerCadDetails,
      derived_markers: updatedOtherWidths
    });
  };
  const handleMarkerPoints = (data: any, otherWidthIndex: any) => {
    const updatedDerivedMarkers = [...markerCadDetails.derived_markers];
    updatedDerivedMarkers[otherWidthIndex] = {
      ...updatedDerivedMarkers[otherWidthIndex],
      marker_points: data || null
    };
    setMarkerCadDetails({ ...markerCadDetails, derived_markers: updatedDerivedMarkers });
  };
  const [deletedMarkerPointIds, setdeletedMarkerPointIds] = useState<any>([])

  const handleChangeDeleteMarkerPoints = (deletedId: any) => {
    const updatedDefectIds = [...deletedMarkerPointIds];
    updatedDefectIds.push(deletedId);
    setdeletedMarkerPointIds(updatedDefectIds);
  };

  const handleMainMarkerPoints = (data: any) => {
    setMarkerCadDetails({ ...markerCadDetails, marker_points: data });
  };


  return (
    <>
      {toAddPlacemnetToExistingMarker && (
        <RitzModal open={toAddPlacemnetToExistingMarker?.[modalOpenKey]} onClose={addToExistingMarkerModalClose} title={'Add Placements To Existing Marker'} maxWidth='sm'>
          Please select any related marker to add placements
          <Divider sx={{ mt: 2, mb: 3 }} />
          <Box sx={{ width: '50%' }}>
            <RitzSelection
              id={'id'}
              name={'marker_name'}
              optionValue={'id'}
              optionText={'marker_name'}
              size={'small'}
              selectedValue={selectedRelatedMarker || ''}
              isRequired={true}
              options={relatedMarkers}
              handleOnChange={handleRelatedMarkerSelect}
            >
            </RitzSelection>
          </Box>
          <Button variant='contained' sx={{ mt: 4, float: 'right' }} onClick={handleAddToExistingMarker}>{isSaving && <SaveSpinner />} Add</Button>
        </RitzModal>)}
      {isLoading ? <DefaultLoader /> : <>
        <Typography sx={{ fontWeight: 'bold' }}>{`Main Marker :`}</Typography>
        <Card variant="outlined" sx={{ mb: 2, mt: 1 }}>
          <TableContainer aria-label="simple table">
            <Table sx={{ border: (theme) => theme.palette.grey[100] }}>
              <TableBody>
                <TableRow>
                  <TableCell>Marker Classification</TableCell>
                  <TableCell sx={{ width: '40%' }}>
                    <Box sx={{ float: 'right', width: '50%' }}>
                      <RitzSelection
                        id={'marker_classification'}
                        name={'marker_classification'}
                        optionValue={'id'}
                        optionText={'name'}
                        size={'small'}
                        selectedValue={markerCadDetails?.[markerClassificationKey] || ''}
                        isRequired={true}
                        options={markerClassifications}
                        handleOnChange={handlePlacementInputChange}
                        isReadOnly={completedMarkerStatus && canEdit}></RitzSelection>
                    </Box>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Consumption Ratio</TableCell>
                  <TableCell sx={{ width: '40%' }}>
                    <Box sx={{ float: 'right', width: '50%' }}>
                      <RitzInput
                        inputType={'number'}
                        name={'consumption_ratio'}
                        selectedValue={markerCadDetails?.[consumptionRatioKey] || ''}
                        handleOnChange={handlePlacementInputChange}
                        fullWidth
                        size={'small'}
                        isReadOnly={completedMarkerStatus}
                      />
                      <FormErrorMessage message={errors?.[markerErrorKey]?.[selectedMarkerId]?.[consumptionRatioKey]} />
                    </Box>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Wastage</TableCell>
                  <TableCell>
                    <Box sx={{ float: 'right', width: '50%' }}>
                      <RitzInput
                        inputType={'number'}
                        name={'wastage'}
                        selectedValue={markerCadDetails?.[wastageKey] || ''}
                        handleOnChange={handlePlacementInputChange}
                        size={'small'}
                        fullWidth
                        isReadOnly={completedMarkerStatus}
                      />
                      <FormErrorMessage message={errors?.[markerErrorKey]?.[selectedMarkerId]?.[wastageKey]} />
                    </Box>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Number of Plies</TableCell>
                  <TableCell sx={{ verticalAlign: 'top' }}>
                    <Box sx={{ float: 'right', width: '50%' }}>
                      <RitzInput
                        inputType={'number'}
                        name={'number_of_plies'}
                        selectedValue={markerCadDetails?.['number_of_plies'] || ''}
                        handleOnChange={handlePlacementInputChange}
                        fullWidth
                        size={'small'}
                        isReadOnly={completedMarkerStatus}
                      />
                      <FormErrorMessage message={errors?.[markerErrorKey]?.[selectedMarkerId]?.[pliesKey]} />
                    </Box>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Width</TableCell>
                  <TableCell sx={{ verticalAlign: 'top' }}>
                    <Box sx={{ float: 'right', width: '50%' }}>
                      <RitzSelection
                        id={'id'}
                        name={'width'}
                        optionValue={'id'}
                        optionText={'display_name'}
                        size={'small'}
                        selectedValue={markerCadDetails?.[widthKey] || ''}
                        isRequired={true}
                        options={widthDetails}
                        handleOnChange={handlePlacementInputChange}
                        isReadOnly={completedMarkerStatus}></RitzSelection>
                      <FormErrorMessage message={errors?.[markerErrorKey]?.[selectedMarkerId]?.[widthKey]} />
                    </Box>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Marker Length</TableCell>
                  <TableCell sx={{ verticalAlign: 'top' }}>
                    <Box sx={{ float: 'right', width: '50%' }}>
                      <RitzInput
                        inputType={'number'}
                        name={'marker_length'}
                        selectedValue={markerCadDetails?.['marker_length'] || ''}
                        handleOnChange={handlePlacementInputChange}
                        fullWidth
                        size={'small'}
                        isReadOnly={completedMarkerStatus}
                      />
                      <FormErrorMessage message={errors?.[markerErrorKey]?.[selectedMarkerId]?.[markerLengthKey]} />
                    </Box>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Marker Length Unit</TableCell>
                  <TableCell sx={{ verticalAlign: 'top' }}>
                    <Box sx={{ float: 'right', width: '50%' }}>
                      <RitzSelection
                        id={'id'}
                        name={'marker_length_unit'}
                        optionValue={'value'}
                        optionText={'display_value'}
                        size={'small'}
                        selectedValue={markerCadDetails?.['marker_length_unit'] || ''}
                        isRequired={true}
                        options={standardLengthUnits}
                        handleOnChange={handlePlacementInputChange}
                        isReadOnly={completedMarkerStatus}></RitzSelection>
                      <FormErrorMessage message={errors?.[markerErrorKey]?.[selectedMarkerId]?.[markerLengthUnitKey]} />
                    </Box>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Marker Point Unit</TableCell>
                  <TableCell sx={{ verticalAlign: 'top' }}>
                    <Box sx={{ float: 'right', width: '50%' }}>
                      <RitzSelection
                        id={'id'}
                        name={'marker_point_unit'}
                        optionValue={'value'}
                        optionText={'display_value'}
                        size={'small'}
                        selectedValue={markerCadDetails?.['marker_point_unit'] || ''}
                        isRequired={true}
                        options={standardLengthUnits}
                        handleOnChange={handlePlacementInputChange}
                        isReadOnly={completedMarkerStatus}></RitzSelection>
                      <FormErrorMessage message={errors?.[markerErrorKey]?.[selectedMarkerId]?.[widthKey]} />
                    </Box>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Attachments</TableCell>
                  <TableCell>
                    <Box sx={{ float: 'right' }}>
                      <RitzMultipleFileUploader
                        displayType={LISTVIEW}
                        selectedFilesParent={markerCadDetails?.[attachmentsKey] || []}
                        handleFileChangeParent={(event: any) => handleFileChange(event)}
                        filelocation={fileLocation}
                        isReadOnly={completedMarkerStatus}
                      />
                    </Box>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
          {markerCadDetails?.['marker_point_unit'] &&(
            <Card sx={{ ml: 1, mt: 1, mr: 1, mb: 1, border: '1px solid #e0e0e0' }}>
            <MarkerPoints markerPointsData={markerCadDetails.marker_points} handleChangeMarkerPoints={handleMainMarkerPoints} handleChangeDeletedIds={handleChangeDeleteMarkerPoints} errors={errors?.marker_point_errors?.[markerCadDetails?.marker_id]?.marker_point_errors} completedMarkerStatus={completedMarkerStatus} />
          </Card>
          )}
          
        </Card>

        {markerCadDetails?.derived_markers?.map((otherWidth: any, otherWidthIndex: number) => (
          <Box>
            <Typography sx={{ fontWeight: 'bold' }}>{`${otherWidth.marker_name} - Marker :`}</Typography>
            <Card variant="outlined" sx={{ mb: 2, mt: 1 }} key={otherWidthIndex}>
              <TableContainer aria-label="simple table">
                <Table sx={{ border: (theme) => theme.palette.grey[100] }}>
                  <TableBody>
                  <TableRow>
                  <TableCell>Consumption Ratio</TableCell>
                  <TableCell sx={{ width: '40%' }}>
                    <Box sx={{ float: 'right', width: '50%' }}>
                      <RitzInput
                        inputType={'number'}
                        name={'consumption_ratio'}
                        selectedValue={otherWidth?.[consumptionRatioKey] || null}
                        handleOnChange={(e: any) => handleOtherWidthsInputChange(e, otherWidthIndex)}
                        fullWidth
                        size={'small'}
                        isReadOnly={completedMarkerStatus}
                      />
                      <FormErrorMessage message={errors?.[markerErrorKey]?.[otherWidth?.marker_id]?.[consumptionRatioKey]} />
                    </Box>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Wastage</TableCell>
                  <TableCell>
                    <Box sx={{ float: 'right', width: '50%' }}>
                      <RitzInput
                        inputType={'number'}
                        name={'wastage'}
                        selectedValue={otherWidth?.[wastageKey] || ''}
                        handleOnChange={(e: any) => handleOtherWidthsInputChange(e, otherWidthIndex)}
                        size={'small'}
                        fullWidth
                        isReadOnly={completedMarkerStatus}
                      />
                      <FormErrorMessage message={errors?.[markerErrorKey]?.[otherWidth?.marker_id]?.[wastageKey]} />
                    </Box>
                  </TableCell>
                </TableRow>
                    <TableRow>
                      <TableCell>Width</TableCell>
                      <TableCell sx={{ verticalAlign: 'top' }}>
                        <Box sx={{ float: 'right', width: '50%' }}>
                          <RitzSelection
                            id={'id'}
                            name={'width'}
                            optionValue={'id'}
                            optionText={'display_name'}
                            size={'small'}
                            selectedValue={otherWidth?.[widthKey] || ''}
                            isRequired={true}
                            options={widthDetails}
                            isReadOnly={true}
                            handleOnChange={(e: any) => handleOtherWidthsInputChange(e, otherWidthIndex)}></RitzSelection>
                          <FormErrorMessage message={errors?.[markerErrorKey]?.[otherWidth?.marker_id]?.[widthKey]} />
                        </Box>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Marker Length</TableCell>
                      <TableCell sx={{ verticalAlign: 'top' }}>
                        <Box sx={{ float: 'right', width: '50%' }}>
                          <RitzInput
                            inputType={'number'}
                            name={'marker_length'}
                            selectedValue={otherWidth?.['marker_length'] || ''}
                            handleOnChange={(e: any) => handleOtherWidthsInputChange(e, otherWidthIndex)}
                            fullWidth
                            isReadOnly={completedMarkerStatus}
                            size={'small'}
                          />
                         <FormErrorMessage message={errors?.[markerErrorKey]?.[otherWidth?.marker_id]?.[markerLengthKey]} />
                        </Box>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Marker Length Unit</TableCell>
                      <TableCell sx={{ verticalAlign: 'top' }}>
                        <Box sx={{ float: 'right', width: '50%' }}>
                          <RitzSelection
                            id={'id'}
                            name={'marker_length_unit'}
                            optionValue={'value'}
                            optionText={'display_value'}
                            size={'small'}
                            selectedValue={otherWidth?.['marker_length_unit'] || ''}
                            isRequired={true}
                            options={standardLengthUnits}
                            isReadOnly={completedMarkerStatus}
                            handleOnChange={(e: any) => handleOtherWidthsInputChange(e, otherWidthIndex)}></RitzSelection>
                         <FormErrorMessage message={errors?.[markerErrorKey]?.[otherWidth?.marker_id]?.[markerLengthUnitKey]} />
                        </Box>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Marker Point Unit</TableCell>
                      <TableCell sx={{ verticalAlign: 'top' }}>
                        <Box sx={{ float: 'right', width: '50%' }}>
                          <RitzSelection
                            id={'id'}
                            name={'marker_point_unit'}
                            optionValue={'value'}
                            optionText={'display_value'}
                            size={'small'}
                            selectedValue={otherWidth?.['marker_point_unit'] || ''}
                            isRequired={true}
                            options={standardLengthUnits}
                            handleOnChange={(e: any) => handleOtherWidthsInputChange(e, otherWidthIndex)}
                            isReadOnly={completedMarkerStatus}></RitzSelection>
                          <FormErrorMessage message={errors?.marker_point_unit_errors?.[otherWidth?.marker_id]?.[markerPointUnitKey]} />
                        </Box>
                      </TableCell>

                    </TableRow>
                    <TableRow>
                      <TableCell>Attachments</TableCell>
                      <TableCell>
                        <Box sx={{ float: 'right' }}>
                          <RitzMultipleFileUploader
                            displayType={LISTVIEW}
                            selectedFilesParent={otherWidth?.[attachmentsKey] || []}
                            handleFileChangeParent={(event: any) => handleOtherWidthFileChange(event, otherWidthIndex)}
                            filelocation={fileLocation}
                            isReadOnly={completedMarkerStatus}
                          />
                        </Box>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
              {otherWidth?.['marker_point_unit'] && (
                <Card sx={{ ml: 1, mt: 1, mr: 1, mb: 1, border: '1px solid #e0e0e0' }}>
                  <MarkerPoints markerPointsData={otherWidth.marker_points} handleChangeMarkerPoints={(data: any) => handleMarkerPoints(data, otherWidthIndex)} handleChangeDeletedIds={handleChangeDeleteMarkerPoints} errors={errors?.marker_point_errors?.[otherWidth?.marker_id]?.marker_point_errors} completedMarkerStatus={completedMarkerStatus} />
                </Card>
              )}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end'}}>
                <RitzSwitch name="Reviewed Status" status={otherWidth?.reviewed} handleChangeSwitch={(event: any)=>{handleDerivedMarkerReviewedAction(event, otherWidthIndex)}} />
              </Box>
              <Box sx={{ ml: 1, mb: 1 }}><FormErrorMessage message={errors?.derived_marker_errors?.[otherWidth?.marker_id]?.reviewed} /></Box>
            </Card>
          </Box>
        ))}

        <RitzSwitch 
            name={showIcons ? 'Hide Animation' : 'Show Animation'} 
            status={showIcons} 
            handleChangeSwitch={toggleIconsVisibility} 
        />
        <Card variant="outlined" >
          <TableContainer aria-label="simple table">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>
                    {!completedMarkerStatus && <Tooltip title="View Assigned Placements"><Button variant='outlined' sx={{ mb: 1, mt: 1 }} onClick={() => openMarkerEditPlacemnetModal(markerCadDetails?.['po_material_id'], markerCadDetails?.['marker_id'])}><EditIcon fontSize='small' /></Button></Tooltip>}
                  </TableCell>
                  {markerCadDetails?.[placementDataKey]?.map((placementHeader: any, headerIndex: any) => (
                    <TableCell key={keyHelper.getNextKeyValue()}>{placementHeader.name}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {markerCadDetails?.[ratioDataKey]?.map((item: any, rowIndex: number) => {
                  const defaultRatioValue = Math.max(...Object.keys(item.placements || {}).map(key => item.placements[key].ratio || ''));
                  const colorwayId = item.po_colorway_id;
                  const assignedColor = colorwayIdColorMap[colorwayId];
                  return (
                    <React.Fragment key={rowIndex}>
                      <TableRow key={keyHelper.getNextKeyValue()}>
                        <TableCell sx={{ verticalAlign: 'top' }}>
                          <Box>
                            <Typography sx={{ color: assignedColor }}> {item.display_name}</Typography>
                            (Order quantity: {item.quantity})
                            <Box sx={{ mt: completedMarkerStatus ? 2.65 : 3, float: 'right', width: '13%' }}>
                            <RitzInput
                              size={"small"}
                              inputType={"number"}
                              selectedValue={defaultRatioValue || ''}
                              handleAutoFocus={rowIndex === headerAndRowIndex.rowIndex}
                              placeholderText={"Ratio"}
                              handleOnChange={(event: any) => {
                                const value = event.target.value;
                                if ((value === '' || (!isNaN(value) && Number(value) >= 0)) && value.length <= 5) {
                                  handleSingleRatioForAllRowRatio(event, defaultRatioValue, rowIndex, item.po_pack_item_id);
                                }
                              }}
                              isReadOnly={completedMarkerStatus}
                            />
                            </Box>
                          </Box>
                        </TableCell>
                        {markerCadDetails?.[placementDataKey]?.map((placement: any, headerIndex: any) => {
                          const markerPlacemnetId = item.placements?.[placement?.id]?.marker_placement_id
                          return (
                            <React.Fragment key={headerIndex}>
                              {markerPlacemnetId ? (
                                <TableCell key={keyHelper.getNextKeyValue()} sx={{ width: '14%', verticalAlign: 'top' }}>
                                  <Typography sx={{ fontSize: '0.7rem' }}>Area :</Typography>
                                  <RitzInput
                                    inputType={'number'}
                                    // placeholderText={'Area'}
                                    name={'area'}
                                    selectedValue={item.placements?.[placement?.id]?.[areaKey]}
                                    handleOnChange={(event: any) => handleRatioInputChanges(event, placement?.id, item)}
                                    fullWidth
                                    size={'small'}
                                    isReadOnly={completedMarkerStatus}
                                  />
                                  <FormErrorMessage message={errors?.[areaErrorKey]?.[markerPlacemnetId]?.['marker_placement_area']} />
                                  <Typography sx={{ fontSize: '0.7rem' }}>Ratio :</Typography>
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    
                                  <RitzInput
    inputType={'number'}
    id={`placement_${headerIndex}_${rowIndex}`}
    name={'ratio'}
    selectedValue={item.placements?.[placement?.id]?.[ratioKey] || ''}
    handleOnChange={(event: any) => {
      const value = event.target.value;
      if (value === '' || (!isNaN(value) && Number(value) >= 0)) {
        const numValue = value === '' ? null : parseInt(value, 10);
        handlePlacementChange(headerIndex, rowIndex, markerPlacemnetId, numValue, item.placements?.[placement?.id]?.[ratioKey]);
        handleRatioInputChanges(event, placement?.id, item);
      }
    }}
    size={'small'}
    fullWidth
    handleAutoFocus={headerIndex + 1 === headerAndRowIndex.headerIndex && rowIndex === headerAndRowIndex.rowIndex}
    isReadOnly={completedMarkerStatus}
  />
                                    <Box sx={{ display: 'flex', flexDirection: 'column', marginTop: '5px', marginLeft: !completedMarkerStatus ? '4px' : '0' }}>
                                      {!completedMarkerStatus && <IconButton
                                        size={'small'}
                                        sx={{ margin: 0, padding: 0 }}
                                        onClick={(event) => {
                                          handleAddClick(headerIndex, rowIndex, markerPlacemnetId, item.placements?.[placement?.id]?.[ratioKey]);
                                        }}
                                      >
                                        <AddIcon fontSize="small" color='success' />
                                      </IconButton>}
                                      {!completedMarkerStatus && <IconButton
                                        size={'small'}
                                        sx={{ margin: '0', padding: 0 }}
                                        onClick={() => {
                                          const ratioValue = item.placements?.[placement?.id]?.[ratioKey];
                                          if (ratioValue > 0) {
                                            handleRemoveClick(headerIndex, rowIndex, markerPlacemnetId, ratioValue);
                                          }
                                        }}
                                      >
                                        <RemoveIcon fontSize="small" color='error' />
                                      </IconButton>}
                                    </Box>
                                  </Box>
                                  <Box sx={{ mt: 1 }} key={headerIndex}>
                                    {renderRatioCountOnSquares(item, placement)}
                                  </Box>
                                  <FormErrorMessage message={errors?.[ratioErrorKey]?.[markerPlacemnetId]?.['marker_placement_ratio']} />

                                </TableCell>
                              ) : (
                                <TableCell></TableCell>
                              )
                              }
                            </React.Fragment>
                          )
                        })}
                      </TableRow>
                    </React.Fragment>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>

        {markerCadDetails?.[relatedMarkersKey]?.length > 0 && (
          <>
            <Typography variant={'h4'} sx={{ mt: 4 }}>Related Markers</Typography>
            {markerCadDetails?.[relatedMarkersKey]?.map((relatedMarker: any) => (
              <Box sx={{ marginTop: 1 }}>
                <Card>
                  <TableContainer>
                    <Table>
                      <TableHead>

                        <TableCell sx={{ verticalAlign: 'top' }}>
                          <Tooltip title="View CAD Information"><Button variant='outlined' onClick={() => openMarkerCadInfoModal(relatedMarker?.['po_material_id'], relatedMarker?.['marker_id'])}><EditIcon fontSize='small' /></Button></Tooltip>
                        </TableCell>
                        {
                          relatedMarker?.[placementDataKey].map((placementData: any) => (
                            <TableCell sx={{ width: '14%', verticalAlign: 'top' }}>{placementData?.['name']}</TableCell>
                          ))
                        }
                      </TableHead>

                      <TableBody>
                        {relatedMarker?.[ratioDataKey].map((ratioData: any) => {
                          const colorwayId = ratioData.po_colorway_id;
                          const assignedColor = colorwayIdColorMap[colorwayId];
                          return (
                            <TableRow>
                              <TableCell sx={{ verticalAlign: 'top' }}>
                                <Typography sx={{ color: assignedColor }}>{ratioData?.['display_name']}</Typography>
                              </TableCell>

                              {relatedMarker?.[placementDataKey].map((placementData: any) => {
                                return (
                                  <TableCell>
                                    <RitzInput
                                      selectedValue={ratioData?.[placementsKey]?.[placementData.id]?.[ratioKey] || 0}
                                      size={'small'}
                                      fullWidth
                                      isReadOnly={true}
                                    />
                                    <Box sx={{ marginTop: 1 }}>
                                      {getCellRatioSquares(ratioData?.['pack_item_max_ratio'], ratioData?.['placements']?.[placementData?.['id']]?.['ratio'])}
                                    </Box>
                                  </TableCell>
                                )
                              })}
                            </TableRow>
                          )
                        })
                        }
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Card>
              </Box>
            ))}
          </>
        )}
        <Box sx={{ mt: 4 }}>
          {getMissingPlacementsUI()}
          <FormErrorMessage message={errors?.[statusErrorKey]?.[selectedMarkerId]?.[statusKey]} />
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <RitzSwitch name="Complete Status" status={completedMarkerStatus} handleChangeSwitch={handleMarkerReviewedAction} />
          {/*  isReadOnly={!canEdit}  */}
        </Box>
        <Box sx={{ mt: 5, display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={() => handleSaveMarkerCadDetails()} variant="contained" disabled={isSaving}>
            {isSaving && <SaveSpinner />} Save
          </Button>
        </Box>
      </>}
    </>
  )
}

export default PORatioBreakDown