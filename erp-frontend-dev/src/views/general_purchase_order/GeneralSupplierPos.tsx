import React, { useEffect, useState } from 'react';
import RitzTable from '@/components/Ritz/RitzTable';
import {
    Box,
    Table,
    TableBody,
    TableCell,
    TableRow,
    TableHead,
    IconButton,
    Link,
    Typography,
} from '@mui/material';
import api from '@/services/api';
import NextLink from 'next/link';
import toast from 'react-hot-toast';
import { ColumnDef } from '@tanstack/table-core';
import { getDefaultError } from '@/helpers/Utilities';
import DefaultLoader from '@/components/DefaultLoader';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import { useRouter } from 'next/router';
import { generalSupplierPODetails, supplierInquiryDetails } from '@/helpers/constants/rest_urls/POUrls';
import RitzModal from '@/components/Ritz/RitzModal';
import GrnSummary from '@/views/grn/GrnSummary';
import { grnSummaryRelatedToSupplierPoAndURL } from '@/helpers/constants/rest_urls/GrnUrls';
import FormatColorFillIcon from '@mui/icons-material/FormatColorFill';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import ColorTones from '../purchase_order/club/ColorTones';
import GeneralColorTones from './GeneralColorTones';

const GeneralSupplierPOs = ({ sourceId, type }: any) => {
    const statusKey = 'status'
    const rowDataKey = 'rowData'
    const router = useRouter();
    const [columnDef, setColumnDef] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [materialData, setMaterialData] = useState<any>([]);
    const [isOpenGrnDetailModal, setIsOpenGrnDetailModal] = useState({ [statusKey]: false, [rowDataKey]: []})
    const [openColorTonesModal, setOpenColorTonesModal] = useState(false)
    const [selectedData, setSelectedData] = useState<any>({materialId:'', supplierPoId:''})

    const getCreatedMaterialDetails = () => {
        api.get(generalSupplierPODetails(sourceId, type))
            .then(resp => {
                const responseData = resp?.data || {};
                setMaterialData([...responseData]);
            })
            .catch((error) => {
                toast.error(getDefaultError(error?.response?.status));
            })
            .finally(() => setIsLoading(false));
    }

    const getRowCanExpand = (row: any) => {
        const subRows = row?.original?.subRows || [];
        return subRows.length > 0;
    };

    const handleRowExpand = (row: any) => {
        row.toggleExpanded();
    }

    const handleGrnDetailsModal = (rowData: any) => {
        const sourceId = rowData
        setIsOpenGrnDetailModal({[statusKey] : true, [rowDataKey]: sourceId})
    }
    const handleGrnDetailModalClose = () => {
        setIsOpenGrnDetailModal({[statusKey] : false, [rowDataKey]: []})
    }
    const handleOpenColorTonesModal =(materialId:any, supplierPoId:any )=>{
        setOpenColorTonesModal(true)
        setSelectedData({ materialId: materialId, supplierPoId: supplierPoId })
      }

    const renderSubRow = ({ row }: any) => {
        const subRows = row?.original.materials || [];
        const supplierPoid =row?.original.id
        return (
            <>
                <Table
                    size="small"
                    sx={{
                        borderLeft: (theme) => `1px solid ${theme.palette.grey[200]}`,
                        '& .MuiTableCell-head': {
                            color: (theme) => theme.palette.grey[700],
                            background: (theme) => theme.palette.grey[50],
                        },
                    }}
                >
                    <TableHead>
                        <TableRow>
                            <TableCell>Material</TableCell>
                            <TableCell>Material Code</TableCell>
                            <TableCell>Ritz Code</TableCell>
                            <TableCell>Requested Date</TableCell>
                            <TableCell>PI Quantity</TableCell>
                            <TableCell>Quantity</TableCell>
                            {!type && (
                                <TableCell sx={{ textAlign: 'center' }}>Acceptable ColorTones</TableCell>
                            )}

                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {subRows.length > 0 ? (
                            subRows.map((supplier: any, i: number) => (
                                <TableRow
                                    key={i}
                                    sx={{
                                        '&:last-child td, &:last-child th': {
                                            border: 0,
                                        },
                                        marginTop: '10px',
                                        marginBottom: '10px'
                                    }}
                                >
                                    <TableCell>{supplier?.material_label ?? "--"}</TableCell>
                                    <TableCell>{supplier?.reference_code ?? "--"}</TableCell>
                                    <TableCell>{supplier?.ritz_customer_brand_reference_code ?? "--"}</TableCell>
                                    <TableCell>{supplier?.requested_date ?? "--"}</TableCell>
                                    <TableCell>{supplier.proforma_invoice_quantity ? `${supplier.proforma_invoice_quantity?.quantity} ${supplier.proforma_invoice_quantity?.quantity_units_display}` : "--"}</TableCell>
                                    <TableCell>{supplier.quantity ? `${supplier.quantity?.quantity} ${supplier.quantity?.quantity_units_display}` : "--"}</TableCell>
                                    {!type && supplier?.material_type == 'fabric' ? (
                                        <TableCell sx={{ textAlign: 'center' }}>
                                            <IconButton
                                                onClick={() => handleOpenColorTonesModal(supplier?.customer_brand_material_id, supplierPoid)}
                                            >
                                                <FormatColorFillIcon fontSize="inherit" color='primary' />
                                            </IconButton>
                                        </TableCell>
                                    ) : (
                                        <TableCell sx={{ textAlign: 'center' }} />
                                    )}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} sx={{ textAlign: 'center', marginTop: '5px', marginBottom: '5px' }}>
                                    <Box>There is nothing to show on material details.</Box>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </>
        );
    };

    const setColumns = () => {
        let cols: ColumnDef<any>[] = [
            {
                accessorKey: "supplier_id",
                header: '',
                cell: ({ row, getValue }) => (
                    <span style={{ paddingLeft: `${row.depth * 2}rem` }}>
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                            <IconButton
                                size="small"
                                onClick={() => handleRowExpand(row)}
                                style={{ cursor: "pointer" }}
                            >
                                {row.getIsExpanded() ? (
                                    <KeyboardArrowDownIcon />
                                ) : (
                                    <KeyboardArrowRightIcon />
                                )}
                            </IconButton>
                        </Box>
                    </span>
                ),
                enableSorting: false,
                enableColumnFilter: false,
                enableGlobalFilter: false,
                meta: {
                    align: "left",
                    width: 95,
                },
            },
            {
                accessorKey: "supplier_name",
                header: "Supplier",
            },
            {
                accessorKey: "supplier_po_number",
                header: "Supplier PO",
                cell: props => (
                    <Link component={NextLink} href={props.row?.original?.attachment_file_path || '#'}>{props.row?.original?.supplier_po_number}</Link>
                )
            },
            {
                header: "Status",
                accessorFn: (row: any) => row?.state?.display_value
            },
        ];

        setColumnDef(cols);
    };

    useEffect(() => {
            getCreatedMaterialDetails()
    }, []);

    useEffect(() => {
        setColumns();
    }, []);

    return (
        <>
            {isOpenGrnDetailModal?.[statusKey] && (
                <RitzModal open={isOpenGrnDetailModal?.[statusKey]} title={<Typography variant='h2'>GRN Summary</Typography>} onClose={handleGrnDetailModalClose} maxWidth='lg'>
                    <GrnSummary sourceDataUrl={grnSummaryRelatedToSupplierPoAndURL} sourceId={isOpenGrnDetailModal?.[rowDataKey]} />
                </RitzModal>
            )}
            {openColorTonesModal && (
                <RitzModal open={openColorTonesModal} onClose={() => setOpenColorTonesModal(false)} title={"Color Tones Details"}>
                    <GeneralColorTones materialId={selectedData.materialId} supplierPoId={selectedData.supplierPoId} savedStatus={() => setOpenColorTonesModal(false)} />
                </RitzModal>
            )}

            {isLoading ? <DefaultLoader /> : (
                <RitzTable
                    columns={columnDef}
                    data={materialData}
                    getRowCanExpand={getRowCanExpand}
                    renderSubComponent={renderSubRow}
                />)}


        </>

    );
};

export default GeneralSupplierPOs;
