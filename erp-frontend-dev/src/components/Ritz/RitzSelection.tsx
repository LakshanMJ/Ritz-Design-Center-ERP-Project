import * as React from 'react';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import { InputLabel, Typography } from '@mui/material';

const RitzSelection = ({ options, isMulti = false,
    isRequired = false, name, id, labelText, selectedValue = '',
    labelId = "label_1", handleOnChange, optionValue, optionText, customStyle, isReadOnly=false, size='medium'  }: any) => {
    return (
        <>
            {labelText && <Typography variant='h6' sx={{ mb: 2 }}>{labelText}</Typography>}
            <FormControl fullWidth>
                {!selectedValue && <InputLabel shrink={false} id={labelId} size={size}>Select...</InputLabel>}
                <Select
                    labelId={labelId}
                    id={id}
                    name={name}
                    value={selectedValue}
                    onChange={handleOnChange}
                    required={isRequired}
                    multiple={isMulti}
                    disabled={isReadOnly}
                    displayEmpty
                    size={size}
                    style={{ ...customStyle }}
                >
                    {options && options?.map((option : any) => (
                        <MenuItem
                            key={option?.[optionValue]}
                            value={option?.[optionValue]}
                        >
                            {option?.[optionText]}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
        </>
    );
};

export default RitzSelection;