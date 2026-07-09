import React, { useState } from "react";
import { Box, useTheme, Tabs, Tab } from "@mui/material";
import CircularLoader from "@/components/CircularLoader";
import DefaultLoader from "@/components/DefaultLoader";
import { ReactKeyHelper } from "@/helpers/KeyHelper";
import { useSelector } from "react-redux";
import SupplierInquiryDetailsAnalyse from "./SupplierInquiryDetailsAnalyse";
import PlacementDetailsAnalyse from "./PlacementDetailsAnalyse";
import MaterialDetailsAnalyse from "./MaterialDetailsAnalyse";
import ConsumptionDetailsAnalyse from "./ConsumptionDetailsAnalyse";
import SpeedConsumptionRequest from "./ConsolidateSupplierInquiry/SpeedConsumptionRequest";

const PoAnalyse = ({ orderId, versionId, versionData }: any) => {
    const theme = useTheme()
    const keyHelper = new ReactKeyHelper();
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingCircularLoader, setIsLoadingCircularLoader] = useState(false);
    const [selectedVericalTabValue, setSelectedVericalTabValue] = useState(0);

    const handleChangeVerticalTab = (event: any, newValue: number) => {
        setSelectedVericalTabValue(newValue);
      };
    
    return (
        <>
            {isLoadingCircularLoader && <CircularLoader />}
            {isLoading ? (
                <DefaultLoader />
            ) : (
                <Box sx={{ mt: 2, p: 2 }}>

                    <Box sx={{ flexGrow: 1, bgcolor: 'background.paper', display: 'flex', width: '100%' }}>
                        <Tabs
                            orientation="vertical"
                            variant="scrollable"
                            value={selectedVericalTabValue}
                            onChange={handleChangeVerticalTab}
                            aria-label="Vertical tabs example"
                            sx={{ borderRight: 1, borderColor: 'divider' }}
                        >
                            <Tab label="Placement Types" value={0} />
                            <Tab label="Change Materials" value={1} />
                            <Tab label="Change Consumptions" value={2} />
                            <Tab label="Price Reduce" value={3} />
                            <Tab label="Speed Consumptions" value={4} />
                        </Tabs>

                        <Box sx={{ flex: 1, overflow: 'auto', ml: 2 }}>
                            {selectedVericalTabValue === 0 && (
                                <Box sx={{ mb: 3}}>
                                    <PlacementDetailsAnalyse orderId={orderId} versionId={versionId} versionData={versionData}  />
                                </Box>
                            )}
                            {selectedVericalTabValue === 1 && (
                                <Box sx={{ mb: 3}}>
                                    <MaterialDetailsAnalyse orderId={orderId} versionId={versionId} versionData={versionData} />
                                </Box>
                            )}
                            {selectedVericalTabValue === 2 && (
                                <Box sx={{ mb: 3}}>
                                    <ConsumptionDetailsAnalyse  orderId={orderId} versionId={versionId} versionData={versionData} />
                                </Box>
                            )}
                            {selectedVericalTabValue === 3 && (
                                <Box sx={{ mb: 3}}>
                                    <SupplierInquiryDetailsAnalyse  orderId={orderId} versionId={versionId} versionData={versionData} />
                                </Box>
                            )}
                            {selectedVericalTabValue === 4 && (
                                <Box sx={{ mb: 3}}>
                                    <SpeedConsumptionRequest orderId={orderId} versionId={versionId} versionData={versionData} />
                                </Box>
                            )}
                        </Box>
                    </Box>
                </Box>
            )}
        </>
    );
};

export default PoAnalyse;