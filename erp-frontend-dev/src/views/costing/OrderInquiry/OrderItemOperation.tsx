import React, { useEffect } from "react";
import { useState } from "react";
import { useRouter } from "next/router";
import * as RestUrls from '../../../helpers/constants/RestUrls';
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { IconButton, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, } from "@mui/material";
import api from "@/services/api";
import DefaultLoader from "@/components/DefaultLoader";
import LaunchIcon from '@mui/icons-material/Launch';
import CreateOperation from "../../settings/item/CreateOperation";
import toast from "react-hot-toast";
import { getDefaultError, hasRole } from "@/helpers/Utilities";
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import { IE_USER } from "@/helpers/constants/RoleManager";
import RitzModal from "@/components/Ritz/RitzModal";
import CopyOperation from "@/views/settings/item/CopyOperation";

const OrderItemOperation = ({ itemId, orderItemId, colorwayCategoryd, colorwayId, versionId }: any) => {

  const router = useRouter();
  const [editOperationId, setOperationId] = useState(0);
  const [editVariationId, setVariationId] = useState(0);
  const [openOperation, setOpenOperation] = useState(false);
  const [openCopyOperation, setOpenCopyOperation] = useState(false);
  const [title, setTitle] = useState<string>()
  const [isLoading, setIsLoading] = useState(true);
  const canEdit = hasRole(IE_USER);

  const [rows, setRows] = React.useState([]);

  const onDragEnd = (result: any) => {
    if (!result.destination) {
      return;
    }
    
      const reorderedRows = Array.from(rows);
      const [movedRow] = reorderedRows.splice(result.source.index, 1);
      reorderedRows.splice(result.destination.index, 0, movedRow);
      setRows(reorderedRows);
      setDisplayOrder(reorderedRows)
    

  };

  const setDisplayOrder = (rows: any) => {

    const displayOrderDataList = rows.map((row: any, index: any) => ({
      order_item_colorway_operation_id: row.id,
      display_order: index
    }));

    const displayOrder = RestUrls.orderItemColorwayOperationDisplayOrder();
    api.put(displayOrder, displayOrderDataList).then(resp => {
      const resdata = resp?.data || {};
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => setIsLoading(false));
  }

  const getOperationList = (orderItemId: any, colorwayId: any, versionId:any) => {
    const operationActiveStatus =true
    const operatiList = RestUrls.getOrderItemColorwayOperationsURL(orderItemId, colorwayId, versionId);
    api.get(operatiList).then(resp => {
      const resdata = resp?.data || {};
      setRows([...resdata.operations])
      setVariationId(resdata.variation)
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => setIsLoading(false));
  }
  

  const handleModalCloseOperation = (status: any) => {
    setOpenOperation(status)
  };

  const handleGetSavedData = (data: any) => {
    getOperationList(orderItemId, colorwayId, versionId);
  };

  const modalOpenOperation = (isOpen: any, title: string, operationId: any, variationId: any) => {
    setTitle(title)
    setOperationId(operationId);
    setOpenOperation(isOpen);
  };

  const modalOpenCopyOperations = (isOpen: any, title: string, operationId: any, variationId: any) => {
    setTitle(title)
    setOpenCopyOperation(isOpen);
  };

  const modalClose = () => {
    setOpenCopyOperation(false);
  };

  useEffect(() => {
    getOperationList(orderItemId, colorwayId, versionId)
   
  }, [colorwayCategoryd, orderItemId, colorwayId]);


  

  return (
    <>

      {isLoading ? <DefaultLoader /> : <>
        <Box sx={{ width: '100%', typography: 'body1', }}>
          <Button
            variant="outlined"
            sx={{ mt: 2, mb: 3 }}
            onClick={() => {
              modalOpenOperation(true, "Create Operation", 0, 1);
            }}
            disabled={!canEdit}
          >
            Add Operation
          </Button>
          <Button
            variant="outlined"
            sx={{ mt: 2, mb: 3, ml: 2 }}
            disabled={!canEdit}
            onClick={() => {
              modalOpenCopyOperations(true, "Copy Operations - Select Colorway Item ", 0, 1);
            }}
          >
            Copy Operations
          </Button>
        </Box>
        <Box sx={{ width: '100%', typography: 'body1' }}>
          <TableContainer component={Paper}>
            <Table sx={{ minWidth: 650 }} aria-label="simple table">
              <TableHead>
                <TableRow>
                  <TableCell></TableCell>
                  <TableCell>Operation</TableCell>
                  <TableCell align="left">Costed SMV</TableCell>
                  <TableCell align="left">Factory SMV</TableCell>
                  <TableCell align="left">Machine Type</TableCell>
                  <TableCell align="left">Folder Type</TableCell>
                  <TableCell align="left">Video</TableCell>
                  <TableCell align="center">Action</TableCell>
                </TableRow>
              </TableHead>
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="rows">
                  {(provided: any) => (
                    <TableBody ref={provided.innerRef} {...provided.droppableProps}>
                      {
                        rows.length > 0 ? (
                            
                          rows.map((row, index) => (
                            <Draggable key={row.id.toString()} draggableId={row.id.toString()} index={index} isDragDisabled={!row.active || !canEdit}>
                              {(provided: any) => (
                                <TableRow
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  sx={{ '&:last-child td, &:last-child th': { border: 0 }, backgroundColor: row.active ? 'inherit' : '#F48484' }}
                                >
                                  <TableCell align="left" style={{ minWidth: '5px', width: '5px', maxWidth: '5px' }}>{row.active ? <DragIndicatorIcon /> : <CloseIcon />}</TableCell>
                                  <TableCell>{row.operation_name}</TableCell>
                                  <TableCell align="left">{row.costing_smv}</TableCell>
                                  <TableCell align="left">{row.factory_smv}</TableCell>
                                  <TableCell align="left">{row.machine_type_name}</TableCell>
                                  <TableCell align="left">{row.folder_type_name}</TableCell>
                                  <TableCell align="left">
                                    <Box style={{ display: 'flex', alignItems: 'center' }}>
                                      {row.video && <LaunchIcon style={{ marginRight: '10px' }} />}
                                      {row.video ? (
                                        <a
                                          href={row.file_details}
                                          style={{ color: 'blue' }}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={() => window.open(row.file_details, '_blank')}
                                        >
                                          {row.display_name}
                                        </a>
                                      ) : (
                                        'No video available'
                                      )}
                                    </Box></TableCell>
                                  <TableCell align="center" ><IconButton size='small' disabled={!canEdit} color='primary' onClick={() => modalOpenOperation(true, "Edit Operation", row.id, row.variation)}><EditIcon fontSize='inherit' /></IconButton></TableCell>
                                  <TableCell align="center" style={{ display: 'none' }}>{row.display_order}</TableCell>
                                </TableRow>
                              )}
                            </Draggable>
                          ))) : (
                          <TableRow>
                            <TableCell colSpan={9} align="center"> No data available. </TableCell>
                          </TableRow>
                        )}
                      {provided.placeholder}
                    </TableBody>
                  )}
                </Droppable>
              </DragDropContext>
            </Table>
          </TableContainer>
        </Box>

        {openOperation && (
          <CreateOperation
            openModal={openOperation}
            closeModalData={handleModalCloseOperation}
            title={title}
            selecteditemId={itemId}
            selectedVariationId={editVariationId}
            selectedOperationId={editOperationId}
            savedVariations={handleGetSavedData}
            getOperationURL={RestUrls.getItemColorwayOperationDetailURL}
            updateOperationURL={RestUrls.getItemColorwayOperationDetailURL}
            saveOperationURL={RestUrls.createItemColorwayOperationURL(colorwayId,orderItemId,versionId)}
          />
        )}
        {openCopyOperation && (
          <RitzModal open={openCopyOperation} onClose={modalClose} title={title} isLoading={isLoading} maxWidth={'sm'}>
            <CopyOperation orderItemId={orderItemId} colorwayCategoryId={colorwayCategoryd}  versionId={versionId} colorwayId={colorwayId} savedData={handleGetSavedData} modalClose={modalClose} />
          </RitzModal>
        )}
        
      </>}
    </>
  );
};
export default OrderItemOperation;