import FormErrorMessage from '@/components/FormErrorMessage';
import RitzInput from '@/components/Ritz/RitzInput';
import RitzSelection from '@/components/Ritz/RitzSelection';
import { TableContainer, Table, TableCell, TableHead, TableRow, TableBody, Typography, Box, Tooltip, Button, Link } from '@mui/material';
import error from 'next/error';
import React, { useEffect, useRef, useState } from 'react';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import * as RestUrls from '@/helpers/constants/RestUrls';
import CreatableSelect from 'react-select/creatable';
import CheckIcon from '@mui/icons-material/Check';
import ClearIcon from '@mui/icons-material/Clear';
import SaveIcon from '@mui/icons-material/Save';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import * as GrnUrls from '../../helpers/constants/rest_urls/GrnUrls';
import EditIcon from '@mui/icons-material/Edit';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import SettingsOverscanIcon from '@mui/icons-material/SettingsOverscan';
import { green, red } from '@mui/material/colors';
import { getDefaultError } from '@/helpers/Utilities';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import api from '@/services/api';
import toast from 'react-hot-toast';
import DefectDetails from './DefectDetails';
import RitzModal from '@/components/Ritz/RitzModal';
import SaveSpinner from '@/components/SaveSpinner';
import { DEFAULT_SUCCESS } from '@/helpers/constants/Constants';
import materialDetail from "@/views/settings/userdefine_material/MaterialDetail";
import GRNInlineEditView from "@/views/grn/GRNInlineEdit";
import { COMPLETE_STATE, FABRIC_INSPECTION_STATE } from '@/helpers/constants/GrnStates';
import { ReactKeyHelper } from '@/helpers/KeyHelper';


const GrnRowDetailsView = ({grnId, rowData, currentState, setNewRow, setToRefreshData, setUnsavedRowClean, grnType, editStatus, modalType}: any) => {
  const deletingTypeKey = 'deletingType';
  const materialHeadersKey = 'material_headers';
  const materialDetailsKey = 'material_details';
  const deleteModalStateKey = 'deleteModalOpened';
  const selectedDeletingIdKey = 'selectedDeletingId';
  const selectedGrnMaterialIndexKey = 'selectedGrnMaterialIndex';
  const grnMaterialDetailsKey = 'supplierpogrnmaterialdetail_set';
  const selectedGrnMaterialSubIndexKey = 'selectedGrnMaterialSubIndex';
  const materialDetailIdKey = 'inline_edit_material_detail_id';
  const idKey = 'id';
  const currentEditRowIndexKey = 'current_edit_row_index';
  const subRowDataKey = 'sub_row_data';
  const subRowAttachments = 'attachments'
  const defaultActiveRowDetails = {
    [currentEditRowIndexKey]: null as any,
    [subRowDataKey]: {
      [subRowAttachments]: [] as any,
    }
  };
  const keyHelper = new ReactKeyHelper();

  const [materialDetailData, setMaterialDetailData] = useState<any>({});
  const [openDefectModal, setOpenDefectModal] = useState(false);

  const [activeEditRowDetails, setActiveEditRowDetails] = useState<any>(defaultActiveRowDetails);

  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedRollId, setSelectedRollId] = useState(0);
  const [selectedMaterialId, setSelectedMaterialId] = useState(0);
  const [selectedSubRowDetails, setSelectedSubRowDetails] = useState<any>({});
  const [selectedSubRowHeaders, setSelectedSubRowHeaders] = useState<any>([]);
  const [selectedCustomerBrandMaterialId, setSelectedCustomerBrandMaterialId] = useState(0);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<any>({});

  // TODO - is this okay?
  const subRowHeaders = materialDetailData?.[materialHeadersKey]?.filter((header: { is_visible: any; }) => header.is_visible);
  const subRowDetails = materialDetailData?.[grnMaterialDetailsKey]
  const materialType = materialDetailData?.[materialDetailsKey]?.['material_type']
  const materialId = materialDetailData?.[materialDetailsKey]?.['user_material_id']
  const customerBrandMaterialId = materialDetailData?.[materialDetailsKey]?.['customer_brand_material_id']

  useEffect(() => {
      setMaterialDetailData({...rowData?.row?.original});
  }, [rowData]);


  useEffect(() => {
    setMaterialDetailData({...rowData?.row?.original});
  }, [rowData])

    const handleAddSubRow = (row: any, headers: any) => {
      const rowIndex = row?.row?.index

      const materialId = rowData?.row?.original?.id;
        let newMaterialDetails: any = {
          id: null,
          grn_material: materialId
      };

      headers.forEach((header: any) => {
        const value = header.attribute_type === "boolean" ? true : null;
        newMaterialDetails[header.name] = value;
      });

      setNewRow(true, rowIndex, newMaterialDetails)
    };

  const handleEnableRowEdit = (subRowIndex: number) => {
    const updatingRow = materialDetailData?.[grnMaterialDetailsKey]?.[subRowIndex];
    editStatus(updatingRow)
    setActiveEditRowDetails({
        [currentEditRowIndexKey]: subRowIndex,
        [subRowDataKey]: {...updatingRow},
        [materialDetailIdKey]: materialDetailData?.[idKey]
    });
  }

  const handleDefectModalClose = (status: any) => {
    setOpenDefectModal(status)
  };

  const handleDefectSaveModalClose = (status: any) => {
    if (status) {
      setOpenDefectModal(false)
      setToRefreshData(status);
  }
  };
  

  const handleOpenDefectModal = (rollId: any, rowHeaders: any, rowDetails: any, materialId: any, customerBrandMaterialId: any) => {
      setSelectedRollId(rollId);
      setSelectedSubRowHeaders(rowHeaders);
      setSelectedSubRowDetails(rowDetails);
      setSelectedMaterialId(materialId);
      setSelectedCustomerBrandMaterialId(customerBrandMaterialId);
      setOpenDefectModal(true)
  }

  const handleCloseInlineEdit = (refreshData: boolean) => {
    setActiveEditRowDetails({...defaultActiveRowDetails});
    if (refreshData) {
      setToRefreshData(refreshData);
    }
  }


  const handleDeleteModelOpen = (selectedId: number, rowIndex: number, subRowIndex: number, type: any) => {
    if (type === 'unsaved_row') {
      setUnsavedRowClean(rowIndex, subRowIndex, 0)
    } else {
      setIsDeleteModalOpen({ [deleteModalStateKey]: true, [selectedGrnMaterialIndexKey] : rowIndex,  [selectedGrnMaterialSubIndexKey]: subRowIndex, [selectedDeletingIdKey]: selectedId, [deletingTypeKey] : type })
    }
  }

  const handleDeleteModelClose = () => {
    setIsDeleting(false);
    setIsDeleteModalOpen({ [deleteModalStateKey]: false, [selectedGrnMaterialIndexKey]: null, [selectedGrnMaterialSubIndexKey]: null, [selectedDeletingIdKey]: null, [deletingTypeKey]: ''})
  }

  const handleDeleteRow = () => {
    api.delete(GrnUrls.materialDetailRowDeleteUrl(isDeleteModalOpen?.[selectedDeletingIdKey])).then(response => {
      setIsDeleteModalOpen({ [deleteModalStateKey]: false})
      toast.success(DEFAULT_SUCCESS);
      setToRefreshData(true)
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => setIsDeleting(false))
  }

  const handleDownload = (filePath: string, fileName: string) => {
    if (!filePath) {
      toast.error("The file cannot be located or is invalid.");
      return;
    }
    const link = document.createElement('a');
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.href = filePath;
    link.download = fileName;
    link.click();
  };


  const getAttachmentsDisplay = (attachmentRowData: any) => {
    const attachmentData = attachmentRowData?.['attachment_details'];

    return (
        attachmentData?.length > 0 && attachmentData.map((attachment: any, attachmentIndex: any) => (
            <Box key={attachmentIndex} sx={{display: 'flex', alignItems: 'center', mt: 1}}>

              <Tooltip title="Download" arrow>
                <FileDownloadIcon
                    color="primary"
                    sx={{marginLeft: '0.1rem', verticalAlign: 'middle', fontSize: '20px', cursor: 'pointer'}}
                    onClick={() => handleDownload(attachment?.['file_path'], attachment?.['display_name'])}
                />
              </Tooltip>
              <Typography key={attachmentIndex} sx={{marginLeft: '0.5rem', wordBreak: 'break-all', width: '300px'}}>
                {attachment['display_name']}
              </Typography>
            </Box>
        ))
    )

  }

  return (
    <>
    {isDeleteModalOpen?.[deleteModalStateKey] && <RitzModal
      open={isDeleteModalOpen?.[deleteModalStateKey]}
      onClose={handleDeleteModelClose}
      maxWidth='xs'
      title='Confirm Delete'>
      <>
        <Box>
          <Typography>Are you sure you want to delete this {isDeleteModalOpen?.[deletingTypeKey] === 'row' || 'unsaved_row' ? 'row' : 'attachment'}?</Typography>
          <Box sx={{ display: 'flex', justifyContent: 'end', mt: 3 }}>
            <Button variant='contained' onClick={handleDeleteRow} color='error' disabled={isDeleting}>
              {isDeleting && <SaveSpinner/>}Delete
            </Button>
        </Box>
        </Box>
      </>
    </RitzModal>}
    {openDefectModal && (
      <DefectDetails 
        openModal={openDefectModal} 
        closeModalData={handleDefectModalClose} 
        handleCloseDefectSave={handleDefectSaveModalClose}
        rowDetails={selectedSubRowDetails} 
        rowHeaders={selectedSubRowHeaders}
        rollId={selectedRollId} 
        currentState={currentState}
        grnId={grnId} 
        materialId={selectedMaterialId}
        subRowGRNDetails={activeEditRowDetails?.[subRowDataKey]}
        customerBrandMaterialId={selectedCustomerBrandMaterialId}
        grnMaterialId={materialDetailData.id} 
        materialType={materialDetailData.material_details.material_type}
        modalType={modalType}/>
    )}
     <TableContainer sx={{ overflowX: 'auto' }}>
     <Table
        size="small"
        sx={{
           minWidth: 650,
           borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`,
           '& .MuiTableCell-head': {
             color: (theme) => theme.palette.grey[700],
             background: (theme) => theme.palette.grey[50],
           },
          }}
        aria-label="customized table">
        <TableHead>
          <TableRow>
            {subRowHeaders?.map((header: any, headerIndex: any)  => (
            <TableCell key={`${headerIndex}`}>
              {header?.label}
            </TableCell>
            ))}
            <TableCell />
          </TableRow>
        </TableHead>
        <TableBody>
        {subRowDetails?.map((subRowDetail: any, subRowIndex: number) => (
            subRowIndex == activeEditRowDetails?.[currentEditRowIndexKey] ? (

                <GRNInlineEditView
                    subRowGRNDetails={activeEditRowDetails?.[subRowDataKey]}
                    subRowGRNHeaders={subRowHeaders}
                    handleCloseInlineEdit={handleCloseInlineEdit}
                    materialDetailId={activeEditRowDetails?.[materialDetailIdKey]}
                />

            ): (
              <TableRow>
                {
                  subRowHeaders?.map((header: any, headerIndex: any) => {
                    return (
                        <TableCell  key={`${keyHelper.getNextKeyValue()}`} sx={{verticalAlign: header.value === 'qa_inspection_passed' ? 'center' : 'top', width: header.value === 'attachments' ? '1000px' : `${100 / subRowHeaders.length}%`,}}>
                           <Typography sx={{mt: 1, mb: 1}}>
                             {
                               header.value === 'qa_inspection_passed' ? (
                                <Box style={{ color: subRowDetail?.[header.name] === true ? 'green' : 'red' }}>
                                {subRowDetail?.[header.name] === true ? 'Passed'
                                  : subRowDetail?.[header.name] === false ? 'Rejected'
                                    : subRowDetail?.[header.name] === null ? ''
                                      : ''}
                                </Box>
                               ): header.value == 'attachments' ? (
                                   getAttachmentsDisplay(subRowDetail)
                               ): header.attribute_type === 'dropdown_create' || header.attribute_type === 'dropdown' ? (
                                   subRowDetail[header.name]?.['display_value'] || '--'
                               ): (
                                   subRowDetail?.[header.name] ? subRowDetail?.[header.name]: '--'
                               )
                             }
                             
                           </Typography>
                        </TableCell>
                    )
                })}
                <TableCell sx={{verticalAlign: 'center'}}>
                  <Box sx={{display: 'flex', flexDirection: 'row', justifyContent: 'end'}}>
                    {
                      currentState != COMPLETE_STATE &&
                        <>
                        {grnType != FABRIC_INSPECTION_STATE &&
                          <Tooltip title="Edit Row" arrow>
                            <EditIcon
                              color="primary"
                              sx={{ marginLeft: '0.1rem', verticalAlign: 'middle', fontSize: '20px', cursor: 'pointer' }}
                              onClick={() => handleEnableRowEdit(subRowIndex)}
                            />
                          </Tooltip>
                        }
                          
                          {
                            subRowDetail.id != null &&
                              <Tooltip title="Expand Row" arrow>
                              <SettingsOverscanIcon
                                color="secondary"
                                sx={{ marginLeft: '0.1rem', verticalAlign: 'middle', fontSize: '20px', cursor: 'pointer' }}
                                onClick={() => handleOpenDefectModal(subRowDetail.id, subRowHeaders, subRowDetail, materialId, customerBrandMaterialId)}
                              />
                            </Tooltip>
                          }
                          {
                            currentState === 'draft' && subRowDetails.length > 1 &&
                              <Tooltip title="Delete Row" arrow>
                                <DeleteOutlineIcon
                                  color="error"
                                  sx={{ marginLeft: '0.1rem', verticalAlign: 'middle', fontSize: '20px', cursor: 'pointer' }}
                                  onClick={() => handleDeleteModelOpen(subRowDetail?.id, rowData?.row?.index, subRowIndex, subRowDetail?.id === null ? 'unsaved_row' : 'row')}
                                />
                              </Tooltip>
                          }
                        </>
                    }
                  </Box>
                </TableCell>
              </TableRow>
            )
        ))}
        {materialType === 'fabric' && currentState === 'draft'  &&(
              <TableRow>
                <TableCell colSpan={subRowHeaders.length + 1}>
                  <Link color={'primary'} sx={{ float: 'right', cursor: 'pointer', fontSize: 'small', ml: 1 }} onClick={()=>handleAddSubRow(rowData, subRowHeaders)}>Add Row</Link>
                </TableCell>
          </TableRow>)}
        </TableBody>
      </Table>
     </TableContainer>
    </>
  )
}

export default GrnRowDetailsView