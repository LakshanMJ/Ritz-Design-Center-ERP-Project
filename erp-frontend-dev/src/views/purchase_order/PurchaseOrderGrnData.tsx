import { Box, Tab, Tabs } from '@mui/material';
import React, {useState} from 'react'
import ShadeGroupsSummary from '../grn/ShadeGroupsSummary';
import PurchaseOrderFabricSummary from './PurchaseOrderFabricSummary';
import PurchaseOrderGrnDetailView from './PurchaseOrderGrnDetailView';

const PurchaseOrderGrnData = ({purchaseOrderId, poShadeGroupSummaryUrl, poClubShadeAttachmentUploadUrl}: any) => {
    const grnMaterialsKey = 'grn_materials';
    const fabricSummaryKey = 'fabric_summary';
    const shadeGroupKey = 'shade_group'

    const [selectedVericalTabValue, setSelectedVericalTabValue] = useState(grnMaterialsKey);

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
                    <Tab label="Material Details" value={grnMaterialsKey} />
                    <Tab label="Fabric Summary" value={fabricSummaryKey} />
                    <Tab label="Shade Group Details" value={shadeGroupKey} />
                </Tabs>
                <Box sx={{ flex: 1, overflow: 'auto', ml: 2 }}>
                    <Box>
                        {selectedVericalTabValue === grnMaterialsKey && (
                            <Box>
                                <PurchaseOrderGrnDetailView purchaseOrderId={purchaseOrderId} />
                            </Box>
                        )}
                        {selectedVericalTabValue === fabricSummaryKey && (
                            <Box>
                                <PurchaseOrderFabricSummary purchaseOrderId={purchaseOrderId} />
                            </Box>
                        )}
                        {selectedVericalTabValue === shadeGroupKey && (
                            <Box>
                                <ShadeGroupsSummary sourceId={purchaseOrderId} sourceDataUrl={poShadeGroupSummaryUrl} imageUpdloadUrl={poClubShadeAttachmentUploadUrl} />
                            </Box>
                        )}
                    </Box>
                </Box>
            </Box>
        </>
    )
}

export default PurchaseOrderGrnData;