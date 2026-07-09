import * as React from 'react';
import Checkbox from '@mui/material/Checkbox';
import { FormControlLabel, FormGroup } from '@mui/material';
import { Typography } from '@mui/material';

const RitzCheck = ({ options, isMulti = false, isRequired = false, name, id,
    labelText, selectedValues, handleOnChange, optionText, optionValue, row }: any) => {
    return (
        <>
            <Typography variant='h6' sx={{ mb: 2 }}>{labelText}</Typography>
            <FormGroup>
            {options && options?.map((option: any, index: string) => (
                <FormControlLabel key={option?.[optionValue]}
                control={<Checkbox checked={selectedValues?.findIndex((x : any) => x?.[optionText] === option?.[optionText]) != -1 ? true : false || false} onChange={handleOnChange} value={option?.[optionValue]} />}
                label={option?.[optionText]} />
            ))}
            </FormGroup>
        </>
    );
};

export default RitzCheck;