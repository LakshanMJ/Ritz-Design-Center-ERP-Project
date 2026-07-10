import { Box, Button, Card, CardContent, Checkbox, Grid, IconButton, Link, Tooltip, Typography } from "@mui/material";
import { blue, green, grey, orange, red } from "@mui/material/colors";
import DefaultLoader from "@/components/DefaultLoader";
import RitzTable from "@/components/Ritz/RitzTable";
import { ColumnDef } from "@tanstack/react-table";
import RitzModal from "@/components/Ritz/RitzModal";
import { useEffect, useRef, useState } from "react";
import api from "@/services/api";
import * as TransportUrls from '@/helpers/constants/rest_urls/TransportUrls';
import toast from "react-hot-toast";
import { getDefaultError } from "@/helpers/Utilities";
import { Edit, HourglassBottom, HourglassFull, LocalShipping } from "@mui/icons-material";
import EditIcon from '@mui/icons-material/Edit';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import LocalTransportChangeInterface from "./LocalTransportChangeInterface";
import RitzTooltip from "@/components/Ritz/RitzTooltip";
import LocalTransportConsolidation from "./LocalTransportConsolidation";
import * as RestUrls from '../../helpers/constants/RestUrls';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import React from "react";
import { purchaseOrderClubDetailsPageURL } from "@/helpers/constants/front_end/POUrls";

interface Delivery {
    id: number;
    plant_in_date: string;
    plant: string;
    local_forwarder: string;
  }
  
interface SelectedDeliveryStatusAndDeliveries {
    status: string;
    selectedDeliveries: Delivery[];
}
const LocalTransport = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [transportDeliveryDateTrackingDataModalOpen, setTransportDeliveryDateTrackingDataModalOpen] = useState(false);
    const [selectedDeliveryStatusAndDeliveries, setSelectedDeliveryStatusAndDeliveries] = useState<SelectedDeliveryStatusAndDeliveries>({
        selectedDeliveries: [],
        status: 'lcl_deliveries',
    });
    const [transportVehicleTrackingId,setTransportVehicleTrackingId] = useState(null);
    const [localTransportChangeModalOpen,setLocalTransportChangeModalOpen] = useState(false);
    const [data, setData] = useState({
            localTransportDeliveryCount:{
                LCL: 0,
                FCL: 0,
                in_progress_local_delivery_count: 0,
                completed_local_delivery_count: 0,
            }, 
            deliveriesToBeStartedData: [],
            inProgressDeliveriesData: [],
    });
    
    // Table states
    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(5);
    const [totalCount, setTotalCount] = useState(0);
    const [sorting, setSorting] = useState({});
    const [globalFilter, setGlobalFilter] = useState('');
    const [columnFilters, setColumnFilters] = useState({});
    const [isTableLoading, setIsTableLoading] = useState(false);
    const tableRef = useRef(null);


    const deliveriesToBeStartedColumns: ColumnDef<any>[] = [
        {
            accessorKey: 'action',
            header: 'Action',
            cell: (props) => {
                const isChecked = selectedDeliveryStatusAndDeliveries?.selectedDeliveries.some(
                    (delivery) => delivery.id === props?.row?.original?.id
                );
                return (
                    <Checkbox
                        key={props?.row?.original?.id}
                        style={{ marginRight: 8 }}
                        checked={isChecked}
                        onChange={(e) =>
                            handleSelectedDeliveriesCheckboxChange(props?.row?.original)
                        }
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
            accessorKey: 'warehouse',
            header: 'Warehouse',
            cell: ({ row }) => row?.original?.warehouse || '--',
        },
        {
            accessorKey: 'customer',
            header: 'Customer',
            cell: ({ row }) => row?.original?.customers.join(", ")|| '--',
        },
        // {
        //     accessorKey: 'po_clubs',
        //     header: 'PO Clubs',
        //     cell: ({ row }) => row?.original?.po_clubs.join(", ") || '--',
        // },
        {
            accessorKey: 'po_clubs',
            header: 'PO Clubs',
            cell: ({ row }) => {
                const clubs = row?.original?.po_clubs || [];
                return clubs.length > 0 ? (
                    <>
                        {clubs.map((club:any, index:any) => (
                            <React.Fragment key={club}>
                                <Link 
                                    href={purchaseOrderClubDetailsPageURL(club)} 
                                    target="_blank" 
                                    style={{ marginRight: 8 }}
                                >
                                    {club}
                                </Link>
                                {index < clubs.length - 1 && ', '}
                            </React.Fragment>
                        ))}
                    </>
                ) : '--';
            },
        },
        {
            accessorKey: 'supplier',
            header: 'Supplier',
            cell: ({ row }) => row?.original?.suppliers.join(", ") || '--',
        },
        {
            accessorKey: 'incoterms',
            header: 'Incoterms',
            cell: ({ row }) => row?.original?.incoterms.join(", ") || '--',
        },
        {
            accessorKey: 'items',
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
            accessorKey: 'volume',
            header: 'Volume',
            cell: ({ row }) => {
                const volumeData = row?.original?.volume;
                return volumeData 
                    ? `${volumeData.volume} ${volumeData.volume_unit_display}` 
                    : '--';
            }
        },
        {
            accessorKey: 'plant_in_date',
            header: 'Plant In Date',
            cell: ({ row }) => row?.original?.plant_in_date || '--',
        }
    ]

    const createdDeliveriesColumns: ColumnDef<any>[] = [
        {
            accessorKey: 'tracking_id',
            header: 'Tracking ID',
            cell: ({ row }) => row?.original?.display_number || '--',
        },
        {
            accessorKey: 'warehouses',
            header: 'Warehouses',
            cell: ({ row }) => {
                const warehouses = row?.original?.warehouses || [];
                return warehouses.length > 0 ? warehouses.join(", ") : '--';
            }
        },
        {
            accessorKey: 'customers',
            header: 'Customers',
            cell: ({ row }) => row?.original?.customers.join(", ")|| '--',
        },
        // {
        //     accessorKey: 'po_clubs',
        //     header: 'PO Clubs',
        //     cell: ({ row }) => row?.original?.po_clubs.join(", ") || '--',
        // },
        {
            accessorKey: 'po_clubs',
            header: 'PO Clubs',
            cell: ({ row }) => {
                const clubs = row?.original?.po_clubs || [];
                return clubs.length > 0 ? (
                    <>
                        {clubs.map((club:any, index:any) => (
                            <React.Fragment key={club}>
                                <Link 
                                    href={purchaseOrderClubDetailsPageURL(club)} 
                                    target="_blank" 
                                    style={{ marginRight: 8 }}
                                >
                                    {club}
                                </Link>
                                {index < clubs.length - 1 && ', '}
                            </React.Fragment>
                        ))}
                    </>
                ) : '--';
            },
        },
        {
            accessorKey: 'suppliers',
            header: 'Suppliers',
            cell: ({ row }) => row?.original?.suppliers.join(", ") || '--',
        },
        {
            accessorKey: 'incoterms',
            header: 'Incoterms',
            cell: ({ row }) => row?.original?.incoterms.join(", ") || '--',
        },
        {
            accessorKey: 'volume',
            header: 'Volume',
            cell: ({ row }) => {
                const volumeData = row?.original?.volume;
                const volumeUnit = row?.original?.volume_unit_display;
                if (volumeData !== undefined && volumeData !== null) {
                    return `${volumeData} ${volumeUnit}`;
                } else {
                    return '--';
                }
            }
        },
        {
            accessorKey: 'local_forwarders',
            header: 'Local Forwarders',
            cell: ({ row }) => row?.original?.local_forwarders?.length 
                ? row.original.local_forwarders.join(', ') 
                : '--',
        },
        {
            accessorKey: '',
            header: 'Action',
            enableSorting: false,
            cell: ({ row }: { row: { original: Delivery } }) => (
                <Box sx={{ display: "flex", justifyContent: "left", alignItems: "center" }}>
                    <IconButton
                        sx={{ ml: 0, px: 1.5 }}
                        size="small"
                        color="primary"
                        onClick={() => handleCreatedDeliveriesEdit(row?.original?.id)}
                    >
                        <Tooltip title="Edit Delivery" arrow>
                            <EditIcon fontSize="inherit" />
                        </Tooltip>
                    </IconButton>
                    <IconButton
                        sx={{ ml: 0, px: 1.5 }}
                        size="small"
                        color="primary"
                        onClick={() => handleLocalTransportChangeModalOpen(row?.original?.id)}
                    >
                        <Tooltip title="Change Delivery" arrow>
                            <OpenInNewIcon fontSize="inherit"/>
                        </Tooltip>
                    </IconButton>
                </Box>
            ),
        }
    ]

    const fetchLocalDeliveryCount = () => {
        api.get(TransportUrls.localDeliveryCount())
            .then((resp) => {
            const localDeliveryCountData = resp?.data;
            updateData('localTransportDeliveryCount', localDeliveryCountData)
            })
            .catch((error) => {
            toast.error(getDefaultError(error?.response?.status));
            }).finally(()=>{
            })
    };

// Fetch fetchDeliveriesToBeStartedData (LCL Deliveries and Full Containers)

    const fetchDeliveriesToBeStartedData = (url:any) => {
        setIsLoading(true);
        api.get(url)
          .then((resp) => {
            updateData('deliveriesToBeStartedData',[...resp?.data])
          })
          .catch((error) => {
            toast.error(getDefaultError(error?.response?.status));
          })
          .finally(() => {
            setIsLoading(false);
          });
    };

// Fetch Cretaed Deliveries (In Progress Deliveries and completed Deliveries)

    const getTableData = ({
        pageIndex: paramPageIndex,
        pageSize: paramPageSize,
        globalFilter: paramGlobalFilter,
        columnFilters: paramColumnFilters,
        sorting: paramSorting,
        state:paramState,
      }: {
        pageIndex?: number,
        pageSize?: number,
        globalFilter?: string,
        columnFilters?: Object,
        sorting?: { column: string, direction: string | boolean },
        state?: string,
      } = {}) => {
        
        setIsTableLoading(true);
        const pageIndexValue = paramPageIndex !== undefined ? paramPageIndex : pageIndex;
        const pageSizeValue = paramPageSize !== undefined ? paramPageSize : pageSize;
        const globalFilterValue = paramGlobalFilter !== undefined ? paramGlobalFilter : globalFilter;
        const columnFiltersValue = paramColumnFilters !== undefined ? paramColumnFilters : columnFilters;
        const sortingValue = paramSorting !== undefined ? paramSorting : sorting;
        const state = paramState? paramState : selectedDeliveryStatusAndDeliveries?.status;
        const queryParams = getQueryParams(globalFilterValue, columnFiltersValue, sortingValue);
        
        api.get(TransportUrls.localDeliveryTransportTrackingList(pageIndexValue + 1, pageSizeValue,state,queryParams)).then((resp: any) => {
          updateData('inProgressDeliveriesData',resp?.data?.results)
          setTotalCount(resp?.data?.count)
        }).catch(error => {
          toast.error(getDefaultError(error?.response?.status));
        }).finally(() => {
          setIsLoading(false);
          setIsTableLoading(false);
        });
    }

    const getQueryParams = (globalFilter: any, columnFilters: any, sortingValue: any): string => {
        const params: any = {};
        if (globalFilter ) {
          params['global_filter'] = globalFilter;
        }
    
        if (Object.keys(columnFilters)?.length) {
          Object.keys(columnFilters).forEach(key => {
            if (columnFilters[key]) {
              params[key] = columnFilters[key];
            }
          });
        }
    
        if (sortingValue['column'] && sortingValue['direction']) {
          params['sort_col'] = sortingValue['column'];
          params['sort_dir'] = sortingValue['direction'];
        }
    
        if (Object.keys(params)?.length) {
          return new URLSearchParams(params).toString();
        }
    
        return '';
      }

    const updateData = (key:any, value:any) => {
        setData(prevData => ({
            ...prevData,
            [key]: value
        }));
    };
    
    const handleCreatedDeliveriesEdit = (id:number) => {
        setTransportVehicleTrackingId(id)
        setTransportDeliveryDateTrackingDataModalOpen(true);
    }

    const handleClose = () => {
        setLocalTransportChangeModalOpen(false)
    }

    const handleSelectedDeliveryStatusAndDeliveries = (field: string, value: any) => {
        setSelectedDeliveryStatusAndDeliveries((prevState) => ({
            ...prevState,
            [field]: value,
          }));

        setTransportVehicleTrackingId(null);
        if (value === 'full_containers') {
            fetchDeliveriesToBeStartedData(TransportUrls.deliveryTransportTypeList());
          } else if (value === 'lcl_deliveries') {
            fetchDeliveriesToBeStartedData(TransportUrls.LclDeliveryTransportTypeList('lcl'));
          } else if (value === 'in_progress_deliveries') {
            getTableData({ state: value });
          } 
          else if (value === 'completed_deliveries') {
            getTableData({ state: value });
          }
    };

    const handleSelectedDeliveriesCheckboxChange = (delivery: any) => {
        setSelectedDeliveryStatusAndDeliveries((prev) => {
            const exists = prev.selectedDeliveries.some((d) => d.id === delivery.id);
            const updatedSelectedDeliveries = exists
                ? prev.selectedDeliveries.filter((d) => d.id !== delivery.id)
                : [...prev.selectedDeliveries, delivery];
            return {
                ...prev,
                selectedDeliveries: updatedSelectedDeliveries,
            };
        });
    };

    const clearSelectedDeliveries = () => {
        setSelectedDeliveryStatusAndDeliveries(prev => ({
          ...prev,
          selectedDeliveries: []
        }));
      };
      
    const handleTransportDeliveryDateTrackingDataModalClose = () => {
        setTransportDeliveryDateTrackingDataModalOpen(false);
        if (selectedDeliveryStatusAndDeliveries?.status === 'full_containers') {
            fetchDeliveriesToBeStartedData(TransportUrls.deliveryTransportTypeList());
          } else if (selectedDeliveryStatusAndDeliveries?.status === 'lcl_deliveries') {
            fetchDeliveriesToBeStartedData(TransportUrls.LclDeliveryTransportTypeList('lcl'));
          } else if (selectedDeliveryStatusAndDeliveries?.status === 'in_progress_deliveries') {
            getTableData();
          } else {
            getTableData();
          }
          fetchLocalDeliveryCount()
    };

    const handleLocalTransportChangeModalOpen = (transport_tracking_id:number) => {
        setLocalTransportChangeModalOpen(true);
        setTransportVehicleTrackingId(transport_tracking_id);
    };

    //Pagination

    const handlePageNumberChange = (pageIndex: number) => {
        setPageIndex(pageIndex);
        getTableData({ pageIndex: pageIndex });
    }
    
    const handlePageSizeChange = (pageSize: number) => {
        setPageIndex(0);
        setPageSize(pageSize);
        getTableData({ pageIndex: 0, pageSize: pageSize });
    }

    const handleTableSearch = (search: string) => {
        setPageIndex(0);
        tableRef.current.setPageIndex(0);
        setGlobalFilter(search?.trim());
        getTableData({ pageIndex: 0, globalFilter: search?.trim() });
    }

    const handleTableFilterSearch = (filters: any) => {
        setPageIndex(0);
        tableRef.current.setPageIndex(0);
        setColumnFilters(filters);
        getTableData({ columnFilters: filters });
    }

    const handleSortingChange = (sorting: any) => {
        setPageIndex(0);
        tableRef.current.setPageIndex(0);
        setSorting(sorting);
        getTableData({ sorting: sorting });
    }

    useEffect(() => {
        fetchLocalDeliveryCount()
        fetchDeliveriesToBeStartedData(TransportUrls.LclDeliveryTransportTypeList('lcl'))
    }, [])

    useEffect(() => {
          setSelectedDeliveryStatusAndDeliveries(prev => ({
            ...prev,
            selectedDeliveries: [],
        }));
    }, [selectedDeliveryStatusAndDeliveries?.status])

    const resetStates = () => {
        setPageIndex(0);
        setPageSize(5);
        setTotalCount(0);
        setGlobalFilter('');
        setColumnFilters([]);
        updateData('inProgressDeliveriesData',[])
        setIsTableLoading(false);
    }

    useEffect(() => {
        resetStates();
        getTableData();
    }, []);

    return(
        <>
            <Box  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant='h1' color='text.primary' sx={{mt: 2}}>Local Transport</Typography>
            </Box>
            <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={2.4}>
                    <Card sx={{...cardStyles, 
                        boxShadow: selectedDeliveryStatusAndDeliveries?.status === 'lcl_deliveries' ? `2px 2px 2px ${blue[500]}, -2px -2px 2px ${blue[500]}, -2px 2px 2px ${blue[500]}, 2px -2px 2px ${blue[500]}, 0 2px 2px rgba(0,0,0,.06)` : `1px 1px 10px(0, 0, 0, 0.5)`,
                        borderLeft: selectedDeliveryStatusAndDeliveries?.status === 'lcl_deliveries' ? 'none' : `5px solid ${blue[500]}`
                        }}
                        onClick={() => handleSelectedDeliveryStatusAndDeliveries('status','lcl_deliveries')}
                         >
                        <CardContent>
                            <Grid container alignItems="center">
                            <Grid item xs={8}>
                                <Typography variant="subtitle1" gutterBottom sx={{color: blue[500], fontWeight: 'bold'}}>
                                LCL Deliveries
                                </Typography>
                                <Typography variant="h5" color="textPrimary" sx={countStyles}>
                                    {data?.localTransportDeliveryCount?.LCL || '--'}
                                </Typography>
                            </Grid>
                            <Grid item xs={4} sx={{ display: 'flex', justifyContent: 'flex-end'}}>
                                <HourglassBottom
                                    sx={{
                                        color: selectedDeliveryStatusAndDeliveries?.status === 'lcl_deliveries' ? blue[500] :grey[400],
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
                        boxShadow: selectedDeliveryStatusAndDeliveries?.status === 'full_containers' ? `2px 2px 2px ${orange[500]}, -2px -2px 2px ${orange[500]}, -2px 2px 2px ${orange[500]}, 2px -2px 2px ${orange[500]}, 0 2px 2px rgba(0,0,0,.06)` : `1px 1px 10px(0, 0, 0, 0.5)`,
                        borderLeft: selectedDeliveryStatusAndDeliveries?.status === 'full_containers' ? 'none' : `5px solid ${orange[500]}`
                        }} 
                        onClick={() => handleSelectedDeliveryStatusAndDeliveries('status','full_containers')}
                        >
                        <CardContent>
                            <Grid container alignItems="center">
                            <Grid item xs={8}>
                                <Typography variant="subtitle1" gutterBottom sx={{color: orange[500], fontWeight: 'bold'}}>
                                Full Containers
                                </Typography>
                                <Typography variant="h5" color="textPrimary" sx={countStyles}>
                                    {data?.localTransportDeliveryCount?.FCL || '--'}
                                </Typography>
                            </Grid>
                            <Grid item xs={4} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <HourglassFull
                                    sx={{
                                        color: selectedDeliveryStatusAndDeliveries?.status === 'full_containers' ? blue[500] :grey[400],
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
                        boxShadow: selectedDeliveryStatusAndDeliveries?.status === 'in_progress_deliveries' ? `2px 2px 2px ${red[500]}, -2px -2px 2px ${red[500]}, -2px 2px 2px ${red[500]}, 2px -2px 2px ${red[500]}, 0 2px 2px rgba(0,0,0,.06)` : `1px 1px 10px(0, 0, 0, 0.5)`,
                        borderLeft: selectedDeliveryStatusAndDeliveries?.status === 'in_progress_deliveries' ? 'none' : `5px solid ${red[500]}`
                        }} 
                        onClick={() => handleSelectedDeliveryStatusAndDeliveries('status','in_progress_deliveries')}
                        >
                        <CardContent>
                            <Grid container alignItems="center">
                            <Grid item xs={8}> 
                                <Typography variant="subtitle1" gutterBottom sx={{color: red[500], fontWeight: 'bold'}}>
                                In Progress Deliveries
                                </Typography>
                                <Typography variant="h5" color="textPrimary" sx={countStyles}>
                                    {data?.localTransportDeliveryCount?.in_progress_local_delivery_count || '--'}
                                </Typography>
                            </Grid>
                            <Grid item xs={4} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <LocalShipping
                                    sx={{
                                        color: selectedDeliveryStatusAndDeliveries?.status === 'in_progress_deliveries' ? blue[500] :grey[400],
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
                        boxShadow: selectedDeliveryStatusAndDeliveries?.status === 'completed_deliveries' ? `2px 2px 2px ${green[500]}, -2px -2px 2px ${green[500]}, -2px 2px 2px ${green[500]}, 2px -2px 2px ${green[500]}, 0 2px 2px rgba(0,0,0,.06)` : `1px 1px 10px(0, 0, 0, 0.5)`,
                        borderLeft: selectedDeliveryStatusAndDeliveries?.status === 'completed_deliveries' ? 'none' : `5px solid ${green[500]}`
                        }} 
                        onClick={() => handleSelectedDeliveryStatusAndDeliveries('status','completed_deliveries')}
                        >
                        <CardContent>
                            <Grid container alignItems="center">
                            <Grid item xs={8}> 
                                <Typography variant="subtitle1" gutterBottom sx={{color: green[500], fontWeight: 'bold'}}>
                                Completed Local Deliveries
                                </Typography>
                                <Typography variant="h5" color="textPrimary" sx={countStyles}>
                                    {data?.localTransportDeliveryCount?.completed_local_delivery_count || '--'}
                                </Typography>
                            </Grid>
                            <Grid item xs={4} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <AssignmentTurnedInIcon
                                    sx={{
                                        color: selectedDeliveryStatusAndDeliveries?.status === 'completed_deliveries' ? blue[500] :grey[400],
                                    }}
                                    fontSize="large"
                                />
                            </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {(selectedDeliveryStatusAndDeliveries?.status && (
                isLoading ? (
                    <DefaultLoader />
                ) : (
                    <>
                        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                            {/* <Button
                                onClick={() => {setCutoffDetailsModalOpen(true)}}
                                variant="contained"
                                color="primary"
                                sx={{ marginBottom: "16px" }}
                                // disabled={}
                            >
                                View Cutoff Details
                            </Button> */}
                            { selectedDeliveryStatusAndDeliveries?.status !== 'created_local_deliveries' && (
                                <Button
                                onClick={() => {setTransportDeliveryDateTrackingDataModalOpen(true)}}
                                variant="contained"
                                color="primary"
                                sx={{ marginBottom: "16px",marginLeft: "16px" }}
                                disabled={selectedDeliveryStatusAndDeliveries?.selectedDeliveries?.length === 0}
                            >
                                Start
                            </Button>
                            )}
                        </Box>
                        
                        {(selectedDeliveryStatusAndDeliveries?.status === 'full_containers' ||
                        selectedDeliveryStatusAndDeliveries?.status === 'lcl_deliveries') && (
                            <RitzTable
                                data={data?.deliveriesToBeStartedData}
                                columns={deliveriesToBeStartedColumns}
                            />
                        )}

                        {(selectedDeliveryStatusAndDeliveries?.status === 'in_progress_deliveries' ||
                         selectedDeliveryStatusAndDeliveries?.status === 'completed_deliveries')
                        && (
                            <RitzTable
                                data={data?.inProgressDeliveriesData}
                                columns={createdDeliveriesColumns}
                                tableRef={tableRef}
                                serverSideRendering={true}
                                totalCount={totalCount}
                                onPageNumberChange={handlePageNumberChange}
                                onPerPageCountChange={handlePageSizeChange}
                                onSearchTextChange={handleTableSearch}
                                onFilterSearch={handleTableFilterSearch}
                                onSortingChange={handleSortingChange}
                                isLoading={isTableLoading}
                                
                            />
                        )}

                    </>
                )
            ))}

            <RitzModal
                open={transportDeliveryDateTrackingDataModalOpen}
                onClose={() => setTransportDeliveryDateTrackingDataModalOpen(false)}
                maxWidth= {false}
                title={"Local Transport Consolidation"}>
                    <LocalTransportConsolidation
                        selectedDeliveries = {selectedDeliveryStatusAndDeliveries?.selectedDeliveries}
                        clearSelectedDeliveries={clearSelectedDeliveries}
                        handleSelectedDeliveryStatusAndDeliveries={handleSelectedDeliveryStatusAndDeliveries}
                        transportVehicleTrackingId={transportVehicleTrackingId}
                        fetchData={getTableData}
                        fetchTransportDeliveryCounts={fetchLocalDeliveryCount}
                        closeModal={handleTransportDeliveryDateTrackingDataModalClose}
                        />
            </RitzModal>

            <RitzModal
                open={localTransportChangeModalOpen}
                onClose={() => setLocalTransportChangeModalOpen(false)}
                maxWidth= {false}
                title={"Local Transport Change Interface"}>
                    
                    <LocalTransportChangeInterface
                        transportVehicleTrackingId={transportVehicleTrackingId}
                        selectedDeliveries = {selectedDeliveryStatusAndDeliveries?.selectedDeliveries}
                        selectedDeliveryIds={'selectedDeliveryAndTransportStatus?.selectedDeliveryIds'}
                        onClose={handleClose}
                        fetchTransportDeliveryDateTrackingListData={getTableData}
                        fetchTransportDeliveryCounts={fetchLocalDeliveryCount}
                        // fetchCreatedDeliveriesData = {'handleFetchCreatedDeliveriesData()'}
                        // transportDeliveryDateTrackingListData={'data?.transportDeliveryDateTrackingListData'}
                    />
                
            </RitzModal>
        </>
    )
};

export default LocalTransport

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
