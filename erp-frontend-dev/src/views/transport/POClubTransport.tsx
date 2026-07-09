import RitzTable from "@/components/Ritz/RitzTable";
import { Alert, Box, Switch, Button, Card, CardContent, CardHeader, Checkbox, Divider, FormControlLabel, Grid, Link, Paper, Tab, Table, TableBody, TableCell, TableHead, TableRow, Tabs, ToggleButton, ToggleButtonGroup, Typography, useTheme, Stepper, Step, StepLabel, styled, Tooltip } from "@mui/material";
import { ColumnDef } from "@tanstack/react-table";
import { useEffect, useState } from "react";
import { orderSummaryPageURL } from "@/helpers/constants/FrontEndUrls";
import { purchaseOrderClubDetailsPageURL } from "@/helpers/constants/front_end/POUrls";
import NextLink from 'next/link';
import RitzModal from "@/components/Ritz/RitzModal";
import TransportDeliveryDateTracking from "./TransportDeliveryDateTracking";
import api from "@/services/api";
import toast from "react-hot-toast";
import { getDefaultError } from "@/helpers/Utilities";
import * as TransportUrls from '@/helpers/constants/rest_urls/TransportUrls';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import TransportChargesBreakdown from "./TransportChargesBreakdown";
import { blue } from "@mui/material/colors";
import TransportTimeline from "./TransportTimeLine";
import React from "react";

interface PlanEvent {
    event_name: string;
    event_type: string | null;
    event_date: string | null;
}

interface PlanMaterial {
    id: number;
    name: string;
    material_details: string;
    quantity: number;
    quantity_units: string;
    quantity_units_display: string;
    weight_or_volume: number;
    weight_or_volume_unit: string;
}

interface PlanDelivery {
    actual_deliveries: any;
    plan_delivery_id: number;
    plan_delivery_name: string;
    plan_delivery_mode: string;
    country: string;
    incoterms_type: string;
    plan_value: string;
    actual_value: string;
    plan_events: PlanEvent[];
    plan_materials: PlanMaterial[];
}

interface SupplierData {
    supplier: string;
    plan_deliveries: PlanDelivery[];
}

interface TransportChargesBreakdownModalDetails {
    open: boolean;
    onclose: boolean;
    type: any;
    deliveryCharges: any;
}

const POClubTransport = ({ poClubId }: any) => {
    const theme = useTheme()
    const [deliveryStatusActiveTab,setDeliveryStatusActiveTab] = useState('deliveries_in_progress');
    const [selectedDeliveries, setSelectedDeliveries] = useState([]);
    const [transportDeliveryDateTrackingDataModalOpen, setTransportDeliveryDateTrackingDataModalOpen] = useState(false);
    const [selectedMaterialType, setSelectedMaterialType] = useState('fabric');
    const [transportPoClubPendingDeliveries, setTransportPoClubPendingDeliveries] = useState([]);
    const [transportChargesBreakdownModalOpen,setTransportChargesBreakdownModalOpen] = useState<TransportChargesBreakdownModalDetails>({
        open: false,
        onclose:false,
        type: '',
        deliveryCharges:''
    });

    const [transportPoClubPlanActualData, setTransportPoClubPlanActualData] = useState([])
    const [isLoading, setIsLoading] = useState(false);
    const [isHorizontal, setIsHorizontal] = useState(false);

    const deliveriesToBeStartedColumns: ColumnDef<any>[] = [
        {
            accessorKey: 'action',
            header: 'Action',
            cell: (props) => {
                const delivery = props?.row?.original;
                const isChecked = selectedDeliveries.some(d => d.id === delivery.id);

                return (
                <Checkbox
                    key={delivery.id}
                    style={{ marginRight: 8 }}
                    checked={isChecked}
                    onChange={(e) => handleDeliveriesToBeStartedCheckboxChange(delivery, e.target.checked)}
                />
                );
            }
        },
        {
            accessorKey: 'customer',
            header: 'Customer',
            cell: ({ row }) => row?.original?.customer || '--',
        },
        {
            accessorKey: 'costing',
            header: 'Costing',
            cell: (props) => {
                return <Link href={orderSummaryPageURL(props?.row?.original?.order_inquiry_id, props?.row?.original?.version_id)} target="_blank" >{props?.row?.original?.costing || '--'}</Link>;
            }
        },
        {
            accessorKey: 'po_club',
            header: 'PO Club',
            cell: (props) => {
                return <Link component={NextLink} href={purchaseOrderClubDetailsPageURL(props?.row?.original?.club_id)} target="_blank" >{props?.row?.original?.po_club_display_number || '--'}</Link>;
            },
        },
        {
            accessorKey: 'material',
            header: 'Material',
            cell: ({ row }) => row?.original?.material || '--',
        },
        {
            accessorKey: 'supplier',
            header: 'Supplier',
            cell: ({ row }) => row?.original?.supplier || '--',
        },
        {
            accessorKey: 'confirmed_delivery_date',
            header: 'Confirmed Delivery Date',
            cell: ({ row }) => row?.original?.confirmed_delivery_date || '--',
        }
    ]
    
    const fetchDeliveriesToBeStartedData = () => {
        setIsLoading(true)
        api.get(TransportUrls.transportPoClubPendingDeliveries(poClubId))
          .then((resp) => {
            const deliveriesData = resp?.data;
            setTransportPoClubPendingDeliveries(deliveriesData)
          })
          .catch((error) => {
            toast.error(getDefaultError(error?.response?.status));
          }).finally(()=>{
            setIsLoading(false)
        })
    };

    const fetchTransportPoClubPlanActualData = () => {
        setIsLoading(true)
        api.get(TransportUrls.transportPoClubPlanActualDetails(poClubId,selectedMaterialType))
          .then((resp) => {
            const data = resp?.data;
            setTransportPoClubPlanActualData([...data])
          })
          .catch((error) => {
            toast.error(getDefaultError(error?.response?.status));
          }).finally(()=>{
            setIsLoading(false)
        })
    };
    
    const handleDeliveryStatusActiveTabChange = ( event: any, newValue: string) => {
        setDeliveryStatusActiveTab(newValue)
    }

    const handleMaterialTypeChange = ( event: any, newValue: string) => {
        setSelectedMaterialType(newValue)
    }

    const clearSelectedDeliveries = () => {
        setSelectedDeliveries([]);
    };

    const handleTransportDeliveryDateTrackingModalClose = () => {
        setTransportDeliveryDateTrackingDataModalOpen(false);
        fetchDeliveriesToBeStartedData()
    };

    const handleDeliveriesToBeStartedCheckboxChange = (delivery: any, isChecked: boolean) => {
        setSelectedDeliveries((prevState) => {
            if (isChecked) {
                if (!prevState.some(d => d.id === delivery.id)) {
                    return [...prevState, delivery];
                }
                return prevState;
            } else {
                return prevState.filter(d => d.id !== delivery.id);
            }
        });
    };

    const handleTransportChargesBreakdownModalOpen = (newOpenValue: boolean, newTypeValue: string, data:string) => {
        console.log(data,'data')
        setTransportChargesBreakdownModalOpen(prevState => ({
            ...prevState,
            open: newOpenValue,
            type: newTypeValue,
            data: data
        }));
    };

    useEffect(() => {                 
        fetchTransportPoClubPlanActualData()
    }, [selectedMaterialType])

    useEffect(() => {
        if(deliveryStatusActiveTab === 'deliveries_in_progress') {
            fetchTransportPoClubPlanActualData()
        }
        fetchDeliveriesToBeStartedData()
    }, [deliveryStatusActiveTab])

    return(
        <>
            <style>
                {`
                .styled-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 16px;
                    text-align: left;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                }
                .styled-table th,
                .styled-table td {
                    padding: 12px 15px;
                    border: 1px solid #dddddd;
                }
                .styled-table thead {
                    background-color: #f4f6f8;
                    font-weight: bold;
                }
                .styled-table tbody tr:nth-child(even) {
                    background-color: #f9f9f9;
                }
                .styled-table tbody tr:hover {
                    background-color: #f1f1f1;
                }
                `}
            </style>

            <style>
                {`
                .styled-summary-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 16px;
                    text-align: left;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                }
                .styled-summary-table th,
                .styled-summary-table td {
                    padding: 12px 15px;
                    border: 1px solid #dddddd;
                }
                .styled-summary-table thead {
                    background-color: #f4f6f8;
                    font-weight: bold;
                }
                .styled-summary-table tbody tr:nth-child(even) {
                    background-color: #f9f9f9;
                }
                // .styled-summary-table tbody tr:hover {
                //     background-color: #f1f1f1;
                // }
                `}
            </style>
            
                <Box>
                    <Tabs
                        orientation="vertical"
                        variant="scrollable"
                        value={deliveryStatusActiveTab}
                        onChange= {handleDeliveryStatusActiveTabChange}
                        aria-label="Vertical tabs example"
                        sx={{ borderRight: 1, borderColor: 'divider', alignItems: 'flex-start', width: 150 }}
                    >
            
                        <Tab
                        key={1}
                        label={'Deliveries Not Started'}
                        value={'deliveries_not_started'}
                        sx={{ textAlign: 'left' }}
                        />
            
                        <Tab
                        key={2}
                        label={'Deliveries in Progress'}
                        value={'deliveries_in_progress'}
                        sx={{ textAlign: 'left' }}
                        />
                    </Tabs>
                </Box>
                
                <Box sx={{ flex: 4, padding: '0.1em'}}>
                    {deliveryStatusActiveTab === 'deliveries_not_started' && (
                        <>
                            <Box sx={{ display: "flex", flexDirection: "column" , width: "100%", marginLeft: '20px'  }}>
                                <Box sx={{ display: "flex", justifyContent: "flex-end", width: "100%" }}>
                                    <Button
                                        onClick={() => setTransportDeliveryDateTrackingDataModalOpen(true)}
                                        variant="contained"
                                        color="primary"
                                        sx={{ marginBottom: "16px" }}
                                        disabled={selectedDeliveries?.length === 0}
                                    >
                                        Start
                                    </Button>
                                </Box>

                                <RitzTable
                                    data={transportPoClubPendingDeliveries}
                                    columns={deliveriesToBeStartedColumns}
                                />
                            </Box>

                            {transportDeliveryDateTrackingDataModalOpen && (
                                <RitzModal
                                    open={transportDeliveryDateTrackingDataModalOpen}
                                    onClose={() => setTransportDeliveryDateTrackingDataModalOpen(false)}
                                    maxWidth='xl'
                                    title={"Transport Delivery Date Tracking"}>
                                        <TransportDeliveryDateTracking
                                            selected_deliveries={selectedDeliveries}
                                            transportTrackingId={null}
                                            closeModal={handleTransportDeliveryDateTrackingModalClose}
                                            clearSelectedDeliveries={clearSelectedDeliveries}
                                            fetchData={fetchDeliveriesToBeStartedData}
                                            deleteSelectedDeliveries={() => {}}
                                            />
                                </RitzModal>
                            )}
                        </>
                    )}

                    {deliveryStatusActiveTab === 'deliveries_in_progress' && (
                        <>  
                            <>
                                <Box>
                                    <Typography variant="h5" sx={{mb:2, mt:2, marginLeft: '20px'}} >Select Material Type:</Typography>
                                    <ToggleButtonGroup
                                        color="primary"
                                        value={selectedMaterialType}
                                        exclusive
                                        onChange={(e) => {
                                            const target = e.target as HTMLInputElement;
                                            handleMaterialTypeChange('selectedMaterialType',target?.value);
                                        }}
                                        aria-label="Platform"
                                        style={{
                                            marginLeft: '20px',
                                            marginBottom: '20px',
                                            display: 'flex',
                                            // flexDirection: 'row',
                                            justifyContent: "space-between",
                                            gap: '10px',
                                            maxWidth: '25%',
                                            // flexWrap: 'wrap'
                                        }}
                                        >
                                            <ToggleButton style={{ marginRight: '10px', minWidth: '100px', height: '3em', border: `1px solid #E0E0E0 `, borderRadius: '5px',flexGrow: 1, whiteSpace: 'normal', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center', padding: '30px'}} value='fabric'>Fabric</ToggleButton>
                                            <ToggleButton style={{ marginRight: '10px', minWidth: '100px', height: '3em', border: `1px solid #E0E0E0 `, borderRadius: '5px',flexGrow: 1, whiteSpace: 'normal', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center', padding: '30px'}} value='sewing_trim'>Sewing Trims</ToggleButton>
                                            <ToggleButton style={{ marginRight: '10px', minWidth: '100px', height: '3em', border: `1px solid #E0E0E0 `, borderRadius: '5px',flexGrow: 1, whiteSpace: 'normal', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center', padding: '30px'}} value='packaging_trim'>Packaging Trims</ToggleButton>
                                    </ToggleButtonGroup>
                                </Box>
                                
                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                                    <FormControlLabel
                                        control={
                                        <Switch
                                            checked={isHorizontal}
                                            onChange={(e) => setIsHorizontal(e.target.checked)}
                                            color="primary"
                                        />
                                        }
                                        label="Toggle the View"
                                    />
                                </Box>

                                <Divider sx={{ backgroundColor: 'black', height: '1px' }} />
                                
                                <Grid container spacing={2} direction={isHorizontal ? 'row' : 'column'}>
                                    {transportPoClubPlanActualData.map((tracking, idx) => (
                                        <React.Fragment key={idx}>
                                            {/* Plan Section */}

                                            <Grid item xs={12} md={isHorizontal ? 5.5 : 12}>
                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                    <Typography variant="h6" sx={{ mb: 2, mt: 2, ml: 0 }}>
                                                        {'Plan'}
                                                    </Typography>
                                                    {tracking?.plan_deliveries.map((plan_delivery:any, index:any) => (
                                                        <Box key={index} sx={{ flex: 1, minWidth: 300 }}>
                                                            <Typography
                                                                variant="h6"
                                                                sx={{ mb: 2, mt: 2, ml: 0, color: '#1976D2' }}
                                                                >
                                                                {plan_delivery?.plan_delivery_name}
                                                            </Typography>
                                                            <Box sx={{
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                gap: '16px',
                                                                marginLeft: '0px',
                                                                // width: '50%',
                                                                width: isHorizontal ? '50%' : '50%',
                                                                maxWidth: isHorizontal ? '100%' : '600px',
                                                                // overflowX: 'auto',  
                                                                marginBottom: '10px'}}
                                                                >
                                                                <Table  className="styled-summary-table">
                                                                    <TableHead>
                                                                        <TableRow
                                                                            sx={{
                                                                                background: theme.palette.grey[200],
                                                                                border: (theme) => `1px solid ${theme.palette.grey[100]}`,
                                                                            }}
                                                                        >  
                                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: "center" , justifyContent: "center"}}>Country</TableCell>
                                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: "center" , justifyContent: "center"}}>Supplier</TableCell>
                                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: "center" , justifyContent: "center"}}>Incoterms</TableCell>
                                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: "center" , justifyContent: "center"}}>Mode</TableCell>
                                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: "center" , justifyContent: "center"}}>Plan Value</TableCell>
                                                                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: "center" , justifyContent: "center"}}>Actual Value</TableCell>
                                                                        </TableRow>
                                                                    </TableHead>
                                                                    <TableBody>
                                                                        {tracking ? (
                                                                            <TableRow>
                                                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: "center", justifyContent: "center" }}>{plan_delivery?.country|| '--'}</TableCell>
                                                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: "center", justifyContent: "center" }}>{plan_delivery?.supplier_name|| '--'}</TableCell>
                                                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: "center", justifyContent: "center" }}>{plan_delivery?.incoterms_type || '--'}</TableCell>
                                                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: "center", justifyContent: "center" }}>{plan_delivery?.plan_delivery_mode || '--'}</TableCell>
                                                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: "center", justifyContent: "center" }}>$ {plan_delivery?.plan_value || '--'}</TableCell>
                                                                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, textAlign: "center", justifyContent: "center" }}>$ {plan_delivery?.actual_value || '--'}</TableCell>
                                                                            </TableRow>
                                                                        ) : (
                                                                            <TableRow>
                                                                                <TableCell colSpan={6} sx={{ textAlign: "center", border: (theme) => `1px solid ${theme.palette.grey[200]}` }}>
                                                                                    No data to display
                                                                                </TableCell>
                                                                            </TableRow>
                                                                        )}
                                                                    </TableBody>
                                                                </Table>
                                                            </Box>

                                                            <Box sx={{ display: 'flex', flexDirection: 'row', gap: 3, mt: 4, mb: 6, flexWrap: 'wrap' }}>
                                                                {/* Plan Table */}
                                                                <Box sx={{ flex: 1, minWidth: 300 }}>
                                                                    <Table sx={{ mb: 4, mt: 4 }} className="styled-table">
                                                                        <TableHead>
                                                                            <TableRow sx={{ background: theme.palette.grey[200], border: (theme) => `1px solid ${theme.palette.grey[100]}` }}>
                                                                                <TableCell align="center">Material</TableCell>
                                                                                <TableCell align="center">Quantity</TableCell>
                                                                                <TableCell align="center">Quantity Unit</TableCell>
                                                                            </TableRow>
                                                                        </TableHead>
                                                                        <TableBody>
                                                                            {plan_delivery?.plan_materials?.length > 0 ? (
                                                                                plan_delivery.plan_materials.map((material:any, mIdx:any) => (
                                                                                <TableRow key={mIdx}>
                                                                                    <TableCell align="center">{material?.name || '-'}</TableCell>
                                                                                    <TableCell align="center">{material?.quantity || '-'}</TableCell>
                                                                                    <TableCell align="center">{material?.quantity_units_display || '-'}</TableCell>
                                                                                </TableRow>
                                                                                ))
                                                                            ) : (
                                                                                <TableRow>
                                                                                    <TableCell colSpan={3} align="center">No data to display</TableCell>
                                                                                </TableRow>
                                                                            )}
                                                                        </TableBody>
                                                                    </Table>
                                                                </Box>

                                                                {/* Plan Timeline */}
                                                                <Box sx={{ flex: 1, minWidth: 300 }}>
                                                                    <TransportTimeline events={plan_delivery.plan_events} timelineType="plan" />
                                                                </Box>

                                                                {/* Plan Charges */}
                                                                {/* <Box sx={{ flex: 1, minWidth: 300 }}>
                                                                    <Table  className="styled-summary-table">
                                                                        <TableHead>
                                                                            <TableRow sx={{ background: theme.palette.grey[200], border: (theme) => `1px solid ${theme.palette.grey[100]}` }}>
                                                                                <TableCell align="center">Supplier Door to Supplier Port</TableCell>
                                                                                <TableCell align="center">Supplier Port to Our Port</TableCell>
                                                                                <TableCell align="center">Our Port to Our Door</TableCell>
                                                                            </TableRow>
                                                                        </TableHead>
                                                                        <TableBody>
                                                                            <TableRow>
                                                                                {['supplier_door_to_supplier_port', 'supplier_port_to_our_port', 'our_port_to_our_door'].map((segment) => (
                                                                                <TableCell key={segment} align="center">
                                                                                    <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                                                                                    <Box>{'$ 1000.00' || '--'}</Box>
                                                                                    <Tooltip title="View Charges Breakdown" arrow>
                                                                                        <OpenInNewIcon
                                                                                        onClick={() => handleTransportChargesBreakdownModalOpen(true,segment,'')}
                                                                                        sx={{ cursor: 'pointer', color: blue[500] }}
                                                                                        />
                                                                                    </Tooltip>
                                                                                    </Box>
                                                                                </TableCell>
                                                                                ))}
                                                                            </TableRow>
                                                                        </TableBody>
                                                                    </Table>
                                                                </Box> */}
                                                                
                                                            </Box>
                                                        </Box>
                                                    ))}
                                                </Box>
                                            </Grid>

                                            {isHorizontal && (
                                                <Grid item>
                                                    <Divider
                                                        orientation="vertical"
                                                        flexItem
                                                        sx={{ height: '100%', borderColor: 'black' }}
                                                    />
                                                </Grid>
                                            )}

                                            {/* Actual Section */}

                                            {tracking?.actual_deliveries.map((actual_delivery:any, index:number) => (
                                                <Grid item xs={12} md={isHorizontal ? 5.5 : 12}>
                                                    <Box sx={{ flex: 1, minWidth: 300 }}>
                                                        <Typography variant="h6" sx={{ mb: 2, mt: 2, ml: 0 }}>Actual</Typography>
                                                        <Box sx={{ display: 'flex', flexDirection: 'row', gap: 3, mt: 4, mb: 6, flexWrap: 'wrap' }}>
                                                            {/* Actual Table */}
                                                            <Box sx={{ flex: 1, minWidth: 300 }}>
                                                                <Typography variant="h6" sx={{ mb: 0, mt: 2, ml: 0,  color: '#1976D2' }}>{actual_delivery?.actual_delivery_name || '--'}</Typography>
                                                                <Table sx={{ mt: 2 }} className="styled-table">
                                                                    <TableHead>
                                                                        <TableRow sx={{ background: theme.palette.grey[200] }}>
                                                                            <TableCell align="center">Material</TableCell>
                                                                            <TableCell align="center">Quantity</TableCell>
                                                                            <TableCell align="center">Quantity Unit</TableCell>
                                                                        </TableRow>
                                                                    </TableHead>
                                                                    <TableBody>
                                                                        {tracking?.actual_deliveries?.actual_materials?.length > 0 ? (
                                                                            tracking.actual_deliveries.actual_materials.map((material:any, aIdx:any) => (
                                                                            <TableRow key={aIdx}>
                                                                                <TableCell align="center">{material?.name || '-'}</TableCell>
                                                                                <TableCell align="center">{material?.quantity || '-'}</TableCell>
                                                                                <TableCell align="center">{material?.quantity_units_display || '-'}</TableCell>
                                                                            </TableRow>
                                                                            ))
                                                                        ) : (
                                                                            <TableRow>
                                                                                <TableCell colSpan={3} align="center">No data to display</TableCell>
                                                                            </TableRow>
                                                                        )}
                                                                    </TableBody>
                                                                </Table>
                                                            </Box>

                                                            {/* Actual Timeline */}
                                                            <Box sx={{ flex: 1, minWidth: 300 }}>
                                                                <TransportTimeline events={actual_delivery?.actual_events} timelineType="Actual" />
                                                            </Box>

                                                            {/* Actual Charges */}
                                                            <Box sx={{ flex: 1, minWidth: 300 }}>
                                                                <Table  className="styled-summary-table">
                                                                    <TableHead>
                                                                        <TableRow sx={{ background: theme.palette.grey[200] }}>
                                                                            <TableCell align="center">Supplier Door to Supplier Port</TableCell>
                                                                            <TableCell align="center">Supplier Port to Our Port</TableCell>
                                                                            <TableCell align="center">Our Port to Our Door</TableCell>
                                                                        </TableRow>
                                                                    </TableHead>
                                                                    <TableBody>
                                                                        <TableRow>
                                                                            <TableCell align="center">
                                                                                <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                                                                                    <Box>{actual_delivery?.delivery_chargers?.supplier_door_to_supplier_port_total?.amount || '--'}</Box>
                                                                                    <Tooltip title="View Charges Breakdown" arrow>
                                                                                        <OpenInNewIcon
                                                                                        onClick={() => handleTransportChargesBreakdownModalOpen(true,'', actual_delivery?.delivery_chargers)}
                                                                                        sx={{ cursor: 'pointer', color: blue[500] }}
                                                                                        />
                                                                                    </Tooltip>
                                                                                </Box>
                                                                            </TableCell>
                                                                            <TableCell align="center">
                                                                                <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                                                                                    <Box>{actual_delivery?.delivery_chargers?.supplier_port_to_our_port_total?.amount || '--'}</Box>
                                                                                    <Tooltip title="View Charges Breakdown" arrow>
                                                                                        <OpenInNewIcon
                                                                                        onClick={() => handleTransportChargesBreakdownModalOpen(true,'', actual_delivery?.delivery_chargers)}
                                                                                        sx={{ cursor: 'pointer', color: blue[500] }}
                                                                                        />
                                                                                    </Tooltip>
                                                                                </Box>
                                                                            </TableCell>
                                                                            <TableCell align="center">
                                                                                <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                                                                                    <Box>{actual_delivery?.delivery_chargers?.our_port_to_our_door_total?.amount || '--'}</Box>
                                                                                    <Tooltip title="View Charges Breakdown" arrow>
                                                                                        <OpenInNewIcon
                                                                                        onClick={() => handleTransportChargesBreakdownModalOpen(true,'', actual_delivery?.delivery_chargers)}
                                                                                        sx={{ cursor: 'pointer', color: blue[500] }}
                                                                                        />
                                                                                    </Tooltip>
                                                                                </Box>
                                                                            </TableCell>
                                                                        </TableRow>
                                                                    </TableBody>
                                                                </Table>
                                                            </Box>
                                                        </Box>
                                                    </Box>
                                                </Grid>
                                            ))}
                                            <Divider sx={{ backgroundColor: 'black', height: '1px' }} />
                                        </React.Fragment>
                                    ))}
                                </Grid>
                            </>
                        </>
                    )}
                </Box>

                {transportChargesBreakdownModalOpen.open && (
                    <RitzModal
                        open={transportChargesBreakdownModalOpen.open}
                        onClose={() => handleTransportChargesBreakdownModalOpen(false,'','')}
                        maxWidth='lg'
                        title={"Charges Breakdown"}>
                            <TransportChargesBreakdown
                                open={transportChargesBreakdownModalOpen.open}
                                onClose={() => handleTransportChargesBreakdownModalOpen(false,'','')}
                                type={transportChargesBreakdownModalOpen?.type}
                                deliveryCharges={transportChargesBreakdownModalOpen?.deliveryCharges}
                        />
                    </RitzModal>
                )}
        </>
    );
}

export default POClubTransport;

