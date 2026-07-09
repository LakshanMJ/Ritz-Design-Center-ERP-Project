import React, { useEffect, useState } from 'react';
import { Box, Button, Card, CardHeader, Grid, InputLabel, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Alert, Link } from '@mui/material';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import api from '@/services/api';
import { purchaseOrderClubDetailsURL, purchaseOrderClubSetMarkAsCompleteURL, purchaseOrderClubingSaveURL } from "@/helpers/constants/rest_urls/POUrls";
import toast from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';
import DefaultLoader from '@/components/DefaultLoader';
import SaveSpinner from '@/components/SaveSpinner';
import { DEFAULT_SUCCESS } from '@/helpers/constants/Constants';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import RitzModal from '@/components/Ritz/RitzModal';
import NextLink from 'next/link';
import { purchaseOrderColorwaySizeCountryMappingPageURL, purchaseOrderDetailPageURL, purchaseOrderInquiryPageURL } from '@/helpers/constants/FrontEndUrls';
import { useRouter } from 'next/router'

const PoClubing = ({ purchaseOrderUploadId, selectedPoID, preCostingIncluded, savedData, type }: any) => {
  const router = useRouter()
  const modalTitle = "Are you sure you want to confirm this as complete?"

  const [uploadedPODetails, setUploadedPODetails] = useState<any>({});// need to remove this state - (used multiple states)
  const [systemClubing, setSystemClubing] = useState([]);
  const [userDefineClubingData, setUserDefineData] = useState([]);
  const [purchaseOrderList, setPurchaseOrderList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isNotEditable, setIsNotEditable] = useState(false);
  const [poClubCompleteState, setPoClubCompleteState] = useState(false);
  const [nextLoading, setNextLoading] = useState(false);
  const onDragEnd = (result: any) => {
    if (!result.destination) {
      return;
    }
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    // search the drop place and set it---
    const sourceData = userDefineClubingData.find((item) => item.id.toString() === result.source.droppableId);
    const destinationData = userDefineClubingData.find((item) => item.id.toString() === result.destination.droppableId);

    // Remove partttt
    const [draggedItem] = sourceData.purchaseorder_set.splice(sourceIndex, 1);
    destinationData?.purchaseorder_set.splice(destinationIndex, 0, draggedItem);

    setUserDefineData([...userDefineClubingData]);
  };
  const getPurchaseOrderDetails = () => {
    const requests = [
        api.get(purchaseOrderClubDetailsURL(purchaseOrderUploadId)),
    ]
    Promise.all(requests).then(resp => {
        const respData = resp.map((r: any) => r.data);
        const [uploadedPoDetails] = respData;
        setSystemClubing(uploadedPoDetails.originalpoclub_set);
        setUserDefineData(uploadedPoDetails.actualpoclub_set);
        setPurchaseOrderList(uploadedPoDetails.purchaseorder_set);
        setUploadedPODetails({ ...uploadedPoDetails })
        if(uploadedPoDetails.clubbing_complete === true){
          setIsNotEditable(true)
        }
    }).catch(error => {
        toast.error(getDefaultError(error?.response?.status));
    }).finally(() => setIsLoading(false));
};

  const addNewClub = () => {
    const maxClubId = userDefineClubingData.reduce((max, currentItem) => {
      return currentItem.id > max ? currentItem.id : max;
    }, -1);
    const newClub = {
      id: maxClubId + 1,
      is_new: true,
      original_po_club: null as any,
      uploaded_purchase_order: null as any,
      purchaseorder_set: [] as any[]
    };
    setUserDefineData([...userDefineClubingData, newClub]);
  };

  const saveClubData = (savingType: any) => {
    setIsSaving(true);
    const updatedData = userDefineClubingData.map(item => {
      if (item.is_new) {
        return { ...item, id: null };
      }
      return item;
    });

    const saveApi = purchaseOrderClubingSaveURL();
    api.post(saveApi, { data: updatedData }).then(resp => {
      const reseditdata = resp?.data;
      getPurchaseOrderDetails()
      if (type === 'mapping' && savingType == 'save_next') {
        if (selectedPoID === 0) {
          const purchaseOrderId = purchaseOrderList[0]?.id
          if (uploadedPODetails?.is_pre_costing_done) {
            router.push(purchaseOrderInquiryPageURL(purchaseOrderId))
          }
          else {
            router.push(purchaseOrderColorwaySizeCountryMappingPageURL(purchaseOrderId, purchaseOrderUploadId))
          }

        }
        else {
          if (uploadedPODetails?.is_pre_costing_done) {
            router.push(purchaseOrderInquiryPageURL(selectedPoID))
          }
          else {
            router.push(purchaseOrderColorwaySizeCountryMappingPageURL(selectedPoID, purchaseOrderUploadId))
          }

        }
      }
      toast.success(DEFAULT_SUCCESS);
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => {
      setIsSaving(false);
    });
  };

  const handlePoclubComplteState = () => {
    const request = (purchaseOrderClubSetMarkAsCompleteURL(purchaseOrderUploadId))
    api.get(request).then(resp => {
      const respData = resp?.data;
      if(respData){
        toast.success(DEFAULT_SUCCESS);
        setPoClubCompleteState(false)
        getPurchaseOrderDetails()
      }
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    })
  }

  const getRowColor = (purchaseOrderId: any, originalClubId: any) => {
    const foundItem = systemClubing.find((item) => {
      return item.id === originalClubId && item.purchaseorder_set.some((order: any) => order.id === purchaseOrderId);
    });
    if (selectedPoID) {
      if (purchaseOrderId == selectedPoID) {
        return '#B4E4FF';
      }
      else {
        if (!foundItem) {
          return '#FFFFDD';
        }
      }
    }
    else {
      if (!foundItem) {
        return '#FFFFDD';
      }
    }
  };

  const handleNextPage = (id:any) => {
    return  purchaseOrderDetailPageURL(id)
  }

  const handleNextButtonAction = () => {
    try {
      setNextLoading(true)
      saveClubData('save_next')
    } finally {
        setNextLoading(false)
    }
  }

  useEffect(() => {
    if (purchaseOrderUploadId) {
      getPurchaseOrderDetails()
    }
  }, [purchaseOrderUploadId]);

  return (
    <>
      {isLoading ? <DefaultLoader /> : <>
        {!isNotEditable &&
          <>
            <Box> <Alert severity="error" >Please finalize the Purchase Order Club Details (Mark as complete) to Create BOMs</Alert></Box>
          </>
        }
        <Grid container spacing={3} sx={{ p: 3 }}>
          <Grid item xs={12} sm={4}>
            <CardHeader title={"PO List"} sx={{ backgroundColor: (theme) => theme.palette.grey[50] }} />
            <TableContainer component={Paper}>
              <Table aria-label="simple table">
                <TableBody>
                  {purchaseOrderList.map((row: any, index1: any) => (
                    <TableRow
                      key={index1}
                      sx={{
                        '&:last-child td, &:last-child th': { border: 0 },
                        backgroundColor: row.id == selectedPoID ? '#B4E4FF' : '',
                      }}

                    >
                      <TableCell component="th" scope="row">
                      <Link component={NextLink} href={handleNextPage(row.id)}>{row.name}</Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
          <Grid item xs={12} sm={4}>
            <CardHeader title={"System Clubing"} sx={{ backgroundColor: (theme) => theme.palette.grey[50] }} />
            {systemClubing.map((table, tableIndex) => (
              <Box key={table.id} sx={{ marginBottom: '16px' }}>
                <Card sx={{ mb: 2 }}>
                  <TableContainer>
                    <Table aria-label="simple table">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ color: (theme) => theme.palette.grey[600] }}>Po Club: {tableIndex + 1}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {table.purchaseorder_set.length === 0 ? (
                          <TableRow >
                            <TableCell colSpan={3}>No Po data available</TableCell>
                          </TableRow>
                        ) : (
                          table.purchaseorder_set.map((row: any, rowIndex: any) => (
                            <TableRow key={rowIndex}  sx={{
                              '&:last-child td, &:last-child th': { border: 0 },
                              backgroundColor: row.id == selectedPoID ? '#B4E4FF' : '',
                            }}>
                              <TableCell align="left" style={{ minWidth: '5px', width: '5px', maxWidth: '5px' }}>                              
                              <Link component={NextLink} href={purchaseOrderDetailPageURL(row.id)}>{row.name}</Link>
                              </TableCell>
                            </TableRow>
                          ))
                        )
                        }
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Card>
              </Box>
            ))}
          </Grid>
          <Grid item xs={12} sm={4}>
            <CardHeader title={"Actual PO Clubing"} sx={{ backgroundColor: (theme) => theme.palette.grey[50] }} />
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="tables" >
                {(provided: any) => (
                  <Box ref={provided.innerRef} {...provided.droppableProps}>
                    {userDefineClubingData.map((table, tableIndex) => (
                      <Card sx={{ mb: 2 }} key={tableIndex}>
                        <TableContainer component={Paper}>
                          <Table aria-label="simple table">
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ color: (theme) => theme.palette.grey[600] }}>Po Club:{tableIndex + 1}</TableCell>
                              </TableRow>
                            </TableHead>
                            <Droppable key={tableIndex} droppableId={table.id.toString()}>
                              {(provided: any) => (
                                <TableBody ref={provided.innerRef} {...provided.droppableProps}>
                                  {table.purchaseorder_set.length === 0 ? (
                                    <TableRow >
                                      <TableCell colSpan={3}>No Po data available</TableCell>
                                    </TableRow>
                                  ) : (
                                    table.purchaseorder_set.map((row: any, rowIndex: any) => (
                                      <Draggable
                                        key={row.id.toString()}
                                        draggableId={row.id.toString()}
                                        index={rowIndex}
                                        isDragDisabled={isNotEditable}
                                      >
                                        {(provided: any) => (
                                          <TableRow
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            sx={{
                                              '&:last-child td, &:last-child th': { border: 0 },
                                              backgroundColor: getRowColor(row.id, table.original_po_club ),
                                            }}
                                            key={rowIndex}

                                          >
                                            <TableCell align="left" style={{ minWidth: '5px', width: '5px', maxWidth: '5px', cursor: isNotEditable && 'auto' }}>
                                              <Box style={{ display: 'flex', alignItems: 'center' }}>{!isNotEditable && <DragIndicatorIcon />} 
                                              <Link component={NextLink} href={purchaseOrderDetailPageURL(row.id)}>{row.name}</Link></Box>
                                            </TableCell>
                                          </TableRow>
                                        )}
                                      </Draggable>
                                    ))
                                  )}
                                  {provided.placeholder}
                                </TableBody>
                              )}
                            </Droppable>
                          </Table>
                        </TableContainer>
                      </Card>
                    ))}
                  </Box>
                )}
              </Droppable>
            </DragDropContext>

          </Grid>
        </Grid>
        {!isNotEditable &&
          <Box sx={{ display: 'flex', justifyContent: 'end' }}>
            <Button variant='outlined' sx={{ mb: 2, mr: 2 }} onClick={addNewClub}>Add Club</Button>
          </Box>}
        <RitzModal
                onClose={() => setPoClubCompleteState(false)} 
                title={modalTitle}
                open={poClubCompleteState} 
                maxWidth='sm' 
            >
        <Typography>After confirming the club sets, purchase orders in it won't be editable.</Typography>   

        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'end' }}>
          <Button variant="contained"   onClick={handlePoclubComplteState} >Ok</Button>
          <Button variant="contained" color='secondary' onClick={() => setPoClubCompleteState(false)} style={{ marginLeft: '10px' }} >Close</Button>
        </Box>
        </RitzModal>
        
        {type === 'mapping' && (
          <Button
            variant="contained"
            sx={{ float: 'right', mt: 1, px: 2 }}
            onClick={isNotEditable ? handleNextButtonAction : () => saveClubData('save')}
          >
            {isNotEditable? nextLoading && <SaveSpinner />: isSaving && <SaveSpinner />}
            {isNotEditable ? 'Next' : 'Save'}
          </Button>
        )}

        {!isNotEditable && (
          <>
            <Button variant="contained" sx={{ float: 'right', mt: 1, px: 1, mr: 2 }} onClick={() => setPoClubCompleteState(true)}>Mark as Complete</Button>
            {type !== 'mapping' && (
              <Button variant="contained" sx={{ float: 'right', mt: 1, px: 1, mr: 2 }} onClick={() => saveClubData('save')} color="primary">{isSaving && <SaveSpinner />}Save</Button>
            )}
          </>
        )}
      </>}
    </>
  );
};

export default PoClubing;
