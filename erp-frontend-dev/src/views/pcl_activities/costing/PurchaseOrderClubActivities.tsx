import React, { useEffect, useState } from 'react';
import { getDefaultError } from '@/helpers/Utilities';
import toast from 'react-hot-toast';
import { Alert, Box, Card, CardHeader, Grid, Link, List, ListItem, ListItemIcon, ListItemText, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import DefaultLoader from '@/components/DefaultLoader';
import api from '@/services/api';
import CircleIcon from '@mui/icons-material/Circle';
import { purchaseOrderDetailPageURL } from '@/helpers/constants/FrontEndUrls';

const PurchaseOrderClubActivities = ({ purchaseOrdersSet }: any) => {
  const [isLoading, setIsLoading] = useState(false);
 

  return (
    <>
      {isLoading ? (
        <DefaultLoader />
      ) : (
        <>
        <Box>
        <List>
        {purchaseOrdersSet.map((purchaseOrder: any, purchaseOrderIndex: any) => (
          <ListItem key={purchaseOrder.id}>
            <ListItemIcon>
            <CircleIcon sx={{ fontSize: 12 }} />
            </ListItemIcon>
            <Link sx={{cursor: 'pointer'}} href={purchaseOrderDetailPageURL(purchaseOrder?.id)}  target="_blank">{purchaseOrder.display_number}</Link>
          </ListItem>
        ))}
      </List>
        </Box>
        </>
      )}
    </>
  );
};

export default PurchaseOrderClubActivities;
