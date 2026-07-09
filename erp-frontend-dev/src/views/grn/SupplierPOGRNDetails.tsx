import React, { useEffect, useState } from 'react';
import { getDefaultError } from '@/helpers/Utilities';
import toast from 'react-hot-toast';
import { Alert, Box, Card, CardHeader, Divider, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import DefaultLoader from '@/components/DefaultLoader';
import api from '@/services/api';
import { TabContext } from '@mui/lab';
import { RitzTabPanel, RitzTabs } from '@/components/Ritz/RitzTabs';
import { useRouter } from 'next/router';
import POClubGrnDetailView from '@/views/purchase_order/club/POClubGrnDetailView';
import SPODeliverySummary from '@/views/grn/SPODeliverySummary';

const SupplierPOGRNDetails = ({ clubId }: any) => {
  const [activeTab, setActiveTab] = useState('1');

  const handleChangeTabs = (event: string) => {
    setActiveTab(event);
  };

  return (
    <Box>
      <TabContext value={activeTab}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <RitzTabs tabs={['Supplier PO Details', 'Delivery Summary']} activeTab={activeTab} emitChange={handleChangeTabs} />
        </Box>
        <RitzTabPanel value='1' sx={{ pt: 2 }}>
          {activeTab === '1' && <POClubGrnDetailView clubId={clubId} />}
        </RitzTabPanel>
        <RitzTabPanel value='2' sx={{ pt: 2 }}>
          {activeTab === '2' && <SPODeliverySummary clubId={clubId} />}
        </RitzTabPanel>
      </TabContext>
    </Box>
  );
};

export default SupplierPOGRNDetails;
