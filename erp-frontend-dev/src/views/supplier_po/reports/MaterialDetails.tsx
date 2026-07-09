import { Box, IconButton, Link, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography, useTheme } from '@mui/material';

const MaterialDetails = ({ materialData }: any) => {
    return (
        <>
            <TableContainer>
                <Table >
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ background: (theme) => theme.palette.grey[100], fontWeight: 'bold' }}>Material</TableCell>
                        <TableCell sx={{ background: (theme) => theme.palette.grey[100], fontWeight: 'bold' }}>Ritz Reference Code</TableCell>
                        <TableCell sx={{ background: (theme) => theme.palette.grey[100], fontWeight: 'bold' }}>Material Reference Code</TableCell>
                    </TableRow>
                </TableHead>
                    <TableBody >
                        {materialData.map((material: any, index: any) => (
                            <TableRow key={index}>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>{material?.attributes?.material_label}</TableCell>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>{material?.attributes?.ritz_customer_brand_reference_code}</TableCell>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>{material?.attributes?.reference_code}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </>
    );
};

export default MaterialDetails;
