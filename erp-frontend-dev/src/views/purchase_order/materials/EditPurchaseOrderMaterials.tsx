import DefaultLoader from '@/components/DefaultLoader'
import { Tooltip, IconButton, Grid, useMediaQuery, useTheme, Card, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, CardHeader, Box, TextField, Button, Alert, InputLabel, Link } from '@mui/material';
import React, { useEffect, useState } from 'react'
import MenuOpenIcon from "@mui/icons-material/MenuOpen";
import MenuIcon from "@mui/icons-material/Menu";
import * as POUrls from '@/helpers/constants/rest_urls/POUrls';
import { getDefaultError, hasRole } from '@/helpers/Utilities';
import api from '@/services/api';
import toast from 'react-hot-toast';
import EditPurchaseOrderMaterialsNavigation from './EditPurchaseOrderMaterialsNavigation';
import SaveSpinner from '@/components/SaveSpinner';
import { DEFAULT_SUCCESS } from '@/helpers/constants/Constants';
import Paper from '@mui/material/Paper';
import RitzSwitch from '@/components/Ritz/RitzSwitch';
import RitzModal from '@/components/Ritz/RitzModal';
import { BUSINESS_ADMIN } from '@/helpers/constants/RoleManager';
import {FABRIC_MATERIAL, FABRIC_MATERIAL_LABEL} from '@/helpers/costings/materials/MaterialFieldHelper';
import CircularLoader from '@/components/CircularLoader';

const EditPurchaseOrderMaterials = ({purchaseOrderId} : any) => {

  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('md'));

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCircularLoader, setIsLoadingCircularLoader] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [materialNavigationData, setMaterialNavigationData] = useState<any>([])
  const [materialData, setMaterialData] = useState<any>({pack_item_data: [], po_pack_data: []})
  const [poPackData, setPoPackData] = useState({po_pack_item_data: [] ,po_pack_data: [], po_pack_item_consumption_data:[], po_pack_consumption_data:[]});
  const [isSaving, setIsSaving] = useState(false);
  const [isMaterialsCompleteModal, setIsMaterialsCompleteModal] = useState(false);
  const [changedMaterialCompleteState, setchangedMaterialCompleteState] = useState(false);
  const [selectedMaterialNavigationData, setSelectedMaterialNavigationData] = useState<any>([])
  const canEdit = false; //hasRole(BUSINESS_ADMIN);

  const headerKey = 'headers'
  const dataKey = 'data'
  const packDataKey = 'pack_data'
  const packItemDataKey = 'pack_item_data'
  const materialsKey = 'materials'
  const servicesDataKey = 'service_data'
  const embellishmentKey = 'embellishment_service'
  const washKey = 'wash_service'
  const consumptionRatioKey = 'consumption_ratio'
  const wastageKey = 'wastage'

  const packItemData = materialData[packItemDataKey];
  const packData = materialData[packDataKey];

  const getMaterialNavigationData = () => {
    setIsLoading(true);
    api.get(POUrls.poEditMaterialsNavigationListUrl(purchaseOrderId)).then(resp => {
        const resdata = resp?.data || [];
        const[firstNavigationData] = resdata
        if(selectedMaterialNavigationData.length === 0) {
          setSelectedMaterialNavigationData(firstNavigationData)
        }
        setMaterialNavigationData([...resdata]);
    }).catch(error => {
        toast.error(getDefaultError(error?.response?.status));
    }).finally(() => setIsLoading(false));
  };

  const getMaterialData = () => {
   // setIsLoading(true);
    const requests = [
      api.get(POUrls.poEditMaterialsDataUrl(purchaseOrderId, selectedMaterialNavigationData.po_country_id, selectedMaterialNavigationData.po_colorway_id))
    ]
    Promise.all(requests).then(resp => {
        const resData = resp.map(r => r.data);
        const [materialData] = resData
        setMaterialData({...materialData});
    }).catch(error => {
        toast.error(getDefaultError(error?.response?.status));
    }).finally(() => {setIsLoading(false), setIsLoadingCircularLoader(false)});
  };

  const handleEditPackItemValueChange = (event: any, selectedPlacementId: any, customerBrandMaterialId: any, poPackItemPlacementIds: any, MaterialData: any, headerName: any, selectedSizeId: any) => {
    const changedValue = event.target.value;
    const changedFieldName = event.target.name;
    const materialItemId = MaterialData.rowItemId;
    const [firstPlacementData] = MaterialData.rowPlacementData;
    const placementMaterialType = firstPlacementData.placement_material_type;
  
    if (poPackData && Array.isArray(poPackData.po_pack_item_data)) {
      const propertyName = headerName ? headerName : changedFieldName;
  
      const existingItems = poPackData[changedFieldName === consumptionRatioKey || changedFieldName === wastageKey
        ? 'po_pack_item_consumption_data'
        : 'po_pack_item_data'
      ].filter((item) => {
        return item.po_pack_item_placement_ids &&
          item.po_pack_item_placement_ids.toString() === poPackItemPlacementIds.toString();
      });

      let assignedPlacementValueDetails = {};

      if (changedFieldName === consumptionRatioKey || changedFieldName === wastageKey) {
        assignedPlacementValueDetails = {
          [propertyName]: changedValue,
          po_pack_item_placement_ids: poPackItemPlacementIds,
          // customer_brand_material_id: customerBrandMaterialId,
        };
      
        const existingValues = existingItems.find((item) => {
          return item.po_pack_item_placement_ids.toString() === poPackItemPlacementIds.toString();
        });
      
        if (existingValues) {
          existingValues[propertyName] = changedValue;
        } else {
          let selectedValues;
      
          if (changedFieldName === consumptionRatioKey || changedFieldName === wastageKey) {
            selectedValues = poPackData.po_pack_item_consumption_data;
          } else {
            selectedValues = poPackData.po_pack_item_data;
          }
      
          const finalValueGroup = {
            po_pack_item_placement_ids: poPackItemPlacementIds,
            [propertyName]: changedValue,
          };
      
          selectedValues.push(finalValueGroup);
        }
      } else {
        assignedPlacementValueDetails = {
          [propertyName]: changedValue,
          po_pack_item_placement_ids: poPackItemPlacementIds,
          customer_brand_material_id: customerBrandMaterialId,
        };
      
        const existingItem = existingItems.find((item) => item[changedFieldName] !== undefined);
      
        if (existingItem) {
          existingItem[propertyName] = changedValue;
        } else {
          let selectedValues;
      
          if (changedFieldName === consumptionRatioKey || changedFieldName === wastageKey) {
            selectedValues = poPackData.po_pack_item_consumption_data;
          } else {
            selectedValues = poPackData.po_pack_item_data;
          }
      
          selectedValues.push(assignedPlacementValueDetails);
        }
      }
  
      setPoPackData({ ...poPackData });
    }
  
    const matchedPlacement = materialData.pack_item_data[materialItemId].materials[placementMaterialType].data.find(
      (item: any) => item.pack_item_placement_id === selectedPlacementId
    );
  
    if (matchedPlacement) {
      if (changedFieldName === consumptionRatioKey || changedFieldName === wastageKey) {
        matchedPlacement.po_sizes[selectedSizeId][changedFieldName] = changedValue;
      }else{
        matchedPlacement[changedFieldName] = changedValue;
      }
      setMaterialData({ ...materialData });
    }
  }

  const handleCompleteStatusSwitch = (event: any) => {
    const isChecked = event.target.checked;
    setIsMaterialsCompleteModal(true)
    setchangedMaterialCompleteState(isChecked)
  }

  const handleEditPackValueChange = (event: any, placementData: any, uniqueSizeId: any, poPackPlacementIds: any) => {
    const changedValue = event.target.value;
    const changedFieldName = event.target.name;
    const selectedPlacementId = placementData.pack_placement_id;
    const placementName = placementData.placement_material_type;
  
    const matchedPlacement = materialData.pack_data[placementName].data.find(
      (item: any) => item.pack_placement_id === selectedPlacementId
    );
  
    if (matchedPlacement) {
      matchedPlacement.po_sizes[uniqueSizeId][changedFieldName] = changedValue;
      setMaterialData({ ...materialData });
  
      const existingItemIndex = poPackData.po_pack_consumption_data.findIndex((item: any) => {
        const itemPlacementIds = item.po_pack_placement_ids ? item.po_pack_placement_ids.toString() : null;
        return itemPlacementIds === poPackPlacementIds?.toString();
      });
  
      if (existingItemIndex !== -1) {
        poPackData.po_pack_consumption_data[existingItemIndex][changedFieldName] = changedValue;
      } else {
        const newItem = {
          po_pack_placement_ids: poPackPlacementIds,
        } as any;
        newItem[changedFieldName] = changedValue;
  
        poPackData.po_pack_consumption_data.push(newItem);
      }
  
      setPoPackData({ ...poPackData });
    }
  };

  const handleCompleteStatusChange = () => {
    const changedState = {
      po_colorway_id: selectedMaterialNavigationData.po_colorway_id,
      po_country_id: selectedMaterialNavigationData.po_country_id,
      po_materials_reviewed : changedMaterialCompleteState
    }

    try{
      setIsConfirming(true)
      api.post(POUrls.poMaterialCompleteStateUrl(purchaseOrderId), changedState).then(resp => {
        const resdata = resp?.data || [];
        if(resdata){
          toast.success(DEFAULT_SUCCESS);
          setIsMaterialsCompleteModal(false)
          getMaterialData()
        }
      }).catch(error => {
        toast.error(getDefaultError(error?.response?.status));
        setPoPackData({po_pack_item_data: [] ,po_pack_data: [], po_pack_item_consumption_data:[], po_pack_consumption_data:[]})
      })
    }finally{
      setIsConfirming(false)
    }   
  }

  const handleSave= () => {
    setIsSaving(true);
    api.post(POUrls.saveEditMaterialsColorsUrl(purchaseOrderId), poPackData).then(resp => {
        const resdata = resp?.data || [];
        if(resdata) {
          toast.success(DEFAULT_SUCCESS);
          setIsLoadingCircularLoader(true)
          getMaterialData()
          setPoPackData({ po_pack_item_data: [], po_pack_data: [], po_pack_item_consumption_data:[], po_pack_consumption_data:[] });
        }
    }).catch(error => {
        toast.error(getDefaultError(error?.response?.status));
        setPoPackData({ po_pack_item_data: [], po_pack_data: [], po_pack_item_consumption_data:[], po_pack_consumption_data:[] });
    }).finally(() => setIsSaving(false));
  }

  const hasMaterialData = materialData.pack_data && materialData.pack_item_data;

  useEffect(() => {
    if(purchaseOrderId > 0) {
      getMaterialNavigationData()
    }
  }, [purchaseOrderId])
 
  useEffect(() => {
    if(purchaseOrderId > 0 && selectedMaterialNavigationData.po_colorway_id > 0 && selectedMaterialNavigationData.po_country_id > 0) {
      setIsLoading(true)
      getMaterialData()
    }
  },  [purchaseOrderId, selectedMaterialNavigationData.po_colorway_id, selectedMaterialNavigationData.po_country_id])

  return (
    <>
       {isLoadingCircularLoader && (<CircularLoader />)}
       {isLoading ? <DefaultLoader /> : (
      <>
    <Tooltip title={collapsed ? 'Expand' : 'Collapse'}>
      <IconButton
        onClick={() => setCollapsed(!collapsed)}
        sx={{
          fontSize: '1rem',
          mb: 1,
          borderRadius: 1,
          float: 'right'
        }}
      >
        {!collapsed ? <MenuOpenIcon fontSize='inherit' /> : <MenuIcon fontSize='inherit' />}
        <span style={{ marginLeft: 4, fontSize: 'smaller' }}>Purchase Order Packs</span>
      </IconButton>
    </Tooltip>
    <Grid container columnSpacing={3} direction={isSmall ? 'column-reverse' : 'row'}>
      <Grid item md={!collapsed ? 9 : 12} xs={12} sx={{ width: '100%' }}>
        {hasMaterialData != undefined && typeof hasMaterialData === 'object' && Object.keys(hasMaterialData).length === 0 ? (
          <>
            <Alert severity='error' icon={false}>
              Unable to show purchase order materials. Please ensure that materials have been assigned.
            </Alert>
          </>
        ) : (
          <>
            <React.Fragment>
              {materialData.po_items?.map((poItem: any, rowIndex1: any) => {
                const packItemDetails = packItemData[poItem.po_item_id][materialsKey];
                const EmbellishmentDetails = packItemData[poItem.po_item_id][servicesDataKey][embellishmentKey];
                const WashDetails = packItemData[poItem.po_item_id][servicesDataKey][washKey];
                return (
                  <React.Fragment key={rowIndex1}>
                    <Box key={poItem.po_item_id}>
                      <Typography variant="h1" component="h2" sx={{ p: 1 }}>
                        {poItem.item_name}
                      </Typography>
                      {Object.keys(packItemDetails).map((packItemId) => {
                        const pack = packItemDetails[packItemId];
                        const sizePacks = pack[dataKey];
                        return (
                          <Box key={packItemId}>
                            <Card variant="outlined" sx={{ mb: 3 }}>
                              <CardHeader
                                title={pack.display_name}
                                sx={{
                                  background: (theme) => theme.palette.grey[100],
                                  borderBottom: (theme) => `1px solid ${theme.palette.grey[300]}`,
                                }}
                              ></CardHeader>
                              <TableContainer component={Paper} key={packItemId}>
                                <Table>
                                  <TableHead>
                                    <TableRow>
                                      {pack[headerKey].map((header: any, headerIndex: any) => (
                                        <TableCell key={headerIndex}>
                                          {header.label}
                                        </TableCell>
                                      ))}
                                      {pack?.display_name != FABRIC_MATERIAL_LABEL &&
                                        [...new Set(selectedMaterialNavigationData?.po_sizes.map((size: any) => size.po_size_id) || [])].map((uniqueSizeId: any) => (
                                          <TableCell key={uniqueSizeId}>
                                            {selectedMaterialNavigationData?.po_sizes.find((size: any) => size.po_size_id === uniqueSizeId)?.po_size_name}
                                          </TableCell>
                                        ))
                                      }
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {sizePacks.map((row: any, rowIndex2: any) => {
                                      const rowItemId = poItem.po_item_id;
                                      const rowPlacementData = pack[dataKey];
                                      const rowMaterialData = {
                                        rowItemId,
                                        rowPlacementData,
                                      };
                                      return (
                                        <TableRow key={rowIndex2}>
                                          {pack[headerKey].map((header: any, headerIndex: any) => (
                                            <TableCell key={headerIndex}>
                                              {header.label === 'Color' ? (
                                                <TextField
                                                  id={`color-text-field-${rowIndex2}-${headerIndex}`}
                                                  variant="outlined"
                                                  size='small'
                                                  name={header.name}
                                                  value={row[header.name]}
                                                  onChange={(event: any) => {
                                                    handleEditPackItemValueChange(event, row.pack_item_placement_id, row.customer_brand_material_id, row.po_pack_item_placement_ids, rowMaterialData, header.name, '');
                                                  }}
                                                  sx={{
                                                    width: 100,
                                                  }}
                                                  disabled={materialData.po_materials_reviewed}
                                                />
                                              ) : (
                                                row[header.name] ? row[header.name] : <Typography>--</Typography>
                                              )}
                                            </TableCell>
                                          ))}

                                          { pack?.display_name != FABRIC_MATERIAL_LABEL && [...new Set(selectedMaterialNavigationData?.po_sizes.map((size: any) => size.po_size_id) || [])].map((uniqueSizeId: any) => (
                                            <TableCell key={uniqueSizeId}>
                                              {
                                                row?.po_sizes[uniqueSizeId] ? (
                                                    <Box style={{ whiteSpace: 'nowrap', overflowX: 'auto' }}>
                                                      <InputLabel sx={{ mb: 1 }}>Consumption</InputLabel>
                                                      <TextField
                                                        disabled={!canEdit}
                                                        size='small'
                                                        type='number'
                                                        name={"consumption_ratio"}
                                                        id={"consumption_ratio"}
                                                        value={row.po_sizes[uniqueSizeId]?.consumption_ratio || "N/A"}
                                                        onChange={(event: any) => {
                                                          handleEditPackItemValueChange(event, row.pack_item_placement_id, row.customer_brand_material_id, row.po_sizes[uniqueSizeId]?.po_pack_item_placement_ids, rowMaterialData, consumptionRatioKey, uniqueSizeId);
                                                        }}
                                                        sx={{
                                                          '& input::-webkit-inner-spin-button, & input::-webkit-outer-spin-button': {
                                                          'WebkitAppearance': 'none',
                                                          margin: 0,
                                                        },
                                                          '& input[type="number"]': {
                                                          'MozAppearance': 'textfield',
                                                        }}}
                                                        />
                                                      <InputLabel sx={{ mb: 1, mt: 1 }}>Wastage</InputLabel>
                                                      <TextField
                                                        disabled={!canEdit}
                                                        size='small'
                                                        type='number'
                                                        name={"wastage"}
                                                        id={"wastage"}
                                                        value={row.po_sizes[uniqueSizeId]?.wastage || 0}
                                                        onChange={(event: any) => {
                                                          handleEditPackItemValueChange(event, row.pack_item_placement_id, row.customer_brand_material_id, row.po_sizes[uniqueSizeId]?.po_pack_item_placement_ids, rowMaterialData, wastageKey, uniqueSizeId);
                                                        }}
                                                        sx={{
                                                          '& input::-webkit-inner-spin-button, & input::-webkit-outer-spin-button': {
                                                          'WebkitAppearance': 'none',
                                                          margin: 0,
                                                        },
                                                          '& input[type="number"]': {
                                                          'MozAppearance': 'textfield',
                                                        }}}
                                                        />
                                                    </Box>
                                                ): (
                                                    'N/A'
                                                )
                                              }

                                            </TableCell>
                                          ))}
                                        </TableRow>
                                      )
                                    })}
                                  </TableBody>
                                </Table>
                              </TableContainer>
                            </Card>
                          </Box>
                        );
                      })}
                    </Box>
                    {EmbellishmentDetails && <Box>
                      <Card variant="outlined" sx={{ mb: 3 }}>
                        <CardHeader
                          title={EmbellishmentDetails.display_name}
                          sx={{
                            background: (theme) => theme.palette.grey[100],
                            borderBottom: (theme) => `1px solid ${theme.palette.grey[300]}`,
                          }}
                        ></CardHeader>
                         <TableContainer component={Paper}>
                      <Table>
                          <TableHead>
                            <TableRow>
                            {EmbellishmentDetails[headerKey].map((header: any, headerIndex: any) => (
                                <TableCell key={headerIndex}>
                                  {header.label}
                                </TableCell>
                              ))}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                          {EmbellishmentDetails[dataKey].map((row: any, rowIndex2: any) => (
                            <TableRow key={rowIndex2}>
                            {EmbellishmentDetails[headerKey].map((header: any, headerIndex2: any) => {
                              const handleEmblishmentAttachmentDownload = async () => {
                                if (row.embellishment_attachment.file_path && row.embellishment_attachment.display_name) {
                                  try {
                                    const downloadLink = document.createElement('a');
                                    downloadLink.href = row.embellishment_attachment.file_path;
                                    downloadLink.target = '_blank';
                                    downloadLink.rel = 'noopener noreferrer';
                                    downloadLink.setAttribute('download', row.embellishment_attachment.display_name);
                                    downloadLink.click();
                                } catch (error) {
                                    toast.error('This file can not be found');
                                }
                              } else {
                                  //
                              }
                              };

                              const displayValue = () => {
                                if(header.attachment_field_name === "embellishment_attachment") {
                                  return (
                                    <>
                                    {row.embellishment_attachment.display_name ? (
                                      <Typography
                                        component={'span'} variant={'body2'}
                                        onClick={handleEmblishmentAttachmentDownload}
                                        sx={{
                                          textDecoration: 'none',
                                          cursor: 'pointer',
                                          color: '#1976d2',
                                          '&:hover': { textDecoration: 'underline' }
                                        }}
                                      >
                                        {row.embellishment_attachment.display_name}
                                      </Typography>
                                    ) : (
                                      <Typography>
                                        -- 
                                      </Typography>
                                    )}
                                    </> 
                                  );
                                }else if (header.attachment_field_name === "pack_item_embellishment_attachment"){
                                  const handleItemAttachmentDownload = async () => {
                                    if (row.pack_item_embellishment_attachment.file_path && row.pack_item_embellishment_attachment.display_name) {
                                      try {
                                        const downloadLink = document.createElement('a');
                                        downloadLink.href = row.embellishment_attachment.file_path;
                                        downloadLink.target = '_blank';
                                        downloadLink.rel = 'noopener noreferrer';
                                        downloadLink.setAttribute('download', row.embellishment_attachment.display_name);
                                        downloadLink.click();
                                      } catch (error) {
                                          toast.error('This file can not be found');
                                      }
                                  } else {
                                      //
                                  }
                                  };
                                  return (
                                    <>
                                    {row.pack_item_embellishment_attachment.display_name ? (
                                      <Typography component={'span'} variant={'body2'}
                                        onClick={handleItemAttachmentDownload}
                                        sx={{
                                          textDecoration: 'none',
                                          cursor: 'pointer',
                                          color: '#1976d2',
                                          '&:hover': { textDecoration: 'underline' }
                                        }}
                                      >
                                        {row.pack_item_embellishment_attachment.display_name}
                                      </Typography>
                                    ) : (
                                      <Typography component={'span'} variant={'body2'}>
                                        --
                                      </Typography>
                                    )}
                                    </> 
                                  );
                                } else {
                                  //
                                }
                              }
                              return (
                                <TableCell key={headerIndex2}>
                                  <Typography>
                                  {displayValue() || row[header.name] || '--'}
                                  </Typography>
                              </TableCell>
                              )
                              })}
                              </TableRow>
                            ))}
                          </TableBody>
                      </Table>
                      </TableContainer>
                      </Card>
                    </Box>}
                    {WashDetails && <Box>
                      <Card variant="outlined" sx={{ mb: 3 }}>
                        <CardHeader
                          title={WashDetails.display_name}
                          sx={{
                            background: (theme) => theme.palette.grey[100],
                            borderBottom: (theme) => `1px solid ${theme.palette.grey[300]}`,
                          }}
                        ></CardHeader>
                       <TableContainer component={Paper}>
                      <Table>
                          <TableHead>
                            <TableRow>
                            {WashDetails[headerKey].map((header: any, headerIndex: any) => (
                                <TableCell key={headerIndex}>
                                  {header.label}
                                </TableCell>
                              ))}
                            </TableRow>
                          </TableHead>
                          <TableBody>
                          {WashDetails[dataKey].map((row: any, rowIndex2: any) => (
                            <TableRow key={rowIndex2}>
                            {WashDetails[headerKey].map((header: any, headerIndex2: any) => {
                              const handleWashAttachmentDownload = async () => {
                                if (row.po_wash_attachment.file_path && row.po_wash_attachment.display_name) {
                                  try {
                                    const downloadLink = document.createElement('a');
                                    downloadLink.href = row.po_wash_attachment.file_path;
                                    downloadLink.target = '_blank';
                                    downloadLink.rel = 'noopener noreferrer';
                                    downloadLink.setAttribute('download', row.po_wash_attachment.display_name);
                                    downloadLink.click();
                                  } catch (error) {
                                      toast.error('This file can not be found');
                                  }
                              } else {
                                  //
                              }
                              };

                              const displayValue = () => {
                                if(header.attachment_field_name === "po_wash_attachment") {
                                  return (
                                    <>
                                    {row.embellishment_attachment.display_name ? (
                                      <Typography component={'span'} variant={'body2'}
                                        onClick={handleWashAttachmentDownload}
                                        sx={{
                                          textDecoration: 'none',
                                          cursor: 'pointer',
                                          color: '#1976d2',
                                          '&:hover': { textDecoration: 'underline' }
                                        }}
                                      >
                                        {row.embellishment_attachment.display_name}
                                      </Typography>
                                    ) : (
                                      <Typography component={'span'} variant={'body2'}>
                                        -- 
                                      </Typography>
                                    )}
                                    </> 
                                  );
                                }
                              }
                              return (
                                <TableCell key={headerIndex2}>
                                  <Typography>
                                  {displayValue() || row[header.name] || '--'}
                                  </Typography>
                              </TableCell>
                              )
                              })}
                              </TableRow>
                            ))}
                          </TableBody>
                      </Table>
                      </TableContainer>
                      </Card>
                    </Box>}
                  </React.Fragment>
                );
              })}
            </React.Fragment>
            {hasMaterialData != undefined && <Box>
              {materialData && materialData?.[packDataKey] && Object.keys(materialData?.[packDataKey]).length > 0 && <Typography variant="h1" component="h2">Packaging Data</Typography>}
            </Box>}
            <React.Fragment>
              {packData && Object.keys(packData).map((key: any, rowIndex2: any) => {
                const packDetails = packData[key];
                return (
                  <React.Fragment key={rowIndex2}>
                    <Box>
                      <Card variant="outlined" sx={{ mb: 3 }}>
                        <CardHeader
                          title={packDetails.display_name}
                          sx={{
                            background: (theme) => theme.palette.grey[100],
                            borderBottom: (theme) => `1px solid ${theme.palette.grey[300]}`,
                          }}
                        ></CardHeader>
                       <TableContainer component={Paper}>
                        <Table>
                          <TableHead>
                            <TableRow>
                              {packDetails[headerKey].map((header: any, headerIndex: any) => (
                                <TableCell key={headerIndex}>
                                  {header.label}
                                </TableCell>
                              ))}
                                 {[...new Set(selectedMaterialNavigationData?.po_sizes.map((size: any) => size.po_size_id) || [])].map((uniqueSizeId: any, sizeIndex: any) => (
                                <TableCell key={sizeIndex}>
                                  {selectedMaterialNavigationData?.po_sizes.find((size: any) => size.po_size_id === uniqueSizeId)?.po_size_name}
                                </TableCell>
                              ))} 
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {packDetails[dataKey].map((row: any, rowIndex2: any) => {
                               const rowName = [key];
                              const rowPlacementData = packDetails[key];
                               const rowPackData = {
                                 rowName,
                                 rowPlacementData,
                               };
                               return (
                                <React.Fragment key={rowIndex2}>
                                <TableRow key={row.id}>
                               {packDetails[headerKey].map((header: any, headerIndex: any) => (
                                 <TableCell key={headerIndex}>
                                   {header.label === 'Color' ? (
                                     <TextField
                                       id={`color-text-field-${rowIndex2}-${headerIndex}`}
                                       variant="outlined"
                                       size='small'
                                      //  value={row[header.name]}
                                       // onChange={(event) =>
                                      //   handleEditPackValueChange(event, row.pack_item_placement_id, uniqueSizeId, row.po_sizes[uniqueSizeId]?.po_pack_item_placement_ids)
                                      // }
                                       sx={{
                                         width: 100,
                                       }}
                                     />
                                   ) : (
                                     row[header.name] ? row[header.name] : <Typography>--</Typography>
                                   )}
                                 </TableCell>
                               ))}
                                {[...new Set(selectedMaterialNavigationData?.po_sizes.map((size: any) => size.po_size_id) || [])].map((uniqueSizeId: any, sizeIndex: any) => (
                                <TableCell key={sizeIndex}>
                                  <Box style={{ whiteSpace: 'nowrap', overflowX: 'auto' }}>
                                  <InputLabel sx={{ mb: 1 }}>Consumption</InputLabel>
                                  <TextField
                                    disabled={!canEdit}
                                    size='small'
                                    type='number'
                                    name={"consumption_ratio"}
                                    id={"consumption_ratio"}
                                    value={row.po_sizes[uniqueSizeId]?.consumption_ratio || 0}
                                    onChange={(event) =>
                                      handleEditPackValueChange(event, row, uniqueSizeId, row.po_sizes[uniqueSizeId]?.po_pack_placement_ids)
                                    }
                                    sx={{
                                      '& input::-webkit-inner-spin-button, & input::-webkit-outer-spin-button': {
                                      'WebkitAppearance': 'none',
                                      margin: 0,
                                    },
                                      '& input[type="number"]': {
                                      'MozAppearance': 'textfield',
                                    }}}
                                    />
                                  <InputLabel sx={{ mb: 1 }}>Wastage</InputLabel>
                                  <TextField
                                    disabled={!canEdit}
                                    size='small'
                                    type='number'
                                    name={"wastage"}
                                    id={"wastage"}
                                    value={row.po_sizes[uniqueSizeId]?.wastage || 0}
                                    onChange={(event) =>
                                      handleEditPackValueChange(event, row, uniqueSizeId, row.po_sizes[uniqueSizeId]?.po_pack_placement_ids)
                                    }
                                    sx={{
                                      '& input::-webkit-inner-spin-button, & input::-webkit-outer-spin-button': {
                                      'WebkitAppearance': 'none',
                                      margin: 0,
                                    },
                                      '& input[type="number"]': {
                                      'MozAppearance': 'textfield',
                                    }}}
                                    />
                                  </Box>
                                </TableCell>
                              ))}
                              </TableRow>
                                </React.Fragment>
                               )
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                      </Card>
                    </Box>
                  </React.Fragment>
                );
              })}
              {hasMaterialData != undefined && <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Button variant="contained" color="primary" onClick={handleSave}>
                  {isSaving && <SaveSpinner />} Save
                </Button>
                <Box sx={{ display: 'flex', alignItems: 'left' }}>
                  <RitzSwitch name="Complete Status" handleChangeSwitch={handleCompleteStatusSwitch} status={materialData.po_materials_reviewed} />
                </Box>
              </Box>}
            </React.Fragment>
          </>
        )}
      </Grid>
      {!collapsed && hasMaterialData != undefined && Object.keys(materialData).length > 0 && <Grid item md={3} xs={12} sx={{ width: '100%', mb: isSmall ? 3 : 0 }}>
        <Card variant='outlined' sx={{ mt: materialData && materialData?.[packItemDataKey] && Object.keys(materialData?.[packItemDataKey]).length > 0 ? 8.5 : 0 }}>
          <EditPurchaseOrderMaterialsNavigation navigationData={materialNavigationData} selectedNavigationData={setSelectedMaterialNavigationData} currentCountryId={selectedMaterialNavigationData.po_country_id} currentColorwayId={selectedMaterialNavigationData.po_colorway_id} />
        </Card>
      </Grid>}
    </Grid>
    <RitzModal open={isMaterialsCompleteModal} onClose={() => { setIsMaterialsCompleteModal(false) }} title='Confirmation' maxWidth='xs'>
      Are you sure you want to mark as {materialData.po_materials_reviewed ? 'incomplete' : 'complete'}?
      <Box sx={{ display: 'flex', justifyContent: 'end', mt: 2 }}>
        <Button variant='contained' onClick={handleCompleteStatusChange} disabled={isSaving}>{isConfirming && <SaveSpinner />}Confirm</Button>
      </Box>
    </RitzModal>
  </>
)}
    </>
  );
}

export default EditPurchaseOrderMaterials