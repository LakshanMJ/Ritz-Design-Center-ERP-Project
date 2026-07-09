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
import { supplierInquiryDetails } from '@/helpers/constants/rest_urls/POUrls';
import RitzModal from '@/components/Ritz/RitzModal';
import GrnSummary from '@/views/grn/GrnSummary';
import { grnSummaryRelatedToSupplierPoAndURL } from '@/helpers/constants/rest_urls/GrnUrls';
import FullscreenIcon from '@mui/icons-material/Fullscreen';

const SupplierInquiryDetalis = ({ clubId, type }: any) => {

    const statusKey = 'status'
    const rowDataKey = 'rowData'
    const router = useRouter();
    const [columnDef, setColumnDef] = useState([]);
    const [activeTab, setActiveTab] = useState('1');
    const [isLoading, setIsLoading] = useState(true);
    const [materialData, setMaterialData] = useState<any>([]);
    const [isOpenGrnDetailModal, setIsOpenGrnDetailModal] = useState({ [statusKey]: false, [rowDataKey]: []})

    const getCreatedMaterialDetails = () => {
        api.get(supplierInquiryDetails(clubId, type))
            .then(resp => {
                const responseData = resp?.data || {};
                setMaterialData([...responseData]);
            })
            .catch((error) => {
                if (error.length > 0) {
                   toast.error(getDefaultError(error?.response?.status));
                }
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

    const renderSubRow = ({ row }: any) => {
        const subRows = row?.original.materials || [];

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
                                    <TableCell>{supplier.quantity ? `${supplier.quantity.quantity} ${supplier.quantity.quantity_units_display}` : "--"}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} sx={{ textAlign: 'center', marginTop: '5px', marginBottom: '5px' }}>
                                    <span>There is nothing to show on material details.</span>
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
            }
        ];

        setColumnDef(cols);
    };

    useEffect(() => {
            getCreatedMaterialDetails()
    }, [clubId]);
    //customer_brand_material_code_id

    useEffect(() => {
        setColumns();
    }, []);

    useEffect(() => {
        // On url param change
        const tab = router?.query?.tab?.toString();
        if (tab) {
            setActiveTab(tab);
        }
    }, [router]);

    return (
        <>
            {isOpenGrnDetailModal?.[statusKey] && (
                <RitzModal open={isOpenGrnDetailModal?.[statusKey]} title={<Typography variant='h2'>GRN Summary</Typography>} onClose={handleGrnDetailModalClose} maxWidth='lg'>
                    <GrnSummary sourceDataUrl={grnSummaryRelatedToSupplierPoAndURL} sourceId={isOpenGrnDetailModal?.[rowDataKey]} />
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

export default SupplierInquiryDetalis;
