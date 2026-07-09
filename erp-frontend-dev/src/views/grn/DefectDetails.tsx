import RitzInput from '@/components/Ritz/RitzInput';
import RitzModal from '@/components/Ritz/RitzModal'
import RitzSelection from '@/components/Ritz/RitzSelection';
import RitzTable from '@/components/Ritz/RitzTable';
import SaveSpinner from '@/components/SaveSpinner';
import { Alert, Box, Button, Card, Checkbox, FormControl, FormControlLabel, FormLabel, Grid, IconButton, InputLabel, Link, Paper, Radio, RadioGroup, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography } from '@mui/material';
import { ColumnDef } from '@tanstack/react-table';
import React, { useEffect, useState } from 'react'
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import * as GrnUrls from '../../helpers/constants/rest_urls/GrnUrls';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';
import { DEFAULT_SUCCESS } from '@/helpers/constants/Constants';
import { getMaterialDetailURL } from '@/helpers/constants/rest_urls/MaterialAdministrationUrls';
import { DRAFT_STATE, QA_VERIFICATION_STATE } from '@/helpers/constants/GrnStates';
import { CheckBox } from '@mui/icons-material';
import CreatableSelect from 'react-select/creatable';
import CheckIcon from '@mui/icons-material/Check';
import { green, red } from '@mui/material/colors';
import ClearIcon from '@mui/icons-material/Clear';
import ReplayIcon from '@mui/icons-material/Replay';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import RitzSwitch from '@/components/Ritz/RitzSwitch';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import FormErrorMessage from '@/components/FormErrorMessage';

const DefectDetails = ({ openModal, rowDetails, rowHeaders, closeModalData, materialId, currentState, grnMaterialId, materialType, skippedBatch, showSkippedBatchesModal, handleCloseDefectSave, modalType }: any) => {
  const subRowDeletedAttachments = 'deleted_attachment_ids';
  const batchNumberKey = 'batch_number';
  const valueKey = 'value';
  const displayValueKey = 'display_value';
  const iDKey = 'id';
  const labelKey = 'label';
  const attributeTypeKey = 'attribute_type';
  const dropDownFieldType = 'dropdown';
  const selectOrCreateFieldType = 'dropdown_create';
  const qaInspectionPassedKey = 'qa_inspection_passed';
  const attachmentDetailsKey = 'attachment_details';
  const headerValueKey = 'value';
  const fabricKey = "fabric";
  const saveTypeKey = 'save';
  const nextTypeKey = 'next';
  const loadNextKey = 'load_next';
  const lastInspectionRollKey = 'last_inspection_roll';
  const skippedBatchesKey = 'skipped_batches';
  const successKey = 'success';
  const rollPassKey ='pass';
  const rollFailKey ='fail';
  const defectDistanceFromStartNameKey ='defect_distance_from_start';
  const defectWidthFromLeftNameKey ='defect_width_from_left';
  const fabricInspectionKey ='fabric_inspection'

  const [isLoading, setIsLoading] = useState(true);
  const [shadeOptionList, setShadeOptionList] = useState<any>([]);
  const [defects, setDefects] = useState<any>([rowDetails.supplierpogrnmaterialqa_set]);
  const [defectsList, setDefectsList] = useState<any>([]);
  const [rollDetails, setRollDetails] = useState<any>(rowDetails);
  const [deletedDeffectIds, setDeletedDeffectIds] = useState<any>([]);
  const [modalChangeStatus, setmodalChangeStatus] = useState(showSkippedBatchesModal);
  const [skippedBatches, setSkippedBatches] = useState<any>([]);
  const [errorList, setErrorList] = useState<any>({});
  const defectRatingList = [{ id: 1, defect_rating: '1' }, { id: '2', defect_rating: '2' }, { id: 3, defect_rating: '3' }, { id: 4, defect_rating: '4' }]
  const rollStatusTypes = [{ id: 'roll_to_roll_shading', name: 'Roll to Roll Shading' }, { id: 'within_the_roll_shading', name: 'Within Roll Shading' }]
  const passFailValue = rollDetails.qa_inspection_passed ? rollPassKey : rollFailKey;
  const handleChangeRollStatus = (event: any) => {
    const updatedRollDetails = { ...rollDetails };
    updatedRollDetails.qa_inspection_passed = event.target.value === rollPassKey ? true : false;
    setRollDetails(updatedRollDetails);
  };

  const deleteRow = (rollIndex: any, deffectId: any) => {
    if (deffectId) {
      const updatedDefectIds = [...deletedDeffectIds];
      updatedDefectIds.push(deffectId);
      setDeletedDeffectIds(updatedDefectIds);
    }

    const updatedDefectData = [...defects];
    updatedDefectData.splice(rollIndex, 1);
    setDefects(updatedDefectData);
  };

  const fetchDefectDetails = () => {
    const requests = [
      api.get(getMaterialDetailURL(materialId)),
    ];
    Promise.all(requests).then(resp => {
      const response = resp.map((r: any) => r.data);
      const [defects] = response
      setDefectsList(defects.userdefinedmaterialdefect_set)

    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => {
      setIsLoading(false)
    });
  };

  const modalClose = () => {
    closeModalData(false);
  };
  const handleCloseInlineDefectChanges = (refreshData: boolean) => {
    handleCloseDefectSave(refreshData);
  }
  const handleSelectChangeRollStatus = (event: any) => {
    setRollDetails({ ...rollDetails, shade_category: event.target.value || null });
  }

  const saveDefectDetails = (type: any) => {
    if (type == nextTypeKey) {
      setIsLoading(true);
    }
    const saveApi = GrnUrls.fabricRollDefectSaveUrl(grnMaterialId);
    const savePayload = {
      ...rollDetails,
      defects: defects.filter((defect: { id: string; defect: string; remark: string; }) => defect.id != null || defect.defect != null || defect.remark != null),
      deleted_deffect_ids: deletedDeffectIds,
    };
    api.post(saveApi, savePayload).then(resp => {
      if (type == saveTypeKey) {
        handleCloseDefectSave(true);
      }
      const modalStatus = resp.data.modal_status;
      let nextRollDetails = resp.data;
      let skipedBatches = resp.data?.rolls

      if (type != saveTypeKey) {
        switch (modalStatus) {
          case loadNextKey:
            setRollDetails(nextRollDetails);
            setDefects(nextRollDetails.supplierpogrnmaterialqa_set);
          case lastInspectionRollKey:
            setRollDetails(nextRollDetails);
            setDefects(nextRollDetails.supplierpogrnmaterialqa_set);
            break;
          case skippedBatchesKey:
            setmodalChangeStatus(true);
            setSkippedBatches([...skipedBatches]);
            break;
          case successKey:
            handleCloseInlineDefectChanges(true);
            break;
          default:
            break;
        }
      }
      toast.success(DEFAULT_SUCCESS);
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
      if(error?.response?.data?.errors){
        setErrorList({...error?.response?.data?.errors})
      }
    }).finally(() => {
      setIsLoading(false);
    });
  };

  const handleChangeRollDetails = (event: any, index: any) => {
    const { name, value } = event.target;
    const updatedDefects = [...defects];
    updatedDefects[index][name] = value || null;
    setDefects(updatedDefects);
  };

  const handleChangeRollWidthDistance = (event: any, index: any) => {
    const { name, value } = event.target;
    const updatedDefects = [...defects];
    updatedDefects[index][name] = value || null;
    setDefects(updatedDefects);
  };

  const addNewRow = () => {
    const newRollDetail = { 
      id: null as any, 
      defect: null as any, 
      remarks: null as any,
      defect_distance_from_start: null as any,
      defect_width_from_left: null as any,
      defect_rating: null as any    };
    const updatedDefects = [...defects];
    updatedDefects.push(newRollDetail);
    setDefects(updatedDefects);
  };

  const handleCheckboxChange = (event: any, ratingId: any, index: any) => {
    const updatedDefects = [...defects];
    updatedDefects[index].defect_rating = event.target.checked ? parseInt(ratingId) : null;
    setDefects(updatedDefects);
  };

  const handleSubRowSelectChanges = (event: any, optionName: number) => {
    const { name, value } = event.target;
    setRollDetails({
      ...rollDetails,
      [name]: {
        [valueKey]: value,
        [displayValueKey]: optionName
      }
    });
  }
  const handleGetOrCreateChanges = (event: any, rowData: any, fieldName: any) => {
    let changedValues;
    if (event['__isNew__']) {
      changedValues = { [valueKey]: null, [displayValueKey]: event[labelKey] }
    } else {
      changedValues = { [valueKey]: event[valueKey], [displayValueKey]: event[labelKey] }
    }
    setRollDetails({
      ...rollDetails,
      [fieldName]: changedValues
    });

    if (fieldName == batchNumberKey) {
      refreshBatchNumbers();
    }
  }
  const handleSubRowInputChanges = (event: any) => {
    const { name, value } = event.target;
    setRollDetails({
      ...rollDetails,
      [name]: value
    });
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
  const refreshBatchNumbers = () => {
    const batchNumber = rollDetails?.[batchNumberKey]?.[valueKey];

    if (batchNumber != null) {
      api.get(GrnUrls.shadeListUrl(batchNumber)).then(response => {
        const responseData = response?.data || []
        setShadeOptionList(responseData);
      }).catch(error => {
        toast.error(getDefaultError(error?.response?.status));
      });
    }
  }

  const handleCompletedSwitch = (event: any) => {
     setRollDetails({ ...rollDetails, complete_state: event.target.checked });
  };

  const handleClick = (rollDetail: any) => {
    setRollDetails(rollDetail);
    setDefects(rollDetail.supplierpogrnmaterialqa_set);
    setmodalChangeStatus(false)
  };

  useEffect(() => {
    if (defects?.length == 0) {
      addNewRow()
    }
  }, [defects]);

  useEffect(() => {
    if (materialId !== 0) {
      fetchDefectDetails()
    }
  }, [materialId]);

  useEffect(() => {
    if (rowDetails.length!=0) {
      setRollDetails(rowDetails)
      setDefects(rowDetails.supplierpogrnmaterialqa_set)
      
    }
  }, [rowDetails]);

  useEffect(() => {
    if(skippedBatch?.length != 0 && showSkippedBatchesModal){
      setmodalChangeStatus(true);
      setSkippedBatches([...skippedBatch]);
    }
  }, [skippedBatch]);




  return (
    <>
      <RitzModal open={openModal} onClose={modalClose} title={modalType == fabricInspectionKey ? "Add Roll Defects" : "Edit Roll Details"} isLoading={isLoading} maxWidth={'lg'}>
        <Stack>
          {modalChangeStatus ? (
            <>
              <Box>
                <Alert severity="warning">You have to need review the following Skipped Batchs . Please select the Batch & Inspect</Alert>
              </Box>
              <Box sx={{ mt: 3 }}>
                {skippedBatches.map((skipBatch: any, index: any) => (
                  <Box key={index} display="flex" alignItems="center" sx={{mb:2}}>
                    <FiberManualRecordIcon color={'primary'} sx={{ marginRight: '5px' }} />
                    <Link sx={{ cursor: 'pointer' }} onClick={() => handleClick(skipBatch)}>
                      {skipBatch.batch_number.display_value}
                    </Link>
                  </Box>
                ))}
              </Box>

            </>
          ) : (
            <>
              <Card sx={{ mb: 2, padding: 2 }}>
                <Typography style={{ fontWeight: 'bold' }}>Roll Details:</Typography>
                <Grid container spacing={2}>
                  {rowHeaders.map((header: any, rowHeaderIndex: any) => {
                    const optionList =
                      header.value === 'shade'
                        ? shadeOptionList.map((option: any) => ({
                          label: option.display_value,
                          value: option.value,
                        }))
                        : header?.dropDownOptions?.map((option: any) => ({
                          label: option.display_value,
                          value: option.value,
                        }));

                    return (
                      <Grid item xs={12} sm={5} md={4} lg={3} key={rowHeaderIndex}>
                        <Box sx={{ m: 1 }}>
                          <Box key={rowHeaderIndex}>
                            {header?.[attributeTypeKey] === selectOrCreateFieldType && (
                              <Box>
                                <Box sx={{ mb: 2 }}>
                                  <InputLabel id={`${header.name}-label`}>{header.label}</InputLabel>
                                </Box>
                                <CreatableSelect
                                  options={optionList}
                                  value={{
                                    label: rollDetails?.[header.name]?.[displayValueKey],
                                    value: rollDetails?.[header.name]?.[valueKey],
                                  }}
                                  onChange={(event: any) =>
                                    handleGetOrCreateChanges(event, rollDetails, header.name)
                                  }
                                  menuPosition={'fixed'}
                                  isDisabled={header.isReadOnly}
                                  menuPlacement={'auto'}
                                  styles={{
                                    menu: (provided, state) => ({
                                      ...provided,
                                      zIndex: 9999,
                                      maxHeight: '50px',
                                    }),
                                    option: (provided, state) => ({
                                      ...provided,
                                      backgroundColor: state.isSelected ? '#E4F1FF' : 'white',
                                      color: 'black',
                                      ':hover': {
                                        backgroundColor: '#F0F0F0',
                                      },
                                    }),
                                    control: (provided) => ({
                                      ...provided,
                                    }),
                                  }}
                                />
                              </Box>
                            )}

                            {header?.[attributeTypeKey] === dropDownFieldType && (
                              <Box>
                                <Box sx={{ mb: 2 }}>
                                  <InputLabel id={`${header.name}-label`}>{header.label}</InputLabel>
                                </Box>
                                <RitzSelection
                                  fullWidth
                                  id={header.name}
                                  name={header.name}
                                  optionValue={valueKey}
                                  optionText={displayValueKey}
                                  size={'small'}
                                  isReadOnly={header.isReadOnly}
                                  selectedValue={rollDetails?.[header.name]?.[valueKey] || ''}
                                  options={header.dropDownOptions}
                                  handleOnChange={(event: any) => {
                                    const selectedOption = header.dropDownOptions.find(
                                      (option: any) => option.value === event.target.value
                                    );
                                    const displayValue = selectedOption ? selectedOption.display_value : '';
                                    handleSubRowSelectChanges(event, displayValue);
                                  }}
                                />
                              </Box>
                            )}

                            {header?.[headerValueKey] === qaInspectionPassedKey && (
                              <Box>
                                <Box sx={{ mb: 2 }}>
                                  <InputLabel id={`${header.name}-label`}>{header.label}</InputLabel>
                                </Box>
                                <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
                                  {rollDetails?.[header.name] ? (
                                    <CheckIcon
                                      fontSize='small'
                                      sx={{
                                        color: green[500],
                                        borderRadius: '50%',
                                        border: `1px solid ${green[500]}`
                                      }}
                                    />
                                  ) : (
                                    <ClearIcon
                                      fontSize='small'
                                      sx={{
                                        color: red[500],
                                        borderRadius: '50%',
                                        border: `1px solid ${red[500]}`
                                      }}
                                    />
                                  )}
                                </Box>
                              </Box>
                            )}

                            {header?.[headerValueKey] === 'attachments' && (
                              <Box>
                                <Box sx={{ mb: 2 }}>
                                  <InputLabel id={`${header.name}-label`}>{header.label}</InputLabel>
                                </Box>
                                {rollDetails?.[attachmentDetailsKey]?.length > 0 ? (
                                  <>
                                    {rollDetails?.[attachmentDetailsKey].map((attachment: any, attachmentIndex: any) => (
                                      <React.Fragment key={attachmentIndex}>
                                        {attachment?.['display_name'] !== '' && (
                                          <Box
                                            key={attachmentIndex}
                                            sx={{ display: 'flex', alignItems: 'center', mt: 1 }}
                                          >
                                            <Tooltip title='Delete' arrow>
                                              {rollDetails?.[subRowDeletedAttachments]?.includes(
                                                attachment?.[iDKey]
                                              ) ? (
                                                <ReplayIcon color='success' />
                                              ) : (
                                                <DeleteOutlineIcon
                                                  color='error'
                                                  sx={{ verticalAlign: 'middle', fontSize: '20px', cursor: 'pointer' }}
                                                />
                                              )}
                                            </Tooltip>
                                            <Tooltip title='Download' arrow>
                                              <FileDownloadIcon
                                                color='primary'
                                                sx={{
                                                  marginLeft: '0.1rem',
                                                  verticalAlign: 'middle',
                                                  fontSize: '20px',
                                                  cursor: 'pointer',
                                                }}
                                                onClick={() => handleDownload(attachment?.['file_path'], attachment?.['display_name'])}
                                              />
                                            </Tooltip>
                                            <Typography
                                              key={attachmentIndex}
                                              sx={{ marginLeft: '0.5rem', wordBreak: 'break-all', width: '300px' }}
                                            >
                                              {attachment['display_name']}
                                            </Typography>
                                          </Box>
                                        )}
                                      </React.Fragment>
                                    ))}
                                  </>
                                ) : (
                                  <Typography>--</Typography>
                                )}
                              </Box>
                            )}

                            {header?.[attributeTypeKey] !== selectOrCreateFieldType &&
                              header?.[attributeTypeKey] !== dropDownFieldType &&
                              header?.[headerValueKey] !== qaInspectionPassedKey &&
                              header?.[headerValueKey] !== 'attachments' && (
                                <Box>
                                  <Box sx={{ mb: 2 }}>
                                    <InputLabel id={`${header.name}-label`}>{header.label}</InputLabel>
                                  </Box>
                                  <RitzInput
                                    name={header.name}
                                    id={header.name}
                                    selectedValue={rollDetails?.[header.name] || ''}
                                    size={'small'}
                                    isReadOnly={header.isReadOnly}
                                    inputType={'text'}
                                    fullWidth
                                    handleOnChange={(event: any) => handleSubRowInputChanges(event)}
                                  />
                                </Box>
                              )}
                          </Box>
                        </Box>
                      </Grid>
                    );
                  })}
                </Grid>
              </Card>
                {modalType == fabricInspectionKey && (
                <>
                    <Box>
                      <Box sx={{ mb: 1, padding: 2 }}>
                        <Typography sx={{ mb: 1 }} style={{ fontWeight: 'bold' }}>Roll Category :</Typography>
                        <RitzSelection
                          id={'roll_status'}
                          name={'item'}
                          optionValue={'id'}
                          optionText={'name'}
                          selectedValue={rollDetails.shade_category}
                          isRequired={true}
                          options={rollStatusTypes}
                          handleOnChange={handleSelectChangeRollStatus}
                        />
                        <FormErrorMessage message={errorList?.shade_category} />
                      </Box>
                    </Box>
                {currentState != DRAFT_STATE && (
                <>
                  <Box sx={{ padding: 2 }}>
                    <Typography style={{ fontWeight: 'bold' }}>Add Material Defects :</Typography>
                    <TableContainer component={Paper} sx={{ mt: 2 }}>
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
                        aria-label="customized table"
                      >
                        <TableHead>
                          <TableRow >
                            <TableCell rowSpan={2} sx={{ borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Defect</TableCell>
                            {materialType == fabricKey && (
                              <>
                                <TableCell rowSpan={2} sx={{ borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Distance(Cm)</TableCell>
                                <TableCell rowSpan={2} sx={{ borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Width (Cm)</TableCell>
                                <TableCell colSpan={4} align='center' sx={{ borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Defect Rate</TableCell>
                              </>
                            )}
                            <TableCell rowSpan={2} align='center' sx={{ borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}` }}>Remark</TableCell>
                          </TableRow>
                          {materialType == fabricKey && (
                            <>
                              <TableRow >
                                {defectRatingList?.map((defect: any, defectIndex: number) => (
                                  <TableCell key={defectIndex} align='center' sx={{ borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}` }}>{defect.defect_rating}</TableCell>
                                ))}
                              </TableRow>
                            </>
                          )}
                        </TableHead>
                        <TableBody>
                          {defects?.map((deffect: any, defectIndex: any) => (
                            <TableRow key={defectIndex}>
                              <TableCell sx={{ verticalAlign: 'top', width: `${100 / 4}%` }} >
                                <Box sx={{ minWidth: '100Px' }}>
                                  <RitzSelection
                                    id={'id'}
                                    name={'defect'}
                                    optionValue={'id'}
                                    optionText={'defect'}
                                    selectedValue={deffect?.defect || ''}
                                    isRequired={true}
                                    options={defectsList}
                                    //isReadOnly={currentState !== QA_VERIFICATION_STATE}
                                    handleOnChange={(event: any) => handleChangeRollDetails(event, defectIndex)}
                                  />
                                </Box>                     
                              </TableCell>
                              {materialType === fabricKey && (
                                <>
                                  <TableCell>
                                    <Box sx={{ minWidth: '100Px' }}>
                                      <RitzInput
                                        name={`defect_distance_from_start`}
                                        id={`defect_distance_from_start`}
                                        isRequired={true}
                                        selectedValue={deffect?.defect_distance_from_start}
                                        handleOnChange={(event: any) => handleChangeRollWidthDistance(event, defectIndex)}
                                      />
                                      <FormErrorMessage message={errorList?.defect_errors?.[defectIndex]?.[defectDistanceFromStartNameKey]} />
                                    </Box>
                                  </TableCell>
                                  <TableCell>
                                    <Box sx={{ minWidth: '100Px' }}>
                                      <RitzInput
                                        name={`defect_width_from_left`}
                                        id={`defect_width_from_left`}
                                        isRequired={true}
                                        selectedValue={deffect?.defect_width_from_left}
                                        handleOnChange={(event: any) => handleChangeRollWidthDistance(event, defectIndex)}
                                      />
                                      <FormErrorMessage message={errorList?.defect_errors?.[defectIndex]?.[defectWidthFromLeftNameKey]} />
                                    </Box>
                                  </TableCell>
                                  {defectRatingList?.map((rating: any, ratingIndex: number) => (
                                    <TableCell key={ratingIndex} sx={{ borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                      <Box>
                                        <Radio checked={deffect.defect_rating == rating.id || false} name={'defect_rating'} onClick={(event) => handleCheckboxChange(event, rating.id, defectIndex)} />
                                      </Box>
                                    </TableCell>
                                  ))}
                                </>
                              )}
                              <TableCell sx={{ borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`, verticalAlign: 'top', width: `${100 / 4}%` }}><Box sx={{ display: 'flex' }}>
                                <RitzInput
                                  fullWidth
                                  name={`remarks`}
                                  id={`remarks`}
                                  isRequired={true}
                                  selectedValue={deffect?.remarks}
                                  handleOnChange={(event: any) => handleChangeRollDetails(event, defectIndex)}
                                />
                              
                                {currentState === QA_VERIFICATION_STATE && (
                                  <IconButton onClick={() => deleteRow(defectIndex, deffect.id)}>
                                    <DeleteForeverIcon style={{ color: '#d32f2f' }} fontSize='inherit' />
                                  </IconButton>
                                )}

                              </Box></TableCell>
                            </TableRow>
                          ))}
                          <TableRow>
                            <TableCell colSpan={8} >
                              <Link color={'primary'} sx={{ float: 'right', cursor: 'pointer', fontSize: 'small', ml: 1 }} onClick={() => addNewRow()} >Add Row</Link>

                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                  <Box>
                    <Box sx={{ mb: 1, padding: 2 }}>
                      <Typography style={{ fontWeight: 'bold' }}>Material Pass/Fail Status :</Typography>

                      <FormControl disabled>
                        <RadioGroup
                          row
                          aria-labelledby="demo-row-radio-buttons-group-label"
                          name="roll_status"
                          value={passFailValue}
                          onChange={handleChangeRollStatus}
                        >
                          <FormControlLabel value="pass" control={<Radio />} label="Pass" />
                          <FormControlLabel value="fail" control={<Radio />} label="Fail" />
                        </RadioGroup>
                      </FormControl>
                    </Box>
                  </Box>
                </>
              )}
                </>
              )}
                  <>
                  {modalType == fabricInspectionKey && (
                    <Box>
                      <RitzSwitch isReadOnly={currentState === QA_VERIFICATION_STATE ? false : true} name="Mark as Complete" status={rollDetails.complete_state} handleChangeSwitch={handleCompletedSwitch} />
                    </Box>
                  )}
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}>
                      <Button sx={{ float: 'right', ml: 2 }} variant='contained' onClick={() => saveDefectDetails('save')}>Save</Button>
                      {rollDetails.complete_state && modalType == fabricInspectionKey && currentState === QA_VERIFICATION_STATE &&   (
                        <Box>
                          <Button sx={{ float: 'right', ml: 2 }} variant='contained' onClick={() => saveDefectDetails('next')}>
                            {rollDetails.modal_status === 'last_inspection_roll' ? 'Complete' : 'Next'}
                            {rollDetails.modal_status === 'last_inspection_roll' ? null : <ChevronRightIcon />}
                          </Button>
                        </Box>
                      )}
                    </Box>
                  </>
             
            </>
          )}



        </Stack>

      </RitzModal>

    </>
  )
}

export default DefectDetails
