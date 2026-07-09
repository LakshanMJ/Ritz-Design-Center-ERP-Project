import FormErrorMessage from "@/components/FormErrorMessage";
import { Alert, Box, Button, Card, Collapse, Grid, IconButton, MenuItem, Select, Table, TableBody, TableCell, TableHead, TableRow, TextareaAutosize, TextField, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import RitzInput from "@/components/Ritz/RitzInput";
import DeleteIcon from '@mui/icons-material/Delete';
import toast from "react-hot-toast";
import * as TransportUrls from '@/helpers/constants/rest_urls/TransportUrls';
import { getDefaultError } from "@/helpers/Utilities";
import { AddCircleOutline} from "@mui/icons-material";
import { KeyboardArrowRight, KeyboardArrowDown } from "@mui/icons-material";
import React from "react";
import { DEFAULT_SUCCESS } from "@/helpers/constants/Constants";
import api from "@/services/api";

interface LCLDetails {
    id: number;
    container: any;
    volume: any;
    volume_unit: any;
}

interface PickupLocation {
    id: number;
    pickup_order: any;
    address_line_1: string;
    address_line_2: string;
    city: any;
    country: any;
    [key: string]: any;
}

interface Destination {
    id: number;
    drop_off_order: any;
    address_line_1: string;
    address_line_2: string;
    city: any;
    country: any;
}

interface VehicleType {
    id: number;
    isOpen: boolean;
    vehicle_type: any;
    distance: any;
    distance_unit: any;
    price_per_distance: number;
    price_per_distance_currency: any;
    driver_name: string;
    driver_contact_number: string;
    vehicle_registration_number: string;
    instructions: string;
    lcl_details: LCLDetails[];
    pickup_locations: PickupLocation[];
    destinations: Destination[];
}

interface LclConsolidationData {
    number_of_vehicles: number;
    total_cost: any;
    delivery_transport_types: [];
    vehicle_types: VehicleType[];
    state: string;
    state_choises: any[];
}

interface TransportMetaData{
    vehicle_types: { id: number; type: string; name: string; }[];
    distance_units: { id: number; unit: string; display: string; }[];
    containers: { id: number; name: string; }[];
    pickup_locations: { id: number; name: string; }[];
    destinations: { id: number; name: string; }[];
    currencies: { currency: string; display: string; }[];
    volume_units: { unit: string; display: string; }[];
    country_data: { id: number; name: string; }[];
}

interface Delivery {
    id: number;
    display_number: string;
}

const LocalTransportDeliveryChange = ({
            selectedDeliveries,
            handleSelectedDeliveryStatusAndDeliveries,
            selectedDeliveryIds,
            selected_deliveries,
            transportVehicleTrackingId,
            closeModal,
            fetchData,
            fetchTransportDeliveryCounts,
            reason,
            remarks,
            } : {
                selectedDeliveries?: any[], 
                handleSelectedDeliveryStatusAndDeliveries?: any,
                selectedDeliveryIds?:any,
                selected_deliveries: Delivery[];
                transportVehicleTrackingId: number,
                closeModal:any,
                fetchData:any,
                fetchTransportDeliveryCounts:any,
                newTransportMode?:any,
                newLocalPort?:any,
                newForeignPort?:any,
                newForwarder?:any,
                reason:any,
                remarks:any, }) => {
                    
    const [lclConsolidationData, setLclConsolidationData] = useState<LclConsolidationData>({
        number_of_vehicles: null,
        total_cost: null,
        delivery_transport_types: [],
        vehicle_types: [],
        state: '',
        state_choises: []
    });
    const [showNumberOfVehicleChangeAlert, setShowNumberOfVehicleChangeAlert] = useState(false);
    const [errorsDetails, setErrorDetails] = useState<any>({});
    const [showDeleteIcon, setShowDeleteIcon] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [transportDeliveryDateTrackingMetaData, setTransportDeliveryDateTrackingMetaData] = useState<TransportMetaData>({
        vehicle_types: [],
        distance_units: [],
        containers: [],
        pickup_locations: [],
        destinations: [],
        currencies: [],
        volume_units: [],
        country_data: [],
    });
    const sriLanka = transportDeliveryDateTrackingMetaData?.country_data?.find(
        (item: any) => item.name === "Sri Lanka"
    )?.id || "";

    const fetchTransportDeliveryDateTrackingMetaData = () => {
        Promise.all([
            api.get(TransportUrls.transportDeliveryDateTrackingMetaData()),
            api.get(TransportUrls.locationCountriesURL()),
            api.get(TransportUrls.vehicleTypesURL()),
        ])
            .then(([
                metaDataResp,
                countryDataResp, 
                vehicleTypesDataResp
            ]) => {
                const metaData = metaDataResp.data;
                const country_data = countryDataResp.data;
                const vehicle_types = vehicleTypesDataResp.data;

                setTransportDeliveryDateTrackingMetaData({ 
                    ...metaData,
                    country_data,
                    vehicle_types
                });
            })
            .catch((error) => {
                toast.error(getDefaultError(error?.response?.status));
            });
    };

    const createTransportFormSave = () => {
        setIsSaving(true);
        const apiUrl = transportVehicleTrackingId
            ?  TransportUrls.LocaltransportDeliveryDateTrackingChangeCreateUrl(true,transportVehicleTrackingId)
            : TransportUrls.deliveryTransportTypeVehicleCreate();

        const apiMethod = api.post;
        const data = {
            ...lclConsolidationData,
            delivery_transport_types: selected_deliveries.map((delivery: Delivery) => delivery.id),
            selectedDeliveries: selected_deliveries
        };

        apiMethod(apiUrl, data)
            .then(resp => {
                toast.success(DEFAULT_SUCCESS);
                closeModal();
                fetchData();
                fetchTransportDeliveryCounts();
            })
            .catch(error => {
                setErrorDetails({ ...error?.response?.data });
            })
            .finally(() => setIsSaving(false));
    };

    const fetchLocalDeliveryTransportTrackingDetail = () => {
        Promise.all([
            api.get(TransportUrls.localDeliveryTransportTrackingDetail(transportVehicleTrackingId))
        ])
            .then(([
                transportTrackingDetailResp,
            ]) => {
                const TrackingData = transportTrackingDetailResp.data;
                setLclConsolidationData(prevState => ({
                    ...prevState,
                    state_choises: TrackingData.state_choises
                }));
            })
            .catch((error) => {
                toast.error(getDefaultError(error?.response?.status));
            });
    };

    const changeNumberOfVehicles = (value: number) => {
        setLclConsolidationData((prevData:any) => {
            const existingVehicles = prevData.vehicle_types || [];

            if (value > existingVehicles.length) {
                return {
                    ...prevData,
                    number_of_vehicles: value,
                    vehicle_types: [
                        ...existingVehicles,
                        ...Array.from({ length: value - existingVehicles.length }, (value, index) => ({
                            id: existingVehicles.length + index + 1,
                            isOpen: false as any,
                            vehicle_type: null as any,
                            distance: null as any,
                            distance_unit: null as any,
                            lcl_details: [
                                {
                                    id: null as any,
                                    delivery_transport_type:null as any,
                                    container: null as any,
                                    volume: null as any,
                                    volume_unit: "cubic_meters"
                                }
                            ],
                            pickup_locations: [
                                {
                                    id: null as any,
                                    pickup_order: null as any,
                                    address_line_1: '',
                                    address_line_2: '',
                                    city: null as any,
                                    country: 179
                                }
                            ],
                            destinations: [
                                {
                                    id: null as any,
                                    drop_off_order: null as any,
                                    address_line_1: '',
                                    address_line_2: '',
                                    city: null as any,
                                    country: 179
                                }
                            ]
                        }))
                    ]
                };
            } else if (value < existingVehicles.length) {
                setShowNumberOfVehicleChangeAlert(true);
                setShowDeleteIcon(true);
                return prevData;
            }
            return prevData;
        });
    };


    const handleLCLDeliveryConsolidationFormStateChange = (
        value: any, 
        section: string, 
        field: string, 
        vehicleTypeId?: number, 
        subRowId?: number
    ) => {
        setLclConsolidationData((prevState: any) => {
        if (!vehicleTypeId && !subRowId) {
            return {
            ...prevState,
            [field]: value, 
            };
        }
        return {
            ...prevState,
            vehicle_types: prevState.vehicle_types.map((vehicle: any) => {
            if (vehicle.id === vehicleTypeId) {
            
                if (section === 'lcl_details') {
                return {
                    ...vehicle,
                    lcl_details: vehicle.lcl_details.map((subRow: any) => {
                    if (subRow.id === subRowId) {
                    
                        if (field === 'container') {
                        
                        return { 
                            ...subRow,
                            container: value, 
                            delivery_transport_type: value
                        };
                        }
                        if (field === 'delivery_transport_type') {
                
                        return { 
                            ...subRow,
                            delivery_transport_type: value 
                        };
                        }
            
                        return { ...subRow, [field]: value };
                    }
                    return subRow; 
                    }),
                };
                }
    
                if (section === 'pickup_locations') {
                return {
                    ...vehicle,
                    pickup_locations: vehicle.pickup_locations.map((pickup: any) => {
                    if (pickup.id === subRowId) {
                        return { ...pickup, [field]: value };
                    }
                    return pickup; 
                    }),
                };
                }
    
                if (section === 'destinations') {
                return {
                    ...vehicle,
                    destinations: vehicle.destinations.map((destination: any) => {
                    if (destination.id === subRowId) {
                        return { ...destination, [field]: value };
                    }
                    return destination; 
                    }),
                };
                }
                return { ...vehicle, [field]: value };
            }
            return vehicle; 
            }),
        };
        });
    };

    const handleVehicleDetailsTableSubrowToggle = (id: number) => {
        setLclConsolidationData((prevData) => {
            const updatedVehicles = prevData.vehicle_types.map((vehicle) => {
                if (vehicle.id === id) {
                    return { ...vehicle, isOpen: !vehicle.isOpen };
                }
                return vehicle;
            });
            return { ...prevData, vehicle_types: updatedVehicles };
        });
    };

    const addSubRowToAVehicle = (vehicleTypeId: number, section: string) => {
        setLclConsolidationData((prevState: any) => {
            return {
                ...prevState,
                vehicle_types: prevState.vehicle_types.map((vehicle: any) => {
                    if (vehicle.id === vehicleTypeId) {
                        return {
                            ...vehicle,
                            [section]: [
                                ...vehicle[section],
                                section === "lcl_details"
                                    ? {
                                        id: vehicle.lcl_details.length + 1,
                                        delivery_transport_type: null,
                                        container: null,
                                        volume: null,
                                        volume_unit: null,
                                    }
                                    : section === "pickup_locations"
                                        ? {
                                            id: vehicle.pickup_locations.length + 1,
                                            pickup_order: null,
                                            address_line_1: "",
                                            address_line_2: "",
                                            city: null,
                                            country: null,
                                        }
                                        : section === "destinations"
                                            ? {
                                                id: vehicle.destinations.length + 1,
                                                drop_off_order: null,
                                                address_line_1: "",
                                                address_line_2: "",
                                                city: null,
                                                country: null,
                                            }
                                            : {},
                            ],
                        };
                    }
                    return vehicle;
                }),
            };
        });
    };

    const deleteSubRowFromAVehicle = (vehicleTypeId: number, section: string, subRowId: number) => {
        setLclConsolidationData((prevState: any) => {
            return {
                ...prevState,
                vehicle_types: prevState.vehicle_types.map((vehicle: any) => {
                    if (vehicle.id === vehicleTypeId) {
                        const sectionData = vehicle[section];

                        if (sectionData.length === 1) {
                            return vehicle;
                        }
                        
                        return {
                            ...vehicle,
                            [section]: sectionData.filter((subRow: any) => subRow.id !== subRowId),
                        };
                    }
                    return vehicle;
                }),
            };
        });
    };
    
    const deleteVehicleDataRows = (vehicleId: number) => {
        setShowNumberOfVehicleChangeAlert(false);
        setLclConsolidationData((prevData) => {
            const updatedVehicles = prevData.vehicle_types.filter((vehicle) => vehicle.id !== vehicleId);
            return {
                ...prevData,
                number_of_vehicles: updatedVehicles.length,
                vehicle_types: updatedVehicles,
            };
        });
    };

    const handleDeleteSelectedLCLRows = (indexToRemove: number) => {
        if (selectedDeliveries.length === 1) {
            return;
        }
        const updatedDeliveries = selectedDeliveries.filter((value, index) => index !== indexToRemove);
        handleSelectedDeliveryStatusAndDeliveries('selectedDeliveries', updatedDeliveries);
    };

    const getTotalCost = () => {
        const total = lclConsolidationData?.vehicle_types.reduce((sum, item) => {
            return sum + (item?.distance * item?.price_per_distance || 0);
        }, 0);

        setLclConsolidationData(prevData => ({
            ...prevData,
            total_cost: total
        }));
    }

    useEffect(() => {
        fetchTransportDeliveryDateTrackingMetaData()
    }, [])

    useEffect(() => {
        if (transportVehicleTrackingId != null) {
            fetchLocalDeliveryTransportTrackingDetail();
        }
    }, [transportVehicleTrackingId]);

    useEffect(() => {
        getTotalCost()
    }, [lclConsolidationData?.vehicle_types])

    return (
        <>
            <Table sx={{
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
                        <TableCell>Number</TableCell>
                        <TableCell>Customer</TableCell>
                        <TableCell>PO Club</TableCell>
                        <TableCell>Supplier</TableCell>
                        <TableCell>Incoterms</TableCell>
                        <TableCell>Items</TableCell>
                        <TableCell>Volume</TableCell>
                        <TableCell>Volume Unit</TableCell>
                        <TableCell>Weight</TableCell>
                        <TableCell>Weight Unit</TableCell>
                        <TableCell>Freight Forwarder</TableCell>
                        <TableCell>Warehouse</TableCell>
                        <TableCell></TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                {selected_deliveries?.map((item:any, index:number) => {
                    const rowData = item;
                    return (
                        <TableRow key={index} sx={{ borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`, background: (theme) => (index % 2 === 0 ? theme.palette.grey[250] : theme.palette.white) }}>
                            <TableCell>{rowData?.display_number || '--'}</TableCell>
                            <TableCell>{rowData?.customers?.join(", ") || '--'}</TableCell>
                            <TableCell>{rowData?.po_clubs?.join(',') || '--'}</TableCell>
                            <TableCell>{rowData?.suppliers?.join(", ") || '--'}</TableCell>
                            <TableCell>{rowData?.incoterms?.join(',') || '--'}</TableCell>
                            <TableCell>{rowData?.items?.join(',') || '--'}</TableCell>
                            <TableCell>{rowData?.volume?.volume || '--'}</TableCell>
                            <TableCell>{rowData?.volume?.volume_unit_display || '--'}</TableCell>
                            <TableCell>{rowData?.weight?.weight || '--'}</TableCell>
                            <TableCell>{rowData?.weight?.weight_unit_display || '--'}</TableCell>
                            <TableCell>{rowData?.freight_forwarder || '--'}</TableCell>
                            <TableCell>{rowData?.warehouse || '--'}</TableCell>
                            <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <IconButton
                                        onClick={() => handleDeleteSelectedLCLRows(index)} aria-label="delete" color='error' sx={{ fontSize: '25px' }}
                                    >
                                        <DeleteIcon sx={{ fontSize: '20px' }} />
                                    </IconButton>
                                    <FormErrorMessage message={errorsDetails?.transport_types?.[index]?.name} />
                                </Box>
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
            </Table>
            <Card
                sx={{
                    marginRight: 'auto',
                    padding: '20px',
                    border: (theme) => `1px solid ${theme.palette.grey[300]}`,
                    borderRadius: '8px'
                }}
            >
                <Box sx={{ padding: '10px', borderRadius: '8px', marginLeft: '0px' }}>
                    <Grid container item xs={12} spacing={2}>
                        <Grid item xs={12} sm={4} md={3}>
                            <Typography variant='h5' color='text.primary' sx={{ mt: 2, mb: 2 }}>Enter Number of Vehicles : </Typography>
                            <RitzInput
                                name={'name'}
                                id={'id'}
                                fullWidth
                                selectedValue={lclConsolidationData?.number_of_vehicles}
                                handleOnChange={(event: any) => {
                                    const value = event?.target?.value;
                                    const intValue = parseInt(value, 10);
                                    if (!isNaN(intValue) && intValue >= 0 && intValue <= 10) {
                                        changeNumberOfVehicles(intValue);
                                    }
                                }}
                            >
                            </RitzInput>

                            {showNumberOfVehicleChangeAlert && (
                                <FormErrorMessage message={'Please remove a vehicle manually using the delete icon'} />
                            )}

                        </Grid>
                        <Grid item xs={12} sm={4} md={3}>
                            <Typography variant='h5' color='text.primary' sx={{ mt: 2, mb: 2 }}>Total Cost : </Typography>
                            <Box >
                                <RitzInput
                                    name={'total_cost'}
                                    id={'total_cost'}
                                    fullWidth
                                    selectedValue={lclConsolidationData?.total_cost}
                                    handleOnChange={(event: any) =>
                                        handleLCLDeliveryConsolidationFormStateChange(
                                            parseInt(event.target.value),
                                            '',
                                            'total_cost'
                                        )
                                    }
                                    isReadOnly={true}
                                >
                                </RitzInput>
                            </Box>
                        </Grid>
                        {transportVehicleTrackingId && (
                            <Grid item xs={12} sm={4} md={3}>
                                <Typography variant='h5' color='text.primary' sx={{ mt: 2, mb: 2 }}>State : </Typography>
                                <Select
                                    id={'state'}
                                    name={'state'}
                                    labelId={'state'}
                                    value={lclConsolidationData?.state ?? ''}
                                    sx={{minWidth: "400px" }}
                                    fullWidth
                                    onChange={(event: any) => {
                                        handleLCLDeliveryConsolidationFormStateChange(
                                            event.target.value,
                                            '',
                                            'state'
                                        )
                                    }}
                                >
                                    {lclConsolidationData?.state_choises?.map((item: any) => (
                                        <MenuItem key={item?.value} value={item?.value}>
                                            {item?.display}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </Grid>
                        )}
                        
                    </Grid>
                
                    <Grid container spacing={2}>
                        <Grid container item xs={12} spacing={2}>
                            {lclConsolidationData?.number_of_vehicles && (
                                <Table sx={{ tableLayout: "fixed", width: "100%", border: '1px solid #ddd', borderRadius: '0px', size: 'small', ml: '16px', mt: '40px' }}>
                                    <TableHead
                                        sx={{
                                            borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`,
                                            background: (theme) => theme.palette.grey[300],
                                        }}
                                    >
                                        <TableRow>
                                            <TableCell sx={{ width: '5%' }}/>
                                            <TableCell sx={{ width: '15%' }}>Vehicle Type</TableCell>
                                            <TableCell sx={{ width: '15%' }}>Distance</TableCell>
                                            <TableCell sx={{ width: '15%' }}>Distance Unit</TableCell>
                                            <TableCell sx={{ width: '15%' }}>Price Per Distance</TableCell>
                                            <TableCell sx={{ width: '15%' }}>Price Per Distance Unit</TableCell>
                                            <TableCell sx={{ width: '15%' }}>Driver name</TableCell>
                                            <TableCell sx={{ width: '15%' }}>Driver Contact Number</TableCell>
                                            <TableCell sx={{ width: '15%' }}>Vehicle Registration Number</TableCell>
                                            <TableCell sx={{ width: '15%' }}>Instructions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody
                                        sx={{ backgroundColor: "#f5f5f5" }}>
                                        {lclConsolidationData?.vehicle_types.map((row) => (
                                            <React.Fragment key={row.id}>
                                                <TableRow>
                                                    <TableCell>
                                                        <IconButton onClick={() => handleVehicleDetailsTableSubrowToggle(row.id)}>
                                                            {row.isOpen ? <KeyboardArrowDown /> : <KeyboardArrowRight />}
                                                        </IconButton>
                                                    </TableCell>
                                                    <TableCell sx={{ width: 'auto', maxWidth: '200px' }}>
                                                        <Select
                                                            id={'vehicle_type'}
                                                            name={'vehicle_type'}
                                                            labelId={'vehicle_type'}
                                                            value={row?.vehicle_type || ''}
                                                            size="small"
                                                            sx={{ width: '100%' }}
                                                            onChange={(event) =>
                                                                handleLCLDeliveryConsolidationFormStateChange(
                                                                    event.target.value,
                                                                    '',
                                                                    'vehicle_type',
                                                                    row?.id,
                                                                )
                                                            }
                                                        >
                                                            {transportDeliveryDateTrackingMetaData?.vehicle_types?.map((item: any) => (
                                                                <MenuItem key={item?.id} value={item?.id}>
                                                                    {item?.name}
                                                                </MenuItem>
                                                            ))}
                                                        </Select>
                                                        <FormErrorMessage message={errorsDetails?.vehicle_types?.[row?.id-1]?.vehicle_type}/>
                                                    </TableCell>
                                                    <TableCell
                                                    sx={{ width: 'auto', maxWidth: '200px' }}>
                                                        <TextField
                                                            size="small"
                                                            id={'distance'}
                                                            name={'distance'}
                                                            sx={{ width: '100%' }}
                                                            value={row?.distance || ''}
                                                            onChange={(event) =>
                                                                handleLCLDeliveryConsolidationFormStateChange(
                                                                    parseInt(event.target.value),
                                                                    '',
                                                                    'distance',
                                                                    row?.id,
                                                                )
                                                            }
                                                        />
                                                        <FormErrorMessage message={errorsDetails?.vehicle_types?.[row?.id-1]?.distance}/>
                                                    </TableCell>
                                                    <TableCell
                                                    sx={{ width: 'auto', maxWidth: '200px' }}>
                                                        <Select
                                                            id={'distance_unit'}
                                                            name={'distance_unit'}
                                                            labelId={'distance_unit'}
                                                            value={row?.distance_unit || ''}
                                                            size="small"
                                                            sx={{ width: '100%' }}
                                                            onChange={(event) =>
                                                                handleLCLDeliveryConsolidationFormStateChange(
                                                                    event.target.value,
                                                                    '',
                                                                    'distance_unit',
                                                                    row?.id,
                                                                )
                                                            }
                                                        >
                                                            {transportDeliveryDateTrackingMetaData?.distance_units?.map((item: any) => (
                                                                <MenuItem key={item?.unit} value={item?.unit}>
                                                                    {item?.display}
                                                                </MenuItem>
                                                            ))}
                                                        </Select>
                                                        <FormErrorMessage message={errorsDetails?.vehicle_types?.[row?.id-1]?.distance_unit}/>
                                                    </TableCell>
                                                    <TableCell
                                                     sx={{ width: 'auto', maxWidth: '200px' }}
                                                     >
                                                        <Box sx={{ width: '170px' }}>
                                                            <RitzInput
                                                                name={'price_per_distance'}
                                                                id={'price_per_distance'}
                                                                size="small"
                                                                sx={{ width: '100%' }}
                                                                selectedValue={row?.price_per_distance}
                                                                handleOnChange={(event: any) =>
                                                                    handleLCLDeliveryConsolidationFormStateChange(
                                                                        parseInt(event.target.value),
                                                                        '',
                                                                        'price_per_distance',
                                                                        row?.id,
                                                                    )
                                                                }
                                                            >
                                                            </RitzInput>
                                                        </Box>
                                                        <FormErrorMessage message={errorsDetails?.vehicle_types?.[row?.id-1]?.price_per_distance}/>
                                                    </TableCell>
                                                    <TableCell
                                                    sx={{ width: 'auto', maxWidth: '200px' }}
                                                    >
                                                        <Box sx={{ width: '170px' }}>
                                                            <Select
                                                                id={'price_per_distance_currency'}
                                                                name={'price_per_distance_currency'}
                                                                labelId={'price_per_distance_currency'}
                                                                value={row?.price_per_distance_currency || ''}
                                                                sx={{ width: '100%' }}
                                                                size="small"
                                                                onChange={(event: any) =>
                                                                    handleLCLDeliveryConsolidationFormStateChange(
                                                                        event.target.value,
                                                                        '',
                                                                        'price_per_distance_currency',
                                                                        row?.id,
                                                                    )
                                                                }
                                                            >
                                                                {transportDeliveryDateTrackingMetaData?.currencies?.map((item: any) => (
                                                                    <MenuItem key={item?.currency} value={item?.currency}>
                                                                        {item?.display}
                                                                    </MenuItem>
                                                                ))}
                                                            </Select>
                                                        </Box>
                                                        <FormErrorMessage message={errorsDetails?.vehicle_types?.[row?.id-1]?.price_per_distance_currency}/>
                                                    </TableCell>
                                                    <TableCell
                                                    sx={{ width: 'auto', maxWidth: '200px' }}
                                                    >
                                                        <Box sx={{ width: '170px' }}>
                                                            <RitzInput
                                                                name={'driver_name'}
                                                                id={'driver_name'}
                                                                fullWidth
                                                                size="small"
                                                                selectedValue={row?.driver_name || ''}
                                                                handleOnChange={(event: any) =>
                                                                    handleLCLDeliveryConsolidationFormStateChange(
                                                                        event.target.value,
                                                                        '',
                                                                        'driver_name',
                                                                        row?.id,
                                                                    )
                                                                }
                                                            >
                                                            </RitzInput>
                                                        </Box>
                                                        <FormErrorMessage message={errorsDetails?.vehicle_types?.[row?.id-1]?.driver_name}/>
                                                    </TableCell>
                                                    <TableCell
                                                    sx={{ width: 'auto', maxWidth: '200px' }}
                                                    >
                                                        <Box sx={{ width: '170px' }}>
                                                            <RitzInput
                                                                name={'driver_contact_number'}
                                                                id={'driver_contact_number'}
                                                                fullWidth
                                                                size="small"
                                                                selectedValue={row?.driver_contact_number || ''}
                                                                handleOnChange={(event: any) =>
                                                                    handleLCLDeliveryConsolidationFormStateChange(
                                                                        event.target.value,
                                                                        '',
                                                                        'driver_contact_number',
                                                                        row?.id,
                                                                    )
                                                                }
                                                            >
                                                            </RitzInput>
                                                        </Box>
                                                        <FormErrorMessage message={errorsDetails?.vehicle_types?.[row?.id-1]?.driver_contact_number}/>
                                                    </TableCell>
                                                    <TableCell sx={{ width: '33.33%' }}>
                                                        <Box sx={{ width: '170px' }}>
                                                            <RitzInput
                                                                name={'vehicle_registration_number'}
                                                                id={'vehicle_registration_number'}
                                                                fullWidth
                                                                size="small"
                                                                selectedValue={row?.vehicle_registration_number || ''}
                                                                handleOnChange={(event: any) =>
                                                                    handleLCLDeliveryConsolidationFormStateChange(
                                                                        event.target.value,
                                                                        '',
                                                                        'vehicle_registration_number',
                                                                        row?.id,
                                                                    )
                                                                }
                                                            >
                                                            </RitzInput>
                                                        </Box>
                                                        <FormErrorMessage message={errorsDetails?.vehicle_types?.[row?.id-1]?.vehicle_registration_number}/>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <TextareaAutosize
                                                                aria-label="empty textarea"
                                                                placeholder=""
                                                                style={{ height: 50, width: 350 }}
                                                                value={row?.instructions || ""}
                                                                onChange={(event) =>
                                                                    handleLCLDeliveryConsolidationFormStateChange(
                                                                        event.target.value,
                                                                        '',
                                                                        'instructions',
                                                                        row?.id,
                                                                    )
                                                                }
                                                            />
                                                            {showDeleteIcon && (
                                                                <IconButton
                                                                    onClick={() => deleteVehicleDataRows(row.id)}
                                                                    aria-label="delete" color='error' sx={{ fontSize: '25px' }}>
                                                                    <DeleteIcon sx={{ fontSize: '20px' }} />
                                                                </IconButton>
                                                            )}
                                                        </Box>
                                                    </TableCell>
                                                </TableRow>

                                                <TableRow sx={{ margin: 2, padding: 2, backgroundColor: "white", borderRadius: "0px" }}>
                                                    <TableCell colSpan={4} sx={{ padding: 0 }}>
                                                        <Collapse in={!transportVehicleTrackingId ? row.isOpen : true} timeout="auto" unmountOnExit >

{/* Section 1 */}
                                                            <Typography variant="h6" color="primary" sx={{ padding: '5px'}}>LCL Details</Typography>
                                                                <Table size="small" sx={{border: '1px solid #EEEEEE', borderRadius: '4px', borderCollapse: 'separate', width: '100%', borderSpacing: 0 }}>
                                                                    <TableHead>
                                                                        <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                                                                            <TableCell>Container</TableCell>
                                                                            <TableCell sx={{ width: '100%', padding: 0 }}>Volume</TableCell>
                                                                            <TableCell sx={{ width: '100%', padding: 0 }}>Volume Unit</TableCell>
                                                                            <TableCell sx={{ width: '100%', padding: 0 }}></TableCell>
                                                                        </TableRow>
                                                                    </TableHead>
                                                                    <TableBody>
                                                                        {row.lcl_details?.map((subrow, subIndex) => (
                                                                            <TableRow key={row.id}>
                                                                                    <TableCell >
                                                                                        <Select
                                                                                            id={'container'}
                                                                                            name={'container'}
                                                                                            labelId={'container'}
                                                                                            value={row.lcl_details.find((s) => s.id === subrow.id)?.container || ""}
                                                                                            size="small"
                                                                                            sx={{minWidth: "400px" }}
                                                                                            onChange={(event) =>
                                                                                                handleLCLDeliveryConsolidationFormStateChange(
                                                                                                    event.target.value,
                                                                                                    'lcl_details',
                                                                                                    'container',
                                                                                                    row.id,
                                                                                                    subrow.id
                                                                                                )
                                                                                            }
                                                                                        >
                                                                                            {selected_deliveries?.map((item: any) => (
                                                                                                <MenuItem key={item?.id} value={item?.id}>
                                                                                                    {item?.display_number}
                                                                                                </MenuItem>
                                                                                            ))}
                                                                                        </Select>
                                                                                    </TableCell>
                                                                                <TableCell >
                                                                                    <TextField
                                                                                        id={'volume'}
                                                                                        name={'volume'}
                                                                                        size="small"
                                                                                        sx={{minWidth: "400px" }}
                                                                                        value={row.lcl_details.find((s) => s.id === subrow.id)?.volume || ""}
                                                                                        onChange={(event) =>
                                                                                            handleLCLDeliveryConsolidationFormStateChange(
                                                                                                parseInt(event.target.value),
                                                                                                'lcl_details',
                                                                                                'volume',
                                                                                                row.id,
                                                                                                subrow.id
                                                                                            )
                                                                                        }
                                                                                    />
                                                                                </TableCell>
                                                                                <TableCell>
                                                                                    
                                                                                    <Select
                                                                                        id={'volume_unit'}
                                                                                        name={'volume_unit'}
                                                                                        labelId={'volume_unit'}
                                                                                        value={
                                                                                            row.lcl_details.find((s) => s.id === subrow.id)?.volume_unit ||
                                                                                            (transportDeliveryDateTrackingMetaData?.volume_units?.some((item) => item.unit === "cubic_meters")
                                                                                                ? "cubic_meters"
                                                                                                : "")
                                                                                        }
                                                                                        size="small"
                                                                                        sx={{minWidth: "400px" }}
                                                                                        onChange={(event) =>
                                                                                            handleLCLDeliveryConsolidationFormStateChange(
                                                                                                event.target.value,
                                                                                                'lcl_details',
                                                                                                'volume_unit',
                                                                                                row.id,
                                                                                                subrow.id
                                                                                            )
                                                                                        }
                                                                                    >
                                                                                        {transportDeliveryDateTrackingMetaData?.volume_units?.map((item: any) => (
                                                                                            <MenuItem key={item?.unit} value={item?.unit}>
                                                                                                {item?.display}
                                                                                            </MenuItem>
                                                                                        ))}
                                                                                    </Select>
                                                                                </TableCell>
                                                                                <TableCell align="right">
                                                                                    <IconButton
                                                                                        onClick={() => deleteSubRowFromAVehicle(row.id, "lcl_details", subrow.id)}
                                                                                        aria-label="delete"
                                                                                        color="error"
                                                                                        sx={{ fontSize: '25px' }}
                                                                                    >
                                                                                        <DeleteIcon sx={{ fontSize: '20px' }} />
                                                                                    </IconButton>

                                                                                    {subIndex === row.lcl_details.length - 1 && (
                                                                                        <IconButton
                                                                                            onClick={() => addSubRowToAVehicle(row.id, 'lcl_details')}
                                                                                            color="primary"
                                                                                        >
                                                                                            <AddCircleOutline />
                                                                                        </IconButton>
                                                                                    )}
                                                                                </TableCell>
                                                                            </TableRow>
                                                                        ))}
                                                                    </TableBody>
                                                                </Table>
{/* Section 2 */}
                                                            <Typography variant="h6" color="primary" sx={{ padding: '5px'}}>Pickup Location</Typography>
                                                                <Table size="small" sx={{border: '1px solid #EEEEEE', borderRadius: '4px', borderCollapse: 'separate', width: '100%', borderSpacing: 0 }}>
                                                                    <TableHead>
                                                                        <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                                                                            {["Pickup Order", "Address Line 1", "Address Line 2", "City", "Country", ""].map((header, index) => (
                                                                                <TableCell 
                                                                                    key={index}
                                                                                    sx={{ 
                                                                                        minWidth: "200px", 
                                                                                        padding: "8px", 
                                                                                        textAlign: "left",
                                                                                        fontWeight: "bold",
                                                                                        
                                                                                    }}
                                                                                >
                                                                                    {header}
                                                                                </TableCell>
                                                                            ))}
                                                                        </TableRow>
                                                                    </TableHead>
                                                                    <TableBody>
                                                                        {row.pickup_locations.map((subrow, subIndex) => (
                                                                            <TableRow key={subrow.id}>
                                                                                {[
                                                                                    { key: "pickup_order", type: "text" },
                                                                                    { key: "address_line_1", type: "text" },
                                                                                    { key: "address_line_2", type: "text" },
                                                                                    { key: "city", type: "text" },
                                                                                    { key: "country", type: "select" }
                                                                                ].map(({ key, type }) => (
                                                                                    <TableCell key={key} sx={{ minWidth: "234px", padding: "8px", }}>
                                                                                        {type === "text" ? (
                                                                                            <TextField
                                                                                                id={key}
                                                                                                name={key}
                                                                                                size="small"
                                                                                                fullWidth
                                                                                                value={row.pickup_locations.find((s) => s.id === subrow.id)?.[key] || ""}
                                                                                                onChange={(event) =>
                                                                                                    handleLCLDeliveryConsolidationFormStateChange(
                                                                                                        event.target.value,
                                                                                                        "pickup_locations",
                                                                                                        key,
                                                                                                        row.id,
                                                                                                        subrow.id
                                                                                                    )
                                                                                                }
                                                                                            />
                                                                                        ) : (
                                                                                            <Select
                                                                                                id={key}
                                                                                                name={key}
                                                                                                value={row.pickup_locations.find((s) => s.id === subrow.id)?.country || sriLanka}
                                                                                                size="small"
                                                                                                fullWidth
                                                                                                onChange={(event) =>
                                                                                                    handleLCLDeliveryConsolidationFormStateChange(
                                                                                                        event.target.value,
                                                                                                        "pickup_locations",
                                                                                                        "country",
                                                                                                        row.id,
                                                                                                        subrow.id
                                                                                                    )
                                                                                                }
                                                                                            >
                                                                                                {transportDeliveryDateTrackingMetaData?.country_data?.map((item: any) => (
                                                                                                    <MenuItem key={item?.id} value={item?.id}>
                                                                                                        {item?.name}
                                                                                                    </MenuItem>
                                                                                                ))}
                                                                                            </Select>
                                                                                        )}
                                                                                    </TableCell>
                                                                                ))}

                                                                                <TableCell align="right">
                                                                                    <IconButton
                                                                                        onClick={() => deleteSubRowFromAVehicle(row.id, "pickup_locations", subrow.id)}
                                                                                        aria-label="delete"
                                                                                        color="error"
                                                                                        sx={{ fontSize: "25px" }}
                                                                                    >
                                                                                        <DeleteIcon sx={{ fontSize: "20px" }} />
                                                                                    </IconButton>

                                                                                    {subIndex === row.pickup_locations.length - 1 && (
                                                                                        <IconButton
                                                                                            onClick={() => addSubRowToAVehicle(row.id, "pickup_locations")}
                                                                                            color="primary"
                                                                                        >
                                                                                            <AddCircleOutline />
                                                                                        </IconButton>
                                                                                    )}
                                                                                </TableCell>
                                                                            </TableRow>
                                                                        ))}
                                                                    </TableBody>
                                                                </Table>
{/* Section 3 */}
                                                            <Typography variant="h6" color="primary" sx={{padding:'5px'}}>Destination</Typography>
                                                                    <Table size="small" sx={{ mb:'20px',border: '1px solid #EEEEEE', borderRadius: '4px',borderCollapse: 'separate', width: '100%', borderSpacing: 0, overflowX: 'auto' }}>
                                                                        <TableHead>
                                                                            <TableRow sx={{backgroundColor: "#f5f5f5"}} >
                                                                                <TableCell sx={{ minWidth: "260px", padding: "8px" }}>Drop Off Order</TableCell>
                                                                                <TableCell sx={{ minWidth: "260px", padding: "8px" }}>Address Line 1</TableCell>
                                                                                <TableCell sx={{ minWidth: "260px", padding: "8px" }}>Address Line 2</TableCell>
                                                                                <TableCell sx={{ minWidth: "260px", padding: "8px" }}>City</TableCell>
                                                                                <TableCell sx={{ minWidth: "260px", padding: "8px" }}>Country</TableCell>
                                                                                <TableCell></TableCell>
                                                                            </TableRow>
                                                                        </TableHead>
                                                                        <TableBody>
                                                                            {row.destinations.map((subrow, subIndex) => (
                                                                                <TableRow key={row.id}>
                                                                                    <TableCell sx={{ minWidth: "260px", padding: "8px"}} >
                                                                                        <TextField
                                                                                            id={'drop_off_order'}
                                                                                            name={'drop_off_order'}
                                                                                            size="small" 
                                                                                            sx={{ maxWidth: "200px", width: "100%" }}
                                                                                            value={row.destinations.find((s) => s.id === subrow.id)?.drop_off_order || ""}
                                                                                            onChange={(event) =>
                                                                                                handleLCLDeliveryConsolidationFormStateChange(
                                                                                                    parseInt(event.target.value),
                                                                                                    'destinations',
                                                                                                    'drop_off_order',
                                                                                                    row.id,
                                                                                                    subrow.id      
                                                                                                )
                                                                                            }
                                                                                        />
                                                                                    </TableCell>
                                                                                    <TableCell sx={{ minWidth: "200px", padding: "8px"}}>
                                                                                        <TextField
                                                                                            id={'address_line_1'}
                                                                                            name={'address_line_1'}
                                                                                            size="small" 
                                                                                            sx={{ maxWidth: "200px", width: "100%" }}
                                                                                            value={row.destinations.find((s) => s.id === subrow.id)?.address_line_1 || ""}
                                                                                            onChange={(event) =>
                                                                                                handleLCLDeliveryConsolidationFormStateChange(
                                                                                                    event.target.value,
                                                                                                    'destinations',
                                                                                                    'address_line_1',
                                                                                                    row.id,
                                                                                                    subrow.id           
                                                                                                )
                                                                                            }
                                                                                        />
                                                                                    </TableCell>
                                                                                    <TableCell sx={{ minWidth: "200px", padding: "8px"}}>
                                                                                        <TextField
                                                                                            id={'address_line_2'}
                                                                                            name={'address_line_2'}
                                                                                            size="small" 
                                                                                            sx={{ maxWidth: "200px", width: "100%" }}
                                                                                            value={row.destinations.find((s) => s.id === subrow.id)?.address_line_2 || ""}
                                                                                            onChange={(event) =>
                                                                                                handleLCLDeliveryConsolidationFormStateChange(
                                                                                                    event.target.value,
                                                                                                    'destinations',
                                                                                                    'address_line_2',
                                                                                                    row.id,
                                                                                                    subrow.id        
                                                                                                )
                                                                                            }
                                                                                        />
                                                                                    </TableCell>
                                                                                    <TableCell sx={{ minWidth: "200px", padding: "8px"}}>
                                                                                        <TextField
                                                                                            id={'city'}
                                                                                            name={'city'}
                                                                                            size="small" 
                                                                                            sx={{ maxWidth: "200px", width: "100%" }}
                                                                                            value={row.destinations.find((s) => s.id === subrow.id)?.city || ""}
                                                                                            onChange={(event) =>
                                                                                                handleLCLDeliveryConsolidationFormStateChange(
                                                                                                    event.target.value,
                                                                                                    'destinations',
                                                                                                    'city',
                                                                                                    row.id,
                                                                                                    subrow.id          
                                                                                                )
                                                                                            }
                                                                                        />
                                                                                    </TableCell>
                                                                                    <TableCell sx={{ minWidth: "200px", padding: "8px"}}>
                                                                                        <Select
                                                                                            id={'country'}
                                                                                            name={'country'}
                                                                                            labelId={'country'}
                                                                                            value={row.destinations.find((s) => s.id === subrow.id)?.country}
                                                                                            size="small"
                                                                                            sx={{ width: "200px", minWidth: "150px" }}
                                                                                            onChange={(event) =>
                                                                                                handleLCLDeliveryConsolidationFormStateChange(
                                                                                                    event.target.value,
                                                                                                    'destinations',
                                                                                                    'country',
                                                                                                    row.id,
                                                                                                    subrow.id         
                                                                                                )
                                                                                            }
                                                                                        >   
                                                                                                {transportDeliveryDateTrackingMetaData?.country_data?.map((item: any) => (
                                                                                                    <MenuItem key={item?.id} value={item?.id}>
                                                                                                    {item?.name}
                                                                                                    </MenuItem>
                                                                                                ))}
                                                                                        </Select>
                                                                                    </TableCell>
                                                                                    <TableCell align="right">
                                                                                        <IconButton
                                                                                            onClick={() => deleteSubRowFromAVehicle(row.id,'destinations',subrow.id)}
                                                                                            aria-label="delete"
                                                                                            color="error"
                                                                                            sx={{ fontSize: '25px' }}
                                                                                        >
                                                                                            <DeleteIcon sx={{ fontSize: '20px' }} />
                                                                                        </IconButton>

                                                                                        {subIndex === row.destinations.length - 1 && (
                                                                                            <IconButton
                                                                                                onClick={() => addSubRowToAVehicle(row.id,'destinations')}
                                                                                                color="primary"
                                                                                            >
                                                                                                <AddCircleOutline />
                                                                                            </IconButton>
                                                                                        )}
                                                                                    </TableCell>
                                                                                </TableRow>
                                                                            ))}
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
                        </Grid>
                    </Grid>
                </Box>
            </Card>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                {errorsDetails?.volume_mismatch && (
                    <FormErrorMessage message={'Total volume must match the delivery volume in all of the deliveries selected'} />
                )}
            </Box>

            <Button
                variant="contained"
                style={{ marginLeft: 'auto', marginTop: '20px', display: 'block' }}
                onClick={() => createTransportFormSave()}
            >
                Submit
            </Button>
        </>
    );
}

export default LocalTransportDeliveryChange;