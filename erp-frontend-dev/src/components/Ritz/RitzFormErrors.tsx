import {Box, Checkbox, FormControlLabel, Grid} from "@mui/material";
import React from "react";
import {Alert} from "@mui/material";

const RitzFormErrors = ({errorList = []}: any) => {

    return (
        <>
        {errorList.length > 0 && <Box sx={{marginTop: "2em"}}>
            {
                    errorList.length > 0 && errorList.map((error: any, index: number) => (
                        (error.length > 0 ? <Alert severity="error" key={index}>{error}</Alert>: '')
                    ))
            }
        </Box>}
        </>
    );
};

export default RitzFormErrors;