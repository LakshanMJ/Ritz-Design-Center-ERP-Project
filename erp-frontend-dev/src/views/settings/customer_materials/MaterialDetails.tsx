import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, Divider, Grid, Link } from '@mui/material';
import api from "@/services/api";
import { toast } from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';
import RitzTable from '@/components/Ritz/RitzTable';
import * as MaterialAdministrationUrls from '@/helpers/constants/rest_urls/MaterialAdministrationUrls';
import { TabContext } from '@mui/lab';
import { RitzTabPanel, RitzTabs } from '@/components/Ritz/RitzTabs';
import NextLink from 'next/link';
import * as FrontEndUrls from "@/helpers/constants/FrontEndUrls";

const MaterialDetails = ({ materialId }: { materialId: any }) => {
  const [supplierData, setSupplierData] = useState<any[]>([]);
  const [costingData, setCostingData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('1');

  const fetchData = () => {

    Promise.all([
      api.get(MaterialAdministrationUrls.customerBrandMaterialSupplierListURL(materialId)),
      api.get(MaterialAdministrationUrls.customerBrandMaterialCostingListURL(materialId)),
    ])
      .then(([supplierResponse, costingResponse]) => {
        setSupplierData(supplierResponse.data || []);
        setCostingData(costingResponse.data || []);
      })
      .catch((error) => {
        toast.error(getDefaultError(error?.response?.status));
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    if (materialId) {
      fetchData();
    }
  }, [materialId]);

  const onChangeTab = (event: string) => {
    setActiveTab(event);
  };

  const MaterialSupplierColumns = [
    {
      accessorKey: 'name',
      header: 'Supplier Name',
    },
    {
      accessorKey: 'supplier_material_reference_code',
      header: 'Material Code',
    }
  ];

  const MaterialCostingColumns = [
    {
      accessorKey: 'long_code',
      header: 'Order Number',
      cell: (props: any) => {
        if (props.row.original) {
          const { id: versionId, order_id: orderId } = props.row.original;
  
          return (
            <Link
              component={NextLink}
              href={FrontEndUrls.orderSummaryPageURL(orderId, versionId)}
              sx={{ textDecoration: 'none', color: 'primary.main', cursor: 'pointer' }}
            >
              {props.getValue()}
            </Link>
          );
        } else {
          return <Typography>--</Typography>;
        }
      },
    },
  ];
  

  return (

    
    <Card variant="outlined">
      <CardContent>
        <TabContext value={activeTab}>
          <RitzTabs
            tabs={['Supplier Details', 'Costing Details']}
            activeTab={activeTab}
            emitChange={onChangeTab}
          />
          <RitzTabPanel value="1" sx={{ pt: 2 }}>
            <RitzTable
              columns={MaterialSupplierColumns}
              data={supplierData}
              isLoading={isLoading}
              enableGlobalFilter={false} 
              enableColumnFilter={false}
            />
          </RitzTabPanel>
          <RitzTabPanel value="2" sx={{ pt: 2 }}>
            <RitzTable
              columns={MaterialCostingColumns}
              data={costingData}
              isLoading={isLoading}
              enableGlobalFilter={false} 
              enableColumnFilter={false}
            />
          </RitzTabPanel>
        </TabContext>
      </CardContent>
    </Card>
  );
};

export default MaterialDetails;