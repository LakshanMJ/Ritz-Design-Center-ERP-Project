import * as React from "react";
import FormControl from "@mui/material/FormControl";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import { IconButton, Typography } from "@mui/material";
import RitzInput from "@/components/Ritz/RitzInput";
import { useEffect, useRef, useState } from "react";
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import Alert from '@mui/material/Alert'
import RitzMultiSelectCheckBox from "@/components/Ritz/RitzMultiSelectCheckBox";
import { MUI_AUTOCOMPLETE_REMOVE_OPTION } from "@/helpers/constants/Constants";


const RitzMultiSelectInput = ({
    isRequired = false,
    name,
    id,
    labelText,
    selectedValue=0,
    isReadOnly = false,
    headerText = "",
    handleOnDelete,
    handleOnCreateAndUpdate,
    currentData,
    currentDataParentField = 'parent_id',
    currentDataValueField = 'id',
    dropDownOptions = [],
    optionsValueField = 'id',
    optionsDisplayValueField = 'name',
    apiErrors,
    disableValues = []

}: any) => {

    // Error to show when user have to delete something
    const REMOVE_EXTRA_INPUTS = `Please delete extra ${headerText}`;
    const MAX_NUMBER_OF_INPUTS = 30;
    const MAX_INPUT_ERROR = `The maximum number you may enter is ${MAX_NUMBER_OF_INPUTS}`
    let formChanged = useRef(false);

    // Component local states
    const [selectOptions, setSelectOptions] = useState(dropDownOptions);
    const [subInputValues, setSubInputValues] = useState([]); // Subinput states
    const [numInputs, setNumInputs] = useState(selectedValue); // Num of inputs user wants
    const [showDelete, setShowDelete] = useState(false); // Used to show delete button
    const [formErrors, setFormErrors] = useState({ "numberErrors": [], "subFormErrors": [] }); //Tracks all the form errors

    useEffect(() => {
        setSelectOptions([...dropDownOptions])
    }, [dropDownOptions])


    // Handles any change to the number input
    const handleNumInputsChange = (event: any) => {
        const { value } = event.target;
        formChanged.current = true;

        if (value) {
            setNumInputs(parseInt(value));
        } else {
            setNumInputs(value)
        }
    }


    useEffect(() => {
        if (apiErrors) {
            setFormErrors({ ...formErrors, subFormErrors: [...apiErrors] });
        }
    }, [apiErrors]);



    const handleDeleteSubComponent = (event: any, index: number, item: any) => {
        setSubInputValues([])
        const newVals = [...subInputValues];
        const deletedRecord = { ...newVals[index] };
        const deletedData = newVals.splice(index, 1);
        handleOnDelete(event, index, deletedRecord);
        setSubInputValues([...newVals]);
        handleErrors(newVals, numInputs);
    }

    // Handles changes to the sub inputss
    const handleOnCreateUpdateDelete = (event: any, data: any, index: number, reason: any) => {
        let selectedIDs = data.map((item: any) => { return item })
        let subInputValuesCopy = [...subInputValues];
        let newInputValues = subInputValuesCopy[index];
        let newValue = { ...newInputValues, [currentDataValueField]: selectedIDs };
        let newState = [...subInputValues];
        newState[index] = newValue;
        setSubInputValues([...newState]);

        if (reason == MUI_AUTOCOMPLETE_REMOVE_OPTION) {
            handleOnCreateAndUpdate(event, index, { ...newValue });

        }


    }

    const handleOnCloseSelect = (event: any, item: any, index: number) => {
        handleOnCreateAndUpdate(event, index, { ...item });

    }

    // Handles changes to currentData in API
    useEffect(() => {
        if (selectedValue && currentData) {
            let numberOfInputs = numInputs;
            const numEdits = currentData.length;
            const subInputValuesCopy = [...subInputValues];
            const concatVals = subInputValuesCopy.splice(numEdits, numInputs - numEdits);
            const newVals = [...currentData, ...concatVals];
            setSubInputValues([...newVals]);
            if (formChanged.current) {
                setNumInputs(numInputs);
            } else {
                setNumInputs(selectedValue);
                numberOfInputs = selectedValue;
            }
            handleErrors(newVals, numberOfInputs);
        }

    }, [currentData, selectedValue]);


    // Handle errors on change of numInputs or subInputValues (have to be split)
    const handleErrors = (newData: any, numInputsCopy: number) => {
        if (numInputsCopy < newData.length) {
            // Show delete option
            setShowDelete(true);
            if (formErrors.subFormErrors.indexOf(REMOVE_EXTRA_INPUTS) < 0) {
                setFormErrors({ ...formErrors, subFormErrors: [...formErrors.subFormErrors, REMOVE_EXTRA_INPUTS] });
            }
        } else {
            // Show errors
            let newSubFormErrors = [...formErrors.subFormErrors]
            const errorIndex = newSubFormErrors.indexOf(REMOVE_EXTRA_INPUTS);
            newSubFormErrors.splice(errorIndex, 1)
            if (errorIndex >= 0) {
                setFormErrors({ ...formErrors, subFormErrors: [...newSubFormErrors] })
            }
            setShowDelete(false);
        }
    };


    // Handles ritz number input on blur. Adds new inputs or remove excessive ones accordingly
    useEffect(() => {
        // Run only if form has been changed
        if (formChanged.current) {
            let editedData = [...subInputValues].filter((inpValue) => (
                (inpValue?.[currentDataValueField].length > 0) ? true : false)
            );

            let newValues = [...editedData];

            let numOfSubitems = editedData.length;

            // If there are more edited sub input data than the number of inputs the user enters. Show error message asking to manually delete excessive records. Handled by above
            if (editedData.length > numInputs) {
                setSubInputValues([...newValues]);
            } else if (numOfSubitems != numInputs) {

                // If there's no change to the numInputs dont do anything

                let newNumberErrors = [...formErrors.numberErrors]

                if (numInputs < MAX_NUMBER_OF_INPUTS) {
                    const newNumber = numInputs - numOfSubitems;
                    for (let ind = 0; ind < newNumber; ind++) {
                        newValues.push({ [currentDataValueField]: [], [currentDataParentField]: null, });
                    }
                    setSubInputValues([...newValues]);
                } else if (numInputs > MAX_NUMBER_OF_INPUTS) {
                    if (newNumberErrors.indexOf(MAX_NUMBER_OF_INPUTS) < 0) {
                        newNumberErrors.push(MAX_INPUT_ERROR);
                        setFormErrors({ ...formErrors, numberErrors: [...formErrors.numberErrors, MAX_INPUT_ERROR] })
                    }
                } else if (newNumberErrors.indexOf(MAX_INPUT_ERROR) >= 0) {
                    newNumberErrors.splice(newNumberErrors.indexOf(MAX_INPUT_ERROR), 1)
                    setFormErrors({ ...formErrors, numberErrors: [...newNumberErrors] })
                }
            } else if (numOfSubitems != subInputValues.length) {
                setSubInputValues([...newValues]);
            }

            handleErrors(newValues, numInputs);
        }

    }, [numInputs]);

    const getSelectOptions =(item: { [x: string]: any[]; }) => {
        // TODO sometimes subInputValues contains a null value
        const selectedValues = subInputValues.map((element: any) => {
            return element?.[currentDataValueField].map((val: any) => {
                return val
            });
        })?.flat(2) || [];

        const currentlySelected = item?.[currentDataValueField]?.map((i: any) => i[optionsValueField]);

        // filter out the already selected and keep the currently selected
        const newSelectedValues = selectedValues.filter((i: any) => !currentlySelected.includes(i[optionsValueField]));
        const newSelectedValueIds = newSelectedValues.map((i: any) => i[optionsValueField]);
        return [...selectOptions?.filter((o1: any) => !newSelectedValueIds?.includes(o1[optionsValueField]))];
    }


    return (
        <Box>
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
                <Alert severity="error" key={index}>{error}</Alert>))}

            {subInputValues.length > 0 &&
                <Box sx={{ mt: 4 }}>
                    <Typography variant='h6' sx={{ mb: 2 }}>{headerText}:</Typography>

                    <Grid container spacing={2}>
                        {subInputValues.map((item: any, index) => (
                            <Grid item lg={6} key={index}>
                                {/* {showDelete &&
                                    <IconButton color='error' onClick={(event) => handleDeleteSubComponent(event, index, item)}>
                                        <DeleteOutlineIcon fontSize='small' />
                                    </IconButton>
                                } */}
                                <RitzMultiSelectCheckBox
                                    id={`${id}_${index}`}
                                    selectOptions={getSelectOptions(item)}
                                    optionValue={optionsValueField}
                                    optionDisplayValue={optionsDisplayValueField}
                                    handleOnChange={(event: any, data: any, reason: any) => handleOnCreateUpdateDelete(event, data, index, reason)}
                                    handleOnClose={(event: any) => handleOnCloseSelect(event, item, index)}
                                    inputProps={{ 'data-index': index }}
                                    name={`${index}_multiselect_${name}`}
                                    selectedValues={item?.[currentDataValueField]?.map((i: any) => i?.[optionsValueField])}
                                    item={item}
                                    disableClearable={true}
                                    // errors={formErrors.subFormErrors}
                                    showDelete={showDelete}
                                    handleDeleteSubComponent={(event: any) => handleDeleteSubComponent(event, index, item)}
                                />                                
                            </Grid>

                        ))}
                    </Grid>
                    {formErrors.subFormErrors && formErrors.subFormErrors.map((error: any, index) => (
                        <Alert severity="error" key={'${index}_error'} sx={{ mt: 2 }}>{error}</Alert>
                    )
                    )
                    }
                </Box>
            }
        </Box>
    );
};
export default RitzMultiSelectInput;
