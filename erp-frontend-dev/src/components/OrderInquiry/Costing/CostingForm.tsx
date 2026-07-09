import CostingSteps from "@/components/OrderInquiry/Costing/CostingSteps";
import { Grid, useMediaQuery, useTheme } from "@mui/material";
import {useEffect, useState} from "react";

const CostingFormLayout = (props: any) => {
    const step = props?.step;
    const formValues = props?.formValues || {};
    const children = props?.children;
    const theme = useTheme();
    const isSmall = useMediaQuery(theme.breakpoints.down('lg'));
    const horizontalSteps = [5, 6, 7];  // horizontal layout steps
    const [showNavigation, setShowNavigation] = useState(false);

    useEffect(()=> {
        // Since this is by default true we only set it if the prop is false
        if (props?.showNavigation == false) {
            setShowNavigation(props.showNavigation);
        } else {
            setShowNavigation(true);
        }
    }, [props.showNavigation]);
    return (
        <Grid
            wrap='nowrap'
            container
            spacing={6}
            direction={(isSmall || horizontalSteps.includes(step)) ? 'column-reverse' : 'row'}
        >
            <Grid item lg={horizontalSteps.includes(step) ? 12 : 7} md={12} xs={12}>
                {children}
            </Grid>
            { showNavigation &&
                <Grid item lg={horizontalSteps.includes(step) ? 12 : 5} md={12} xs={12}>
                    <CostingSteps active={step} formValues={formValues} />
                </Grid>
            }
        </Grid>
    )
}

export default CostingFormLayout;