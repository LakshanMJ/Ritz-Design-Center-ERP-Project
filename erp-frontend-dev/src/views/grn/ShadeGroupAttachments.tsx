import React, { useEffect, useState } from 'react';
import { Grid, Box, Card, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Divider, Button, CardHeader, Paper, Alert, Typography, Tooltip,} from '@mui/material';
import * as GrnUrls from '../../helpers/constants/rest_urls/GrnUrls';
import EditIcon from '@mui/icons-material/Edit';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import { LISTVIEW, THUMBNAILVIEW } from '@/helpers/constants/FileUpload';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';
import SaveIcon from '@mui/icons-material/Save';
import RitzInput from '@/components/Ritz/RitzInput';
import DefaultLoader from '@/components/DefaultLoader';
import RitzImageUploader from '@/components/Ritz/RitzImageUploader';
import AspectRatioIcon from '@mui/icons-material/AspectRatio';
import FormErrorMessage from '@/components/FormErrorMessage';

const ShadeGroupsAttachments = ({ materialId, supplierMaterialCodeId, clubId, grnId, shadeGroupSavedStatus, addNewGroup, handleAddnewShadeStatus, refreshData }: any) => {
  const [isLoading, setIsLoading] = useState(true);
  const [shadeGroupeSavedStatus, setShadeGroupeSavedStatus] = useState(shadeGroupSavedStatus);
  const [shadeDetails, setShadeDetails] = useState([]);
  const [deleteError, setDeleteError] = useState({ errors: '' });
  const [selectedGroupShadeIndex, setSelectedGroupShadeIndex] = useState(null);
  const [isEnableSubRowEdit, setIsEnableSubRowEdit] = useState(false);
  const [isEnableShadeGroupRolls, setIsEnableShadeGroupRolls] = useState(false);
  const [rollDetails, setRollDetails] = useState([]);
  const [shadeGroupeName, setSetShadeGroupeName] = useState("");
  const [selectedShadeGroupId, setSelectedShadeGroupId] = useState(null);
  const [shadeUploadingErrors, setShadeUploadingErrors] = useState<any>({});
  const fileLocation = 'grn/actual_shade/attachments'; 

  const fetchData = () => {
    const requests = [
      api.get(GrnUrls.actualShadeGroupDetailsUrl(supplierMaterialCodeId)),
    ];
    Promise.all(requests).then(resp => {
      const response = resp.map((r: any) => r.data);
      const [shadeGroupDetails] = response
      setShadeDetails([...shadeGroupDetails])
      setShadeGroupeSavedStatus(false)
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => setIsLoading(false))
  }
  const getGroupPackItems = () => {
    api.get(GrnUrls.actualShadeGroupRollDetailsUrl(selectedShadeGroupId))
      .then(resp => {
        const resdata = resp?.data || {};
        setRollDetails([...resdata.rolls]);
      })
      .catch(error => {
        toast.error(getDefaultError(error?.response?.status));
      });
  };
  const handleFileChange = (attachment: any, shadeGroupId: any, groupShadeIndex: any) => {
    setShadeUploadingErrors({})
    if (attachment[0]?.id != null) {
      const dataToSend = {
        id: shadeGroupId || null,
        material: materialId,
        po_club: clubId,
        display_order: shadeDetails[groupShadeIndex].display_order,
        shade_name: shadeDetails[groupShadeIndex].shade_name,
        attachment: attachment[0]
      };
      api.post(GrnUrls.actualShadeGroupAttachmentUploadUrl(supplierMaterialCodeId), dataToSend).then(resp => {
        fetchData()
        refreshData(true)
      }).catch(error => {
        toast.error(getDefaultError(error?.response?.status));
      })
    }
    const updatedShadeDetails = [...shadeDetails];
    updatedShadeDetails[groupShadeIndex] = {
      ...updatedShadeDetails[groupShadeIndex],
      attachment: attachment[0] || null
    };
    setShadeDetails(updatedShadeDetails);

  };

  const handleEditGroupShade = (groupShadeIndex: number, shadeGroupId: number, status: any) => {
    setSelectedGroupShadeIndex(groupShadeIndex)
    setIsEnableSubRowEdit(status)
    const dataToSend = {
      id: shadeGroupId || null,
      material: materialId,
      po_club: clubId,
      display_order: shadeDetails[groupShadeIndex].display_order,
      shade_name: shadeDetails[groupShadeIndex].shade_name,
      attachment: shadeDetails[groupShadeIndex].attachment
    };
    if (!status) {
      api.post(GrnUrls.actualShadeGroupAttachmentUploadUrl(supplierMaterialCodeId), dataToSend).then(resp => {
        refreshData(true)
        fetchData()
      }).catch(error => {
        console.log(error?.response?.data)
        if(error?.response?.data){
          setShadeUploadingErrors(error?.response?.data);
        }
        toast.error(getDefaultError(error?.response?.status));
      })
    }

  }
  const handleDeleteShadeGroup = (shadeGroupId: any, groupShadeIndex: any) => {
    setDeleteError({ errors: '' });
    if(shadeGroupId){
      api.post(GrnUrls.actualShadeGroupDeleteUrl(shadeGroupId, grnId)).then(resp => {
        refreshData(true)
        fetchData()
      }).catch(error => {
        setDeleteError(error?.response.data)
        toast.error(getDefaultError(error?.response?.status));
      })
    }else{
      setShadeDetails(prevDetails => {
        const updatedDetails = [...prevDetails];
        updatedDetails.splice(groupShadeIndex, 1);
        return updatedDetails;
      });
    }
  };

  const handleInputChanges = (event: any, shadeGroupIndex: number) => {
    const { name, value } = event.target;
    const updatedShadeDetails = [...shadeDetails];
    updatedShadeDetails[shadeGroupIndex] = {
      ...updatedShadeDetails[shadeGroupIndex],
      [name]: value
    };
    setShadeDetails(updatedShadeDetails);
  }
  const handleViewShadeGroupRolls = (shadeGroupId: any, shadeGroupeName: any, groupShadeIndex: any) => {
    setIsEnableShadeGroupRolls(true)
    setSetShadeGroupeName(shadeGroupeName)
    setSelectedShadeGroupId(shadeGroupId)

  };
  const handleClick = () => {
    const newIndex = {
      "id": null as any,
      "attachment": null as any,
      "shade_name": "NewShadeGroup",
      "display_order": shadeDetails.length + 1,
      "material": materialId,
  };
  setShadeDetails([...shadeDetails, newIndex]);
  handleAddnewShadeStatus(false)

  };

  useEffect(() => {
    if (materialId || shadeGroupSavedStatus) {
      fetchData();
    }
  }, [materialId, shadeGroupSavedStatus]);

  useEffect(() => {
    if (selectedShadeGroupId) {
      getGroupPackItems();
    }
  }, [selectedShadeGroupId]);

  useEffect(() => {
    if (addNewGroup) {
      handleClick();
    }
  }, [addNewGroup]);
  return (
    <>
      {isLoading ? (
        <DefaultLoader />
      ) : (
        <>
          <Box>
            <Table aria-label="simple table" component={Paper} >
              <TableHead>
                <TableRow sx={{
                  '&:nth-of-type(odd)': {
                    backgroundColor: (theme) => theme.palette.grey[50],
                  },
                  '&:last-child td, &:last-child th': {
                    borderBottom: 0
                  }
                }}>
                  {shadeDetails?.map((groupShade: any, groupShadeIndex: any) => (
                    <TableCell sx={{ borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`, width: '10' }} key={groupShadeIndex}>
                      {selectedGroupShadeIndex === groupShadeIndex && isEnableSubRowEdit ? (
                        <Box sx={{ display: 'flex' }}>
                          <RitzInput
                            name={`shade_name`}
                            id={`shade_name_${groupShadeIndex}`}
                            selectedValue={groupShade.shade_name || ""}
                            size={'small'}
                            inputType={'text'}
                            handleOnChange={(event: any) => handleInputChanges(event, groupShadeIndex)}
                          />
                          <Tooltip title="Save" arrow>
                            <SaveIcon
                              color="success"
                              sx={{ marginLeft: '0.1rem', verticalAlign: 'middle', fontSize: '20px', cursor: 'pointer' }}
                              onClick={() => handleEditGroupShade(groupShadeIndex, groupShade.id, false)}
                            />
                          </Tooltip>
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex' }}>
                          <Typography >
                            {groupShade.shade_name}
                          </Typography>
                          <EditIcon
                            color="primary"
                            sx={{ marginLeft: 2, marginBottom: 1, fontSize: '20px', cursor: 'pointer' }}
                            onClick={() => handleEditGroupShade(groupShadeIndex, groupShade.id, true)}
                          />
                          <AspectRatioIcon
                            onClick={() => handleViewShadeGroupRolls(groupShade.id, groupShade.shade_name, groupShadeIndex)}
                            sx={{ marginBottom: 1, fontSize: '20px', cursor: 'pointer' }}
                            fontSize='small'
                            color='info' />
                            {groupShade.id && (
                              <DeleteForeverIcon
                                onClick={() => handleDeleteShadeGroup(groupShade.id, groupShadeIndex)}
                                sx={{ marginBottom: 1, fontSize: '20px', cursor: 'pointer' }}
                                fontSize='small'
                                color='error'
                              />
                            )}
                        </Box>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow >
                  {shadeDetails?.map((groupShade: any, groupShadeIndex: any) => (
                    <TableCell sx={{ borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'center' }} key={groupShadeIndex}>
                      <RitzImageUploader
                        displayType={THUMBNAILVIEW}
                        selectedFilesParent={[groupShade.attachment] || []}
                        handleFileChangeParent={(selectedFiles: any) => handleFileChange(selectedFiles, groupShade.id, groupShadeIndex)}
                        thumbnailWidth="100px"
                        thumbnailHeight="100px"
                        filelocation={fileLocation} />
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
            <Box sx={{ p: 1 }}>
              <FormErrorMessage message={shadeUploadingErrors?.shade_swatch} />
            </Box>
          </Box>
          <Box sx={{ mt: 2, mb: 2 }}>
            <Typography   fontWeight='bold'>Fabric Roll Details {shadeGroupeName} :</Typography>
            {isEnableShadeGroupRolls ? (
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Barcode</TableCell>
                            <TableCell>Batch No</TableCell>
                            <TableCell>Roll No</TableCell>
                            <TableCell>Width</TableCell>
                            <TableCell>Width Unit</TableCell>
                            <TableCell>Shade</TableCell>
                          </TableRow>
                        </TableHead>
                    <TableBody>
                      {rollDetails.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} sx={{ textAlign: 'center' }}>No available fabric rolls</TableCell>
                        </TableRow>
                      ) : (
                        rollDetails.map((roll, rollIndex) => (
                          <TableRow key={rollIndex}>
                            <TableCell>{roll.barcode}</TableCell>
                            <TableCell>{roll.batch_number.display_value}</TableCell>
                            <TableCell>{roll.pack_number}</TableCell>
                            <TableCell>{roll.actual_width.display_value}</TableCell>
                            <TableCell>{roll.actual_width_units.display_value}</TableCell>
                            <TableCell>{roll.shade.display_value}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                      </Table>
                    </TableContainer>
                  
             
            ) : (
              <Alert severity='info' sx={{ mb: 1, mt: 1 }}>
                Please click on the expand icon in shade group to view fabric roll details
              </Alert>
            )}

          </Box>
          {deleteError.errors !== '' && (
            <Alert sx={{ mt: 2}} severity="error">{deleteError.errors}</Alert>
          )}

        </>
      )}

    </>

  );
};

export default ShadeGroupsAttachments;