import React, { useEffect, useState } from 'react';
import { Grid, Box, Card, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Divider, Button, CardHeader, Paper, Alert, Typography, Tooltip, InputLabel, Checkbox, IconButton } from '@mui/material';
import * as GrnUrls from '../../helpers/constants/rest_urls/GrnUrls';
import api from '@/services/api';
import toast from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';
import DefaultLoader from '@/components/DefaultLoader';
import RitzSelection from '@/components/Ritz/RitzSelection';
import CheckBox from '@mui/icons-material/CheckBox';
import RitzTextInput from '@/components/Ritz/RitzNumberInput/RitzTextInput';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import { DEFAULT_SUCCESS } from '@/helpers/constants/Constants';
import FormErrorMessage from '@/components/FormErrorMessage';

const ShadeSplit = ({ shadeGroupSavedStatus, shadeId, handleClose }: any) => {
  const [isLoading, setIsLoading] = useState(true);
  const [shadeGroupeSavedStatus, setShadeGroupeSavedStatus] = useState(shadeGroupSavedStatus);
  const [shadeDetails, setShadeDetails] = useState({ rolls: [], shade_list: [], parent_shade_name:'' });
  const [shadeVariations, setShadeVariations] = useState([]);
  const [numberOfShades, setNumberOfColorways] = useState(0);
  const [selectAll, setSelectAll] = useState(false);
  const [errors, setErrors] = useState({roll_errors:''});
  const currentShade = shadeDetails.parent_shade_name;
  const fetchData = () => {
    const requests = [
      api.get(GrnUrls.grnShadeSplitDetailsUrl(shadeId)),
    ];
    Promise.all(requests).then(resp => {
      const response = resp.map((r: any) => r.data);
      const [shadeGroupDetails] = response
      setShadeDetails({ ...shadeGroupDetails })

      if(shadeGroupDetails.shade_list.length!=0){
        setNumberOfColorways(shadeGroupDetails.split_batch_shades_count)
        const modifiedShadeVariationsList = shadeGroupDetails.shade_list.map((shade:any, index:any) => ({
          ...shade,
          shade_index: 'index' + index
        }));
        setShadeVariations([...modifiedShadeVariationsList])
      }
  
      setShadeGroupeSavedStatus(false)
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => setIsLoading(false))
  }

  const handleShadesCreateAndUpdate = (subInputValues: any) => {
    let newData = [...subInputValues];
    newData = newData.map((inputValue: any, index) => {
      if (!inputValue['shade']) {
        return { ...inputValue, shade: currentShade + (index + 1), is_parent: false, shade_index: 'index' + index };
      }
      return inputValue;
    });
    setShadeVariations(newData);
  }
  const handleSave = () => {

    const newPayload = {
      shade_list: shadeVariations,
      rolls : shadeDetails.rolls.map((roll, index) => ({
        id: roll.id,
        new_shade: roll.new_shade || null

      }))
    };

    api.post(GrnUrls.grnShadeSplitDetailsSaveUrl(shadeId), newPayload)
      .then(() => {
        setShadeGroupeSavedStatus(true)
        fetchData()
        toast.success(DEFAULT_SUCCESS);
      }).catch(error => {
        setErrors(error?.response?.data)
        toast.error(getDefaultError(error?.response?.status));

      }).finally(() => {
      });
  }

  const handleCheckboxChange = (event: any, rollIndex: any) => {
    setSelectAll(false);
    const updatedRolls = [...shadeDetails.rolls];
    updatedRolls[rollIndex].isChecked = event.target.checked;
    setShadeDetails({ ...shadeDetails, rolls: updatedRolls });
  };

  const handleSelectAllChange = (event:any) => {
    const isChecked = event.target.checked;
    const updatedRolls = shadeDetails.rolls.map((roll) => ({
      ...roll,
      isChecked: isChecked
    }));
    setShadeDetails({ ...shadeDetails, rolls: updatedRolls });
    setSelectAll(isChecked);
  };

  const handleSubInputChange = (orderColorwayInputData: any) => {
    setShadeVariations([...orderColorwayInputData]);
  }

  const handleShadeDelete = (event: any, data: any, index: number) => {
    let newData = [...shadeVariations];
    newData.splice(index, 1);
    setShadeVariations([...newData]);
  }

  const handleOnChangeNumShades = (event: any, numInputs: number) => {
    setNumberOfColorways(numInputs);
  }

  const handleChangeShadeType = (event: any, rollIndex: any, rollId: any) => {
    const { value } = event.target;
    const selectedIndex = shadeVariations.findIndex(roll => roll.shade_index === value);
    const selectedId = shadeVariations.find(roll => roll.shade_index === value).id;
    
    // Update new_shade for rolls where isChecked is true
    const updatedRollDetails = shadeDetails.rolls.map((roll, index) => {
      if (roll.isChecked || roll.id == rollId) {
        return {
          ...roll,
          new_shade: { id: selectedId, shade_index: 'index' + selectedIndex }
        };
      }
      return roll;
    });
  
    setShadeDetails({ ...shadeDetails, rolls: updatedRollDetails });
  };

  const handleCloseShade = (status: any) => {
    handleClose(status);
    setShadeGroupeSavedStatus(true)
  };

  useEffect(() => {
    if (shadeId) {
      fetchData()
    }
  }, [shadeId]);
  

  return (
    <>
      {isLoading ? (
        <DefaultLoader />
      ) : (
        <>
            <Box marginBottom={3}>
              <Box>
                <RitzTextInput
                  name={'shade'}
                  id={'shade'}
                  labelText={'Shade Variations'}
                  selectedValue={numberOfShades}// TODO - changes this
                  handleOnChange={{}}
                  handleOnBlur={{}}
                  headerText={"Shades"}
                  currentData={shadeVariations || []}
                  currentDataDisplayValueField={'shade'}
                  currentDataValueField={'id'}
                  handleOnCreateAndUpdate={handleShadesCreateAndUpdate}
                  handleOnSubInputsChange={handleSubInputChange}
                  handleOnDelete={handleShadeDelete}
                  handleOnChangeNumInputs={handleOnChangeNumShades}
                  isReadOnlySubInputs={true}
                ></RitzTextInput>
              </Box>
            </Box>
            <Box marginBottom={3}>
              <Typography style={{ fontWeight: 'bold' }}>Roll Details Related To This Shade:</Typography>
              <Alert severity='info' sx={{ mb: 1, mt: 1 }}>
                If you want to add shades at once, select rolls and click on the shades variations below
              </Alert>
              <Box>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell><Checkbox
                          checked={selectAll}
                          onChange={handleSelectAllChange}
                        /></TableCell>
                        <TableCell>Barcode</TableCell>
                        <TableCell>Batch No</TableCell>
                        <TableCell>Roll No</TableCell>
                        <TableCell>Current Shade</TableCell>
                        <TableCell>New Shade</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {shadeDetails.rolls?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} align='center'>
                            No data available.
                          </TableCell>
                        </TableRow>
                      ) : (
                        shadeDetails.rolls?.map((roll: any, rollIndex: any) => (
                          <TableRow>
                            <TableCell><Checkbox
                              checked={roll.isChecked || false}
                              onChange={(event:any) => handleCheckboxChange(event, rollIndex)}
                            /></TableCell>
                          <TableCell>{roll.barcode}</TableCell>
                          <TableCell>{roll.batch_number?.display_value}</TableCell>
                          <TableCell>{roll.pack_number}</TableCell>
                          <TableCell>{roll.shade.display_value}</TableCell>
                          <TableCell>
                            <RitzSelection
                              id={'actual_shade'}
                              name={'actual_shade'}
                              optionValue={'shade_index'}
                              optionText={'shade'}
                              selectedValue={roll?.new_shade?.shade_index || ''}
                              isRequired={true}
                              options={shadeVariations}
                              handleOnChange={(event: any) => handleChangeShadeType(event, rollIndex, roll.id)}
                            />
                            <FormErrorMessage message={errors?.roll_errors?.[roll.id]} />
                          </TableCell>
                        </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </Box>
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button sx={{mr:2}} variant="contained" onClick={() => handleCloseShade(true)} ><ChevronLeftIcon />Previous</Button>
              <Button variant="contained" onClick={() => handleSave()} >Save</Button>
            </Box>
        </>
      )}
    </>
  );
};

export default ShadeSplit;