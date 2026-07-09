import { Box, Button, Card, Divider, Grid, Typography, Link, IconButton, ToggleButton, ToggleButtonGroup, Checkbox, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import api from "@/services/api";
import toast from "react-hot-toast";
import { getDefaultError } from "@/helpers/Utilities";
import * as TransportUrls from '@/helpers/constants/rest_urls/TransportUrls';
import * as FinanceUrls from '@/helpers/constants/rest_urls/FinanceUrls';
import { commercialinvoicesURL, getchargersURL, getContanierwithchargersURL } from '@/helpers/constants/rest_urls/TransportUrls';
import { RitzTabPanel, RitzTabs } from "@/components/Ritz/RitzTabs";
import TabContext from "@mui/lab/TabContext";
import DefaultLoader from "@/components/DefaultLoader";
import { useRouter } from "next/router";
import RitzTable from "@/components/Ritz/RitzTable";
import { ColumnDef } from '@tanstack/react-table';
import NextLink from 'next/link';
import { commercialInvoiceSummaryPageURL } from '@/helpers/constants/front_end/FinanceUrls';
import TransportDeliveryDateTracking from "./TransportDeliveryDateTracking";
import RitzModal from "@/components/Ritz/RitzModal";
import RitzInput from "@/components/Ritz/RitzInput";
import DeleteIcon from '@mui/icons-material/Delete';
import CopyChargers from "@/views/transport/CopyChargers";
import RitzSelection from '@/components/Ritz/RitzSelection';


const TransportDeliveryTrackingDetails = ({ transportTrackingId }: any) => {
  const [errorsDetails, setErrorDetails] = useState<any>({});
  const [transportDeliveryDateTrackingDetails, setTransportDeliveryDateTrackingDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stateButtonData, setStateButtonData] = useState<any>({});
  const [invoiceData, setInvoiceData] = useState<any[]>([]);
  const [chargesData, setChargesData] = useState<any[]>([]);
  const [isInvoiceLoading, setIsInvoiceLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditChargesModalOpen, setIsEditChargesModalOpen] = useState(false);
  const [isCopyChargesModalOpen, setIsCopyChargesModalOpen] = useState(false);
  const [editableChargesData, setEditableChargesData] = useState<any[]>([]);
  const [transportTypes, setTransportTypes] = useState<any[]>([]);
  const [selectedToggle, setSelectedToggle] = useState('combine');
  const [selectedCharges, setSelectedCharges] = useState<any[]>([]);
  const [selectAll, setSelectAll] = useState(true);
  const [selectedChargesDataForCopy, setSelectedChargesDataForCopy] = useState<any[]>([]);
  const [deletedChargesIds, setDeletedChargesIds] = useState<any[]>([]);
  const [currencyList, setCurrencyList] = useState<any[]>([]);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [chargeToDelete, setChargeToDelete] = useState<{ charge: any, index: number } | null>(null);
  const [focusCellId, setFocusCellId] = useState(null);
  
  const tabDisplayOrderKey = 'tabDisplayOrder';
  const tabLabel = 'tabLabel';
  const summaryTabKey = 'summary';
  const detailsTabKey = 'details';

  const transportTrackingTabs = {
    [summaryTabKey]: { [tabDisplayOrderKey]: '1', [tabLabel]: 'Charges' },
    [detailsTabKey]: { [tabDisplayOrderKey]: '2', [tabLabel]: 'Commercial invoices' },
  };

  const initialTabs = [
    transportTrackingTabs[summaryTabKey][tabLabel],
    transportTrackingTabs[detailsTabKey][tabLabel],
  ];

  const [activeTab, setActiveTab] = useState('1');
  const [summaryTabs, setSummaryTabs] = useState([...initialTabs]);

  const router = useRouter();

  const fetchTransportData = () => {
    setIsLoading(true);
    setIsInvoiceLoading(true);
    Promise.all([
      api.get(TransportUrls.transportDeliveryDateTrackingDetail(transportTrackingId)),
      api.get(commercialinvoicesURL(transportTrackingId)),
      api.get(getchargersURL(transportTrackingId)),
      api.get(TransportUrls.getDeliveryTransportTypeListURL(transportTrackingId)),
      api.get(FinanceUrls.paymentCurrencyListURL()) 
    ]).then(([transportResponse, invoiceResponse, chargesResponse, transportMetaResponse, currencyResponse]) => {
      setTransportDeliveryDateTrackingDetails(transportResponse.data);
      handleStateButtonData(transportResponse?.data?.state);
      setInvoiceData(invoiceResponse.data);
      setChargesData(chargesResponse.data);
      setTransportTypes(transportMetaResponse.data);
      setCurrencyList(currencyResponse.data); 
      const allChargeIds = chargesResponse.data.map((charge: any, index: number) => index);
      setSelectedCharges(allChargeIds);
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => {
      setIsLoading(false);
      setIsInvoiceLoading(false);
    });
  };
  

  const handleStateButtonData = (currentState: any) => {
    let buttonLabel = '';
    let nextState = '';

    if (currentState === 'draft') {
      buttonLabel = 'Initiate Transport';
      nextState = 'initiated';
    } else if (currentState === 'initiated') {
      buttonLabel = 'Transport Initiated';
      nextState = 'in_progress';
    } else if (currentState === 'in_progress') {
      buttonLabel = 'Transport in Progress';
      nextState = 'completed';
    } else if (currentState === 'completed') {
      buttonLabel = 'Complete Transport';
      nextState = 'completed';
    }

    setStateButtonData({ buttonLabel, nextState });
  };

  const changeTransportState = () => {
    api.get(TransportUrls.changeTransportStateURL(transportTrackingId, stateButtonData.nextState))
      .then(() => {
        toast.success(`Transport ${stateButtonData.buttonLabel}`);
        fetchTransportData();
      })
      .catch((error) => {
        toast.error(getDefaultError(error?.response?.status));
      });
  };

  const handleSaveCharges = () => {
    setIsLoading(true);
    const selectedDataToSave = editableChargesData.filter((_, index) => selectedCharges.includes(index));
  
    const dataToSave = {
      charges: selectedDataToSave.map((charge: any) => ({
        id: charge.id || null,
        charge_name: charge.charge_name,
        amount: charge.amount,
        amount_currency: charge.amount_currency,
      })),
      deleted_charge_ids: deletedChargesIds
    };
  
    const chargeType = selectedToggle === 'combine' ? 'combined_charge' : 'transport_type_charge';
    const transportTypeId = selectedToggle === 'combine' ? '' : selectedToggle;
  
    api.post(TransportUrls.saveChargesURL(transportTrackingId, chargeType, transportTypeId), dataToSave)
      .then(() => {
        toast.success('Charges saved successfully');
        fetchTransportData();
        setIsEditChargesModalOpen(false);
      })
      .catch((error) => {
        toast.error(getDefaultError(error?.response?.status));
      })
      .finally(() => {
        setIsLoading(false);
      });
  };
  
  const handleDeleteCharge = (charge: any, index: number) => {
    setChargeToDelete({ charge, index });
    setOpenDeleteDialog(true);
  };

  const confirmDeleteCharge = () => {
    if (chargeToDelete) {
      const { charge, index } = chargeToDelete;
      if (charge.id === null) {
        const updatedCharges = [...editableChargesData];
        updatedCharges.splice(index, 1);
        setEditableChargesData(updatedCharges);
      } else {
        setDeletedChargesIds((prevDeletedIds) => [...prevDeletedIds, charge.id]);
        const updatedCharges = [...editableChargesData];
        updatedCharges.splice(index, 1);
        setEditableChargesData(updatedCharges);
      }
      setOpenDeleteDialog(false);
      setChargeToDelete(null);
    }
  };

  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => setIsModalOpen(false);

  const handleEditCharges = () => {
    setSelectedToggle('combine');
    fetchChargesByTransportType('combined_charge');
    setIsEditChargesModalOpen(true);
  };

  const handleEdit = (value: any, index: any, field: any) =>{
    const tempData = [...editableChargesData];
    tempData[index][field] = value;
    setEditableChargesData(tempData);
  }

  const handleCopyCharges = () => {
    const selectedChargesData = getSelectedCharges();
    setIsCopyChargesModalOpen(true);
    setIsEditChargesModalOpen(false);
    setSelectedChargesDataForCopy(selectedChargesData);
  };

  const handlePrevious = () => {
    setIsCopyChargesModalOpen(false);
    setIsEditChargesModalOpen(true);
  };

  const handleSelectCharge = (index: number) => {
    const newSelectedCharges = [...selectedCharges];
    if (newSelectedCharges.includes(index)) {
      newSelectedCharges.splice(newSelectedCharges.indexOf(index), 1);
    } else {
      newSelectedCharges.push(index);
    }
    setSelectedCharges(newSelectedCharges);
  }

  const handleSelectAllCheckboxChange = () => {
    if (selectAll) {
        setSelectedCharges([]);
    } else {
        const allChargeIds = chargesData.map((charge: any, index: number) => index);
        setSelectedCharges(allChargeIds);
    }
    setSelectAll(!selectAll);
  };

  const handleChangeTabs = (event: string) => {
    const url = {
      pathname: router.pathname,
      query: { ...router.query, tab: event }
    };
    router.replace(url, undefined, { shallow: true });
  };

  const handleAddCharge = () => {
    setEditableChargesData([...editableChargesData, { id: null, charge_name: "", amount: "" }]);
  };

  const handleToggleChange = (event: any, newToggle: string) => {
    if (newToggle !== null) {
      setSelectedToggle(newToggle);
      setIsLoading(true);
      if (newToggle === 'combine') {
        fetchChargesByTransportType('combined_charge', newToggle);
      } else {
        fetchChargesByTransportType('transport_type_charge', newToggle);
      }
    }
  };

  const fetchChargesByTransportType = (chargeType: string, transportTypeId: string = '') => {
    setIsLoading(true);
    api.get(getContanierwithchargersURL(transportTrackingId, chargeType, transportTypeId))
      .then((response) => {
        setEditableChargesData(response.data);
      })
      .catch((error) => {
        toast.error(getDefaultError(error?.response?.status));
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const getSelectedCharges = () => {
    return editableChargesData.filter((charge, index) => selectedCharges.includes(index));
  };

  const handleOnFocusCell = (cellId: any) => {
    setFocusCellId(cellId);
  };

  const commercialinvoicecolumns: ColumnDef<any>[] = [
    {
      accessorKey: 'display_number',
      header: 'Ritz Invoice No',
      cell: props => (
        <Link component={NextLink} href={commercialInvoiceSummaryPageURL(props.row.original.id)}>{props.row.original.display_number}</Link>
      )
    },
    {
      accessorKey: 'supplier_invoice_number',
      header: 'Supplier Invoice No',
      cell: props => (
        <>
          {props?.row.original.supplier_invoice_number}
        </>
      )
    },
    {
      accessorKey: 'ci_state',
      header: 'State',
    },
  ];

  const chargesColumns: ColumnDef<any>[] = [
    {
      accessorKey: 'charge_name',
      header: 'Charge Name',
    },
    {
      accessorKey: 'amount',
      header: 'Amount (USD)',
    },
    {
      accessorKey: 'amount_currency',
      header: 'Amount Currency',
    }
  ];


  const EditablechargesColumns: ColumnDef<any>[] = [
    {
      id: 'select',
      header: () => (
        selectedToggle !== 'combine' && (
          <Checkbox
            checked={selectAll}
            onChange={handleSelectAllCheckboxChange}
          />
        )
      ),
      cell: ({ row }) => (
        selectedToggle !== 'combine' && (
          <Checkbox
            checked={selectedCharges.includes(row.index)}
            onChange={() => handleSelectCharge(row.index)}
          />
        )
      ),
    },
    {
      accessorKey: 'charge_name',
      header: 'Charge Name',
      cell: ({ row }) => (
        <RitzInput
          name="charge_name"
          selectedValue={row.original.charge_name}
          handleOnChange={(e: any) => {handleEdit(e.target.value, row.index, 'charge_name')}}
          handleOnFocus={() => handleOnFocusCell(`charge_name_${row.index}`)}
          handleAutoFocus={focusCellId === `charge_name_${row.index}`}
        />
      ),
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => (
        <RitzInput
          name="amount"
          selectedValue={row.original.amount}
          inputType="number"
          handleOnChange={(e: any) => {handleEdit(e.target.value, row.index, 'amount')}}
          handleOnFocus={() => handleOnFocusCell(`amount_${row.index}`)}
          handleAutoFocus={focusCellId === `amount_${row.index}`}
        />
      ),
    },
    {
      accessorKey: 'amount_currency',
      header: 'Amount Currency',
      cell: ({ row }) => (
        <RitzSelection
          id={'amount_currency'}
          name={'amount_currency'}
          optionValue={'id'}
          optionText={'name'}
          selectedValue={row.original.amount_currency}
          isRequired={true}
          options={currencyList}
          handleOnChange={(e: any) => {handleEdit(e.target.value, row.index, 'amount_currency')}}
          handleOnFocus={() => handleOnFocusCell(`amount_currency_${row.index}`)}
          handleAutoFocus={focusCellId === `amount_currency_${row.index}`}
        />
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <IconButton 
          color="error" 
          onClick={() => handleDeleteCharge(row.original, row.index)}
        >
          <DeleteIcon />
        </IconButton>
      ),
    },
  ];

  useEffect(() => {
    const { tab } = router.query;
    if (tab) {
      setActiveTab(tab.toString());
    }
  }, [router]);

  useEffect(() => {
    if (transportTrackingId) {
      fetchTransportData();
    }
  }, [transportTrackingId]);
  
  return (
    <Box sx={{ width: '100%', padding: '10px', borderRadius: '8px', marginLeft: '0px' }}>

        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mt: 2, mb: 2 }}>
            <Button variant="contained" color="primary" onClick={changeTransportState}>
              {stateButtonData.buttonLabel}
            </Button>
            <Button variant="outlined" color="secondary" onClick={handleOpenModal}>
              Edit
            </Button>
          </Box>

          <RitzModal
            open={isModalOpen}
            onClose={handleCloseModal}
            title="Edit Transport Details"
            maxWidth='lg'
          >

            
            <TransportDeliveryDateTracking
              transportTrackingId={transportTrackingId}
              selected_deliveries={[]}
              closeModal={handleCloseModal}
              clearSelectedDeliveries={() => { }}
              fetchData={fetchTransportData}
              deleteSelectedDeliveries={[]}
            />
          </RitzModal>

          <Card variant='outlined' sx={{ mb: 4, p: 3 }}>
            <Box sx={{ mb: 4, mt: 4 }}>
              <Grid container columnSpacing={4}>
                <Grid item sm={3} xs={4}>
                  <dl>
                    <dt>Vendor Door Address</dt>
                    <dd>
                      <Typography>{transportDeliveryDateTrackingDetails?.vendor_door_address?.display_address || '--'}</Typography>
                    </dd>
                  </dl>
                </Grid>
                <Divider orientation='vertical' variant='middle' flexItem />
                <Grid item sm={3} xs={4}>
                  <dl>
                    <dt>Foreign Port</dt>
                    <dd>
                      <Typography>{transportDeliveryDateTrackingDetails?.foreign_port_details?.port_display_value || '--'}</Typography>
                    </dd>
                  </dl>
                </Grid>
                <Divider orientation='vertical' variant='middle' flexItem />
                <Grid item sm={3} xs={4}>
                  <dl>
                    <dt>Local Port</dt>
                    <dd>
                      <Typography>{transportDeliveryDateTrackingDetails?.local_port_details?.port_display_value || '--'}</Typography>
                    </dd>
                  </dl>
                </Grid>
                <Divider orientation='vertical' variant='middle' flexItem />
                <Grid item sm={2.5} xs={3}>
                  <dl>
                    <dt>Final Location</dt>
                    <dd>
                      <Typography>{transportDeliveryDateTrackingDetails?.final_location?.display_address || '--'}</Typography>
                    </dd>
                  </dl>
                </Grid>
                <Grid item sm={3} xs={4}>
                  <dl>
                    <dt>Foreign Port Expected Date</dt>
                    <dd>
                      <Typography>{transportDeliveryDateTrackingDetails?.foreign_port_expected_date ? dayjs(transportDeliveryDateTrackingDetails?.foreign_port_expected_date).format('DD/MM/YYYY') : '--'}</Typography>
                    </dd>
                  </dl>
                </Grid>
                <Divider orientation='vertical' variant='middle' flexItem />
                <Grid item sm={3} xs={4}>
                  <dl>
                    <dt>Local Port Expected Date</dt>
                    <dd>
                      <Typography>{transportDeliveryDateTrackingDetails?.local_port_expected_date ? dayjs(transportDeliveryDateTrackingDetails?.local_port_expected_date).format('DD/MM/YYYY') : '--'}</Typography>
                    </dd>
                  </dl>
                </Grid>
                <Divider orientation='vertical' variant='middle' flexItem />
                <Grid item sm={3} xs={4}>
                  <dl>
                    <dt>Expected Delivery Date</dt>
                    <dd>
                      <Typography>{transportDeliveryDateTrackingDetails?.expected_delivery_date ? dayjs(transportDeliveryDateTrackingDetails?.expected_delivery_date).format('DD/MM/YYYY') : '--'}</Typography>
                    </dd>
                  </dl>
                </Grid>
                <Divider orientation='vertical' variant='middle' flexItem />
                <Grid item sm={2.5} xs={3}>
                  <dl>
                    <dt>Actual Foreign Port Date</dt>
                    <dd>
                      <Typography>{transportDeliveryDateTrackingDetails?.actual_foreign_port_date ? dayjs(transportDeliveryDateTrackingDetails?.actual_foreign_port_date).format('DD/MM/YYYY') : 'N/A'}</Typography>
                    </dd>
                  </dl>
                </Grid>
                <Grid item sm={3} xs={4}>
                  <dl>
                    <dt>Actual Local Port Date</dt>
                    <dd>
                      <Typography>{transportDeliveryDateTrackingDetails?.actual_local_port_date ? dayjs(transportDeliveryDateTrackingDetails?.actual_local_port_date).format('DD/MM/YYYY') : 'N/A'}</Typography>
                    </dd>
                  </dl>
                </Grid>
                <Divider orientation='vertical' variant='middle' flexItem />
                <Grid item sm={3} xs={4}>
                  <dl>
                    <dt>Actual Expected Delivery Date</dt>
                    <dd>
                      <Typography>{transportDeliveryDateTrackingDetails?.actual_expected_delivery_date ? dayjs(transportDeliveryDateTrackingDetails?.actual_expected_delivery_date).format('DD/MM/YYYY') : 'N/A'}</Typography>
                    </dd>
                  </dl>
                </Grid>
              </Grid>
            </Box>
          </Card>



          <Dialog
            open={openDeleteDialog}
            onClose={() => setOpenDeleteDialog(false)}
          >
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogContent>
              <DialogContentText>
                Are you sure you want to delete this charge?
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenDeleteDialog(false)} color="primary">
                Cancel
              </Button>
              <Button onClick={confirmDeleteCharge} color="error">
                Delete
              </Button>
            </DialogActions>
          </Dialog>

          <TabContext value={activeTab}>
            <Box sx={{ marginTop: '20px' }}>
              <RitzTabs
                tabs={summaryTabs}
                activeTab={activeTab}
                emitChange={(tab: any) => handleChangeTabs(tab)}
              />
              <RitzTabPanel value={`${transportTrackingTabs[summaryTabKey][tabDisplayOrderKey]}`}>
                
              <Box sx={{ display: 'flex', justifyContent: 'flex-start', gap: 2, mt: 2 }}>
                <Button variant="outlined" color="primary" onClick={handleEditCharges}>
                  Edit Charges
                </Button>
              </Box>

              <RitzModal
                  open={isEditChargesModalOpen}
                  onClose={() => setIsEditChargesModalOpen(false)}
                  title="Edit Charge"
                  maxWidth="lg"
                >

                  <ToggleButtonGroup
                    value={selectedToggle}
                    exclusive
                    onChange={handleToggleChange}
                    aria-label="Transport Type"
                  >
                    <ToggleButton 
                        value="combine" 
                        style={{ 
                          height: '4em',
                          minWidth: '150px',
                          border: '1px solid #E0E0E0',
                          borderRadius: '5px',
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          textAlign: 'center',
                          marginBottom: '10px',
                          marginRight: '10px',
                        }}
                          aria-label="Combine Charges">
                      Combine Charges
                    </ToggleButton>
                    {transportTypes.map((type: any) => (
                      <ToggleButton
                        key={type.id}
                        value={type.id}
                        aria-label={type.name}
                        style={{
                          height: '4em',
                          minWidth: '150px',
                          border: '1px solid #E0E0E0',
                          borderRadius: '5px',
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          textAlign: 'center',
                          marginBottom: '10px',
                          marginRight: '10px',
                        }}
                      >
                        {type.name}
                      </ToggleButton>
                    ))}

                  </ToggleButtonGroup>

                  <Box sx={{ mt: 3, mb: 2 }}>
                    <Button variant="contained" color="primary" onClick={handleAddCharge}>
                      Add Charges
                    </Button>
                    {isLoading ? (
                        <DefaultLoader />
                      ) : (
                        <RitzTable columns={EditablechargesColumns} data={editableChargesData} />
                      )}
                  </Box>

                  <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <Button variant="contained" color="primary" onClick={handleSaveCharges} sx={{ mt: 2 }}>
                      Save
                    </Button>
                    {selectedToggle !== 'combine' && (
                      <Button variant="contained" color="primary" onClick={handleCopyCharges} sx={{ mt: 2 }}>
                        Copy Charges
                      </Button>
                    )}
                  </Box>
                </RitzModal>

                <RitzModal
                  open={isCopyChargesModalOpen}
                  onClose={() => setIsCopyChargesModalOpen(false)}
                  title="Copy Charges"
                  maxWidth="sm"
                >
                  <CopyChargers 
                    SelectedChargeId={selectedToggle} 
                    TransportTrackingId={transportTrackingId} 
                    SelectedChargesData={selectedChargesDataForCopy?.map((charge: any) => charge.id)} 
                    onPrevious={handlePrevious}
                  />
                </RitzModal>

                  <RitzTable
                    columns={chargesColumns}
                    data={chargesData}
                  />
              </RitzTabPanel>
              <RitzTabPanel value={`${transportTrackingTabs[detailsTabKey][tabDisplayOrderKey]}`}>
                  <RitzTable
                    columns={commercialinvoicecolumns}
                    data={invoiceData}
                  />
              </RitzTabPanel>
            </Box>
          </TabContext>
        </>
    </Box>
  );
};

export default TransportDeliveryTrackingDetails;