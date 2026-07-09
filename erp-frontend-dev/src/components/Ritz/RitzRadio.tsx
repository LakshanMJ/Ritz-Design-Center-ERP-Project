import * as React from "react";
import FormControl from "@mui/material/FormControl";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import { alpha, Divider, FormControlLabel, Grid, Typography } from "@mui/material";
import { blue, blueGrey } from "@mui/material/colors";

const RitzRadio = ({ options, isMulti = false, isRequired = false, name, id, labelText,
    selectedValue = 0, handleOnChange, row, optionValue,  optionText}: any) => {

    const CtrlLabel = (props: any) => {
        return (
            <FormControlLabel 
                key={`${id}-${props?.[optionValue]}`} 
                control={<Radio disableRipple={true} value={props?.[optionValue]} onChange={handleOnChange} />} 
                label={props?.[optionText]} 
                sx={{
                    display: 'flex',
                    mr: '-11px',
                    mb: props?.isLast || row ? 0 : 1,
                    color: selectedValue == props?.[optionValue] && blue[800],
                    border: selectedValue == props?.[optionValue] ? `1px solid ${blue[100]}` : '1px solid transparent',
                    background: selectedValue == props?.[optionValue] && blue[50],
                    borderRadius: 1,
                    '&:hover': {
                        background: selectedValue != props?.[optionValue] && alpha(blueGrey[50], 0.5)
                    }
            }}/>
        )
    }

    return (
        <>
            <Typography variant='h6' sx={{ mb: 2 }}>{labelText}</Typography>
            {/* <Divider sx={{ my: 2 }}></Divider> */}
            <FormControl sx={{ display: 'block' }}>
                <RadioGroup
                    row={row}
                    name={name}
                    id={id}
                    value={selectedValue}
                    onChange={handleOnChange}
                >
                    {row ? 
                        <Grid container columnSpacing={2} rowSpacing={1}>
                            {options && options?.map((option: any, i: number) => (
                                <Grid item xs={6}>
                                    <CtrlLabel {...option} key={i} />
                                </Grid>
                            ))}
                        </Grid> : (
                        <>
                            {options && options?.map((option: any, i: number) => (
                                <CtrlLabel {...option} key={i} isLast={i+1===options?.length}/>
                            ))}
                        </>
                    )}
                </RadioGroup>
            </FormControl>
        </>
    );
};
export default RitzRadio;
