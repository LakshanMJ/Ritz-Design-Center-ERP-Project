import React, { useEffect, useState } from 'react';
import { Grid, Box, Card, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Divider, Button, CardHeader, Paper, Alert, Typography, Tooltip, InputLabel, Link, Checkbox, Accordion, AccordionDetails, AccordionSummary, IconButton } from '@mui/material';
import DefaultLoader from '@/components/DefaultLoader';
import { buildFormData, getDefaultError } from '@/helpers/Utilities';
import api from '@/services/api';
import toast from 'react-hot-toast';
import * as GrnUrls from '../../helpers/constants/rest_urls/GrnUrls';
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd';
import { DEFAULT_SUCCESS } from '@/helpers/constants/Constants';
import RitzInput from '@/components/Ritz/RitzInput';
import SaveIcon from '@mui/icons-material/Save';
import ShadeGroupsAttachments from './ShadeGroupAttachments';
import ShadeSplit from './ShadeSplit';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';
import ArrowLeftIcon from '@mui/icons-material/ArrowLeft';
import EditIcon from '@mui/icons-material/Edit';
import { ReactKeyHelper } from '@/helpers/KeyHelper';


const ShadeGroups = ({ grnId, materialId, supplierMaterialCodeId, clubId }: any) => {
  const keyHelper = new ReactKeyHelper();
  const [isLoading, setIsLoading] = useState(true);
  const [batchData, setBatchData] = useState([]);
  const [isEnableSubRowEdit, setIsEnableSubRowEdit] = useState(false);
  const [selectedGroupShadeIndex, setSelectedGroupShadeIndex] = useState(null);
  const [selectedBatchIndex, setSelectedBatchIndex] = useState(null);
  const [selectedShadeId, setSelectedShadeId] = useState(null);
  const groupShadeKey = 'group_shades';
  const mainShadeKey = 'main_shades';
  const [shadeGroupeSavedStatus, setShadeGroupeSavedStatus] = useState(false);
  const [addNewShadeGroup, setAddNewShadeGroup] = useState(false);
  const fetchData = () => {
    // setIsLoading(true)
    const requests = [
      api.get(GrnUrls.shadeGroupeDetailsUrl(supplierMaterialCodeId)),
    ];
    Promise.all(requests).then(resp => {
      const response = resp.map((r: any) => r.data);
      const [shadeGroupDetails] = response
      setBatchData(shadeGroupDetails)
      setShadeGroupeSavedStatus(false)
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => setIsLoading(false))
  }

  const handleClick = () => {
    setAddNewShadeGroup(true)
    const emptyShadeGroup = {
      id: `new-${batchData[0].shade_group_data.length + 1}`,
      shade_name: "NewShadeGroup",
      display_order: batchData[0].shade_group_data.length + 1,
      shades: [] as any,
      attachment: null as any
    };
    const updatedBatchData = batchData.map(batch => ({
      ...batch,
      shade_group_data: [...batch.shade_group_data, { ...emptyShadeGroup, shades: [] }]
    }));
    setBatchData(updatedBatchData);
  };

  const handleDeleteShadeGroup = (batchIndex: any, shadeGroupIndex: number) => {
    const newState = [...batchData];
    newState[batchIndex].shade_group_data.splice(shadeGroupIndex, 1);
    setBatchData(newState);
  };

  const handleSave = () => {
    const groupedShades = {} as any;

    batchData.forEach((batch) => {
      batch.shade_group_data.forEach((shadeGroup: any) => {
        const [type, index] = shadeGroup.id.toString().split("-");
        let shadeGroupeId;
        if (type == 'new') {
          shadeGroupeId = 0
        }
        else {
          shadeGroupeId = shadeGroup.id
        }
        const groupId = shadeGroup.id;
        groupedShades[groupId] = groupedShades[groupId] || {
          id: shadeGroupeId,
          shade_name: shadeGroup.shade_name,
          display_order: shadeGroup.index + 1,
          attachment: shadeGroup.attachment || null,
          shades: []
        };
        groupedShades[groupId].shades.push(...shadeGroup.shades);
      });
    });
    const newPayload = Object.values(groupedShades);
    api.post(GrnUrls.saveActualShadeGroupeUrl(supplierMaterialCodeId), newPayload)
      .then(() => {
        setShadeGroupeSavedStatus(true)
        fetchData()
        toast.success(DEFAULT_SUCCESS);
      }).catch(error => {
        toast.error(getDefaultError(error?.response?.status));
      }).finally(() => {
      });
  }
  const handleEditGroupShade = (batchIndex: number, groupShadeIndex: number, status: any) => {
    setSelectedBatchIndex(batchIndex)
    setSelectedGroupShadeIndex(groupShadeIndex)
    setIsEnableSubRowEdit(status)

  }

  const onDragEnd = (result: any, batchIndex: any) => {
    if (!result.destination) {
      return;
    }
  
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
  
    const [sourceType, sourceShadeIndex, sourceId] = result.source.droppableId.split("-");
    const [destinationType, destinationShadeIndex, destinationId] = result.destination.droppableId.split("-");
  
    const updatedBatchData = [...batchData];
    const batch = updatedBatchData[batchIndex];
  
    let sourceShadeGroup, destinationShadeGroup;
  
    const isSameGroup = sourceId === destinationId && sourceShadeIndex === destinationShadeIndex;
    const isMainShadeMove = sourceType === mainShadeKey && destinationType === mainShadeKey;
    const isGroupShadeMove = sourceType === groupShadeKey && destinationType === groupShadeKey;
  
    if (isSameGroup && (isMainShadeMove || isGroupShadeMove)) {
      sourceShadeGroup = isMainShadeMove ? batch.shades : batch.shade_group_data[sourceShadeIndex]?.shades;
  
      if (destinationShadeIndex && destinationType === mainShadeKey) {
        toast.error("Cannot move this shade");
        return;
      } else {
        const [draggedShade] = sourceShadeGroup.splice(sourceIndex, 1);
        sourceShadeGroup.splice(destinationIndex, 0, draggedShade);
      }
    } else {
      sourceShadeGroup = sourceType === mainShadeKey ? batch.shades : batch.shade_group_data[sourceShadeIndex]?.shades;
      destinationShadeGroup = destinationType === mainShadeKey ? batch.shades : batch.shade_group_data[destinationShadeIndex]?.shades;
  
      const sourceSplitFrom = sourceShadeGroup[sourceIndex].split_from;
      if (destinationShadeIndex) {
        const hasSourceSplitFrom = destinationShadeGroup.some((shade: { id: any; }) => shade.id === sourceSplitFrom);
  
        if (hasSourceSplitFrom && destinationType !== mainShadeKey) {
          toast.error("Cannot move this split shade");
          return;
        } else {
          const [draggedShade] = sourceShadeGroup.splice(sourceIndex, 1);
          destinationShadeGroup?.splice(destinationIndex, 0, draggedShade);
        }
      }
    }
    setBatchData(updatedBatchData);
  };
  const handleInputChanges = (event: any, batchIndex: any, shadeGroupIndex: number) => {
    const { name, value } = event.target;
    const updatedBatchData = batchData.map((batch: any) => {
      if (batch.shade_group_data && batch.shade_group_data[shadeGroupIndex]) {
        batch.shade_group_data[shadeGroupIndex][name] = value;
      }
      return batch;
    });
    setBatchData(updatedBatchData);
  }
  const handleSavedShadeGroupData = (status: boolean) => {
    if (status) {
      fetchData()
    }
  }
  const handleNameClick = (shade: any, batchIndex: any) => {
    setSelectedBatchIndex(batchIndex)
    setSelectedShadeId(shade)
  };
  const handleClose = () => {
    setSelectedShadeId(null)
    fetchData()
  };

  const handleAddnewShadeStatus = (status: any) => {
    setAddNewShadeGroup(status)
  }

  const handleMove = (groupShadeIndex: any, direction: any) => {
    const updatedBatchData = batchData.map(batch => {
      const groupShadeToMove = batch.shade_group_data[groupShadeIndex];

      let newIndex;
      if (direction === "left") {
        newIndex = groupShadeIndex - 1;
      } else if (direction === "right") {
        newIndex = groupShadeIndex + 1;
      }

      if (newIndex >= 0 && newIndex < batch.shade_group_data.length) {
        batch.shade_group_data.splice(groupShadeIndex, 1);
        batch.shade_group_data.splice(newIndex, 0, groupShadeToMove);

        batch.shade_group_data.forEach((groupShade: any, index: any) => {
          groupShade.index = index;
        });
      }
      return batch;
    });

    setBatchData(updatedBatchData);
  };

  useEffect(() => {
    if (grnId) {
      fetchData()
    }
  }, [grnId]);


  return (
    <>
      {isLoading ? (
        <DefaultLoader />
      ) : (
        <>
          {selectedShadeId ? (
            <ShadeSplit materialId={materialId} clubId={clubId} grnId={grnId} shadeGroupSavedStatus={shadeGroupeSavedStatus} refreshData={handleSavedShadeGroupData} handleClose={handleClose} shadeId={selectedShadeId} />
          ) : (
            <>
              <Box>
                {batchData.length > 0 && (
                  <Box display="flex" flexDirection="row">
                    <Box sx={{ marginRight: 2 }}>
                      <Button variant='outlined' onClick={handleClick}>
                        Add Shade Group
                      </Button>
                    </Box>
                  </Box>
                )}
              </Box>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={40} sm={40} sx={{ width: '100%', mr: 4 }} >
                  <ShadeGroupsAttachments materialId={materialId} supplierMaterialCodeId={supplierMaterialCodeId} clubId={clubId} grnId={grnId} shadeGroupSavedStatus={shadeGroupeSavedStatus} addNewGroup={addNewShadeGroup} handleAddnewShadeStatus={handleAddnewShadeStatus} refreshData={handleSavedShadeGroupData} />
                </Grid>

                {batchData.map((batch, batchIndex) => (
                  <>
                    <Grid item xs={40} sm={40} sx={{ mt: 2 }} key={`batch-${batchIndex}`}>
                      <Grid container spacing={6} sx={{ p: 1, }} key={`batch-${batchIndex}`}>
                        <DragDropContext onDragEnd={(result) => onDragEnd(result, batchIndex)}>
                          <Droppable droppableId="tables" direction="horizontal">
                            {(provided) => (
                              <Box ref={provided.innerRef} {...provided.droppableProps} sx={{ display: 'flex', flexWrap: 'nowrap', padding: '20px', overflowX: 'auto' }} key={batchIndex}>
                                <Box sx={{ mb: 2, mr: 2, ml: 3 }} key={batchIndex}>
                                  <Box component={Paper} sx={{ width: '200px' }}> 
                                    <Box
                                      sx={{
                                        padding: 2,
                                        display: 'flex',
                                        justifyContent: 'center',
                                        backgroundColor:'#C7C8CC',
                                        '&:last-child': {
                                          borderBottom: 0,
                                        },
                                      }}
                                    >
                                      <Typography sx={{ textAlign: 'center' }}>
                                        {batch.batch_number}
                                      </Typography>
                                    </Box>
                                    <Droppable droppableId={`main_shades-${batchIndex}-${batch.id}`} key={`shades-${batchIndex}-${batch.id}`}>
                                      {(provided) => (
                                        <Box
                                          ref={provided.innerRef}
                                          {...provided.droppableProps}
                                          sx={{ display: 'flex', flexDirection: 'column',}}
                                          
                                        >
                                          {batch.shades?.length === 0 ? (
                                            <Box sx={{ textAlign: 'center', padding: 2 }}>No shades available</Box>
                                          ) : (
                                            batch.shades?.map((shade: any, index: any) => (
                                              <Draggable key={shade.id.toString()} draggableId={shade.id.toString()} index={index}>
                                                {(provided) => (
                                                  <Box
                                                  key={index}
                                                  ref={provided.innerRef}
                                                  {...provided.draggableProps}
                                                  {...provided.dragHandleProps}
                                                  sx={{
                                                    padding: 1,
                                                    display: 'flex',
                                                    justifyContent: 'center',
                                                    backgroundColor: '#B7E0FF',
                                                    border: '1px solid', 
                                                    borderColor: (theme) => theme.palette.grey[200],
                                                    '&:last-child': {
                                                      borderBottom: 0,
                                                    },
                                                  }}
                                                >
                                                    {shade.split_from === null ? (
                                                      <Link onClick={() => handleNameClick(shade.id, batchIndex)} sx={{ cursor: 'pointer' }}>
                                                         <Typography fontWeight='bold'>{shade.shade}</Typography>
                                                      </Link>
                                                    ) : (
                                                      <Typography fontWeight='bold'>{shade.shade}</Typography>
                                                    )}
                                                  </Box>
                                                )}
                                              </Draggable>
                                            ))
                                          )}
                                          {provided.placeholder}
                                        </Box>
                                      )}
                                    </Droppable>
                                  </Box>
                                </Box>
                                <Divider orientation="vertical" flexItem style={{ marginRight: '10px', marginLeft: '10px' }} />
                                {batch.shade_group_data?.length === 0 ? (
                                  <Box>
                                    <Alert severity="info" variant='outlined' sx={{ border: 0, p: 0 }} >
                                      No shade groups available for this batch . Please create the Shade Group
                                    </Alert>
                                  </Box>
                                ) : (
                                  batch.shade_group_data?.map((groupShade: any, groupShadeIndex: any) => (
                                    <Box sx={{ mb: 2, mr: 2, ml: 2 }} key={groupShadeIndex}>
                                      <Box component={Paper} sx={{ width: '200px' }}> 
                                        <Box
                                          sx={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            backgroundColor:'#C7C8CC',
                                            padding: 2,
                                          }}
                                        >
                                          {selectedBatchIndex === batchIndex && selectedGroupShadeIndex === groupShadeIndex && isEnableSubRowEdit ? (
                                            <RitzInput
                                              name={`shade_name`}
                                              id={`shade_name_${groupShadeIndex}-${batchIndex}`}
                                              selectedValue={groupShade.shade_name || ""}
                                              size={'small'}
                                              handleOnChange={(event: any) => handleInputChanges(event, batchIndex, groupShadeIndex)}
                                            />
                                          ) : (
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                              
                                              <Typography sx={{textAlign:'center'}} >{groupShade.shade_name}</Typography>

                                              {groupShadeIndex !== 0 && (
                                                <Tooltip title="left" arrow>
                                                  <IconButton sx={{ padding: 0, marginLeft: 1 }} color='primary' onClick={() => handleMove(groupShadeIndex, "left")}>
                                                    <ArrowLeftIcon />
                                                  </IconButton>
                                                </Tooltip>
                                              )}
                                              {groupShadeIndex !== batch.shade_group_data.length - 1 && (
                                                <Tooltip title="right" arrow>
                                                  <IconButton sx={{ padding: 0, marginLeft: 1 }} color='primary' onClick={() => handleMove(groupShadeIndex, "right")}>
                                                    <ArrowRightIcon />
                                                  </IconButton>
                                                </Tooltip>
                                              )}
                                            </Box>
                                          )}
                                        </Box>
                                        <Droppable droppableId={`group_shades-${groupShadeIndex}-${groupShade.id}`} key={groupShadeIndex}>
                                          {(provided) => (
                                            <Box
                                              ref={provided.innerRef}
                                              {...provided.droppableProps}
                                              sx={{ display: 'flex', flexDirection: 'column'}}
                                            >
                                              {groupShade.shades?.length === 0 ? (
                                               <Box sx={{ textAlign: 'center', padding: 2 }}>No shades available</Box>
                                              ) : (
                                                groupShade.shades?.map((shade: any, shadeIndex: any) => (
                                                  <Draggable key={shade?.id.toString()} draggableId={shade?.id.toString()} index={shadeIndex}>
                                                    {(provided) => (
                                                      <Box
                                                      // backgroundColor: (theme) => theme.palette.primary.light,
                                                      ref={provided.innerRef}
                                                      {...provided.draggableProps}
                                                      {...provided.dragHandleProps}
                                                      sx={{
                                                        padding: 1,
                                                        display: 'flex',
                                                        justifyContent: 'center',
                                                        backgroundColor: '#B7E0FF',
                                                        border: '1px solid',
                                                        borderColor: (theme) => theme.palette.grey[200],
                                                        '&:last-child': {
                                                          borderBottom: 0,
                                                        },
                                                      }}
                                                    >
                                                        <Typography fontWeight='bold'>{shade?.shade}</Typography>
                                                      </Box>
                                                    )}
                                                  </Draggable>
                                                ))
                                              )}
                                              {provided.placeholder}
                                            </Box>
                                          )}
                                        </Droppable>
                                      </Box>
                                    </Box>
                                  ))
                                )}
                              </Box>
                            )}
                          </Droppable>
                        </DragDropContext>
                      </Grid>
                      <Box sx={{ mb: 1 }}>
                        <Box sx={{ mb: 1 }}><Typography fontWeight='bold'>Shade Split Details :</Typography></Box>
                        {batch.split_shades.length == 0 ? (
                          <Alert severity="info" variant='outlined' sx={{ border: 0, p: 0 }} >
                            No available shade split details
                          </Alert>
                        ) : (
                          <>
                            <Box sx={{ width: "50%" }}>
                              <Table aria-label="simple table">
                                <TableHead>
                                  <TableRow>
                                    {batch.split_shades.map((variation: any, index: any) => (
                                      <React.Fragment key={index}>
                                        <TableCell colSpan={variation.split_shades.length} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>
                                          <Box >
                                            {variation.shade_name}
                                            <Tooltip title="Click and Split">
                                              <IconButton
                                                onClick={(event) => handleNameClick(variation.id, batchIndex)}
                                                size='small'
                                                color="primary"
                                                sx={{ ml: 1, mb: 1 }}
                                              >
                                                <EditIcon fontSize='inherit' />
                                              </IconButton>
                                            </Tooltip>
                                          </Box>

                                        </TableCell>
                                      </React.Fragment>
                                    ))}
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  <TableRow>
                                    {batch?.split_shades?.map((variation: any, index: any) => (
                                      <React.Fragment key={index}>
                                        {variation.split_shades.map((splitShade: any, splitShadeIndex: any) => (
                                          <TableCell key={splitShade.id} sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }}>{splitShade.shade_name}</TableCell>
                                        ))}
                                      </React.Fragment>
                                    ))}
                                  </TableRow>
                                </TableBody>
                              </Table>
                            </Box>
                          </>
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-end' }}>
                        <Box sx={{ marginLeft: 'auto' }}>
                          <Button variant="outlined" sx={{ ml: 1, mb: 1, mr: 1 }} onClick={handleSave}>Save</Button>
                        </Box>
                      </Box>
                      <Divider flexItem style={{ marginBottom: '30px' }} />
                    </Grid>
                  </>
                ))}
              </Grid>
            </>
          )
          }
        </>
      )}
    </>
  );
};

export default ShadeGroups;