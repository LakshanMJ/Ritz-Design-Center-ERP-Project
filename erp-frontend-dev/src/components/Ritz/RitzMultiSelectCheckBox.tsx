import {Checkbox, TextField, Autocomplete, Typography, MenuItem, IconButton, Chip} from "@mui/material"
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import * as React from "react";
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

const RitzMultiSelectCheckBox = ({id, selectOptions=[], optionValue='id', optionDisplayValue='title', labelText, handleOnChange, handleOnClose,
                                     selectedValues=[], name, item, disableClearable=false, disableValues =[], 
                                     showDelete=false, handleDeleteSubComponent,  isReadOnly = false,  size='medium'}: any) =>{

    const icon = <CheckBoxOutlineBlankIcon fontSize="small" />;
    const checkedIcon = <CheckBoxIcon fontSize="small" />;
    return (
        <>
            { labelText && <Typography variant='h6' sx={{ mb: 2 }}>{labelText}</Typography> }
            <Autocomplete
                multiple
                id={id}
                options={selectOptions}
                disableCloseOnSelect
                disableClearable={disableClearable}
                getOptionLabel={(option) => option?.[optionDisplayValue]}
                renderOption={(props, option) => (
                  <MenuItem {...props} key={`${id}_${option?.[optionValue]}`} /*disabled={disableValues && disableValues.includes(option?.[optionValue])}*/>
                    <Checkbox key={`ch-${id}_${option?.[optionValue]}`}
                      icon={icon}
                      checkedIcon={checkedIcon}
                      style={{ marginRight: 8 }}
                      checked={selectedValues.indexOf(option?.[optionValue]) >= 0 ? true: false}
                    />
                    {option?.[optionDisplayValue]}
                  </MenuItem>
                )}
                renderTags={(tagValue, getTagProps) => (
                  tagValue.map((option, index) => {
                    const { key, ...rest } = getTagProps({ index });
                    return (
                      <Chip
                        key={key}
                        label={option?.[optionDisplayValue]}
                        {...rest}
                      />
                    );
                  })
                )}
                value={selectOptions.filter((selectOption: any) => (selectedValues.indexOf(selectOption[optionValue]) >= 0 ? true : false)) || ""}
                renderInput={(params) => (
                    <TextField 
                      sx={{backgroundColor:'#fff', borderRadius:'10px'}}
                      {...params} 
                      name={name} 
                      // error={errors?.length > 0 ? true : false}
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {showDelete && <IconButton color='error' onClick={handleDeleteSubComponent}>
                              <DeleteOutlineIcon fontSize='small' />
                            </IconButton>}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                onChange={(event, option, reason,details) => handleOnChange(event, option, reason, details)}
                onClose={(event) => {
                        if (handleOnClose) {
                            handleOnClose(event);
                        }
                    }
                }
                disabled={isReadOnly}
                size={size}
            />
        </>

    )
}

export default RitzMultiSelectCheckBox;

