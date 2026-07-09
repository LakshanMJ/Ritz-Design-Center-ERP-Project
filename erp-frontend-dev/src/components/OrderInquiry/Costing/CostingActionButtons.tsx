import { Grid, Box, Button } from "@mui/material";
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import { useEffect, useState } from "react";
import SaveSpinner from "@/components/SaveSpinner";

const CostingActionButtons = ({showSave=false, showPrevious=false, showNext=false, saveButtonOnClickAction, nextButtonOnClickAction, previousButtonOnClickAction, saving=false}: any) => {
    const nextButton = 'Next';
    const previousButton = 'Previous';
    const saveButton = 'Save';

    const [prevLoading, setPrevLoading] = useState(false);
    const [nextLoading, setNextLoading] = useState(false);
    const [saveClicked, setSaveClicked] = useState(false);

    useEffect(() => {
        if (!saving) {
            setPrevLoading(false);
            setNextLoading(false);
        }

        if (saveClicked && !saving) {
            setSaveClicked(false);
        }
    }, [saving]);

    return (
        <Grid container columnSpacing={2}>
            <Grid item xs={6}>
                {showPrevious &&
                    <Button
                        onClick={() => [setPrevLoading(true), previousButtonOnClickAction()]}
                        variant="contained"
                        color="primary"
                        disabled={prevLoading || saving || nextLoading}
                        startIcon={<ChevronLeftIcon />}
                    >{prevLoading && <SaveSpinner />}{previousButton}</Button>}
            </Grid>

            <Grid item xs={6}>
                <Box
                    display="flex"
                    justifyContent="flex-end"
                >
                    {showSave &&
                        <Button
                            onClick={() => [setSaveClicked(true), saveButtonOnClickAction()]}
                            variant="contained"
                            color="primary"
                            disabled={prevLoading || saving || nextLoading}
                            sx={{
                                mr: showNext ? 2 : 0
                            }}
                        >{(saving && !prevLoading && !nextLoading) && <SaveSpinner />}{saveButton}</Button>}

                    {showNext &&
                        <Button
                            onClick={() => [setNextLoading(true), nextButtonOnClickAction()]}
                            variant="contained"
                            color="primary"
                            disabled={prevLoading || saving || nextLoading}
                            endIcon={<ChevronRightIcon />}
                        >{nextLoading && <SaveSpinner />}{nextButton}</Button>}
                </Box>
            </Grid>
        </Grid>
    )
};

export default CostingActionButtons;

