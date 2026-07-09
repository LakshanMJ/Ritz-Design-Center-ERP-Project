import * as React from "react";
import FormControl from "@mui/material/FormControl";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import Item from "@mui/material/Grid";
import { IconButton, Typography } from "@mui/material";
import RitzInput from "@/components/Ritz/RitzInput";
import { useEffect, useRef, useState } from "react";
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import Alert from '@mui/material/Alert'
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import {isNaN} from "formik";

const RitzSelectInput = ({
                             isRequired = false,
                             name,
                             id='number_select',
                             labelText,
                             isReadOnly = false,
                             headerText = "",
                             handleOnDelete,
                             handleCreateUpdate,
                             handleOnChangeNumInput,
                             currentData={selectedNumInputs: undefined, currentData: undefined},
                             currentDataDisplayValueField='name',
                             currentDataValueField='id',
                             selectOptions=[],
                             selectOptionValueField='id',
                             selectOptionDisplayValueField='name',
                             apiErrors,
                             showNumInputs

                         }: any) => {


    // Error to show when user have to delete something
    const REMOVE_EXTRA_INPUTS = `Please delete extra ${headerText}`;
    const MAX_NUMBER_OF_INPUTS = 30;
    const MAX_INPUT_ERROR = `The maximum number you may enter is ${MAX_NUMBER_OF_INPUTS}`

    // Component local states
    const [subInputValues, setSubInputValues] = useState([]); // Subinput states
    const [numInputs, setNumInputs] = useState(0); // Num of inputs user wants
    const [showDelete, setShowDelete] = useState(false); // Used to show delete button
    const [formErrors, setFormErrors] = useState({"numberErrors": [], "subFormErrors": []}); //Tracks all the form errors


    // Handles any change to the number input
    const handleNumInputsChange = (event: any) => {
        const { value } = event.target;

        if (! isNaN(value) && value) {
            setNumInputs(parseInt(value));
            if (handleOnChangeNumInput) {
                handleOnChangeNumInput(event, value);
            }
        } else if (value == '') {
            setNumInputs(value);
        }
    }

    useEffect(() => {
        if (apiErrors) {
            setFormErrors({...formErrors, subFormErrors: [...apiErrors]});
        }
    }, [apiErrors]);



    useEffect(() => {
        const apiData = currentData?.currentData;
        const selectedNumInputs = currentData?.selectedNumInputs;


        const numEdits = [...apiData].length;

        const concatVals = [...subInputValues].splice(numEdits, numInputs - numEdits);
        const newSubInputValues = [...apiData, ...concatVals]
        setSubInputValues([...newSubInputValues]);

        setNumInputs(selectedNumInputs);

        handleErrors(newSubInputValues);


    }, [currentData, showNumInputs]);


    // Handle errors on change of numInputs or subInputValues
    const handleErrors = (newSubInputValues: any) => {
        if (numInputs < newSubInputValues.length) {
            // Show delete option
            setShowDelete(true);
            if (formErrors.subFormErrors.indexOf(REMOVE_EXTRA_INPUTS) < 0) {
                setFormErrors({...formErrors, subFormErrors: [...formErrors.subFormErrors, REMOVE_EXTRA_INPUTS]});
            }
        } else {
            // Show errors
            let newSubFormErrors = [...formErrors.subFormErrors]
            const errorIndex = newSubFormErrors.indexOf(REMOVE_EXTRA_INPUTS);
            newSubFormErrors.splice(errorIndex, 1)
            if (errorIndex >= 0) {
                setFormErrors({...formErrors, subFormErrors: [...newSubFormErrors]})
            }
            setShowDelete(false);
        }

        let newNumberErrors = [...formErrors.numberErrors]

        if (numInputs > MAX_NUMBER_OF_INPUTS) {
            if (newNumberErrors.indexOf(MAX_NUMBER_OF_INPUTS) < 0) {
                newNumberErrors.push(MAX_INPUT_ERROR);
                setFormErrors({...formErrors, numberErrors: [...formErrors.numberErrors, MAX_INPUT_ERROR]})
            }
        } else if(newNumberErrors.indexOf(MAX_INPUT_ERROR) >= 0 ) {
            newNumberErrors.splice(newNumberErrors.indexOf(MAX_INPUT_ERROR))
            setFormErrors({...formErrors, numberErrors: [...newNumberErrors]})
        }
    };


    // Handles ritz number input on blur. Adds new inputs or remove excessive ones accordingly
    useEffect(() => {
        const editedData = [...subInputValues].filter((inpValue) => ((inpValue?.[currentDataValueField] != '') ? true : false));
        let numOfSubitems = editedData.length;
        let newValues = [...editedData];

        // If there are more edited sub input data than the number of inputs the user enters. Show error message asking to manually delete excessive records
        if (editedData.length > numInputs) {
            setSubInputValues(newValues);

        }
        // If there's no change to the numInputs dont do anything
        else if (numOfSubitems != numInputs) {
            if (numInputs <= MAX_NUMBER_OF_INPUTS) {
                for (let ind = numOfSubitems; ind < numInputs; ind++) {
                    newValues.push({
                        [currentDataValueField]: '',
                        [currentDataDisplayValueField]: '',
                        inputID: `${id}_${ind}`
                    });
                }
                setSubInputValues([...newValues]);
            }
        }
        handleErrors(newValues);
    }, [numInputs]);

    const handleSelectChange = (event: any, item: any, index: number) => {
        let newSubInputValues = [...subInputValues];
        const {value} = event.target;
        newSubInputValues[index] = {...item, [currentDataValueField]: value}
        setSubInputValues([...newSubInputValues]);
        handleCreateUpdate(event, newSubInputValues[index], index, numInputs);
    }

     // Handles delete of sub components - TODO check this
    const handleDeleteSubComponent = (event: any, index: number, dataRow: any) => {
        const newDataRow = {...dataRow}
        let deleteInput = [...subInputValues];
        deleteInput.splice(index, 1);
        setSubInputValues([...deleteInput]);
        handleErrors(deleteInput);

        if (newDataRow?.[currentDataValueField]) {
            handleOnDelete(event, newDataRow, index);
        }
    };

    return (
        <>
            {showNumInputs &&
                <Box sx={{ mb: 4 }}>
                    <Typography variant='h6' sx={{ mb: 2 }}>Enter Number of {labelText}:</Typography>
                    <FormControl>
                        <RitzInput
                            isRequired={isRequired}
                            name={name}
                            id={id}
                            selectedValue={numInputs}
                            handleOnChange={handleNumInputsChange}
                            isReadOnly={isReadOnly}
                        >
                        </RitzInput>
                    </FormControl>
                    {formErrors.numberErrors && formErrors.numberErrors.map((error: any, index) => (
                                        <Alert severity="error" key={index} sx={{ mt: 2 }}>{error}</Alert>
                                    )
                                )
                            }
                </Box>
            }
            { subInputValues.length > 0 &&
                <Box>
                    <Typography variant='h6' sx={{ mb: 2 }}>{headerText}:</Typography>
                    <Grid container spacing={2}>
                            {subInputValues.map((item: any, index) => (
                                <Grid item key={index} md={6} lg={4} sm={12}>
                                    <Item>
                                        <Grid container alignItems='center' columnSpacing={1}>

                                            <Grid item xs={showDelete ? 10: 12}>
                                                <Select key={`${index}_select`}
                                                        value={item?.[currentDataValueField]}
                                                        name={`${index}_item`}
                                                        sx={{width: '100%', marginRight: '1em'}}
                                                        onChange={(event) => handleSelectChange(event, item, index)}
                                                  >
                                                    { selectOptions.map((option: any, index2: number) => (
                                                            <MenuItem key={`item_${index2}`} value={option?.[selectOptionValueField]}>
                                                                {option?.[selectOptionDisplayValueField]}
                                                            </MenuItem>
                                                        ))
                                                    }
                                                  </Select>
                                            </Grid>
                                            { showDelete &&
                                                <Grid item xs={2}>
                                                    <IconButton color='error' onClick={(event) => handleDeleteSubComponent(event, index, item)}>
                                                        <DeleteOutlineIcon fontSize='small' />
                                                    </IconButton>
                                                </Grid>
                                            }
                                        </Grid>

                                    </Item>
                                </Grid>
                            ))}
                    </Grid>
                    {formErrors.subFormErrors && formErrors.subFormErrors.map((error: any, index) => (
                                <Alert severity="error" key={index} sx={{ mt: 2 }}>{error}</Alert>
                            )
                        )
                    }
                </Box>
            }
        </>
    );
};
export default RitzSelectInput;
