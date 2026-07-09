import * as React from 'react';
import FormControl from '@mui/material/FormControl';
import { TextField, Typography, alpha } from '@mui/material';
import { grey } from '@mui/material/colors';
import { number } from 'yup';

const RitzInput = ({ isRequired = false, name, id, labelText, placeholderText, selectedValue, handleOnChange, handleOnBlur, handleOnFocus, handleOnKeyDown, handleAutoFocus, rows, size,  customStyle , isReadOnly=false, inputType='text', isMulti=false, fullWidth=false }: any) => {
    return (
        <>
            {labelText && <Typography variant='h6' sx={{ mb: 2 }}>{labelText}</Typography>}
            <FormControl fullWidth={isMulti || fullWidth}>
                <TextField
                    multiline={isMulti}
                    id={id}
                    name={name}
                    value={(selectedValue !== null && selectedValue !== undefined) ? selectedValue : ''}
                    onChange={handleOnChange}
                    required={isRequired}
                    placeholder={placeholderText}
                    autoFocus={handleAutoFocus}
                    variant="outlined"
                    rows={rows}
                    onBlur={handleOnBlur}
                    onFocus={handleOnFocus}
                    disabled={isReadOnly}
                    autoComplete={'off'}
                    size={size}
                    type={inputType}
                    onKeyDown={handleOnKeyDown}
                    onKeyPress={(event) => {
                        if (inputType === "number" && (event.key === "e" || event.key === "E")) {
                            event.preventDefault();
                        }
                    }}
                    sx={{
                        background: 'white',
                        '& .Mui-disabled': {
                            background: alpha(grey[50], 0.5),
                        },
                        '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': {
                        WebkitAppearance: 'none',
                        display: 'none',
                        margin: 0,
                        },
                        '& input[type=number]': {
                            'MozAppearance': 'textfield',
                        },
                        ...customStyle,
                    }}/>
            </FormControl>
        </>
    );
};

export default RitzInput;