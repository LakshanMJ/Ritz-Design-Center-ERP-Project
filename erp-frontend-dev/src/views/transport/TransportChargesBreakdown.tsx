import { Box, Card, Collapse, IconButton, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material"
import React from "react";

const TransportChargesBreakdown = ({open,onClose, type, deliveryCharges}:any) => {

    return (
        <>
            <Card sx={{ width: '100%', padding: 2, marginTop: 2, borderRadius: 2 }}>       
                <Box 
                    sx={{
                        display: 'flex',
                        flexDirection: 'row',
                        justifyContent: 'center',
                        gap: 4,
                        // mt: 4
                    }}
                >
                    <TableContainer sx={{ maxWidth: 400, margin: 'auto', mt: 4 }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell
                                        colSpan={2}
                                        sx={{
                                            // backgroundColor: '#f5f5f5',
                                            backgroundColor: '#d9d9d9',
                                            fontWeight: 'bold',
                                            textAlign: 'center',
                                            border: (theme) => `1px solid ${theme.palette.grey[300]}`,
                                            fontSize: '1rem'
                                        }}
                                    >
                                        Supplier Door to <br /> Supplier Port
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {deliveryCharges?.supplier_door_to_supplier_port?.map((item:any, index:any) => (
                                    <TableRow>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[300]}`, fontSize: '1rem' }}>
                                            {item?.name}
                                        </TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[300]}`, fontSize: '1rem' }}>
                                            {item?.value} {item?.value_unit_display}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <TableContainer sx={{ maxWidth: 400, margin: 'auto', mt: 4 }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell
                                        colSpan={2}
                                        sx={{
                                            // backgroundColor: '#f5f5f5',
                                            backgroundColor: '#d9d9d9',
                                            fontWeight: 'bold',
                                            textAlign: 'center',
                                            border: (theme) => `1px solid ${theme.palette.grey[300]}`,
                                            fontSize: '1rem'
                                        }}
                                    >
                                        Supplier Port to <br /> Our Port
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {deliveryCharges?.supplier_port_to_our_port?.map((item:any, index:any) => (
                                    <TableRow>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[300]}`, fontSize: '1rem' }}>
                                            {item?.name}
                                        </TableCell>
                                        <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[300]}`, fontSize: '1rem' }}>
                                            {item?.value} {item?.value_unit_display}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <TableContainer sx={{ maxWidth: 400, margin: 'auto', mt: 4 }}>
                        <Table size="small" sx={{ width: '100%', textAlign: 'center', border: '1px solid #D1D5DB' }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell
                                        colSpan={2}
                                        sx={{
                                            // backgroundColor: '#f5f5f5',
                                            backgroundColor: '#d9d9d9',
                                            fontWeight: 'bold',
                                            textAlign: 'center',
                                            border: (theme) => `1px solid ${theme.palette.grey[300]}`,
                                            fontSize: '1rem'
                                        }}
                                    >
                                        Our Port to <br /> Our Door
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {deliveryCharges?.our_port_to_our_door?.map((item:any, index:any) => (
                                    <TableRow key={index}>
                                        <TableCell
                                            sx={{
                                                border: (theme) => `1px solid ${theme.palette.grey[300]}`,
                                                fontSize: '1rem',
                                                fontWeight: item?.isHeader
                                                ? 'bold'
                                                : item?.isSubHeader
                                                ? 600
                                                : 'normal',
                                                fontStyle: item?.isItalic ? 'italic' : 'normal',
                                                backgroundColor: item?.isHeader
                                                ? (theme) => theme.palette.grey[200]
                                                : item?.isSubHeader
                                                ? (theme) => theme.palette.grey[100]
                                                : 'transparent',
                                                pl: item?.isHeader ? 1 : item?.isSubHeader ? 3 : 5,
                                            }}
                                            >
                                            {item?.name}
                                        </TableCell>
                                        <TableCell
                                            sx={{
                                                border: (theme) => `1px solid ${theme.palette.grey[300]}`,
                                                fontSize: '1rem',
                                                fontWeight: item?.isHeader
                                                ? 'bold'
                                                : item?.isSubHeader
                                                ? 600
                                                : 'normal',
                                                fontStyle: item?.isItalic ? 'italic' : 'normal',
                                                backgroundColor: item?.isHeader
                                                ? (theme) => theme.palette.grey[200]
                                                : item?.isSubHeader
                                                ? (theme) => theme.palette.grey[100]
                                                : 'transparent',
                                                textAlign: 'right',
                                                pl: item?.isHeader ? 1 : item?.isSubHeader ? 3 : 5,
                                            }}
                                            >
                                            {item?.value} {item?.value_unit_display}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody> 
                        </Table>
                    </TableContainer>
                </Box>
            </Card>
        </>
    );
}

export default TransportChargesBreakdown;