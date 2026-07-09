import React, { useEffect, useState } from 'react';
import DefaultLoader from '@/components/DefaultLoader';
import { Alert, Box, Divider, ToggleButton, ToggleButtonGroup } from '@mui/material';

import { ReactKeyHelper } from '@/helpers/KeyHelper';
import PostCostingSummary from './PostCostingSummary';
import CostingSummary from '../costing/OrderInquiry/OrderPack/CostingSummary';

const PackSummary = ({ postCostingPackId, marketingCostingPackId, preCostingPackId, marketingCostingOrder, marketingCostingVersion, orderId, versionId }: any) => {
    const marketingCostingKey = 'marketing_costing';
    const preCostingKey = 'pre_costing';
    const postCostingKey = 'post_costing';
    const keyHelper = new ReactKeyHelper();
    const [isLoading, setIsLoading] = useState(false);

    const [selectedReportType, setSelectedReportType] = React.useState('');

    const handleChange = (event: any, type: string) => {
        setSelectedReportType(type);
    };

    return (
        <>
            {isLoading ? (
                <DefaultLoader />
            ) : (
                <>
                    <Box>
                        <ToggleButtonGroup
                            color="primary"
                            value={selectedReportType}
                            exclusive
                            onChange={handleChange}
                            aria-label="Platform"
                        >
                            <ToggleButton value="marketing_costing">Marketing Costing</ToggleButton>
                            <ToggleButton value="pre_costing">Pre Costing</ToggleButton>
                            <ToggleButton value="post_costing">Pre-seen</ToggleButton>
                        </ToggleButtonGroup>
                    </Box>
                    <Divider sx={{ mt: 1 }} />
                    {!selectedReportType && (
                        <Box>
                            <Alert severity='info' sx={{ mt: 2 }}> Please select a costing summary method to view the details.</Alert>
                        </Box>
                    )}
                    {selectedReportType === marketingCostingKey && (
                        <Box sx={{ mt: 2 }}>
                            <CostingSummary orderId={marketingCostingOrder} versionId={marketingCostingVersion} packId={marketingCostingPackId} />
                        </Box>
                    )}
                    {selectedReportType === preCostingKey && (
                        <Box sx={{ mt: 2 }}>
                            <CostingSummary orderId={orderId} versionId={versionId} packId={preCostingPackId} />
                        </Box>
                    )}
                    {selectedReportType === postCostingKey && (
                        <Box sx={{ mt: 2 }}>
                            <PostCostingSummary packId={postCostingPackId} />
                        </Box>
                    )}
                </>
            )}
        </>
    );
};

export default PackSummary;