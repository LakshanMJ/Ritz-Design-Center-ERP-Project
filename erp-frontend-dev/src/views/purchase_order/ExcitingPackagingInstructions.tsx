import React, { useEffect, useState } from 'react';
import * as RestUrls from '@/helpers/constants/RestUrls';
import EditIcon from '@mui/icons-material/Edit';
import api from '@/services/api';
import { Alert, Box, Button, Card, CardContent, CardHeader, Checkbox, darken, Divider, Grid, IconButton, InputLabel, Link, List, ListItem, ListItemIcon, ListItemText, Table, TableBody, TableCell, TableHead, TableRow, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material';
import NextLink from 'next/link';
import CheckIcon from '@mui/icons-material/Check';
import { purchaseOrderPackagingInstructionPageURL } from '@/helpers/constants/FrontEndUrls';
import CurrentPackagingInstructions from './CurrentPackagingInstructions';

const ExcitingPackagingInstructions = ({ dataList, handleAcceptChange, handleIgnoreChange, editVersion, handleCheckMainComponent }: any) => {

  const [exitingPackagingInstructionDetails, setExitingPackagingInstructionDetails] = useState<any>(dataList);
  const [selectedPo, setSelectedPo] = useState<any>(null);
  
  const handleCheckboxChange = (id: number, type: any) => {
    setSelectedPo((prevSelectedPo: { id: number; type: any } | null) => 
      prevSelectedPo?.id === id && prevSelectedPo?.type === type ? null : { id, type }
    );
  };

  const handleOnClickConfirm = () => {
    handleAcceptChange(selectedPo)
  }

  const handleOnClickCancel = () => {
    handleIgnoreChange()
  }

  const noPackagingInstructionsAvailable = 
    (exitingPackagingInstructionDetails?.purchase_order_pack_instruction?.length === 0) &&
    (!exitingPackagingInstructionDetails?.costing_pack_instruction?.pack_packaging_versions || exitingPackagingInstructionDetails?.costing_pack_instruction?.pack_packaging_versions?.length === 0);

  return (
    <>
      <Box>
        {noPackagingInstructionsAvailable ? (
         handleCheckMainComponent(true)
        ) : (
          <>
            <Grid container spacing={1}>
              <Grid item sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography>
                  Pack Instructions are already associated with this Purchase Order in the Purchase Order Club / Costing. Please select one of the options below to proceed.
                </Typography>
              </Grid>
            </Grid>
            <Box sx={{ mt: 1 }}>
              <Typography sx={{ fontWeight: 'bold' }}>Purchase Order Pack Instruction</Typography>
              <List>
                {exitingPackagingInstructionDetails?.purchase_order_pack_instruction?.length == 0 ? (
                  <Alert severity='info' variant='outlined' sx={{ border: 0, p: 0 }} >No available purchase order Pack Instructions.</Alert>
                ) : (
                  exitingPackagingInstructionDetails?.purchase_order_pack_instruction?.map((po: any, poIndex: any) => (
                    <ListItem key={poIndex} sx={{ p: '4px 8px', mb: '1px', display: 'flex', alignItems: 'center' }} >
                      <ListItemIcon><Checkbox checked={selectedPo?.id === po.id && selectedPo?.type === 'purchase_order'}  onChange={() => handleCheckboxChange(po.id, 'purchase_order')} /></ListItemIcon>
                      <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
                      <Link target="_blank" component={NextLink} href={purchaseOrderPackagingInstructionPageURL(po.purchase_order_id)}> {po?.purchase_order_display_number}</Link>
                      </Box>
                    </ListItem>
                  ))
                )}
              </List>
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 'bold' }}>Costing Pack Instruction (   <Link target="_blank" component={NextLink} href={`/costing/add/${exitingPackagingInstructionDetails?.costing_pack_instruction?.order_id}/version/${exitingPackagingInstructionDetails?.costing_pack_instruction?.costing_id}?tab=9`}> {exitingPackagingInstructionDetails?.costing_pack_instruction?.costing_display_number} </Link>)</Typography>
              <List>
                {exitingPackagingInstructionDetails?.costing_pack_instruction?.length == 0 ? (
                  <Alert severity='info' variant='outlined'>No available costing Pack Instruction.</Alert>
                ) : (
                  exitingPackagingInstructionDetails?.costing_pack_instruction?.pack_packaging_versions?.map((costing: any, costingIndex: any) => (
                    <ListItem key={costingIndex} sx={{ p: '4px 8px', mb: '1px', display: 'flex', alignItems: 'center' }} >
                      <ListItemIcon><Checkbox  checked={selectedPo?.id === costing.id && selectedPo?.type === 'costing'} onChange={() => handleCheckboxChange(costing.id, 'costing')} /></ListItemIcon>
                      <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
                        <Link sx={{ cursor: 'pointer' }} target="_blank"  component={NextLink} href={`/costing/add/${exitingPackagingInstructionDetails?.costing_pack_instruction?.order_id}/version/${exitingPackagingInstructionDetails?.costing_pack_instruction?.costing_id}?tab=9`}>
                          {costing?.display_number}
                        </Link>
                      </Box>
                    </ListItem>
                  ))
                )}
              </List>
            </Box>
          </>
        )}
      </Box>
      {!noPackagingInstructionsAvailable && (
        <Box sx={{ mt: 1, display: 'flex', justifyContent: 'end', gap: 2 }}>
          <Button variant="contained" color='primary' onClick={handleOnClickConfirm}>Accept</Button>
          {!editVersion && (
            <Button variant="contained" color='error' onClick={handleOnClickCancel}>Ignore</Button>
          )}
        </Box>
      )}
    </>
  );
};

export default ExcitingPackagingInstructions;