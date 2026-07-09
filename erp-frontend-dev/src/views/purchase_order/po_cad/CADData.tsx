import DefaultLoader from "@/components/DefaultLoader";
import { TabPanel } from "@mui/lab";
import { Alert, Box, Button, Card, CardContent, CardHeader, Grid, IconButton, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, Tooltip, Typography } from "@mui/material";
import React, { useState } from "react";
import CADDataAcrossDeleveriesAndBatches from '@/views/purchase_order/po_cad/CADDataAcrossDeleveriesAndBatches';
import CADDataAcrossTheBatches from '@/views/purchase_order/po_cad/CADDataAcrossTheBatches';
import CADDataAcrossTheDeliveries from '@/views/purchase_order/po_cad/CADDataAcrossTheDeliveries';

const CADTables = ({ clubId }: any) => { 

const [activeTab, setActiveTab] = useState(0);

const handleChange = (event:any, newValue:any) => {
    setActiveTab(newValue);
}

return (

    <Box sx={{flexGrow: 1, bgcolor: 'background.paper', display: 'flex'}}>
    <Tabs
        orientation="vertical"
        variant="scrollable"
        value={activeTab}
        onChange={handleChange}
        aria-label="Vertical tabs example"
        sx={{borderRight: 1, borderColor: 'divider'}}
    >
            <Tab
                label={'Across Deleveries And Batches'}
                sx={{textAlign: 'left', '&:hover': { borderColor: 'blue' }}}
            />
            <Tab
                label={'Across The Batches'}
                sx={{textAlign: 'left'}}
            />
            <Tab
                label={'Across The Deliveries'}
                sx={{textAlign: 'left'}}
            />
    </Tabs>
    
    <Box sx={{ flex: 1, overflow: 'auto', paddingLeft: '20px'  }}>

            {activeTab === 0 && 
                <Box sx={{ flex: 1, overflow: 'auto' }}>
                    <CADDataAcrossDeleveriesAndBatches clubId={clubId}/>
                </Box>}
            {activeTab === 1 &&
                <Box sx={{ flex: 1, overflow: 'auto' }}>
                    <CADDataAcrossTheBatches clubId={clubId}/>
                </Box>}
            {activeTab === 2 &&
                <Box sx={{ flex: 1, overflow: 'auto' }}>
                    <CADDataAcrossTheDeliveries clubId={clubId}/>
                </Box>}
        </Box>
    </Box>           
);

}
export default CADTables;