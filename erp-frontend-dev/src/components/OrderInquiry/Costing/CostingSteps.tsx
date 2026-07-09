import { Box, Popover, Step, StepButton, StepContent, StepLabel, Stepper, Typography, useMediaQuery, useScrollTrigger, useTheme } from "@mui/material";
import CostingSummary from "./CostingSummary";
import { useRouter } from "next/router";
import { useState } from "react";

export const ORDER_PACK_QUANTITIES_LABEL = 'Order Pack Quantities';
export const ORDER_SUMMARY_LABEL = 'Order Summary';

export const COSTING_STEPS: Array<any> = [
    { label: 'General Information', url: '', error: false },
    { label: 'Countries', url: 'countries', error: false },
    { label: 'Size Information', url: 'sizes', error: false },
    { label: 'Items', url: 'items', error: false },
  //  { label: 'Colorway Categories', url: 'colorway_categories', error: false },
    { label: 'Order Colorways', url: 'colorways', error: false },
    { label: 'Colorway Matrix', url: 'colorway_matrix', error: false },
    // { label: ORDER_PACK_QUANTITIES_LABEL, url: 'quantities', error: false },
    { label: ORDER_SUMMARY_LABEL, url: 'summary', error: false }
]

const horizontalStepStyle = {
    marginTop: '1rem'
}

const CostingSteps = (props: any) => {
    const router = useRouter();
    const theme = useTheme();
    const trigger = useScrollTrigger();

    const active = props?.active;
    const orderId = router.query?.id;

    const isSmall = useMediaQuery(theme.breakpoints.down('lg'));
    const isHorizontal = [5, 6, 7].includes(active);   // Colorway matrix and order pack quantities use horizontal view

    const [anchorEl, setAnchorEl] = useState(null);
    const [hoverStep, setHoverStep] = useState(null);

    const handleClick = (step: number) => {
        if (orderId) {
            const url = COSTING_STEPS[step]?.url;
            router.push(`/costing/add/${orderId}/${url}`);
        }
    }

    const handlePopoverOpen = (event: any, step: number) => {
        const hidePopover = ([5,6,7].includes(step) || active === 7) && isHorizontal && !isSmall;
        if ((isSmall || isHorizontal) && !hidePopover) {
            setHoverStep(step);
            setAnchorEl(event.currentTarget);
        }
    };
  
    const handlePopoverClose = () => {
        if (isSmall || isHorizontal) {
            setAnchorEl(null);
        }
    };
  
    const open = Boolean(anchorEl);

    return (
        <Box 
            style={(isSmall || isHorizontal) ? horizontalStepStyle : {}} 
            sx={{
                position: 'sticky',
                zIndex: 5,
                top: trigger ? '2rem' : '6rem',
            }}
        >
            <Stepper 
                activeStep={active} 
                orientation={(isSmall || isHorizontal) ? 'horizontal' : 'vertical'}
                alternativeLabel={isHorizontal}
            >
                {COSTING_STEPS.map((step: any, i: number) => (
                    <Step key={i} expanded={!isHorizontal} disabled={false}>
                        <StepButton
                            sx={{
                                borderRadius: 1,
                            }}
                            disableRipple={false}
                            onClick={() => handleClick(i)} 
                            onMouseEnter={(e: any) => handlePopoverOpen(e, i)}
                            onMouseLeave={handlePopoverClose}
                        >
                            <StepLabel error={step.error}>{!isSmall && step.label}</StepLabel>
                        </StepButton>
                        {(!isSmall && !isHorizontal) && <StepContent>
                            <CostingSummary step={i} formValues={props?.formValues} />
                        </StepContent>}
                    </Step>
                ))}
            </Stepper>
            <Popover
                elevation={1}
                sx={{
                    pointerEvents: 'none',
                }}
                open={open}
                anchorEl={anchorEl}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                }}
                onClose={handlePopoverClose}
                disableRestoreFocus
            >
                <Box sx={{ p: 2, maxWidth: 350 }}>
                    {isSmall && <Typography fontWeight='bold' mb={1}>{COSTING_STEPS[hoverStep]?.label}</Typography>}
                    <CostingSummary step={hoverStep} formValues={props?.formValues} />
                </Box>
            </Popover>
        </Box>
    )
}

export default CostingSteps;