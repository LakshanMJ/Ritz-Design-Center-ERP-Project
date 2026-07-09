import React, { useEffect, useState } from 'react';
import api from '@/services/api';
import { Box, Tab, Tabs, Typography } from '@mui/material';
import { getDefaultError } from '@/helpers/Utilities';
import toast from 'react-hot-toast';
import DefaultLoader from '@/components/DefaultLoader';
import { checkExitingPackagingDetailsURL } from '@/helpers/constants/rest_urls/POUrls';
import ExcitingPackagingInstructions from './ExcitingPackagingInstructions';
import CurrentPackagingInstructions from './CurrentPackagingInstructions';
import { TabPanel } from '@mui/lab';
import PurchaseOrderPackagingSummary from './PurchaseOrderPackagingSummary';

const PurchaseOrderPackagingInstruction = ({ packagingVersion, versionId, purchaseOrderId }: any) => {
  const [isLoading, setIsLoading] = useState(true);
  const [exitingPackagingInstructionDetails, setExitingPackagingInstructionDetails] = useState<any>({});
  const [openCurrentPackagingModal, setOpenCurrentPackagingModal] = useState(false);
  const [openConfirmationModal, setOpenConfirmationModal] = useState(false);
  const [packagingVersionId, setPackagingVersionId] = useState<any>(packagingVersion || null);
  const [packagingVersionType, setPackagingVersionType] = useState<any>(null);
  const [selectedVericalTabValue, setSelectedVericalTabValue] = useState(0);

  const checkExitingPackagingDetails = () => {
    Promise.all([
      api.get(checkExitingPackagingDetailsURL(purchaseOrderId))
    ]).then(resp => {
      const respData = resp.map((r: any) => r.data);
      const [exitingData] = respData;
      setExitingPackagingInstructionDetails({ ...exitingData })
      if (exitingData.is_packaging_instruction_exist) {
        setOpenConfirmationModal(false)
        setOpenCurrentPackagingModal(true)
      }
      else {
        setOpenCurrentPackagingModal(false)
        setOpenConfirmationModal(true)
      }
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => {
      setIsLoading(false)
    });
  }

  const handleAcceptChange = (selectedPODetails: any) => {
    setOpenConfirmationModal(false)
    setOpenCurrentPackagingModal(true)
    setPackagingVersionId(selectedPODetails?.id)
    setPackagingVersionType(selectedPODetails?.type)
  }
  const handleIgnoreChange = () => {
    setOpenConfirmationModal(false)
    setPackagingVersionId(null)
    setOpenCurrentPackagingModal(true)
  }
  
  const handleChangeVerticalTab = (event: any, newValue: number) => {
    setSelectedVericalTabValue(newValue);
  };

  useEffect(() => {
    if (purchaseOrderId) {
      checkExitingPackagingDetails()
    }
  }, [purchaseOrderId]);

  return (
    <>
      {isLoading ? <DefaultLoader /> :
        <React.Fragment>
          <Box sx={{ flexGrow: 1, bgcolor: 'background.paper', display: 'flex', width: '100%' }}>
            <Tabs
              orientation="vertical"
              variant="scrollable"
              value={selectedVericalTabValue}
              onChange={handleChangeVerticalTab}
              aria-label="Vertical tabs example"
              sx={{ borderRight: 1, borderColor: 'divider' }}
            >
              <Tab label="Packaging Instruction" value={0} />
              <Tab label="Packaging Summary" value={1} />
            </Tabs>

            <Box sx={{ flex: 1, overflow: 'auto', ml: 2 }}>
              {selectedVericalTabValue === 0 && (
                <Box>
                  {openConfirmationModal && (
                    <Box sx={{ mb: 3, mt: 3 }}>
                      <ExcitingPackagingInstructions
                        dataList={exitingPackagingInstructionDetails}
                        handleAcceptChange={handleAcceptChange}
                        handleIgnoreChange={handleIgnoreChange}
                        handleCheckMainComponent={(status: any)=>{setOpenCurrentPackagingModal(status)}}
                      />
                    </Box>
                  )}
                  {openCurrentPackagingModal && (
                    <Box sx={{ mb: 3, mt: 3 }}>
                      <CurrentPackagingInstructions
                        dataList={exitingPackagingInstructionDetails}
                        packagingVersion={packagingVersionId}
                        packagingVersionType={packagingVersionType}
                        versionId={versionId}
                        purchaseOrderId={purchaseOrderId}
                      />
                    </Box>
                  )}
                </Box>
              )}
              {selectedVericalTabValue === 1 && (
                <Box sx={{ mb: 3, mt: 3 }}>
                  <PurchaseOrderPackagingSummary purchaseOrderId={purchaseOrderId} />
                </Box>
              )}
            </Box>
          </Box>
        </React.Fragment>
      }
    </>
  );
};

export default PurchaseOrderPackagingInstruction;