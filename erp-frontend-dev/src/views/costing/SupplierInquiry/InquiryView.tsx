import { useEffect, useState } from "react";
import { Alert, Badge, Box, Grid, Typography } from "@mui/material";
import DefaultLoader from "@/components/DefaultLoader";
import Button from '@mui/material/Button';
import * as supplierUrls from '@/helpers/constants/rest_urls/SupplierUrls';
import api from "@/services/api";
import { toast } from 'react-hot-toast';
import { getDefaultError } from '@/helpers/Utilities';
import InquiryTable from "./InquiryTable";
import SendInquiryModal from "./SendInquiryModal";
import QueuedEmailModal from "./QueuedEmailModal";
import ReplyModal from "./ReplyModal";
import RitzSwitch from "@/components/Ritz/RitzSwitch";
import RitzModal from "@/components/Ritz/RitzModal";
import CostsModal from "./CostsModal";
import CircularLoader from "@/components/CircularLoader";
import { paymentModesListURL } from "@/helpers/constants/rest_urls/FinanceUrls";
import ConsolidateInquiryModal from "./ConsolidateInquiryModal";


const InquiryView = ({ orderId, versionId }: any) => {
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingCircularLoader, setIsLoadingCircularLoader] = useState(false);
    const [materialData, setMaterialData] = useState([]);
    const [supplierReplyData, setSupplierReplyData] = useState([]);
    const [emailCount, setEmailCount] = useState(0);
    const [replyCount, setReplyCount] = useState(0);    // TODO implement when api ready
    const [suppliers, setSuppliers] = useState([]);
    const [consumptionData, setConsumptionData] = useState({});
    const [selected, setSelected] = useState({});
    const [selectCount, setSelectCount] = useState(0);
    const [completeCount, setCompleteCount] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [supplierInquiriesComplete, setSupplierInquiriesComplete] = useState(false);
    const [confirmModalOpen, setConfirmModalOpen] = useState(false);
    const [costPerUnitTypes, setCostPerUnitTypes] = useState<any>([]);
    const [transportTypes, setTransportTypes] = useState<any>([]);
    const [payModeTypes, setPayModeTypes] = useState<any>([]);

    // Modal states
    const [inquiryModalOpen, setInquiryModalOpen] = useState(false);
    const [consolidateInquiryModalOpen, setConsolidateInquiryModalOpen] = useState(false);
    const [replyModalOpen, setReplyModalOpen] = useState(false);
    const [queuedModalOpen, setQueuedModalOpen] = useState(false);
    const [costsModalOpen, setCostsModalOpen] = useState(false);

    const fetchData = () => {
        Promise.all([
            api.get(supplierUrls.getAllMaterialInfoURL(+versionId)),
            api.get(supplierUrls.getSupplierRepliesURL(+versionId)),
            api.get(supplierUrls.getQueuedEmailCountURL(+versionId)),
            api.get(supplierUrls.getActiveSuppliersURL()),
            api.get(supplierUrls.getConsumptionUnits()),
            api.get(supplierUrls.getCostPerUnitTypesURL()),
            api.get(supplierUrls.getTransportTypesURL()),
            api.get(paymentModesListURL())
        ]).then(resp => {
            const respData = resp?.map(r => r.data);
            const [materialData, supplierReplyData, emailCountData, supplierData, consumptionData, costPerUnitTypes, transportTypes, payModes] = respData;

            materialData.forEach((material: any) => {
                const data = material?.data || [];
                data.forEach((d: any) => {
                    setTotalCount(i => i + 1);

                    // associate supplier replies
                    let replies: any[] = [];
                    if (d.service_id) {
                        replies = supplierReplyData.filter((i: any) => i.item_service === d.service_id);
                    } else {
                        replies = supplierReplyData.filter((i: any) => i.customer_brand_material_id === d.customer_brand_material_id);
                    }

                    const subRows = replies.map((i: any) => i.supplier_inquiry_details).flat();
                    subRows.forEach((i: any) => {
                        const suppReply = replies.find((j: any) => j.id === i.supplier_inquiry);
                        i.supplier_name = suppReply?.supplier_name;
                        i.email_status = suppReply?.email_status;
                    });

                    d.subRows = subRows;
                    if (replies.length > 0) {
                        setCompleteCount(i => i + 1);
                    }
                });
            });
            setMaterialData(materialData);
            setEmailCount(emailCountData?.pending_email_count || 0);
            setSuppliers(supplierData || []);
            setConsumptionData(consumptionData || {});
            setSupplierInquiriesComplete(materialData[0].supplier_inquiries_complete)
            setSupplierReplyData(supplierReplyData || []);
            setCostPerUnitTypes([...costPerUnitTypes])
            setTransportTypes([...transportTypes])
            setPayModeTypes([...payModes])
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false);
            setIsLoadingCircularLoader(false)
        });
    }

    const onRowSelect = (selection: any, material: any) => {
        const materialData = material?.data || [];
        const headers = material?.headers || [];
        const selectedIndexes = Object.keys(selection).map((i: any) => +i);
        const selectedData = selectedIndexes.map((i: number) => materialData[i]);

        selectedData.forEach((sd: any) => {
            let description = {} as any;
            headers.forEach((h: any) => {
                description[h.label] = sd[h.name];
            });
            sd._isService = Object.keys(sd).includes('service_id'); //material?.name?.includes('_service');
            sd._description = description;
        });

        const newState = {
            ...selected,
            [material.display_name]: selectedData
        } as any
        setSelected(newState);

        // Flatten ids
        let selectedIds: any[] = [];
        Object.keys(newState).forEach((key: any) => {
            const selected = newState[key];
            const ids = selected.map((i: any) => i.customer_brand_material_id);
            selectedIds.push(ids);
        });
        const count = selectedIds.flat(Infinity).length;
        setSelectCount(count);
    }

    const refreshData = () => {
        setIsLoading(true);

        // Reset
        setSelected({});
        setSelectCount(0);
        setCompleteCount(0);
        setTotalCount(0);
        setEmailCount(0);
        setReplyCount(0);

        // Refetch
        fetchData();
    }

    const updateSupplierInquariesCompleteStatus = () => {
        const SupplierInquaryCompleteStatus = {
            supplier_inquiries_complete : supplierInquiriesComplete
        }
        api.put(supplierUrls.supplierInquaryCompleteStateURL(versionId), SupplierInquaryCompleteStatus).then(() => {
            setConfirmModalOpen(false)
        }).catch(error => {
            toast.error(getDefaultError(error?.response?.status));
        })
    };

    const handleCompletedSwitch = (event: any) => {
        const isChecked = event.target.checked;
        setSupplierInquiriesComplete(isChecked);
        setConfirmModalOpen(true);
    };

    const handleCloseConfirm = () => {
        setConfirmModalOpen(false);
        setSupplierInquiriesComplete(materialData[0].supplier_inquiries_complete)
    }
    const handleSavedData=()=>{
        setIsLoadingCircularLoader(true)
        fetchData()
    }

    useEffect(() => {
        if (orderId) {
            refreshData();
        }
    }, [orderId]);

    return (
        <>
            {isLoadingCircularLoader && (<CircularLoader />)}
            {isLoading ? <DefaultLoader /> : (
                <>
                    {materialData?.length > 0 && (
                        <>
                            {((totalCount > 0 && totalCount !== completeCount) || emailCount > 0) && (
                                <Grid container sx={{ mb: 4 }}>
                                    <Grid item xs={12} lg={8}>
                                        {totalCount > 0 && totalCount !== completeCount && (
                                            <Alert severity='warning' sx={{ mb: emailCount > 0 ? 1 : 0 }}>
                                                Inquiries for <strong>{totalCount - completeCount}</strong> material{(totalCount - completeCount) > 1 && 's'} have not been submitted.
                                            </Alert>
                                        )}
                                        {emailCount > 0 && (
                                            <Alert severity='warning'>
                                                <strong>{emailCount}</strong> email{emailCount > 1 && 's'} {emailCount > 1 ? 'are' : 'is'} queued to be sent.
                                            </Alert>
                                        )}
                                    </Grid>
                                </Grid>
                            )}

                            <Box>
                                <Button variant='contained' disabled={!selectCount} sx={{ mr: 1 }} onClick={() => setInquiryModalOpen(true)}>
                                    Send Inquiry{selectCount > 0 && <span style={{ marginLeft: '.25rem' }}>({selectCount})</span>}
                                </Button>
                                <Button variant='contained' disabled={!selectCount} sx={{ mr: 1 }} onClick={() => setConsolidateInquiryModalOpen(true)}>
                                    Consolidate Inquiry{selectCount > 0 && <span style={{ marginLeft: '.25rem' }}>({selectCount})</span>}
                                </Button>
                                
                                <Badge badgeContent={emailCount} color='error' invisible={!emailCount} sx={{ mr: 3 }}>
                                    <Button variant='contained' disabled={!emailCount} onClick={() => setQueuedModalOpen(true)}>
                                        Queued Email
                                    </Button>
                                </Badge>

                                <Button variant='contained' onClick={() => setReplyModalOpen(true)}>
                                    Reply
                                </Button>

                                <Button variant='contained' disabled={!selectCount} sx={{ ml: 1 }} onClick={() => setCostsModalOpen(true)}>
                                    Enter Costs{selectCount > 0 && <span style={{ marginLeft: '.25rem' }}>({selectCount})</span>}
                                </Button>

                                <Box sx={{marginTop: '-1.5%', float: 'right'}}>
                                    <RitzSwitch name="Mark as complete" handleChangeSwitch={handleCompletedSwitch} status={supplierInquiriesComplete} />
                                </Box>
                            </Box>

                            {materialData.map((material: any, i: number) => (
                                <Box sx={{ mb: 4 }} key={i}>
                                    <InquiryTable data={material} onRowSelect={(e: any) => onRowSelect(e, material)} orderId={orderId} versionId={versionId} consumptionData={consumptionData} costPerUnitTypes={costPerUnitTypes} transportTypes={transportTypes} payModes={payModeTypes} suppliers={suppliers} savedData={handleSavedData} refreshData={refreshData}/>
                                </Box>
                            ))}
                        </>
                    )}

                    {!materialData?.length && (
                        <Alert severity='error' icon={false}>
                            Unable to create supplier inquiries. Please ensure that materials have been assigned.
                        </Alert>
                    )}

                    {inquiryModalOpen && (
                        <SendInquiryModal
                            versionId={versionId}
                            selected={selected}
                            suppliers={suppliers}
                            materialData={materialData} 
                            modalOpen={inquiryModalOpen}
                            setModalOpen={setInquiryModalOpen}
                            refreshData={refreshData}
                        />
                    )}
                    {consolidateInquiryModalOpen && (
                        <ConsolidateInquiryModal
                            versionId={versionId}
                            selected={selected}
                            suppliers={suppliers}
                            materialData={materialData} 
                            modalOpen={consolidateInquiryModalOpen}
                            setModalOpen={setConsolidateInquiryModalOpen}
                            refreshData={refreshData}
                        />
                    )}

                    {costsModalOpen && (
                        <CostsModal
                            orderId={orderId}
                            versionId={versionId}
                            selected={selected}
                            suppliers={suppliers}
                            consumptionData={consumptionData}
                            costPerUnitTypes={costPerUnitTypes}
                            transportTypes={transportTypes}
                            payModes={payModeTypes} 
                            modalOpen={costsModalOpen}
                            setModalOpen={setCostsModalOpen}
                            refreshData={refreshData}
                            savedData={handleSavedData}
                        />
                    )}

                    {replyModalOpen && (
                        <ReplyModal
                            orderId={orderId}
                            versionId={versionId}
                            suppliers={suppliers}
                            consumptionData={consumptionData}
                            modalOpen={replyModalOpen}
                            setModalOpen={setReplyModalOpen}
                            costPerUnitTypes={costPerUnitTypes}
                            transportTypes={transportTypes} 
                            payModes={payModeTypes} 
                            refreshData={refreshData} 
                            savedData={handleSavedData}
                        />
                    )}

                    {queuedModalOpen && (
                        <QueuedEmailModal
                            orderId={orderId}
                            versionId={versionId}
                            emailCount={emailCount}
                            modalOpen={queuedModalOpen} 
                            setModalOpen={setQueuedModalOpen}
                            refreshData={refreshData}
                        />
                    )}
                </>
            )}
            <RitzModal open={confirmModalOpen} onClose={handleCloseConfirm} title='Are you sure?'>
                <Typography>{supplierInquiriesComplete != false ? "Do you want to confirm this supplier order inquiries as completed?" : "Do you want to confirm this supplier order inquiries as not completed?"}</Typography>          
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'end' }}>
                <Button variant="contained"   onClick={() => {updateSupplierInquariesCompleteStatus()}} >Yes</Button>
                <Button variant="contained" color='secondary' onClick={() => {handleCloseConfirm()}} style={{ marginLeft: '10px' }} >No</Button>
                </Box>
            </RitzModal>
        </>
    );
};

export default InquiryView;