import React, { useEffect, useState } from "react"
import Button from "@mui/material/Button";
import { Box, Divider, IconButton, InputLabel, Link, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography, useTheme } from '@mui/material';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import VisibilityIcon from '@mui/icons-material/Visibility';
import api from "@/services/api";
import DefaultLoader from "@/components/DefaultLoader";
import RitzTable from "@/components/Ritz/RitzTable";
import { ColumnDef } from "@tanstack/react-table";
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';

const SPOLeftoverDetails = ({ dataList }: any) => {
    const theme = useTheme()
    const [isLoading, setIsLoading] = useState(false);
    const getRowCanExpand = (row: any) => {
        const subRows = row?.original?.subRows || [];
        return subRows.length > 0;
    };
    const handleRowExpand = (row: any) => {
        row.toggleExpanded();
    }

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: "supplier_id",
            header: '',
            cell: ({ row, getValue }) => (
                <Box style={{ paddingLeft: `${row.depth * 2}rem` }}>
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
                </Box>
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
            accessorKey: 'attributes.material_label',
            header: 'Material',
        },
        {
            accessorKey: 'attributes.ritz_customer_brand_reference_code',
            header: 'Ritz Code',
        },
        {
            accessorKey: 'attributes.ritz_customer_brand_reference_code',
            header: 'Material Code',
        },
    ]
    const renderSubRow = ({ row }: any) => {
        const subRows = row?.original.details || [];
        const materialType = row?.original?.attributes?.material_type;
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
                            <TableCell>Barcode</TableCell>
                            {materialType == 'fabric' && (
                                <>
                                    <TableCell>Width</TableCell>
                                    <TableCell>Shade</TableCell>
                                </>
                            )}
                            <TableCell>Available Quantity</TableCell>
                            <TableCell>Usable Quantity</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {subRows.length > 0 ? (
                            subRows.map((item: any, index: number) => (
                                <TableRow
                                    key={index}
                                    sx={{
                                        '&:last-child td, &:last-child th': {
                                            border: 0,
                                        },
                                        marginTop: '10px',
                                        marginBottom: '10px'
                                    }}
                                >
                                    <TableCell>{item?.barcode ?? "--"}</TableCell>
                                    {materialType == 'fabric' && (
                                        <>
                                            <TableCell>{item?.width || '--'}{item?.width_units}</TableCell>
                                            <TableCell>{item?.shade || '--'}</TableCell>
                                        </>
                                    )}
                                    <TableCell>{item?.available_quantity ?? "--"} {item?.available_quantity_units}</TableCell>
                                    <TableCell>{item?.usable_quantity ?? "--"} {item?.usable_quantity_units}</TableCell>
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


    return (
        <>

            {isLoading ? <DefaultLoader /> : <>
                <RitzTable
                    columns={columns}
                    data={dataList}
                    getRowCanExpand={getRowCanExpand}
                    renderSubComponent={renderSubRow}
                />
            </>}
        </>
    );
};

export default SPOLeftoverDetails;
