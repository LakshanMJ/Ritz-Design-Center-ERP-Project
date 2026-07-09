import { Autocomplete, Box, Button, Card, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, FormControlLabel, FormGroup, FormLabel, Grid, IconButton, MenuItem, Modal, Radio, RadioGroup, Select, Table, TableBody, TableCell, TableHead, TableRow, TextareaAutosize, TextField, Typography, useTheme } from "@mui/material";
import { useEffect, useState } from "react";
import api from "@/services/api"
import * as TransportUrls from '@/helpers/constants/rest_urls/TransportUrls';
import toast from "react-hot-toast";
import { getDefaultError } from "@/helpers/Utilities"
import RitzModal from "@/components/Ritz/RitzModal";
import { DEFAULT_SUCCESS } from "@/helpers/constants/Constants";
import RitzTooltip from "@/components/Ritz/RitzTooltip";
import LocalTransportDeliveryChange from "./LocalTransportDeliveryChange";
import LocalTransportConsolidation from "./LocalTransportConsolidation";
import CloseIcon from '@mui/icons-material/Close';
import DefaultLoader from '@/components/DefaultLoader';

interface TransportDeliveryDateTrackingMetaData {
    volume_units: { value: string; label: string }[];
    weight_units: { value: string; label: string }[];
    foreign_ports: { id: number; name: string }[];
    local_ports: { id: number; name: string }[];
    vendor_door_addresses: { value: string; label: string }[];
    types:any;
    delivery_date_tracking_merge_list:[];
    transport_types:[ {id:number | null;
                      volume:{
                        volume:number | null;
                        volume_unit: string | null;
                        volume_unit_display: string | null;
                      }}
    ]
    freight_forwarder_warehouses:any;
    freight_forwarders:any;
    freight_types:any,
    change_reasons:{
        foreign: {
            import:{
                local_port:any,
                foreign_port:any,
                forwarder:any,
                transport_mode:any,
                merge_to_existing_transport:any
            }
        },
        local: {
            import:{
                merge_to_existing_transport:any
            }
        }
    }
}

const LocalTransportChangeInterface = ({
    transportVehicleTrackingId,
    selectedDeliveries,
    selectedDeliveryIds,
    onClose,
    fetchTransportDeliveryDateTrackingListData,
    fetchTransportDeliveryCounts,
}: {
    transportVehicleTrackingId: number,
    selectedDeliveries:any,
    selectedDeliveryIds:any,
    onClose:any,
    fetchTransportDeliveryDateTrackingListData:any,
    fetchTransportDeliveryCounts:any,
}) => {
    const [localTransportTrackingId, setLocalTransportTrackingId] = useState(transportVehicleTrackingId);
    const [errorsDetails, setErrorDetails] = useState<any>({});
    const [isSaving, setIsSaving] = useState(false);
    const theme = useTheme();
    
    const [deliveryChangeData, setDeliveryChangeData] = useState({
        selected_deliveries_to_change: [],
        selected_deliveries_to_change_objects: [],
        checked_deliveries_to_change: [],
        checked_deliveries_to_change_objects: [],
        reason: '',
        remarks: ''
    });
    const [supplierDeliveryDateMergeResponseData,setSupplierDeliveryDateMergeResponseData] = useState<any>([]);
    const [deliveryMergeData, setDeliveryMergeData] = useState({
        containers: [],
        merge_with_local_delivery_tracking: null,
        reason: ''
    });

    const [transportDeliveryDateTrackingMetaData, setTransportDeliveryDateTrackingMetaData] = useState<TransportDeliveryDateTrackingMetaData>();
    const [mergListData, setMergListDataData] = useState([]);
    const [transportDeliveryDateTrackingModalOpen, setTransportDeliveryDateTrackingModalOpen] = useState(false);
    const [localTransportDeliveryChangeModalOpen, setLocalTransportDeliveryChangeModalOpen] = useState(false);
    const [deliveryMovingStatus,setDeliveryMovingStatus] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const fetchTransportDeliveryDateTrackingMetaData = () => {
        Promise.all([
            api.get(TransportUrls.transportDeliveryDateTrackingMetaData()),
            api.get(TransportUrls.portsURL()),
        ])
            .then(([metaDataResp, portDataResp]) => {
                const metaData = metaDataResp?.data;
                const port_data = portDataResp?.data;
    
                setTransportDeliveryDateTrackingMetaData({ ...metaData, port_data});
            })
            .catch((error) => {
                toast.error(getDefaultError(error?.response?.status));
            });
    };


// Detail fetch API call
    const fetchLocalDeliveryTransportTrackingDetail = () => {
        setIsLoading(true); 
        Promise.all([
            api.get(TransportUrls.localDeliveryTransportTrackingDetail(localTransportTrackingId))
        ])
            .then(([transportTrackingDetailResp]) => {
                const deliveryTransportTypes = transportTrackingDetailResp?.data?.delivery_transport_types || [];
                setDeliveryChangeData(prevState => ({
                    ...prevState,
                    selected_deliveries_to_change_objects: [
                        ...prevState.selected_deliveries_to_change_objects,
                        ...deliveryTransportTypes
                    ]
                }));
            })
            .catch((error) => {
                toast.error(getDefaultError(error?.response?.status));
            })
            .finally(() => {
                setIsLoading(false);
            });
    };

    const mergeListDataFetch = () => {
        Promise.all([
            api.get(TransportUrls.localDeliveryTransportTrackingMergeList(localTransportTrackingId))
        ])
            .then(([mergeList]) => {
                const delivery_date_tracking_merge_list = mergeList?.data?.results;
                
                setMergListDataData(delivery_date_tracking_merge_list);
            })
            .catch((error) => {
                toast.error(getDefaultError(error?.response?.status));
            });
    };

    // Delivery moving/merging save api call
    const supplierDeliveryDateMergeSave = () => {
        setIsSaving(true);
        const apiUrl = TransportUrls.mergeContainersUrl(transportVehicleTrackingId);
        const data = deliveryMergeData;

        api.put(apiUrl, data)
            .then(resp => {
            toast.success(DEFAULT_SUCCESS);
            setSupplierDeliveryDateMergeResponseData(resp.data);
            setTransportDeliveryDateTrackingModalOpen(true);
            })
            .catch(error => {
            setErrorDetails({ ...error?.response?.data });
            })
            .finally(() => setIsSaving(false));  
    };

    const handleSelectedDeliveriesCheckboxChange = (id: number, row: any) => {
        setDeliveryChangeData((prevData) => {
            const isAlreadyChecked = prevData.checked_deliveries_to_change.includes(id);
    
            return {
                ...prevData,
                checked_deliveries_to_change: isAlreadyChecked
                    ? prevData.checked_deliveries_to_change.filter((item) => item !== id)
                    : [...prevData.checked_deliveries_to_change, id],
    
                checked_deliveries_to_change_objects: isAlreadyChecked
                    ? prevData.checked_deliveries_to_change_objects.filter((item) => item.id !== id)
                    : [...prevData.checked_deliveries_to_change_objects, row],
            };
        });
    };
    
    const updateDeliveryChangeData = (key:any, value:any) => {
        setDeliveryChangeData(prevState => ({
            ...prevState,
            [key]: value
        }));
    };
    
    const handleMoveDeliveryStatus = (value:any) => {
        setDeliveryMovingStatus(value);
    };

    const handleChangingDelivery = () => {
        setLocalTransportDeliveryChangeModalOpen(true);
    }

    const handleMoveButtonClick = () => {
        supplierDeliveryDateMergeSave();
    };

    const handleClose = () => {
        setTransportDeliveryDateTrackingModalOpen(false)
        onClose();
    }
    
    const handleDeliveryChangeModalClose  = () => {
        setLocalTransportDeliveryChangeModalOpen(false)
        onClose();
    }

    const updateDeliveryMergeData = (key: string, value: any) => {
        setDeliveryMergeData(prevState => ({
            ...prevState,
            [key]: value
        }));
    };

    useEffect(() => {
            fetchLocalDeliveryTransportTrackingDetail()
    }, [localTransportTrackingId]);
    
    useEffect(() => {
        fetchTransportDeliveryDateTrackingMetaData();
        mergeListDataFetch();
    }, []);

    useEffect(() => {
            setDeliveryMergeData(prev => ({
                ...prev,
                containers: deliveryChangeData.checked_deliveries_to_change
            }));
    }, [deliveryChangeData.checked_deliveries_to_change]);

    return (
        <>
            <Typography variant='h5' color='text.primary' sx={{ mt: 2, mb: 2 }}>Select Deliveries to Change : </Typography>
            <Table
                sx={{
                    mb: 2,
                    border: (theme) => `1px solid ${theme.palette.grey[300]}`,
                    overflow: 'hidden',
                }}>
                <TableHead>
                    <TableRow
                        sx={{
                            borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`,
                            background: (theme) => theme.palette.grey[300],
                        }}
                    >
                        <TableCell></TableCell>
                        <TableCell>Number</TableCell>
                        <TableCell>Customers</TableCell>
                        <TableCell>Costing</TableCell>
                        <TableCell>PO Clubs</TableCell>
                        <TableCell>Ex Mill Date</TableCell>
                        <TableCell>Incoterms</TableCell>
                        <TableCell>Materials</TableCell>
                        <TableCell>Suppliers</TableCell>
                        <TableCell>Confirmed Delivery Date</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {isLoading ? (
                        <TableRow>
                            <TableCell colSpan={10}>
                                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 100 }}>
                                    <DefaultLoader />
                                </Box>
                            </TableCell>
                        </TableRow>
                        ) : deliveryChangeData?.selected_deliveries_to_change_objects?.length > 0 ? (
                            deliveryChangeData.selected_deliveries_to_change_objects.map((row: any, index: number) => (
                            <TableRow
                                key={index}
                                sx={{
                                borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`,
                                background: (theme) => (index % 2 === 0 ? theme.palette.grey[250] : theme.palette.white),
                                }}
                                >
                                <TableCell>
                                    <Checkbox
                                        key={row?.id}
                                        style={{ marginRight: 8 }}
                                        checked={deliveryChangeData?.checked_deliveries_to_change.includes(row?.id)}
                                        onChange={(e) => handleSelectedDeliveriesCheckboxChange(row?.id, row)}
                                    />
                                </TableCell>
                                <TableCell>{row?.display_number}</TableCell>
                                <TableCell>{row?.customers?.join(',') || '--'}</TableCell>
                                <TableCell>{row?.costing_version || '--'}</TableCell>
                                <TableCell>{row?.po_clubs?.join(',') || '--'}</TableCell>
                                <TableCell>{row?.last_ex_mill_date || '--'}</TableCell>
                                <TableCell>{row?.incoterms?.join(',') || '--'}</TableCell>
                                <TableCell>
                                    {row?.materials?.length > 0 ? (
                                        row.materials.map((mat: any, matIndex: number) => (
                                        <span key={matIndex} style={{ display: 'inline' }}>
                                            <span>{mat?.attributes?.ritz_customer_brand_reference_code || 'N/A'}</span>
                                            <RitzTooltip
                                            materialHeaders={mat.headers}
                                            materialDetails={mat.attributes}
                                            />
                                            {matIndex < row.materials.length - 1 && ', '}
                                        </span>
                                        ))
                                    ) : (
                                        '--'
                                    )}
                                </TableCell>
                                <TableCell>{row?.suppliers?.join(',') || '--'}</TableCell>
                                <TableCell>{row?.confirmed_delivery_date || '--'}</TableCell>
                            </TableRow>
                        ))
                        ) : (
                        <TableRow>
                            <TableCell colSpan={10} align="center">
                                No data available.  
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
            
            {deliveryChangeData?.checked_deliveries_to_change.length > 0 && (
                <Card
                    sx={{
                        marginRight: 'auto',
                        padding: '20px',
                        border: (theme) => `1px solid ${theme.palette.grey[300]}`,
                        borderRadius: '8px'
                    }}
                    >
                    <Typography variant='h5' color='text.primary' sx={{ mt: 2, mb: 2 }}>Do you want to add the selected deliveries to an existing delivery?</Typography>

                    <RadioGroup
                        aria-labelledby="move_deliveries"
                        name="move_deliveries"
                        value={deliveryMovingStatus}
                        onChange={(event:any) => handleMoveDeliveryStatus(event?.target?.value)}
                    >
                        <FormControlLabel value="yes" control={<Radio />} label="Yes" />
                        <FormControlLabel value="no" control={<Radio />} label="No" />
                    </RadioGroup>
                    
                    {deliveryMovingStatus === 'yes' && (
                        <>
                            <Typography variant='h5' color='text.primary' sx={{ mt: 2, mb: 2 }}>Select existing delivery and reason :</Typography>
                            <Table sx={{ minWidth: 300, maxWidth: 600, margin: 'auto' }} size="small" align="left">
                                <TableHead>
                                    <TableRow sx={{ background: theme.palette.grey[100] }}>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Delivery</TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>Reason</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                        <TableRow>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>
                                            <Autocomplete
                                                disablePortal
                                                id={`delivery`}
                                                size="small"
                                                onChange={(event:any, value:any) =>updateDeliveryMergeData('merge_with_local_delivery_tracking', value?.value)}
                                                options={mergListData?.map((item: any) => ({
                                                    label: item.display_number,
                                                    value: item.id,
                                                  })) || []}
                                                  sx={{ minWidth: "230px", width: "230px" }}
                                                renderInput={(params) => <TextField {...params} label="" />}
                                            />
                                            </TableCell>
                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: 'left' }}>
                                                <Select
                                                    id={`reason`}
                                                    name="reason"
                                                    size="small"
                                                    sx={{ minWidth: "230px", width: "230px" }}
                                                    value={deliveryMergeData?.reason || ""}
                                                    onChange={(event:any) =>updateDeliveryMergeData('reason',event.target.value)}
                                                >
                                                    {transportDeliveryDateTrackingMetaData?.change_reasons?.local?.import?.merge_to_existing_transport.map((item: any) => (
                                                        <MenuItem key={item?.value} value={item?.value}>
                                                            {item?.display_value}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </TableCell>
                                        </TableRow>
                                </TableBody>
                            </Table>
                        </>
                    )}

                    {deliveryMovingStatus === 'no' && (
                        <>
                    <Grid container spacing={2}>
                            <>
                                <Grid item xs={12} sm={6} md={2.9} sx={{ border: "1px solid #ccc",borderRadius: "8px",padding: "14px", width: "500px !important", minWidth: "500px !important",maxWidth: "500px !important",ml:'6px',mt: '20px'}}>
                                    <Typography variant='h5' color='text.primary' sx={{ mt: 2, mb: 2, maxWidth: "300px" }}>Please select the reason to change:</Typography>
                                    <Select
                                        id={'transport_mode'}
                                        name={'transport_mode'}
                                        labelId={'transport_mode'}
                                        size="small"
                                        sx={{ maxWidth: "300px", width: "100%" }}
                                        value={deliveryChangeData?.reason || ''}
                                        onChange={(event: any) => {
                                            updateDeliveryChangeData('reason', event.target.value);
                                        }}
                                        >
                                        {
                                            transportDeliveryDateTrackingMetaData?.change_reasons?.foreign?.import?.transport_mode?.map((reason:any) => (
                                                <MenuItem key={reason?.value} value={reason?.value}>
                                                    {reason?.display_value}
                                                </MenuItem>
                                            ))
                                        }
                                    </Select>

                                    {
                                        deliveryChangeData?.reason && (
                                            <>
                                                <Typography variant='h5' color='text.primary' sx={{ mb: 2, mt:2 }}>Remarks:</Typography>
                                                <TextareaAutosize
                                                    id={`remarks`} 
                                                    name="remarks"
                                                    minRows={3}
                                                    maxRows={6}
                                                    value={deliveryChangeData?.remarks || ''}
                                                    onChange={(event: any) => {
                                                        updateDeliveryChangeData('remarks', event.target.value);
                                                    }}
                                                    style={{
                                                        width: "100%",
                                                        minWidth: "300px",
                                                        maxWidth: "500px",
                                                        minHeight: "100px",
                                                        maxHeight: "100px",
                                                        padding: "10px",
                                                        fontSize: "14px",
                                                        borderRadius: "5px",
                                                        border: "1px solid #ccc",
                                                        resize: "vertical",
                                                    }}
                                                />
                                            </>
                                        ) 
                                    }
                                </Grid>
                            </>
                    </Grid>
                    </>
                    )}
                </Card>
            )}

{/* // Edit modal - move */}

            { transportDeliveryDateTrackingModalOpen && (
                <RitzModal
                    open={transportDeliveryDateTrackingModalOpen}
                    onClose={() => setTransportDeliveryDateTrackingModalOpen(false)}
                    maxWidth= {false}
                    title={"Local Transport Consolidation"}>
                        <LocalTransportConsolidation
                            // selectedDeliveryIds = {deliveryChangeData?.checked_deliveries_to_change}
                            transportVehicleTrackingId={transportVehicleTrackingId}
                            closeModal={handleClose}
                            fetchData={fetchTransportDeliveryDateTrackingListData}
                            fetchTransportDeliveryCounts={fetchTransportDeliveryCounts}
                            supplierDeliveryDateMergeResponseData={supplierDeliveryDateMergeResponseData}
                            mergeWithId={deliveryMergeData?.merge_with_local_delivery_tracking}
                            />
                </RitzModal>
            )}

{/* // Change modal */}

            { localTransportDeliveryChangeModalOpen && (
                    <Dialog
                        open={localTransportDeliveryChangeModalOpen}
                        onClose={() => setLocalTransportDeliveryChangeModalOpen(false)}
                        maxWidth={false}
                        fullWidth
                        PaperProps={{
                            style: {
                            height: '100vh',      
                            width: '100%',
                            overflowX: 'hidden',
                            paddingRight: '30px'
                            },
                        }}>
                        <DialogTitle id='dialog-title' >
                            <Typography component="span" variant={'h4'}>{'Local Transport Delivery Change'}</Typography>
                            <IconButton
                                aria-label='close'
                                onClick={() => setLocalTransportDeliveryChangeModalOpen(false)}
                                sx={{
                                    position: 'absolute',
                                    right: 5,
                                    top: 5,
                                    color: (theme) => theme.palette.grey[500],
                                    background: 'none',
                                    '&:hover, &:focus, &:active': {
                                        color: (theme) => theme.palette.grey[700],
                                        background: 'none'
                                    }
                                }}
                                size='small'
                            >
                                <CloseIcon />
                            </IconButton>
                        </DialogTitle>
                        <Box
                            style={{
                            width: '100%',
                            padding: '16px',
                            overflowX: 'hidden',
                            }}
                        >
                            <LocalTransportDeliveryChange
                                selectedDeliveryIds={deliveryChangeData?.checked_deliveries_to_change}
                                selected_deliveries={deliveryChangeData?.checked_deliveries_to_change_objects}
                                transportVehicleTrackingId={transportVehicleTrackingId}
                                closeModal={handleDeliveryChangeModalClose}
                                fetchData={fetchTransportDeliveryDateTrackingListData}
                                fetchTransportDeliveryCounts={fetchTransportDeliveryCounts}
                                reason={deliveryChangeData?.reason}
                                remarks={deliveryChangeData?.remarks}
                                />
                        </Box>
                    </Dialog>
            )}

            {deliveryMovingStatus === 'yes' && (
                <Button
                variant="contained"
                style={{ marginLeft: 'auto', marginTop: '20px', display: 'block' }}
                onClick={() => handleMoveButtonClick()}
                >
                    Move
                </Button>
            )}

            {deliveryMovingStatus === 'no' && (
                <Button
                variant="contained"
                style={{ marginLeft: 'auto', marginTop: '20px', display: 'block' }}
                onClick={() => handleChangingDelivery()}
                >
                    Next
                </Button>
            )}
        </>
    );
}


export default LocalTransportChangeInterface;