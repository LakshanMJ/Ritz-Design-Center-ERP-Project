import React, { useState } from 'react'
import { Box, Tab, Tabs } from '@mui/material';
import POClubGrnDetailView from './POClubGrnDetailView';
import POClubGrnFabricSummary from './POClubGrnFabricSummary';
import ShadeGroupsSummary from '@/views/grn/ShadeGroupsSummary';
import SupplierPOBomDetails from './SupplierPOBomDetails';
import ServicesDetails from './ServicesDetails';

const EditActualSupplierPODetails = ({ clubId}: any) => {
    const materialKey = 'materials';
    const serviceKey = 'services';

    const [selectedVericalTabValue, setSelectedVericalTabValue] = useState(materialKey);

    const handleChangeVerticalTab = (event: any, newValue: any) => {
        setSelectedVericalTabValue(newValue);
    };

    return (
        <>
            <Box sx={{ flexGrow: 1, bgcolor: 'background.paper', display: 'flex', width: '100%' }}>
                <Tabs
                    orientation="vertical"
                    variant="scrollable"
                    value={selectedVericalTabValue}
                    onChange={handleChangeVerticalTab}
                    sx={{ borderRight: 1, borderColor: 'divider' }}
                >
                    <Tab label="Materials" value={materialKey} />
                    <Tab label="Services " value={serviceKey} />
                </Tabs>
                <Box sx={{ flex: 1, overflow: 'auto', ml: 2 }}>
                    <Box>
                        {selectedVericalTabValue === materialKey && (
                            <Box>
                                <SupplierPOBomDetails clubId={clubId}/>
                            </Box>
                        )}
                        {selectedVericalTabValue === serviceKey && (
                            <Box>
                                <ServicesDetails clubId={clubId}/>
                            </Box>
                        )}
                    </Box>
                </Box>
            </Box>
        </>
    )
}
export default EditActualSupplierPODetails