import React, { useState } from 'react';
import TextField from "@mui/material/TextField";
import { Button, Card, Checkbox, FormControlLabel, Box, Chip, Grid } from "@mui/material";

// TODO cleanup - is this being used?
const RitzCheckInput = ({ cw_categories, orderCWCategories,
    handleColorwayCategory,
    onChangeColorwayCategoryType,
    updateNoOfTypes }: any) => {

    return (
        <>
            <Grid container>
                {cw_categories && cw_categories.map((category: any, index: any) => (
                    <Grid item xs={3} md={3} key={index}>
                        <Box>
                            <FormControlLabel control={<Checkbox
                                value={category.id}
                                checked={orderCWCategories.findIndex((ocwc: any) => ocwc.colorway_category == category.id) != -1
                                    ? true : false}
                                onChange={handleColorwayCategory}
                                inputProps={{ 'aria-label': 'controlled' }} />} label={category?.name} />
                        </Box>
                        {orderCWCategories.findIndex((ocwc: any) => ocwc.colorway_category == category.id) != -1 && <TextField
                            margin='normal'
                            type='number'
                            label="# of Colorway Categories"
                            value={orderCWCategories.find((ocwc: any) => ocwc.colorway_category == category.id)?.no_of_types || 0}
                            size="small"
                            onChange={(event: any) => {
                                updateNoOfTypes(event, orderCWCategories.find((ocwc: any) => ocwc.colorway_category == category.id));
                            }}
                        />}
                        <Box>
                            {orderCWCategories.find((ocwc: any) => ocwc.colorway_category == category.id)?.types.map((type: any, typeIndex: any) => (
                                <>

                                    {<TextField
                                        label="Category Type"
                                        size="small"
                                        onChange={(e) => onChangeColorwayCategoryType(e, orderCWCategories.find((ocwc: any) => ocwc.colorway_category == category.id), typeIndex)}
                                        value={type.name} />}
                                </>))}
                        </Box>
                    </Grid>))}
            </Grid>
        </>
    );
};

export default RitzCheckInput;