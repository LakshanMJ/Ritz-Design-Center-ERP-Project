import { getDefaultError } from '@/helpers/Utilities'
import api from '@/services/api'
import React, { useEffect, useState } from 'react'
import * as GrnUrls from '../../helpers/constants/rest_urls/GrnUrls';
import toast from 'react-hot-toast'
import { Box, Typography, Button, Grid, Card, CardContent, CardHeader, IconButton, Link, Divider, List, ListItem, ListItemText, ListItemButton, TableContainer, Table } from '@mui/material';
import { createNewGrnPageURL, createdGrnDetailsPageURL } from '@/helpers/constants/front_end/GrnUrls';
import router from 'next/router';
import DefaultLoader from '@/components/DefaultLoader';
import { amber, blue, green, grey, orange, red } from '@mui/material/colors';
import TodayIcon from '@mui/icons-material/Today';
import NextLink from 'next/link';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import DateRangeIcon from '@mui/icons-material/DateRange';
import ChecklistRtlIcon from '@mui/icons-material/ChecklistRtl';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import EditIcon from '@mui/icons-material/Edit';
import { purchaseOrderClubDetailsPageURL } from '@/helpers/constants/front_end/POUrls';
import { ColumnDef } from '@tanstack/react-table';
import RitzTable from '@/components/Ritz/RitzTable';
import RitzModal from '@/components/Ritz/RitzModal';
import CircularLoader from '@/components/CircularLoader';
import RitzDropZoneFileUpload from '@/components/Ritz/RitzDropZoneFileUpload';
import { orderSummaryPageURL, purchaseOrderDetailPageURL } from '@/helpers/constants/FrontEndUrls';
import { number } from 'yup';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import GrnSummary from './GrnSummary';
import AttachmentDetails from '../supplier_po/reports/AttachmentDetails';
import DeliveryDateDetails from './DeliveryDateDetails';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SupplierPOGRNDetails from '@/views/grn/SupplierPOGRNDetails';

const GrnDashboard = () => {

    const poColumns: ColumnDef<any>[] = [
        {
            accessorKey: 'order_details.ritz_code',
            header: 'Order Details',
            cell: ({ row }: any) => {
                const orderDetails = row.original.order_details;
                console.log(orderDetails,"orderDetailsorderDetails")
                if (!orderDetails) return null;
    
                const purchaseOrdersArray = Object.values(orderDetails?.purchase_orders || {});
    
                const purchaseOrders = purchaseOrdersArray.map((order: any, orderIndex: number) => (
                    <React.Fragment key={orderIndex}>
                        <Link sx={{cursor: 'pointer'}} href={purchaseOrderDetailPageURL(order.id)} >{order.name}</Link>
                        {orderIndex < purchaseOrdersArray.length - 1 && "/"}
                    </React.Fragment>
                ));
    
                return (
                    <>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap',  maxWidth: '100%' }}>
                      <Link sx={{cursor: 'pointer'}} href={orderSummaryPageURL(orderDetails.order_id, orderDetails.costing_id)} >{orderDetails.ritz_code}</Link>
                        {purchaseOrders.length>0 && (
                            <>
                                /{ purchaseOrders }/
                            </>
                      )}
                      <Link sx={{cursor: 'pointer'}} href={purchaseOrderClubDetailsPageURL(orderDetails.po_club)} >{orderDetails.po_club_display_number}</Link>
                    </Box>
                    </>
                );
            },
            meta: {

                width: 500
            }
        },
        {
            accessorKey: 'supplier_name',
            header: 'Supplier',
        },
        {
            accessorKey: 'customer_name',
            header: 'Customer',
        },
        {
            accessorKey: 'supplier_po_number',
            header: 'Supplier PO',
            cell: props => (
                <Link  target='_blank'  component={NextLink} href={props.row?.original?.attachment_file_path || '#'}>{props.row?.original?.supplier_po_number}</Link>
            )
        },
        {
            accessorKey: 'materials',
            header: 'Materials',
            cell: (props:  any) => {
                const materials = props?.row?.original?.material_types || [];
                return (
                    <>
                        {materials.map((material: string, index: number) => (
                            <React.Fragment key={index}>
                                {material}
                                {index < materials.length - 1 && ', '} 
                            </React.Fragment>
                        ))}
                    </>
                );
            }
        },        
        {
            accessorKey: 'supplierdeliverydate_set',
            header: 'Expected Delivery Date',
            cell: props => {
                const deliveryDates = props?.row?.original?.supplierdeliverydate_set;
                const uniqueDeliveryDates = Array.from(new Set(deliveryDates?.map((date: any) => date.confirmed_delivery_date)));
                const sortedDeliveryDates = uniqueDeliveryDates.sort((a: any, b: any) => new Date(a).getTime() - new Date(b).getTime());
        
                let joinedDates = '';
                for (let i = 0; i < sortedDeliveryDates.length; i++) {
                    joinedDates += sortedDeliveryDates[i];
                    if ((i + 1) % 4 !== 0 && i !== sortedDeliveryDates.length - 1) {
                        joinedDates += ', ';
                    } else if (i !== sortedDeliveryDates.length - 1) {
                        joinedDates += ',<br />';
                    }
                }

                return (
                    <Typography sx={{ lineHeight: 2 }} dangerouslySetInnerHTML={{ __html: joinedDates }} />
                );
            }
        },      
        {
            accessorKey: "id",
            header: 'Action',
            enableSorting: false,
            enableColumnFilter: false,
            enableGlobalFilter: false,
            cell: props => (
                <>
                    <Box display="flex" gap={1} justifyContent="center">
                        <IconButton size='small' color='primary' onClick={() => handleGrnModalViewAction(props.row.original)}>
                            <EditIcon fontSize='inherit' />
                        </IconButton>
                        <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleViewDetails(true, props.row.original)}
                        >
                            <VisibilityIcon fontSize="inherit" />
                        </IconButton>
                    </Box>
                </>
            ),
            meta: {
                align: 'center',
                width: 100
            }
        }
    ];

    const grnColumns: ColumnDef<any>[] = [
        {
            accessorKey: 'id',
            header: 'GRN',
            cell: props => (
                <Link href={createdGrnDetailsPageURL(props.row?.original?.id)} component={NextLink}>{props.row?.original?.grn_number}</Link>
            ),
        },
        {
            accessorKey: 'order_details.ritz_code',
            header: 'Order Details',
            cell: ({ row }: any) => {
                const orderDetails = row.original.order_details;
                if (!orderDetails) return null;
    
                const purchaseOrdersArray = Object.values(orderDetails?.purchase_orders || {});
    
                const purchaseOrders = purchaseOrdersArray.map((order: any, orderIndex: number) => (
                    <React.Fragment key={orderIndex}>
                         <Link sx={{cursor: 'pointer'}} href={purchaseOrderDetailPageURL(order.id)} >{order.display_number}</Link>
                        {orderIndex < purchaseOrdersArray.length - 1 && <Typography component="span">/ </Typography>}
                    </React.Fragment>
                ));
    
                return (
                    <>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap',  maxWidth: '100%' }}>
                    <Link sx={{cursor: 'pointer'}} href={orderSummaryPageURL(orderDetails.order_id, orderDetails.costing_id)}>{orderDetails.ritz_code}</Link>
                        {purchaseOrders.length > 0 && (
                            <>
                                /{purchaseOrders}/
                            </>
                        )}
                      <Link sx={{cursor: 'pointer'}} href={purchaseOrderClubDetailsPageURL(orderDetails.po_club)}>{orderDetails.display_number}</Link>
                    </Box>
                    </>
                );
            },
            meta: {
                width: 500
            }
        },
        {
          accessorKey: 'supplier_name',
          header: 'Supplier',
        },
        {
            accessorKey: 'supplier_po_number',
            header: 'Supplier PO',
            cell: props => (
              <Link  target='_blank'  component={NextLink} href={props.row?.original?.attachment_file_path || '#'}>{props.row?.original?.supplier_po_number}</Link>
          )
        },
        {
            accessorKey: 'customer_name',
            header: 'Customer',
        },
        {
          accessorKey: 'state_display',
          header: 'State',
        }
    ];

    const totalExpectedDeliveriesKey = 'po_due_today_count'
    const pastDueDeliveriesKey = 'po_past_due_count'
    const pastDue7DaysDeliveriesKey = 'po_due_in_7_days_count'
    const completedDeliveriesKey = 'grn_complete_count'
    const inPrograssDeliveriesKey = 'grn_in_progress_count'

    //useState definitions
    const statusKey = 'status'
    const rowDataKey = 'rowData'
    const supplierPoTypeKey = 'supplier_po'
    const grnTypeKey = 'grn'
    const deliveryIdKey = 'deliveryId'

    const [selectedType, setSelectedType] = useState([totalExpectedDeliveriesKey])
    const [isLoading, setIsLoading] = useState(true);
    const [isCreatingNewGrn, setIsCreatingNewGrn] = useState(false);
    const [isTableRefreshing, setIsTableRefreshing] = useState(false);
    const [createdGrnDetails, setCreatedGrnDetails] = useState([])
    const [deliveryCounts, setDeliveryCounts] = useState<any>({})
    const [uploadedSupplierInvoiceDetails, setUploadedSupplierInvoiceDetails] = useState({ supplier_po: null })
    const [isGrnModalOpen, setIsGrnModalOpen] = useState({ [statusKey]: false, [rowDataKey]: [], [supplierPoTypeKey]: null, [deliveryIdKey]: null })
    const [isGrnDeliverySelectionModalOpen, setIsGrnDeliverySelectionModalOpen] = useState({ [statusKey]: false, [rowDataKey]: [], [supplierPoTypeKey]: null })
    const [isOpenGrnDetailModal, setIsOpenGrnDetailModal] = useState({ [statusKey]: false, [rowDataKey]: [], type:null, supplier_po:''})
    const [tableTitle, setTableTitle] = useState<any>({
        [totalExpectedDeliveriesKey]: 'Total Expected Deliveries',
        [pastDueDeliveriesKey]: 'Past Due Deliveries',
        [pastDue7DaysDeliveriesKey]: '7 Days Past Due Deliveries',
        [completedDeliveriesKey]: `Completed Deliveries`,
        [inPrograssDeliveriesKey]: 'In Progress Deliveries',
    })
    const [openGRNDetailsModal, setOpenGRNDetailsModal] = useState({modalStatus: false, poClubId: null});

    const handleSelectedType = (type: any) => {
        setIsTableRefreshing(true)
        setSelectedType(type)
    }

    const handleStartNewGrnViewingAction = () => {
        router.push(createNewGrnPageURL(0))
    }

    const handleExistingGrnViewingAction = (grnId: any) => {
        router.push(createdGrnDetailsPageURL(grnId))
    }

    const supplierPoUploadModalOpen = () => {
        setIsCreatingNewGrn(true)
    }

    const supplierPoUploadModalClose = () => {
        setIsCreatingNewGrn(false)
    }

    const handleGrnModalViewAction = (rowData: any) => {
        const createdGrnDetails = rowData?.grns
        console.log(rowData.supplierdeliverydate_set,"rowData")
        if(rowData.supplierdeliverydate_set.length ===1){
            setIsGrnModalOpen({[statusKey] : true, [rowDataKey]: createdGrnDetails, [supplierPoTypeKey]:rowData.id, [deliveryIdKey]:rowData.supplierdeliverydate_set[0].id})
        }else{
            setIsGrnDeliverySelectionModalOpen({[statusKey] : true, [rowDataKey]: createdGrnDetails, [supplierPoTypeKey]:rowData.id})
        }



        
        // if (createdGrnDetails.length > 0) {
        //     setIsGrnModalOpen({[statusKey] : true, [rowDataKey]: createdGrnDetails})
        // }else {
        //     router.push(createNewGrnPageURL(rowData.id))
        // } 
    }

    const handleGrnDetailsModal = (rowData: any, modalType:any, supplierPo:any) => {
        const sourceId = rowData
        setIsOpenGrnDetailModal({[statusKey] : true, [rowDataKey]: sourceId, type: modalType, supplier_po: supplierPo })
    }

    const handleGrnModalClose = () => {
        setIsGrnModalOpen({[statusKey] : false, [rowDataKey]: [], [supplierPoTypeKey]:null, [deliveryIdKey]:null})
    }
    const handleGrnDeliveryModalClose = () => {
        setIsGrnDeliverySelectionModalOpen({[statusKey] : false, [rowDataKey]: [], [supplierPoTypeKey]:null})
    }

    const handleGrnDetailModalClose = () => {
        setIsOpenGrnDetailModal({[statusKey] : false, [rowDataKey]: [], type:null, supplier_po:''})
    }

    const renderColumns = () => {
        if (selectedType.includes(completedDeliveriesKey) || selectedType.includes(inPrograssDeliveriesKey)) {
            return grnColumns;
        } else {
            return poColumns;
        }
    };
    
    const fetchTableData = () => {
        setCreatedGrnDetails([])
        if(selectedType) {
            const requests = [
                api.get(GrnUrls.filteredGrnDetailsListUrl(selectedType))
            ]
    
            if (Object.keys(deliveryCounts) && Object.keys(deliveryCounts).length === 0) {
                requests.push(api.get(GrnUrls.grnDashboardDeliveryCountUrl()));
            }
            
            Promise.all(requests).then(resp => {
                const respData = resp.map((r: any) => r.data);
                const [ GrnDeliveryData, deliveryCountData,] = respData
                console.log(GrnDeliveryData,"GrnDeliveryData")
                if (Object.keys(deliveryCounts) && Object.keys(deliveryCounts).length === 0) {
                    setDeliveryCounts(deliveryCountData)
                }
                setCreatedGrnDetails([...GrnDeliveryData]);
            }).catch(error => {
                toast.error(getDefaultError(error?.response?.status));
            }).finally(() => {
                setIsLoading(false)
                setIsTableRefreshing(false)});
        }
    }

    const handleFileUpload  = (details: any) => {
        setUploadedSupplierInvoiceDetails(details)
    }
    const handleNext = (selectedData:any) => {
        if(selectedData.delivery_date_id){
            setIsGrnDeliverySelectionModalOpen({[statusKey] : false, [rowDataKey]: [], [supplierPoTypeKey]:null})
            setIsGrnModalOpen({[statusKey] : true, [rowDataKey]: null, [supplierPoTypeKey]:selectedData.spo_id, [deliveryIdKey]:selectedData.delivery_date_id})
        }
    };
    const handleClickPrevious = (spoId:any) => {
        if(spoId){
            setIsGrnModalOpen({[statusKey] : false, [rowDataKey]: null, [supplierPoTypeKey]:null, [deliveryIdKey]:null})
            setIsGrnDeliverySelectionModalOpen({[statusKey] : true, [rowDataKey]: [], [supplierPoTypeKey]:spoId})
        }
    };
    
    const handleViewDetails =(status: any, data: any)=>{
        setOpenGRNDetailsModal({modalStatus: status, poClubId: data?.po_club_id || null})
    }

    useEffect(() => {
        setCreatedGrnDetails([])
        fetchTableData()
    }, [selectedType])

  return (
    <>
        {openGRNDetailsModal?.modalStatus && (
            <RitzModal open={openGRNDetailsModal?.modalStatus} title={<Typography variant='h2'>Summary Details</Typography>} onClose={()=>{handleViewDetails(false, null)}}  maxWidth='xl'>
               <SupplierPOGRNDetails clubId={openGRNDetailsModal?.poClubId} initialTab="2" />
            </RitzModal>
        )}
        {isOpenGrnDetailModal?.[statusKey] && (
            <RitzModal open={isOpenGrnDetailModal?.[statusKey]} title={<Typography variant='h2'>Summary Details</Typography>} onClose={handleGrnDetailModalClose}  maxWidth='lg'>
                <GrnSummary sourceDataUrl={isOpenGrnDetailModal?.type === supplierPoTypeKey? GrnUrls.grnSummaryRelatedToSupplierPoAndURL: GrnUrls.grnSummaryRelatedToGrnIdAndURL} sourceId={isOpenGrnDetailModal?.[rowDataKey]} />
            </RitzModal>
        )}
        {isGrnModalOpen?.[statusKey] && (
            // <RitzModal open={isGrnModalOpen?.[statusKey]} title={`Found ${isGrnModalOpen?.[rowDataKey].length} created GRNs which related to this supplier's PO`} onClose={handleGrnModalClose}>
            //     Select an existing GRN or create a new one.
            //     <Divider sx={{ mt: 2 }}/>
            //     <Box >
            //         <List>
            //             {isGrnModalOpen?.[rowDataKey].map((item: any, itemIndex: number) => (
            //               <ListItem
            //                 key={itemIndex}
            //                 value={item.id}
            //                 sx={{
            //                   cursor: 'pointer',
            //                   '&:hover': {
            //                     backgroundColor: grey[200],
            //                   },
            //                 }}
            //                 onClick={() => handleExistingGrnViewingAction(item.id)}
            //               >
            //                 {item.id}
            //               </ListItem>
            //             ))}
            //         </List>
            //     </Box>
            //     <Box sx={{ mt: 2, display: 'flex', justifyContent: 'end' }}>
            //     <Button variant="outlined" onClick={() => {router.push(createNewGrnPageURL(isGrnModalOpen?.[rowDataKey][0].supplier_po_id))}} sx={{float: 'right', mt: -1}}>Create New GRN</Button>
            //     </Box>
            // </RitzModal>
              <RitzModal
                  open={isGrnModalOpen?.[statusKey]}
                  onClose={handleGrnModalClose}
                  maxWidth='md'
                  title='Delivery Details'
              >
                  <AttachmentDetails spoId={isGrnModalOpen[supplierPoTypeKey]} deliveryData={isGrnModalOpen[deliveryIdKey]} type={'grn_dashboard'} selectedSPOId={handleClickPrevious} savedStatus={handleGrnModalClose} />
              </RitzModal>
        )}
        {isGrnDeliverySelectionModalOpen && (
            <RitzModal open={isGrnDeliverySelectionModalOpen?.[statusKey]} title={'Delivery Dates Detail'}  maxWidth='md' onClose={handleGrnDeliveryModalClose}>
                <DeliveryDateDetails supplierPoId={isGrnDeliverySelectionModalOpen?.[supplierPoTypeKey]} selectedData={handleNext}/>
            </RitzModal>
        )}
         {isCreatingNewGrn && (
            <RitzModal open={isCreatingNewGrn} title={'Create a Goods Received Note (GRN) from Supplier PO File'} onClose={supplierPoUploadModalClose}>
               <Typography >Drag and drop or Upload Supplier PO Files</Typography>
                <Divider sx={{ mt: 2 }}/>
                <Box >
                    <RitzDropZoneFileUpload onUpload={handleFileUpload} multi={false}/>
                </Box>
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'end' }}>
                <Button variant="outlined" onClick={() => {router.push(createNewGrnPageURL(uploadedSupplierInvoiceDetails.supplier_po))}} sx={{float: 'right', mt: -1}}>Create New GRN</Button>
                </Box>
            </RitzModal>
        )}
        
        <Box  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant='h1' color='text.primary' sx={{mt: 2}}>{'GRN Dashboard'}</Typography>
        {/* <Button variant="outlined" onClick={handleStartNewGrnViewingAction} sx={{float: 'right', mt: -1}}>Create New GRN</Button> */}
        <Button variant="outlined" sx={{float: 'right', mt: -1}} onClick={supplierPoUploadModalOpen}>Create New GRN</Button>
        </Box>
        {isLoading ? <DefaultLoader /> : (
            <>
             <Grid container spacing={2}>
             <Grid item xs={12} sm={6} md={2.4}>
             <Card sx={{...cardStyles, 
                boxShadow: selectedType.includes('po_due_today_count') ? `2px 2px 2px ${blue[500]}, -2px -2px 2px ${blue[500]}, -2px 2px 2px ${blue[500]}, 2px -2px 2px ${blue[500]}, 0 2px 2px rgba(0,0,0,.06)` : `1px 1px 10px(0, 0, 0, 0.5)`,
                borderLeft: selectedType.includes('po_due_today_count') ? 'none' : `5px solid ${blue[500]}`
                }} onClick={() => handleSelectedType([totalExpectedDeliveriesKey])}>
                <CardContent>
                    <Grid container alignItems="center">
                      <Grid item xs={8}>
                        <Typography variant="subtitle1" gutterBottom sx={{color: blue[500], fontWeight: 'bold'}}>
                          Today Expected Deliveries
                        </Typography>
                        <Typography variant="h5" color="textPrimary" sx={countStyles}>
                        {deliveryCounts?.[totalExpectedDeliveriesKey] || '--'}
                        </Typography>
                    </Grid>
                    <Grid item xs={4} sx={{ display: 'flex', justifyContent: 'flex-end'}}>
                        <TodayIcon 
                         sx={{
                            color: selectedType.includes('po_due_today_count') ? blue[500] :grey[400],
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
                 boxShadow: selectedType.includes('po_due_in_7_days_count') ? `2px 2px 2px ${orange[500]}, -2px -2px 2px ${orange[500]}, -2px 2px 2px ${orange[500]}, 2px -2px 2px ${orange[500]}, 0 2px 2px rgba(0,0,0,.06)` : `1px 1px 10px(0, 0, 0, 0.5)`,
                 borderLeft: selectedType.includes('po_due_in_7_days_count') ? 'none' : `5px solid ${orange[500]}`
                }} onClick={() => handleSelectedType([pastDue7DaysDeliveriesKey])}>
                <CardContent>
                    <Grid container alignItems="center">
                      <Grid item xs={8}>
                        <Typography variant="subtitle1" gutterBottom sx={{color: orange[500], fontWeight: 'bold'}}>
                        7 Days Past Due Deliveries
                        </Typography>
                        <Typography variant="h5" color="textPrimary" sx={countStyles}>
                        {deliveryCounts?.[pastDue7DaysDeliveriesKey] || '--'}
                        </Typography>
                    </Grid>
                    <Grid item xs={4} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <DateRangeIcon 
                            sx={{ 
                                color: selectedType.includes('po_due_in_7_days_count') ? orange[500] :grey[400],
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
                boxShadow: selectedType.includes('po_past_due_count') ? `2px 2px 2px ${red[500]}, -2px -2px 2px ${red[500]}, -2px 2px 2px ${red[500]}, 2px -2px 2px ${red[500]}, 0 2px 2px rgba(0,0,0,.06)` : `1px 1px 10px(0, 0, 0, 0.5)`,
                borderLeft: selectedType.includes('po_past_due_count') ? 'none' : `5px solid ${red[500]}`
                }} onClick={() => handleSelectedType([pastDueDeliveriesKey])}>
                <CardContent>
                    <Grid container alignItems="center">
                      <Grid item xs={8}>
                        <Typography variant="subtitle1" gutterBottom sx={{color: red[500], fontWeight: 'bold'}}>
                        Past Due Deliveries
                        </Typography>
                        <Typography variant="h5" color="textPrimary" sx={countStyles}>
                        {deliveryCounts?.[pastDueDeliveriesKey] || '--'}
                        </Typography>
                    </Grid>
                    <Grid item xs={4} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <CalendarMonthIcon 
                            sx={{ 
                                color: selectedType.includes('po_past_due_count') ? red[500] :grey[400],
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
                 boxShadow: selectedType.includes('grn_in_progress_count') ? `2px 2px 2px ${amber[500]}, -2px -2px 2px ${amber[500]}, -2px 2px 2px ${amber[500]}, 2px -2px 2px ${amber[500]}, 0 2px 2px rgba(0,0,0,.06)` : `1px 1px 10px(0, 0, 0, 0.5)`,
                 borderLeft: selectedType.includes('grn_in_progress_count') ? 'none' : `5px solid ${amber[500]}`
                }} onClick={() => handleSelectedType([inPrograssDeliveriesKey])}>
                <CardContent>
                    <Grid container alignItems="center">
                      <Grid item xs={8}>
                        <Typography variant="subtitle1" gutterBottom sx={{color: amber[500], fontWeight: 'bold'}}>
                        In Progress Deliveries
                        </Typography>
                        <Typography variant="h5" color="textPrimary" sx={countStyles}>
                        {deliveryCounts?.[inPrograssDeliveriesKey] || '--'}
                        </Typography>
                    </Grid>
                    <Grid item xs={4} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <HourglassEmptyIcon 
                            sx={{ 
                                color: selectedType.includes('grn_in_progress_count') ? amber[500] :grey[400],
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
                 boxShadow: selectedType.includes('grn_complete_count') ? `2px 2px 2px ${green[500]}, -2px -2px 2px ${green[500]}, -2px 2px 2px ${green[500]}, 2px -2px 2px ${green[500]}, 0 2px 2px rgba(0,0,0,.06)` : `1px 1px 10px(0, 0, 0, 0.5)`,
                 borderLeft: selectedType.includes('grn_complete_count') ? 'none' : `5px solid ${green[500]}`
                }} onClick={() => handleSelectedType([completedDeliveriesKey])}>
                <CardContent>
                    <Grid container alignItems="center">
                      <Grid item xs={8}>
                        <Typography variant="subtitle1" gutterBottom sx={{color: green[500], fontWeight: 'bold'}}>
                        Completed Deliveries
                        </Typography>
                        <Typography variant="h5" color="textPrimary" sx={countStyles}>
                        {deliveryCounts?.[completedDeliveriesKey] || '--'}
                        </Typography>
                    </Grid>
                    <Grid item xs={4} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <ChecklistRtlIcon 
                            sx={{ 
                                color: selectedType.includes('grn_complete_count') ? green[500] :grey[400],
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
            <Typography variant='h4'>{tableTitle[selectedType as unknown as string]}</Typography>
            {isTableRefreshing ? <CircularLoader /> : (
            <RitzTable
            data={createdGrnDetails}
            columns={renderColumns()}
            />
            )}
            </Box>
            </>
        )}
    </>
  )
}

export default GrnDashboard

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