import React, { useEffect, useState } from 'react';
import { Box, Typography, Tabs, Tab, ToggleButtonGroup, ToggleButton } from '@mui/material';
import DefaultLoader from '@/components/DefaultLoader';
import POClubBom from '../purchase_order/club/POClubBom';
import POBom from '../purchase_order/POBom';
const BomDetails = ({ poDetails, clubId }: any) => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedType, setSelectedType] = useState('club')
  const [poClubId, setPoClubId] = useState(null)
  const [purchaseOrders, setPurchaseOrders] = useState<any>([]);

  const handleMaterialCategoryChange = (event: any, newCategory: any) => {
    if (newCategory !== null) {
      setSelectedType(newCategory);
    }
  };

  useEffect(() => {
    if (clubId) {
      setPoClubId(clubId)
      setPurchaseOrders([...poDetails])
    }
  }, [clubId]);

  return (
    <>
      {isLoading ? (
        <DefaultLoader />
      ) : (
        <>
          <Box>
            <ToggleButtonGroup
              color="primary"
              value={selectedType}
              exclusive
              onChange={handleMaterialCategoryChange}
              aria-label="Material Categories"
              sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}
            >
              <ToggleButton style={{ height: '4em', minWidth: '150px', border: '1px solid #E0E0E0', borderRadius: '5px', display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center', marginBottom: '10px', }} value='club'>
                Club BOM
              </ToggleButton>
              {purchaseOrders.map((category: any) => (
                <ToggleButton key={category.id} style={{ height: '4em', minWidth: '150px', border: '1px solid #E0E0E0', borderRadius: '5px', display: 'flex', justifyContent: 'center', alignItems: 'center', textAlign: 'center', marginBottom: '10px', }}
                  value={category.id}>
                  {category.name}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <Box>
              {selectedType === 'club' ? (
                <Box>
                  <POClubBom clubId={poClubId} filterData={[]} disabledFilter={true} />
                </Box>
              ) : (
                <Box>
                  <POBom purchaseOrderId={selectedType} filterData={[]} />
                </Box>
              )}
            </Box>
          </Box>
        </>
      )}
    </>
  );
};

export default BomDetails;