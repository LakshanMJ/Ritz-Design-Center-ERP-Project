import RitzTable from "@/components/Ritz/RitzTable";
import { ColumnDef } from "@tanstack/react-table";
import React, { useEffect, useState } from "react";
import * as restUrls from "@/helpers/constants/RestUrls";
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import { Box, IconButton, Tooltip, Link, Checkbox, Grid, Table, TableHead, TableRow, TableCell, TableBody, Typography, Button, Alert } from "@mui/material";
import ReviewStatus from "@/components/OrderInquiry/Costing/ReviewStatus";
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import PendingIcon from '@mui/icons-material/Pending';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import SmsFailedIcon from '@mui/icons-material/SmsFailed';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { CapitalizeFirstLetterEachWord, getDefaultError } from "@/helpers/Utilities";
import RitzModal from "@/components/Ritz/RitzModal";
import dayjs from "dayjs";
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ReplyModal from "./ReplyModal";
import api from "@/services/api";
import toast from "react-hot-toast";
import * as supplierApis from "@/helpers/constants/rest_urls/SupplierUrls";
import CostsModal from "./CostsModal";
import AddBoxIcon from '@mui/icons-material/AddBox';
import FileCopyIcon from '@mui/icons-material/FileCopy';
import CreatedSupplierInquries from "./CreatedSupplierInquries";



const EmailStatusIcon = ({ status }: any) => {
    const title = CapitalizeFirstLetterEachWord(status?.split('_')?.join(' '));
    return (
        <Tooltip title={title}>
            {
                status === 'queued_email' ?  <PendingIcon color='info' /> :
                status === 'pending_email' ? <ScheduleIcon color='warning' /> :
                status === 'received_and_processed' ? <MarkEmailReadIcon color='success' /> :
                status === 'pending_response' ? <HourglassEmptyIcon color='info' /> :
                <SmsFailedIcon color='error' />
            }
        </Tooltip>
    )
}

const InquiryTable = ({ data, onRowSelect, orderId, versionId, consumptionData, costPerUnitTypes, transportTypes, payModes, suppliers, savedData, refreshData}: any) => {
    const headers = data?.headers;
    const [columnDef, setColumnDef] = useState([]);
    const [isReady, setIsReady] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalData, setModalData] = useState<any>({});
    const [replyModalOpen, setReplyModalOpen] = useState({ modalOpen: false, selectedSupplierId: null, selectedSupplierInquiryDetailId: null, selectedSupplierInquiryId: null });
    const [isLoading, setIsLoading] = useState(false);
    const [costsModalOpen, setCostsModalOpen] = useState(false);
    const [selected, setSelected] = useState({});
    const [errors, setErrors] = useState<any>({});
    const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState({ status: false, supplierInquiryDetailId: null });
    const [isOpenPreviousInquiries, setIsOpenPreviousInquiries] = useState({ modalStatus: false, customerBrandMaterialId: null });
    const getRowCanExpand = (row: any) => {
        const subRows = row?.original?.subRows || [];
        return subRows.length > 0;
    }
    const getToggleExpandedHandler = (table: any) => {
        const expandedState = getIsAllRowsExpanded(table);
        const rows = table.getRowModel().rows;
        rows.map((row: any) => {
            const canExpand = row.getCanExpand();
            if (canExpand) {
                row.toggleExpanded(!expandedState);
            }
        });
    }

    const handleDelete = (supplierInquiryDetailId:number) => {
        setIsConfirmationModalOpen({ status: true, supplierInquiryDetailId: supplierInquiryDetailId });
    };

    const handleOnClickOK = (supplierInquiryDetailId:any) => {
        api.delete(supplierApis.deleteSupplierInquiryURL(supplierInquiryDetailId)).then(resp => {
            savedData()
            setIsConfirmationModalOpen({ status: false, supplierInquiryDetailId: null  });
        }).catch(error => {
            setErrors({...error?.response?.data})
            toast.error(getDefaultError(error?.response?.status));
        })
    };

    const handleOnClickCancel = (supplierInquiryDetailId:any) => {
        setErrors({})
        setIsConfirmationModalOpen({ status: false, supplierInquiryDetailId: supplierInquiryDetailId  });
    };

    const getIsAllRowsExpanded = (table: any): boolean => {
        const rows = table.getRowModel().rows;
        const expandable = rows.filter((row: any) => row.getCanExpand());
        return expandable.every((row: any) => row.getIsExpanded());
    }

    const getHasExpandableRows = (table: any) => {
        const rows = table.getRowModel().rows;
        return rows.filter((i: any) => i.getCanExpand()).length > 0;
    }
    
    const openDetailsModal = (data: any) => {
        let modalData = {
            'Suppplier': data.supplier_name,
            'FOB': data.fob_price,
            'Freight Charges': data.freight_charge,
            'CIF': data.cif_price,
            'Cutting Width': data.cutting_width,
            'Cutting Width Unit': data.cutting_width_unit,
            'Costing Unit': data.costing_unit,
            'Date Sent': data.created,
            'Last Update': data.updated,
            'Cost per Unit': data.cost_per_unit,
            'Expiration Date': data.expiration_date,
            'Lead Time in Number of Days': data.lead_time,
            'Email Status': data.email_status,
        };
        if (data?.material_details?.material_type !== 'fabric') {
            delete modalData['Cutting Width'];
            delete modalData['Cutting Width Unit'];
        }

        setModalData(modalData);
        setModalOpen(true);
    }

    const handleEditSupplier = (supplierId:any, selectedSupplierInquiryDetailId: any, selectedSupplierInquiryId: any) => {
        setReplyModalOpen({ modalOpen: true, selectedSupplierId: supplierId, selectedSupplierInquiryDetailId: selectedSupplierInquiryDetailId, selectedSupplierInquiryId: selectedSupplierInquiryId })
    }
    
    const handleOpenEnterCostModal =(selectedData:any)=>{
       setCostsModalOpen(true)
        const newSelectedData = [selectedData]

        newSelectedData.forEach((sd: any) => {
            let description = {} as any;
            headers.forEach((h: any) => {
                description[h.label] = sd[h.name];
            });
            sd._isService = Object.keys(sd).includes('service_id'); //material?.name?.includes('_service');
            sd._description = description;
        });
        const newState = {
            ...selected,
            [data.display_name]: [selectedData]
        }
        setSelected(newState);
    }

    const handleOpenPreviousSupplierInquiries = (status: any, materialId: any, dataSet: any) => {
        setIsOpenPreviousInquiries({modalStatus: status, customerBrandMaterialId: materialId})
    }

    const renderSubRow = ({ row }: any) => {
        const subRows = row?.original?.subRows || [];
        const materialType = subRows?.[0]?.material_details?.material_type;
    
        return (
            <Table
                size='small'
                sx={{
                    borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`,
                    '& .MuiTableCell-head': {
                        color: (theme) => theme.palette.grey[700],
                        background: (theme) => theme.palette.grey[50],
                        // fontWeight: 'normal'
                        width: '200px'
                    }
                }}
            >
                <TableHead>
                    <TableRow>
                        <TableCell>Supplier</TableCell>
                        <TableCell>FOB</TableCell>
                        <TableCell>CIF</TableCell>
                        {materialType === 'fabric' && (
                            <>
                                <TableCell>Cutting Width</TableCell>
                                <TableCell>Cutting Width Unit</TableCell>
                            </>
                        )}
                        <TableCell>Costing Unit</TableCell>
                        <TableCell>Cost per Unit</TableCell>
                        <TableCell><abbr title="Expiration">Exp.</abbr> Date</TableCell>
                        <TableCell align='center'>Email Status</TableCell>
                        <TableCell align='center'>Details</TableCell>
                        <TableCell align='center'>Action</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {subRows?.length > 0 && subRows.map((d: any, i: number) => (
                        <TableRow
                            key={i}
                            sx={{
                                '&:last-child td, &:last-child th': {
                                    border: 0,
                                }
                            }}
                        >
                            <TableCell>{d.supplier_name ?? '--'}</TableCell>
                            <TableCell>{d.fob_price ?? '--'}</TableCell>
                            <TableCell>{d.cif_price ?? '--'}</TableCell>
                            {materialType === 'fabric' && (
                                <>
                                    <TableCell>{d.cutting_width ?? '--'}</TableCell>
                                    <TableCell>{d.cutting_width_unit ?? '--'}</TableCell>
                                </>
                            )}
                            <TableCell>{d.costing_unit_display ?? '--'}</TableCell>
                            <TableCell>{d.cost_per_unit ?? '--'}</TableCell>
                            <TableCell>{d.expiration_date ? dayjs(d.expiration_date).format('DD/MM/YYYY') : '--'}</TableCell>
                            <TableCell align='center'><EmailStatusIcon status={d.email_status} /></TableCell>
                            <TableCell align='center'>
                                <Link sx={{ cursor: 'pointer' }} onClick={(e) => { e.preventDefault(), openDetailsModal(d) }}>View</Link>
                            </TableCell>
                            <TableCell>
                            <Box style={{ display: 'flex', alignItems: 'center', gap: '-10px' }}>
                                <IconButton onClick={() => handleEditSupplier(d.supplier_id, d.id, d.supplier_inquiry)} >
                                    <Link><EditIcon /></Link>
                                </IconButton>
                                <IconButton onClick={() => handleDelete(d.id)}>
                                    <Link><DeleteIcon /></Link>
                                </IconButton>
                                </Box>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        )
    }

    const setColumns = () => {
        let cols: ColumnDef<any>[] = [
            {
                accessorKey: 'reference_code',
                header: ({ table }) => (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Checkbox
                            size='small'
                            checked={table.getIsAllRowsSelected()}
                            indeterminate={table.getIsSomeRowsSelected()}
                            onChange={table.getToggleAllRowsSelectedHandler()}
                        />

                        {getHasExpandableRows(table) && <IconButton size='small'
                            {...{
                                // onClick: getToggleAllRowsExpandedHandler,
                                onClick: () => getToggleExpandedHandler(table),
                            }}
                        >
                            {getIsAllRowsExpanded(table) ? <KeyboardArrowDownIcon /> : <KeyboardArrowRightIcon />}
                        </IconButton>}
                    </Box>
                ),
                cell: ({ row, getValue }) => (
                    <span style={{ paddingLeft: `${row.depth * 2}rem`, width: '20px' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Checkbox
                                size='small'
                                checked={row.getIsSelected()}
                                indeterminate={row.getIsSomeSelected()}
                                onChange={row.getToggleSelectedHandler()}
                            />
                            {row.getCanExpand() ? (
                                <IconButton size='small'
                                    {...{
                                    onClick: row.getToggleExpandedHandler(),
                                    style: { cursor: 'pointer' },
                                    }}
                                >
                                    {row.getIsExpanded() ? <KeyboardArrowDownIcon /> : <KeyboardArrowRightIcon />}
                                </IconButton>
                            ) : <Box sx={{ pl: 1, pt: 0.5 }}><ReviewStatus status={false} /></Box>}
                        </Box>
                    </span>
                ),
                enableSorting: false,
                enableColumnFilter: false,
                enableGlobalFilter: false,
                meta: {
                    align: 'left',
                    width: 95
                }
            }
        ];

        headers.map((h: any) => {
            if (h.is_attachment) {
                cols.push({
                    accessorKey: h.attachment_field_name,
                    header: h.label,
                    cell: (props: any) => (
                        <Link href={props.getValue()?.file_path} target="_blank">{props.getValue()?.display_name}</Link>
                    )
                });
            } else {
                cols.push({
                    accessorKey: h.name,
                    header: h.label
                });
            }
        })
        cols.push({
            id: 'reference code',
            accessorKey: '',
            header: () => (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', height: '100%' }}>
                    {'Enter Costd'}
                </Box>
            ),
            cell: (props: any) => (
                <Box sx={{ display: 'flex', justifyContent: 'right', alignItems: 'center', height: '100%' }}>
                    <FileCopyIcon onClick={() => handleOpenPreviousSupplierInquiries(true, props.row.original?.customer_brand_material_id, props.row.original)} sx={{ color: '#0288D1', mr:2 }}></FileCopyIcon>
                    <AddBoxIcon onClick={() => handleOpenEnterCostModal(props.row.original)} sx={{ color: '#0288D1' }}></AddBoxIcon>
                </Box>
            )
        });
        setColumnDef(cols);
    }

    useEffect(() => {
        setColumns();
        setIsReady(true);
    }, []);

    return (

        <>
            {isOpenPreviousInquiries?.modalStatus &&(
                <RitzModal open={isOpenPreviousInquiries?.modalStatus} onClose={() => {handleOpenPreviousSupplierInquiries(false, null, null)}} title='Select Inquiry' maxWidth={'lg'}>
                    <CreatedSupplierInquries customerBrandMaterialId={isOpenPreviousInquiries?.customerBrandMaterialId} versionId={versionId} refreshData={() => { handleOpenPreviousSupplierInquiries(false, null, null), savedData() }} />
                </RitzModal>
            )}
            {isConfirmationModalOpen.status && 
           
                <RitzModal open={isConfirmationModalOpen.status} onClose={() => {setIsConfirmationModalOpen({ status: false, supplierInquiryDetailId: null }),  setErrors({})}} title='Confirmation'>
                    <Box>
                    <Grid container spacing={1} >
                        <Grid item sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography>  Do you want to delete this supplier inquiry detail?</Typography>
                        </Grid>
                    </Grid>
                    </Box>
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'end', gap: 2 }}>
                    <Button variant="contained" color='primary' onClick={() => handleOnClickOK(isConfirmationModalOpen.supplierInquiryDetailId)}>Confirm</Button>
                    <Button variant="contained" color='primary' onClick={() => handleOnClickCancel(isConfirmationModalOpen.supplierInquiryDetailId)}>Cancel</Button>
                    </Box>
                    {errors?.detail && (
                        <Box sx={{ mt: 1 }}>
                            <Alert severity="error" >{errors?.detail}</Alert>
                        </Box>
                    )}
                  
                </RitzModal>}

            {isReady && (
                <RitzTable
                    title={<Typography variant='h5' sx={{ mb: 0 }}>{data?.display_name}</Typography>}
                    columns={columnDef}
                    data={data?.data}
                    getRowCanExpand={getRowCanExpand}
                    renderSubComponent={renderSubRow}
                    rowSelect
                    multiRowSelect
                    onRowSelect={onRowSelect}
                    pagination={false}
                />
            )}
            
            {replyModalOpen.modalOpen && (
                
            <ReplyModal
                            orderId={orderId}
                            versionId={versionId}
                            consumptionData={consumptionData}
                            costPerUnitTypes={costPerUnitTypes}
                            transportTypes={transportTypes}
                            payModes={payModes}
                            modalOpen={replyModalOpen.modalOpen}
                            setModalOpen={setReplyModalOpen}
                            refreshData={refreshData}
                            savedData={savedData}
                            suppliers={suppliers}
                            selectedSupplierId={replyModalOpen?.selectedSupplierId}
                            selectedSupplierInquiryDetailId={replyModalOpen?.selectedSupplierInquiryDetailId}
                            selectedSupplierInquiryId={replyModalOpen?.selectedSupplierInquiryId}
                        />
                    )}
            {costsModalOpen && (
                        <CostsModal
                            orderId={orderId}
                            versionId={versionId}
                            selected={selected}
                            suppliers={suppliers}
                            costPerUnitTypes={costPerUnitTypes}
                            transportTypes={transportTypes} 
                            payModes={payModes}
                            consumptionData={consumptionData}
                            modalOpen={costsModalOpen}
                            setModalOpen={setCostsModalOpen}
                            refreshData={refreshData}
                            savedData={savedData}
                            data={data}
                        />
                    )}

            <RitzModal
                title='Supplier Inquiry Details'
                open={modalOpen}
                onClose={() => setModalOpen(false)}
            >
                <Grid container spacing={1}>
                    {Object.keys(modalData).map((key: string, i: number) => (
                        <React.Fragment key={i}>
                            <Grid item xs={4} sx={{ fontWeight: 'bold' }}>{key}</Grid>
                            <Grid item xs={6}>
                                {!modalData[key] ? '--' : 
                                ['Date Sent', 'Last Update'].includes(key) ? dayjs(modalData[key]).format('DD/MM/YYYY hh:mm a') :
                                ['Expiration Date', 'Lead Time in Number of Days'].includes(key) ? dayjs(modalData[key]).format('DD/MM/YYYY') :
                                key === 'Email Status' ? <EmailStatusIcon status={modalData[key]}/> :
                                modalData[key]}
                            </Grid>
                        </React.Fragment>
                    ))}
                </Grid>
            </RitzModal>
        </>
    );
};

export default InquiryTable;