import React, { useEffect, useState } from 'react';
import { getDefaultError } from '@/helpers/Utilities';
import toast from 'react-hot-toast';
import DefaultLoader from '@/components/DefaultLoader';
import { ReactKeyHelper } from '@/helpers/KeyHelper';
import api from '@/services/api';
import { Box, Card, CardActionArea, CardContent, Table, TableBody, TableCell, TableHead, TableRow, ToggleButton, ToggleButtonGroup, Typography, useTheme } from '@mui/material';
import RitzTooltip from '@/components/Ritz/RitzTooltip';

const RemediationAnswers = ({ answers }: any) => {
    const keyHelper = new ReactKeyHelper();
    const theme = useTheme();
    const [isLoading, setIsLoading] = useState(false);

    return (
        <>
            <Box>
                <Typography variant='h6' fontWeight='bold' sx={{ color: '#1976d2' }}>Debit Notes</Typography>
            </Box>
            <Box sx={{ mt: 1 }}>
                <Table >
                    <TableHead>
                        <TableRow sx={{ background: theme.palette.grey[100] }}>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>Debit Note</TableCell>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>Material</TableCell>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>Ritz Code</TableCell>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>Quantity</TableCell>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>Unit Price</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {answers?.debit_notes?.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} sx={{ textAlign: 'center', border: (theme) => `1px solid ${theme.palette.grey[100]}` }}>
                                    <Typography variant='body2' color='text.secondary'>No debit notes available</Typography>
                                </TableCell>
                            </TableRow>
                        )}
                        {answers?.debit_notes?.map((debitNote: any, debitNoteIndex: number) => (
                            debitNote?.debit_note_materials?.map((material: any) => (
                                <TableRow key={material?.id}>
                                    {debitNoteIndex === 0 && (
                                        <TableCell rowSpan={debitNote?.debit_note_materials?.length} sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>
                                            {debitNote?.display_number}
                                        </TableCell>
                                    )}
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>{material?.attributes?.material_label}</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>
                                        <Box
                                        sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 1,
                                        }}
                                    >
                                       {material?.attributes?.ritz_customer_brand_reference_code}
                                        <RitzTooltip
                                            materialHeaders={material?.headers}
                                            materialDetails={material?.attributes}
                                        />
                                    </Box>
                                    </TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>{material?.total_quantity?.quantity} {material?.total_quantity?.quantity_units_display}</TableCell>
                                    <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>{material?.total_price?.amount} {material?.total_price?.amount_currency}</TableCell>
                                </TableRow>
                            ))
                        ))}
                    </TableBody>
                </Table>
            </Box>
            <Box sx={{ mt: 1 }}>
                <Typography variant='h6' fontWeight='bold' sx={{ color: '#1976d2' }}>Replacements</Typography>
            </Box>
            <Box sx={{ mt: 1 }}>
                <Table >
                    <TableHead>
                        <TableRow sx={{ background: theme.palette.grey[100] }}>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>Material</TableCell>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>Ritz Code</TableCell>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>Replacement Date</TableCell>
                            <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>Replacement Quantity</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {answers?.replacements?.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} sx={{ textAlign: 'center', border: (theme) => `1px solid ${theme.palette.grey[100]}` }}>
                                    <Typography variant='body2' color='text.secondary'>No replacements available</Typography>
                                </TableCell>
                            </TableRow>
                        )}
                        {answers?.replacements?.map((replacement: any, replacementIndex: number) => (
                            <TableRow key={replacementIndex}>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>{replacement?.attributes?.material_label}</TableCell>
                                 <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>
                                    <Box
                                        sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 1,
                                        }}
                                    >
                                        {replacement?.attributes?.ritz_customer_brand_reference_code}
                                        <RitzTooltip
                                            materialHeaders={replacement.headers}
                                            materialDetails={replacement.attributes}
                                        />
                                    </Box>
                                
                                </TableCell>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>{replacement?.replacement_expected_delivery_date}</TableCell>
                                <TableCell sx={{ border: (theme) => `1px solid ${theme.palette.grey[100]}`, textAlign: 'left' }}>{replacement?.total_quantity?.quantity} {replacement?.total_quantity?.quantity_units_display}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Box>

        </>
    );
};

export default RemediationAnswers;
