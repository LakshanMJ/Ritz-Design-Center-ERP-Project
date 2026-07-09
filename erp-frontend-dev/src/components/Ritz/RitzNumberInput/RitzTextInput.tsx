import * as React from "react";
import FormControl from "@mui/material/FormControl";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import Item from "@mui/material/Grid";
import {FormControlLabel, IconButton, InputAdornment, Typography} from "@mui/material";
import RitzInput from "@/components/Ritz/RitzInput";
import {useEffect, useState} from "react";
import TextField from '@mui/material/TextField'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import Alert from '@mui/material/Alert'
import {isNaN} from "formik";
import {toast} from "react-hot-toast";
import {getDefaultError} from "@/helpers/Utilities";



const RitzTextInput = ({
                             isRequired = false,
                             name,
                             id,
                             labelText,
                             selectedValue="",// Number of inputs
                             isReadOnly = false,
                             isReadOnlySubInputs = false,
                             headerText = "",
                             handleOnChangeNumInputs,
                             handleOnDelete,
                             handleOnCreateAndUpdate,
                             handleOnSubInputsChange,
                             currentData, // Current data for sub components
                             currentDataDisplayValueField='name', // Field that will used to display text in text field
                             currentDataValueField='id', // Corresponding field that usually holds the id
                             apiErrors,
                             triggerHandleOnDeleteForEmptyValue=false // Triggers handleOnDelete even if empty id is present
                         }: any) => {

    // Error to show when user have to delete something
    const REMOVE_EXTRA_INPUTS = `Please delete extra ${headerText}`;
    const MAX_NUMBER_OF_INPUTS = 30;
    const MAX_INPUT_ERROR = `The maximum number you may enter is ${MAX_NUMBER_OF_INPUTS}`;

    // Component local states
    // const [subInputValues, setSubInputValues] = useState([]); // Subinput states
    // const [numInputs, setNumInputs] = useState(0); // Num of inputs user wants
    const [showDelete, setShowDelete] = useState(false); // Used to show delete button
    const [formErrors, setFormErrors] = useState({"numberErrors": [], "subFormErrors": []}); //Tracks all the form errors
    let numInputs = selectedValue;
    let subInputValues: any[] = currentData;

    // Handles any change to the number input
    const handleNumInputsChange = (event: any) => {
        const { value } = event.target;
        // valus is a number
        if (! Number.isNaN(Number(value)) && value) {
            handleOnChangeNumInputs(event, value);
        } else {
            toast.error("Please enter a number");
        }
    }

    useEffect(() => {
        if (apiErrors) {
            setFormErrors({...formErrors, subFormErrors: [...apiErrors]});
        }
    }, [apiErrors]);

    // Handles changes to the sub inputs
    const handleRitzSubInputOnChange = (event: any, index: number) => {
        const {name, value} = event.target;
        let newInputs = [...subInputValues];
        newInputs[index] = {...newInputs[index], [currentDataDisplayValueField]: value};
        handleOnCreateAndUpdate([...newInputs]);
    }

    // Handles delete of sub components
    const handleDeleteSubComponent = (event: any, index: number, item: any) => {
        let deleteInput = [...subInputValues];
        const deleteData = deleteInput[index];
        deleteInput.splice(index, 1);
        handleOnSubInputsChange([...deleteInput]);//need to review()

        if (item?.[currentDataValueField] || triggerHandleOnDeleteForEmptyValue) {
            handleOnDelete(event, item, index);
        }

        handleErrors(deleteInput);
    };




    // Handle errors on change of numInputs or subInputValues
    const handleErrors = (newSubInputData: any) => {
        if (numInputs < newSubInputData.length) {
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

        let newNumberErrors = [...formErrors.numberErrors];

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
        const editedData = subInputValues.filter((inpValue, index) => ((inpValue?.[currentDataValueField] != null || inpValue?.[currentDataDisplayValueField] != '')  ? true: false));
        let numOfSubitems = editedData.length;
        let newValues = [...editedData];

        // If there are more edited sub input data than the number of inputs the user enters. Show error message asking to manually delete excessive records
        if (editedData.length > numInputs) {
            handleOnCreateAndUpdate([...newValues]);

        }
        // If there's no change to the numInputs dont do anything
        else if (numOfSubitems != numInputs) {

            if (numInputs > MAX_NUMBER_OF_INPUTS) {
            } else {
                const newNumber = numInputs - numOfSubitems;
                for (let ind=0; ind < newNumber; ind++) {
                    newValues.push({[currentDataValueField]: null, [currentDataDisplayValueField]: '', inputID: `${id}_${ind}`});
                }
                handleOnCreateAndUpdate([...newValues]);

            }
        } else if (editedData.length != subInputValues.length) {
            handleOnCreateAndUpdate([...newValues]);
        }
        handleErrors(newValues);
    }, [numInputs]);

    return (
        <>
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
                                <Alert severity="error" key={index}>{error}</Alert>
                            )
                        )
                    }

            { subInputValues.length > 0 &&
                <div style={{marginTop: "2em", marginBottom: "1em"}}>
                    <Typography variant='h6' sx={{marginBottom: "1em"}}>{headerText}:</Typography>

                    <Grid container spacing={2}>
                        {subInputValues.map((item: any, index) => (
                            <Grid item md={4}  key={index}>
                                <Item>

                                    <TextField
                                        required={true}
                                        name={'${name}_${index}'}
                                        onChange={(event) => handleRitzSubInputOnChange(event, index)}
                                        // onBlur={(event) => handleOnCreateAndUpdate(event, item, index, numInputs, subInputValues)}
                                        value={item?.[currentDataDisplayValueField]} autoComplete={'off'}
                                        InputProps={showDelete ? {
                                            endAdornment: (
                                                <InputAdornment position='end'>
                                                    <IconButton sx={{borderRadius:'50%'}} edge='end' color='error' onClick={(event) => handleDeleteSubComponent(event, index, item)}>
                                                        <DeleteOutlineIcon />
                                                    </IconButton>
                                                </InputAdornment>
                                            )
                                        }: {}}
                                        disabled={isReadOnlySubInputs}
                                    />
                                </Item>
                            </Grid>

                        ))}
                    </Grid>
                    {formErrors.subFormErrors && formErrors.subFormErrors.map((error: any, index) => (
                                <Alert sx={{ mt: 2 }} severity="error" key={index}>{error}</Alert>
                            )
                        )
                    }
                </div>
            }
        </>
    );
};
export default RitzTextInput;

