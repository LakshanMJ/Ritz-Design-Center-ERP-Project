import RitzInput from "@/components/Ritz/RitzInput";
import { Alert, Box, Button, Card, Collapse, darken, FormControlLabel, Grid, IconButton, MenuItem, Paper, Radio, RadioGroup, Select, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, Tooltip, Typography } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { ConstructionOutlined, KeyboardArrowDown, KeyboardArrowUp } from "@mui/icons-material";
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import React from "react";
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import api from "@/services/api";
import toast from "react-hot-toast";
import * as poUrls from "@/helpers/constants/rest_urls/POUrls";
import RitzTable from "@/components/Ritz/RitzTable";
import { ColumnDef } from "@tanstack/react-table";
import { DEFAULT_SUCCESS } from "@/helpers/constants/Constants";
import { markerCutPlanSave } from "@/helpers/constants/rest_urls/POUrls";
import {ReactKeyHelper} from "@/helpers/KeyHelper";
import DefaultLoader from "@/components/DefaultLoader";
import RitzModal from "@/components/Ritz/RitzModal";
import CircularLoader from "@/components/CircularLoader";
import SaveSpinner from "@/components/SaveSpinner";
import CustomerBrandMaterialDetail from "../../settings/userdefine_material/CustomerBrandMaterialDetail";
import { getDefaultError, hasRole } from '@/helpers/Utilities';
import {CAD_ADMIN} from "@/helpers/constants/RoleManager";
import FormErrorMessage from "@/components/FormErrorMessage";
import ViewRollDetails from "./ViewRollDetails";
import RitzQR from "@/components/Ritz/RitzQR";

const CutInstructions = ({clubId}:any) => {
  
  const [cutSequenceCreatingformState, setCutSequenceCreatingformState] = useState<any>({
    selectedItem: '',
    selectedMaterial: '',
    selectedWidth: '',
    marker: '',
    plyCount: '',
    layeringType: '',
    markerLengthAllowance:'',
    markerLengthAllowanceUnit:''
  });
  const [options, setOptions] = useState({
    materialOptions: [],
    widthOptions: [],
    markerOptions: [],
  });
  const [loadingStates, setLoadingStates] = useState({
    isLoading:true,
    isLoadingCircularLoader: false,
    isSavingGenerateCutSequenceButton: false,
    isSavingCreateRollsButton: false,
    isSavingFinalizeButton: false,
  });
  const [data, setData] = useState({
    metaData: {materials:[],layering_type_options:[],marker_length_allowance_units_options:[]},
    createdCutSequenceData: [],
    rollSequenceData: [],
    markerCutPlanData: [],
  });
  const [cutSequanceGenerateOptionValue, setCutSequanceGenerateOptionValue] = useState('auto');
  const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false);
  const [isViewRollsModalOpen, setIsViewRollsModalOpen] = useState<any>({});
  const [activeSequenceTypeTab, setActiveSequenceTypeTab] = useState('create_sequence');
  const [currentlyEditingRowData, setCurrentlyEditingRowData] = useState<any>({});
  const [focusCellId, setFocusCellId] = useState(null);
  const canEditState = hasRole(CAD_ADMIN);
  const keyHelper = new ReactKeyHelper();
  const [cutSequenceCreatingFormErrors, setCutSequenceCreatingFormErrors] = useState<any>({});
  const [markerCutPlanEditErrors, setMarkerCutPlanEditErrors] = useState<any>({});
  const renderSubRow = ({ row }: any) => {
  const markerCutPlanId = row.original.id
  const rollDataForMarker = data.rollSequenceData[markerCutPlanId] || [];
    
    return (
        <>
            <Table
                size="small"
                sx={{
                    borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`,
                    '& .MuiTableCell-head': {
                        color: (theme) => theme.palette.grey[700],
                        background: (theme) => theme.palette.grey[50],
                    },
                }}
            >
                <TableHead>
                    <TableRow>
                        <TableCell>QR Code</TableCell>
                        <TableCell>Sequence Number</TableCell>
                        <TableCell>Roll Number</TableCell>
                        <TableCell>Batch Number</TableCell>
                        <TableCell>Shade</TableCell>
                        <TableCell>Ply Count Per Roll</TableCell>
                        <TableCell>Cut Position</TableCell>
                        <TableCell>Back Point</TableCell>
                        <TableCell>System Usable Quantity</TableCell>
                        <TableCell>System Unusable Quantity</TableCell>
                        <TableCell>Tag Length</TableCell>
                        <TableCell>Width</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                {rollDataForMarker.length > 0 ? (
                  rollDataForMarker.map((roll: any, rollIndex:any)=>(
                    <TableRow
                    key={`${markerCutPlanId}-${roll.sequence_number}`}
                    sx={{
                      '&:last-child td, &:last-child th': {
                        border: 0,
                      },
                      marginTop: '10px',
                      marginBottom: '10px'
                    }}
                    >
                    <TableCell>
                      <Box sx={{width:'50px', Height:'50px'}}>
                        <RitzQR value={roll?.barcode} size={150}/>
                      </Box>
                    </TableCell>
                    <TableCell>{roll?.sequence_number || '--'}</TableCell>
                    <TableCell>{roll?.roll_number || '--'}</TableCell>
                    <TableCell>{roll?.batch_number || '--'}</TableCell>
                    <TableCell>{roll?.shade}</TableCell>
                    <TableCell>{roll?.ply_count || '--'}</TableCell>
                    <TableCell>{roll?.cut_point || '--'}</TableCell>
                    <TableCell>{roll?.back_point || '--'}</TableCell>
                    <TableCell>{`${roll?.quantity} ${roll?.quantity_units}` || '--'}</TableCell>
                    <TableCell>{`${roll?.quantity} ${roll?.quantity_units}` || '--'}</TableCell>
                    <TableCell>{`${roll?.system_unusable_quantity?.quantity} ${roll?.system_unusable_quantity?.quantity_units_display}` || '--'}</TableCell>
                    <TableCell>{`${roll?.width?.quantity} ${roll?.width?.quantity_units_display}` || '--'}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} align="center"> No data available. </TableCell>
                  </TableRow>
                )}
                </TableBody>
            </Table>
        </>
    );
};


  const rawMaterialsFabricColumns: ColumnDef<any>[] = [
    {
      id: 'expandColumn',
      header: '',
      cell: ({row,getValue}:any) => (
          <span style={{ paddingLeft: `${row.depth * 2}rem` }}>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                  <IconButton
                      size="small"
                      onClick={() => handleRowExpand(row)}
                      style={{ cursor: "pointer" }}
                  >
                      {row.getIsExpanded() ? (
                          <KeyboardArrowDown />
                      ) : (
                          <KeyboardArrowRightIcon />
                      )}
                  </IconButton>
              </Box>
          </span>
      ),
      meta: {
          align: "left",
          width: 95,
      },
    },
    {
      accessorKey: 'cut_number',
      header: 'Cut Number',
      cell: (props:any) => {
        const index= props?.row?.index;
        const materialId = props?.row?.original?.material_id;
        return (
          (currentlyEditingRowData?.index === index && currentlyEditingRowData?.material_id === materialId && !isDeleteConfirmModalOpen) ? (
          <>
            <RitzInput
              isRequired
              name="cut_number"
              id={`cut_number_${index}`}
              selectedValue={
                currentlyEditingRowData?.cut_number
              }
              handleOnChange={(event:any) => handleMarkerCutPlanEditInput(event, 'cut_number', index)}
              isReadOnly={false}
              type='number'
              handleOnFocus={() => handleOnFocusCell(`cut_number_${index}`)}
              handleAutoFocus={focusCellId === `cut_number_${index}`}
            />
            <FormErrorMessage message={markerCutPlanEditErrors?.cut_number} />
          </>
          ) : (
            props?.row?.original?.cut_number
          )
        )
      },
    },
    {
      accessorKey: 'marker_length',
      header: 'Marker Length',
      cell: (props:any) => {
        const markerLength = String(props?.getValue() ?? 'N/A');
        const markerLengthUnit = String(props?.row?.original?.marker_length_unit_display ?? '');
        return <span>{markerLength} {markerLengthUnit}</span>;
      },
    },
    {
      accessorKey: 'ply_count',
      header: 'Ply Count',
      cell: (props:any) => {
        const index= props?.row?.index;
        const materialId = props?.row?.original?.material_id;
        
        return (
          (currentlyEditingRowData?.index === index && currentlyEditingRowData?.material_id === materialId && !isDeleteConfirmModalOpen) ? (
            <>
              <RitzInput
                isRequired
                name="ply_count"
                id={`ply_count_${index}`}
                selectedValue={
                  currentlyEditingRowData?.ply_count
                }
                handleOnChange={(event:any) => handleMarkerCutPlanEditInput(event, 'ply_count', index)}
                isReadOnly={false}
                type='number'
                handleOnFocus={() => handleOnFocusCell(`ply_count_${index}`)}
                handleAutoFocus={focusCellId === `ply_count_${index}`}
              />
              <FormErrorMessage message={markerCutPlanEditErrors.ply_count} />
            </>
          ) : (
            props?.row?.original?.ply_count
          )
        )
      },
    },
    {
      accessorKey: 'marker_name',
      header: 'Marker',
      cell: (props:any) => {
        const index= props?.row?.index;
        const materialId = props?.row?.original?.material_id;
        const rowData = props?.row?.original;
        return (
          (currentlyEditingRowData?.index === index && currentlyEditingRowData?.material_id === materialId && !isDeleteConfirmModalOpen) ? (
            <Select
              id={`markers_${index}`}
              value={
                currentlyEditingRowData?.marker
              }
              onChange={(event:any) => handleMarkerCutPlanEditInput(event, 'marker', index)}
              sx={{ width: 500 }}
            >
              {rowData?.marker_options?.map((marker:any) => (
                <MenuItem key={`${keyHelper.getNextKeyValue()}`} value={marker?.marker_id}>
                  {marker?.marker_name}
                </MenuItem>
              ))}
            </Select>
          ) : (
            props?.row?.original?.marker_name
          )
        )
      },
    },
    {
      accessorKey: 'marker_width',
      header: 'Marker Width',
      cell: (props:any) => {
        const markerWidth = String(props?.getValue() ?? 'N/A');
        const markerWidthUnit = String(props?.row?.original?.marker_width_unit_display ?? '');
        return <span>{markerWidth} {markerWidthUnit}</span>;
      },
    },
    {
      accessorKey: 'layering_type',
      header: 'Layering Type',
      cell: (props:any) => {
        const index= props?.row?.index;
        const materialId = props?.row?.original?.material_id;
        return (
          (currentlyEditingRowData?.index === index && currentlyEditingRowData?.material_id === materialId && !isDeleteConfirmModalOpen) ? (
            <Select
              id={`layering_type_${index}`}
              name={'name'}
              labelId={'name'}
              value={
                currentlyEditingRowData?.layering_type
              }
              onChange={(event:any) => handleMarkerCutPlanEditInput(event, 'layering_type', index)}
              sx={{ width: 135 }}
            >
              {data?.metaData?.layering_type_options.map((option:any) => (
                <MenuItem key={`${keyHelper.getNextKeyValue()}`} value={option.key}>
                  {option?.value}
                </MenuItem>
              ))}
            </Select>
          ) : (
            props?.row?.original?.layering_type_display
          )
        )
      },
    },
    {
      accessorKey: 'marker_length_allowance',
      header: 'Marker Length Allowance',
      cell: (props:any) => {
        const index= props?.row?.index;
        const materialId = props?.row?.original?.material_id;
        return (
          (currentlyEditingRowData?.index === index && currentlyEditingRowData?.material_id === materialId && !isDeleteConfirmModalOpen) ? (
            <RitzInput
              isRequired
              name="marker_length_allowance"
              id={`marker_length_allowance_${index}`}
              selectedValue={
                currentlyEditingRowData?.marker_length_allowance
              }
              handleOnChange={(event:any) => handleMarkerCutPlanEditInput(event, 'marker_length_allowance', index)}
              isReadOnly={false}
              type='number'
              handleOnFocus={() => handleOnFocusCell(`marker_length_allowance_${index}`)}
              handleAutoFocus={focusCellId === `marker_length_allowance_${index}`}
            />
          ) : (
            props?.row?.original?.marker_length_allowance
          )
        )
      },
    },
    {
      accessorKey: 'marker_length_allowance_units',
      header: 'Marker Length Allowance Unit',
      cell: (props:any) => {
        const index= props?.row?.index;
        const materialId = props?.row?.original?.material_id;
        return (
          (currentlyEditingRowData?.index === index && currentlyEditingRowData?.material_id === materialId && !isDeleteConfirmModalOpen) ? (
            <Select
            id={`marker_length_allowance_units${index}`}
            name={'marker_length_allowance_units'}
            labelId={'marker_length_allowance_units'}
              value={
                currentlyEditingRowData?.marker_length_allowance_units
              }
              onChange={(event:any) => handleMarkerCutPlanEditInput(event, 'marker_length_allowance_units', index)}
              sx={{ width: 150 }}
            >
              {data?.metaData?.marker_length_allowance_units_options.map((option:any) => (
                <MenuItem key={`${keyHelper.getNextKeyValue()}`} value={option.key}>
                  {option?.value}
                </MenuItem>
              ))}
            </Select>
          ) : (
            props?.row?.original?.marker_length_allowance_units_display
          )
        )
      },
    },
    {
      accessorKey: 'state',
      header: 'State',
      cell: (props:any) => {
        const index= props?.row?.index;
        const materialId = props?.row?.original?.material_id;
        return (
          (canEditState && currentlyEditingRowData?.index === index && currentlyEditingRowData?.material_id === materialId && !isDeleteConfirmModalOpen) ? (
            <Select
              id={`state_${index}`}
              name={'name'}
              labelId={'name'}
              value={
                currentlyEditingRowData?.state
              }
              onChange={(event:any) => handleMarkerCutPlanEditInput(event, 'state', index)}
              sx={{ width: 200 }}
            >
              {props?.row?.original?.state_options.map((option:any) => (
                <MenuItem key={`${keyHelper.getNextKeyValue()}`} value={option.key}>
                  {option?.value}
                </MenuItem>
              ))}
            </Select>
          ) : (
            props?.row?.original?.state_display
          )
        )
      },
    },
    {
      accessorKey: '',
      header: 'Action',
      cell: (props:any) => {
        const index= props?.row?.index;
        const materialId = props?.row?.original.material_id;
        const state = props?.row?.original?.state_display
        const rowData = props?.row?.original
        return (
          (currentlyEditingRowData?.index === index && currentlyEditingRowData?.material_id === materialId && !isDeleteConfirmModalOpen) ? (
            <>
              <Tooltip title="Save">
                <IconButton color='primary' onClick={() => handleMarkerCutPlanSaveClick(index)}>
                  <SaveIcon fontSize='small' />
                </IconButton>
              </Tooltip>
              <Tooltip title="Cancel">
                <IconButton color='secondary' onClick={() => setCurrentlyEditingRowData(null)}>
                  <EditIcon fontSize='small' />
                </IconButton>
              </Tooltip>
            </>
          ) : (
            <>
              <Tooltip title="Edit">
                <IconButton color='primary' onClick={() => handleMarkerCutPlanEditClick(index,rowData)}>
                  <EditIcon fontSize='small' />
              </IconButton>
              </Tooltip>
              <Tooltip title="Delete">
                <>
                <IconButton
                  color='error'
                  onClick={() => openMarkerCutPlanDeleteConfirmModal(index,rowData)}
                  disabled={state === 'Finalized'}
                >
                  <DeleteIcon fontSize='small' />
                </IconButton>
                </>
              </Tooltip>
            </>
          )
        )
      },
    }
  ]

  const fetchMetaDataAndCreatedSequenceData = () => {
    const requests = [
      api.get(poUrls.cutPlanMetaDataURL(clubId)),
      api.get(poUrls.poClubMarkerCutPlanDetail(clubId))
    ];
  
    Promise.all(requests)
      .then(([metaDataResponse, createdMaterialResponse]) => {
        const cutPlanMetaData = metaDataResponse?.data || {};
        const createdCutSequenceData = createdMaterialResponse?.data || [];
        updateData('metaData', cutPlanMetaData);
        updateData('createdCutSequenceData', [...createdCutSequenceData]);
      })
      .catch(error => {
        toast.error(getDefaultError(error?.response?.status));
      })
      .finally(() => {
        updateLoadingStates('isLoading', false);
        updateLoadingStates('isLoadingCircularLoader', false);
      });
  };

  const createRollData = (clubId:number,materialId:number) => {
    updateLoadingStates('isSavingCreateRollsButton', true);
    const requests = [
      api.get(poUrls.poClubItemMaterialRollSequenceGenarete(clubId,materialId))
    ];
  
    Promise.all(requests).finally(() => {
      updateLoadingStates('isSavingCreateRollsButton', false);
    });
  }; 

  const fetchRollData = (markerCutPlanId: number) => {
    const requests = [
      api.get(poUrls.clubMarkerCutPlanRollSequenceSelectedRollDetail(markerCutPlanId))
    ];
  
    Promise.all(requests)
      .then(([rollSequenceResponse]) => {
        const rollSequenceData = rollSequenceResponse?.data || [];
        setData(prevState => ({
          ...prevState,
          rollSequenceData: {
            ...prevState.rollSequenceData,
            [markerCutPlanId]: rollSequenceData
          }
        }));    
      })
      .catch(error => {
        toast.error(getDefaultError(error?.response?.status));
      })
      .finally(() => {
        updateLoadingStates('isLoading', false);
        updateLoadingStates('isLoadingCircularLoader', false);
      });
  };
  
  const fetchMarkerCutPlanData = () => {
    const materialId = Number(cutSequenceCreatingformState.selectedMaterial)
    const requests = [
      api.get(poUrls.poClubMaterialMarkerCutPlanDetail(clubId, materialId)),
    ];
    Promise.all(requests)
      .then(([cutDataResponse]) => {
        const markerCutPlanData = cutDataResponse?.data || [];
        updateData('markerCutPlanData', [...markerCutPlanData]);
      })
      .catch(error => {
        toast.error(getDefaultError(error?.response?.status));
      })
      .finally(() => {
        updateLoadingStates('isLoading', false);
        updateLoadingStates('isLoadingCircularLoader', false);
      });
  };

  useEffect(() => {
    fetchMetaDataAndCreatedSequenceData();
  }, [clubId]);

  useEffect(() => {
    if (cutSequenceCreatingformState?.selectedMaterial > 0) {
      fetchMarkerCutPlanData();
    }
  }, [cutSequenceCreatingformState.selectedMaterial]);
  

  const cutSequenceCreatingformSave = () => {
    updateLoadingStates('isSavingGenerateCutSequenceButton', true);
    const savePayload = {
      marker: cutSequenceCreatingformState?.marker || null,
      ply_count: cutSequenceCreatingformState?.plyCount || null,
      layering_type: cutSequenceCreatingformState?.layeringType || null,
      marker_length_allowance: cutSequenceCreatingformState?.markerLengthAllowance || null,
      marker_length_allowance_units: cutSequenceCreatingformState?.markerLengthAllowanceUnit || null
    };
    api.post(markerCutPlanSave(), savePayload)
      .then((resp) => {
        toast.success(DEFAULT_SUCCESS);
        fetchMarkerCutPlanData();
        fetchMetaDataAndCreatedSequenceData();
      })
      .catch((error) => {
        toast.error(getDefaultError(error?.response?.status));
        setCutSequenceCreatingFormErrors({...error?.response?.data})
        if (!cutSequenceCreatingformState.selectedWidth) {
          setCutSequenceCreatingFormErrors((prevData: any) => ({
            ...prevData,
            width: 'This field may not be null'
          }));
        }
      }).finally(() => {
        updateLoadingStates('isSavingGenerateCutSequenceButton', false);
      });
  };

  const handleMarkerCutPlanSave = (index: number) => {
    const updatePayload = {
      cut_number: currentlyEditingRowData?.cut_number,
      ply_count: currentlyEditingRowData?.ply_count,
      marker: currentlyEditingRowData?.marker,
      layering_type: currentlyEditingRowData?.layering_type,
      marker_length_allowance: currentlyEditingRowData?.marker_length_allowance,
      marker_length_allowance_units: currentlyEditingRowData?.marker_length_allowance_units,
      state: currentlyEditingRowData?.state,
    };
    
    api.put(poUrls.poClubMarkerCutPlanUpdate(currentlyEditingRowData?.id), updatePayload)
      .then((resp) => {
        toast.success(DEFAULT_SUCCESS);
        fetchMarkerCutPlanData();
        fetchMetaDataAndCreatedSequenceData();
        setCurrentlyEditingRowData(null);
      })
      .catch((error) => {
        toast.error(getDefaultError(error?.response?.status));
        setMarkerCutPlanEditErrors({...error?.response?.data})
      });
  };

  const handleCutPlanDelete = () => {
    api.delete(poUrls.poClubMarkerCutPlanDelete(currentlyEditingRowData?.id))
      .then((resp) => {
        toast.success(DEFAULT_SUCCESS);
        fetchMarkerCutPlanData();
        fetchMetaDataAndCreatedSequenceData();
        setCurrentlyEditingRowData(null);
      })
      .catch((error) => {
        toast.error(getDefaultError(error?.response?.status));
      }).finally(() => {
        setIsDeleteConfirmModalOpen(false);
      });
  };

  const handleRowExpand = (row: any) => {
    row.toggleExpanded();
    const markerCutPlanId = row.original.id
    fetchRollData(markerCutPlanId)
    setCurrentlyEditingRowData(null);
  }

  const handleCutSequenceCreatingformStateChange = (field: string, value: any) => {
    setCutSequenceCreatingformState((prevState:any) => ({
      ...prevState,
      [field]: value,
    }));
  };

  const handleCutSequenceCreatingformInputChange = (event: any, key: string) => {
    const value = event?.target?.value;
    switch (key) {
      case 'selectedMaterial':
        handleCutSequenceCreatingformStateChange('selectedMaterial', value);
        const material = data?.metaData?.materials.find((item) => item?.material_id === value);
        if (material) {
          updateMaterialWidthMarkerOptions('widthOptions',material?.widths);
          setCutSequenceCreatingformState((prevState: any) =>
            Object.keys(prevState).reduce((state, key) => ({
              ...state,
              [key]: key === 'selectedItem' || key === 'selectedMaterial' ? prevState[key] : ''
            }), {})
          );
          updateMaterialWidthMarkerOptions('markerOptions',[]);
        }
        break;
  
      case 'selectedWidth':
        handleCutSequenceCreatingformStateChange('selectedWidth', value);
        const width = options?.widthOptions.find((width) => width?.width_id === value);
        if (width) {
          updateMaterialWidthMarkerOptions('markerOptions',width?.markers);
        }
        break;
  
      case 'marker':
        handleCutSequenceCreatingformStateChange('marker', value);
        break;
  
      case 'plyCount':
        const regex = /^[0-9]*\.?[0-9]*$/;
        if (regex.test(value)) {
          handleCutSequenceCreatingformStateChange('plyCount', Number(value));
        }
        break;
  
      case 'layeringType':
        handleCutSequenceCreatingformStateChange('layeringType', value);
        break;

      case 'markerLengthAllowance':
        handleCutSequenceCreatingformStateChange('markerLengthAllowance', value);
        break;
      
      case 'markerLengthAllowanceUnit':
        handleCutSequenceCreatingformStateChange('markerLengthAllowanceUnit', value);
        break;
  
      default:
        break;
    }
  };
  
  const handleOnFocusCell = (cellId: any) => {
    setFocusCellId(cellId);
  };

  const handleMarkerCutPlanEditInput = (event: any, fieldName: string, rowIndex: number) => {
    let value = event.target.value;
    if (fieldName === 'ply_count') {
      value = Number(value);
    }

    setCurrentlyEditingRowData((prevState: any) => ({
      ...prevState,
      [fieldName]: value,
      rowIndex: rowIndex
    }));
  };

  const handleMarkerCutPlanEditClick = (index: number,rowData:any) => {
    setCurrentlyEditingRowData({
      index: index,
      material_id: rowData?.material_id,
      ...rowData,
    });
  };

  const handleMarkerCutPlanSaveClick = (index: number) => {
    handleMarkerCutPlanSave(index)
  };

  const updateMaterialWidthMarkerOptions = (field:any, value:any) => {
    setOptions((prevOptions) => ({
      ...prevOptions,
      [field]: value,
    }));
  };

  const updateLoadingStates = (field: any, value:any) => {
    setLoadingStates((prevState) => ({
      ...prevState,
      [field]: value,
    }));
  };

  const updateData = (field:any, value:any) => {
    setData((prevState) => ({
      ...prevState,
      [field]: value,
    }));
  };

  const handleActiveSequenceTypeTab = (event: React.SyntheticEvent, newValue: any) => {
    setCurrentlyEditingRowData(null);
    setActiveSequenceTypeTab(newValue);
    viewRollsModalOpenHandle(false, null)
  };

  const cutSequanceGenerateOptionValueChange = (event:any) => {
    setCutSequanceGenerateOptionValue(event.target.value);
  };

  const openMarkerCutPlanDeleteConfirmModal = (index: number,cutPlan:any) => {
    setIsDeleteConfirmModalOpen(true);
    setCurrentlyEditingRowData({index:index,...cutPlan})
  };

  const closeMarkerCutPlanDeleteConfirmModal = () => {
    setIsDeleteConfirmModalOpen(false);
    setCurrentlyEditingRowData((prevState:any) => ({
      ...prevState,
      index: null
  }));
  };

  const finalizeAllCutPlanStates = (materialId:any) => {
    const payload = {};
    updateLoadingStates('isSavingFinalizeButton', true);
    const requests = [
      api.put(poUrls.rollSequenceItemMaterialFinalized(clubId,materialId),payload)
    ];
  
    Promise.all(requests)
    .catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    })
    .finally(() => {
      updateLoadingStates('isSavingFinalizeButton', false);
      fetchMarkerCutPlanData()
      fetchMetaDataAndCreatedSequenceData()
    });
  };

  const autoGenerateCutSequence = (clubId:number,itemId:number,materialId:number) => {
    updateLoadingStates('isSavingGenerateCutSequenceButton', true);
    const requests = [
      api.get(poUrls.poClubMarkerCutPlanGenarete(clubId,materialId))
    ];
    Promise.all(requests)
    updateLoadingStates('isSavingGenerateCutSequenceButton', false);
  };

  const viewRollsModalOpenHandle = (status: any, materialId: any) => {
    setIsViewRollsModalOpen({modalStatus:status, materialId: materialId})
  };

  return (
    <>
    { isViewRollsModalOpen?.modalStatus &&(
                <RitzModal open={isViewRollsModalOpen?.modalStatus} onClose={()=>{viewRollsModalOpenHandle(false, null)}}  title='View Rolls' maxWidth={false} >
                  <ViewRollDetails clubId={clubId} materialId={isViewRollsModalOpen.materialId} />
                </RitzModal>
    )}
    {isDeleteConfirmModalOpen && (
      <RitzModal
          open={isDeleteConfirmModalOpen}
          onClose={closeMarkerCutPlanDeleteConfirmModal}
          title='Confirmation'
      >
          Are you sure you want to delete this ?
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'end' }}>
              <Button variant="contained"   onClick={handleCutPlanDelete} >Ok</Button>
              <Button variant="contained" color='secondary' onClick={() => {closeMarkerCutPlanDeleteConfirmModal()}} style={{ marginLeft: '10px' }} >Close</Button>
          </Box>
      </RitzModal>
    )}

    {loadingStates.isLoadingCircularLoader && (<CircularLoader />)}

    {loadingStates.isLoading ? <DefaultLoader /> : <>
      <Box>
        <Paper  elevation={0} sx={{ display: 'flex', flexDirection: 'row', width: '100%' }}>
          <Box>
          <Tabs
            orientation="vertical"
            variant="scrollable"
            value={activeSequenceTypeTab}
            onChange= {handleActiveSequenceTypeTab}
            aria-label="Vertical tabs example"
            sx={{ borderRight: 1, borderColor: 'divider', alignItems: 'flex-start', width: 110 }}
            >
  
            <Tab
              key={1}
              label={'Create Sequence'}
              value={'create_sequence'}
              sx={{ textAlign: 'left' }}
            />

            <Tab
              key={2}
              label={'Created Sequence'}
              value={'created_sequence'}
              sx={{ textAlign: 'left' }}
            />
          </Tabs>
          </Box>

          <Box sx={{ flex: 4, padding: '0.1em'}}>
        
          {activeSequenceTypeTab === 'create_sequence' && (
            <Box sx={{ padding: '16px', borderRadius: '8px', marginLeft: '0px' }}>
              <Grid container spacing={2}>
                {/* First Row */}
                <Grid container item xs={12} spacing={2}>
                  <Grid item xs={12} sm={4} md={3}>
                    <Typography variant="h6">Material:</Typography>
                    <Select
                    id={'material'}
                    value={cutSequenceCreatingformState.selectedMaterial || ''}
                    onChange={(event:any) => handleCutSequenceCreatingformInputChange(event, 'selectedMaterial')}
                    fullWidth
                    >
                    {data.metaData?.materials?.map((material: any) => (
                      <MenuItem key={keyHelper.getNextKeyValue()} value={material?.material_id}>
                      {material?.material_name}
                      </MenuItem>
                    ))}
                    </Select>
                  </Grid>
                  {cutSequenceCreatingformState?.selectedMaterial ?
                    <Grid container item xs={12} spacing={2}>
                    <Grid item xs={12} sm={4} md={3}>
                      <RadioGroup
                      aria-labelledby="demo-radio-buttons-group-label"
                      defaultValue="auto"
                      name="radio-buttons-group"
                      value={cutSequanceGenerateOptionValue}
                      onChange= {cutSequanceGenerateOptionValueChange}
                      >
                      <FormControlLabel value="auto" control={<Radio />} label="Auto Generate Cut Sequence" />
                      <FormControlLabel value="manual" control={<Radio />} label="Manual Generate Cut Sequence" />
                      </RadioGroup>
                    </Grid>
                    </Grid>
                      : null}
                  </Grid>

                  <Grid item xs={12}>
                    {cutSequanceGenerateOptionValue === 'manual' ? (
                      <>
                        <Grid container item xs={12} spacing={2}>
                          <>
                            <Grid item xs={12} sm={4} md={3}>
                              <Typography variant="h6">Width:</Typography>
                              <Select
                              id={'width'}
                              value={cutSequenceCreatingformState?.selectedWidth || ''}
                              onChange={(event:any) => handleCutSequenceCreatingformInputChange(event, 'selectedWidth')}
                              fullWidth
                              disabled={!cutSequenceCreatingformState?.selectedMaterial}
                              >
                              {options?.widthOptions.map((width) => (
                                <MenuItem key={keyHelper.getNextKeyValue()} value={width.width_id}>
                                {`${width?.width} ${width?.width_unit}`}
                                </MenuItem>
                              ))}
                              </Select>
                              <FormErrorMessage message={cutSequenceCreatingFormErrors?.width} />
                            </Grid>
                            <Grid item xs={12} sm={4} md={3}>
                              <Typography variant="h6">Marker:</Typography>
                              <Select
                                id={'markers'}
                                value={cutSequenceCreatingformState?.marker || ''}
                                onChange={(event:any) => handleCutSequenceCreatingformInputChange(event, 'marker')}
                                fullWidth
                                disabled={!cutSequenceCreatingformState.selectedWidth}
                              >
                                {options.markerOptions.map((marker) => (
                                  <MenuItem key={keyHelper.getNextKeyValue()} value={marker.marker_id}>
                                    {marker?.marker_name}
                                  </MenuItem>
                                ))}
                              </Select>
                              <FormErrorMessage message={cutSequenceCreatingFormErrors?.marker} />
                            </Grid>
                          
                            <Grid item xs={12} sm={4} md={3}>
                              <Typography variant="h6">Ply Count:</Typography>
                              <RitzInput
                                isRequired
                                name="ply_count"
                                id="ply_count"
                                selectedValue={cutSequenceCreatingformState?.plyCount}
                                handleOnChange={(event:any) => handleCutSequenceCreatingformInputChange(event, 'plyCount')}
                                isReadOnly={!cutSequenceCreatingformState?.marker}
                                type="number"
                                fullWidth
                              />
                              <FormErrorMessage message={cutSequenceCreatingFormErrors?.ply_count} />
                            </Grid>
                          </>
                        </Grid>
                        <Grid container item xs={12} spacing={2}>
                          <Grid item xs={12} sm={4} md={3}>
                          <Typography variant="h6" sx={{ marginTop: '30px' }}>Layering type:</Typography>
                            <Select
                              id={'layering_type'}
                              value={cutSequenceCreatingformState?.layeringType || ''}
                              onChange={(event:any) => handleCutSequenceCreatingformInputChange(event, 'layeringType')}
                              fullWidth
                              disabled={!cutSequenceCreatingformState.plyCount}
                            >
                              {data?.metaData?.layering_type_options.map((option:any) => (
                                <MenuItem key={keyHelper.getNextKeyValue()} value={option.key}>
                                  {option?.value}
                                </MenuItem>
                              ))}
                            </Select>
                            <FormErrorMessage message={cutSequenceCreatingFormErrors?.layering_type} />
                          </Grid>
                          <Grid item xs={12} sm={4} md={3}>
                            <Typography variant="h6" sx={{ marginTop: '30px' }}>Marker Length Allowance:</Typography>
                            <RitzInput
                              isRequired
                              name="marker_length_allowance"
                              id="marker_length_allowance"
                              selectedValue={cutSequenceCreatingformState?.markerLengthAllowance}
                              handleOnChange={(event:any) => handleCutSequenceCreatingformInputChange(event, 'markerLengthAllowance')}
                              isReadOnly={!cutSequenceCreatingformState?.layeringType}
                              type="number"
                              fullWidth
                            />
                            <FormErrorMessage message={cutSequenceCreatingFormErrors?.marker_length_allowance} />
                          </Grid>
                          <Grid item xs={12} sm={4} md={3}>
                            <Typography variant="h6" sx={{ marginTop: '30px' }}>Marker Length Allowance Unit:</Typography>
                            <Select
                              id={'marker_length_allowance_unit'}
                              value={cutSequenceCreatingformState?.markerLengthAllowanceUnit || ''}
                              onChange={(event:any) => handleCutSequenceCreatingformInputChange(event, 'markerLengthAllowanceUnit')}
                              fullWidth
                              disabled={!cutSequenceCreatingformState.markerLengthAllowance}
                            >
                              {data.metaData?.marker_length_allowance_units_options.map((option:any) => (
                                <MenuItem key={keyHelper.getNextKeyValue()} value={option.key}>
                                  {option?.value}
                                </MenuItem>
                              ))}
                            </Select>
                            <FormErrorMessage message={cutSequenceCreatingFormErrors?.marker_length_allowance_units} />
                          </Grid>
                        </Grid>
                        <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', justifyContent: 'flex-end', alignItems: 'flex-end' }}>
                          <Button
                            onClick={cutSequenceCreatingformSave}
                            variant="contained"
                            color="primary"
                            sx={{ width: '200px', marginTop:'30px',marginBottom:'30px' }}
                          >
                            {loadingStates.isSavingGenerateCutSequenceButton && <SaveSpinner />}Generate Cut Sequence
                          </Button>
                        </Box>
                      </>
                    ) : (
                      cutSequenceCreatingformState?.selectedMaterial &&
                      (
                        <Box sx={{ display: 'flex',flexDirection: 'column', width: '100%', justifyContent: 'flex-end', alignItems: 'flex-end' }}>
                          <Button
                            variant="contained"
                            color="primary"
                            onClick={() => autoGenerateCutSequence(clubId,cutSequenceCreatingformState.selectedItem,cutSequenceCreatingformState.selectedMaterial)}
                            sx={{ width: '200px', marginTop: '30px',marginBottom:'30px' }}
                          >
                            {loadingStates.isSavingGenerateCutSequenceButton && <SaveSpinner />}Generate Cut Sequence
                          </Button>
                        </Box>
                      )
                    )}
                  </Grid>
              </Grid>
              <Box>
              <RitzTable 
                data={data?.markerCutPlanData}
                columns={rawMaterialsFabricColumns}
                renderSubComponent={renderSubRow}
              />
              </Box>
              <Box sx={{ display: 'flex', width: '100%', justifyContent: 'flex-end',flexDirection: 'row', gap: '10px', alignItems: 'flex-end' }}>
                <Button 
                  onClick={()=>{viewRollsModalOpenHandle(true, cutSequenceCreatingformState.selectedMaterial)}}
                  variant="contained"
                  color="primary"
                  sx={{ width: '180px', marginTop:'30px' }}
                  disabled={!cutSequenceCreatingformState.selectedMaterial}
                >
                View Rolls
                </Button>
                <Button 
                  onClick={() => createRollData(clubId,cutSequenceCreatingformState?.selectedMaterial)}
                  variant="contained"
                  color="primary"
                  sx={{ width: '180px', marginTop:'30px' }}
                >
                  {loadingStates.isSavingCreateRollsButton && <SaveSpinner />}Create Roll Sequance
                </Button>
                <Button
                  onClick={() => finalizeAllCutPlanStates(cutSequenceCreatingformState.selectedMaterial)}
                  variant="contained"
                  color="primary"
                  sx={{ width: '150px', marginTop: '10px' }}
                >
                  {loadingStates.isSavingFinalizeButton && <SaveSpinner />}
                  Finalize State
                </Button>
               </Box>
            </Box>
          )}
            {activeSequenceTypeTab === 'created_sequence' && (
              <React.Fragment>
                {data.createdCutSequenceData.length === 0 ? (
                  <Alert severity="info"  sx={{ ml: 2, mt: 8 }}>{'No created cut sequence to display'}</Alert>
                ) : (
                    <>
                      {data?.createdCutSequenceData.map((material:any) => {
                        const allMarkerCutPlans = material?.marker_cut_plans;
                        return (
                          <Box key={material.id}>
                            <Box>
                            <Box>
                              <CustomerBrandMaterialDetail material={material} />
                            </Box>
                              <RitzTable
                                data={allMarkerCutPlans}
                                columns={rawMaterialsFabricColumns}
                                renderSubComponent={renderSubRow}
                              />
                            </Box>
                            <Box sx={{ display: 'flex', width: '100%', justifyContent: 'flex-end', flexDirection: 'row', gap: '10px', alignItems: 'flex-end' }}>
                              <Button 
                                onClick={()=>{viewRollsModalOpenHandle(true, material.material_id)}}
                                variant="contained"
                                color="primary"
                                sx={{ width: '180px', marginTop:'30px' }}
                              >
                              View Rolls
                              </Button>
                              <Button
                                onClick={() => createRollData(clubId, material.material_id)}
                                variant="contained"
                                color="primary"
                                sx={{ width: '180px', marginTop: '30px' }}
                              >
                                {loadingStates.isSavingCreateRollsButton && <SaveSpinner />}Create Roll Sequence
                              </Button>
                              
                              <Button
                                onClick={() => finalizeAllCutPlanStates(material.material_id)}
                                variant="contained"
                                color="primary"
                                sx={{ width: '150px', marginTop: '10px' }}
                              >
                                {loadingStates.isSavingFinalizeButton && <SaveSpinner />}Finalize State
                              </Button>
                            </Box>
                          </Box>
                        );
                      })}
                   </>
                )}
              </React.Fragment>
              )}
          </Box>
        </Paper>
      </Box>
      </>
    }
    </>
  );
}

export default CutInstructions;

