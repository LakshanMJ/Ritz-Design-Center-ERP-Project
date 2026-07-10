import DefaultLoader from "@/components/DefaultLoader"
import RitzTable from "@/components/Ritz/RitzTable"
import { Box, Button, Card, CardContent, Checkbox, Grid, IconButton, Link, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from "@mui/material"
import { blue, grey, orange, red, amber, green, purple } from "@mui/material/colors"
import { DateRangeIcon } from "@mui/x-date-pickers"
import TodayIcon from '@mui/icons-material/Today';
import React, { useEffect, useState } from 'react'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import ChecklistRtlIcon from '@mui/icons-material/ChecklistRtl';
import { ColumnDef } from "@tanstack/react-table"
import NextLink from 'next/link';
import AddBoxIcon from '@mui/icons-material/AddBox';
import RitzModal from "@/components/Ritz/RitzModal"
import TransportDeliveryDateTracking from "./TransportDeliveryDateTracking"
import { importDeliveryTrack, orderSummaryPageURL, transportDeliveryDateTracingDetailsPageUrl } from "@/helpers/constants/FrontEndUrls"
import { purchaseOrderClubDetailsPageURL } from "@/helpers/constants/front_end/POUrls"
import api from "@/services/api"
import toast from "react-hot-toast"
import { getDefaultError } from "@/helpers/Utilities"
import * as TransportUrls from '@/helpers/constants/rest_urls/TransportUrls';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import EditIcon from '@mui/icons-material/Edit';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ChangeInterface from "./ChangeInterface"
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from "dayjs";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import RitzTooltip from "@/components/Ritz/RitzTooltip"
import ConsolidatedTransportDetails from "./VesselCutOffDates"

const TransportRealTime = () => {

    const deliveriesToBeStartedKey = 'deliveries_to_be_started'
    const todayExpectedDeliveriesKey = 'delivery_due_today_count'
    const sevenDaysPastDueDeliveriesKey = 'delivery_due_in_7_days_count'
    const pastDueDeliveriesKey = 'delivery_past_due_count'
    const inPrograssDeliveriesKey = 'delivery_in_progress_count'
    const completedDeliveriesKey = 'delivery_complete_count'
    const allDeliveriesKey = 'all_deliveries'

    const [isLoading, setIsLoading] = useState(false);
    const [transportTrackingId, setTransportTrackingId] = useState(null);
    const [selectedDeliveryAndTransportStatus,setSelectedDeliveryAndTransportStatus] = useState({
        selectedDeliveryStatus: [deliveriesToBeStartedKey],
        selectedTransportType: '',
        selectedDeliveryIds: [],
        selectedDeliveryObjects: [],
    });
    const [data, setData] = useState({
        transportDeliveryCountsData:{
            supplier_delivery_count: 0,
            delivery_due_today_count: 0,
            delivery_due_in_7_days_count: 0,
            delivery_past_due_count: 0,
            delivery_complete_count: 0,
            delivery_in_progress_count: 0,
            all_deliveries_count:0
         }, 
        deliveriesToBeStartedData: [],
        transportDeliveryDateTrackingListData: [],
        autoConsolidationData: {
            start_date:null,
            end_date:null,
        },
    });
    const [transportChangeModalOpen, setTransportChangeModalOpen] = useState(false);
    const [transportDeliveryDateTrackingDataModalOpen, setTransportDeliveryDateTrackingDataModalOpen] = useState(false);
    const [transportDeliveryDateAutoConsolidationModalOpen, setTransportDeliveryDateAutoConsolidationModalOpen] = useState(false);
    const [vesselCutOffDatesModalOpen, setVesselCutOffDatesModalOpen] = useState(false);
    const [searchedText, setSearchedText] = useState('');
    const [currentPage, setCurrentPage] = useState(null);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    
    const getColumns = (tableType: string): ColumnDef<any>[] => [
        {
            accessorKey: 'transport_display_number',
            header: 'Transport',
            cell: (props) => {
                return <Link href={importDeliveryTrack(props?.row?.original?.id)} target="_blank" >{props?.row?.original?.transport_delivery_date_tracking_display_number || '--'}</Link>;
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
                return <Link href={orderSummaryPageURL(props?.row?.original?.order_id, props?.row?.original?.costing_version)} target="_blank" >{props?.row?.original?.costing_version_display_number || '--'}</Link>;
            }
        },
        {
            accessorKey: 'po_club',
            header: 'PO Club',
            cell: (props) => {
                return <Link href={purchaseOrderClubDetailsPageURL(props?.row?.original?.po_club)} target="_blank">{props?.row?.original?.po_club_display_number|| '--'}</Link>;
            },
        },
        {
            accessorKey: 'suppliers',
            header: 'Suppliers',
            cell: ({ row }) => row?.original?.suppliers.join(',') || '--',
        },
        ...(tableType != 'fob' && tableType != 'cif' && tableType != 'all' ? [{accessorKey: 'supplier_door', header: 'Suppliers Door', cell: (props:any) => props?.row.original?.vendor_door_address?.display_address || '--'}]:[]),
        ...(tableType != 'fob' && tableType != 'cif' && tableType != 'all' ? [{accessorKey: 'vendor_door_expected_shipping_date', header: 'Suppliers Door Date'}]:[]),
        ...(tableType == 'exw' || tableType == 'fob' || tableType == 'all' ? [{header: 'Suppliers Port', cell: (props:any) => props?.row.original?.foreign_port_details?.name || '--'}]:[]),
        ...(tableType == 'exw' || tableType == 'fob' || tableType == 'all' ? [{accessorKey: 'foreign_port_expected_date',cell: (props:any) => props?.row.original?.foreign_port_expected_date || '--', header: 'Suppliers Port Date'}]:[]),
        {
            accessorKey: 'name',
            header: 'Our Port',
            cell: (props) => props?.row.original?.local_port_details?.name || '--',
        },
        {
            accessorKey: 'local_port_expected_date',
            header: 'Our Port Date',
            cell: ({ row }) => row?.original?.local_port_expected_date || '--',
        },
        {
            accessorKey: 'our_door',
            header: 'Our Door',
            cell: (props) => props?.row.original?.final_location_details?.display_address || '--',
        },
        {
            accessorKey: 'expected_delivery_date',
            header: 'Our Door Date',
            cell: (props) => props?.row.original?.expected_delivery_date || '--',
        },
        {
            accessorKey: 'actions',
            header: 'Actions',
            enableSorting: false,
            cell: (props) => (
                <Box sx={{ display: "flex", justifyContent: "left", alignItems: "center" }}>
                    <IconButton
                        sx={{ ml: 0, px: 1.5 }}
                        size="small"
                        color="primary"
                        onClick={() => handleTranportRowEditClick(props?.row?.original?.id)}
                    >
                        <Tooltip title="Edit Delivery" arrow>
                            <EditIcon fontSize="inherit" />
                        </Tooltip>
                    </IconButton>
                    <IconButton
                        sx={{ ml: 0, px: 1.5 }}
                        size="small"
                        color="primary"
                        onClick={() => handleTransportChangeModalOpen(props?.row?.original?.id)}
                    >
                        <Tooltip title="Change Delivery" arrow>
                            <OpenInNewIcon fontSize="inherit" />
                        </Tooltip>
                    </IconButton>
                </Box>
            ),
        },
        // {
        //     accessorKey: '',
        //     header: 'Tracking Map',
        //     cell: props => {
        //         return (
        //             <Link component={NextLink} href={'#'} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        //                 <Tooltip title={'Open Map'}><IconButton size='small' color='primary'><LocationOnIcon fontSize='inherit'/></IconButton></Tooltip>
        //             </Link>
        //         )}
        // }
    ]

    const deleveriesToBeStartedColumns: ColumnDef<any>[] = [
        {
            accessorKey: 'action',
            header: 'Action',
            cell: (props) => {
                return (
                    <Checkbox 
                        key={props?.row?.original?.id}
                        style={{ marginRight: 8 }}
                        checked={selectedDeliveryAndTransportStatus?.selectedDeliveryIds?.includes(props?.row?.original?.id) || false}
                        onChange={(e) => handleSelectedDeliveriesCheckboxChange(props?.row?.original, e?.target?.checked)}
                    />
                );
            }
        },
        {
            accessorKey: 'display_number',
            header: 'Display Number',
            cell: ({ row }) => row?.original?.display_number || '--',
        },
        {
            accessorKey: 'transport_mode',
            header: 'Transport Mode',
            cell: ({ row }) => row?.original?.transport_mode || '--',
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
                return <Link href={orderSummaryPageURL(props?.row?.original?.order_id, props?.row?.original?.costing_version_id)} target="_blank" >{props?.row?.original?.costing_version || '--'}</Link>;
            }
        },
        {
            accessorKey: 'po_club',
            header: 'PO Club',
            cell: (props) => {
                return <Link component={NextLink} href={purchaseOrderClubDetailsPageURL(props?.row?.original?.po_club)} target="_blank" >{props?.row?.original?.po_club_display_number || '--'}</Link>;
            },
        },
        {
            accessorKey: 'incoterms',
            header: 'Incoterms',
            cell: ({ row }) => 
                row?.original?.incoterms?.map((item:any) => item.incoterms_display || '--').join(', ') || '--',
        },
        {
            accessorKey: 'last_ex_mill_date',
            header: 'Ex mill Date',
            cell: ({ row }) => row?.original?.last_ex_mill_date || '--',
        },
        {
            accessorKey: 'materials',
            header: 'Materials',
            cell: ({ row }) => {
                const materials = row?.original?.materials || [];
        
                return (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {materials.map((mat:any, index:number) => (
                            <div key={mat?.id} style={{ display: 'flex', alignItems: 'center' }}>
                                <span>{mat?.attributes?.ritz_customer_brand_reference_code || '--'}</span>
                                <RitzTooltip
                                    materialHeaders={mat?.headers || []}
                                    materialDetails={mat?.attributes || {}}
                                />
                                {index < materials.length - 1 && <span style={{ margin: '0 4px' }}>,</span>}
                            </div>
                        ))}
                    </div>
                );
            }
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

const fetchTransportDeliveryCounts = () => {
    api.get(TransportUrls.transportDeliveryCounts())
        .then((resp) => {
        const transportDeliveryCountsData = resp?.data;
        updateTransportDeliveryDateTrackingData('transportDeliveryCountsData',transportDeliveryCountsData)
        })
        .catch((error) => {
        toast.error(getDefaultError(error?.response?.status));
        }).finally(()=>{
        })
};

const fetchDeliveriesToBeStartedData = () => {
    setIsLoading(true)
    api.get(TransportUrls.supplierDeliveryListUrl())
      .then((resp) => {
        const deliveriesData = resp?.data;
        updateTransportDeliveryDateTrackingData('deliveriesToBeStartedData',[...deliveriesData])
      })
      .catch((error) => {
        toast.error(getDefaultError(error?.response?.status));
      }).finally(()=>{
        setIsLoading(false)
    })
};

const fetchTransportDeliveryDateTrackingListData = (
    transport_type:any,
    filter_type:any
) => {
    setIsLoading(true)
    api.get(TransportUrls.transportDeliveryDateTrackingListUrl(transport_type,filter_type,searchedText,currentPage + 1,rowsPerPage > 5 ? rowsPerPage : 5))
      .then((resp) => {
        const deliveriesData = resp?.data;
        updateTransportDeliveryDateTrackingData('transportDeliveryDateTrackingListData',deliveriesData.results)
      })
      .catch((error) => {
        toast.error(getDefaultError(error?.response?.status));
      }).finally(()=>{
        setIsLoading(false)
    })
};

const handleTransportTypeChange = (key: string, value: any) => {
    updateSelectedDeliveryAndTransportStatus(key,value);
    if (value !== 'all'){
        fetchTransportDeliveryDateTrackingListData(value,selectedDeliveryAndTransportStatus?.selectedDeliveryStatus)
    } else{
        fetchTransportDeliveryDateTrackingListData('',selectedDeliveryAndTransportStatus?.selectedDeliveryStatus)
    }
}

const handleSelectedDeliveryStatus = (status:any) => {
    updateSelectedDeliveryAndTransportStatus('selectedDeliveryStatus', status)
    updateSelectedDeliveryAndTransportStatus('selectedTransportType', 'all')
}

const handleDeliveriesToBeStarted = (status:any) => {
    updateSelectedDeliveryAndTransportStatus('selectedDeliveryStatus', status)
    updateSelectedDeliveryAndTransportStatus('selectedTransportType', null)
    updateSelectedDeliveryAndTransportStatus('selectedDeliveryIds', [])
    updateSelectedDeliveryAndTransportStatus('selectedDeliveryObjects', [])
    setTransportTrackingId(null);
    
}

const updateSelectedDeliveryAndTransportStatus = (key: string, value: any) => {
    setSelectedDeliveryAndTransportStatus(prevState => ({
        ...prevState,
        [key]: value
    }));
};

const updateTransportDeliveryDateTrackingData = (key:any, value:any) => {
    setData(prevState => {
        if (key === 'autoConsolidationData') {
            return {
                ...prevState,
                autoConsolidationData: {
                    ...prevState.autoConsolidationData,
                    ...value
                }
            };
        } else {
            return {
                ...prevState,
                [key]: value
            };
        }
    });
};

const handleSelectedDeliveriesCheckboxChange = (row: any, isChecked: boolean) => {
    setSelectedDeliveryAndTransportStatus((prev) => ({
        ...prev,
        selectedDeliveryIds: isChecked
            ? [...(prev.selectedDeliveryIds || []), row.id]
            : (prev.selectedDeliveryIds || []).filter(existingId => existingId !== row.id),

            selectedDeliveryObjects: isChecked
            ? [...(prev.selectedDeliveryObjects || []), row]
            : (prev.selectedDeliveryObjects || []).filter(obj => obj.id !== row.id)
    }));
};

const clearSelectedDeliveries = () => {
    setSelectedDeliveryAndTransportStatus(prevState => ({
        ...prevState,
        selectedDeliveryIds: [],
        selectedDeliveryObjects: []
    }));
};

const deleteSelectedDeliveries = (deletedId: number) => {
    setSelectedDeliveryAndTransportStatus((prevState) => ({
        ...prevState,
        selectedDeliveryIds: prevState.selectedDeliveryIds.filter((id) => id !== deletedId),
        selectedDeliveryObjects: prevState.selectedDeliveryObjects.filter((obj) => obj.id !== deletedId),
    }));
};

const handleTransportDeliveryDateTrackingModalClose = () => {
    setTransportDeliveryDateTrackingDataModalOpen(false);
    fetchDeliveriesToBeStartedData()
    fetchTransportDeliveryCounts()
};

const handleTranportRowEditClick = (transport_tracking_id:any) => {
    setTransportDeliveryDateTrackingDataModalOpen(true);
    setTransportTrackingId(transport_tracking_id);
};

const handleTransportChangeModalOpen = (transport_tracking_id:number) => {
    setTransportChangeModalOpen(true);
    setTransportTrackingId(transport_tracking_id);
};

const handleAutoConsolidationFormSave = () => {
    setSelectedDeliveryAndTransportStatus(prevState => ({
        ...prevState, 
        selectedDeliveryStatus: [allDeliveriesKey], 
        selectedTransportType: 'all'
    }));
    setTransportDeliveryDateAutoConsolidationModalOpen(false)
}

const pageRefreshGetData = () => {
    fetchTransportDeliveryDateTrackingListData('','all_deliveries')
    fetchTransportDeliveryCounts()
}

//Pagination

const handleSearchChange = (text: any) => {
    setSearchedText(text)
};

const handleRowsCount = (rowsCount:number) => {
    setRowsPerPage(rowsCount);
};
  
const handlePageNumber = (page: any) => {
    setCurrentPage(page);
};

useEffect(() => {
    fetchTransportDeliveryCounts()
}, [])

useEffect(() => {
    fetchTransportDeliveryDateTrackingListData(selectedDeliveryAndTransportStatus?.selectedTransportType,selectedDeliveryAndTransportStatus?.selectedDeliveryStatus)
}, [searchedText])

useEffect(() => {
    fetchTransportDeliveryDateTrackingListData(selectedDeliveryAndTransportStatus?.selectedTransportType,selectedDeliveryAndTransportStatus?.selectedDeliveryStatus)
}, [currentPage,rowsPerPage])

useEffect(() => {
    if (selectedDeliveryAndTransportStatus?.selectedDeliveryStatus?.includes('deliveries_to_be_started')){
        fetchDeliveriesToBeStartedData()
    } else {
        fetchTransportDeliveryDateTrackingListData('',selectedDeliveryAndTransportStatus?.selectedDeliveryStatus)
    }
    setCurrentPage(null),
    setRowsPerPage(5)
}, [selectedDeliveryAndTransportStatus?.selectedDeliveryStatus])

return(
    <>
        <Box  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Typography variant='h1' color='text.primary' sx={{mt: 2}}>{'Import Delivery Track'}</Typography>
        </Box>
        <>
             <Grid container spacing={2}>
             <Grid item xs={12} sm={6} md={2.4}>
             <Card sx={{...cardStyles, 
                 boxShadow: selectedDeliveryAndTransportStatus?.selectedDeliveryStatus.includes('deliveries_to_be_started') ? `2px 2px 2px ${purple[500]}, -2px -2px 2px ${purple[500]}, -2px 2px 2px ${purple[500]}, 2px -2px 2px ${purple[500]}, 0 2px 2px rgba(0,0,0,.06)` : `1px 1px 10px(0, 0, 0, 0.5)`,
                 borderLeft: selectedDeliveryAndTransportStatus?.selectedDeliveryStatus.includes('deliveries_to_be_started') ? 'none' : `5px solid ${purple[500]}`
                }} onClick={() => handleDeliveriesToBeStarted([deliveriesToBeStartedKey])}>
                <CardContent>
                    <Grid container alignItems="center">
                      <Grid item xs={8}>
                        <Typography variant="subtitle1" gutterBottom sx={{color: purple[500], fontWeight: 'bold'}}>
                        Deliveries to be started
                        </Typography>
                        <Typography variant="h5" color="textPrimary" sx={countStyles}>
                        {data?.transportDeliveryCountsData?.supplier_delivery_count}
                        </Typography>
                    </Grid>
                    <Grid item xs={4} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <AddBoxIcon 
                            sx={{ 
                                color: selectedDeliveryAndTransportStatus?.selectedDeliveryStatus?.includes('deliveries_to_be_started') ? purple[500] :grey[400],
                            }} 
                            fontSize="large"  
                        />
                    </Grid>
                    </Grid>
                </CardContent>
            </Card>
            </Grid>
             <Grid item xs={12} sm={6} md={2.4}>
             <Card sx={{...cardStyles, 
                boxShadow: selectedDeliveryAndTransportStatus?.selectedDeliveryStatus?.includes('delivery_due_today_count') ? `2px 2px 2px ${blue[500]}, -2px -2px 2px ${blue[500]}, -2px 2px 2px ${blue[500]}, 2px -2px 2px ${blue[500]}, 0 2px 2px rgba(0,0,0,.06)` : `1px 1px 10px(0, 0, 0, 0.5)`,
                borderLeft: selectedDeliveryAndTransportStatus?.selectedDeliveryStatus?.includes('delivery_due_today_count') ? 'none' : `5px solid ${blue[500]}`
                }} onClick={() => handleSelectedDeliveryStatus([todayExpectedDeliveriesKey])}>
                <CardContent>
                    <Grid container alignItems="center">
                      <Grid item xs={8}>
                        <Typography variant="subtitle1" gutterBottom sx={{color: blue[500], fontWeight: 'bold'}}>
                          Today Expected Deliveries
                        </Typography>
                        <Typography variant="h5" color="textPrimary" sx={countStyles}>
                        {data?.transportDeliveryCountsData?.delivery_due_today_count}
                        </Typography>
                    </Grid>
                    <Grid item xs={4} sx={{ display: 'flex', justifyContent: 'flex-end'}}>
                        <TodayIcon 
                         sx={{
                            color: selectedDeliveryAndTransportStatus?.selectedDeliveryStatus?.includes('delivery_due_today_count') ? blue[500] :grey[400],
                        }}
                            fontSize="large"  
                        />
                    </Grid>
                    </Grid>
                </CardContent>
            </Card>
            </Grid>
             <Grid item xs={12} sm={6} md={2.4}>
             <Card sx={{...cardStyles, 
                 boxShadow: selectedDeliveryAndTransportStatus?.selectedDeliveryStatus.includes('delivery_due_in_7_days_count') ? `2px 2px 2px ${orange[500]}, -2px -2px 2px ${orange[500]}, -2px 2px 2px ${orange[500]}, 2px -2px 2px ${orange[500]}, 0 2px 2px rgba(0,0,0,.06)` : `1px 1px 10px(0, 0, 0, 0.5)`,
                 borderLeft: selectedDeliveryAndTransportStatus?.selectedDeliveryStatus.includes('delivery_due_in_7_days_count') ? 'none' : `5px solid ${orange[500]}`
                }} onClick={() => handleSelectedDeliveryStatus([sevenDaysPastDueDeliveriesKey])}>
                <CardContent>
                    <Grid container alignItems="center">
                      <Grid item xs={8}>
                        <Typography variant="subtitle1" gutterBottom sx={{color: orange[500], fontWeight: 'bold'}}>
                        7 Days Past Due Deliveries
                        </Typography>
                        <Typography variant="h5" color="textPrimary" sx={countStyles}>
                        {data?.transportDeliveryCountsData?.delivery_due_in_7_days_count}
                        </Typography>
                    </Grid>
                    <Grid item xs={4} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <DateRangeIcon 
                            sx={{ 
                                color: selectedDeliveryAndTransportStatus?.selectedDeliveryStatus?.includes('delivery_due_in_7_days_count') ? orange[500] :grey[400],
                            }} 
                            fontSize="large"  
                        />
                    </Grid>
                    </Grid>
                </CardContent>
            </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
             <Card sx={{...cardStyles, 
                boxShadow: selectedDeliveryAndTransportStatus?.selectedDeliveryStatus?.includes('delivery_past_due_count') ? `2px 2px 2px ${red[500]}, -2px -2px 2px ${red[500]}, -2px 2px 2px ${red[500]}, 2px -2px 2px ${red[500]}, 0 2px 2px rgba(0,0,0,.06)` : `1px 1px 10px(0, 0, 0, 0.5)`,
                borderLeft: selectedDeliveryAndTransportStatus?.selectedDeliveryStatus?.includes('delivery_past_due_count') ? 'none' : `5px solid ${red[500]}`
                }} onClick={() => handleSelectedDeliveryStatus([pastDueDeliveriesKey])}>
                <CardContent>
                    <Grid container alignItems="center">
                      <Grid item xs={8}>
                        <Typography variant="subtitle1" gutterBottom sx={{color: red[500], fontWeight: 'bold'}}>
                        Past Due Deliveries
                        </Typography>
                        <Typography variant="h5" color="textPrimary" sx={countStyles}>
                        {data?.transportDeliveryCountsData?.delivery_past_due_count}
                        </Typography>
                    </Grid>
                    <Grid item xs={4} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <CalendarMonthIcon 
                            sx={{ 
                                color: selectedDeliveryAndTransportStatus?.selectedDeliveryStatus?.includes('delivery_past_due_count') ? red[500] :grey[400],
                            }} 
                            fontSize="large"  
                        />
                    </Grid>
                    </Grid>
                </CardContent>
            </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
             <Card sx={{...cardStyles, 
                 boxShadow: selectedDeliveryAndTransportStatus?.selectedDeliveryStatus?.includes('delivery_in_progress_count') ? `2px 2px 2px ${amber[500]}, -2px -2px 2px ${amber[500]}, -2px 2px 2px ${amber[500]}, 2px -2px 2px ${amber[500]}, 0 2px 2px rgba(0,0,0,.06)` : `1px 1px 10px(0, 0, 0, 0.5)`,
                 borderLeft: selectedDeliveryAndTransportStatus?.selectedDeliveryStatus?.includes('delivery_in_progress_count') ? 'none' : `5px solid ${amber[500]}`
                }} onClick={() => handleSelectedDeliveryStatus([inPrograssDeliveriesKey])}>
                <CardContent>
                    <Grid container alignItems="center">
                      <Grid item xs={8}>
                        <Typography variant="subtitle1" gutterBottom sx={{color: amber[500], fontWeight: 'bold'}}>
                        In Progress Deliveries
                        </Typography>
                        <Typography variant="h5" color="textPrimary" sx={countStyles}>
                        {data?.transportDeliveryCountsData?.delivery_in_progress_count}
                        </Typography>
                    </Grid>
                    <Grid item xs={4} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <HourglassEmptyIcon 
                            sx={{ 
                                color: selectedDeliveryAndTransportStatus?.selectedDeliveryStatus?.includes('delivery_in_progress_count') ? amber[500] :grey[400],
                            }} 
                            fontSize="large"  
                        />
                    </Grid>
                    </Grid>
                </CardContent>
            </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
                <Card sx={{...cardStyles, 
                    boxShadow: selectedDeliveryAndTransportStatus?.selectedDeliveryStatus?.includes('delivery_complete_count') ? `2px 2px 2px ${green[500]}, -2px -2px 2px ${green[500]}, -2px 2px 2px ${green[500]}, 2px -2px 2px ${green[500]}, 0 2px 2px rgba(0,0,0,.06)` : `1px 1px 10px(0, 0, 0, 0.5)`,
                    borderLeft: selectedDeliveryAndTransportStatus?.selectedDeliveryStatus?.includes('delivery_complete_count') ? 'none' : `5px solid ${green[500]}`
                    }} onClick={() => handleSelectedDeliveryStatus([completedDeliveriesKey])}>
                    <CardContent>
                        <Grid container alignItems="center">
                        <Grid item xs={8}>
                            <Typography variant="subtitle1" gutterBottom sx={{color: green[500], fontWeight: 'bold'}}>
                            Completed Deliveries
                            </Typography>
                            <Typography variant="h5" color="textPrimary" sx={countStyles}>
                            {data?.transportDeliveryCountsData?.delivery_complete_count}
                            </Typography>
                        </Grid>
                        <Grid item xs={4} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <AssignmentTurnedInIcon
                                sx={{ 
                                    color: selectedDeliveryAndTransportStatus?.selectedDeliveryStatus?.includes('delivery_complete_count') ? green[500] :grey[400],
                                }} 
                                fontSize="large"  
                            />
                        </Grid>
                        </Grid>
                    </CardContent>
                </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
                <Card sx={{...cardStyles, 
                    boxShadow: selectedDeliveryAndTransportStatus?.selectedDeliveryStatus?.includes('all_deliveries') ? `2px 2px 2px ${grey[700]}, -2px -2px 2px ${grey[700]}, -2px 2px 2px ${grey[700]}, 2px -2px 2px ${grey[700]}, 0 2px 2px rgba(0,0,0,.06)` : `1px 1px 10px(0, 0, 0, 0.5)`,
                    borderLeft: selectedDeliveryAndTransportStatus?.selectedDeliveryStatus?.includes('all_deliveries') ? 'none' : `5px solid ${grey[700]}`
                    }} onClick={() => handleSelectedDeliveryStatus([allDeliveriesKey])}>
                    <CardContent>
                        <Grid container alignItems="center">
                        <Grid item xs={8}>
                            <Typography variant="subtitle1" gutterBottom sx={{color: grey[700], fontWeight: 'bold'}}>
                            All Deliveries
                            </Typography>
                            <Typography variant="h5" color="textPrimary" sx={countStyles}>
                            {data?.transportDeliveryCountsData?.all_deliveries_count}
                            </Typography>
                        </Grid>
                        <Grid item xs={4} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <ChecklistRtlIcon 
                                sx={{ 
                                    color: selectedDeliveryAndTransportStatus?.selectedDeliveryStatus?.includes('all_deliveries') ? grey[700] :grey[400],
                                }} 
                                fontSize="large"  
                            />
                        </Grid>
                        </Grid>
                    </CardContent>
                </Card>
            </Grid>
            </Grid>
            <Box sx={{mt: 5}}>
            </Box>
        </>
        
        {!selectedDeliveryAndTransportStatus?.selectedDeliveryStatus?.includes('deliveries_to_be_started') && (
            <Box>
                <Typography variant='h5' color='text.primary' sx={{mb: 2}}>Select Transport Type:</Typography>
                <ToggleButtonGroup
                    color="primary"
                    value={selectedDeliveryAndTransportStatus?.selectedTransportType}
                    exclusive
                    onChange={(e) => {
                        const target = e.target as HTMLInputElement;
                        handleTransportTypeChange('selectedTransportType',target?.value);
                    }}
                    aria-label="Platform"
                    style={{
                        marginBottom: '20px',
                        display: 'flex',
                        flexDirection: 'row',
                        justifyContent: "space-between",
                        gap: '10px',
                        maxWidth: '25%'
                    }}
                    >
                        <ToggleButton style={{ marginRight: '10px', minWidth: '150px', height: '4em', border: `1px solid #E0E0E0 `, borderRadius: '5px',flexGrow: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}} value='all'>All</ToggleButton>
                        <ToggleButton style={{ marginRight: '10px', minWidth: '150px', height: '4em', border: `1px solid #E0E0E0 `, borderRadius: '5px',flexGrow: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}} value='exw'>Ex - Work</ToggleButton>
                        <ToggleButton style={{ marginRight: '10px', minWidth: '150px', height: '4em', border: `1px solid #E0E0E0 `, borderRadius: '5px',flexGrow: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}} value='fob'>FOB</ToggleButton>
                        <ToggleButton style={{ marginRight: '10px', minWidth: '150px', height: '4em', border: `1px solid #E0E0E0 `, borderRadius: '5px',flexGrow: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}} value='cif'>CIF</ToggleButton>
                </ToggleButtonGroup>
            </Box>
        )}
        
        {(selectedDeliveryAndTransportStatus?.selectedDeliveryStatus?.includes('deliveries_to_be_started') && (
            isLoading ? (
                <DefaultLoader />
            ) : (
                <>
                    <Box sx={{ display: "flex", justifyContent: "flex-end"}}>
                        <Button
                            onClick={() => {setVesselCutOffDatesModalOpen(true)}}
                            variant="contained"
                            color="primary"
                            sx={{ marginBottom: "16px", marginRight:'10px' }}
                            // disabled={selectedDeliveryAndTransportStatus?.selectedDeliveryIds?.length === 0}
                        >
                            View vessel cut off dates
                        </Button>
                        <Button
                            onClick={() => {
                                setTransportDeliveryDateAutoConsolidationModalOpen(true)}}
                            variant="contained"
                            color="primary"
                            sx={{ marginBottom: "16px", marginRight:'10px' }}
                        >
                            Consolidate
                        </Button>
                        <Button
                            onClick={() => {setTransportDeliveryDateTrackingDataModalOpen(true)}}
                            variant="contained"
                            color="primary"
                            sx={{ marginBottom: "16px", marginRight:'10px' }}
                            disabled={selectedDeliveryAndTransportStatus?.selectedDeliveryIds?.length === 0}
                        >
                            Start
                        </Button>
                    </Box>
                    
                    <RitzTable
                        data={data?.deliveriesToBeStartedData} 
                        columns={deleveriesToBeStartedColumns}
                    />
                </>
            )
        ))}

        {transportDeliveryDateTrackingDataModalOpen && (
            <RitzModal
                open={transportDeliveryDateTrackingDataModalOpen}
                onClose={() => setTransportDeliveryDateTrackingDataModalOpen(false)}
                maxWidth='xl'
                title={"Transport Delivery Date Tracking"}>
                    <TransportDeliveryDateTracking
                        selectedDeliveryIds={selectedDeliveryAndTransportStatus?.selectedDeliveryIds}
                        selected_deliveries={selectedDeliveryAndTransportStatus?.selectedDeliveryObjects}
                        transportTrackingId={transportTrackingId}
                        closeModal={handleTransportDeliveryDateTrackingModalClose}
                        clearSelectedDeliveries={clearSelectedDeliveries}
                        deleteSelectedDeliveries={deleteSelectedDeliveries}
                        fetchData={fetchDeliveriesToBeStartedData}/>
            </RitzModal>
        )}

        {transportDeliveryDateAutoConsolidationModalOpen && (
            <RitzModal
                open={transportDeliveryDateAutoConsolidationModalOpen}
                onClose={() => setTransportDeliveryDateAutoConsolidationModalOpen(false)}
                maxWidth='sm'
                title={"Auto Consolidation"}>
                 {
                    <Box>
                        <Typography>Select the start date and end date and click on consolidate button. This will automatically consolidate the deliveries in the selected time range.</Typography>
                        <Typography variant='h5' color='text.primary' sx={{mt: 2 , mb: 2}}>Select Start Date :</Typography>
                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <DatePicker
                                    minDate={dayjs(Date.now())}
                                    format='DD/MM/YYYY'
                                    onChange={(e: any) => updateTransportDeliveryDateTrackingData('autoConsolidationData', { start_date: dayjs(e.$d).format('YYYY-MM-DD') })}
                                    sx={{ width: '100%' }}
                                />
                        </LocalizationProvider>
                        <Typography variant='h5' color='text.primary' sx={{mt: 2 , mb: 2}}>Select End Date :</Typography>
                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                                <DatePicker
                                    minDate={dayjs(Date.now())}
                                    format='DD/MM/YYYY'
                                    onChange={(e: any) => updateTransportDeliveryDateTrackingData('autoConsolidationData', { end_date: dayjs(e.$d).format('YYYY-MM-DD') })}
                                    sx={{ width: '100%' }}
                                />
                        </LocalizationProvider>
                        <Button 
                            variant="contained" 
                            style={{ marginLeft: 'auto', marginTop: '20px', display: 'block' }}
                            onClick={() => handleAutoConsolidationFormSave()}
                        >
                            Submit
                        </Button>
                    </Box>
                    }   
            </RitzModal>
        )}

        {(
            <>
                {!selectedDeliveryAndTransportStatus?.selectedDeliveryStatus?.includes('deliveries_to_be_started') &&
                    selectedDeliveryAndTransportStatus?.selectedTransportType && (
                        isLoading ? (
                            <DefaultLoader />
                        ) : (
                            <RitzTable
                                data={data?.transportDeliveryDateTrackingListData}
                                columns={getColumns(selectedDeliveryAndTransportStatus?.selectedTransportType)}
                                pagination={true}
                                serverSideRendering={true}
                                onSearchTextChange={(selectText: any)=>handleSearchChange(selectText)}
                                onPageNumberChange={(selectedPageNumber: any) => handlePageNumber(selectedPageNumber)}
                                onPerPageCountChange={(rowsCount: any) => handleRowsCount(rowsCount)}
                            />
                        )
                    )
                }
            </>
        )}

        <RitzModal
            open={transportChangeModalOpen}
            onClose={() => setTransportChangeModalOpen(false)}
            maxWidth= {false}
            title={"Change Interface"}>
               
                <ChangeInterface
                    transportTrackingId={transportTrackingId}
                    selectedDeliveryIds={selectedDeliveryAndTransportStatus?.selectedDeliveryIds}
                    onClose={() => setTransportChangeModalOpen(false)}
                    fetchTransportDeliveryCounts={fetchTransportDeliveryCounts}
                    fetchTransportDeliveryDateTrackingListData={pageRefreshGetData}
                />
        </RitzModal>

        {vesselCutOffDatesModalOpen && (
            <RitzModal
                open={vesselCutOffDatesModalOpen}
                onClose={() => setVesselCutOffDatesModalOpen(false)}
                maxWidth= {false}
                title={""}>
                    <ConsolidatedTransportDetails/>
            </RitzModal>
        )}
    </>
)}

export default TransportRealTime

const cardStyles = {  
    height: '100%',
    '&:hover': { 
        transform: 'scale(1.05)',
        cursor: 'pointer',
    }
}  

const countStyles = {
    color : grey[600]
}


