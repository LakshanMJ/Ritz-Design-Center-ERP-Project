import { Box, Button, Card, Checkbox, Collapse, FormControlLabel, Grid, IconButton, InputLabel, MenuItem, Radio, RadioGroup, Select, SelectChangeEvent, Table, TableBody, TableCell, TableHead, TableRow, TextareaAutosize, TextField, Typography } from "@mui/material";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from "dayjs";
import { useEffect, useState } from "react";
import api from "@/services/api";
import toast from "react-hot-toast";
import { getDefaultError } from "@/helpers/Utilities";
import * as TransportUrls from '@/helpers/constants/rest_urls/TransportUrls';
import RitzInput from "@/components/Ritz/RitzInput";
import { DEFAULT_SUCCESS } from "@/helpers/constants/Constants";
import FormErrorMessage from "@/components/FormErrorMessage";
import DeleteIcon from '@mui/icons-material/Delete';
import React from "react";
import { AddCircleOutline, KeyboardArrowDown, KeyboardArrowRight } from "@mui/icons-material";
import RitzModal from "@/components/Ritz/RitzModal";
import RitzTooltip from "@/components/Ritz/RitzTooltip";

interface TransportDeliveryDateTrackingProps {
    selectedDeliveryIds: any;
    selected_deliveries:any;
    transportTrackingId: any;
    closeModal: () => any;
    clearSelectedDeliveries:any;
    deleteSelectedDeliveries:any;
    fetchData: any;
    disableDelete:any,  
    newTransportMode:any,
    newLocalPort:any,
    newForeignPort:any,
    newForwarder:any,
    reasons:any,
    fetchTransportDeliveryCounts:any,
    // fetchTransportDeliveryDateTrackingListData:any
}

interface TransportDeliveryDateTrackingMetaData {
    volume_units: { value: string; label: string }[];
    weight_units: { value: string; label: string }[];
    foreign_ports: { value: string; label: string }[];
    local_ports: { value: string; label: string }[];
    vendor_door_addresses: { value: string; label: string }[];
    types:any;
    transport_types:[ {
        type: null,
        name: "",
        transport_type: null,
        deliveries: [
            {
                id: null,
                supplier_delivery_date: null,
                volume: null,
                volume_unit: "cubic_meters",
                weight: null,
                weight_unit: ""
            }
        ],
    },
    ]
    freight_forwarder_warehouses:any;
    freight_forwarders:any;
}

const TransportDeliveryChange: React.FC<TransportDeliveryDateTrackingProps> = ({
        selectedDeliveryIds,
        selected_deliveries,
        transportTrackingId,
        closeModal,
        clearSelectedDeliveries,
        deleteSelectedDeliveries,
        fetchData,
        disableDelete,  
        newTransportMode,
        newLocalPort,
        newForeignPort,
        newForwarder,
        reasons,
        fetchTransportDeliveryCounts,
        // fetchTransportDeliveryDateTrackingListData
    }) => {
        
    const [isSaving, setIsSaving] = useState(false);
    const [errorsDetails, setErrorDetails] = useState<any>({});
    const [showDeleteIcon, setShowDeleteIcon] = useState(false);
    const [transportDeliveryDateTrackingMetaData, setTransportDeliveryDateTrackingMetaData] = useState<TransportDeliveryDateTrackingMetaData>();
    const [expandedRows, setExpandedRows] = useState<number[]>([]);
    const [transportDeliveryDateData, setTransportDeliveryDateData] = useState({
        vendor_door_address : null,
        vendor_door_expected_shipping_date :null,
        actual_vendor_shipping_date : null,
        foreign_port : null,
        foreign_port_expected_date: null,
        actual_foreign_port_date: null,
        local_port: null,
        local_port_expected_date: null,
        actual_local_port_date: null,
        expected_delivery_date : null,
        actual_expected_delivery_date: null, 
        freight_forwarder_local_warehouse: null,
        freight_forwarder: null,
        air_volume: null,
        air_volume_unit: null,
        air_weight: null,
        air_weight_unit: null,
        type : '',
        name:'',
        vendor_shipping_date_delay_reason: null,
        foreign_port_date_delay_reason:null,
        local_port_date_delay_reason:null,
        expected_delivery_date_delay_reason:null,
        transport_mode : '',
        number_of_containers : null,
        supplier_delivery_date_ids: selectedDeliveryIds,
        supplier_delivery_date_objects: selected_deliveries ,
        transport_types : [],
        air_deliveries: [{
                    supplier_delivery_date: '',
                    volume: null,
                    volume_unit: "cubic_meters",
                    weight: null,
                    weight_unit: "kilograms",
                }],
        reasons: [],
    });
    const [showLastRowDeleteRestrictError,setShowLastRowDeleteRestrictError] = useState({
        showLastRowDeleteRestrictError: false,
        showDeleteRowError: false
    });

    const warehouses = transportDeliveryDateTrackingMetaData?.freight_forwarders.find((ff:any) => ff.id === transportDeliveryDateData?.freight_forwarder)?.freight_forwarder_warehouses || [];
   
    const fetchTransportDeliveryDateTrackingMetaData = () => {
        Promise.all([
            api.get(TransportUrls.transportDeliveryDateTrackingMetaData()),
            api.get(TransportUrls.portsURL())
        ])
            .then(([metaDataResp, portDataResp]) => {
                const metaData = metaDataResp.data;
                const port_data = portDataResp.data;
    
                setTransportDeliveryDateTrackingMetaData({ ...metaData, port_data});
            })
            .catch((error) => {
                toast.error(getDefaultError(error?.response?.status));
            });
    };

    const transportDeliveryDateTrackingFormSave = () => {
        setIsSaving(true);
        const apiUrl = TransportUrls.transportDeliveryDateTrackingChangeCreateUrl(true, transportTrackingId);
        const apiMethod = api.post;
        const data = transportDeliveryDateData;

        apiMethod(apiUrl, data)
          .then(resp => {
            toast.success(DEFAULT_SUCCESS);
            closeModal();
            fetchData();
            fetchTransportDeliveryCounts();
            clearSelectedDeliveries();
            deleteSelectedDeliveries();
            
          })
          .catch(error => {
            setErrorDetails({ ...error?.response?.data });
          })
          .finally(() => setIsSaving(false));
    };

    const handleTransportDeliveryDateTrackingformStateChange = (
        value: any,
        field: string,
        transportTypeIndex?: number
    ) => {
        setTransportDeliveryDateData((prevState) => {
            const rootLevelFields = ["transport_mode", "vendor_door_address", "vendor_door_expected_shipping_date","actual_vendor_shipping_date",
                "foreign_port","foreign_port_expected_date","actual_foreign_port_date","local_port","local_port_expected_date","actual_local_port_date",
                "expected_delivery_date","actual_expected_delivery_date","freight_forwarder_local_warehouse","freight_forwarder","type",'air_volume',
                'air_volume_unit','air_weight','air_weight_unit','vendor_shipping_date_delay_reason','foreign_port_date_delay_reason',
                'local_port_date_delay_reason','expected_delivery_date_delay_reason']; 
    
            if (rootLevelFields.includes(field)) {
                return {
                    ...prevState,
                    [field]: value,
                };
            }
    
            const updatedRatios = [...prevState.transport_types];
            if (typeof transportTypeIndex === "undefined" || !updatedRatios[transportTypeIndex]) return prevState;
            updatedRatios[transportTypeIndex] = {
                ...updatedRatios[transportTypeIndex],
                [field]: value,
            };
            return {
                ...prevState,
                transport_types: updatedRatios,
            };
        });
    };
    
    const handleDeliveryStateChange = (
        value: any,
        field: string,
        transportTypeIndex?: number,
        deliveryIndex?: number
    ) => {

        if (typeof transportTypeIndex === "undefined" || typeof deliveryIndex === "undefined") return;
            const updatedRatios = [...transportDeliveryDateData.transport_types];
        if (!updatedRatios[transportTypeIndex] || !updatedRatios[transportTypeIndex].deliveries) return;
            const updatedDeliveries = [...updatedRatios[transportTypeIndex].deliveries];
        if (!updatedDeliveries[deliveryIndex]) return;
        updatedDeliveries[deliveryIndex] = {
            ...updatedDeliveries[deliveryIndex],
            [field]: value,
        };
        updatedRatios[transportTypeIndex] = {
            ...updatedRatios[transportTypeIndex],
            deliveries: updatedDeliveries,
        };
        setTransportDeliveryDateData((prevState) => ({
            ...prevState,
            transport_types: updatedRatios,
        }));
    };

    const handleAirDeliveryStateChange = (value: any, field: string, index: number) => {
        setTransportDeliveryDateData(prev => {
            const updatedAirDeliveries = [...prev.air_deliveries];
            updatedAirDeliveries[index] = {
                ...updatedAirDeliveries[index],
                [field]: value
            };
    
            return {
                ...prev,
                air_deliveries: updatedAirDeliveries
            };
        });
    };

    const handleAddAirDeliveryRow = () => {
        setTransportDeliveryDateData(prev => ({
            ...prev,
            air_deliveries: [
                ...prev.air_deliveries,
                {
                    supplier_delivery_date: '',
                    volume: null,
                    volume_unit: "cubic_meters",
                    weight: null,
                    weight_unit: "kilograms",
                }
            ]
        }));
    };

    const handleDeleteAirDeliveryRow = (rowIndex: number) => {
        setTransportDeliveryDateData(prev => {
            if (prev.air_deliveries.length <= 1) {
                updateErrorState("showLastRowDeleteRestrictError", true);
                return prev;
            }
    
            return {
                ...prev,
                air_deliveries: prev.air_deliveries.filter((_, index) => index !== rowIndex)
            };
        });
    };

    const changeNumberOfContainers = (value: number) => {
        setTransportDeliveryDateData((prevDetails: any) => {
            const existingContainers = prevDetails.transport_types || [];
    
            if (value > existingContainers.length) {
                return {
                    ...prevDetails,
                    number_of_containers: value,
                    transport_types: [
                        ...existingContainers,
                        ...Array.from({ length: value - existingContainers.length }, (value, index) => ({
                            id: existingContainers.length + index + 1,
                            type: null as any,
                            name: `cont ${existingContainers.length + index + 1}`,
                            deliveries: [
                                {
                                    id: null as any,
                                    supplier_delivery_date: null as any,
                                    volume: null as any,
                                    volume_unit: 'cubic_meters',
                                    weight: null as any,
                                    weight_unit: 'kilograms'
                                }
                            ]
                        }))
                    ]
                };
            }
            else if (value < existingContainers.length) {
                setShowDeleteIcon(true);
                updateErrorState("showDeleteRowError", true);
                return prevDetails;
            }
            return prevDetails;
        });
    };
    
    const deleteContainerTypeData = (id: number) => {
        if (transportDeliveryDateData.transport_types.length === 1) {
            updateErrorState("showLastRowDeleteRestrictError", true);
            return;
        }

        const containerIndex = transportDeliveryDateData.transport_types.findIndex(item => item.id === id);
        if (containerIndex !== -1) {
            const updatedContainers = [...transportDeliveryDateData.transport_types];
            updatedContainers.splice(containerIndex, 1);
            setTransportDeliveryDateData((prevData) => ({
                ...prevData,
                transport_types: updatedContainers,
                number_of_containers: updatedContainers.length,
            }));
        }
    };

    const handleRowToggle = (rowIndex: number) => {
        setExpandedRows((prev) =>
            prev.includes(rowIndex) ? prev.filter((i) => i !== rowIndex) : [...prev, rowIndex]
        );
    };

    const handleAddDeliveryRow = (transportTypeId: number) => {
        setTransportDeliveryDateData((prevState: any) => ({
            ...prevState,
            transport_types: prevState.transport_types.map((transport: any,index:number) => {
                if (index === transportTypeId) {
                    return {
                        ...transport,
                        deliveries: [
                            ...transport.deliveries,
                            {
                                id: null,
                                supplier_delivery_date: null,
                                volume: null,
                                volume_unit: "cubic_meters",
                                weight: null,
                                weight_unit: "kilograms",
                            },
                        ],
                    };
                }
                return transport;
            }),
        }));
    };

    const handleDeleteDeliveryRow = (index: number, subIndex: number) => {
        setTransportDeliveryDateData((prevState: any) => {
            return {
                ...prevState,
                transport_types: prevState.transport_types.map((transport: any, transportIndex: number) => {
                    if (transportIndex === index) {
                        if (transport.deliveries.length === 1) {
                            updateErrorState("showLastRowDeleteRestrictError", true);
                            return transport;
                        }
                        return {
                            ...transport,
                            deliveries: transport.deliveries.filter(
                                (value: any, deliveryIndex: number) => deliveryIndex !== subIndex
                            ),
                        };
                    }
                    return transport;
                }),
            };
        });
    };
    
    const handleSummaryTableRowDelete = (indexToDelete: number) => {
        if (transportDeliveryDateData.supplier_delivery_date_objects.length === 1) {
            updateErrorState("showLastRowDeleteRestrictError", true);
            return; 
        }
        const deletedId = transportDeliveryDateData.supplier_delivery_date_objects[indexToDelete]?.id;
        if (deletedId) {
            deleteSelectedDeliveries(deletedId);
        }
        setTransportDeliveryDateData((prevData: any) => ({
            ...prevData,
            supplier_delivery_date_objects: prevData.supplier_delivery_date_objects.filter((value:number, index: number) => index !== indexToDelete),
        }));
    };

    const updateErrorState = (errorType: keyof typeof showLastRowDeleteRestrictError, value: boolean) => {
        setShowLastRowDeleteRestrictError((prevState) => ({
            ...prevState,
            [errorType]: value
        }));
    };
    
    useEffect(() => {
        fetchTransportDeliveryDateTrackingMetaData()
    }, []);

    useEffect(() => {
        if (Array.isArray(transportDeliveryDateData.transport_types)) {
            const allRows = transportDeliveryDateData.transport_types.map((_, index) => index);
            setExpandedRows(allRows);
        }
    }, [transportDeliveryDateData.transport_types]); 
    
    useEffect(() => {
        setTransportDeliveryDateData(prevData => ({
            ...prevData,
            transport_mode: newTransportMode || '',
            local_port: newLocalPort || null,
            foreign_port: newForeignPort || null,
            freight_forwarder: newForwarder || null,
            reasons: reasons || []
        }));
    }, [newTransportMode, newLocalPort, newForeignPort, newForwarder, reasons]);

    return(
        <>  
        
            <Card sx={{ marginRight: 'auto', paddingRight: '10px', paddingLeft: '10px' }}>
                <Box  sx={{ display: 'flex',flexDirection: 'column', alignItems: 'left', justifyContent: 'space-between', mb: 3 }}>
                    <Table sx={{
                        mb: 2,
                        border: (theme) => `1px solid ${theme.palette.grey[300]}`,
                        overflow: 'hidden',
                        }}
                        >
                        <TableHead>
                            <TableRow
                                sx={{
                                    borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`,
                                    background: (theme) => theme.palette.grey[300],
                                }}
                            >
                                <TableCell>Number</TableCell>
                                <TableCell>Customer</TableCell>
                                <TableCell>Costing</TableCell>
                                <TableCell>PO Club</TableCell>
                                <TableCell>Material</TableCell>
                                <TableCell>Supplier</TableCell>
                                <TableCell></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                        {selected_deliveries?.map((item: any, index: any) => (
                            <TableRow
                            key={index}
                            sx={{
                                borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`,
                                background: (theme) => (index % 2 === 0 ? theme.palette.grey[250] : theme.palette.white),
                            }}
                            >
                            <TableCell>{item?.display_number || '!!'}</TableCell>
                            <TableCell>{item?.customer || '--'}</TableCell>
                            <TableCell>{item?.costing_version || '--'}</TableCell>
                            <TableCell>{item?.po_club_display_number || '--'}</TableCell>
                            <TableCell>
                                {item?.materials?.length > 0 ? (
                                item.materials.map((mat: any, matIndex: number) => (
                                    <span key={matIndex} style={{ display: 'inline' }}>
                                    <span>
                                        {mat?.attributes?.ritz_customer_brand_reference_code || 'N/A'}
                                    </span>
                                    <RitzTooltip materialHeaders={mat.headers} materialDetails={mat.attributes} />
                                    {matIndex < item.materials.length - 1 && ', '}
                                    </span>
                                ))
                                ) : (
                                '--'
                                )}
                            </TableCell>
                            <TableCell>{item?.supplier || '--'}</TableCell>
                            <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <IconButton
                                    onClick={() => handleSummaryTableRowDelete(index)}
                                    aria-label="delete"
                                    color="error"
                                    sx={{ fontSize: '25px' }}
                                    disabled={disableDelete}
                                >
                                    <DeleteIcon sx={{ fontSize: '20px' }} />
                                </IconButton>
                                <FormErrorMessage message={errorsDetails?.transport_types?.[index]?.name} />
                                </Box>
                            </TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                    <Typography variant='h5' color='text.primary' sx={{mt: 2 , mb: 2}}>Select Shipping Method: </Typography>
                    <RadioGroup
                        aria-labelledby="transport_mode"
                        name="transport_mode"
                        value={transportDeliveryDateData?.transport_mode}
                        onChange={(event:any) => handleTransportDeliveryDateTrackingformStateChange(event?.target?.value,'transport_mode')}
                    >
                        <FormControlLabel value="sea" disabled={!!newTransportMode} control={<Radio />} label="Sea" />
                        <FormControlLabel value="air" disabled={!!newTransportMode} control={<Radio />} label="Air" />
                        <FormControlLabel value="land" disabled={!!newTransportMode} control={<Radio />} label="Land" />
                    </RadioGroup>
                </Box>

                {(transportDeliveryDateData?.transport_mode == 'sea' || transportDeliveryDateData?.transport_mode == 'land') && (
                    <>
                        <Typography variant='h5' color='text.primary' sx={{mt: 2 , mb: 2}}>Enter Number of Containers :</Typography>
                        <RitzInput
                            name={'name'}
                            id={'container_id'}
                            sx={{ width: '15%'}}
                            selectedValue={transportDeliveryDateData?.number_of_containers}
                            handleOnChange={(event:any) => {
                                const value = event?.target?.value;
                                const intValue = parseInt(value,10);
                                if (!isNaN(intValue) && intValue >= 0 && intValue <= 10) {
                                    changeNumberOfContainers(intValue);
                                }
                        }}
                        >
                        </RitzInput>
                    </>
                )}
                
                {transportDeliveryDateData?.transport_mode !== 'air' && transportDeliveryDateData?.number_of_containers && (
                    <Table sx={{mt:'10px'}}>
                        <TableHead>
                            <TableRow
                                sx={{
                                    borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`,
                                    background: (theme) => theme.palette.grey[50],
                                }}
                            >
                                <TableCell></TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>Container</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                        {Array.isArray(transportDeliveryDateData.transport_types) && transportDeliveryDateData.transport_types.map((row, index) => (
                                <React.Fragment key={index}>
                                    <TableRow key={index}
                                            sx={{
                                                borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`,
                                                background: (theme) => theme.palette.grey[50]
                                            }}>
                                        <TableCell>
                                        <IconButton onClick={() => handleRowToggle(index)}>
                                                {expandedRows.includes(index) ? <KeyboardArrowDown /> : <KeyboardArrowRight />}
                                            </IconButton>
                                        </TableCell>
                                        <TableCell sx={{ width: '50%' }}>
                                        <Box sx={{ display: 'flex', width: '100%' }}>
                                                <Select
                                                    id={'transport_type'}
                                                    name={'transport_type'}
                                                    labelId={'transport_type'}
                                                    value={row.transport_type || ""}
                                                    onChange={(event) =>
                                                        handleTransportDeliveryDateTrackingformStateChange(event.target.value, "transport_type",index)
                                                    }
                                                    sx={{ flex: 1, minWidth: 0 }}
                                                    size={'small'}
                                                    >
                                                        {(transportDeliveryDateTrackingMetaData?.transport_types || []).map((item: any) => (
                                                            <MenuItem key={item?.id} value={item?.id}>
                                                                {item?.name}
                                                            </MenuItem>
                                                        ))}            
                                                </Select>
                                        </Box>
                                        </TableCell>
                                        <TableCell sx={{ width: '50%' }}>
                                            {
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1,width: '100%' }}>
                                                    <TextField 
                                                        id={'id'}
                                                        name={'name'}
                                                        variant="outlined"
                                                        value={row.name || ""}
                                                        onChange={(event: any) => handleTransportDeliveryDateTrackingformStateChange(event?.target?.value, 'name',index)}
                                                        sx={{ flex: 1, minWidth: 0 }}
                                                        size={'small'} 
                                                    />
                                                    {showDeleteIcon && (
                                                        <IconButton onClick={() => deleteContainerTypeData(transportDeliveryDateData.transport_types[index].id)} aria-label="delete" color='error' sx={{ fontSize: '25px'}}>
                                                            <DeleteIcon sx={{ fontSize: '20px' }} />
                                                        </IconButton>
                                                    )}
                                                </Box>
                                            }
                                        </TableCell>
                                    </TableRow>

                                    {/* Expandable Row */}
                                    <TableRow sx={{ margin: 2, padding: 2, backgroundColor: "white", borderRadius: "0px" }}>
                                        <TableCell
                                            colSpan={6}
                                            sx={{padding: 0 }}
                                            >
                                            <Collapse in={expandedRows.includes(index)} timeout="auto" unmountOnExit  sx={{ overflow: 'hidden' }}>
                                                <Table size="small" sx={{ border: '1px solid #EEEEEE', borderRadius: '4px', borderCollapse: 'collapse', width: '100%', borderSpacing: 0,marginBottom: 0,marginTop: 0 }}>
                                                    <TableHead>
                                                        <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                                                            <TableCell sx={{ padding: 1 , border: "none" }}>Delivery</TableCell>
                                                            <TableCell sx={{ padding: 1, border: "none" }}>Volume</TableCell>
                                                            <TableCell sx={{ padding: 1, border: "none" }}>Volume Unit</TableCell>
                                                            <TableCell sx={{ padding: 1, border: "none" }}>Weight</TableCell>
                                                            <TableCell sx={{ padding: 1, border: "none" }}>Weight Unit</TableCell>
                                                            <TableCell sx={{ padding: 1, border: "none" }}></TableCell>
                                                        </TableRow>
                                                    </TableHead>
                                                    <TableBody>
                                                        {row?.deliveries?.map((subrow:number, subIndex:number) => (
                                                             subrow && ( 
                                                            <TableRow key={subIndex}>
                                                                <TableCell>
                                                                    <Select
                                                                        id={'supplier_delivery_date'}
                                                                        name={'supplier_delivery_date'}
                                                                        size="small"
                                                                        sx={{ minWidth: "230px", width: "230px" }}
                                                                        value={transportDeliveryDateData?.transport_types?.[index]?.deliveries?.[subIndex]?.supplier_delivery_date || ""}
                                                                        onChange={(event) =>
                                                                            handleDeliveryStateChange(event.target.value, "supplier_delivery_date", index, subIndex)
                                                                        }
                                                                    >
                                                                        {transportDeliveryDateData?.supplier_delivery_date_objects?.map((item: any) => (
                                                                            <MenuItem key={item?.id} value={item?.id}>
                                                                                {item?.display_number}
                                                                            </MenuItem>
                                                                        ))}
                                                                    </Select>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <TextField
                                                                        id={'volume'}
                                                                        name="volume"
                                                                        size="small"
                                                                        sx={{ minWidth: "230px", width: "230px" }}
                                                                        value={transportDeliveryDateData?.transport_types?.[index]?.deliveries?.[subIndex]?.volume || ""}
                                                                        onChange={(event) =>
                                                                            handleDeliveryStateChange(event.target.value, "volume", index, subIndex)
                                                                        } 
                                                                    />
                                                                </TableCell>

                                                                <TableCell>
                                                                    <Select
                                                                        id={`volume_unit`}
                                                                        name="volume_unit"
                                                                        size="small"
                                                                        sx={{ minWidth: "230px", width: "230px" }}
                                                                        value={transportDeliveryDateData?.transport_types?.[index]?.deliveries?.[subIndex]?.volume_unit || ""}
                                                                        onChange={(event:any) =>
                                                                            handleDeliveryStateChange(event.target.value, "volume_unit", index, subIndex)
                                                                        } 
                                                                    >
                                                                        {transportDeliveryDateTrackingMetaData?.volume_units?.map((item: any) => (
                                                                            <MenuItem key={item?.unit} value={item?.unit}>
                                                                                {item?.display}
                                                                            </MenuItem>
                                                                        ))}
                                                                    </Select>
                                                                </TableCell>
                                                                
                                                                <TableCell>
                                                                    <TextField
                                                                        id={`weight`} 
                                                                        name="weight"
                                                                        size="small"
                                                                        sx={{ minWidth: "230px", width: "230px" }}
                                                                        value={transportDeliveryDateData?.transport_types?.[index]?.deliveries?.[subIndex]?.weight || ""}
                                                                        onChange={(event:any) =>
                                                                            handleDeliveryStateChange(event.target.value, "weight", index, subIndex)
                                                                        } 
                                                                    />
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Select
                                                                        id={`weight_unit`}
                                                                        name="weight_unit"
                                                                        size="small"
                                                                        sx={{ minWidth: "230px", width: "230px" }}
                                                                        value={transportDeliveryDateData?.transport_types?.[index]?.deliveries?.[subIndex]?.weight_unit || ""}
                                                                        onChange={(event:any) =>
                                                                            handleDeliveryStateChange(event.target.value, "weight_unit", index, subIndex)
                                                                        }
                                                                    >
                                                                        {transportDeliveryDateTrackingMetaData?.weight_units?.map((item: any) => (
                                                                            <MenuItem key={item?.unit} value={item?.unit}>
                                                                                {item?.display}
                                                                            </MenuItem>
                                                                        ))}
                                                                    </Select>
                                                                </TableCell>
                                                                <TableCell align="right">
                                                                    <IconButton
                                                                        onClick={() => handleDeleteDeliveryRow(index,subIndex)} 
                                                                        aria-label="delete"
                                                                        color="error"
                                                                        sx={{ fontSize: '25px' }}
                                                                    >
                                                                        <DeleteIcon sx={{ fontSize: '20px' }} />
                                                                    </IconButton>
                                                                    <IconButton onClick={() => handleAddDeliveryRow(index)} color="primary">
                                                                        <AddCircleOutline />
                                                                    </IconButton>
                                                                </TableCell>
                                                            </TableRow>
                                                        )))}
                                                    </TableBody>
                                                </Table>
                                            </Collapse>
                                        </TableCell>
                                    </TableRow>
                                </React.Fragment>
                            ))}
                        </TableBody>
                    </Table>
                )}
                
                { newTransportMode === 'air' && (
                    <Table size="small" sx={{ border: '1px solid #EEEEEE', borderRadius: '4px', borderCollapse: 'collapse', width: '100%', borderSpacing: 0,marginBottom: 0,marginTop: 0 }}>
                        <TableHead>
                            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                                <TableCell sx={{ padding: 1, border: "none" }}>Delivery</TableCell>
                                <TableCell sx={{ padding: 1, border: "none" }}>Volume</TableCell>
                                <TableCell sx={{ padding: 1, border: "none" }}>Volume Unit</TableCell>
                                <TableCell sx={{ padding: 1, border: "none" }}>Weight</TableCell>
                                <TableCell sx={{ padding: 1, border: "none" }}>Weight Unit</TableCell>
                                <TableCell sx={{ padding: 1, border: "none" }}></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {selected_deliveries?.map((row:any, index:number) => (
                                <TableRow key={index}>
                                    <TableCell>
                                        <Select
                                            id={'supplier_delivery_date'}
                                            name={'supplier_delivery_date'}
                                            size="small"
                                            sx={{ minWidth: "230px", width: "230px" }}
                                            value={transportDeliveryDateData?.air_deliveries?.[index]?.supplier_delivery_date || ""}
                                            onChange={(event) =>
                                                handleAirDeliveryStateChange(event.target.value, "supplier_delivery_date", index)
                                            }
                                        >
                                            {transportDeliveryDateData?.supplier_delivery_date_objects?.map((item: any) => (
                                                <MenuItem key={item?.id} value={item?.id}>
                                                    {item?.display_number}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                        {/* <FormErrorMessage
                                            message={
                                            errorsDetails?.transport_types?.[index]?.deliveries?.[subIndex]
                                                ?.supplier_delivery_date
                                            }
                                        /> */}
                                    </TableCell>
                                    <TableCell>
                                        <TextField
                                            id={'volume'}
                                            name="volume"
                                            size="small"
                                            sx={{ minWidth: "230px", width: "230px" }}
                                            value={transportDeliveryDateData?.air_deliveries?.[index]?.volume || ""}
                                            onChange={(event) =>
                                                handleAirDeliveryStateChange(event.target.value, "volume", index)
                                            } 
                                        />
                                        {/* <FormErrorMessage
                                            message={
                                            errorsDetails?.transport_types?.[index]?.deliveries?.[subIndex]
                                                ?.volume
                                            }
                                        /> */}
                                    </TableCell>
                                    <TableCell>
                                        <Select
                                            id={`volume_unit`}
                                            name="volume_unit"
                                            size="small"
                                            sx={{ minWidth: "230px", width: "230px" }}
                                            value={transportDeliveryDateData?.air_deliveries?.[index]?.volume_unit || ""}
                                            onChange={(event:any) =>
                                                handleAirDeliveryStateChange(event.target.value, "volume_unit", index)
                                            } 
                                        >
                                            {transportDeliveryDateTrackingMetaData?.volume_units?.map((item: any) => (
                                                <MenuItem key={item?.unit} value={item?.unit}>
                                                    {item?.display}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <TextField
                                            id={`weight`} 
                                            name="weight"
                                            size="small"
                                            sx={{ minWidth: "230px", width: "230px" }}
                                            value={transportDeliveryDateData?.air_deliveries?.[index]?.weight || ""}
                                            onChange={(event:any) =>
                                                handleAirDeliveryStateChange(event.target.value, "weight", index)
                                            } 
                                        />
                                        {/* <FormErrorMessage
                                            message={
                                            errorsDetails?.transport_types?.[index]?.deliveries?.[subIndex]
                                                ?.weight
                                            }
                                        /> */}
                                    </TableCell>
                                    <TableCell>
                                        <Select
                                            id={`weight_unit`}
                                            name="weight_unit"
                                            size="small"
                                            sx={{ minWidth: "230px", width: "230px" }}
                                            value={transportDeliveryDateData?.air_deliveries?.[index]?.weight_unit || ""}
                                            onChange={(event:any) =>
                                                handleAirDeliveryStateChange(event.target.value, "weight_unit", index)
                                            }
                                        >
                                            {transportDeliveryDateTrackingMetaData?.weight_units?.map((item: any) => (
                                                <MenuItem key={item?.unit} value={item?.unit}>
                                                    {item?.display}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </TableCell>
                                    <TableCell align="right">
                                        <IconButton
                                            onClick={() => handleDeleteAirDeliveryRow(index)} 
                                            aria-label="delete"
                                            color="error"
                                            sx={{ fontSize: '25px' }}
                                        >
                                            <DeleteIcon sx={{ fontSize: '20px' }} />
                                        </IconButton>
                                        <IconButton onClick={() => handleAddAirDeliveryRow()} color="primary">
                                            <AddCircleOutline />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}

                <Box sx={{ padding: '10px', borderRadius: '8px', marginLeft: '0px' }}>
                    <Grid container spacing={2}>
                        <Grid container item xs={12} spacing={2}>
                            <Grid item xs={12} sm={4} md={3}>
                                <Typography variant='h5' color='text.primary' sx={{mt: 2 , mb: 2}}>Vendor Door Address : </Typography>
                                <Select
                                    id={'vendor_door_address'}
                                    name={'vendor_door_address'}
                                    labelId={'vendor_door_address'}
                                    value={transportDeliveryDateData?.vendor_door_address || ''}
                                    fullWidth
                                    onChange={(event: any) => handleTransportDeliveryDateTrackingformStateChange(parseInt(event?.target?.value), 'vendor_door_address')}
                                >
                                    {transportDeliveryDateTrackingMetaData?.vendor_door_addresses.map((item: any) => (
                                        <MenuItem key={item?.id} value={item?.id}>
                                            {item?.display_address}
                                        </MenuItem>
                                    ))}
                                </Select>
                                <FormErrorMessage message={errorsDetails?.vendor_door_address}/>
                            </Grid>
                            <Grid item xs={12} sm={4} md={3}>
                                <Typography variant='h5' color='text.primary' sx={{mt: 2 , mb: 2}}>Vendor Door Expected Shipping Date : </Typography>
                                <LocalizationProvider dateAdapter={AdapterDayjs}>
                                    <DatePicker
                                        minDate={dayjs(Date.now())}
                                        format='DD/MM/YYYY'
                                        value={transportDeliveryDateData?.vendor_door_expected_shipping_date || ''}
                                        onChange={(e: any) => handleTransportDeliveryDateTrackingformStateChange(dayjs(e.$d).format('YYYY-MM-DD'),'vendor_door_expected_shipping_date')}
                                        sx={{ width: '100%' }}
                                    />
                                </LocalizationProvider>
                                <FormErrorMessage message={errorsDetails?.vendor_door_expected_shipping_date} />
                            </Grid>
                            <Grid item xs={12} sm={4} md={3}>
                                <Typography variant='h5' color='text.primary' sx={{mt: 2 , mb: 2}}>Actual Vendor Door Ship Date : </Typography>
                                <LocalizationProvider dateAdapter={AdapterDayjs}>
                                    <DatePicker
                                        minDate={dayjs(Date.now())}
                                        format='DD/MM/YYYY'
                                        value={transportDeliveryDateData?.actual_vendor_shipping_date || ''}
                                        onChange={(e: any) => handleTransportDeliveryDateTrackingformStateChange(dayjs(e.$d).format('YYYY-MM-DD'),'actual_vendor_shipping_date')}
                                        sx={{ width: '100%' }}
                                    />
                                </LocalizationProvider>
                            </Grid>
                            <Grid item xs={12} sm={4} md={3}>
                                <Typography variant='h5' color='text.primary' sx={{mt: 2 , mb: 2}}>Reason for delay: </Typography>
                                <TextareaAutosize
                                    id={`vendor_shipping_date_delay_reason`} 
                                    name="vendor_shipping_date_delay_reason"
                                    minRows={3}
                                    maxRows={6}
                                    value={transportDeliveryDateData?.vendor_shipping_date_delay_reason || ''}
                                    onChange={(event: any) => handleTransportDeliveryDateTrackingformStateChange(event?.target?.value, 'vendor_shipping_date_delay_reason')}
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
                            </Grid>
                        </Grid>
                        {newTransportMode !== 'land' && (
                            <Grid container item xs={12} spacing={2}>
                                <Grid item xs={12} sm={4} md={3}>
                                    <Typography variant='h5' color='text.primary' sx={{mt: 2 , mb: 2}}>Foreign Port : </Typography>
                                    <Select
                                        id={'foreign_port'}
                                        name={'foreign_port'}
                                        labelId={'foreign_port'}
                                        value={transportDeliveryDateData?.foreign_port || ''}
                                        fullWidth
                                        disabled={!!newForeignPort}
                                        onChange={(event: any) => handleTransportDeliveryDateTrackingformStateChange(parseInt(event?.target?.value), 'foreign_port')}
                                    >
                                        {transportDeliveryDateTrackingMetaData?.foreign_ports.map((item: any) => (
                                            <MenuItem key={item?.id} value={item?.id}>
                                                {item?.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </Grid>
                                <Grid item xs={12} sm={4} md={3}>
                                    <Typography variant='h5' color='text.primary' sx={{mt: 2 , mb: 2}}>Foreign Port Expected Date : </Typography>
                                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                                        <DatePicker
                                            minDate={dayjs(Date.now())}
                                            format='DD/MM/YYYY'
                                            value={transportDeliveryDateData?.foreign_port_expected_date || ''}
                                            onChange={(e: any) => handleTransportDeliveryDateTrackingformStateChange(dayjs(e.$d).format('YYYY-MM-DD'),'foreign_port_expected_date')}
                                            sx={{ width: '100%' }}
                                        />
                                    </LocalizationProvider>
                                </Grid>
                                <Grid item xs={12} sm={4} md={3}>
                                    <Typography variant='h5' color='text.primary' sx={{mt: 2 , mb: 2}}>Actual Foreign Port Date : </Typography>
                                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                                        <DatePicker
                                            minDate={dayjs(Date.now())}
                                            format='DD/MM/YYYY'
                                            value={transportDeliveryDateData?.actual_foreign_port_date || ''}
                                            onChange={(e: any) => handleTransportDeliveryDateTrackingformStateChange(dayjs(e.$d).format('YYYY-MM-DD'),'actual_foreign_port_date')}
                                            sx={{ width: '100%' }}
                                        />
                                    </LocalizationProvider>
                                </Grid>
                                <Grid item xs={12} sm={4} md={3}>
                                    <Typography variant='h5' color='text.primary' sx={{mt: 2 , mb: 2}}>Reason for delay: </Typography>
                                    <TextareaAutosize
                                        id={`foreign_port_date_delay_reason`} 
                                        name="foreign_port_date_delay_reason"
                                        minRows={3}
                                        maxRows={6}
                                        value={transportDeliveryDateData?.foreign_port_date_delay_reason || ''}
                                        onChange={(event: any) => handleTransportDeliveryDateTrackingformStateChange(event?.target?.value, 'foreign_port_date_delay_reason')}
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
                                </Grid>
                            </Grid>
                        )}
                        {newTransportMode !== 'land' && (
                        <Grid container item xs={12} spacing={2}>
                            <Grid item xs={12} sm={4} md={3}>
                                <Typography variant='h5' color='text.primary' sx={{mt: 2 , mb: 2}}>Local Port : </Typography>
                                <Select
                                    id={'local_port'}
                                    name={'local_port'}
                                    labelId={'local_port'}
                                    value={transportDeliveryDateData?.local_port || ''}
                                    fullWidth
                                    disabled={!!newLocalPort}
                                    onChange={(event: any) => handleTransportDeliveryDateTrackingformStateChange(parseInt(event?.target?.value), 'local_port')}
                                >
                                    {transportDeliveryDateTrackingMetaData?.local_ports.map((item: any) => (
                                        <MenuItem key={item?.id} value={item?.id}>
                                            {item?.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </Grid>
                            <Grid item xs={12} sm={4} md={3}>
                                <Typography variant='h5' color='text.primary' sx={{mt: 2 , mb: 2}}>Local Port Expected Date : </Typography>
                                <LocalizationProvider dateAdapter={AdapterDayjs}>
                                    <DatePicker
                                        minDate={dayjs(Date.now())}
                                        format='DD/MM/YYYY'
                                        value={transportDeliveryDateData?.local_port_expected_date || ''}
                                        onChange={(e: any) => handleTransportDeliveryDateTrackingformStateChange(dayjs(e.$d).format('YYYY-MM-DD'),'local_port_expected_date')}
                                        sx={{ width: '100%' }}
                                    />
                                </LocalizationProvider>
                            </Grid>
                            <Grid item xs={12} sm={4} md={3}>
                                <Typography variant='h5' color='text.primary' sx={{mt: 2 , mb: 2}}>Actual Local Port Date : </Typography>
                                <LocalizationProvider dateAdapter={AdapterDayjs}>
                                    <DatePicker
                                        minDate={dayjs(Date.now())}
                                        format='DD/MM/YYYY'
                                        value={transportDeliveryDateData?.actual_local_port_date || ''}
                                        onChange={(e: any) => handleTransportDeliveryDateTrackingformStateChange(dayjs(e.$d).format('YYYY-MM-DD'),'actual_local_port_date')}
                                        sx={{ width: '100%' }}
                                    />
                                </LocalizationProvider>
                            </Grid>
                            <Grid item xs={12} sm={4} md={3}>
                            <Typography variant='h5' color='text.primary' sx={{mt: 2 , mb: 2}}>Reason for delay: </Typography>
                            <TextareaAutosize
                                id={`local_port_date_delay_reason`} 
                                name="local_port_date_delay_reason"
                                minRows={3}
                                maxRows={6}
                                value={transportDeliveryDateData?.local_port_date_delay_reason|| ''}
                                onChange={(event: any) => handleTransportDeliveryDateTrackingformStateChange(event?.target?.value, 'local_port_date_delay_reason')}
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
                            </Grid>
                        </Grid>
                        )}
                        <Grid container item xs={12} spacing={2}>
                            <Grid item xs={12} sm={4} md={3}>
                                <Typography variant='h5' color='text.primary' sx={{mt: 2 , mb: 2}}>Forwarder : </Typography>
                                <Select
                                    id={'freight_forwarder'}
                                    name={'freight_forwarder'}
                                    labelId={'freight_forwarder'}
                                    value={transportDeliveryDateData?.freight_forwarder || ''}
                                    fullWidth
                                    disabled={!!newForwarder}
                                    onChange={(event: any) => handleTransportDeliveryDateTrackingformStateChange(event?.target?.value, 'freight_forwarder')}
                                >
                                    {transportDeliveryDateTrackingMetaData?.freight_forwarders.map((item: any) => (
                                        <MenuItem key={item?.id} value={item?.id}>
                                            {item?.supplier_details?.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                                <FormErrorMessage message={errorsDetails?.type} />
                            </Grid>
                            <Grid item xs={12} sm={4} md={3}>
                                <Typography variant='h5' color='text.primary' sx={{mt: 2 , mb: 2}}>Expected Delivery Date : </Typography>
                                <LocalizationProvider dateAdapter={AdapterDayjs}>
                                    <DatePicker
                                        minDate={dayjs(Date.now())}
                                        format='DD/MM/YYYY'
                                        value={transportDeliveryDateData?.expected_delivery_date || ''}
                                        onChange={(e: any) => handleTransportDeliveryDateTrackingformStateChange(dayjs(e.$d).format('YYYY-MM-DD'),'expected_delivery_date')}
                                        sx={{ width: '100%' }}
                                    />
                                </LocalizationProvider>
                            </Grid>
                            <Grid item xs={12} sm={4} md={3}>
                                <Typography variant='h5' color='text.primary' sx={{mt: 2 , mb: 2}}>Actual Expected Delivery Date : </Typography>
                                <LocalizationProvider dateAdapter={AdapterDayjs}>
                                    <DatePicker
                                        minDate={dayjs(Date.now())}
                                        format='DD/MM/YYYY'
                                        value={transportDeliveryDateData?.actual_expected_delivery_date || ''}
                                        onChange={(e: any) => handleTransportDeliveryDateTrackingformStateChange(dayjs(e.$d).format('YYYY-MM-DD'),'actual_expected_delivery_date')}
                                        sx={{ width: '100%' }}
                                    />
                                </LocalizationProvider>
                            </Grid>
                            <Grid item xs={12} sm={4} md={3}>
                                <Typography variant='h5' color='text.primary' sx={{mt: 2 , mb: 2}}>Reason for delay: </Typography>
                                <TextareaAutosize
                                    id={`expected_delivery_date_delay_reason`} 
                                    name="expected_delivery_date_delay_reason"
                                    minRows={3}
                                    maxRows={6}
                                    value={transportDeliveryDateData?.expected_delivery_date_delay_reason || ''}
                                    onChange={(event: any) => handleTransportDeliveryDateTrackingformStateChange(event?.target?.value, 'expected_delivery_date_delay_reason')}
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
                            </Grid>
                        </Grid>

                        <Grid container item xs={12} spacing={2}>
                            <Grid item xs={12} sm={4} md={3}>
                                <Typography variant='h5' color='text.primary' sx={{mt: 2 , mb: 2}}> Local Warehouse : </Typography>
                                <Select
                                    id={'freight_forwarder_local_warehouse'}
                                    name={'freight_forwarder_local_warehouse'}
                                    labelId={'freight_forwarder_local_warehouse'}
                                    value={transportDeliveryDateData?.freight_forwarder_local_warehouse || ''}
                                    fullWidth
                                    onChange={(event: any) => handleTransportDeliveryDateTrackingformStateChange(event?.target?.value, 'freight_forwarder_local_warehouse')}
                                >
                                    {warehouses.map((warehouse: any) => (
                                        <MenuItem key={warehouse?.id} value={warehouse?.id}>
                                            {warehouse?.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                                <FormErrorMessage message={errorsDetails?.freight_forwarder_local_warehouse}/>
                            </Grid> 
                            <Grid item xs={12} sm={4} md={3}>
                                <Typography variant='h5' color='text.primary' sx={{mt: 2 , mb: 2}}>Type : </Typography>
                                <Select
                                    id={'type'}
                                    name={'type'}
                                    labelId={'type'}
                                    value={transportDeliveryDateData?.type}
                                    fullWidth
                                    onChange={(event: any) => handleTransportDeliveryDateTrackingformStateChange(event?.target?.value, 'type')}
                                >
                                    {transportDeliveryDateTrackingMetaData?.types.map((item: any) => (
                                        <MenuItem key={item?.type} value={item?.type}>
                                            {item?.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </Grid>
                        </Grid>
                    </Grid>
                </Box>
            </Card>

            {
                <RitzModal
                    open={showLastRowDeleteRestrictError?.showLastRowDeleteRestrictError}
                    onClose={() => updateErrorState("showLastRowDeleteRestrictError", false)}
                    maxWidth= 'xs'
                    title={"Confirmation"}>
                        <Typography variant='h5' color='text.primary' sx={{mt: 2 , mb: 2}}>You can't delete the last remaining item !</Typography>
                        <Button
                            variant="contained"
                            style={{ marginLeft: 'auto', marginTop: '20px', display: 'block' }}
                            onClick={() => updateErrorState("showLastRowDeleteRestrictError", false)}
                            >
                            OK
                        </Button>
                        
                </RitzModal>
            }

            {
                <RitzModal
                    open={showLastRowDeleteRestrictError?.showDeleteRowError}
                    onClose={() => updateErrorState("showDeleteRowError", false)}
                    maxWidth= 'xs'
                    title={"Confirmation"}>
                        <Typography variant='h5' color='text.primary' sx={{mt: 2 , mb: 2}}>Please delete the unwanted items !</Typography>
                        <Button
                            variant="contained"
                            style={{ marginLeft: 'auto', marginTop: '20px', display: 'block' }}
                            onClick={() => updateErrorState("showDeleteRowError", false)}
                            >
                            OK
                        </Button>
                        
                </RitzModal>
            }
            
            <Button 
                variant="contained" 
                style={{ marginLeft: 'auto', marginTop: '20px', display: 'block' }}
                onClick={() => transportDeliveryDateTrackingFormSave()}
            >
                Submit
            </Button>
        </>
    );
}
export default TransportDeliveryChange;
