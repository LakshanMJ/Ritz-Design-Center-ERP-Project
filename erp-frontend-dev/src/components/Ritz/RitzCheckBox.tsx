import * as React from 'react';
import Checkbox from '@mui/material/Checkbox';
import { Typography, FormControlLabel, FormGroup, Grid, alpha } from '@mui/material';
import { blue, blueGrey } from '@mui/material/colors';

const RitzCheckBox = ({ options, isMulti = false, isRequired = false, name, id,
    labelText, selectedValues, handleOnChange, optionText, optionValue, dynamicOptionText, row, selectedOptionValue,disabled  }: any) => {
        
    const CtrlLabel = (props: any) => {
        const label = dynamicOptionText ? dynamicOptionText(props) : props[optionText];
        return (
            <FormControlLabel
                key={props?.[optionValue]}
                control={<Checkbox disableRipple={true} checked={selectedValues?.findIndex((x : any) => x?.[selectedOptionValue] == props?.[optionValue]) >= 0 ? true : false}
                            onChange={handleOnChange} value={props?.[optionValue]} disabled={disabled}   />}
              
                label={label} 
                
                sx={{
                    display: 'flex',
                    mr: 0,
                    pr: row ? 2 : 0,
                    mb: row ? 0 : 1,
                    color: selectedValues?.findIndex((x : any) => x?.[selectedOptionValue] == props?.[optionValue]) >= 0 && blue[800],
                    border: selectedValues?.findIndex((x : any) => x?.[selectedOptionValue] == props?.[optionValue]) >= 0 ? `1px solid ${blue[100]}` : '1px solid transparent',
                    background: selectedValues?.findIndex((x : any) => x?.[selectedOptionValue] == props?.[optionValue]) >= 0 && blue[50],
                    borderRadius: 1,
                    '&:hover': {
                        background: selectedValues?.findIndex((x : any) => x?.[selectedOptionValue] == props?.[optionValue]) < 0 && alpha(blueGrey[50], 0.5)
                    }
                }}/>
        )
    }

    return (
        <>
            <Typography variant='h6' sx={{ mb: 2 }}>{labelText}</Typography>
            <FormGroup row={row}>
                {row ? 
                    <Grid container columnSpacing={2} rowSpacing={1}>
                        {options && options?.map((option: any, index: number) => (
                            <Grid item xs={6} key={index}>
                                <CtrlLabel {...option} key={index} />
                            </Grid>
                        ))}
                    </Grid> : <>
                    {options && options?.map((option: any, index: number) => (
                        <CtrlLabel {...option} key={index} />
                    ))}</>
                }
            </FormGroup>
        </>
    );
};

export default RitzCheckBox;