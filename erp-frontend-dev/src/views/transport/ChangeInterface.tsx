import { Autocomplete, Box, Button, Card, Checkbox, FormControl, FormControlLabel, FormGroup, FormLabel, Grid, MenuItem, Radio, RadioGroup, Select, Table, TableBody, TableCell, TableHead, TableRow, TextareaAutosize, TextField, Typography, useTheme } from "@mui/material";
import { useEffect, useState } from "react";
import api from "@/services/api"
import * as TransportUrls from '@/helpers/constants/rest_urls/TransportUrls';
import toast from "react-hot-toast";
import { getDefaultError } from "@/helpers/Utilities"
import TransportDeliveryDateTracking from "./TransportDeliveryDateTracking";
import RitzModal from "@/components/Ritz/RitzModal";
import { DEFAULT_SUCCESS } from "@/helpers/constants/Constants";
import RitzTooltip from "@/components/Ritz/RitzTooltip";
import TransportDeliveryDateTrackingChange from "./TransportDeliveryChange";
import TransportDeliveryChange from "./TransportDeliveryChange";
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
        }
    }
}

const ChangeInterface = ({transportTrackingId,selectedDeliveryIds,onClose,fetchTransportDeliveryCounts,fetchTransportDeliveryDateTrackingListData}: {
    transportTrackingId: number;
    selectedDeliveryIds:any;
    onClose:any
    fetchTransportDeliveryCounts:any
    fetchTransportDeliveryDateTrackingListData:any  
}) => {

    const [localTransportTrackingId, setLocalTransportTrackingId] = useState(transportTrackingId);
    const [errorsDetails, setErrorDetails] = useState<any>({});
    const [isSaving, setIsSaving] = useState(false);
    const theme = useTheme();
    const [deliveryChangeData, setDeliveryChangeData] = useState({
        selected_deliveries_to_change: [],
        selected_deliveries_to_change_objects: [],
        checked_deliveries_to_change: [],
        checked_deliveries_to_change_objects: [],
        changing_criteria: [],
        reasons: {
            transport_mode: {
                reason:'',
                remark:''
            },
            foreign_port: {
                reason:'',
                remark:''
            },
            local_port: {
                reason:'',
                remark:''
            },
            forwarder: {
                reason:'',
                remark:''
            },
            
        },
        new_transport_mode: '',
        new_local_port: '',
        new_foreign_port: '',
        new_forwarder: '',
    });

    const [deliveryMergeData, setDeliveryMergeData] = useState({
        supplier_delivery_dates: [],
        merge_with_transport_delivery_date_tracking: null,
        reason: ''
    });

    const [transportDeliveryDateTrackingMetaData, setTransportDeliveryDateTrackingMetaData] = useState<TransportDeliveryDateTrackingMetaData>();
    const [mergListData, setMergListDataData] = useState([]);
    const [transportDeliveryDateTrackingModalOpen, setTransportDeliveryDateTrackingModalOpen] = useState(false);
    const [transportDeliveryChangeModalOpen, setTransportDeliveryChangeModalOpen] = useState(false);
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

    const fetchTransportDeliveryDateTrackingDetail = (LocalTransportTrackingId: number) => {
        setIsLoading(true); 
        api.get(TransportUrls.transportDeliveryDateTrackingDetail(LocalTransportTrackingId))
            .then(({ data }) => {
                setDeliveryChangeData((prevData) => ({
                    ...prevData,
                    selected_deliveries_to_change: data.supplier_delivery_date_ids,
                    selected_deliveries_to_change_objects: data.selected_deliveries,
                }));
            })
            .catch((error) => {
                toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
            setIsLoading(false);
        });
    };

    // Get the Dtrack ids for the list
    const mergeListData = () => {
        Promise.all([
            api.get(TransportUrls.transportDeliveryDateTrackingMergeListUrl(localTransportTrackingId))
        ])
            .then(([mergeList]) => {
                const delivery_date_tracking_merge_list = mergeList?.data?.results;
                
                setMergListDataData(delivery_date_tracking_merge_list);
            })
            .catch((error) => {
                toast.error(getDefaultError(error?.response?.status));
            });
    };

    // Delivery moving save api call
    const supplierDeliveryDateMergeSave = () => {
        setIsSaving(true);
        const apiUrl = TransportUrls.mergeSupplierDeliveryDateUrl(transportTrackingId);
        const data = deliveryMergeData;

        api.put(apiUrl, data)
            .then(resp => {
            toast.success(DEFAULT_SUCCESS);
            // onClose();
            // clearSelectedDeliveries();
            // deleteSelectedDeliveries();
            // fetchData()
            // setDeletedContainerIds([]);
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
    
    const updateDeliveryChangeData = (
        key: keyof typeof deliveryChangeData, 
        value: any, 
        nestedKey?: keyof typeof deliveryChangeData["reasons"]
    ) => {
        setDeliveryChangeData((prevState) => {
            const currentValue = prevState[key];

            if (nestedKey && typeof currentValue === "object" && !Array.isArray(currentValue)) {
                return {
                    ...prevState,
                    [key]: {
                        ...currentValue,
                        [nestedKey]: {
                            ...currentValue[nestedKey],
                            ...value,
                        },
                    },
                };
            }
    
            if (Array.isArray(currentValue)) {
                const updatedValue = currentValue.includes(value)
                    ? currentValue.filter((item) => item !== value)
                    : [...currentValue, value];
    
                return { ...prevState, [key]: updatedValue };
            }
    
            return { ...prevState, [key]: value };
        });
    };
    

    const handleMoveDeliveryStatus = (value:any) => {
        setDeliveryMovingStatus(value);
    };

    const handleChangingDelivery = () => {
        setTransportDeliveryChangeModalOpen(true);
    }

    const handleMoveButtonClick = () => {
        supplierDeliveryDateMergeSave();
        setTransportDeliveryDateTrackingModalOpen(true);
    };

    const handleTransportDeliveryDateTrackingModalClose = () => {
        setTransportDeliveryDateTrackingModalOpen(false);
        onClose();
    };

    const updateDeliveryMergeData = (key: string, value: any) => {
        setDeliveryMergeData(prevState => ({
            ...prevState,
            [key]: value
        }));
    };

    useEffect(() => {
        if (localTransportTrackingId != null && deliveryMovingStatus === '') {
            fetchTransportDeliveryDateTrackingDetail(localTransportTrackingId)
        }
    }, [localTransportTrackingId]);
    
    useEffect(() => {
        fetchTransportDeliveryDateTrackingMetaData();
        mergeListData();
    }, []);
    
    useEffect(() => {
        setDeliveryMergeData(prev => ({
            ...prev,
            supplier_delivery_dates: deliveryChangeData.checked_deliveries_to_change
        }));
    }, [deliveryChangeData.checked_deliveries_to_change]);

    useEffect(() => {
        setLocalTransportTrackingId(deliveryMergeData?.merge_with_transport_delivery_date_tracking)
    }, [deliveryMergeData?.merge_with_transport_delivery_date_tracking]);

    
    useEffect(() => {
        if (deliveryChangeData?.new_transport_mode != null && deliveryChangeData?.new_transport_mode === 'land') {
            updateDeliveryChangeData("reasons", {}, "foreign_port");
            updateDeliveryChangeData("reasons", {}, "local_port");
            updateDeliveryChangeData('new_foreign_port','');
            updateDeliveryChangeData('new_local_port','');
            updateDeliveryChangeData('new_forwarder','');
            updateDeliveryChangeData('new_forwarder','');
        }
    }, [deliveryChangeData?.new_transport_mode]);
    
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
                        <TableCell>Customer</TableCell>
                        <TableCell>Costing</TableCell>
                        <TableCell>PO Club</TableCell>
                        <TableCell>Ex Mill Date</TableCell>
                        <TableCell>Incoterms</TableCell>
                        <TableCell>Materials</TableCell>
                        <TableCell>Supplier</TableCell>
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
                            <TableCell>{row?.customer || '--'}</TableCell>
                            <TableCell>{row?.costing_version || '--'}</TableCell>
                            <TableCell>{row?.po_club_display_number || '--'}</TableCell>
                            <TableCell>{row?.last_ex_mill_date || '--'}</TableCell>
                            <TableCell>
                            {row?.incoterms?.length > 0
                                ? row.incoterms.map((item: any) => item.incoterms_display).join(', ')
                                : '--'}
                            </TableCell>
                            <TableCell>
                            {row?.materials?.length > 0 ? (
                                row.materials.map((mat: any, matIndex: number) => (
                                <span key={matIndex} style={{ display: 'inline' }}>
                                    <span>{mat?.attributes?.ritz_customer_brand_reference_code || 'N/A'}</span>
                                    <RitzTooltip materialHeaders={mat.headers} materialDetails={mat.attributes} />
                                    {matIndex < row.materials.length - 1 && ', '}
                                </span>
                                ))
                            ) : (
                                '--'
                            )}
                            </TableCell>
                            <TableCell>{row?.supplier || '--'}</TableCell>
                            <TableCell>{row?.confirmed_delivery_date || '--'}</TableCell>
                        </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={10} align="center">
                                No deliveries to display.
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
                                                onChange={(event:any, value:any) =>updateDeliveryMergeData('merge_with_transport_delivery_date_tracking', value?.value)}
                                                options={mergListData?.map((item: any) => ({
                                                    label: item.transport_delivery_date_tracking_display_number,
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
                                                    {transportDeliveryDateTrackingMetaData?.change_reasons?.foreign?.import?.merge_to_existing_transport.map((item: any) => (
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
                            <Typography variant='h5' color='text.primary' sx={{ mt: 2, mb: 2 }}>What do you want to change?</Typography>
                            <FormGroup row sx={{ mb: 4 }}> 
                                <FormControlLabel
                                    control={
                                    <Checkbox
                                        checked={deliveryChangeData.changing_criteria.includes('transport_mode')}
                                        onChange={() => updateDeliveryChangeData('changing_criteria', 'transport_mode')}
                                    />
                                    }
                                    label="Transport Mode"
                                />
                                <FormControlLabel
                                    control={
                                    <Checkbox
                                        checked={deliveryChangeData.changing_criteria.includes('foreign_port')}
                                        onChange={() => updateDeliveryChangeData('changing_criteria', 'foreign_port')}
                                    />
                                    }
                                    label="Foreign Port"
                                />
                                <FormControlLabel
                                    control={
                                    <Checkbox
                                        checked={deliveryChangeData.changing_criteria.includes('local_port')}
                                        onChange={() => updateDeliveryChangeData('changing_criteria', 'local_port')}
                                    />
                                    }
                                    label="Local Port"
                                />
                                <FormControlLabel
                                    control={
                                    <Checkbox
                                        checked={deliveryChangeData.changing_criteria.includes('forwarder')}
                                        onChange={() => updateDeliveryChangeData('changing_criteria', 'forwarder')}
                                    />
                                    }
                                    label="Forwarder"
                                />
                            </FormGroup>

                    <Grid container spacing={2}>
                        {deliveryChangeData.changing_criteria.includes('transport_mode') && (
                            <>
                                <Grid item xs={12} sm={6} md={2.9} sx={{ border: "1px solid #ccc",borderRadius: "8px",padding: "14px", width: "500px !important", minWidth: "500px !important",maxWidth: "500px !important",ml:'6px'}}>
                                    <Typography variant='h5' color='text.primary' sx={{ mt: 2, mb: 2, maxWidth: "300px" }}>Please select the reason to change the transport mode:</Typography>
                                    <Select
                                        id={'transport_mode'}
                                        name={'transport_mode'}
                                        labelId={'transport_mode'}
                                        size="small"
                                        sx={{ maxWidth: "300px", width: "100%" }}
                                        value={deliveryChangeData?.reasons?.transport_mode?.reason || ''}
                                        onChange={(event: any) => {
                                            updateDeliveryChangeData("reasons", { reason: event.target.value }, "transport_mode");
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
                                        deliveryChangeData?.reasons?.transport_mode && (
                                            <>
                                                <Typography variant='h5' color='text.primary' sx={{ mt: 2, mb: 2 }}>Please select the new transport mode:</Typography>
                                                <Select
                                                    id={'new_transport_mode'}
                                                    name={'new_transport_mode'}
                                                    labelId={'new_transport_mode'}
                                                    size="small"
                                                    value={deliveryChangeData?.new_transport_mode}
                                                    sx={{ width: "100%", maxWidth: "300px", mb: 2 }}
                                                    onChange={(event: any) => updateDeliveryChangeData('new_transport_mode', event.target.value)}
                                                >
                                                    {transportDeliveryDateTrackingMetaData?.freight_types.map((item:any) => (
                                                        <MenuItem key={item.type} value={item.type}>
                                                            {item.name}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </>
                                        )
                                    }

                                    {
                                        deliveryChangeData?.new_transport_mode && (
                                            <>
                                                <Typography variant='h5' color='text.primary' sx={{ mb: 2 }}>Remarks:</Typography>
                                                <TextareaAutosize
                                                    id={`new_transport_mode_remark`} 
                                                    name="new_transport_mode_remark"
                                                    minRows={3}
                                                    maxRows={6}
                                                    value={deliveryChangeData?.reasons?.transport_mode?.remark || ''}
                                                    onChange={(event: any) => {
                                                        updateDeliveryChangeData("reasons", { remark: event.target.value }, "transport_mode");
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
                        )}
                        
                        {deliveryChangeData.changing_criteria.includes('foreign_port') && deliveryChangeData?.new_transport_mode !== 'land' &&(
                            <>
                                <Grid item xs={12} sm={6} md={2.9} sx={{ border: "1px solid #ccc",borderRadius: "8px",padding: "14px", width: "500px !important", minWidth: "500px !important",maxWidth: "500px !important",ml:'6px'}}>
                                    {
                                      (
                                        <>
                                            <Typography variant='h5' color='text.primary' sx={{ mt: 2, mb: 2, maxWidth: "300px" }}>Please select the reason to change the foreign port:</Typography>
                                            <Select
                                                id={'foreign_port'}
                                                name={'foreign_port'}
                                                labelId={'foreign_port'}
                                                value={deliveryChangeData?.reasons?.foreign_port?.reason || ''}
                                                size="small"
                                                sx={{ maxWidth: "300px", width: "100%" }}
                                                onChange={(event: any) => {
                                                    updateDeliveryChangeData("reasons", { reason: event.target.value }, "foreign_port");
                                                }}
                                            >
                                                {
                                                    transportDeliveryDateTrackingMetaData?.change_reasons?.foreign?.import?.foreign_port.map((reason:any) => (
                                                        <MenuItem key={reason?.value} value={reason?.value}>
                                                            {reason?.display_value}
                                                        </MenuItem>
                                                    ))
                                                }
                                            </Select>
                                        </>
                                      ) 
                                    }
                                    
                                    {
                                        deliveryChangeData?.reasons?.foreign_port && (
                                            <>
                                                <Typography variant='h5' color='text.primary' sx={{ mt: 2, mb: 2 }}>Please select the new foreign port:</Typography>
                                                <Select
                                                    id={'new_foreign_port'}
                                                    name={'new_foreign_port'}
                                                    labelId={'new_foreign_port'}
                                                    size="small"
                                                    value={deliveryChangeData?.new_foreign_port}
                                                    sx={{ minWidth: "300px" }}
                                                    onChange={(event: any) => updateDeliveryChangeData('new_foreign_port', event.target.value)}
                                                >
                                                    {transportDeliveryDateTrackingMetaData?.foreign_ports.map((item:any) => (
                                                        <MenuItem key={item.id} value={item.id}>
                                                            {item.name}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </>
                                    )}

                                    {
                                        deliveryChangeData?.new_foreign_port && (
                                            <>
                                                <Typography variant='h5' color='text.primary' sx={{ mt:2,mb: 2 }}>Remarks:</Typography>
                                                <TextareaAutosize
                                                    id={`new_foreign_port_remark`} 
                                                    name="new_foreign_port_remark"
                                                    minRows={3}
                                                    maxRows={6}
                                                    value={deliveryChangeData?.reasons?.foreign_port?.remark || ''}
                                                    onChange={(event: any) => {
                                                        updateDeliveryChangeData("reasons", { remark: event.target.value }, "foreign_port");
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
                                    )}
                                </Grid>
                            </>
                        )}

                        {deliveryChangeData.changing_criteria.includes('local_port') && deliveryChangeData?.new_transport_mode !== 'land' && (
                            <>
                                <Grid item xs={12} sm={6} md={2.9} sx={{ border: "1px solid #ccc",borderRadius: "8px",padding: "14px", width: "500px !important", minWidth: "500px !important",maxWidth: "500px !important",ml:'6px'}}>
                                    <Typography variant='h5' color='text.primary' sx={{ mt: 2, mb: 2, maxWidth: "300px" }}>Please select the reason to change the local port :</Typography>
                                    <Select
                                        id={'local_port'}
                                        name={'local_port'}
                                        labelId={'local_port'}
                                        value={deliveryChangeData?.reasons?.local_port?.reason || ''}
                                        size="small"
                                        sx={{ maxWidth: "300px", width: "100%" }}
                                        onChange={(event: any) => {
                                            updateDeliveryChangeData("reasons", { reason: event.target.value }, "local_port");
                                        }}
                                    >
                                        {
                                            transportDeliveryDateTrackingMetaData?.change_reasons?.foreign?.import?.local_port?.map((reason:any) => (
                                                <MenuItem key={reason?.value} value={reason?.value}>
                                                    {reason?.display_value}
                                                </MenuItem>
                                            ))
                                        }
                                    </Select>
                                    
                                    {
                                        deliveryChangeData?.reasons?.local_port && (
                                            <>
                                                <Typography variant='h5' color='text.primary' sx={{ mt: 2, mb: 2 }}>Please select the new local port:</Typography>
                                                <Select
                                                    id={'new_local_port'}
                                                    name={'new_local_port'}
                                                    labelId={'new_local_port'}
                                                    size="small"
                                                    value={deliveryChangeData?.new_local_port}
                                                    sx={{ minWidth: "300px" }}
                                                    onChange={(event: any) => updateDeliveryChangeData('new_local_port', event.target.value)}
                                                    >
                                                    {transportDeliveryDateTrackingMetaData?.local_ports.map((item) => (
                                                        <MenuItem key={item.id} value={item.id}>
                                                            {item.name}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </>
                                    )}
                                    {
                                        deliveryChangeData?.new_local_port && (
                                            <>
                                                <Typography variant='h5' color='text.primary' sx={{ mt:2,mb: 2 }}>Remarks:</Typography>
                                                <TextareaAutosize
                                                    id={`new_local_port_remark`} 
                                                    name="new_local_port_remark"
                                                    minRows={3}
                                                    maxRows={6}
                                                    value={deliveryChangeData?.reasons?.local_port?.remark || ''}
                                                    onChange={(event: any) => {
                                                        updateDeliveryChangeData("reasons", { remark: event.target.value }, "local_port");
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
                                        )}
                                </Grid>
                            </>
                        )}

                        {deliveryChangeData.changing_criteria.includes('forwarder') && (
                            <>
                                <Grid item xs={12} sm={6} md={2.9} sx={{ border: "1px solid #ccc",borderRadius: "8px",padding: "14px", width: "500px !important", minWidth: "500px !important",maxWidth: "500px !important",ml:'6px'}}>
                                    <Typography variant='h5' color='text.primary' sx={{ mt: 2, mb: 2, maxWidth: "300px" }}>Please select the reason to change the forwarder :</Typography>
                                    <Select
                                        id={'forwarder'}
                                        name={'forwarder'}
                                        labelId={'forwarder'}
                                        value={deliveryChangeData?.reasons?.forwarder?.reason || ''}
                                        size="small"
                                        sx={{ maxWidth: "300px", width: "100%" }}
                                        onChange={(event: any) => {
                                            updateDeliveryChangeData("reasons", { reason: event.target.value }, "forwarder");
                                        }}
                                    >
                                        {
                                            transportDeliveryDateTrackingMetaData?.change_reasons?.foreign?.import?.forwarder?.map((reason:any) => (
                                                <MenuItem key={reason?.value} value={reason?.value}>
                                                    {reason?.display_value}
                                                </MenuItem>
                                            ))
                                        }
                                    </Select>
                                    {deliveryChangeData?.reasons?.forwarder && (
                                        <>
                                            <Typography variant='h5' color='text.primary' sx={{ mt: 2, mb: 2 }}>Please select the new forwarder:</Typography>
                                            <Select
                                                id={'new_forwarder'}
                                                name={'new_forwarder'}
                                                labelId={'new_forwarder'}
                                                size="small"
                                                value={deliveryChangeData?.new_forwarder}
                                                sx={{ minWidth: "300px" }}
                                                onChange={(event: any) => updateDeliveryChangeData('new_forwarder', event.target.value)}
                                            >
                                                {transportDeliveryDateTrackingMetaData?.freight_forwarders.map((item:any) => (
                                                    <MenuItem key={item.id} value={item.id}>
                                                        {item.name}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </>
                                    )}
                                    {
                                        deliveryChangeData?.new_forwarder && (
                                            <>
                                                <Typography variant='h5' color='text.primary' sx={{ mt:2,mb: 2 }}>Remarks:</Typography>
                                                <TextareaAutosize
                                                    id={`new_forwarder_remark`} 
                                                    name="new_forwarder_remark"
                                                    minRows={3}
                                                    maxRows={6}
                                                    value={deliveryChangeData?.reasons?.forwarder?.remark || ''}
                                                    onChange={(event: any) => {
                                                        updateDeliveryChangeData("reasons", { remark: event.target.value }, "forwarder");
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
                                    )}
                                </Grid>
                            </>
                        )}
                    </Grid>
                    </>
                    )}
                </Card>
            )}

            {transportDeliveryDateTrackingModalOpen && (
                <RitzModal
                    open={transportDeliveryDateTrackingModalOpen}
                    onClose={() => setTransportDeliveryDateTrackingModalOpen(false)}
                    maxWidth= {false}
                    title={"Transport Delivery Date Tracking"}>
                        <TransportDeliveryDateTracking
                            selectedDeliveryIds={deliveryChangeData?.checked_deliveries_to_change}
                            selected_deliveries={deliveryChangeData?.checked_deliveries_to_change_objects}
                            transportTrackingId={localTransportTrackingId}
                            closeModal={handleTransportDeliveryDateTrackingModalClose}
                            clearSelectedDeliveries={'clearSelectedDeliveries'}
                            deleteSelectedDeliveries={'deleteSelectedDeliveries'}
                            fetchData={fetchTransportDeliveryDateTrackingListData}
                            disableDelete={true}
                        />
                </RitzModal>
            )}

            {transportDeliveryChangeModalOpen && (
                <RitzModal
                    open={transportDeliveryChangeModalOpen}
                    onClose={() => setTransportDeliveryChangeModalOpen(false)}
                    maxWidth= {false}
                    title={"Transport Delivery Date Tracking Details Change"}>
                        <TransportDeliveryChange
                            selectedDeliveryIds={deliveryChangeData?.checked_deliveries_to_change}
                            selected_deliveries={deliveryChangeData?.checked_deliveries_to_change_objects}
                            transportTrackingId={transportTrackingId}
                            closeModal={handleTransportDeliveryDateTrackingModalClose}
                            clearSelectedDeliveries={'clearSelectedDeliveries'}
                            deleteSelectedDeliveries={'deleteSelectedDeliveries'}
                            disableDelete={true}
                            newTransportMode={deliveryChangeData?.new_transport_mode}
                            newLocalPort={deliveryChangeData?.new_local_port}
                            newForeignPort={deliveryChangeData?.new_foreign_port}
                            newForwarder={deliveryChangeData?.new_forwarder}
                            reasons={deliveryChangeData?.reasons}
                            fetchTransportDeliveryCounts={fetchTransportDeliveryCounts}
                            fetchData={fetchTransportDeliveryDateTrackingListData}
                            />
                </RitzModal>
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


export default ChangeInterface;