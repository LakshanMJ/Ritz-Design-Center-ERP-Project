import DefaultLoader from "@/components/DefaultLoader";
import { getDefaultError } from "@/helpers/Utilities";
import api from "@/services/api";
import { Alert, Box, Button, Divider, Grid, InputLabel, Link, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/router";
import { TabContext } from "@mui/lab";
import { RitzTabPanel, RitzTabs } from "@/components/Ritz/RitzTabs";
import TransferBOMDetails from "./TransferBOMDetails";
import { materialTransferDetailsURL, materialTransferStateChangeURL, materialTransferStateListURL } from "@/helpers/constants/rest_urls/MaterialTransferUrls";
import TransferGRNDetails from "./TransferGRNDetails";
import TransferInspectionDetails from "./TransferInspectionDetails";
import { DEFAULT_SUCCESS } from "@/helpers/constants/Constants";
import SaveSpinner from "@/components/SaveSpinner";
import { leftoverVerificationDetailPageUrl } from "@/helpers/constants/front_end/LeftoverUrls";
import EditTransferDetails from "./EditTransferDetails";
import { purchaseOrderClubDetailsPageURL } from "@/helpers/constants/front_end/POUrls";
import NextLink from 'next/link';
import RitzModal from "@/components/Ritz/RitzModal";
import { CANCELED_TRANSFER_STATE, COMPLETE_TRANSFER_STATE, DRAFT_TRANSFER_STATE, TRANSFER_IN_PROGRESS_STATE } from "@/helpers/constants/PurchaseOrderStates";
import RitzTable from "@/components/Ritz/RitzTable";
import { ColumnDef } from "@tanstack/react-table";
import RitzSelection from "@/components/Ritz/RitzSelection";

const MaterialTransferDetails = ({ tranferId }: any) => {
  const router = useRouter();
  const tabDisplayOrderKey = 'tabDisplayOrder';
  const tabLabel = 'tabLabel';
  const summaryTabKey = 'summaryTab';
  const bomTabKey = 'bomTab';
  const grnReportTabKey = 'grnReportTab';
  const inspenctionReportTabKey = 'inspenctionReportTab';
  const transferDetailsTabKey = 'transferDetailsTab';

  const materialTransferTabs = {
    [summaryTabKey]: { [tabDisplayOrderKey]: '1', [tabLabel]: 'Transfer Summary' },
    [bomTabKey]: { [tabDisplayOrderKey]: '2', [tabLabel]: 'BOM' },
    [grnReportTabKey]: { [tabDisplayOrderKey]: '3', [tabLabel]: 'GRN Report' },
    [inspenctionReportTabKey]: { [tabDisplayOrderKey]: '4', [tabLabel]: 'Inspection Report' },
    [transferDetailsTabKey]: { [tabDisplayOrderKey]: '5', [tabLabel]: 'Transfer Details' },
  };

  const initialTabs = [
    materialTransferTabs[summaryTabKey][tabLabel],
    materialTransferTabs[bomTabKey][tabLabel],
    materialTransferTabs[grnReportTabKey][tabLabel],
    materialTransferTabs[inspenctionReportTabKey][tabLabel],
    materialTransferTabs[transferDetailsTabKey][tabLabel],
  ]
  const [isLoading, setIsLoading] = useState(true);
  const [isChangeState, setIsChangeState] = useState<any>(false)
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('1');
  const [summaryTabs, setSummaryTabs] = useState([...initialTabs]);
  const [transferDetails, setTransferDetails] = useState<any>({});
  const [transferStates, setTransferStates] = useState<any>([]);
  const [isShowVerificationModal, setIsShowVerificationModal] = useState(false);
  const [errors, setErrors] = useState<any>({});

  const verificationColumns: ColumnDef<any>[] = [
    {
      accessorKey: 'name',
      header: 'Verification No',
      cell: props => (
        <Link component={NextLink} href={leftoverVerificationDetailPageUrl(props.row.original.id)}>{props.row.original.display_number}</Link>
      )
    },
    {
      accessorKey: 'plant',
      header: 'Plant',
      cell: (props) => {

      }
    },
    {
      accessorKey: 'warehouse',
      header: 'Warehouse',
    },
    {
      accessorKey: 'state_display',
      header: 'Status',
    },
  ]

  const fetchData = () => {
    setErrors({})
    api.get(materialTransferDetailsURL(tranferId)).then((resp: any) => {
      setTransferDetails({ ...resp?.data });
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    }).finally(() => {
      setIsLoading(false);
    });
  };

  const materialTransferStates = () => {
    api.get(materialTransferStateListURL()).then((resp: any) => {
      setTransferStates([...resp?.data ]);
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
    })
  };

  const handleChangeTabs = (event: string) => {
    const url = {
      pathname: router.pathname,
      query: { ...router.query, tab: event }
    }
    router.replace(url, undefined, { shallow: true });
  }

  const handleShowEditInformationModal = () => {
    setIsShowVerificationModal(true);
  }

  const handleChangeState = (state: any) => {
    setIsChangeState(true)
    const request = {
      method: 'post',
      url: materialTransferStateChangeURL(tranferId),
      data: {
        new_state: state || null,
      }
    }
    api(request).then(() => {
      toast.success(DEFAULT_SUCCESS);
      setIsShowVerificationModal(false)
      fetchData()
    }).catch(error => {
      toast.error(getDefaultError(error?.response?.status));
      setErrors({ ...error?.response?.data });
    }).finally(() => {
      setIsChangeState(false)
    });
  }

  useEffect(() => {
    const { tab } = router.query;
    if (tab) {
      setActiveTab(tab.toString());
    }
  }, [router]);

  useEffect(() => {
    if (tranferId) {
      fetchData();
      materialTransferStates();
    }
  }, [tranferId])

  return (
    <>
      {isShowVerificationModal && (
        <RitzModal
          open={isShowVerificationModal}
          onClose={() => setIsShowVerificationModal(false)}
          title="Edit Information"
          maxWidth="md"
        >
          <Box sx={{ mb: 3 }}>
            <InputLabel sx={{ mb: 1 }} >State</InputLabel>
            <RitzSelection
              id={'new_state'}
              name={'new_state'}
              optionValue={'id'}
              optionText={'name'}
              selectedValue={transferDetails?.new_state || transferDetails?.state }
              isRequired={true}
              options={transferStates}
              handleOnChange={(event: any)=>{
                setTransferDetails({ ...transferDetails, new_state: event.target.value });
              }}
            />
          </Box>
          <Box style={{ display: 'flex', justifyContent: 'end' }}>
            <Button variant="contained" color="primary" onClick={() => { handleChangeState(transferDetails?.new_state) }} disabled={isSaving}>
              {isSaving && <SaveSpinner />}Update
            </Button>
          </Box> 
        </RitzModal>
      )}

      {isLoading ? (
        <DefaultLoader />
      ) : (
        <>
          <Box>
            {transferDetails?.state !== DRAFT_TRANSFER_STATE && (
              <Button variant='outlined' disabled={isChangeState} onClick={() => { handleShowEditInformationModal() }} sx={{ mr: 1.5, mb: 1 }}>Edit Information</Button>
            )}
            {transferDetails?.state === DRAFT_TRANSFER_STATE && (
              <Button variant='outlined' disabled={isChangeState} onClick={() => { handleChangeState(TRANSFER_IN_PROGRESS_STATE) }} sx={{ mr: 1.5, mb: 1 }}>
                {isChangeState && <SaveSpinner />}Start Process
              </Button>
            )}
            {transferDetails?.state === TRANSFER_IN_PROGRESS_STATE && (
              <Button variant='outlined' disabled={isChangeState} onClick={() => { handleChangeState(COMPLETE_TRANSFER_STATE) }} sx={{ mr: 1.5, mb: 1 }}>
                {isChangeState && <SaveSpinner />}Complete Transfer
              </Button>
            )}
            {transferDetails?.state === COMPLETE_TRANSFER_STATE && (
              <Button variant='outlined' disabled={isChangeState} onClick={() => { handleChangeState(CANCELED_TRANSFER_STATE) }} sx={{ mr: 1.5, mb: 1 }}>
                {isChangeState && <SaveSpinner />}Canceled Transfer
              </Button>
            )}
          </Box>
            {errors?.errors?.length > 0 && (
              <Box sx={{ mb: 1 }}>
                <Alert severity="error">{errors?.errors?.[0]}</Alert>
              </Box>
            )}
          <TabContext value={activeTab}>
            <RitzTabs
              tabs={summaryTabs}
              activeTab={activeTab}
              emitChange={handleChangeTabs}
            />
            <RitzTabPanel value={`${materialTransferTabs[summaryTabKey][tabDisplayOrderKey]}`}>
              {!transferDetails?.inhouse_material_transfer_state && (
                <Box>
                  <Alert severity="info" sx={{ mb: 3 }}>To continue, please click <strong>Start Process</strong>. This will begin the transfer of materials to the selected location.</Alert>
                </Box>
              )}
              <Box>
                <Box sx={{ mb: 3, mt: 3 }}>
                  <Grid container columnSpacing={2} >
                    <Grid item sm={2.5} xs={3}>
                      <dl>
                        <dt>Material Allocation No</dt>
                        <dd>
                          <Typography>{transferDetails?.display_number}</Typography>
                        </dd>
                      </dl>
                    </Grid>
                    <Divider orientation='vertical' variant='middle' flexItem />
                    <Grid item sm={2.5} xs={3}>
                      <dl>
                        <dt>Transfer Warehouse</dt>
                        <dd>
                          <Typography>{transferDetails?.warehouse_name}</Typography>
                        </dd>
                      </dl>
                    </Grid>
                    <Divider orientation='vertical' variant='middle' flexItem />
                    <Grid item sm={2.5} xs={3}>
                      <dl>
                        <dt>Allocation Status</dt>
                        <dd>
                          <Typography>{transferDetails?.state_display}</Typography>
                        </dd>
                      </dl>
                    </Grid>
                    <Divider orientation='vertical' variant='middle' flexItem />
                    <Grid item sm={2.5} xs={3}>
                      <dl>
                        <dt>PO Club</dt>
                        <dd>
                          <Typography><Link component={NextLink} href={purchaseOrderClubDetailsPageURL(transferDetails?.po_club_id)}>{transferDetails?.po_club_display_number}</Link></Typography>
                        </dd>
                      </dl>
                    </Grid>
                    <Divider orientation='vertical' variant='middle' flexItem />
                    <Grid item sm={2.5} xs={3}>
                      <dl>
                        <dt>Transfer Type</dt>
                        <dd>
                          <Typography>{transferDetails?.transfer_type}</Typography>
                        </dd>
                      </dl>
                    </Grid>
                  </Grid>
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ marginBottom: '5px' }}>Created Verifications</Typography>
                  <RitzTable
                      columns={verificationColumns}
                      data={transferDetails?.leftover_verifications}
                  />
                </Box>
              </Box>
            </RitzTabPanel>
            <RitzTabPanel value={`${materialTransferTabs[bomTabKey][tabDisplayOrderKey]}`}>
              <Box>
                <TransferBOMDetails dataSet={transferDetails?.boms} />
              </Box>
            </RitzTabPanel>
            <RitzTabPanel value={`${materialTransferTabs[grnReportTabKey][tabDisplayOrderKey]}`}>
              <Box>
                <TransferGRNDetails dataSet={transferDetails?.grn_details} />
              </Box>
            </RitzTabPanel>
            <RitzTabPanel value={`${materialTransferTabs[inspenctionReportTabKey][tabDisplayOrderKey]}`}>
              <Box>
                <TransferInspectionDetails qualityData={transferDetails?.inspection_details} />
              </Box>
            </RitzTabPanel>
            <RitzTabPanel value={`${materialTransferTabs[transferDetailsTabKey][tabDisplayOrderKey]}`}>
              <Box>
                <EditTransferDetails transferId={tranferId} />
              </Box>
            </RitzTabPanel>
          </TabContext>
        </>
      )}

    </>
  );
}


export default MaterialTransferDetails;